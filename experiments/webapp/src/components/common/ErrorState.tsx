import React from 'react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  error?: Error;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ 
  title = "Something went wrong",
  message,
  error,
  onRetry
}) => (
  <div className="flex flex-col items-center justify-center p-8 text-center">
    <div className="text-red-500 mb-4">
      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    </div>
    <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
    {message && <p className="text-gray-600 mb-4">{message}</p>}
    {error && (
      <details className="text-sm text-gray-500 mb-4">
        <summary className="cursor-pointer">Error details</summary>
        <pre className="mt-2 text-left bg-gray-100 p-2 rounded">{error.message}</pre>
      </details>
    )}
    {onRetry && (
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
      >
        Try Again
      </button>
    )}
  </div>
);
