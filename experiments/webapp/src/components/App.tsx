'use client';

import { useState, useMemo } from 'react';
import { AnalysisDashboard } from './AnalysisDashboard';
import { MessageBrowser } from './MessageBrowser';
import { DataImport } from './DataImport';
import { RunData } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './Tabs';
import { Header } from '@/components/Header';

export const App = () => {
  const [runDataList, setRunDataList] = useState<RunData[]>([]);
  const [activeTab, setActiveTab] = useState('import');

  const hasData = useMemo(() => {
    return runDataList.length > 0 && runDataList.some(runData => runData.tasks.length > 0);
  }, [runDataList]);

  const handleDataImport = (
    data: RunData
  ) => {
    setRunDataList(prev => [...prev, data]);
    if (data && data.tasks.length > 0) {
      setActiveTab('browser');
    }
  };

  const handleDataDelete = (index: number) => {
    setRunDataList(prev => {
      const newList = prev.filter((_, i) => i !== index);
      return newList;
    });
    
    // If no data left, go back to import tab
    const remainingData = runDataList.filter((_, i) => i !== index);
    if (!remainingData || remainingData.length === 0 || !remainingData.some(runData => runData.tasks.length > 0)) {
      setActiveTab('import');
    }
  };

  const handleDataUpdate = (
    updatedRunDataList: RunData[]
  ) => {
    setRunDataList(updatedRunDataList);

    // If no data left, go back to import tab
    if (!updatedRunDataList || updatedRunDataList.length === 0 || !updatedRunDataList.some(runData => runData.tasks.length > 0)) {
      setActiveTab('import');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="import">Data Import</TabsTrigger>
            <TabsTrigger value="browser" disabled={!hasData}>
              Message Browser
            </TabsTrigger>
            <TabsTrigger value="analysis" disabled={!hasData}>
              Analysis Dashboard
            </TabsTrigger>
          </TabsList>

          <TabsContent value="import" className="mt-6">
            <DataImport
              onDataImport={handleDataImport}
              onDataDelete={handleDataDelete}
              existingDataList={runDataList}
            />
          </TabsContent>

          <TabsContent value="browser" className="mt-6">
            {hasData && (
              <MessageBrowser
                runDataList={runDataList}
                onDataUpdate={handleDataUpdate}
              />
            )}
          </TabsContent>

          <TabsContent value="analysis" className="mt-6">
            {hasData && (
              <AnalysisDashboard
                runDataList={runDataList}
                onDataUpdate={handleDataUpdate}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
