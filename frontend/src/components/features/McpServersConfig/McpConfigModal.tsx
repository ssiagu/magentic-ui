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
  isStdioServerParams
} from "./types";
import SseServerForm from "./configForms/SseServerForm";
import StdioServerForm from "./configForms/StdioServerForm";

const { TextArea } = Input;

interface McpConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  server?: MCPServerInfo;
  onSave?: (server: MCPServerInfo) => void;
  agentName?: string;
  agentDescription?: string;
}

const McpConfigModal: React.FC<McpConfigModalProps> = ({
  isOpen,
  onClose,
  server,
  onSave,
  agentName,
  agentDescription,
}) => {
  const [activeTab, setActiveTab] = useState("sse");
  const [form] = Form.useForm();
  const [isSaving, setIsSaving] = useState(false);

  // Server configuration state
  const [serverName, setServerName] = useState("");
  const [serverParams, setServerParams] = useState<SseServerParams | StdioServerParams >(DEFAULT_SSE_PARAMS);
  const [formAgentName, setFormAgentName] = useState("");
  const [formAgentDescription, setFormAgentDescription] = useState("");

  // Set server type when tab changes
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    if (newTab === "stdio") {
      setServerParams(DEFAULT_STDIO_PARAMS);
    } else if (newTab === "sse") {
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
    } else if (!server && isOpen) {
      // Adding new server
      form.resetFields();
      setActiveTab("sse");
      setServerName("");
      setServerParams(DEFAULT_SSE_PARAMS);
      setFormAgentName("");
      setFormAgentDescription("");
    }
  }, [server, isOpen, form]);

  const buildServerConfig = () => {
    if (!serverName) {
      throw new Error("Server name is required");
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
      const agentFormData = {
        agentName: formAgentName,
        agentDescription: formAgentDescription,
      };

      const serverConfig = buildServerConfig();

      if (server) {
        // Editing existing server - return server config and updated agent info
        if (onSave) {
          onSave({
            serverConfig: serverConfig,
            agentName: agentFormData.agentName,
            agentDescription: agentFormData.agentDescription,
            isEditing: true
          } as any);
        }
      } else {
        // Adding new server - create complete agent configuration
        const agentConfig = {
          name: agentFormData.agentName || `${serverConfig.server_name}agent`,
          description: agentFormData.agentDescription || agentDescription || `Agent using ${serverConfig.server_name}`, // TODO: automatically generate agent description
          system_message: "",
          mcp_servers: [serverConfig],
          tool_call_summary_format: "{tool_name}({arguments}): {result}",
          model_client: {
            provider: "OpenAIChatCompletionClient",
            config: {
              model: "gpt-4.1-2025-04-14",
              api_key: null,
              base_url: null,
              max_retries: 5
            }
          }
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
              ]}
            />
          </div>

          <div className="space-y-4">
            <Tooltip title={serverNameError ? 'Server Name is required and can only contain letters and numbers.' : ''} open={serverNameError ? undefined : false}>
              <Form.Item label="Server Name" required>
                <Input
                  value={serverName}
                  placeholder="Server Name"
                  status={serverNameError ? 'error' : ''}
                  onChange={e => setServerName(e.target.value)}
                  maxLength={50}
                  showCount
                />
              </Form.Item>
            </Tooltip>
          </div>

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
