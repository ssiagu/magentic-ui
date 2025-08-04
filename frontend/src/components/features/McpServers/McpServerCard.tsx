import React, { useEffect, useState } from "react";
import { Card, Typography, Button, Tooltip, Tag } from "antd";
import { MCPServerInfo } from "./types";
import { mcpHealthAPI } from "../../views/api";

const { Title, Text } = Typography;

interface McpServerCardProps {
  server: MCPServerInfo;
  index: number;
  onEdit?: (server: MCPServerInfo) => void;
  onDelete?: (server: MCPServerInfo) => void;
}

const McpServerCard: React.FC<McpServerCardProps> = ({ server, index, onEdit, onDelete }) => {
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toolsAvailable, setToolsAvailable] = useState<string[]>([]);

  const getServerTypeLabel = (serverType: string) => {
    switch (serverType) {
      case "StdioServerParams":
        return "Stdio";
      case "SseServerParams":
        return "SSE";
      default:
        return "Unknown";
    }
  };

  const testConnection = async () => {
    setIsTesting(true);
    setErrorMessage(null);

    try {
      const serverParams = {
        ...server.serverParams,
        type: server.serverType
      };

      console.log("Testing connection with:", {
        serverName: server.serverName,
        serverType: server.serverType,
        serverParams: serverParams
      });

      const result = await mcpHealthAPI.testServerConnection(
        server.serverName,
        server.serverType,
        serverParams
      );

      setIsAvailable(result.is_available);
      setToolsAvailable(result.tools_available);
      setErrorMessage(result.error_message || null);
    } catch (error) {
      setIsAvailable(false);
      console.error("Connection test error:", error);

      // Try to get more details about the error
      let errorMessage = "Failed to test connection";
      if (error instanceof Error) {
        if (error.message.includes("Unprocessable Entity")) {
          errorMessage = "Invalid server configuration. Please check the server parameters.";
        } else {
          errorMessage = error.message;
        }
      }

      setErrorMessage(errorMessage);
    } finally {
      setIsTesting(false);
    }
  };

  // Test connection on component mount
  useEffect(() => {
    testConnection();
  }, [server.serverName, server.serverType, JSON.stringify(server.serverParams)]);

  const getConnectionStatus = () => {
    if (isTesting) {
      return {
        color: "yellow",
        text: "Testing...",
        dotColor: "bg-yellow-500"
      };
    }

    if (isAvailable === null) {
      return {
        color: "gray",
        text: "Unknown",
        dotColor: "bg-gray-500"
      };
    }

    if (isAvailable) {
      return {
        color: "green",
        text: "Available",
        dotColor: "bg-green-500"
      };
    }

    return {
      color: "red",
      text: "Unavailable",
      dotColor: "bg-red-500"
    };
  };

  const status = getConnectionStatus();

  return (
    <Card
      key={`${server.agentName}-${server.serverName}-${index}`}
      className="h-full border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
    >
      <div className="space-y-3">
        <div>
          <Title level={4} className="text-gray-900 dark:text-gray-100 mb-1">
            {server.serverName}
          </Title>
          <Tag color="blue" className="text-xs">
            {getServerTypeLabel(server.serverType)}
          </Tag>
        </div>

        {/* Error message if connection failed */}
        {errorMessage && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-2">
            <Text className="text-red-600 dark:text-red-400 text-xs">
              {errorMessage}
            </Text>
          </div>
        )}

        {/* Tools available if available */}
        {isAvailable && toolsAvailable.length > 0 && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-2">
            <Text className="text-green-600 dark:text-green-400 text-xs">
              {toolsAvailable.length} tool{toolsAvailable.length !== 1 ? 's' : ''} available
            </Text>
          </div>
        )}

        {/* Metadata */}
        <div className="pt-3">
          <div className="space-y-1">
            {server.agentDescription && (
              <div>
                <Text className="text-gray-700 dark:text-gray-300 text-right">
                  {server.agentDescription}
                </Text>
              </div>
            )}
          </div>
        </div>

        {/* Action buttons at the bottom */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
          <Button
            type="text"
            size="small"
            className="rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            onClick={() => onEdit?.(server)}
          >
            Edit
          </Button>
          <Button
            type="text"
            size="small"
            danger
            className="rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            onClick={() => onDelete?.(server)}
          >
            Remove
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default McpServerCard;
