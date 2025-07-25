import React from 'react';

interface BaseTextChatMessageProps {
  message: any;
  maxLength: number;
  showExpanded: boolean;
  onToggleExpanded?: () => void;
}

export const BaseTextChatMessage: React.FC<BaseTextChatMessageProps> = ({ message, maxLength, showExpanded, onToggleExpanded }) => {
  const isLong = message.content.length > maxLength;
  const displayContent = showExpanded || !isLong ? message.content : message.content.substring(0, maxLength) + '...';

  return (
    <div className="">
      <div className="text-gray-700 whitespace-pre-wrap">
        {displayContent}
      </div>
      {isLong && onToggleExpanded && (
        <button
          onClick={onToggleExpanded}
          className="mt-2 text-sm text-blue-500 hover:text-blue-600"
        >
          {showExpanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  );
};
