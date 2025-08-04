import React from "react";
import { Form, Input, Collapse } from "antd";

interface RegistryConfigTabProps {
  form: any;
}

const RegistryConfigTab: React.FC<RegistryConfigTabProps> = ({ form }) => {
  return (
    <div className="space-y-4">
      {/* Hidden server type field - always SseServerParams for registry setup */}
      <Form.Item name="serverType" hidden>
        <Input />
      </Form.Item>

      {/* URL field - similar to SseServerForm */}
      <Form.Item
        label="URL"
        name="registryUrl"
        rules={[{ required: true, message: "Registry URL is required" }]}
      >
        <Input
          placeholder="http://localhost:8000/sse"
        />
      </Form.Item>

      {/* Optional Properties - similar to SseServerForm */}
      <Collapse>
        <Collapse.Panel key="1" header="Optional Properties">
          <Form.Item label="Headers (JSON)" name="headers">
            <Input
              placeholder='{"Authorization": "Bearer token"}'
            />
          </Form.Item>

          <Form.Item label="Timeout (seconds)" name="timeout">
            <Input type="number" placeholder="5" />
          </Form.Item>

          <Form.Item label="SSE Read Timeout (seconds)" name="sseReadTimeout">
            <Input type="number" placeholder="300" />
          </Form.Item>
        </Collapse.Panel>
      </Collapse>
    </div>
  );
};

export default RegistryConfigTab;
