import React from 'react';

interface ToolCallExecutionProps {
  execution: any;
  maxLength: number;
  showExpanded: boolean;
  onToggleExpanded?: () => void;
}

export const ToolCallExecution: React.FC<ToolCallExecutionProps> = ({ execution, maxLength, showExpanded, onToggleExpanded }) => {
  const renderTruncatedContent = (content: any) => {
    const contentString = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
    const isLong = contentString.length > maxLength;
    const displayContent = showExpanded || !isLong ? contentString : contentString.substring(0, maxLength) + '...';
    
    return (
      <div>
        <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto whitespace-pre-wrap">
          {displayContent}
        </pre>
        {isLong && onToggleExpanded && (
          <button
            onClick={onToggleExpanded}
            className="mt-1 text-sm text-blue-500 hover:text-blue-600"
          >
            {showExpanded ? 'Show less' : 'Show more'}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {execution.content && Array.isArray(execution.content) && (
        <>
          {execution.content.map((result: any, i: number) => (
            <div key={i} className="bg-white p-3 rounded border">
              <div className="font-medium text-gray-800 mb-2">Result {i + 1}</div>
              {result.call_id && (
                <div className="text-sm text-gray-600 mb-2">
                  Call ID: <span className="font-mono">{result.call_id}</span>
                </div>
              )}
              {result.content && (
                <div>
                  <span className="text-sm text-gray-600">Content:</span>
                  {renderTruncatedContent(result.content)}
                </div>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
};
