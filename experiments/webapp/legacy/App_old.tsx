'use client';

import { useCallback, useMemo, memo } from 'react';
import { AnalysisDashboard } from './tabs/Analyze';
import { MessageBrowser } from './tabs/compare';
import { Import } from '@/components/tabs/Import';
import { RunData } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs/Tabs';
import { Header } from '@/components/Header';
import { useAppTabs, usePersistedRunData, useAnalysisState, usePersistedMessageBrowserState } from '@/hooks';
import { EmptyState } from '@/components/common';

// Memoized components to prevent unnecessary re-renders
const MemoizedImport = memo(Import);
const MemoizedMessageBrowser = memo(MessageBrowser);
const MemoizedAnalysisDashboard = memo(AnalysisDashboard);

export const App = () => {
  const { runDataList, setRunDataList, clearRunData } = usePersistedRunData();
  const { resetAnalysisState } = useAnalysisState();
  const { resetState: resetMessageBrowserState } = usePersistedMessageBrowserState();
  const {
    activeTab,
    setActiveTab,
    hasData,
    switchToImportIfNoData,
    switchToBrowserIfHasData
  } = useAppTabs(runDataList);

  const handleDataImport = useCallback((data: RunData) => {
    setRunDataList(prev => [...prev, data]);
    if (data?.tasks.length > 0) {
      switchToBrowserIfHasData();
    }
  }, [setRunDataList, switchToBrowserIfHasData]);

  const handleDataDelete = useCallback((index: number) => {
    setRunDataList(prev => prev.filter((_, i) => i !== index));
    switchToImportIfNoData();
  }, [setRunDataList, switchToImportIfNoData]);

  const handleDataUpdate = useCallback((updatedRunDataList: RunData[]) => {
    setRunDataList(updatedRunDataList);
    switchToImportIfNoData();
  }, [setRunDataList, switchToImportIfNoData]);

  const handleClearAll = useCallback(() => {
    clearRunData();
    resetAnalysisState();
    resetMessageBrowserState();
    switchToImportIfNoData();
  }, [clearRunData, resetAnalysisState, resetMessageBrowserState, switchToImportIfNoData]);

  // Memoize badge calculations to prevent unnecessary re-renders
  const badgeValues = useMemo(() => {
    const importBadge = runDataList.length || undefined;
    const compareBadge = hasData ? runDataList.reduce((sum, run) => sum + run.tasks.length, 0) : undefined;
    const analyzeBadge = hasData ? runDataList.length : undefined;

    return {
      import: importBadge,
      compare: compareBadge,
      analyze: analyzeBadge
    };
  }, [runDataList, hasData]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="import" badge={badgeValues.import}>
              Import
            </TabsTrigger>
            <TabsTrigger
              value="browser"
              disabled={!hasData}
              badge={badgeValues.compare}
            >
              Compare
            </TabsTrigger>
            <TabsTrigger
              value="analysis"
              disabled={!hasData}
              badge={badgeValues.analyze}
            >
              Analyze
            </TabsTrigger>
          </TabsList>

          <TabsContent value="import" className="mt-6">
            {activeTab === 'import' && (
              <MemoizedImport
                onDataImport={handleDataImport}
                onDataDelete={handleDataDelete}
                onClearAll={handleClearAll}
                existingDataList={runDataList}
              />
            )}
          </TabsContent>

          <TabsContent value="browser" className="mt-6">
            {activeTab === 'browser' && (hasData ? (
              <MemoizedMessageBrowser
                runDataList={runDataList}
              />
            ) : (
              <EmptyState
                title="No data to compare"
                description="Import some run data to start comparing results"
                icon={
                  <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                }
              />
            ))}
          </TabsContent>

          <TabsContent value="analysis" className="mt-6">
            {activeTab === 'analysis' && (hasData ? (
              <MemoizedAnalysisDashboard
                runDataList={runDataList}
                onDataUpdate={handleDataUpdate}
              />
            ) : (
              <EmptyState
                title="No data to analyze"
                description="Import some run data to start analyzing task performance"
                icon={
                  <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                }
              />
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
