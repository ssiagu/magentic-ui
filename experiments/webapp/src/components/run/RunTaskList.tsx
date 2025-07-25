import React from 'react';
import { TaskData } from '../../types/task';
import { TaskCard } from '../task/TaskCard';

interface RunTaskListProps {
  tasks: TaskData[];
  onTaskSelect?: (taskId: string) => void;
  selectedTaskId?: string;
  maxTasks?: number;
  compact?: boolean;
}

export const RunTaskList: React.FC<RunTaskListProps> = ({ 
  tasks, 
  onTaskSelect,
  selectedTaskId,
  maxTasks = 5,
  compact = true
}) => {
  const displayTasks = tasks.slice(0, maxTasks);
  const hasMore = tasks.length > maxTasks;

  return (
    <div className="space-y-2">
      <h4 className="font-medium text-sm">Tasks ({tasks.length})</h4>
      <div className="space-y-2">
        {displayTasks.map((task) => (
          <div
            key={task.taskId}
            className={`cursor-pointer ${selectedTaskId === task.taskId ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => onTaskSelect?.(task.taskId)}
          >
            <TaskCard task={task} compact={compact} />
          </div>
        ))}
      </div>
      {hasMore && (
        <p className="text-xs text-gray-500 text-center">
          ... and {tasks.length - maxTasks} more tasks
        </p>
      )}
    </div>
  );
};
