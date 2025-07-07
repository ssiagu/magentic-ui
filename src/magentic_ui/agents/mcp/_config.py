from typing import List

from autogen_agentchat.agents._assistant_agent import AssistantAgentConfig

from ...tools.mcp import NamedMcpServerParams


class McpAgentConfig(AssistantAgentConfig):
    # Sensible defaults for AssistantAgentConfig
    tool_call_summary_format: str = "{tool_name}({arguments}): {result}"
    reflect_on_tool_use: bool = False

    # New configs
    mcp_servers: List[NamedMcpServerParams]
    model_context_token_limit: int | None = None
    loop_until_task_comlete: bool = False
    max_loops: int = 5
    loop_prompt: str | None = None
    final_prompt: str | None = None
