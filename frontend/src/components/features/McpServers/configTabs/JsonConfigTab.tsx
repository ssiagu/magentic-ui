import React, { useState, useCallback } from "react";
import { Form, Input, message } from "antd";

const { TextArea } = Input;

interface JsonConfigTabProps {
  form: any;
}

const JsonConfigTab: React.FC<JsonConfigTabProps> = ({ form }) => {
  const [textareaValue, setTextareaValue] = useState(`{
  "server_name": "my-server",
  "server_type": "StdioServerParams",
  "server_params": {
    "command": "npx",
    "args": ["@modelcontextprotocol/server-filesystem"],
    "read_timeout_seconds": 5
  }
}`);

  const validateAndParseJson = (content: string) => {
    try {
      const parsed = JSON.parse(content);

      // TODO: validate the MCP config
      if (!parsed.server_name) {
        throw new Error("Missing required field: server_name");
      }

      return parsed;
    } catch (error) {
      throw new Error(`Invalid JSON configuration: ${error instanceof Error ? error.message : 'Invalid JSON format'}`);
    }
  };

    const handleFileRead = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        console.log("File content loaded:", content.substring(0, 100) + "...");

        const parsed = validateAndParseJson(content);
        console.log("Parsed JSON:", parsed);

        // Format the JSON nicely for editing
        const formattedJson = JSON.stringify(parsed, null, 2);
        console.log("Formatted JSON:", formattedJson.substring(0, 100) + "...");

        // Set the form value
        form.setFieldsValue({ jsonConfig: formattedJson });
        setTextareaValue(formattedJson);
        console.log("Form values after set:", form.getFieldsValue());

        // Force a re-render by triggering form validation
        setTimeout(() => {
          form.validateFields(['jsonConfig']);
        }, 100);

        message.success("JSON file loaded successfully!");
      } catch (error) {
        console.error("File read error:", error);
        message.error(error instanceof Error ? error.message : "Failed to parse JSON file");
      }
    };
    reader.readAsText(file);
  }, [form]);

  const handleTextareaDrop = useCallback((e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type === 'application/json' || file.name.endsWith('.json')) {
        handleFileRead(file);
      } else {
        message.error('Please upload a valid JSON file');
      }
    }
  }, [handleFileRead]);

  const handleTextareaDragOver = useCallback((e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

    return (
    <div className="space-y-2">
      {/* JSON Editor */}
      <Form.Item
        label="JSON Configuration"
        name="jsonConfig"
        help="Drag and drop a JSON file directly onto the textarea, or paste JSON content."
        rules={[
          { required: true, message: "JSON configuration is required" },
          {
            validator: async (_, value) => {
              if (value) {
                try {
                  validateAndParseJson(value);
                } catch (error) {
                  throw new Error(error instanceof Error ? error.message : "Invalid JSON");
                }
              }
            }
          }
        ]}
      >
        <TextArea
          rows={6}
          value={textareaValue}
          placeholder={`{
  "server_name": "my-server",
  "server_type": "StdioServerParams",
  "server_params": {
    "command": "npx",
    "args": ["@modelcontextprotocol/server-filesystem"],
    "read_timeout_seconds": 5
  }
}`}
          onChange={(e) => {
            setTextareaValue(e.target.value);
            form.setFieldsValue({ jsonConfig: e.target.value });
          }}
          onDrop={handleTextareaDrop}
          onDragOver={handleTextareaDragOver}
          className="cursor-text"
        />
      </Form.Item>
    </div>
  );
};

export default JsonConfigTab;
