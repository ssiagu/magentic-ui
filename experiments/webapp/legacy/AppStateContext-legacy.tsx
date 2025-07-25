import React, { createContext, useContext, ReactNode } from 'react';
import { useAppState, UseAppStateReturn } from '@/hooks/useAppState';

const AppStateContext = createContext<UseAppStateReturn | undefined>(undefined);

interface AppStateProviderProps {
  children: ReactNode;
}

export const AppStateProvider: React.FC<AppStateProviderProps> = ({ children }) => {
  const appState = useAppState();
  
  return (
    <AppStateContext.Provider value={appState}>
      {children}
    </AppStateContext.Provider>
  );
};

export const useAppStateContext = () => {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error('useAppStateContext must be used within an AppStateProvider');
  }
  return context;
};

// For backwards compatibility or when you don't want to use context
export { useAppState };
