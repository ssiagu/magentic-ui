import React from 'react';
import { LoadingState } from '../common/LoadingState';

interface TaskActionsProps {
  onAnalyze?: () => void;
  isAnalyzing?: boolean;
  disabled?: boolean;
  onViewDetails?: () => void;
  onDelete?: () => void;
}

export const TaskActions: React.FC<TaskActionsProps> = ({ 
  onAnalyze, 
  isAnalyzing,
  disabled,
  onViewDetails,
  onDelete
}) => (
  <div className="flex gap-2 pt-4 border-t">
    {onAnalyze && (
      <button
        onClick={onAnalyze}
        disabled={isAnalyzing || disabled}
        className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isAnalyzing ? 'Analyzing...' : 'Analyze'}
      </button>
    )}
    {onViewDetails && (
      <button
        onClick={onViewDetails}
        className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
      >
        View Details
      </button>
    )}
    {onDelete && (
      <button
        onClick={onDelete}
        className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
      >
        Delete
      </button>
    )}
  </div>
);
