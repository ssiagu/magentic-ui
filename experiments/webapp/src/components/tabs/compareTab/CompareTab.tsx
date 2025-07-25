'use client';

import { useCallback, useMemo, useEffect } from 'react';
import { TaskCompareTable } from './TaskCompareTable';
import { MessageDisplay } from './MessageDisplay';
import { DatasetSplitSystemSelector, EmptyState, SectionCard } from '@/components/common';
import { CompareRunTable } from '@/components/run';
import { useCompareTab } from '@/hooks';

export const CompareTab: React.FC = () => {
    // Get everything from the Compare-specific hook
    // This will only re-render when compare state changes!
    const {
        // Compare state
        selectedDataset,
        selectedSplit,
        selectedTask,
        
        // Computed state (includes shared runs from core state)
        runs,
        availableDatasets,
        availableSplits,
        filteredRuns,
        splitFilteredRuns,
        commonTasks,
        
        // Actions
        setDataset,
        setSplit,
        setTask,
    } = useCompareTab();

    // Auto-select first dataset if none selected
    useEffect(() => {
        if (availableDatasets.length > 0 && !selectedDataset) {
            setDataset(availableDatasets[0]);
        }
    }, [availableDatasets, selectedDataset, setDataset]);

    // Auto-select first split if none selected and dataset is selected
    useEffect(() => {
        if (availableSplits.length > 0 && selectedDataset && !selectedSplit) {
            setSplit(availableSplits[0]);
        }
    }, [availableSplits, selectedDataset, selectedSplit, setSplit]);

    // Auto-select first task if none selected and common tasks are available
    useEffect(() => {
        if (commonTasks.length > 0 && !selectedTask) {
            setTask(commonTasks[0].taskId);
        }
    }, [commonTasks, selectedTask, setTask]);

    // Event handlers
    const handleDatasetChange = useCallback((dataset: string) => {
        setDataset(dataset); // This automatically resets split and task
    }, [setDataset]);

    const handleSplitChange = useCallback((split: string) => {
        setSplit(split); // This automatically resets task
    }, [setSplit]);

    const handleTaskSelect = useCallback((taskId: string) => {
        setTask(taskId);
    }, [setTask]);

    // Get task summary
    const taskSummary = useMemo(() => {
        const totalTasks = commonTasks.length;
        const successTasks = commonTasks.filter(t => t.score.score === 1).length;
        const failedTasks = commonTasks.filter(t => t.score.score === 0).length;
        const partialTasks = commonTasks.filter(t => t.score.score > 0 && t.score.score < 1).length;
        
        return `${totalTasks} tasks • ${successTasks} passed, ${failedTasks} failed, ${partialTasks} partial • ${splitFilteredRuns.length} runs`;
    }, [commonTasks, splitFilteredRuns.length]);

    return (
        <div className="space-y-6 w-full">
            {/* Header with Dataset/Split Selection */}
            <SectionCard title="Message Browser" icon={null}>
                <DatasetSplitSystemSelector
                    availableDatasets={availableDatasets}
                    availableSplits={availableSplits}
                    selectedDataset={selectedDataset}
                    selectedSplit={selectedSplit}
                    onDatasetChange={handleDatasetChange}
                    onSplitChange={handleSplitChange}
                    showSystem={false}
                />
            </SectionCard>

            {/* Content Area */}
            {!selectedDataset || !selectedSplit ? (
                <EmptyState 
                    title="Select Dataset and Split"
                    description="Choose a dataset and split to view common tasks across runs"
                    icon={
                        <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                    }
                />
            ) : commonTasks.length === 0 ? (
                <EmptyState
                    title="No Common Tasks Found"
                    description={`No tasks are common across all runs for ${selectedDataset} - ${selectedSplit}`}
                    icon={
                        <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.009-5.674-2.526M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    }
                />
            ) : (
                <div className="space-y-6">
                    {/* Summary Info */}
                    <div className="bg-white rounded-lg shadow-lg p-4">
                        <div className="text-sm text-gray-600 text-center">
                            {taskSummary}
                        </div>
                    </div>

                    {/* Run Comparison Table */}
                    <CompareRunTable
                        runs={splitFilteredRuns}
                        commonTasks={commonTasks}
                    />

                    <TaskCompareTable
                        commonTasks={commonTasks}
                        filteredRuns={splitFilteredRuns}
                        selectedTask={selectedTask}
                        onTaskSelect={handleTaskSelect}
                    />

                    <MessageDisplay
                        selectedTask={selectedTask}
                        runs={splitFilteredRuns}
                    />
                </div>
            )}
        </div>
    );
};
