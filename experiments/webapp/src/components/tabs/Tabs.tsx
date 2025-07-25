'use client';

import { createContext, useContext, ReactNode } from 'react';
import { clsx } from 'clsx';
import { Badge } from '@/components/common/Badge';

interface TabsContextType {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = createContext<TabsContextType | undefined>(undefined);

interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
  className?: string;
}

export const Tabs = ({ value, onValueChange, children, className }: TabsProps) => {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={className}>
        {children}
      </div>
    </TabsContext.Provider>
  );
};

interface TabsListProps {
  children: ReactNode;
  className?: string;
}

export const TabsList = ({ children, className }: TabsListProps) => {
  return (
    <div className={clsx(
      'inline-flex h-10 items-center justify-center rounded-md bg-gray-100 p-1 text-black',
      className
    )}>
      {children}
    </div>
  );
};

interface TabsTriggerProps {
  value: string;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
  badge?: string | number;
}

export const TabsTrigger = ({ value, children, disabled, className, badge }: TabsTriggerProps) => {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabsTrigger must be used within Tabs');

  const { value: selectedValue, onValueChange } = context;
  const isSelected = selectedValue === value;

  return (
    <button
      onClick={() => !disabled && onValueChange(value)}
      disabled={disabled}
      className={clsx(
        'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
        isSelected
          ? 'bg-white text-black shadow-sm'
          : 'text-black hover:text-black',
        className
      )}
    >
      <span className="flex items-center gap-2">
        {children}
        {badge && (
          <Badge variant="default" size="sm">
            {badge}
          </Badge>
        )}
      </span>
    </button>
  );
};

interface TabsContentProps {
  value: string;
  children: ReactNode;
  className?: string;
}

export const TabsContent = ({ value, children, className }: TabsContentProps) => {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabsContent must be used within Tabs');

  const { value: selectedValue } = context;
  
  if (selectedValue !== value) return null;

  return (
    <div className={clsx(
      'ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
      className
    )}>
      {children}
    </div>
  );
};
