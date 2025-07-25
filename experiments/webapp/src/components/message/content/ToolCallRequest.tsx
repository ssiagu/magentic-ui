import React from 'react';

interface ToolCallRequestProps {
  request: any;
  maxLength: number;
  showExpanded: boolean;
  onToggleExpanded?: () => void;
}

export const ToolCallRequest: React.FC<ToolCallRequestProps> = ({ request, maxLength, showExpanded, onToggleExpanded }) => {
  const renderTruncatedArguments = (args: any) => {
    const argsString = typeof args === 'string' ? args : JSON.stringify(args, null, 2);
    const isLong = argsString.length > maxLength;
    const displayContent = showExpanded || !isLong ? argsString : argsString.substring(0, maxLength) + '...';
    
    return (
      <div>
        <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
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
      {request.content && Array.isArray(request.content) && (
        <>
          {request.content.map((call: any, i: number) => (
            <div key={i} className="bg-white p-3 rounded border">
              <div className="font-medium text-gray-800 mb-2">
                Call {i + 1}: <span className="font-mono text-blue-600">{call.name}</span>
              </div>
              {call.arguments && (
                <div>
                  <span className="text-sm text-gray-600">Arguments:</span>
                  {renderTruncatedArguments(call.arguments)}
                </div>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
};
