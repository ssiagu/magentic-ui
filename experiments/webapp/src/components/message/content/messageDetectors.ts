// Helper function to detect if content might be a plan
export const isPlanMessage = (obj: any): boolean => {
  return obj && typeof obj === 'object' && (
    obj.task || obj.plan_summary || obj.steps || 
    (obj.title && obj.index !== undefined && obj.agent_name)
  );
};

// Helper function to detect if content might be a tool call request
export const isToolCallRequest = (obj: any): boolean => {
  return obj && typeof obj === 'object' && obj.content && Array.isArray(obj.content) &&
    obj.content.some((call: any) => call.name && call.arguments);
};

// Helper function to detect if content might be a tool call execution
export const isToolCallExecution = (obj: any): boolean => {
  return obj && typeof obj === 'object' && obj.content && Array.isArray(obj.content) &&
    obj.content.some((result: any) => result.call_id || result.content);
};

// Helper function to detect if content might be a tool call summary
export const isToolCallSummary = (obj: any): boolean => {
  return obj && typeof obj === 'object' && 
    obj.content && typeof obj.content === 'string' &&
    (obj.type === 'tool_call_summary' || obj.message_type === 'tool_call_summary' ||
     (obj.source && obj.source.includes('summary')));
};

// Helper function to detect if content might be a thought event
export const isThoughtEvent = (obj: any): boolean => {
  return obj && typeof obj === 'object' && obj.content && typeof obj.content === 'string' &&
    (obj.type === 'thought' || obj.event_type === 'thought');
};

// Helper function to detect if content might be a BaseTextChatMessage
export const isBaseTextChatMessage = (obj: any): boolean => {
  return obj && typeof obj === 'object' && 
    obj.content && typeof obj.content === 'string' &&
    obj.source && typeof obj.source === 'string'
};

// Helper function to detect if content might be a MultiModalMessage
export const isMultiModalMessage = (obj: any): boolean => {
  return obj && typeof obj === 'object' && 
    obj.content && Array.isArray(obj.content) &&
    obj.content.some((item: any) => 
      typeof item === 'string' || 
      (typeof item === 'object' && item.data)
    );
};
