import React from 'react';
import { AnalysisSection } from './AnalysisSection';

interface AnalysisContentProps {
  analysis: {
    reason: string;
    suggestion?: string;
  };
}

export const AnalysisContent: React.FC<AnalysisContentProps> = ({ analysis }) => (
  <div className="space-y-3">
    <AnalysisSection 
      title="Reason" 
      content={analysis.reason} 
      variant="error" 
    />
    {analysis.suggestion && (
      <AnalysisSection 
        title="Suggestion" 
        content={analysis.suggestion} 
        variant="info" 
      />
    )}
  </div>
);
