'use client';

import { useCallback, useMemo, memo } from 'react';
import { AnalysisTabWithSeparateAtoms } from './tabs/AnalysisTab';
import { CompareWithSeparateAtoms } from './tabs/compareTab/CompareWithSeparateAtoms';
import { ImportTab } from '@/components/tabs/ImportTab';
import { RunData } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs/Tabs';
import { Header } from '@/components/Header';
import { useCoreApp } from '@/hooks';
import { EmptyState } from '@/components/common';

// Memoized components to prevent unnecessary re-renders
const MemoizedImport = memo(ImportTab);
const MemoizedMessageBrowser = memo(CompareWithSeparateAtoms);
const MemoizedAnalysisDashboard = memo(AnalysisTabWithSeparateAtoms);

export const AppUpdated = () => {
  const { runs, activeTab, setActiveTab } = useCoreApp();

  // Derived state
  const hasData = useMemo(() => runs.length > 0, [runs.length]);

  // Auto-switch logic - switch to import if no data, switch to compare if has data
  const switchToImportIfNoData = useCallback(() => {
    if (!hasData) {
      setActiveTab('import');
    }
  }, [hasData, setActiveTab]);

  const switchToBrowserIfHasData = useCallback(() => {
    if (hasData && activeTab === 'import') {
      setActiveTab('compare');
    }
  }, [hasData, activeTab, setActiveTab]);

  // Effect to auto-switch tabs based on data availability
  useMemo(() => {
    if (!hasData && activeTab !== 'import') {
      setActiveTab('import');
    }
  }, [hasData, activeTab, setActiveTab]);

  // Show empty state if no data and not on import tab
  if (!hasData && activeTab !== 'import') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <EmptyState
            title="No data available"
            description="Import data to get started"
            action={
              <button
                onClick={() => setActiveTab('import')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Go to Import
              </button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
          <TabsList className="mb-8">
            <TabsTrigger value="import">Import</TabsTrigger>
            <TabsTrigger value="compare" disabled={!hasData}>
              Compare
            </TabsTrigger>
            <TabsTrigger value="analyze" disabled={!hasData}>
              Analyze
            </TabsTrigger>
          </TabsList>

          <TabsContent value="import" className="space-y-6">
            <MemoizedImport />
          </TabsContent>

          <TabsContent value="compare" className="space-y-6">
            {hasData ? (
              <MemoizedMessageBrowser />
            ) : (
              <EmptyState
                title="No data to compare"
                description="Import some run data first"
                action={
                  <button
                    onClick={() => setActiveTab('import')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Go to Import
                  </button>
                }
              />
            )}
          </TabsContent>

          <TabsContent value="analyze" className="space-y-6">
            {hasData ? (
              <MemoizedAnalysisDashboard />
            ) : (
              <EmptyState
                title="No data to analyze"
                description="Import some run data first"
                action={
                  <button
                    onClick={() => setActiveTab('import')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Go to Import
                  </button>
                }
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
