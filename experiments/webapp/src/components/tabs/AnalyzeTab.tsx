'use client';

import { useMemo, useCallback, useEffect } from 'react';
import { BarChart3, Settings, FileText, Play, Brain } from 'lucide-react';
import { useCoreApp, useAnalyzeTab, useAvailableModels } from '@/hooks';
import { Badge, EmptyState, SectionCard, DatasetSplitSystemSelector } from '@/components/common';
import { RunCard } from '@/components/run/RunCard';
import { TaskCard } from '@/components/task';

export const AnalyzeTab: React.FC = () => {
    const { runs } = useCoreApp();
    const { models: availableModels, isLoading: modelsLoading, error: modelsError } = useAvailableModels();
    
    const {
        selectedDataset,
        selectedSplit,
        selectedSystem,
        selectedRunId,
        taskAnalyses,
        runAnalysis,
        loading,
        errors,
        analysisSettings,
        setSelection,
        addTaskAnalysis,
        clearAllTaskAnalyses,
        setRunAnalysis,
        setTaskLoading,
        setRunLoading,
        setAllTasksLoading,
        setError,
        clearError,
        updateSettings,
        availableDatasets,
        availableSplits,
        availableSystems,
        availableRunIds,
        selectedRun,
    } = useAnalyzeTab();

    // Auto-select first available options - memoized to prevent infinite loops
    const shouldAutoSelectDataset = useMemo(() => 
        availableDatasets.length > 0 && !selectedDataset, 
        [availableDatasets.length, selectedDataset]
    );
    
    const shouldAutoSelectSplit = useMemo(() => 
        availableSplits.length > 0 && !selectedSplit && selectedDataset, 
        [availableSplits.length, selectedSplit, selectedDataset]
    );
    
    const shouldAutoSelectSystem = useMemo(() => 
        availableSystems.length > 0 && !selectedSystem && selectedSplit, 
        [availableSystems.length, selectedSystem, selectedSplit]
    );
    
    const shouldAutoSelectRunId = useMemo(() => 
        availableRunIds.length > 0 && !selectedRunId && selectedSystem, 
        [availableRunIds.length, selectedRunId, selectedSystem]
    );

    // Use separate useEffect hooks with minimal dependencies
    useEffect(() => {
        if (shouldAutoSelectDataset) {
            setSelection({ selectedDataset: availableDatasets[0] });
        }
    }, [shouldAutoSelectDataset, availableDatasets, setSelection]);

    useEffect(() => {
        if (shouldAutoSelectSplit) {
            setSelection({ selectedSplit: availableSplits[0] });
        }
    }, [shouldAutoSelectSplit, availableSplits, setSelection]);

    useEffect(() => {
        if (shouldAutoSelectSystem) {
            setSelection({ selectedSystem: availableSystems[0] });
        }
    }, [shouldAutoSelectSystem, availableSystems, setSelection]);

    useEffect(() => {
        if (shouldAutoSelectRunId) {
            setSelection({ selectedRunId: availableRunIds[0] });
        }
    }, [shouldAutoSelectRunId, availableRunIds, setSelection]);

    // Clear analysis state when run changes
    useEffect(() => {
        if (selectedRunId) {
            clearAllTaskAnalyses();
            setRunAnalysis(null);
            clearError('run');
        }
    }, [selectedRunId, clearAllTaskAnalyses, setRunAnalysis, clearError]);

    // Memoized filtered tasks
    const filteredTasks = useMemo(() => {
        if (!selectedRun) return [];
        return selectedRun.tasks.filter(task => {
            const score = task.score?.score;
            return score === undefined || score === null || score < 1;
        });
    }, [selectedRun]);

    // Memoized check for analyzed tasks
    const hasAnalyzedTasks = useMemo(() => 
        filteredTasks.some(task => taskAnalyses[task.taskId]), 
        [filteredTasks, taskAnalyses]
    );

    // Memoized callbacks to prevent recreation on every render
    const handleDatasetChange = useCallback((dataset: string) => {
        setSelection({ selectedDataset: dataset });
    }, [setSelection]);

    const handleSplitChange = useCallback((split: string) => {
        setSelection({ selectedSplit: split });
    }, [setSelection]);

    const handleSystemChange = useCallback((system: string) => {
        setSelection({ selectedSystem: system });
    }, [setSelection]);

    const handleRunIdChange = useCallback((runId: string) => {
        setSelection({ selectedRunId: parseInt(runId) });
    }, [setSelection]);

    const handleModelChange = useCallback((model: string) => {
        updateSettings({ model });
    }, [updateSettings]);

    // Analysis functions - memoized to prevent recreation
    const runTaskAnalysis = useCallback(async (taskId: string) => {
        if (!selectedRun || !analysisSettings.model) {
            setError(`task-${taskId}`, 'Please select a model for analysis');
            return;
        }

        setTaskLoading(taskId, true);
        clearError(`task-${taskId}`);

        try {
            const task = selectedRun.tasks.find(t => t.taskId === taskId);
            if (!task) {
                throw new Error(`Task ${taskId} not found in run data`);
            }

            const response = await fetch('/api/analyze/task', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    task: task,
                    model: analysisSettings.model,
                    temperature: 0
                }),
            });

            if (!response.ok) {
                throw new Error(`Failed to analyze task: ${response.statusText}`);
            }

            const analysisResult = await response.json();
            addTaskAnalysis(taskId, analysisResult);
        } catch (error) {
            console.error('Task analysis error:', error);
            setError(`task-${taskId}`, error instanceof Error ? error.message : 'Analysis failed');
        } finally {
            setTaskLoading(taskId, false);
        }
    }, [selectedRun, analysisSettings.model, setTaskLoading, clearError, setError, addTaskAnalysis]);

    const runAllTasksAnalysis = useCallback(async () => {
        if (!selectedRun || !analysisSettings.model) {
            setError('run', 'Please select a model for analysis');
            return;
        }

        const tasksToAnalyze = filteredTasks.filter(task => !taskAnalyses[task.taskId]);
        
        if (tasksToAnalyze.length === 0) {
            setError('run', 'All tasks have already been analyzed');
            return;
        }

        clearError('run');
        setAllTasksLoading(true);

        try {
            for (const task of tasksToAnalyze) {
                await runTaskAnalysis(task.taskId);
            }
        } finally {
            setAllTasksLoading(false);
        }
    }, [selectedRun, analysisSettings.model, filteredTasks, taskAnalyses, setError, clearError, setAllTasksLoading, runTaskAnalysis]);

    const runRunAnalysis = useCallback(async () => {
        if (!selectedRun || !analysisSettings.model) {
            setError('run', 'Please select a model for analysis');
            return;
        }

        const completedTaskAnalyses = filteredTasks
            .map(task => taskAnalyses[task.taskId])
            .filter(analysis => analysis !== undefined);

        if (completedTaskAnalyses.length === 0) {
            setError('run', 'No task analyses available for run analysis');
            return;
        }

        const systemPrompt = selectedRun.args[0]?.config_content?.system_message || 
                            selectedRun.args[0]?.config_content?.system_prompt ||
                            "No system prompt found";

        setRunLoading(true);
        clearError('run');

        try {
            const response = await fetch('/api/analyze/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    taskAnalyses: completedTaskAnalyses,
                    systemPrompt: systemPrompt,
                    model: analysisSettings.model,
                    temperature: 0
                }),
            });

            if (!response.ok) {
                throw new Error(`Failed to analyze run: ${response.statusText}`);
            }

            const analysisResult = await response.json();
            setRunAnalysis(analysisResult);
        } catch (error) {
            console.error('Run analysis error:', error);
            setError('run', error instanceof Error ? error.message : 'Analysis failed');
        } finally {
            setRunLoading(false);
        }
    }, [selectedRun, analysisSettings.model, filteredTasks, taskAnalyses, setRunLoading, clearError, setError, setRunAnalysis]);

    // Early return for empty state
    if (runs.length === 0) {
        return (
            <EmptyState
                icon={<BarChart3 className="w-12 h-12 text-gray-400" />}
                title="No Data Available"
                description="Import some run data to start analyzing"
            />
        );
    }

    return (
        <div className="space-y-6">
            {/* Selection Controls */}
            <SectionCard title="Data Selection" icon={<Settings className="w-5 h-5" />}>
                <DatasetSplitSystemSelector
                    availableDatasets={availableDatasets}
                    availableSplits={availableSplits}
                    availableSystems={availableSystems}
                    selectedDataset={selectedDataset || ''}
                    selectedSplit={selectedSplit || ''}
                    selectedSystem={selectedSystem || ''}
                    onDatasetChange={handleDatasetChange}
                    onSplitChange={handleSplitChange}
                    onSystemChange={handleSystemChange}
                    showSystem={true}
                />
                
                {/* Run ID Selector */}
                <div className="max-w-xs">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Run ID ({availableRunIds.length} available)
                    </label>
                    <select
                        value={selectedRunId || ''}
                        onChange={(e) => handleRunIdChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={!selectedSystem}
                    >
                        <option value="">Select Run</option>
                        {availableRunIds.map(runId => (
                            <option key={runId} value={runId}>
                                {runId}
                            </option>
                        ))}
                    </select>
                </div>
            </SectionCard>

            {/* Show RunCard for selected run */}
            {selectedRun && (
                <div className="flex justify-center">
                    <RunCard 
                        run={selectedRun} 
                        selected={true}
                        showTasks={false}
                    />
                </div>
            )}

            {/* Analysis Settings */}
            <SectionCard title="Analysis Settings" icon={<Brain className="w-5 h-5" />}>
                <div className="flex items-end gap-4 flex-wrap">
                    <div className="max-w-xs">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Model
                        </label>
                        <select
                            value={analysisSettings.model || ''}
                            onChange={(e) => handleModelChange(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={modelsLoading}
                        >
                            <option value="">
                                {modelsLoading ? 'Loading models...' : 'Select Model'}
                            </option>
                            {availableModels.map(model => (
                                <option key={model} value={model}>
                                    {model}
                                </option>
                            ))}
                        </select>
                        {modelsError && (
                            <p className="text-red-500 text-xs mt-1">{modelsError}</p>
                        )}
                    </div>
                    
                    {selectedRun && (
                        <div className="flex gap-2">
                            <button
                                onClick={runRunAnalysis}
                                disabled={loading.analyzingRun || !analysisSettings.model || !hasAnalyzedTasks}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                                title={
                                    !analysisSettings.model 
                                        ? 'Please select a model first' 
                                        : !hasAnalyzedTasks 
                                            ? 'Please analyze at least one task first'
                                            : 'Analyze this run'
                                }
                            >
                                <Play className="w-4 h-4" />
                                <span>Analyze Run</span>
                            </button>
                            
                            <button
                                onClick={runAllTasksAnalysis}
                                disabled={loading.analyzingAll || Object.values(loading.analyzingTasks).some(Boolean) || !analysisSettings.model || filteredTasks.length === 0}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                                title={!analysisSettings.model ? 'Please select a model first' : `Analyze all ${filteredTasks.length} tasks`}
                            >
                                <Brain className="w-4 h-4" />
                                <span>
                                    {loading.analyzingAll 
                                        ? `Analyzing All Tasks... (${Object.keys(taskAnalyses).length}/${filteredTasks.length} complete)`
                                        : 'Analyze All Tasks'
                                    }
                                </span>
                            </button>
                        </div>
                    )}
                </div>
                
                {loading.analyzingAll && (
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center space-x-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                            <p className="text-blue-700 font-medium">
                                Analyzing all tasks... ({Object.keys(taskAnalyses).length}/{filteredTasks.length} complete)
                            </p>
                        </div>
                        <p className="text-blue-600 text-sm mt-1">Individual task analyze buttons are disabled during batch analysis.</p>
                    </div>
                )}
                
                {(!analysisSettings.model || !hasAnalyzedTasks) && selectedRun && !loading.analyzingAll && (
                    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-yellow-700">
                            {!analysisSettings.model 
                                ? 'Please select a model to enable analysis.' 
                                : 'Please analyze at least one task before running overall analysis.'
                            }
                        </p>
                    </div>
                )}
                
                {errors.run && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-700">{errors.run}</p>
                    </div>
                )}
                
                {runAnalysis && (
                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <h4 className="font-medium text-green-900">Run Analysis</h4>
                        <p className="text-green-700 mt-2">{runAnalysis.reason}</p>
                        {runAnalysis.suggestion && (
                            <p className="text-green-600 mt-1 text-sm">{runAnalysis.suggestion}</p>
                        )}
                    </div>
                )}
            </SectionCard>

            {/* Tasks */}
            {selectedRun && (
                <SectionCard title={`Failed Tasks (${filteredTasks.length})`} icon={<FileText className="w-5 h-5" />}>
                    {filteredTasks.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-gray-500">No failed tasks found in this run.</p>
                            <p className="text-sm text-gray-400 mt-1">All tasks completed successfully!</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredTasks.map(task => (
                                <TaskCard
                                    key={task.taskId}
                                    task={task}
                                    onAnalyze={runTaskAnalysis}
                                    isAnalyzing={loading.analyzingTasks[task.taskId]}
                                    disabled={loading.analyzingAll}
                                    badge={
                                        <div className="flex items-center space-x-2">
                                            <Badge variant={
                                                task.score?.score === 0 ? 'error' : 
                                                task.score?.score === 1 ? 'success' : 
                                                'warning'
                                            }>
                                                Score: {task.score?.score ?? "N/A"}
                                            </Badge>
                                            <Badge variant="info">
                                                Messages: {task.messages.length}
                                            </Badge>
                                            {errors[`task-${task.taskId}`] && (
                                                <Badge variant="error">
                                                    Analysis Error
                                                </Badge>
                                            )}
                                        </div>
                                    }
                                    analysis={taskAnalyses[task.taskId]}
                                />
                            ))}
                        </div>
                    )}
                </SectionCard>
            )}
        </div>
    );
};