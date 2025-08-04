import React from "react";
import { Form, Input, Collapse, Flex } from "antd";

const { TextArea } = Input;

interface ManualConfigTabProps {
  form: any;
}

const ManualConfigTab: React.FC<ManualConfigTabProps> = ({ form }) => {
  return (
    <div className="space-y-4">
      {/* Hidden server type field - always StdioServerParams for manual setup */}
      <Form.Item name="serverType" hidden>
        <Input />
      </Form.Item>

      <Form.Item
        label="Server Name"
        name="serverName"
        rules={[{ required: true, message: "Server name is required" }]}
      >
        <Input placeholder="my-server" />
      </Form.Item>

      {/* Command field - similar to StdioServerForm */}
      <Form.Item
        label="Command (including args)"
        name="command"
        rules={[{ required: true, message: "Command is required" }]}
      >
        <Input placeholder="npx -y @modelcontextprotocol/server-filesystem" />
      </Form.Item>

      {/* Optional Properties - similar to StdioServerForm */}
      <Collapse>
        <Collapse.Panel key="1" header="Optional Properties">
          <Form.Item label="Read Timeout (seconds)" name="readTimeoutSeconds">
            <Input type="number" placeholder="5" />
          </Form.Item>

          <Form.Item label="Working Directory (cwd)" name="cwd">
            <Input placeholder="Working directory for the command" />
          </Form.Item>

          <Form.Item label="Encoding" name="encoding">
            <Input placeholder="utf-8" />
          </Form.Item>

          <Form.Item label="Encoding Error Handler" name="encodingErrorHandler">
            <Input placeholder="strict" />
          </Form.Item>

          <Form.Item label="Environment Variables (env)" name="env">
            <TextArea
              rows={3}
              placeholder="KEY1=VALUE1&#10;KEY2=VALUE2"
            />
          </Form.Item>
        </Collapse.Panel>
      </Collapse>
    </div>
  );
};

export default ManualConfigTab;
