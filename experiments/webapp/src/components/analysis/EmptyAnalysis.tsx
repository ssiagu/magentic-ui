import React from 'react';

interface EmptyAnalysisProps {
  onAnalyze?: () => void;
  isAnalyzing?: boolean;
  message?: string;
}

export const EmptyAnalysis: React.FC<EmptyAnalysisProps> = ({ 
  onAnalyze, 
  isAnalyzing,
  message = "No analysis available"
}) => (
  <div className="text-center py-8 text-gray-500">
    <p className="mb-4">{message}</p>
    {onAnalyze && (
      <button
        onClick={onAnalyze}
        disabled={isAnalyzing}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {isAnalyzing ? 'Analyzing...' : 'Run Analysis'}
      </button>
    )}
  </div>
);
