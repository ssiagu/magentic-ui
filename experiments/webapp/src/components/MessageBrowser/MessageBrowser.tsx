'use client';

import { useEffect } from 'react';
import { MessageBrowserProps } from './types';
import { useMessageBrowserState } from '@/hooks/useMessageBrowserState';
import { useMessageBrowserData } from '@/hooks/useMessageBrowserData';
import { BrowserHeader } from './BrowserHeader';
import { DatasetSplitSelector } from './DatasetSplitSelector';
import { TaskSummaryDisplay } from './TaskSummaryDisplay';
import { FilterPanel } from './FilterPanel';
import { TaskList } from './TaskList';
import { MessageDisplay } from './MessageDisplay';
import { EmptyState } from './EmptyState';
import RunCard from '../RunCard';

export const MessageBrowser = ({ runDataList, onDataUpdate }: MessageBrowserProps) => {
    const {
        selectedTask,
        setSelectedTask,
        selectedDataset,
        setSelectedDataset,
        selectedSplit,
        setSelectedSplit,
        filters,
        setFilters,
        showFilters,
        setShowFilters,
    } = useMessageBrowserState();

    const {
        availableDatasets,
        availableSplits,
        filteredRuns,
        commonTasks,
        taskSummary,
        selectedTaskDataFromRuns,
    } = useMessageBrowserData({
        runDataList,
        selectedDataset,
        selectedSplit,
        selectedTask,
        filters
    });

    // Initialize dataset and split selection
    useEffect(() => {
        if (availableDatasets.length > 0 && !selectedDataset) {
            setSelectedDataset(availableDatasets[0]);
        }
    }, [availableDatasets, selectedDataset, setSelectedDataset]);

    useEffect(() => {
        if (availableSplits.length > 0 && !selectedSplit) {
            setSelectedSplit(availableSplits[0]);
        }
    }, [availableSplits, selectedSplit, setSelectedSplit]);

    const exportData = () => {
        const exportData = {
            metadata: {
                exported_at: new Date().toISOString(),
                task_summary: taskSummary,
                dataset: selectedDataset,
                split: selectedSplit,
                num_runs: filteredRuns.length
            },
            run_data_list: filteredRuns,
            filters: filters
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `message_browser_${selectedDataset}_${selectedSplit}_${new Date().toISOString().slice(0, 19)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleDatasetChange = (dataset: string) => {
        setSelectedDataset(dataset);
        setSelectedSplit(''); // Reset split when dataset changes
        setSelectedTask(''); // Reset task when dataset changes
    };

    const handleSplitChange = (split: string) => {
        setSelectedSplit(split);
        setSelectedTask(''); // Reset task when split changes
    };

    return (
        <div className="space-y-6">
            {/* Header with Dataset/Split Selection */}
            <div className="bg-white rounded-lg shadow-lg p-6">
                <BrowserHeader
                    showFilters={showFilters}
                    onToggleFilters={() => setShowFilters(!showFilters)}
                    onExportData={exportData}
                    canExport={!!(selectedDataset && selectedSplit)}
                />

                <DatasetSplitSelector
                    availableDatasets={availableDatasets}
                    availableSplits={availableSplits}
                    selectedDataset={selectedDataset}
                    selectedSplit={selectedSplit}
                    onDatasetChange={handleDatasetChange}
                    onSplitChange={handleSplitChange}
                />

                <TaskSummaryDisplay taskSummary={taskSummary} />

                <FilterPanel
                    filters={filters}
                    showFilters={showFilters}
                    onFiltersChange={setFilters}
                />
            </div>

            {/* Content Area */}
            {!selectedDataset || !selectedSplit ? (
                <EmptyState type="no-selection" />
            ) : commonTasks.length === 0 ? (
                <EmptyState
                    type="no-tasks"
                    selectedDataset={selectedDataset}
                    selectedSplit={selectedSplit}
                />
            ) : (
                <div className="space-y-6">
                    {/* Run Cards Section - Only show filtered runs */}
                    {filteredRuns.length > 0 && (
                        <div className="bg-white rounded-lg shadow-lg p-6">
                            <h3 className="text-lg font-semibold mb-4 text-gray-900">
                                Filtered Run Data ({filteredRuns.length} runs)
                            </h3>
                            <div className="overflow-x-auto shadow-inner rounded-lg bg-gray-50 p-4">
                                <div className="flex gap-4 pb-2">
                                    {filteredRuns.map((runData, index) => (
                                        <div key={index} className="flex-shrink-0">
                                            <RunCard 
                                                runData={runData} 
                                                onDelete={onDataUpdate ? () => {
                                                    const newList = runDataList.filter(r => r !== runData);
                                                    onDataUpdate(newList);
                                                } : undefined}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                                <p className="text-blue-700">
                                    <strong>Total:</strong> {filteredRuns.reduce((total, runData) => total + runData.tasks.length, 0)} tasks across {filteredRuns.length} runs
                                </p>
                            </div>
                        </div>
                    )}

                    <TaskList
                        commonTasks={commonTasks}
                        filteredRuns={filteredRuns}
                        selectedTask={selectedTask}
                        onTaskSelect={setSelectedTask}
                    />

                    <MessageDisplay
                        selectedTask={selectedTask}
                        selectedTaskDataFromRuns={selectedTaskDataFromRuns}
                    />
                </div>
            )}

        </div>
    );
};
