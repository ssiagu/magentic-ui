import warnings
from typing import Annotated, Any, Dict, List, Literal, Optional, Union

from autogen_core import ComponentModel
from autogen_ext.models.openai import OpenAIChatCompletionClient
from pydantic import BaseModel, Field, model_validator

from .agents.mcp import McpAgentConfig
from .teams.orchestrator.orchestrator_config import OrchestratorConfig


def get_default_client_config():
    return OpenAIChatCompletionClient(
        model="gpt-4.1-2025-04-14", max_retries=10
    ).dump_component()


def get_default_action_guard_config():
    return OpenAIChatCompletionClient(
        model="gpt-4.1-nano-2025-04-14", max_retries=10
    ).dump_component()


class ModelClientConfigs(BaseModel):
    """Configurations for the model clients.
    Attributes:
        default_client_config (dict): Default configuration for the model clients.
        orchestrator (Optional[Union[ComponentModel, Dict[str, Any]]]): Configuration for the orchestrator component. Default: None.
        web_surfer (Optional[Union[ComponentModel, Dict[str, Any]]]): Configuration for the web surfer component. Default: None.
        coder (Optional[Union[ComponentModel, Dict[str, Any]]]): Configuration for the coder component. Default: None.
        file_surfer (Optional[Union[ComponentModel, Dict[str, Any]]]): Configuration for the file surfer component. Default: None.
        action_guard (Optional[Union[ComponentModel, Dict[str, Any]]]): Configuration for the action guard component. Default: None.
    """

    model_context_token_limit: int = 110000

    orchestrator: Union[ComponentModel, Dict[str, Any]] = Field(
        default_factory=get_default_client_config
    )
    web_surfer: Union[ComponentModel, Dict[str, Any]] = Field(
        default_factory=get_default_client_config
    )
    coder: Union[ComponentModel, Dict[str, Any]] = Field(
        default_factory=get_default_client_config
    )
    file_surfer: Union[ComponentModel, Dict[str, Any]] = Field(
        default_factory=get_default_client_config
    )
    action_guard: Union[ComponentModel, Dict[str, Any]] = Field(
        default_factory=get_default_action_guard_config
    )
    metadata_user: Union[ComponentModel, Dict[str, Any]] = Field(
        default_factory=get_default_client_config
    )


# New grouped configs
class BrowserConfig(BaseModel):
    headless: bool = False
    local: bool = False
    playwright_port: int = -1
    novnc_port: int = -1


class WebSurferConfigOpts(BaseModel):
    loop_only: bool = False
    max_actions_per_step: int = 5
    multiple_tools_per_call: bool = False
    allowed_websites: Optional[List[str]] = None
    do_bing_search: bool = False
    animate_actions: bool = True
    start_page: str = "about:blank"
    use_action_guard: bool = True
    to_save_screenshots: bool = False


class UserProxyConfig(BaseModel):
    type: Optional[Literal["dummy", "metadata"]] = None
    task: Optional[str] = None
    hints: Optional[str] = None
    answer: Optional[str] = None


class MagenticUIConfig(BaseModel):
    """
    A simplified set of configuration options for Magentic-UI.

    Attributes:
        model_client_configs (ModelClientConfigs): Configurations for the model client.
        mcp_servers: (List[McpAgentConfig], optional): Configs for AssistantAgents with access to MCP Servers
        cooperative_planning (bool): Disable co-planning mode (default: enabled), user will not be involved in the planning process. Default: True.
        autonomous_execution (bool): Enable autonomous execution mode (default: disabled), user will not be involved in the execution. Default: False.
        allowed_websites (List[str], optional): List of websites that are permitted.
        max_actions_per_step (int): Maximum number of actions allowed per step. Default: 5.
        multiple_tools_per_call (bool): Allow multiple tools to be called in a single step. Default: False.
        max_turns (int): Maximum number of operational turns allowed. Default: 20.
        plan (Plan, optional): A pre-defined plan. In cooperative planning mode, the plan will be enhanced with user feedback.
        approval_policy (str, optional): Policy for action approval. Default: "auto-conservative".
        allow_for_replans (bool): Whether to allow the orchestrator to create a new plan when needed. Default: True.
        do_bing_search (bool): Flag to determine if Bing search should be used to come up with information for the plan. Default: False.
        websurfer_loop (bool): Flag to determine if the websurfer should loop through the plan. Default: False.
        retrieve_relevant_plans (Literal["never", "hint", "reuse"]): Determines if the orchestrator should retrieve relevant plans from memory. Default: `never`.
        memory_controller_key (str, optional): The key to retrieve the memory_controller for a particular user. Default: None.
        model_context_token_limit (int, optional): The maximum number of tokens the model can use. Default: 110000.
        allow_follow_up_input (bool): Flag to determine if new input should be requested after a final answer is given. Default: False.
        final_answer_prompt (str, optional): Prompt for the final answer. Should be a string that can be formatted with the {task} variable. Default: None.
        playwright_port (int, optional): Port for the Playwright browser. Default: -1 (auto-assign).
        novnc_port (int, optional): Port for the noVNC server. Default: -1 (auto-assign).
        user_proxy_type (str, optional): Type of user proxy agent to use ("dummy", "metadata", or None for default). Default: None.
        task (str, optional): Task to be performed by the agents. Default: None.
        hints (str, optional): Helpful hints for the task. Default: None.
        answer (str, optional): Answer to the task. Default: None.
        inside_docker (bool, optional): Whether to run inside a docker container. Default: True.
        browser_headless (bool, optional): Whether to run a headless browser or not. Default: False.
        browser_local (bool, optional): Whether to run a local browser (as opposed to dockerized browser). Default: False.
        max_json_retries (int, optional): Maximum number of retries for JSON operations. Default: 3.
        saved_facts (str, optional): Previously persisted facts. Default: None.
        max_replans (int, optional): Maximum number of replans allowed. Default: 3.
        no_overwrite_of_task (bool, optional): Whether to prevent the orchestrator from overwriting the task. Default: False.
    """

    model_client_configs: ModelClientConfigs = Field(default_factory=ModelClientConfigs)
    mcp_agent_configs: List[McpAgentConfig] = Field(default_factory=lambda: list())
    orchestrator: OrchestratorConfig = Field(default_factory=OrchestratorConfig)
    browser: BrowserConfig = Field(default_factory=BrowserConfig)
    web_surfer: WebSurferConfigOpts = Field(default_factory=WebSurferConfigOpts)
    user_proxy: UserProxyConfig = Field(default_factory=UserProxyConfig)
    approval_policy: Literal[
        "always", "never", "auto-conservative", "auto-permissive"
    ] = "auto-conservative"
    inside_docker: bool = True

    # Deprecated flat fields for backwards compatibility
    cooperative_planning: Annotated[
        bool | None,
        Field(deprecated="Use orchestrator.cooperative_planning", exclude=True),
    ] = None
    autonomous_execution: Annotated[
        bool | None,
        Field(deprecated="Use orchestrator.autonomous_execution", exclude=True),
    ] = None
    allowed_websites: Annotated[
        list[str] | None,
        Field(
            deprecated="Use web_surfer.allowed_websites or orchestrator.allowed_websites",
            exclude=True,
        ),
    ] = None
    max_actions_per_step: Annotated[
        int | None,
        Field(deprecated="Use web_surfer.max_actions_per_step", exclude=True),
    ] = None
    multiple_tools_per_call: Annotated[
        bool | None,
        Field(deprecated="Use web_surfer.multiple_tools_per_call", exclude=True),
    ] = None
    max_turns: Annotated[
        int | None, Field(deprecated="Use orchestrator.max_turns", exclude=True)
    ] = None
    plan: Annotated[Any, Field(deprecated="Use orchestrator.plan", exclude=True)] = None
    allow_for_replans: Annotated[
        bool | None,
        Field(deprecated="Use orchestrator.allow_for_replans", exclude=True),
    ] = None
    do_bing_search: Annotated[
        bool | None,
        Field(
            deprecated="Use web_surfer.do_bing_search or orchestrator.do_bing_search",
            exclude=True,
        ),
    ] = None
    websurfer_loop: Annotated[
        bool | None, Field(deprecated="Use web_surfer.loop_only", exclude=True)
    ] = None
    retrieve_relevant_plans: Annotated[
        str | None,
        Field(deprecated="Use orchestrator.retrieve_relevant_plans", exclude=True),
    ] = None
    memory_controller_key: Annotated[
        str | None,
        Field(deprecated="Use orchestrator.memory_controller_key", exclude=True),
    ] = None
    model_context_token_limit: Annotated[
        int | None,
        Field(deprecated="Use orchestrator.model_context_token_limit", exclude=True),
    ] = None
    allow_follow_up_input: Annotated[
        bool | None,
        Field(deprecated="Use orchestrator.allow_follow_up_input", exclude=True),
    ] = None
    final_answer_prompt: Annotated[
        str | None,
        Field(deprecated="Use orchestrator.final_answer_prompt", exclude=True),
    ] = None
    playwright_port: Annotated[
        int | None, Field(deprecated="Use browser.playwright_port", exclude=True)
    ] = None
    novnc_port: Annotated[
        int | None, Field(deprecated="Use browser.novnc_port", exclude=True)
    ] = None
    user_proxy_type: Annotated[
        str | None, Field(deprecated="Use user_proxy.type", exclude=True)
    ] = None
    task: Annotated[
        str | None, Field(deprecated="Use user_proxy.task", exclude=True)
    ] = None
    hints: Annotated[
        str | None, Field(deprecated="Use user_proxy.hints", exclude=True)
    ] = None
    answer: Annotated[
        str | None, Field(deprecated="Use user_proxy.answer", exclude=True)
    ] = None
    browser_headless: Annotated[
        bool | None, Field(deprecated="Use browser.headless", exclude=True)
    ] = None
    browser_local: Annotated[
        bool | None, Field(deprecated="Use browser.local", exclude=True)
    ] = None
    max_json_retries: Annotated[
        int | None, Field(deprecated="Use orchestrator.max_json_retries", exclude=True)
    ] = None
    saved_facts: Annotated[
        str | None, Field(deprecated="Use orchestrator.saved_facts", exclude=True)
    ] = None
    max_replans: Annotated[
        int | None, Field(deprecated="Use orchestrator.max_replans", exclude=True)
    ] = None
    no_overwrite_of_task: Annotated[
        bool | None,
        Field(deprecated="Use orchestrator.no_overwrite_of_task", exclude=True),
    ] = None

    @model_validator(mode="after")
    def migrate_deprecated_fields(self):
        # Move deprecated fields to new structure if provided
        # Orchestrator
        if self.cooperative_planning is not None:
            warnings.warn(
                "cooperative_planning is deprecated; use orchestrator.cooperative_planning",
                DeprecationWarning,
            )
            self.orchestrator.cooperative_planning = self.cooperative_planning
        if self.autonomous_execution is not None:
            warnings.warn(
                "autonomous_execution is deprecated; use orchestrator.autonomous_execution",
                DeprecationWarning,
            )
            self.orchestrator.autonomous_execution = self.autonomous_execution
        if self.max_turns is not None:
            warnings.warn(
                "max_turns is deprecated; use orchestrator.max_turns",
                DeprecationWarning,
            )
            self.orchestrator.max_turns = self.max_turns
        if self.plan is not None:
            warnings.warn(
                "plan is deprecated; use orchestrator.plan", DeprecationWarning
            )
            self.orchestrator.plan = self.plan
        if self.allow_for_replans is not None:
            warnings.warn(
                "allow_for_replans is deprecated; use orchestrator.allow_for_replans",
                DeprecationWarning,
            )
            self.orchestrator.allow_for_replans = self.allow_for_replans
        if self.retrieve_relevant_plans is not None:
            warnings.warn(
                "retrieve_relevant_plans is deprecated; use orchestrator.retrieve_relevant_plans",
                DeprecationWarning,
            )
            if self.retrieve_relevant_plans in ("never", "hint", "reuse"):
                self.orchestrator.retrieve_relevant_plans = self.retrieve_relevant_plans  # type: ignore
        if self.memory_controller_key is not None:
            warnings.warn(
                "memory_controller_key is deprecated; use orchestrator.memory_controller_key",
                DeprecationWarning,
            )
            self.orchestrator.memory_controller_key = self.memory_controller_key
        if self.model_context_token_limit is not None:
            warnings.warn(
                "model_context_token_limit is deprecated; use orchestrator.model_context_token_limit",
                DeprecationWarning,
            )
            self.orchestrator.model_context_token_limit = self.model_context_token_limit
        if self.allow_follow_up_input is not None:
            warnings.warn(
                "allow_follow_up_input is deprecated; use orchestrator.allow_follow_up_input",
                DeprecationWarning,
            )
            self.orchestrator.allow_follow_up_input = self.allow_follow_up_input
        if self.final_answer_prompt is not None:
            warnings.warn(
                "final_answer_prompt is deprecated; use orchestrator.final_answer_prompt",
                DeprecationWarning,
            )
            self.orchestrator.final_answer_prompt = self.final_answer_prompt
        if self.max_json_retries is not None:
            warnings.warn(
                "max_json_retries is deprecated; use orchestrator.max_json_retries",
                DeprecationWarning,
            )
            self.orchestrator.max_json_retries = self.max_json_retries
        if self.saved_facts is not None:
            warnings.warn(
                "saved_facts is deprecated; use orchestrator.saved_facts",
                DeprecationWarning,
            )
            self.orchestrator.saved_facts = self.saved_facts
        if self.max_replans is not None:
            warnings.warn(
                "max_replans is deprecated; use orchestrator.max_replans",
                DeprecationWarning,
            )
            self.orchestrator.max_replans = self.max_replans
        if self.no_overwrite_of_task is not None:
            warnings.warn(
                "no_overwrite_of_task is deprecated; use orchestrator.no_overwrite_of_task",
                DeprecationWarning,
            )
            self.orchestrator.no_overwrite_of_task = self.no_overwrite_of_task
        # Browser
        if self.playwright_port is not None:
            warnings.warn(
                "playwright_port is deprecated; use browser.playwright_port",
                DeprecationWarning,
            )
            self.browser.playwright_port = self.playwright_port
        if self.novnc_port is not None:
            warnings.warn(
                "novnc_port is deprecated; use browser.novnc_port", DeprecationWarning
            )
            self.browser.novnc_port = self.novnc_port
        if self.browser_headless is not None:
            warnings.warn(
                "browser_headless is deprecated; use browser.headless",
                DeprecationWarning,
            )
            self.browser.headless = self.browser_headless
        if self.browser_local is not None:
            warnings.warn(
                "browser_local is deprecated; use browser.local", DeprecationWarning
            )
            self.browser.local = self.browser_local
        # WebSurfer
        if self.websurfer_loop is not None:
            warnings.warn(
                "websurfer_loop is deprecated; use web_surfer.loop_only",
                DeprecationWarning,
            )
            self.web_surfer.loop_only = self.websurfer_loop
        if self.max_actions_per_step is not None:
            warnings.warn(
                "max_actions_per_step is deprecated; use web_surfer.max_actions_per_step",
                DeprecationWarning,
            )
            self.web_surfer.max_actions_per_step = self.max_actions_per_step
        if self.multiple_tools_per_call is not None:
            warnings.warn(
                "multiple_tools_per_call is deprecated; use web_surfer.multiple_tools_per_call",
                DeprecationWarning,
            )
            self.web_surfer.multiple_tools_per_call = self.multiple_tools_per_call
        if self.allowed_websites is not None:
            warnings.warn(
                "allowed_websites is deprecated; use web_surfer.allowed_websites or orchestrator.allowed_websites",
                DeprecationWarning,
            )
            self.web_surfer.allowed_websites = self.allowed_websites
        if self.do_bing_search is not None:
            warnings.warn(
                "do_bing_search is deprecated; use web_surfer.do_bing_search or orchestrator.do_bing_search",
                DeprecationWarning,
            )
            self.web_surfer.do_bing_search = self.do_bing_search
        # UserProxy
        if self.user_proxy_type is not None:
            warnings.warn(
                "user_proxy_type is deprecated; use user_proxy.type", DeprecationWarning
            )
            if self.user_proxy_type in ("dummy", "metadata"):
                self.user_proxy.type = self.user_proxy_type
            else:
                self.user_proxy.type = None
        if self.task is not None:
            warnings.warn("task is deprecated; use user_proxy.task", DeprecationWarning)
            self.user_proxy.task = self.task
        if self.hints is not None:
            warnings.warn(
                "hints is deprecated; use user_proxy.hints", DeprecationWarning
            )
            self.user_proxy.hints = self.hints
        if self.answer is not None:
            warnings.warn(
                "answer is deprecated; use user_proxy.answer", DeprecationWarning
            )
            self.user_proxy.answer = self.answer
        return self
