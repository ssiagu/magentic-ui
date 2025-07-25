'use client';

import { useMemo, useCallback } from 'react';
import { Play, FileText, BarChart3, Brain, Clock, Settings } from 'lucide-react';
import { Diff, Hunk, DiffType } from 'react-diff-view';
import { TaskAnalysisRequest, RunAnalysisRequest, TaskAnalysisSchema, RunAnalysisSchema } from '@/types';
import { useAvailableModels } from '@/hooks/useAvailableModels';
import { Badge, EmptyState, ErrorState, SectionCard } from '@/components/common';
import { DatasetSplitSystemSelector } from '../common/DatasetSplitSystemSelector';
import { ErrorDisplay } from '../common/ErrorDisplay';
import { RunCard } from '../run';
import { AnalysisContent, SystemPromptComparison } from '../analysis';
import { TaskCard } from '../task';
import { useAppState } from '@/hooks/useAppState';

export const AnalyzeRefactored = () => {
    // Get everything from centralized state
    const {
        runs,
        analyses,
        filters,
        loading,
        errors,
        analysisSettings,
        
        // Actions
        setRunAnalysis,
        setTaskAnalysis,
        setLoading,
        setError,
        clearError,
        updateAnalysisSettings,
        updateFilters,
        
        // Computed state
        hasData,
    } = useAppState();

    // Get available models
    const { models: availableModels, isLoading: modelsLoading, error: modelsError } = useAvailableModels();

    // Extract unique datasets, splits, systems from runs
    const { availableDatasets, availableSplits, availableSystems, availableRunIds } = useMemo(() => {
        const datasets = new Set<string>();
        const splits = new Set<string>();
        const systems = new Set<string>();
        const runIds = new Set<number>();
        
        runs.forEach(runData => {
            runData.args.forEach(args => {
                if (args.dataset) datasets.add(args.dataset);
                if (args.split) splits.add(args.split);
                if (args.system) systems.add(args.system);
                if (args.run_id) runIds.add(args.run_id);
            });
        });
        
        return {
            availableDatasets: Array.from(datasets).sort(),
            availableSplits: Array.from(splits).sort(),
            availableSystems: Array.from(systems).sort(),
            availableRunIds: Array.from(runIds).sort((a, b) => a - b),
        };
    }, [runs]);

    // Filter runs based on current selection
    const filteredRuns = useMemo(() => {
        return runs.filter(runData => {
            return runData.args.some(args => {
                const datasetMatch = !filters.categoryFilter || args.dataset === filters.categoryFilter;
                const splitMatch = !filters.scoreFilter || filters.scoreFilter === 'all' || args.split === filters.scoreFilter;
                const systemMatch = !filters.selectedRuns.length || args.system && filters.selectedRuns.includes(args.run_id || 0);
                return datasetMatch && splitMatch && systemMatch;
            });
        });
    }, [runs, filters]);

    // Get the selected run for analysis
    const selectedRun = useMemo(() => {
        if (!filters.selectedRuns.length) return null;
        const selectedRunId = filters.selectedRuns[0]; // Use first selected run
        return filteredRuns.find(runData => 
            runData.args.some(args => args.run_id === selectedRunId)
        );
    }, [filteredRuns, filters.selectedRuns]);

    // Get all tasks from selected run
    const allTasks = useMemo(() => {
        if (!selectedRun) return [];
        
        return selectedRun.tasks.map((task, taskIndex) => ({
            ...task,
            runId: selectedRun.args[0]?.run_id,
            uniqueKey: `${selectedRun.args[0]?.run_id}-${task.taskId}-${taskIndex}`
        }));
    }, [selectedRun]);

    // Calculate overall metrics
    const overallMetrics = useMemo(() => {
        const totalTasks = allTasks.length;
        const successfulTasks = allTasks.filter(task => task.score.score === 1).length;
        const failedTasks = allTasks.filter(task => task.score.score === 0).length;
        const partialTasks = allTasks.filter(task => task.score.score > 0 && task.score.score < 1).length;
        const averageScore = totalTasks > 0 ? allTasks.reduce((sum, task) => sum + task.score.score, 0) / totalTasks : 0;
        const averageDuration = totalTasks > 0 ? allTasks.reduce((sum, task) => sum + task.times.duration, 0) / totalTasks : 0;

        return {
            totalTasks,
            successfulTasks,
            failedTasks,
            partialTasks,
            averageScore,
            averageDuration: averageDuration / 1000
        };
    }, [allTasks]);

    // Get failed tasks for analysis
    const failedTasks = useMemo(() => {
        return allTasks.filter(task => task.score.score === 0);
    }, [allTasks]);

    // Get current run analysis
    const currentRunAnalysis = useMemo(() => {
        if (!selectedRun) return null;
        const runId = selectedRun.args[0]?.run_id?.toString();
        return analyses.find(analysis => analysis.runId === runId);
    }, [selectedRun, analyses]);

    // Get task analyses for current run
    const taskAnalyses = useMemo(() => {
        return currentRunAnalysis?.taskAnalyses || {};
    }, [currentRunAnalysis]);

    // Check if any task analyses exist
    const hasTaskAnalyses = useMemo(() => {
        return Object.keys(taskAnalyses).length > 0;
    }, [taskAnalyses]);

    // Event handlers
    const handleDatasetChange = useCallback((dataset: string) => {
        updateFilters({ categoryFilter: dataset });
    }, [updateFilters]);

    const handleSplitChange = useCallback((split: string) => {
        updateFilters({ scoreFilter: split as any });
    }, [updateFilters]);

    const handleSystemChange = useCallback((system: string) => {
        // Find runs matching this system and update selectedRuns
        const matchingRunIds = runs
            .filter(run => run.args.some(args => args.system === system))
            .map(run => run.args[0]?.run_id)
            .filter(Boolean) as number[];
        updateFilters({ selectedRuns: matchingRunIds });
    }, [updateFilters, runs]);

    const handleRunIdChange = useCallback((runId: number | null) => {
        updateFilters({ selectedRuns: runId ? [runId] : [] });
    }, [updateFilters]);

    const analyzeTask = useCallback(async (taskId: string) => {
        if (!availableModels.includes(analysisSettings.model)) {
            setError(`task-${taskId}`, `Selected model "${analysisSettings.model}" is not available.`);
            return;
        }

        if (!selectedRun) return;

        setLoading('analyzing', { ...loading.analyzing, [taskId]: true });
        clearError(`task-${taskId}`);

        try {
            const task = allTasks.find(t => t.taskId === taskId);
            if (!task) return;

            const analysisRequest: TaskAnalysisRequest = {
                task: task,
                model: analysisSettings.model,
                temperature: analysisSettings.temperature
            };

            const response = await fetch('/api/analyze/task', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(analysisRequest),
            });

            if (!response.ok) {
                throw new Error(`Analysis failed: ${response.statusText}`);
            }

            const result = TaskAnalysisSchema.parse(await response.json());
            const runId = selectedRun.args[0]?.run_id?.toString();
            
            if (runId) {
                setTaskAnalysis(runId, taskId, result);
            }

        } catch (error) {
            console.error('Analysis failed:', error);
            setError(`task-${taskId}`, error instanceof Error ? error.message : 'Unknown error occurred');
        } finally {
            setLoading('analyzing', { ...loading.analyzing, [taskId]: false });
        }
    }, [availableModels, analysisSettings, selectedRun, allTasks, loading.analyzing, setLoading, clearError, setError, setTaskAnalysis]);

    const analyzeRun = useCallback(async () => {
        if (!availableModels.includes(analysisSettings.model)) {
            setError('run-analysis', `Selected model "${analysisSettings.model}" is not available.`);
            return;
        }

        if (!selectedRun) return;

        setLoading('runAnalyzing', true);
        clearError('run-analysis');

        try {
            const systemPrompt = selectedRun.args[0].config_content.system_message;
            const runId = selectedRun.args[0]?.run_id?.toString();

            const analysisRequest: RunAnalysisRequest = {
                taskAnalyses: Object.values(taskAnalyses),
                systemPrompt: systemPrompt,
                model: analysisSettings.model,
                temperature: analysisSettings.temperature
            };

            const response = await fetch('/api/analyze/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(analysisRequest),
            });

            if (!response.ok) {
                throw new Error(`Run analysis failed: ${response.statusText}`);
            }

            const result = RunAnalysisSchema.parse(await response.json());
            
            if (runId) {
                setRunAnalysis(runId, result);
            }

        } catch (error) {
            console.error('Run analysis failed:', error);
            setError('run-analysis', error instanceof Error ? error.message : 'Unknown error occurred');
        } finally {
            setLoading('runAnalyzing', false);
        }
    }, [availableModels, analysisSettings, selectedRun, taskAnalyses, setLoading, clearError, setError, setRunAnalysis]);

    const analyzeAllFailedTasks = useCallback(async () => {
        const tasksToAnalyze = analysisSettings.includeSuccessfulTasks ? allTasks : failedTasks;

        for (const task of tasksToAnalyze) {
            if (!taskAnalyses[task.taskId]) {
                await analyzeTask(task.taskId);
            }
        }
    }, [analysisSettings.includeSuccessfulTasks, allTasks, failedTasks, taskAnalyses, analyzeTask]);

    // Helper to check if we have a valid selection
    const hasValidSelection = filters.categoryFilter && filters.scoreFilter && filters.selectedRuns.length > 0;

    return (
        <div className="space-y-6">
            {/* Selection Controls */}
            <SectionCard title="Analysis Selection" icon={<Settings className="w-5 h-5" />}>
                <DatasetSplitSystemSelector
                    availableDatasets={availableDatasets}
                    availableSplits={availableSplits}
                    availableSystems={availableSystems}
                    selectedDataset={filters.categoryFilter}
                    selectedSplit={filters.scoreFilter === 'all' ? '' : filters.scoreFilter}
                    selectedSystem={filters.selectedRuns.length > 0 ? 
                        runs.find(run => run.args.some(args => args.run_id === filters.selectedRuns[0]))?.args[0]?.system || '' 
                        : ''
                    }
                    onDatasetChange={handleDatasetChange}
                    onSplitChange={handleSplitChange}
                    onSystemChange={handleSystemChange}
                    showSystem={true}
                />

                {/* Run Selection */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Run
                        </label>
                        <select
                            value={filters.selectedRuns[0] || ''}
                            onChange={(e) => {
                                const value = e.target.value;
                                handleRunIdChange(value ? parseInt(value) : null);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            disabled={availableRunIds.length === 0}
                        >
                            <option value="">Select Run</option>
                            {availableRunIds.map(runId => (
                                <option key={runId} value={runId}>Run {runId}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="text-sm text-gray-600">
                    {selectedRun ? 
                        `Analyzing 1 run with ${allTasks.length} total tasks` :
                        'No run selected'
                    }
                </div>
            </SectionCard>

            {/* Run Information */}
            {selectedRun && (
                <SectionCard title="Selected Run Information" icon={<FileText className="w-5 h-5" />}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <RunCard
                            run={selectedRun}
                            showTasks={false}
                        />
                    </div>
                </SectionCard>
            )}

            {/* Analysis Section */}
            {hasValidSelection ? (
                <SectionCard 
                    title="Task Analysis" 
                    icon={<Brain className="w-5 h-5" />}
                    headerActions={
                        <div className="flex items-center gap-2">
                            <button
                                onClick={analyzeAllFailedTasks}
                                disabled={
                                    Object.values(loading.analyzing).some(Boolean) ||
                                    !availableModels.includes(analysisSettings.model) ||
                                    availableModels.length === 0
                                }
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                title={
                                    !availableModels.includes(analysisSettings.model) || availableModels.length === 0
                                        ? "Please select a valid model"
                                        : "Analyze all failed tasks"
                                }
                            >
                                <Play className="w-4 h-4" />
                                Analyze All Failed Tasks
                            </button>
                            
                            <button
                                onClick={analyzeRun}
                                disabled={
                                    !hasTaskAnalyses || 
                                    loading.runAnalyzing || 
                                    !availableModels.includes(analysisSettings.model) ||
                                    availableModels.length === 0
                                }
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                title={
                                    !hasTaskAnalyses 
                                        ? "Complete task analyses first"
                                        : (!availableModels.includes(analysisSettings.model) || availableModels.length === 0)
                                        ? "Please select a valid model"
                                        : "Analyze the entire run"
                                }
                            >
                                {loading.runAnalyzing ? (
                                    <>
                                        <Clock className="w-4 h-4 animate-spin" />
                                        Analyzing Run...
                                    </>
                                ) : (
                                    <>
                                        <BarChart3 className="w-4 h-4" />
                                        Analyze Run
                                    </>
                                )}
                            </button>
                        </div>
                    }
                >
                    {/* Error Display */}
                    <ErrorDisplay 
                        errors={errors} 
                        onDismiss={(errorKey) => clearError(errorKey)} 
                    />

                    {/* Analysis Settings */}
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium mb-2">Analysis Settings</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Model {modelsLoading && <span className="text-gray-400 text-xs">(Loading...)</span>}
                                </label>
                                {modelsLoading ? (
                                    <div className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-50 text-gray-500">
                                        <div className="flex items-center">
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                                            Loading models...
                                        </div>
                                    </div>
                                ) : modelsError ? (
                                    <div className="w-full px-3 py-2 border border-red-300 rounded-md text-sm bg-red-50 text-red-700">
                                        ⚠️ Error loading models: {modelsError}
                                    </div>
                                ) : availableModels.length === 0 ? (
                                    <div className="w-full px-3 py-2 border border-yellow-300 rounded-md text-sm bg-yellow-50 text-yellow-700">
                                        ⚠️ No models available
                                    </div>
                                ) : (
                                    <select
                                        value={analysisSettings.model}
                                        onChange={(e) => updateAnalysisSettings({ model: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                        title={`Select from ${availableModels.length} available models`}
                                    >
                                        {availableModels.map((model) => (
                                            <option key={model} value={model}>
                                                {model}
                                            </option>
                                        ))}
                                    </select>
                                )}
                                {!modelsLoading && !modelsError && availableModels.length > 0 && (
                                    <div className="mt-1 text-xs text-gray-500">
                                        {availableModels.length} model{availableModels.length !== 1 ? 's' : ''} available
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Temperature
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    value={analysisSettings.temperature}
                                    onChange={(e) => updateAnalysisSettings({ temperature: parseFloat(e.target.value) })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                />
                            </div>
                            <div className="flex items-center">
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={analysisSettings.includeSuccessfulTasks}
                                        onChange={(e) => updateAnalysisSettings({ includeSuccessfulTasks: e.target.checked })}
                                        className="mr-2"
                                    />
                                    Include Successful Tasks
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Failed Tasks List */}
                    <div>
                        <h4 className="font-medium mb-4">Failed Tasks ({failedTasks.length})</h4>
                        <div className="space-y-4 max-h-96 overflow-y-auto shadow-inner bg-gray-50 p-4 rounded-lg border">
                            {failedTasks.map((task) => (
                                <div key={task.uniqueKey} className="bg-white rounded-lg">
                                    <TaskCard
                                        task={task}
                                        onAnalyze={() => analyzeTask(task.taskId)}
                                        isAnalyzing={loading.analyzing[task.taskId] || false}
                                        compact={true}
                                        analysis={taskAnalyses[task.taskId]}
                                    />

                                    {/* Error Display */}
                                    {errors[`task-${task.taskId}`] && (
                                        <div className="mt-3 pt-3 border-t border-gray-100">
                                            <ErrorState
                                                title="Analysis Error"
                                                message={errors[`task-${task.taskId}`]}
                                            />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </SectionCard>
            ) : (
                <EmptyState
                    title="Select Configuration for Analysis"
                    description="Choose dataset, split, system, and run to begin task analysis"
                    icon={<Brain className="w-16 h-16 text-gray-300" />}
                />
            )}

            {/* Run Analysis Results Card */}
            {currentRunAnalysis?.runAnalysis && (
                <SectionCard 
                    title="Run Analysis Results" 
                    icon={<BarChart3 className="w-5 h-5 text-green-600" />}
                >
                    <AnalysisContent analysis={currentRunAnalysis.runAnalysis} />
                    
                    {currentRunAnalysis.runAnalysis.systemPromptAnalysis && (
                        <div className="mt-6">
                            <SystemPromptComparison analysis={currentRunAnalysis.runAnalysis.systemPromptAnalysis} />
                        </div>
                    )}

                    {Object.keys(taskAnalyses).length > 0 && (
                        <div className="mt-6">
                            <h4 className="font-medium text-gray-800 mb-2">Task Analysis Summary</h4>
                            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                                <div className="flex items-center gap-2 mb-3">
                                    <Badge variant="info">
                                        {Object.keys(taskAnalyses).length} Analyzed Tasks
                                    </Badge>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {Object.entries(taskAnalyses).slice(0, 4).map(([taskId, analysis]) => (
                                        <div key={taskId} className="p-2 bg-white border rounded text-xs">
                                            <div className="font-medium text-gray-700 mb-1">{taskId}</div>
                                            <div className="text-gray-600 truncate">{analysis.reason}</div>
                                        </div>
                                    ))}
                                </div>
                                {Object.keys(taskAnalyses).length > 4 && (
                                    <div className="mt-2 text-xs text-gray-500">
                                        +{Object.keys(taskAnalyses).length - 4} more tasks analyzed
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </SectionCard>
            )}
        </div>
    );
};
