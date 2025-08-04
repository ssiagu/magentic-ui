import type { StdioServerParams, SseServerParams } from "../../settings/tabs/agentSettings/mcpAgentsSettings/mcpServerForms/types";

export interface MCPServerInfo {
    agentName: string;
    agentDescription: string;
    serverName: string;
    serverType: string;
    serverParams: StdioServerParams | SseServerParams;
}
