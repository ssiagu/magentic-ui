import React from 'react';

interface MessageHeaderProps {
  source: 'user' | 'agent';
  type?: string;
  icon?: string;
  timestamp?: string;
}

export const MessageHeader: React.FC<MessageHeaderProps> = ({ 
  source, 
  type,
  icon,
  timestamp 
}) => (
  <div className="flex items-center justify-between mb-2">
    <div className="flex items-center">
      <span className={`text-s font-bold uppercase tracking-wide mr-2 ${
        source === 'user' ? 'text-blue-800' : 'text-gray-800'
      }`}>
        {source} 
      </span>
      {icon && <span className="mr-2">{icon}</span>}
      {type !== 'Message' && <span className='text-xs font-medium uppercase tracking-wide'>
        ({type})
      </span>
      }
    </div>
    {timestamp && (
      <span className="text-xs text-gray-500">
        {new Date(timestamp).toLocaleTimeString()}
      </span>
    )}
  </div>
);
