import React, { useState } from "react";
import { Modal, Tabs, Input, Button, Form, message, Divider, Tooltip } from "antd";
import {
  MCPServerInfo,
  DEFAULT_SSE_PARAMS,
  DEFAULT_STDIO_PARAMS,
  serverNamePattern,
  isEmpty,
  SseServerParams,
  isSseServerParams,
  StdioServerParams,
  isStdioServerParams,
  StdioServerParamsSchema,
  SseServerParamsSchema
} from "./types";
import SseServerForm from "./configForms/SseServerForm";
import StdioServerForm from "./configForms/StdioServerForm";
import JsonForm from "./configForms/JsonForm";
import { useDefaultModel } from "../../settings/hooks/useDefaultModel";
import { ModelConfig } from "../../settings/tabs/agentSettings/modelSelector/modelConfigForms/types";
import { DEFAULT_OPENAI } from "../../settings/tabs/agentSettings/modelSelector/modelConfigForms/OpenAIModelConfigForm";

const { TextArea } = Input;

interface McpConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  server?: MCPServerInfo;
  onSave?: (server: MCPServerInfo) => void;
  agentName?: string;
  agentDescription?: string;
  existingServerNames?: string[];
}

const McpConfigModal: React.FC<McpConfigModalProps> = ({
  isOpen,
  onClose,
  server,
  onSave,
  agentName,
  agentDescription,
  existingServerNames = [],
}) => {
  const [activeTab, setActiveTab] = useState("sse");
  const [form] = Form.useForm();
  const [isSaving, setIsSaving] = useState(false);

  // Server configuration state
  const [serverName, setServerName] = useState("");
  const [serverParams, setServerParams] = useState<SseServerParams | StdioServerParams >(DEFAULT_SSE_PARAMS);
  const [formAgentName, setFormAgentName] = useState("");
  const [formAgentDescription, setFormAgentDescription] = useState("");
  const [jsonConfig, setJsonConfig] = useState(""); // New state for JSON config

  // Model configuration state
  const { defaultModel } = useDefaultModel();
  const [modelClient, setModelClient] = useState<ModelConfig>(DEFAULT_OPENAI);

  // Initialize modelClient with defaultModel when available
  React.useEffect(() => {
    if (defaultModel) {
      setModelClient(defaultModel);
    }
  }, [defaultModel]);

  // Convert current server config to JSON format
  const convertServerConfigToJson = () => {
    return JSON.stringify({
      server_name: serverName,
      server_params: serverParams
    }, null, 2);
  };

  // Parse JSON config and update server state
  const parseJsonConfig = (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);

      if (!parsed.server_name) {
        throw new Error("Missing required field: server_name");
      }

      if (!parsed.server_params) {
        throw new Error("Missing required field: server_params");
      }

      if (!parsed.server_params.type) {
        throw new Error("Missing required field: server_params.type");
      }

      if (parsed.server_params.type !== "StdioServerParams" && parsed.server_params.type !== "SseServerParams") {
        throw new Error("Invalid server type. Must be 'StdioServerParams' or 'SseServerParams'");
      }

      const serverParamsSchema = parsed.server_params.type === "StdioServerParams" ? StdioServerParamsSchema : SseServerParamsSchema;
      const result = serverParamsSchema.safeParse(parsed.server_params);

      if (!result.success) {
        const errors = result.error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
        throw new Error(`Invalid ${parsed.server_params.type}: ${errors}`);
      }

      const validatedServerParams: StdioServerParams | SseServerParams = result.data;

      return {
        server_name: parsed.server_name,
        server_params: validatedServerParams
      };
    } catch (error) {
      throw new Error(`Invalid JSON configuration: ${error instanceof Error ? error.message : 'Invalid JSON format'}`);
    }
  };

  // Set server type when tab changes
  const handleTabChange = (newTab: string) => {
    const previousTab = activeTab;
    setActiveTab(newTab);

    if (previousTab === "json" && (newTab === "sse" || newTab === "stdio")) {
      // Parse JSON config when switching from JSON to other tabs
      try {
        if (jsonConfig) {
          const parsed = parseJsonConfig(jsonConfig);
          setServerName(parsed.server_name);
          setServerParams(parsed.server_params);
        }
      } catch (error) {
        console.error("Failed to parse JSON config:", error);
        // Keep the current config if JSON parsing fails
      }
    } else if (newTab === "json") {
      // Convert current config to JSON and populate the form
      const jsonConfigValue = convertServerConfigToJson();
      setJsonConfig(jsonConfigValue);
    } else if (newTab === "stdio" && previousTab !== "json") {
      // Only reset to defaults when switching between SSE and Stdio (not from JSON)
      setServerParams(DEFAULT_STDIO_PARAMS);
    } else if (newTab === "sse" && previousTab !== "json") {
      // Only reset to defaults when switching between SSE and Stdio (not from JSON)
      setServerParams(DEFAULT_SSE_PARAMS);
    }
  };

  // Set active tab and pre-fill form when editing
  React.useEffect(() => {
    if (server && isOpen) {
      // Edit existing server
      const activeTab = server.serverType === "StdioServerParams" ? "stdio" : "sse";
      setActiveTab(activeTab);
      setServerName(server.serverName);
      setServerParams(server.serverParams);
      setFormAgentName(server.agentName || "");
      setFormAgentDescription(server.agentDescription || "");

      // Also populate JSON form with current config
      const jsonConfigValue = convertServerConfigToJson();
      setJsonConfig(jsonConfigValue);
    } else if (!server && isOpen) {
      // Adding new server
      form.resetFields();
      setActiveTab("sse");
      setServerName("");
      setServerParams(DEFAULT_SSE_PARAMS);
      setFormAgentName("");
      setFormAgentDescription("");
      setJsonConfig(""); // Reset JSON config
    }
  }, [server, isOpen, form]);

  const buildServerConfig = () => {
    if (activeTab === "json") {
      try {
        if (!jsonConfig) {
          throw new Error("JSON configuration is required");
        }

        const parsed = parseJsonConfig(jsonConfig);

        // Check for duplicate server name (only when adding new server, not when editing)
        if (!server && existingServerNames.includes(parsed.server_name)) {
          throw new Error("Server name already exists");
        }

        return {
          server_name: parsed.server_name,
          server_params: parsed.server_params
        };
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : "Invalid JSON configuration");
      }
    }

    // Handle SSE and Stdio tabs
    if (!serverName) {
      throw new Error("Server name is required");
    }

    // Check for duplicate server name (only when adding new server, not when editing)
    if (!server && existingServerNames.includes(serverName)) {
      throw new Error("Server name already exists");
    }

    if (activeTab === "sse" && isSseServerParams(serverParams) && !serverParams.url) {
      throw new Error("URL is required for sse configuration");
    }

    if (activeTab === "stdio" && isStdioServerParams(serverParams) && !serverParams.command) {
      throw new Error("Command is required for stdio server configuration");
    }

    return {
      server_name: serverName,
      server_params: serverParams
    };
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const serverConfig = buildServerConfig();

      if (server) {
        // Editing existing server - return server config and updated agent info
        if (onSave) {
          onSave({
            serverConfig,
            agentName: formAgentName,
            agentDescription: formAgentDescription
          } as any);
        }
      } else {
        // Adding new server - create complete agent configuration
        const agentConfig = {
          name: formAgentName || `${serverConfig.server_name}agent`,
          description: formAgentDescription || agentDescription || `Agent using ${serverConfig.server_name}`, // TODO: automatically generate agent description
          system_message: "",
          mcp_servers: [serverConfig],
          tool_call_summary_format: "{tool_name}({arguments}): {result}",
          model_client: modelClient
        };
        if (onSave) {
          onSave(agentConfig as any);
        }
      }

      message.success(server ? "Server configuration updated successfully!" : "Server configuration saved successfully!");
      onClose();
    } catch (error) {
      console.error("Save failed:", error);
      message.error(error instanceof Error ? error.message : "Failed to save configuration");
    } finally {
      setIsSaving(false);
    }
  };

  const serverNameError = isEmpty(serverName) || !serverNamePattern.test(serverName);
  const serverNameDuplicateError = serverName && existingServerNames.includes(serverName) && (!server || server.serverName !== serverName);

  return (
    <Modal
      title={server ? "Edit MCP Server" : "Add MCP Server"}
      open={isOpen}
      onCancel={onClose}
      footer={[
        <Button key="save" type="primary" onClick={handleSave} loading={isSaving}>
          {server ? "Update Server" : "Add Server"}
        </Button>,
      ]}
      width={600}
      className="max-h-[75vh] p-0 overflow-y-auto"
    >
      <Form form={form} layout="vertical">
        <div className="space-y-6 p-6">
          <div>
            <Tabs
              activeKey={activeTab}
              onChange={handleTabChange}
              items={[
                {
                  key: "sse",
                  label: "SSE",
                },
                {
                  key: "stdio",
                  label: "Stdio",
                },
                {
                  key: "json",
                  label: "JSON Config",
                },
              ]}
            />
          </div>

          {activeTab !== "json" && (
            <div className="space-y-4">
              <Tooltip title={
                serverNameError ? 'Server Name is required and can only contain letters and numbers.' :
                serverNameDuplicateError ? 'Server name already exists.' : ''
              } open={serverNameError || serverNameDuplicateError ? undefined : false}>
                <Form.Item label="Server Name" required>
                  <Input
                    value={serverName}
                    placeholder="Server Name"
                    status={serverNameError || serverNameDuplicateError ? 'error' : ''}
                    onChange={e => setServerName(e.target.value)}
                    maxLength={50}
                    showCount
                  />
                </Form.Item>
              </Tooltip>
            </div>
          )}

          <div className="space-y-6">
            {activeTab === "sse" && isSseServerParams(serverParams) && (
              <SseServerForm
                value={serverParams}
                onValueChanged={(value) => setServerParams(value)}
              />
            )}
            {activeTab === "stdio" && isStdioServerParams(serverParams) && (
              <StdioServerForm
                value={serverParams}
                onValueChanged={(value) => setServerParams(value)}
              />
            )}
            {activeTab === "json" && (
              <JsonForm value={jsonConfig} onValueChanged={setJsonConfig} />
            )}
          </div>

          <div className="space-y-4">
            <Divider />
            <h3 className="text-lg font-medium">Agent Configuration</h3>

            <Form.Item
              label="Agent Name"
            >
              <Input
                value={formAgentName}
                onChange={e => setFormAgentName(e.target.value)}
                placeholder="Auto-generated from server name"
                maxLength={100}
                showCount
              />
            </Form.Item>

            <Form.Item
              label="Agent Description"
              rules={[{ required: true, message: "Agent description is required" }]}
            >
              <TextArea
                value={formAgentDescription}
                onChange={e => setFormAgentDescription(e.target.value)}
                rows={4}
                placeholder="This agent can help you with... Use this server when the user needs to..."
                maxLength={500}
                showCount
              />
            </Form.Item>
            <p className="text-sm text-gray-500">
              Describe how and when this server should be used. This helps the orchestrator decide when to call this agent.
            </p>
          </div>
        </div>
      </Form>
    </Modal>
  );
};

export default McpConfigModal;
