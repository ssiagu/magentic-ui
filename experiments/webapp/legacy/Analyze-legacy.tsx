'use client';

import { useState, useMemo, useEffect } from 'react';
import { Play, FileText, BarChart3, Brain, Clock, Settings } from 'lucide-react';
import { Diff, Hunk, DiffType } from 'react-diff-view';
import { RunData, RunAnalysis, RunAnalysisSchema, TaskAnalysis, TaskAnalysisRequest, RunAnalysisRequest, TaskAnalysisSchema } from '@/types';
import { useDataSelection, useAnalysisState } from '@/hooks';
import { useAvailableModels } from '@/hooks/useAvailableModels';
import { Badge, EmptyState, ErrorState, SectionCard } from '@/components/common';
import { DatasetSplitSystemSelector } from '../common/DatasetSplitSystemSelector';
import { ErrorDisplay } from '../common/ErrorDisplay';
import { RunCard } from '../run';
import { AnalysisContent, SystemPromptComparison } from '../analysis';
import { TaskCard } from '../task';

interface AnalysisDashboardProps {
    runDataList: RunData[];
    onDataUpdate?: (updatedRunDataList: RunData[]) => void;
}

export const AnalysisDashboard = ({ runDataList, onDataUpdate }: AnalysisDashboardProps) => {
    // Use persistent analysis state
    const {
        taskAnalyses,
        runAnalysis,
        isTaskAnalyzing,
        isRunAnalyzing,
        errors,
        analysisSettings,
        lastSelectedDataset,
        lastSelectedSplit,
        lastSelectedSystem,
        lastSelectedRunId,
        addTaskAnalysis,
        setRunAnalysis,
        setTaskAnalyzing,
        setIsRunAnalyzing,
        setError,
        clearError,
        setAnalysisSettings,
        setLastSelection,
        clearAnalysisData,
    } = useAnalysisState();
    
    // Track if initial restoration is complete
    const [isRestorationComplete, setIsRestorationComplete] = useState(false);

    // Use shared data selection hook
    const {
        selectedDataset,
        selectedSplit,
        selectedSystem,
        selectedRunId,
        handleDatasetChange,
        handleSplitChange,
        handleSystemChange,
        setSelectedRunId,
        availableDatasets,
        availableSplits,
        availableSystems,
        availableRunIds,
        filteredRuns,
    } = useDataSelection({ 
        runDataList, 
        includeSystem: true, 
        includeRunId: true 
    });

    // Get available models for the dropdown
    const { models: availableModels, isLoading: modelsLoading, error: modelsError } = useAvailableModels();

    // Restore last selection on component mount (only once)
    useEffect(() => {
        if (!availableDatasets.length || !availableSplits.length || !availableSystems.length || !availableRunIds.length) {
            return; // Wait for all data to be available
        }

        let needsUpdate = false;
        
        if (lastSelectedDataset && availableDatasets.includes(lastSelectedDataset) && selectedDataset !== lastSelectedDataset) {
            handleDatasetChange(lastSelectedDataset);
            needsUpdate = true;
        } else if (lastSelectedSplit && availableSplits.includes(lastSelectedSplit) && selectedSplit !== lastSelectedSplit) {
            handleSplitChange(lastSelectedSplit);
            needsUpdate = true;
        } else if (lastSelectedSystem && availableSystems.includes(lastSelectedSystem) && selectedSystem !== lastSelectedSystem) {
            handleSystemChange(lastSelectedSystem);
            needsUpdate = true;
        } else if (lastSelectedRunId && availableRunIds.includes(lastSelectedRunId) && selectedRunId !== lastSelectedRunId) {
            setSelectedRunId(lastSelectedRunId);
            needsUpdate = true;
        }

        // Mark restoration as complete after the first cycle
        setIsRestorationComplete(true);

        // Only restore once to avoid infinite loops
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [availableDatasets.length, availableSplits.length, availableSystems.length, availableRunIds.length]);

    // Save current selection when it changes (but not during restoration)
    useEffect(() => {
        // Only save if we have made a selection (not initial/default state)
        if (selectedDataset || selectedSplit || selectedSystem || selectedRunId) {
            setLastSelection(selectedDataset, selectedSplit, selectedSystem, selectedRunId);
        }
    }, [selectedDataset, selectedSplit, selectedSystem, selectedRunId, setLastSelection]);

    // Update model to first available model if current one is not available
    useEffect(() => {
        if (availableModels.length > 0 && !availableModels.includes(analysisSettings.model)) {
            setAnalysisSettings({ model: availableModels[0] });
        }
    }, [availableModels, analysisSettings.model, setAnalysisSettings]);

    // Clear analysis data when selection changes significantly (but avoid clearing too often)
    useEffect(() => {
        // Don't clear during initial load/restoration phase
        if (!isRestorationComplete) {
            return;
        }

        // Only clear if there's actually analysis data to clear
        if (Object.keys(taskAnalyses).length === 0 && !runAnalysis) {
            return; // Nothing to clear
        }

        const hasSignificantChange = 
            (lastSelectedDataset && lastSelectedDataset !== selectedDataset) ||
            (lastSelectedSplit && lastSelectedSplit !== selectedSplit) ||
            (lastSelectedSystem && lastSelectedSystem !== selectedSystem) ||
            (lastSelectedRunId && lastSelectedRunId !== selectedRunId);
        
        if (hasSignificantChange) {
            clearAnalysisData();
        }
    }, [isRestorationComplete, selectedDataset, selectedSplit, selectedSystem, selectedRunId, taskAnalyses, runAnalysis, clearAnalysisData, lastSelectedDataset, lastSelectedSplit, lastSelectedSystem, lastSelectedRunId]);

    // Helper function to create a proper git diff between two strings
    const createDiff = (originalText: string, suggestedText: string): string => {
        // Split texts into lines
        const originalLines = originalText.split('\n');
        const suggestedLines = suggestedText.split('\n');
        
        // Simple line-by-line comparison to create a more realistic diff
        const maxLines = Math.max(originalLines.length, suggestedLines.length);
        const diffLines: string[] = [];
        
        for (let i = 0; i < maxLines; i++) {
            const origLine = originalLines[i];
            const suggLine = suggestedLines[i];
            
            if (origLine !== undefined && suggLine !== undefined) {
                if (origLine !== suggLine) {
                    // Lines are different - show both as change
                    diffLines.push(`-${origLine}`);
                    diffLines.push(`+${suggLine}`);
                } else {
                    // Lines are the same - show as context (with space prefix)
                    diffLines.push(` ${origLine}`);
                }
            } else if (origLine !== undefined) {
                // Line only in original - show as deletion
                diffLines.push(`-${origLine}`);
            } else if (suggLine !== undefined) {
                // Line only in suggested - show as addition
                diffLines.push(`+${suggLine}`);
            }
        }
        
        // Create a proper git diff format similar to `git diff -U1`
        const diffText = `diff --git a/system-prompt.txt b/system-prompt.txt
index 1234567..abcdefg 100644
--- a/system-prompt.txt
+++ b/system-prompt.txt
@@ -1,${originalLines.length} +1,${suggestedLines.length} @@
${diffLines.join('\n')}`;
        
        return diffText;
    };

    // Helper function to render diff file
    const renderDiffFile = (file: any) => {
        const { oldRevision, newRevision, type, hunks } = file;
        return (
            <Diff 
                key={oldRevision + '-' + newRevision} 
                viewType="split" 
                diffType={type as DiffType} 
                hunks={hunks}
            >
                {(hunks: any[]) => hunks.map((hunk: any) => <Hunk key={hunk.content} hunk={hunk} />)}
            </Diff>
        );
    };

    const selectedRun = useMemo(() => {
        if (selectedRunId === null) return null;
        return filteredRuns.find((runData) => runData.args[0].run_id === selectedRunId)
    }, [filteredRuns, selectedRunId])

    // Get runs to analyze based on selections
    const runsToAnalyze = useMemo(() => {
        if (selectedRunId === null) return [];
        
        return filteredRuns.filter(runData => {
            return runData.args.some(args => args.run_id === selectedRunId);
        });
    }, [filteredRuns, selectedRunId]);


    // Aggregate all tasks from selected runs
    const allTasks = useMemo(() => {
        const tasks: any[] = [];
        runsToAnalyze.forEach((runData, runIndex) => {
            runData.tasks.forEach((task, taskIndex) => {
                tasks.push({
                    ...task,
                    runId: runData.args[0]?.run_id, // Add run ID for context
                    uniqueKey: `${runData.args[0]?.run_id}-${task.taskId}-${taskIndex}` // Ensure unique key
                });
            });
        });
        return tasks;
    }, [runsToAnalyze]);

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
            averageDuration: averageDuration / 1000 // Convert to seconds
        };
    }, [allTasks]);

    // Get failed tasks for analysis
    const failedTasks = useMemo(() => {
        return allTasks.filter(task => task.score.score === 0);
    }, [allTasks]);

    // Get successful tasks
    const successfulTasks = useMemo(() => {
        return allTasks.filter(task => task.score.score === 1);
    }, [allTasks]);

    // Check if any task analyses have been completed
    const hasTaskAnalyses = useMemo(() => {
        return Object.keys(taskAnalyses).length > 0;
    }, [taskAnalyses]);

    const analyzeTask = async (taskId: string) => {
        // Validate model is available
        if (!availableModels.includes(analysisSettings.model)) {
            setError(`task-${taskId}`, `Selected model "${analysisSettings.model}" is not available. Please select a valid model.`);
            return;
        }

        setTaskAnalyzing(taskId, true);
        // Clear any previous error for this task
        clearError(`task-${taskId}`);

        try {
            const task = allTasks.find(t => t.taskId === taskId);
            if (!task) return;

            // Prepare the analysis request
            const analysisRequest: TaskAnalysisRequest = {
                task: task,
                model: analysisSettings.model,
                temperature: analysisSettings.temperature
            };

            // Call the real LLM analysis API
            const response = await fetch('/api/analyze/task', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(analysisRequest),
            });

            if (!response.ok) {
                throw new Error(`Analysis failed: ${response.statusText}`);
            }

            const result = TaskAnalysisSchema.parse(await response.json());

            addTaskAnalysis(taskId, result);

        } catch (error) {
            console.error('Analysis failed:', error);
            setError(`task-${taskId}`, error instanceof Error ? error.message : 'Unknown error occurred');
        } finally {
            setTaskAnalyzing(taskId, false);
        }
    };

    const analyzeRun = async () => {
        // Validate model is available
        if (!availableModels.includes(analysisSettings.model)) {
            setError('run-analysis', `Selected model "${analysisSettings.model}" is not available. Please select a valid model.`);
            return;
        }

        setIsRunAnalyzing(true);
        // Clear any previous run analysis error
        clearError('run-analysis');

        try {
            const systemPrompt = selectedRun?.args[0].config_content.system_message;

            // Prepare the run analysis request
            const analysisRequest: RunAnalysisRequest = {
                taskAnalyses: Object.values(taskAnalyses),
                systemPrompt: systemPrompt,
                model: analysisSettings.model,
                temperature: analysisSettings.temperature
            };

            // Call the run analysis API
            const response = await fetch('/api/analyze/run', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(analysisRequest),
            });

            if (!response.ok) {
                throw new Error(`Run analysis failed: ${response.statusText}`);
            }

            const result = RunAnalysisSchema.parse(await response.json());
            setRunAnalysis(result);

        } catch (error) {
            console.error('Run analysis failed:', error);
            setError('run-analysis', error instanceof Error ? error.message : 'Unknown error occurred');
        } finally {
            setIsRunAnalyzing(false);
        }
    };

    const analyzeAllFailedTasks = async () => {
        const tasksToAnalyze = analysisSettings.includeSuccessfulTasks
            ? allTasks
            : failedTasks;

        for (const task of tasksToAnalyze) {
            if (!taskAnalyses[task.taskId]) {
                await analyzeTask(task.taskId);
                // Add a small delay to avoid overwhelming the API
                // await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    };

    return (
        <div className="space-y-6">
            {/* Selection Controls */}
            <SectionCard title="Analysis Selection" icon={<Settings className="w-5 h-5" />}>
                <DatasetSplitSystemSelector
                    availableDatasets={availableDatasets}
                    availableSplits={availableSplits}
                    availableSystems={availableSystems}
                    selectedDataset={selectedDataset}
                    selectedSplit={selectedSplit}
                    selectedSystem={selectedSystem}
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
                            value={selectedRunId || ''}
                            onChange={(e) => {
                                const value = e.target.value;
                                setSelectedRunId(value ? parseInt(value) : null);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            disabled={!selectedSystem}
                        >
                            <option value="">Select Run</option>
                            {availableRunIds.map(runId => (
                                <option key={runId} value={runId}>Run {runId}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="text-sm text-gray-600">
                    Analyzing {runsToAnalyze.length} run with {allTasks.length} total tasks
                </div>
            </SectionCard>

            {/* Run Information */}
            <SectionCard title="Selected Run Information" icon={<FileText className="w-5 h-5" />}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {runsToAnalyze.slice(0, 6).map((runData, index) => (
                        <RunCard
                            key={index}
                            run={runData}
                            showTasks={false}
                        />
                    ))}
                    {runsToAnalyze.length > 6 && (
                        <div className="border border-gray-200 rounded-lg p-4 flex items-center justify-center text-gray-500">
                            <div className="text-center">
                                <div className="text-lg font-medium">+{runsToAnalyze.length - 6}</div>
                                <div className="text-sm">more runs</div>
                            </div>
                        </div>
                    )}
                </div>
            </SectionCard>

            {/* Analysis Section */}
            {selectedDataset && selectedSplit && selectedSystem && selectedRunId !== null ? (
                <SectionCard 
                    title="Task Analysis" 
                    icon={<Brain className="w-5 h-5" />}
                    headerActions={
                        <div className="flex items-center gap-2">
                            <button
                                onClick={analyzeAllFailedTasks}
                                disabled={
                                    Object.keys(isTaskAnalyzing).some(key => isTaskAnalyzing[key]) ||
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
                                    isRunAnalyzing || 
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
                                {isRunAnalyzing ? (
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
                                        onChange={(e) => setAnalysisSettings({ model: e.target.value })}
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
                                    onChange={(e) => setAnalysisSettings({ temperature: parseFloat(e.target.value) })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                />
                            </div>
                            <div className="flex items-center">
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={analysisSettings.includeSuccessfulTasks}
                                        onChange={(e) => setAnalysisSettings({ includeSuccessfulTasks: e.target.checked })}
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
                                <div
                                    key={task.uniqueKey}
                                    className="bg-white rounded-lg"
                                >
                                    <TaskCard
                                        task={task}
                                        onAnalyze={() => analyzeTask(task.taskId)}
                                        isAnalyzing={isTaskAnalyzing[task.taskId]}
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
            {runAnalysis && (
                <SectionCard 
                    title="Run Analysis Results" 
                    icon={<BarChart3 className="w-5 h-5 text-green-600" />}
                >
                    <AnalysisContent analysis={runAnalysis} />
                    
                    {runAnalysis.systemPromptAnalysis && (
                        <div className="mt-6">
                            <SystemPromptComparison analysis={runAnalysis.systemPromptAnalysis} />
                        </div>
                    )}

                    {Object.keys(runAnalysis.taskAnalyses || {}).length > 0 && (
                        <div className="mt-6">
                            <h4 className="font-medium text-gray-800 mb-2">Task Analysis Summary</h4>
                            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                                <div className="flex items-center gap-2 mb-3">
                                    <Badge variant="info">
                                        {Object.keys(runAnalysis.taskAnalyses || {}).length} Analyzed Tasks
                                    </Badge>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {Object.entries(runAnalysis.taskAnalyses || {}).slice(0, 4).map(([taskId, analysis]) => (
                                        <div key={taskId} className="p-2 bg-white border rounded text-xs">
                                            <div className="font-medium text-gray-700 mb-1">{taskId}</div>
                                            <div className="text-gray-600 truncate">{analysis.reason}</div>
                                        </div>
                                    ))}
                                </div>
                                {Object.keys(runAnalysis.taskAnalyses || {}).length > 4 && (
                                    <div className="mt-2 text-xs text-gray-500">
                                        +{Object.keys(runAnalysis.taskAnalyses || {}).length - 4} more tasks analyzed
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
