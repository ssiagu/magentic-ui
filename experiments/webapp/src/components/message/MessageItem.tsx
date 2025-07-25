import React, { useState } from 'react';
import { TaskMessage } from '../../types/task';
import { MessageHeader } from './MessageHeader';
import { MessageContent } from './MessageContent';
import { MessageMetadata } from './MessageMetadata';
import {
  isPlanMessage,
  isToolCallRequest,
  isToolCallExecution,
  isToolCallSummary,
  isThoughtEvent,
  isBaseTextChatMessage,
  isMultiModalMessage
} from './content';

interface MessageItemProps {
  message: TaskMessage;
  showTimestamp?: boolean;
  compact?: boolean;
  maxLength?: number;
  allowHtml?: boolean;
}

// Define message type info for headers
const getMessageTypeInfo = (content: string) => {
  try {
    const chatMessage = JSON.parse(content);

    if (isPlanMessage(chatMessage)) {
      return { type: 'Plan', icon: '📋' };
    } else if (isToolCallRequest(chatMessage)) {
      return { type: 'Tool Call Request', icon: '🛠️📞' };
    } else if (isToolCallExecution(chatMessage)) {
      return { type: 'Tool Call Results', icon: '🛠️✅' };
    } else if (isToolCallSummary(chatMessage)) {
      return { type: 'Tool Call Summary', icon: '🛠️💬' };
    } else if (isThoughtEvent(chatMessage)) {
      return { type: 'Thought Process', icon: '🧠' };
    } else if (isMultiModalMessage(chatMessage)) {
      return { type: 'Multi-Modal Message', icon: '🖼️' };
    }
  } catch {
    // Not JSON or parsing failed
  }

  return { type: 'Message', icon: '💬' };
};

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  showTimestamp = false,
  compact = false,
  maxLength = 500,
  allowHtml = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const messageTypeInfo = getMessageTypeInfo(message.content);
  const messageColor = message.source === "user" ? 'blue' : 'gray'
  return (
    <div className={
      `bg-${messageColor}-50
      rounded-lg p-3 ${compact ? 'text-sm' : ''}
      border-l-4 border-1 border-${messageColor}-500
      `
    }>
      <MessageHeader
        source={message.source}
        type={messageTypeInfo.type}
        icon={messageTypeInfo.icon}
        timestamp={showTimestamp ? message.timestamp : undefined}
      />
      <MessageContent
        content={message.content}
        maxLength={maxLength}
        showExpanded={isExpanded}
        onToggleExpanded={() => setIsExpanded(!isExpanded)}
        allowHtml={allowHtml}
      />
      {message.metadata && <MessageMetadata metadata={message.metadata} />}
    </div>
  );
};
