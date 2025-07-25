import React from 'react';
import { RunMetrics as RunMetricsType } from '../../types/run';
import { MetricItem } from '../common/MetricItem';

interface RunMetricsProps {
  metrics: RunMetricsType;
  layout?: 'horizontal' | 'vertical';
  showScores?: boolean;
}

export const RunMetrics: React.FC<RunMetricsProps> = ({ 
  metrics, 
  layout = 'horizontal',
  showScores = false
}) => (
  <div className="space-y-3">
    <div className={`flex ${layout === 'vertical' ? 'flex-col' : 'flex-row'} gap-4`}>
      <MetricItem label="Tasks" value={metrics.num_tasks} />
      <MetricItem label="Mean Score" value={`${(metrics.mean_score * 100).toFixed(1)}%`} />
      <MetricItem label="Max Score" value={`${(metrics.max_score * 100).toFixed(1)}%`} />
      <MetricItem label="Avg Time" value={`${metrics.average_time.toFixed(1)}s`} />
    </div>
    {showScores && metrics.scores.length > 0 && (
      <div className="text-xs text-gray-500">
        <p>Score distribution: {metrics.scores.map(([score, count]) => `${score}: ${count}`).join(', ')}</p>
      </div>
    )}
  </div>
);
