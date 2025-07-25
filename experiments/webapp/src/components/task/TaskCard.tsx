import React from 'react';
import { TaskData } from '../../types/task';
import { TaskHeader } from './TaskHeader';
import { TaskMetrics } from './TaskMetrics';
import { TaskActions } from './TaskActions';

import { CheckCircle, XCircle, MessageCircleQuestion } from "lucide-react"
import { TaskAnalysis } from '@/types';
import { AnalysisCard } from '../analysis';

interface TaskCardProps {
  task: TaskData;
  onAnalyze?: (taskId: string) => void;
  isAnalyzing?: boolean;
  disabled?: boolean;
  showMetrics?: boolean;
  compact?: boolean;
  onViewDetails?: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
  badge?: React.ReactNode;
  analysis?: TaskAnalysis;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onAnalyze,
  isAnalyzing,
  disabled,
  showMetrics = false,
  compact = false,
  onViewDetails,
  onDelete,
  badge,
  analysis,
}) => {
  const getScoreIcon = (score: number) => {
    if (score === 1) return <CheckCircle className="text-green-600 w-6 h-6" />
    else if (score === 0) return <XCircle className="text-red-600 w-6 h-6" />
    else return <MessageCircleQuestion className="text-yellow-600 w-6 h-6" />
  };

  return (
    <div className={`border rounded-lg p-4 ${compact ? 'space-y-2' : 'space-y-4'}`}>
      <TaskHeader task={task} icon={getScoreIcon(task.score.score)} />
      <div className="flex flex-wrap gap-2">
        {badge}
      </div>
      {showMetrics && <TaskMetrics times={task.times} score={task.score} />}
      {(onAnalyze || onViewDetails || onDelete) && (
        <TaskActions
          onAnalyze={onAnalyze ? () => onAnalyze(task.taskId) : undefined}
          isAnalyzing={isAnalyzing}
          disabled={disabled}
          onViewDetails={onViewDetails ? () => onViewDetails(task.taskId) : undefined}
          onDelete={onDelete ? () => onDelete(task.taskId) : undefined}
        />
      )}
      {analysis &&
        <AnalysisCard type='task' analysis={analysis} />
      }
    </div>
  );
};
