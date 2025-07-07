import { SelectedTaskRunData } from './types';
import { getScoreEmoji, getScoreColorClass } from '@/utils/dataUtils';

interface RunHeaderProps {
  runItem: SelectedTaskRunData;
  runIndex: number;
}

export const RunHeader = ({ runItem, runIndex }: RunHeaderProps) => {
  const score = runItem.task?.score.score ?? 0;
  
  return (
    <div className="p-3 bg-gray-50 rounded-lg mb-4 flex-shrink-0">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium">
          Run {runItem.runInfo?.run_id || runIndex + 1}
        </div>
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getScoreColorClass(score)}`}>
          <span className="mr-1">{getScoreEmoji(score)}</span>
          {score === 1 ? 'Success' : score === 0 ? 'Failed' : 'Partial'}
        </span>
      </div>
      <div className="text-xs text-gray-600">
        Score: {score}
      </div>
      <div className="text-xs text-gray-600">
        Duration: {Math.round((runItem.task?.times.duration || 0) / 1000)}s
      </div>
      <div className="text-xs text-gray-600">
        Messages: {runItem.task?.messages.length || 0}
      </div>
    </div>
  );
};
