import React from 'react';

interface UnstructuredMessageProps {
  content: string;
  maxLength: number;
  showExpanded: boolean;
  onToggleExpanded?: () => void;
  allowHtml?: boolean;
}

export const UnstructuredMessage: React.FC<UnstructuredMessageProps> = ({ 
  content, 
  maxLength, 
  showExpanded, 
  onToggleExpanded,
  allowHtml = false
}) => {
  const isLong = content.length > maxLength;
  const displayContent = showExpanded || !isLong ? content : content.substring(0, maxLength) + '...';

  return (
    <div className="space-y-2">
      {allowHtml ? (
        <span 
          className="whitespace-pre-wrap text-sm text-gray-800 font-mono break-words"
        >
          {displayContent}
        </span>
      ) : (
        <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono break-words">
          {displayContent}
        </pre>
      )}
      {isLong && onToggleExpanded && (
        <button
          onClick={onToggleExpanded}
          className="text-sm text-blue-500 hover:text-blue-600"
        >
          {showExpanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  );
};
