import React from 'react';

interface MetricItemProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  color?: 'gray' | 'green' | 'red' | 'yellow' | 'blue';
}

export const MetricItem: React.FC<MetricItemProps> = ({ 
  label, 
  value, 
  subtitle,
  icon,
  color = 'gray' 
}) => (
  <div className="flex items-center gap-2">
    {icon}
    <div className="flex flex-col">
      <span className={`text-sm ${color === 'gray' ? 'text-gray-600' : 
        color === 'green' ? 'text-green-600' : 
        color === 'red' ? 'text-red-600' : 
        color === 'yellow' ? 'text-yellow-600' : 
        'text-blue-600'}`}>
        {label}: <strong>{value}</strong>
      </span>
      {subtitle && (
        <span className="text-xs text-gray-400">{subtitle}</span>
      )}
    </div>
  </div>
);
