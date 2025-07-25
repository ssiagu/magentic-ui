import React from 'react';

interface AnalysisSectionProps {
  title: string;
  content: string;
  variant?: 'error' | 'warning' | 'info' | 'success';
}

export const AnalysisSection: React.FC<AnalysisSectionProps> = ({ 
  title, 
  content, 
  variant = 'info' 
}) => {
  const variants = {
    error: 'border-red-200 bg-red-50',
    warning: 'border-yellow-200 bg-yellow-50',
    info: 'border-blue-200 bg-blue-50',
    success: 'border-green-200 bg-green-50',
  };

  const titleColors = {
    error: 'text-red-800',
    warning: 'text-yellow-800',
    info: 'text-blue-800',
    success: 'text-green-800',
  };

  const contentColors = {
    error: 'text-red-700',
    warning: 'text-yellow-700',
    info: 'text-blue-700',
    success: 'text-green-700',
  };

  return (
    <div className={`border rounded-lg p-3 ${variants[variant]}`}>
      <h4 className={`font-medium text-sm mb-2 ${titleColors[variant]}`}>
        {title}
      </h4>
      <p className={`text-sm ${contentColors[variant]}`}>
        {content}
      </p>
    </div>
  );
};
