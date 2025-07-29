import React from 'react';
import { RunMetrics as RunMetricsType, RunData } from '../../types/run';
import { MetricItem } from '../common/MetricItem';
import { computeTotalTokenUsageFromTasks, computeMeanTokenUsageFromTasks, formatTokenCount } from '../../utils/dataUtils';

interface RunMetricsProps {
  metrics: RunMetricsType;
  run?: RunData; // Optional run data for token usage
  layout?: 'horizontal' | 'vertical';
  showScores?: boolean;
}

export const RunMetrics: React.FC<RunMetricsProps> = ({ 
  metrics, 
  run,
  layout = 'horizontal',
  showScores = false
}) => {
  // Calculate token usage metrics if run data is available
  const totalTokenUsage = run ? computeTotalTokenUsageFromTasks(run.tasks) : null;
  const meanTokenUsage = run ? computeMeanTokenUsageFromTasks(run.tasks) : null;

  return (
    <div className="space-y-3">
      <div className={`flex ${layout === 'vertical' ? 'flex-col' : 'flex-row'} gap-4`}>
        <MetricItem label="Tasks" value={metrics.num_tasks} />
        <MetricItem label="Mean Score" value={`${(metrics.mean_score * 100).toFixed(1)}%`} />
        <MetricItem label="Max Score" value={`${(metrics.max_score * 100).toFixed(1)}%`} />
        <MetricItem label="Avg Time" value={`${metrics.average_time.toFixed(1)}s`} />
        {totalTokenUsage && (
          <MetricItem 
            label="Total Tokens" 
            value={formatTokenCount(totalTokenUsage.grand_total.total_tokens)} 
            subtitle={`${formatTokenCount(totalTokenUsage.grand_total.total_input_tokens)} in, ${formatTokenCount(totalTokenUsage.grand_total.total_output_tokens)} out`}
          />
        )}
        {meanTokenUsage && (
          <MetricItem 
            label="Mean Tokens" 
            value={formatTokenCount(meanTokenUsage.grand_total.total_tokens)} 
            subtitle={`${formatTokenCount(meanTokenUsage.grand_total.total_input_tokens)} in, ${formatTokenCount(meanTokenUsage.grand_total.total_output_tokens)} out`}
          />
        )}
      </div>
      {showScores && metrics.scores.length > 0 && (
        <div className="text-xs text-gray-500">
          <p>Score distribution: {metrics.scores.map(([score, count]) => `${score}: ${count}`).join(', ')}</p>
        </div>
      )}
    </div>
  );
};
