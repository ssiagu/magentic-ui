import { TaskData } from '@/types';
import { TaskRunStatus } from './types';
import { getScoreEmoji, getScoreColorClass } from '@/utils/dataUtils';

interface TaskCardProps {
  task: TaskData;
  isSelected: boolean;
  taskStatusAcrossRuns: TaskRunStatus[];
  onClick: () => void;
}

export const TaskCard = ({ 
  task, 
  isSelected, 
  taskStatusAcrossRuns, 
  onClick 
}: TaskCardProps) => {
  return (
    <div
      className={`p-3 rounded-lg border-2 cursor-pointer transition-colors min-w-64 flex-shrink-0 bg-white ${
        isSelected
          ? 'border-blue-500'
          : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={onClick}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${getScoreColorClass(task.score.score)}`}>
          {getScoreEmoji(task.score.score)}
        </span>
        <span className="text-sm font-medium truncate">
          {task.taskId}
        </span>
      </div>
      
      {/* Run status badges */}
      <div className="flex flex-wrap gap-1 mt-2">
        {taskStatusAcrossRuns.map((runStatus, index) => (
          <div
            key={index}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getScoreColorClass(runStatus.score)} border`}
            title={`Run ${runStatus.runId}: Score ${runStatus.score}`}
          >
            <span className="text-xs">
              {getScoreEmoji(runStatus.score)}
            </span>
            <span className="text-xs">
              {runStatus.runId}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
