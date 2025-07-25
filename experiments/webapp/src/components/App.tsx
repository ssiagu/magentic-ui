'use client';

import { useMemo, memo } from 'react';
import { AnalyzeTab } from './tabs/AnalyzeTab';
import { ImportTab } from '@/components/tabs/ImportTab';
import { AppStateProvider, useCoreApp } from '@/hooks';

// Import the new components that use separate atoms
import { CompareTab } from './tabs/compareTab/CompareTab';

// Memoized components to prevent unnecessary re-renders
const MemoizedImportTab = memo(ImportTab);
const MemoizedCompareTab = memo(CompareTab);
const MemoizedAnalyzeTab = memo(AnalyzeTab);

// Main app content that uses the core hook
const AppContent: React.FC = () => {
  // This hook only triggers re-renders when core state changes (activeTab or runs)
  const {
    // State
    runs,
    activeTab,
    hasData,
    totalTasks,
    
    // Actions
    setActiveTab,
  } = useCoreApp();

  // Memoize badge calculations to prevent unnecessary re-renders
  const badgeValues = useMemo(() => ({
    import: runs.length || undefined,
    compare: hasData ? totalTasks : undefined,
    analyze: hasData ? runs.length : undefined
  }), [runs.length, hasData, totalTasks]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <div>
            <h1 className="text-3xl font-bold text-black">
              Magentic-UI Evaluation Browser
            </h1>
            <p className="text-black mt-1">
              Import, Compare, and Analyze Magentic-UI evaluation runs.
            </p>
          </div>
        <div>
            <div className="flex bg-gray-200 rounded-lg p-1 mt-4">
              <button
                onClick={() => setActiveTab('import')}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  activeTab === 'import'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Import
                {badgeValues.import && (
                  <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                    {badgeValues.import}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('compare')}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  activeTab === 'compare'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Compare
                {badgeValues.compare && (
                  <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                    {badgeValues.compare}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('analyze')}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  activeTab === 'analyze'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Analyze
                {badgeValues.analyze && (
                  <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                    {badgeValues.analyze}
                  </span>
                )}
              </button>
            </div>
        </div>
        </div>
      </header>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {activeTab === 'import' && <MemoizedImportTab />}
        {activeTab === 'compare' && <MemoizedCompareTab />}
        {activeTab === 'analyze' && <MemoizedAnalyzeTab />}
      </div>
    </div>
  );
};

// Main App component that provides the context
export const App: React.FC = () => {
  return (
    <AppStateProvider>
      <AppContent />
    </AppStateProvider>
  );
};
