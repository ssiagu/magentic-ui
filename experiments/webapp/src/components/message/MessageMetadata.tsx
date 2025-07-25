import React from 'react';

interface MessageMetadataProps {
  metadata: Record<string, any>;
}

export const MessageMetadata: React.FC<MessageMetadataProps> = ({ metadata }) => (
  <details className="mt-2">
    <summary className="text-xs text-gray-500 cursor-pointer">Metadata</summary>
    <pre className="mt-1 text-xs text-gray-600 bg-gray-50 p-2 rounded">
      {JSON.stringify(metadata, null, 2)}
    </pre>
  </details>
);
