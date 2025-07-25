import { MessageItem } from '@/components/message';
import { EmptyState } from '@/components/common';
import { RunHeader } from '@/components/run';
import { RunData, TaskData } from '@/types';
import { useMemo } from 'react';


interface MessageColumnProps {
  run: RunData;
  task?: TaskData;
}

export const MessageColumn = ({ run, task }: MessageColumnProps) => {
  return (
    <div className="flex flex-col h-full flex-1 gap-4 min-w-0" style={{ minWidth: '33%'}}>
      <div className='bg-white rounded-lg p-2 shadow-lg border border-gray-900'>
        <RunHeader run={run} task={task} showConfig={false} />
      </div>

      {/* Messages for each run - independently scrollable */}
      <div className="space-y-2 overflow-y-auto flex-1 bg-gray-50 p-2 shadow-inner">
        {task?.messages.map((message, messageIndex) => (
          <MessageItem
        key={messageIndex}
        message={message}
          />
        )) || (
          <EmptyState
        title="No messages"
        description="This run doesn't have message data"
          />
        )}
      </div>
    </div>
  );
};
