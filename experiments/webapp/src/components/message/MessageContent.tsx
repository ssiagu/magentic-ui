import React, { JSX } from 'react';
import {
  PlanMessage,
  ToolCallRequest,
  ToolCallExecution,
  ToolCallSummary,
  ThoughtEvent,
  BaseTextChatMessage,
  MultiModalMessage,
  UnstructuredMessage,
  isPlanMessage,
  isToolCallRequest,
  isToolCallExecution,
  isToolCallSummary,
  isThoughtEvent,
  isBaseTextChatMessage,
  isMultiModalMessage
} from './content';

interface MessageContentProps {
  content: string;
  maxLength?: number;
  showExpanded?: boolean;
  onToggleExpanded?: () => void;
  allowHtml?: boolean;
}

export const MessageContent: React.FC<MessageContentProps> = ({ 
  content, 
  maxLength = 100,
  showExpanded = false,
  onToggleExpanded,
  allowHtml = false
}) => {
  let structuredContent: JSX.Element | undefined = undefined;
  
  try {
    const chatMessage = JSON.parse(content);
    
    if (isPlanMessage(chatMessage)) {
      structuredContent = <PlanMessage plan={chatMessage} maxLength={maxLength} showExpanded={showExpanded} onToggleExpanded={onToggleExpanded} />;
    } else if (isToolCallRequest(chatMessage)) {
      structuredContent = <ToolCallRequest request={chatMessage} maxLength={maxLength} showExpanded={showExpanded} onToggleExpanded={onToggleExpanded} />;
    } else if (isToolCallExecution(chatMessage)) {
      structuredContent = <ToolCallExecution execution={chatMessage} maxLength={maxLength} showExpanded={showExpanded} onToggleExpanded={onToggleExpanded} />;
    } else if (isToolCallSummary(chatMessage)) {
      structuredContent = <ToolCallSummary summary={chatMessage} maxLength={maxLength} showExpanded={showExpanded} onToggleExpanded={onToggleExpanded} />;
    } else if (isThoughtEvent(chatMessage)) {
      structuredContent = <ThoughtEvent thought={chatMessage} maxLength={maxLength} showExpanded={showExpanded} onToggleExpanded={onToggleExpanded} />;
    } else if (isMultiModalMessage(chatMessage)) {
      structuredContent = <MultiModalMessage message={chatMessage} maxLength={maxLength} showExpanded={showExpanded} onToggleExpanded={onToggleExpanded} />;
    } else if (isBaseTextChatMessage(chatMessage)) {
      structuredContent = <BaseTextChatMessage message={chatMessage} maxLength={maxLength} showExpanded={showExpanded} onToggleExpanded={onToggleExpanded} />;
    } else {
      console.log(chatMessage)
    }
  } catch {
    // JSON parsing failed - treat as unstructured content
    structuredContent = undefined;
  }

  // If we have structured content, render it
  if (structuredContent) {
    return (
      <div className="space-y-2">
        {structuredContent}
      </div>
    );
  }

  // Fall back to UnstructuredMessage component
  return (
    <UnstructuredMessage 
      content={content}
      maxLength={maxLength}
      showExpanded={showExpanded}
      onToggleExpanded={onToggleExpanded}
      allowHtml={allowHtml}
    />
  );
};
