import React from 'react';

interface SectionCardProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  headerActions?: React.ReactNode;
}

export const SectionCard: React.FC<SectionCardProps> = ({
  title,
  icon,
  children,
  className = "bg-white rounded-lg shadow-lg p-6",
  headerActions
}) => {
  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          {icon}
          {title}
        </h3>
        {headerActions}
      </div>
      {children}
    </div>
  );
};
