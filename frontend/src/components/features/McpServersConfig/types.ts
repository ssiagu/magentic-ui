import { z } from "zod";

export interface MCPServerInfo {
    agentName: string;
    agentDescription: string;
    serverName: string;
    serverType: string;
    serverParams: any;
}

export const StdioServerParamsSchema = z.object({
    type: z.literal("StdioServerParams"),
    command: z.string(),
    args: z.array(z.string()).optional(),
    read_timeout_seconds: z.number().gt(0).optional(),
    env: z.record(z.string()).optional(),
    cwd: z.string().optional(),
    encoding: z.string().default("utf-8").optional(),
    encoding_error_handler: z.enum(["strict", "ignore", "replace"]).default("strict").optional(),
})

export type StdioServerParams = z.infer<typeof StdioServerParamsSchema>

export const SseServerParamsSchema = z.object({
    type: z.literal("SseServerParams"),
    url: z.string(),
    headers: z.record(z.string()).optional(),
    timeout: z.number().gt(0).optional(),
    sse_read_timeout: z.number().gt(0).optional(),
})

export type SseServerParams = z.infer<typeof SseServerParamsSchema>


export const DEFAULT_SSE_PARAMS: SseServerParams = {
    type: "SseServerParams",
    url: "",
    headers: {},
    timeout: 5,
    sse_read_timeout: 300,
};

export const DEFAULT_STDIO_PARAMS: StdioServerParams = {
    type: "StdioServerParams",
    command: "",
    args: [],
    read_timeout_seconds: 5,
};

export const MCP_SERVER_TYPES = {
    "StdioServerParams": { value: "StdioServerParams", label: "Stdio", defaultValue: DEFAULT_STDIO_PARAMS },
    "SseServerParams": { value: "SseServerParams", label: "SSE", defaultValue: DEFAULT_SSE_PARAMS },
};

export const serverNamePattern = /^[A-Za-z0-9]+$/;

export const isEmpty = (val: any) => val === undefined || val === null || (typeof val === 'string' && val.trim() === '') || (Array.isArray(val) && val.length === 0);

// Type guards for server_params
export function isStdioServerParams(params: any): params is StdioServerParams {
    return params.type === "StdioServerParams";
}

export function isSseServerParams(params: any): params is SseServerParams {
    return params.type === "SseServerParams";
}
