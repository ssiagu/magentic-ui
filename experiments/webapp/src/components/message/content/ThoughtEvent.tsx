import React from 'react';

interface ThoughtEventProps {
  thought: any;
  maxLength: number;
  showExpanded: boolean;
  onToggleExpanded?: () => void;
}

export const ThoughtEvent: React.FC<ThoughtEventProps> = ({ thought, maxLength, showExpanded, onToggleExpanded }) => {
  const isLong = thought.content.length > maxLength;
  const displayContent = showExpanded || !isLong ? thought.content : thought.content.substring(0, maxLength) + '...';

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
