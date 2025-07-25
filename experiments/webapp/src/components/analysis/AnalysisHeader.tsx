import React from 'react';

interface AnalysisHeaderProps {
  type: 'task' | 'run';
  onEdit?: () => void;
  title?: string;
}

export const AnalysisHeader: React.FC<AnalysisHeaderProps> = ({ 
  type, 
  onEdit,
  title
}) => (
  <div className="flex items-center justify-between">
    <h3 className="text-lg font-medium">
      {title || `${type === 'task' ? 'Task' : 'Run'} Analysis`}
    </h3>
    {onEdit && (
      <button
        onClick={onEdit}
        className="text-sm text-blue-500 hover:text-blue-600"
      >
        Edit
      </button>
    )}
  </div>
);
