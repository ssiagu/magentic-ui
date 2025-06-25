from typing import Any, Dict, List, Optional

from autogen_agentchat.agents import UserProxyAgent
from autogen_agentchat.base import ChatAgent, TerminationCondition
from autogen_agentchat.teams import BaseGroupChat
from autogen_core import AgentRuntime, ComponentModel
from autogen_core.models import ChatCompletionClient, UserMessage
from loguru import logger

from magentic_ui.tools.playwright.browser.base_playwright_browser import (
    PlaywrightBrowser,
)
from magentic_ui.tools.url_status_manager import UrlStatus

from .agents import USER_PROXY_DESCRIPTION, CoderAgent, FileSurfer, WebSurfer
from .agents.mcp import McpAgent
from .agents.users import DummyUserProxy, MetadataUserProxy
from .approval_guard import (
    ApprovalConfig,
    ApprovalGuard,
    ApprovalGuardContext,
)
from .input_func import InputFuncType, make_agentchat_input_func
from .learning.memory_provider import MemoryControllerProvider
from .magentic_ui_config import (
    MagenticUIConfig,
)
from .teams import GroupChat, RoundRobinGroupChat
from .tools.playwright.browser import get_browser_resource_config
from .types import RunPaths
from .utils import get_internal_urls

ModelClientType = ChatCompletionClient | ComponentModel | Dict[str, Any]


def get_chat_completion_client(
    client: ModelClientType,
):
    if isinstance(client, ChatCompletionClient):
        return client
    else:
        return ChatCompletionClient.load_component(client)


def get_browser_component_model(config: MagenticUIConfig, paths: RunPaths):
    return get_browser_resource_config(
        paths.external_run_dir,
        config.browser.novnc_port,
        config.browser.playwright_port,
        config.inside_docker,
        headless=config.browser.headless,
        local=config.browser.local,
    )


def get_websurfer(
    config: MagenticUIConfig,
    browser_component_model: ComponentModel,
    approval_guard: ApprovalGuard | None,
    paths: RunPaths,
):
    url_statuses: Dict[str, UrlStatus] | None = None
    if config.orchestrator.allowed_websites:
        url_statuses = {key: "allowed" for key in config.orchestrator.allowed_websites}

    with ApprovalGuardContext.populate_context(approval_guard):
        return WebSurfer(
            name="web_surfer",
            model_client=get_chat_completion_client(
                config.model_client_configs.web_surfer
            ),
            browser=PlaywrightBrowser.load_component(browser_component_model),
            single_tab_mode=False,
            max_actions_per_step=config.web_surfer.max_actions_per_step,
            url_statuses=url_statuses,
            url_block_list=get_internal_urls(config.inside_docker, paths),
            multiple_tools_per_call=config.web_surfer.multiple_tools_per_call,
            downloads_folder=str(paths.internal_run_dir),
            debug_dir=str(paths.internal_run_dir),
            animate_actions=config.web_surfer.animate_actions,
            start_page=config.web_surfer.start_page,
            use_action_guard=config.web_surfer.use_action_guard,
            to_save_screenshots=config.web_surfer.to_save_screenshots,
        )


def get_user_proxy(config: MagenticUIConfig, input_func: Optional[InputFuncType]):
    if config.user_proxy.type == "dummy":
        return DummyUserProxy(name="user_proxy")
    elif config.user_proxy.type == "metadata":
        assert (
            config.user_proxy.task is not None
        ), "Task must be provided for metadata user proxy"
        assert (
            config.user_proxy.hints is not None
        ), "Hints must be provided for metadata user proxy"
        assert (
            config.user_proxy.answer is not None
        ), "Answer must be provided for metadata user proxy"
        return MetadataUserProxy(
            name="user_proxy",
            description="Metadata User Proxy Agent",
            task=config.user_proxy.task,
            helpful_task_hints=config.user_proxy.hints,
            task_answer=config.user_proxy.answer,
            model_client=get_chat_completion_client(
                config.model_client_configs.metadata_user
            ),
        )
    else:
        user_proxy_input_func = make_agentchat_input_func(input_func)
        return UserProxyAgent(
            description=USER_PROXY_DESCRIPTION,
            name="user_proxy",
            input_func=user_proxy_input_func,
        )


def get_approval_guard(config: MagenticUIConfig, input_func: Optional[InputFuncType]):
    if config.user_proxy.type in ["dummy", "metadata"]:

        def always_yes_input(prompt: str, input_type: str = "text_input") -> str:
            return "yes"

        return ApprovalGuard(
            input_func=always_yes_input,
            default_approval=False,
            model_client=get_chat_completion_client(
                config.model_client_configs.action_guard
            ),
            config=ApprovalConfig(approval_policy=config.approval_policy),
        )
    elif input_func is not None:
        return ApprovalGuard(
            input_func=input_func,
            default_approval=False,
            model_client=get_chat_completion_client(
                config.model_client_configs.action_guard
            ),
            config=ApprovalConfig(approval_policy=config.approval_policy),
        )
    return None


def get_file_surfer(
    config: MagenticUIConfig,
    approval_guard: ApprovalGuard | None,
    paths: RunPaths,
):
    return FileSurfer(
        name="file_surfer",
        model_client=get_chat_completion_client(
            config.model_client_configs.file_surfer
        ),
        work_dir=paths.internal_run_dir,
        bind_dir=paths.external_run_dir,
        model_context_token_limit=config.model_client_configs.model_context_token_limit,
        approval_guard=approval_guard,
    )


def get_coder_surfer(
    config: MagenticUIConfig,
    approval_guard: ApprovalGuard | None,
    paths: RunPaths,
):
    return CoderAgent(
        name="coder_agent",
        model_client=get_chat_completion_client(config.model_client_configs.coder),
        work_dir=paths.internal_run_dir,
        bind_dir=paths.external_run_dir,
        model_context_token_limit=config.model_client_configs.model_context_token_limit,
        approval_guard=approval_guard,
    )


def get_mcp_agents(config: MagenticUIConfig):
    # Setup any mcp_agents
    return [
        # TODO: Init from constructor?
        McpAgent._from_config(mcp_agent_config)  # type: ignore
        for mcp_agent_config in config.mcp_agent_configs
    ]


def get_memory_provider(config: MagenticUIConfig, paths: RunPaths):
    if (
        config.orchestrator.memory_controller_key is not None
        and config.orchestrator.retrieve_relevant_plans in ["reuse", "hint"]
    ):
        return MemoryControllerProvider(
            internal_workspace_root=paths.internal_root_dir,
            external_workspace_root=paths.external_root_dir,
            inside_docker=config.inside_docker,
        )
    else:
        return None


async def get_task_team(
    magentic_ui_config: Optional[MagenticUIConfig] = None,
    input_func: Optional[InputFuncType] = None,
    *,
    paths: RunPaths,
    runtime: AgentRuntime | None = None,
    termination_condition: TerminationCondition | None = None,
) -> GroupChat | RoundRobinGroupChat:
    """
    Creates and returns a GroupChat team with specified configuration.

    Args:
        magentic_ui_config (MagenticUIConfig, optional): Magentic UI configuration for team. Default: None.
        paths (RunPaths): Paths for internal and external run directories.

    Returns:
        GroupChat | RoundRobinGroupChat: An instance of GroupChat or RoundRobinGroupChat with the specified agents and configuration.
    """
    if magentic_ui_config is None:
        magentic_ui_config = MagenticUIConfig()

    if not magentic_ui_config.inside_docker:
        assert (
            paths.external_run_dir == paths.internal_run_dir
        ), "External and internal run dirs must be the same in non-docker mode"

    user_proxy = get_user_proxy(magentic_ui_config, input_func)
    
    approval_guard = get_approval_guard(magentic_ui_config, input_func)
    browser_component_model, _novnc_port, _playwright_port = (
        get_browser_component_model(magentic_ui_config, paths)
    )
    web_surfer = get_websurfer(
        magentic_ui_config, browser_component_model, approval_guard, paths
    )

    team: BaseGroupChat
    if magentic_ui_config.web_surfer.loop_only:
        # simplified team of only the web surfer
        team = RoundRobinGroupChat(
            participants=[web_surfer, user_proxy],
            max_turns=10000,
        )
    else:
        coder_agent = get_coder_surfer(magentic_ui_config, approval_guard, paths)
        file_surfer = get_file_surfer(magentic_ui_config, approval_guard, paths)
        mcp_agents = get_mcp_agents(magentic_ui_config)
        memory_provider = get_memory_provider(magentic_ui_config, paths)

        team_participants: List[ChatAgent] = [
            web_surfer,
            user_proxy,
            coder_agent,
            file_surfer,
        ]
        team_participants.extend(mcp_agents)


        team = GroupChat(
            participants=team_participants,
            orchestrator_config=magentic_ui_config.orchestrator,
            model_client=get_chat_completion_client(
                magentic_ui_config.model_client_configs.orchestrator
            ),
            memory_provider=memory_provider,
            runtime=runtime,
            termination_condition=termination_condition,
        )

    logger.info(
        f"Running Magentic-UI team with {len(team.participants)} participants: [{', '.join(a.name for a in team.participants)}]"
    )

    await team.lazy_init()

    return team
