import React from 'react';
import { TaskTimes, TaskScore } from '../../types/task';
import { MetricItem } from '../common/MetricItem';

interface TaskMetricsProps {
  times: TaskTimes;
  score: TaskScore;
  showDuration?: boolean;
}

export const TaskMetrics: React.FC<TaskMetricsProps> = ({ 
  times, 
  score, 
  showDuration = true 
}) => (
  <div className="flex gap-4 text-sm text-gray-600">
    <MetricItem label="Score" value={`${(score.score * 100).toFixed(0)}%`} />
    {showDuration && (
      <MetricItem 
        label="Duration" 
        value={`${(times.duration / 1000).toFixed(1)}s`} 
      />
    )}
  </div>
);
