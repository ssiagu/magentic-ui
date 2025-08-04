import React, { useState } from "react";
import { Modal, Tabs, Input, Button, Form, message, Divider } from "antd";
import { MCPServerInfo } from "./types";
import JsonConfigTab from "./configTabs/JsonConfigTab";
import RegistryConfigTab from "./configTabs/RegistryConfigTab";
import ManualConfigTab from "./configTabs/ManualConfigTab";
import { mcpHealthAPI } from "../../views/api";

const { TextArea } = Input;

interface McpServersConfigProps {
  isOpen: boolean;
  onClose: () => void;
  server?: MCPServerInfo;
  onSave?: (server: MCPServerInfo) => void;
  agentName?: string;
  agentDescription?: string;
}

const McpServersConfig: React.FC<McpServersConfigProps> = ({
  isOpen,
  onClose,
  server,
  onSave,
  agentName,
  agentDescription,
}) => {
  const [activeTab, setActiveTab] = useState("registry");
  const [form] = Form.useForm();
  const [isSaving, setIsSaving] = useState(false);

  // Set server type when tab changes
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);

    // Set appropriate server type based on tab
    if (newTab === "manual") {
      form.setFieldsValue({ serverType: "StdioServerParams" });
    } else if (newTab === "registry") {
      form.setFieldsValue({ serverType: "SseServerParams" });
    }
  };

    // Set active tab and pre-fill form when editing
  React.useEffect(() => {
    if (server && isOpen) {
      // Determine which tab to show based on server type
      if (server.serverType === "StdioServerParams") {
        setActiveTab("manual");

        // Pre-fill manual config form
        const serverParams = server.serverParams;

        // Combine command and args like StdioServerForm does
        let command = serverParams.command || "";
        if (serverParams.args && Array.isArray(serverParams.args) && serverParams.args.length > 0) {
          command = command + " " + serverParams.args.join(" ");
        }

        // Format environment variables
        let env = "";
        if (serverParams.env && typeof serverParams.env === 'object') {
          env = Object.entries(serverParams.env)
            .map(([key, value]) => `${key}=${value}`)
            .join('\n');
        }

        form.setFieldsValue({
          serverName: server.serverName,
          serverType: server.serverType,
          command: command,
          readTimeoutSeconds: serverParams.read_timeout_seconds || 5,
          cwd: serverParams.cwd || "",
          encoding: serverParams.encoding || "utf-8",
          encodingErrorHandler: serverParams.encoding_error_handler || "strict",
          env: env,
          agentName: server.agentName,
          agentInstructions: server.agentDescription,
        });
      } else if (server.serverType === "SseServerParams") {
        setActiveTab("registry");

        // Pre-fill registry config form
        const serverParams = server.serverParams;

        // Format headers
        let headers = "";
        if (serverParams.headers && typeof serverParams.headers === 'object') {
          headers = JSON.stringify(serverParams.headers, null, 2);
        }

        form.setFieldsValue({
          serverType: server.serverType,
          registryUrl: serverParams.url,
          headers: headers,
          timeout: serverParams.timeout || 5,
          sseReadTimeout: serverParams.sse_read_timeout || 300,
          agentName: server.agentName,
          agentInstructions: server.agentDescription,
        });
      }
    } else if (!server && isOpen) {
      // Reset form when adding new server
      form.resetFields();
      setActiveTab("registry");
      // Set initial server type for registry tab
      form.setFieldsValue({ serverType: "SseServerParams" });
    }
  }, [server, isOpen, form]);

  const parseJsonConfig = (jsonString: string) => {
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      throw new Error("Invalid JSON configuration");
    }
  };

  const parseArgsString = (argsString: string) => {
    try {
      return JSON.parse(argsString);
    } catch (error) {
      // If not valid JSON, split by comma and trim
      return argsString.split(',').map(arg => arg.trim());
    }
  };

    const buildServerConfig = (values: any) => {
    let serverConfig: any;

    switch (activeTab) {
      case "json":
        serverConfig = parseJsonConfig(values.jsonConfig);
        break;

            case "registry":
                        // For registry, we'll need to fetch the config from the URL
        // For now, create a basic structure
        if (!values.serverType) {
          throw new Error("Server type is required");
        }
        if (!values.registryUrl) {
          throw new Error("Registry URL is required for registry server configuration");
        }

        const serverName = values.registryUrl.split('/').pop() || "registry-server";
        if (!serverName || serverName === "registry-server") {
          throw new Error("Invalid registry URL - could not extract server name");
        }

        // Parse headers if provided
        let headers = {};
        if (values.headers) {
          try {
            headers = JSON.parse(values.headers);
          } catch (e) {
            // Ignore parsing errors
          }
        }

        serverConfig = {
          server_name: serverName,
          server_params: {
            type: values.serverType,
            url: values.registryUrl,
            headers: headers,
            timeout: parseInt(values.timeout) || 5,
            sse_read_timeout: parseInt(values.sseReadTimeout) || 300,
          }
        };
        break;

                  case "manual":
        // Ensure we have valid server parameters
        if (!values.serverName) {
          throw new Error("Server name is required");
        }
        if (!values.serverType) {
          throw new Error("Server type is required");
        }
        if (!values.command) {
          throw new Error("Command is required for manual server configuration");
        }

        // Parse command and args like StdioServerForm does
        const commandParts = values.command.trim().split(" ");
        const command = commandParts[0] || "";
        const args = commandParts.slice(1) || [];

        // Parse environment variables if provided
        let env: Record<string, string> = {};
        if (values.env) {
          try {
            const envLines = values.env.split('\n').filter((line: string) => line.trim());
            envLines.forEach((line: string) => {
              const [key, ...valueParts] = line.split('=');
              if (key && valueParts.length > 0) {
                env[key.trim()] = valueParts.join('=').trim();
              }
            });
          } catch (e) {
            // Ignore parsing errors
          }
        }

        serverConfig = {
          server_name: values.serverName,
          server_params: {
            type: values.serverType,
            command: command,
            args: args,
            read_timeout_seconds: parseInt(values.readTimeoutSeconds) || 5,
            cwd: values.cwd || undefined,
            encoding: values.encoding || "utf-8",
            encoding_error_handler: values.encodingErrorHandler || "strict",
            env: Object.keys(env).length > 0 ? env : undefined,
          }
        };
        break;

      default:
        throw new Error("Invalid configuration method");
    }

    // Auto-generate agent name when server config changes
    updateAgentName(serverConfig);

    return serverConfig;
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const values = await form.validateFields();

      const serverConfig = buildServerConfig(values);

      if (server) {
        // Editing existing server - return just the server config
        if (onSave) {
          onSave({
            serverConfig: serverConfig,
            isEditing: true
          } as any);
        }
      } else {
        // Adding new server - create complete agent configuration
        const agentConfig = {
          name: values.agentName || generateAgentName(serverConfig.server_name),
          description: values.agentInstructions || agentDescription || `Agent using ${serverConfig.server_name}`,
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

        console.log("Saving agent config:", agentConfig);

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

  const generateAgentName = (serverName: string) => {
    return serverName + "agent";
  };

  const updateAgentName = (serverConfig: any) => {
    const currentAgentName = form.getFieldValue('agentName');
    // Only auto-generate if the field is empty or contains the default pattern
    if (!currentAgentName || currentAgentName.includes('agent') || currentAgentName.includes('Agent')) {
      const generatedName = generateAgentName(serverConfig.server_name);
      form.setFieldsValue({ agentName: generatedName });
    }
  };

  const handleTestConnection = async () => {
    try {
      const values = await form.validateFields();
      const serverConfig = buildServerConfig(values);

      console.log("Test connection - Form values:", values);
      console.log("Test connection - Built config:", serverConfig);

      // Test the connection using the built config
      const result = await mcpHealthAPI.testServerConnection(
        serverConfig.server_name,
        serverConfig.server_params.type,
        serverConfig.server_params
      );

      if (result.is_available) {
        message.success(`Connection test passed! Server is available.`);
      } else {
        message.error(`Connection failed: ${result.error_message}`);
      }
    } catch (error) {
      console.error("Test connection failed:", error);

      let errorMessage = "Failed to test connection";
      if (error instanceof Error) {
        if (error.message.includes("Server name is required")) {
          errorMessage = "Please fill in the server name field";
        } else if (error.message.includes("Server type is required")) {
          errorMessage = "Server type is missing. Please try switching tabs again.";
        } else if (error.message.includes("Command is required")) {
          errorMessage = "Please fill in the command field";
        } else if (error.message.includes("Registry URL is required")) {
          errorMessage = "Please fill in the registry URL field";
        } else if (error.message.includes("Invalid registry URL")) {
          errorMessage = "Please provide a valid registry URL";
        } else if (error.message.includes("Unprocessable Entity")) {
          errorMessage = "Invalid server configuration. Please check all required fields.";
        } else {
          errorMessage = error.message;
        }
      }

      message.error(errorMessage);
    }
  };

  return (
    <Modal
      title={server ? "Edit MCP Server" : "Add MCP Server"}
      open={isOpen}
      onCancel={onClose}
      footer={[
        <Button key="test" onClick={handleTestConnection}>
          Test Connection
        </Button>,
        <Button key="save" type="primary" onClick={handleSave} loading={isSaving}>
          {server ? "Update Server" : "Add Server"}
        </Button>,
      ]}
      width={600}
      className="max-h-[75vh] p-0 overflow-y-auto"
    >
      <Form form={form} layout="vertical">
        <div className="space-y-6 p-6">
          {/* Tabs */}
          <div>
            <Tabs
              activeKey={activeTab}
              onChange={handleTabChange}
              items={[
                {
                  key: "json",
                  label: "JSON Config",
                },
                {
                  key: "registry",
                  label: "SSE",
                },
                {
                  key: "manual",
                  label: "Stdio",
                },
              ]}
            />
          </div>

          {/* Configuration Content */}
          <div className="space-y-6">
            {/* Render configuration tabs based on active tab */}
            {activeTab === "json" && <JsonConfigTab form={form} />}
            {activeTab === "registry" && <RegistryConfigTab form={form} />}
            {activeTab === "manual" && <ManualConfigTab form={form} />}
          </div>

          {/* Agent Configuration */}
          <div className="space-y-4">
            <Divider />
            <h3 className="text-lg font-medium">Agent Configuration</h3>

            <Form.Item
              label="Agent Name"
              name="agentName"
            >
              <Input placeholder="Auto-generated from server name" />
            </Form.Item>

            <Form.Item
              label="Agent Instructions"
              name="agentInstructions"
              rules={[{ required: true, message: "Agent instructions are required" }]}
            >
              <TextArea
                rows={4}
                placeholder="This agent can help you with... Use this server when the user needs to..."
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

export default McpServersConfig;
