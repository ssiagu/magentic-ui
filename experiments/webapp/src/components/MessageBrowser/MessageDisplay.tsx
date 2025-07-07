import { SelectedTaskRunData } from './types';
import { MessageColumn } from './MessageColumn';

interface MessageDisplayProps {
  selectedTask: string;
  selectedTaskDataFromRuns: SelectedTaskRunData[];
}

export const MessageDisplay = ({ 
  selectedTask, 
  selectedTaskDataFromRuns 
}: MessageDisplayProps) => {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 h-[95vh] flex flex-col">
      <h3 className="text-lg font-semibold mb-4 flex-shrink-0">
        Message Histories {selectedTask ? `- ${selectedTask}` : ''}
      </h3>
      {selectedTask && selectedTaskDataFromRuns.length > 0 ? (
        <div className="overflow-x-auto flex-1">
          {/* Side-by-side message display with headers that scroll with content */}
          <div className="flex gap-4 min-w-fit h-full">
            {selectedTaskDataFromRuns.map((runItem, runIndex) => (
              <MessageColumn
                key={runIndex}
                runItem={runItem}
                runIndex={runIndex}
              />
            ))}
          </div>
        </div>
      ) : selectedTask ? (
        <div className="text-center text-gray-500 py-8">
          No message data found for task {selectedTask}
        </div>
      ) : (
        <div className="text-center text-gray-500 py-8">
          Select a task to view message histories across all runs
        </div>
      )}
    </div>
  );
};
