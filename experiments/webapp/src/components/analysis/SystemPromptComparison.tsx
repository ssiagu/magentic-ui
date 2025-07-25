import React from 'react';
import { SystemPromptAnalysis } from '../../types/analysis';

interface SystemPromptComparisonProps {
  analysis: SystemPromptAnalysis;
}

export const SystemPromptComparison: React.FC<SystemPromptComparisonProps> = ({ analysis }) => (
  <div className="border rounded-lg p-4 bg-gray-50">
    <h4 className="font-medium mb-4">System Prompt Analysis</h4>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <h5 className="font-medium text-sm mb-2 text-gray-700">Original Prompt</h5>
        <pre className="text-sm bg-white p-3 rounded border whitespace-pre-wrap">
          {analysis.originalPrompt}
        </pre>
      </div>
      <div>
        <h5 className="font-medium text-sm mb-2 text-green-700">Suggested Prompt</h5>
        <pre className="text-sm bg-green-50 p-3 rounded border border-green-200 whitespace-pre-wrap">
          {analysis.suggestedPrompt}
        </pre>
      </div>
    </div>
  </div>
);
