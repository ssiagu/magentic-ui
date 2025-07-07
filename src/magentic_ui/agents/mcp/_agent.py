import json
from typing import Any, AsyncGenerator, Dict, List, Mapping, Optional, Sequence

from autogen_agentchat.agents import AssistantAgent
from autogen_agentchat.agents._assistant_agent import AssistantAgentConfig
from autogen_agentchat.base import Response
from autogen_agentchat.messages import (
    BaseAgentEvent,
    BaseChatMessage,
    BaseTextChatMessage,
    TextMessage,
    ToolCallExecutionEvent,
    ToolCallRequestEvent,
    ToolCallSummaryMessage,
)
from autogen_core import CancellationToken
from autogen_core.model_context import TokenLimitedChatCompletionContext
from autogen_core.model_context._token_limited_chat_completion_context import (
    TokenLimitedChatCompletionContextConfig,
)
from autogen_core.models import (
    AssistantMessage,
    ChatCompletionClient,
    CreateResult,
    LLMMessage,
    UserMessage,
)
from autogen_core.tools import ParametersSchema, ToolSchema
from loguru import logger
from pydantic import BaseModel

from ...tools.mcp import AggregateMcpWorkbench, NamedMcpServerParams
from ._config import McpAgentConfig

TASK_COMPLETE_STATUSES = ("submit answer", "give up")
TASK_INCOMPLETE_STATUSES = ("continue working",)

SET_TASK_PROGRESS_TOOL = ToolSchema(
    name="next_action",
    parameters=ParametersSchema(
        type="object",
        properties={
            "status": {
                "type": "string",
                "enum": TASK_COMPLETE_STATUSES + TASK_INCOMPLETE_STATUSES,
            }
        },
        required=["status"],
    ),
)


class McpAgent(AssistantAgent):
    """A general agent that can call tools on one or more MCP Servers.

    McpAgent is a thin wrapper around `autogen_agentchat.agents.AssistantAgent`"""

    def __init__(
        self,
        name: str,
        model_client: ChatCompletionClient,
        *,
        mcp_server_params: List[NamedMcpServerParams] | None = None,
        model_context_token_limit: int | None = None,
        loop_until_task_complete: bool = False,
        max_loops: int = 5,
        loop_prompt: str | None = None,
        final_prompt: str | None = None,
        **kwargs: Any,
    ):
        if model_context_token_limit is not None:
            assert (
                "model_context" not in kwargs
            ), "Only one of model_context_token_limit and model_context kwargs are allowed."
            model_context = TokenLimitedChatCompletionContext(
                model_client=self._model_client, token_limit=model_context_token_limit
            )
            kwargs["model_context"] = model_context

        assert mcp_server_params or kwargs.get(
            "workbench", False
        ), "Must provide either mcp_server_params or workbench."
        assert not (
            mcp_server_params and kwargs.get("workbench", False)
        ), "Cannot provide both mcp_server_params and workbench. Only one is allowed."

        if mcp_server_params:
            workbench = AggregateMcpWorkbench(named_server_params=mcp_server_params)
            kwargs["workbench"] = workbench

        super().__init__(name, model_client, **kwargs)  # type: ignore

        self._loop_until_task_complete = loop_until_task_complete
        self._max_loops = max_loops
        self._loop_prompt = loop_prompt
        self._final_prompt = final_prompt

    async def _create_chat_completion(
        self,
        messages: Sequence[LLMMessage],
        *,
        tools: Sequence[ToolSchema] = [],
        json_output: Optional[bool | type[BaseModel]] = None,
        extra_create_args: Mapping[str, Any] = {},
        cancellation_token: Optional[CancellationToken] = None,
    ) -> CreateResult:
        return await self._model_client.create(
            messages=messages,
            tools=tools,
            json_output=json_output,
            extra_create_args=extra_create_args,
            cancellation_token=cancellation_token,
        )

    async def _get_context(self):
        messages = await self.model_context.get_messages()
        return messages

    async def _check_task_completion(
        self,
        cancellation_token: Optional[CancellationToken] = None,
    ) -> bool:
        task_completion_message = UserMessage(
            source="user",
            content="Based on the conversation, determine if you have enough information to complete the user's task or answer the user's question and decide what your next action will be.",
        )

        messages = (await self._get_context()) + [task_completion_message]

        result = await self._create_chat_completion(
            messages=messages,
            tools=[SET_TASK_PROGRESS_TOOL],
            extra_create_args={"tool_choice": "required"},
            cancellation_token=cancellation_token,
        )

        content = result.content

        if isinstance(content, str):
            logger.warning("_check_task_completion returned string not tool call")
            return False

        for function_call in content:
            if function_call.name == SET_TASK_PROGRESS_TOOL["name"]:
                try:
                    arguments: Dict[str, Any] = json.loads(function_call.arguments)
                    return (
                        arguments.get("status", TASK_COMPLETE_STATUSES[0])
                        in TASK_COMPLETE_STATUSES
                    )
                except Exception:
                    logger.warning("Failed to parse function_call arguments.")

        logger.warning(f"Tool {SET_TASK_PROGRESS_TOOL['name']} was not called")
        return False

    async def _on_messages_stream(
        self, messages: Sequence[BaseChatMessage], cancellation_token: CancellationToken
    ) -> AsyncGenerator[BaseAgentEvent | BaseChatMessage | Response, None]:
        async for event in super().on_messages_stream(messages, cancellation_token):
            if isinstance(
                event,
                (
                    BaseTextChatMessage,
                    ToolCallRequestEvent,
                    ToolCallExecutionEvent,
                    ToolCallSummaryMessage,
                ),
            ):
                metadata = getattr(event, "metadata", {})
                metadata = {
                    **metadata,
                    # Display in UI
                    "internal": "no",
                    # Part of a plan step
                    "type": "progress_message",
                }
                setattr(event, "metadata", metadata)

            yield event

    async def on_messages_stream(
        self, messages: Sequence[BaseChatMessage], cancellation_token: CancellationToken
    ) -> AsyncGenerator[BaseAgentEvent | BaseChatMessage | Response, None]:
        # Enter the while loop at least once
        loop = True
        loop_counter = 0

        last_response: Response | None = None

        messages = list(messages)

        while loop:
            async for event in self._on_messages_stream(messages, cancellation_token):
                if isinstance(event, Response):
                    yield event.chat_message
                    last_response = event
                else:
                    yield event

            # Clear messages, we've consumed them already
            messages.clear()

            loop_counter += 1
            loop = self._loop_until_task_complete and loop_counter <= self._max_loops

            if loop:
                loop = not await self._check_task_completion(cancellation_token)

            if loop and self._loop_prompt:
                loop_message = TextMessage(
                    source="user",
                    metadata={"internal": "yes"},
                    content=self._loop_prompt,
                )

                messages.append(loop_message)

        if self._final_prompt:
            final_message = UserMessage(
                source="user",
                content=self._final_prompt,
            )

            llm_messages = (await self._get_context()) + [final_message]

            result = await self._create_chat_completion(
                llm_messages, cancellation_token=cancellation_token
            )

            if not isinstance(result.content, str):
                raise RuntimeError("final_prompt called tools unexpectdly")

            await self.model_context.add_message(
                AssistantMessage(
                    source=self.name,
                    content=result.content,
                    thought=getattr(result, "thought", None),
                )
            )

            yield Response(
                chat_message=TextMessage(
                    content=result.content,
                    source=self.name,
                    models_usage=result.usage,
                ),
            )
        elif last_response:
            yield last_response
        else:
            raise RuntimeError("No response was generated.")

    @classmethod
    def _from_config(cls, config: Any):
        if isinstance(config, McpAgentConfig):
            # Build an AggregateMcpWorkbench from the config servers
            # Note, we could build a _single_ McpWorkbench per mcp_server and pass the list of workbenches ot the agent...
            # But then the tools could have name collisions. The AggregateMcpWorkbench scopes each tool within the servers "namespace"
            workbench = AggregateMcpWorkbench(named_server_params=config.mcp_servers)
            # Dump the component so we can load it
            workbench_component = workbench.dump_component()
            # Create a copy of the config with the workbench set to the dumped AggregateMcpWorkbench
            config.workbench = workbench_component

            if config.model_context_token_limit is not None:
                model_context = TokenLimitedChatCompletionContextConfig(
                    model_client=config.model_client,
                    token_limit=config.model_context_token_limit,
                )
                config.model_context = TokenLimitedChatCompletionContext._from_config(  # type: ignore
                    model_context
                ).dump_component()

            self = super()._from_config(config)

            self._max_loops = config.max_loops
            self._loop_until_task_complete = config.loop_until_task_comlete
            self._loop_prompt = config.loop_prompt
            self._final_prompt = config.final_prompt

            return self
        else:
            return super()._from_config(config)

    def _to_config(self) -> AssistantAgentConfig:
        return McpAgentConfig(
            loop_until_task_comlete=self._loop_until_task_complete,
            max_loops=self._max_loops,
            **super()._to_config().model_dump(),
        )
