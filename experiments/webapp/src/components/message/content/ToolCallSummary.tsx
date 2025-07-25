import React from 'react';

interface ToolCallSummaryProps {
  summary: any;
  maxLength: number;
  showExpanded: boolean;
  onToggleExpanded?: () => void;
}

export const ToolCallSummary: React.FC<ToolCallSummaryProps> = ({ summary, maxLength, showExpanded, onToggleExpanded }) => {
  const content = summary.content || '';
  const isLong = content.length > maxLength;
  const displayContent = showExpanded || !isLong ? content : content.substring(0, maxLength) + '...';

  return (
    <div className="text-gray-700 whitespace-pre-wrap">
      {displayContent}
      {isLong && onToggleExpanded && (
        <button
          onClick={onToggleExpanded}
          className="mt-2 text-sm text-blue-500 hover:text-blue-600 block"
        >
          {showExpanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  );
};
