import React from 'react';
import { TaskAnalysis, RunAnalysis } from '../../types/analysis';
import { AnalysisHeader } from './AnalysisHeader';
import { AnalysisContent } from './AnalysisContent';
import { SystemPromptComparison } from './SystemPromptComparison';

interface AnalysisCardProps {
  analysis: TaskAnalysis | RunAnalysis;
  type: 'task' | 'run';
  onEdit?: () => void;
}

export const AnalysisCard: React.FC<AnalysisCardProps> = ({ 
  analysis, 
  type,
  onEdit 
}) => (
  <div className="border rounded-lg p-4 space-y-4">
    <AnalysisHeader type={type} onEdit={onEdit} />
    <AnalysisContent analysis={analysis} />
    {'systemPromptAnalysis' in analysis && analysis.systemPromptAnalysis && (
      <SystemPromptComparison analysis={analysis.systemPromptAnalysis} />
    )}
  </div>
);
