import React from 'react';

interface MultiModalMessageProps {
  message: any;
  maxLength: number;
  showExpanded: boolean;
  onToggleExpanded?: () => void;
}

export const MultiModalMessage: React.FC<MultiModalMessageProps> = ({ message, maxLength, showExpanded, onToggleExpanded }) => {
  const renderTruncatedText = (text: string) => {
    const isLong = text.length > maxLength;
    const displayContent = showExpanded || !isLong ? text : text.substring(0, maxLength) + '...';
    return (
      <div>
        <div className="text-gray-700 whitespace-pre-wrap">{displayContent}</div>
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
      {message.content.map((item: any, i: number) => (
        <div key={i}>
          {typeof item === 'string' ? (
            <div className="">
              {renderTruncatedText(item)}
            </div>
          ) : item.data ? (
            <div className="">
              <img 
                src={`data:image/png;base64,${item.data}`}
                alt="Base64 encoded content"
                className="max-w-full h-auto rounded border"
                style={{ maxHeight: '400px' }}
              />
            </div>
          ) : (
            <div className="">
              <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                {JSON.stringify(item, null, 2)}
              </pre>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
