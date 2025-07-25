import React from 'react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ 
  title = "No data available",
  description,
  icon,
  action
}) => (
  <div className="flex flex-col items-center justify-center p-8 text-center">
    {icon && <div className="mb-4">{icon}</div>}
    <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
    {description && (
      <p className="text-gray-600 mb-4">{description}</p>
    )}
    {action}
  </div>
);
