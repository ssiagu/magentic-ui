import React, { useMemo } from 'react';
import { RunData, TaskData } from '../../types/run';
import { CheckCircle, XCircle, MessageCircleQuestion } from 'lucide-react';

interface RunHeaderProps {
  run: RunData;
  task?: TaskData;
  onDelete?: () => void;
  showConfig?: boolean;
}

export const RunHeader: React.FC<RunHeaderProps> = ({ 
  run, 
  task,
  onDelete,
  showConfig = false
}) => {
  const runArg = run.args[0];

  // Extract model using the same logic as RunCard
  const model = useMemo(() => {
    try {
      return runArg.config_content?.model_client?.config?.clients?.[0]?.config?.model ?? "unknown"
    } catch (error) {
      return "unknown"
    }
  }, [runArg]);

  // Parse config filename without extension
  const configName = useMemo(() => {
    const fullPath = runArg.config || '';
    const filename = fullPath.split('/').pop() || fullPath;
    return filename.replace(/\.[^/.]+$/, '');
  }, [runArg.config]);

  const systemType = runArg.system_type;
  const datasetSplit = `${runArg.dataset} - ${runArg.split}`;

  // Get task score information for success/failure badge
  const taskScoreInfo = useMemo(() => {
    if (!task?.score) return null;
    
    const score = task.score.score;
    if (score === 1) {
      return {
        icon: <CheckCircle className="w-3 h-3 text-green-500" />,
        text: 'Success',
        bgColor: 'bg-green-100',
        textColor: 'text-green-800',
        borderColor: 'border-green-200'
      };
    } else if (score === 0) {
      return {
        icon: <XCircle className="w-3 h-3 text-red-500" />,
        text: 'Failed',
        bgColor: 'bg-red-100',
        textColor: 'text-red-800',
        borderColor: 'border-red-200'
      };
    } else {
      return {
        icon: <MessageCircleQuestion className="w-3 h-3 text-yellow-500" />,
        text: `${(score * 100).toFixed(0)}%`,
        bgColor: 'bg-yellow-100',
        textColor: 'text-yellow-800',
        borderColor: 'border-yellow-200'
      };
    }
  }, [task]);
  
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex-1 min-w-0">
        {/* System Type - Secondary color, small */}
        <p className="text-sm text-gray-500 mb-1">{systemType}</p>
        
        {/* Config Name - Primary color, large */}
        <h3 className="text-lg font-semibold text-gray-800 mb-2 truncate" title={configName}>
          {configName}
        </h3>
        
        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
            Run {runArg.run_id}
          </span>
          {taskScoreInfo && (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${taskScoreInfo.bgColor} ${taskScoreInfo.textColor} ${taskScoreInfo.borderColor}`}>
              {taskScoreInfo.icon}
              <span className="ml-1">{taskScoreInfo.text}</span>
            </span>
          )}
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {model}
          </span>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            {datasetSplit}
          </span>
        </div>

        {/* Show full config path if requested */}
        {showConfig && (
          <p className="text-xs text-gray-500 mt-2 truncate" title={runArg.config}>
            Config: {runArg.config}
          </p>
        )}
      </div>
      
      {onDelete && (
        <button
          onClick={onDelete}
          className="text-red-500 hover:text-red-700 text-sm ml-4 flex-shrink-0"
        >
          Delete
        </button>
      )}
    </div>
  );
};
