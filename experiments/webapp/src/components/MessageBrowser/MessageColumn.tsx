import { SelectedTaskRunData } from './types';
import { RunHeader } from './RunHeader';
import { MessageItem } from './MessageItem';

interface MessageColumnProps {
  runItem: SelectedTaskRunData;
  runIndex: number;
}

export const MessageColumn = ({ runItem, runIndex }: MessageColumnProps) => {
  return (
    <div className="flex flex-col min-w-80 max-w-80 h-full">
      <RunHeader runItem={runItem} runIndex={runIndex} />
      
      {/* Messages for each run - independently scrollable */}
      <div className="space-y-2 overflow-y-auto flex-1">
        {runItem.task?.messages.map((message, messageIndex) => (
          <MessageItem
            key={messageIndex}
            message={message}
            messageIndex={messageIndex}
          />
        )) || (
          <div className="text-center text-gray-500 py-4">
            No messages
          </div>
        )}
      </div>
    </div>
  );
};
