import { TaskMessage } from '@/types';
import { formatMessageContent, formatTimestamp } from '@/utils/dataUtils';

interface MessageItemProps {
  message: TaskMessage;
  messageIndex: number;
}

export const MessageItem = ({ message, messageIndex }: MessageItemProps) => {
  return (
    <div
      key={messageIndex}
      className={`p-2 rounded text-xs max-h-[300px] overflow-y-auto ${
        message.source === 'user' 
          ? 'bg-blue-50 border-l-2 border-blue-500' 
          : 'bg-gray-50 border-l-2 border-gray-500'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-medium capitalize text-xs">
          {message.source}
        </span>
        {message.timestamp && (
          <span className="text-xs text-gray-500">
            {formatTimestamp(message.timestamp)}
          </span>
        )}
      </div>
      <div 
        className="text-xs text-gray-700 whitespace-pre-wrap break-words"
        dangerouslySetInnerHTML={{
          __html: formatMessageContent(message.content)
        }}
      />
    </div>
  );
};
