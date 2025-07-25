'use client';

import { useCallback, useMemo, useEffect } from 'react';
import { BrowserHeader } from './CompareHeader';
import { TaskList } from './TaskList';
import { MessageDisplay } from './MessageDisplay';
import { DatasetSplitSystemSelector, EmptyState, SectionCard } from '@/components/common';
import { RunCard } from '@/components/run';
import { useAppState } from '@/hooks/useAppState';

export const CompareRefactored = () => {
    // Get everything from centralized state
    const {
        runs,
        filters,
        compareState,
        updateFilters,
        updateCompareState,
        hasData,
    } = useAppState();

    // Extract unique datasets and splits from runs
    const { availableDatasets, availableSplits } = useMemo(() => {
        const datasets = new Set<string>();
        const splits = new Set<string>();
        
        runs.forEach(runData => {
            runData.args.forEach(args => {
                if (args.dataset) datasets.add(args.dataset);
                if (args.split) splits.add(args.split);
            });
        });
        
        return {
            availableDatasets: Array.from(datasets).sort(),
            availableSplits: Array.from(splits).sort(),
        };
    }, [runs]);

    // Auto-select first dataset if none selected
    useEffect(() => {
        if (availableDatasets.length > 0 && !compareState.selectedDataset) {
            updateCompareState({ selectedDataset: availableDatasets[0] });
        }
    }, [availableDatasets, compareState.selectedDataset, updateCompareState]);

    // Auto-select first split if none selected and dataset is selected
    useEffect(() => {
        if (availableSplits.length > 0 && compareState.selectedDataset && !compareState.selectedSplit) {
            updateCompareState({ selectedSplit: availableSplits[0] });
        }
    }, [availableSplits, compareState.selectedDataset, compareState.selectedSplit, updateCompareState]);

    // Filter runs based on current compare state (instead of using filters for this)
    const filteredRuns = useMemo(() => {
        if (!compareState.selectedDataset) return runs;
        
        return runs.filter(runData => {
            return runData.args.some(args => 
                args.dataset === compareState.selectedDataset
            );
        });
    }, [runs, compareState.selectedDataset]);

    // Further filter by split if selected
    const splitFilteredRuns = useMemo(() => {
        if (!compareState.selectedSplit) return filteredRuns;
        
        return filteredRuns.filter(runData => {
            return runData.args.some(args => 
                args.split === compareState.selectedSplit
            );
        });
    }, [filteredRuns, compareState.selectedSplit]);

    // Find tasks that are common across all filtered runs
    const commonTasks = useMemo(() => {
        if (splitFilteredRuns.length === 0) return [];
        
        if (splitFilteredRuns.length === 1) {
            // Single run - return all tasks
            return splitFilteredRuns[0].tasks;
        }

        // Find task IDs that exist in all runs
        const firstRunTaskIds = new Set(splitFilteredRuns[0].tasks.map(t => t.taskId));
        const commonTaskIds = splitFilteredRuns.slice(1).reduce((common, runData) => {
            const runTaskIds = new Set(runData.tasks.map(t => t.taskId));
            return new Set([...common].filter(id => runTaskIds.has(id)));
        }, firstRunTaskIds);

        // Get the actual task objects from the first run
        return splitFilteredRuns[0].tasks.filter(task => 
            commonTaskIds.has(task.taskId)
        );
    }, [splitFilteredRuns]);

    // Get task summary
    const taskSummary = useMemo(() => {
        const totalTasks = commonTasks.length;
        const successTasks = commonTasks.filter(t => t.score.score === 1).length;
        const failedTasks = commonTasks.filter(t => t.score.score === 0).length;
        const partialTasks = commonTasks.filter(t => t.score.score > 0 && t.score.score < 1).length;
        
        return `${totalTasks} tasks • ${successTasks} passed, ${failedTasks} failed, ${partialTasks} partial • ${splitFilteredRuns.length} runs`;
    }, [commonTasks, splitFilteredRuns.length]);

    // Auto-select first task if none selected and common tasks are available
    useEffect(() => {
        if (commonTasks.length > 0 && !compareState.selectedTask) {
            updateCompareState({ selectedTask: commonTasks[0].taskId });
        }
    }, [commonTasks, compareState.selectedTask, updateCompareState]);

    // Get selected task from compare state
    const selectedTask = compareState.selectedTask;

    // Get currently selected dataset and split from compare state
    const selectedDataset = compareState.selectedDataset;
    const selectedSplit = compareState.selectedSplit;

    // Event handlers
    const handleDatasetChange = useCallback((dataset: string) => {
        updateCompareState({ 
            selectedDataset: dataset,
            selectedSplit: '', // Reset split when dataset changes
            selectedTask: '', // Reset task when dataset changes
        });
    }, [updateCompareState]);

    const handleSplitChange = useCallback((split: string) => {
        updateCompareState({ 
            selectedSplit: split,
            selectedTask: '', // Reset task when split changes
        });
    }, [updateCompareState]);

    const handleTaskSelect = useCallback((taskId: string) => {
        updateCompareState({ selectedTask: taskId });
    }, [updateCompareState]);

    // Check if we have valid selections
    const hasValidSelection = selectedDataset && selectedSplit;

    return (
        <div className="space-y-6">
            {/* Header with Dataset/Split Selection */}
            <SectionCard title="" icon={null}>
                <BrowserHeader />

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
                    {/* Run Cards Section - Show filtered runs */}
                    <div className="bg-white rounded-lg shadow-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">Runs</h3>
                            <div className="text-sm text-gray-500">
                                {taskSummary}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {splitFilteredRuns.map((runData, index) => (
                                <RunCard
                                    key={index}
                                    run={runData}
                                    showTasks={false}
                                />
                            ))}
                        </div>
                    </div>

                    <TaskList
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
