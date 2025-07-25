import { RunData, TaskData } from '@/types';
import { MessageColumn } from './MessageColumn';
import { EmptyState } from '@/components/common';
import { useMemo } from 'react';

interface MessageDisplayProps {
  selectedTask: string;
  runs: RunData[];
}

export const MessageDisplay = ({ 
  selectedTask, 
  runs 
}: MessageDisplayProps) => {
  
  const runTaskPairs = useMemo(() => {
    let pairs: [RunData, TaskData][] = [];
    for (const run of runs) {
      const task = run.tasks.find(t => t.taskId === selectedTask);
      if (task) {
        pairs.push([run, task])
      }
    }

    return pairs;
  }, [selectedTask, runs])

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 h-[95vh] flex flex-col">
      <h3 className="text-lg font-semibold mb-4 flex-shrink-0">
        Message Histories {selectedTask ? `- ${selectedTask}` : ''}
      </h3>
      {selectedTask && runs.length > 0 ? (
        <div className="overflow-x-auto flex-1">
          {/* Side-by-side message display with headers that scroll with content */}
          <div className="flex gap-4 h-full w-full">
            {runTaskPairs.map(([run, task], index) => (
              <MessageColumn
                key={index}
                run={run}
                task={task}
              />
            ))}
          </div>
        </div>
      ) : selectedTask ? (
        <EmptyState
          title={`No data found for task ${selectedTask}`}
          description="This task doesn't have message data in the selected runs"
          icon={
            <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          }
        />
      ) : (
        <EmptyState
          title="Select a task"
          description="Choose a task from the list above to view message histories across all runs"
          icon={
            <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 4v-4z" />
            </svg>
          }
        />
      )}
    </div>
  );
};
