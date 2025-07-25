import React from 'react';
import { AlertCircle, X } from 'lucide-react';

interface ErrorDisplayProps {
  errors: Record<string, string>;
  onDismiss: (errorKey: string) => void;
  className?: string;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  errors,
  onDismiss,
  className = "mb-6 space-y-2"
}) => {
  if (Object.keys(errors).length === 0) return null;

  const getErrorLabel = (errorKey: string): string => {
    if (errorKey.startsWith('task-')) return 'Task Analysis Error:';
    if (errorKey === 'run-analysis') return 'Run Analysis Error:';
    return 'Error:';
  };

  return (
    <div className={className}>
      {Object.entries(errors).map(([errorKey, errorMessage]) => (
        <div key={errorKey} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-700">
              <strong>{getErrorLabel(errorKey)}</strong> {errorMessage}
            </span>
          </div>
          <button
            onClick={() => onDismiss(errorKey)}
            className="text-red-400 hover:text-red-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
