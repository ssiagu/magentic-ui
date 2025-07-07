'use client';

import { useState, useMemo, useEffect } from 'react';
import { Play, FileText, BarChart3, Brain, AlertTriangle, CheckCircle, Clock, Settings, AlertCircle, X } from 'lucide-react';
import { RunData, RunAnalysis, RunAnalysisSchema, SystemPromptAnalysis, TaskAnalysis, TaskAnalysisRequest, RunAnalysisRequest, TaskAnalysisSchema } from '@/types';

interface AnalysisDashboardProps {
    runDataList: RunData[];
    onDataUpdate?: (updatedRunDataList: RunData[]) => void;
}

export const AnalysisDashboard = ({ runDataList, onDataUpdate }: AnalysisDashboardProps) => {
    const [taskAnalyses, setTaskAnalyses] = useState<Record<string, TaskAnalysis>>({});
    const [runAnalysis, setRunAnalysis] = useState<RunAnalysis | undefined>(undefined);
    const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
    const [selectedDataset, setSelectedDataset] = useState<string>('');
    const [selectedSplit, setSelectedSplit] = useState<string>('');

    const [isTaskAnalyzing, setIsTaskAnalyzing] = useState<Record<string, boolean>>({});
    const [isRunAnalyzing, setIsRunAnalyzing] = useState<boolean>(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [analysisSettings, setAnalysisSettings] = useState({
        model: 'gpt-4o',
        temperature: 0,
        includeSuccessfulTasks: false
    });

    // Extract available datasets from all runs
    const availableDatasets = useMemo(() => {
        const datasets = new Set<string>();
        runDataList.forEach(runData => {
            runData.args.forEach(args => {
                if (args.dataset) {
                    datasets.add(args.dataset);
                }
            });
        });
        return Array.from(datasets).sort();
    }, [runDataList]);

    // Extract available splits for the selected dataset
    const availableSplits = useMemo(() => {
        if (!selectedDataset) return [];
        
        const splits = new Set<string>();
        runDataList.forEach(runData => {
            runData.args.forEach(args => {
                if (args.dataset === selectedDataset && args.split) {
                    splits.add(args.split);
                }
            });
        });
        return Array.from(splits).sort();
    }, [runDataList, selectedDataset]);

    // Get filtered runs based on dataset and split
    const filteredRuns = useMemo(() => {
        if (!selectedDataset || !selectedSplit) return runDataList;
        
        return runDataList.filter(runData => {
            return runData.args.some(args => 
                args.dataset === selectedDataset && args.split === selectedSplit
            );
        });
    }, [runDataList, selectedDataset, selectedSplit]);

    // Get available run IDs from filtered runs
    const availableRunIds = useMemo(() => {
        const runIds = new Set<number>();
        filteredRuns.forEach(runData => {
            runData.args.forEach(args => {
                runIds.add(args.run_id);
            });
        });
        return Array.from(runIds).sort((a, b) => a - b);
    }, [filteredRuns]);

    // Initialize selections
    useEffect(() => {
        if (availableDatasets.length > 0 && !selectedDataset) {
            setSelectedDataset(availableDatasets[0]);
        }
    }, [availableDatasets, selectedDataset]);

    useEffect(() => {
        if (availableSplits.length > 0 && !selectedSplit) {
            setSelectedSplit(availableSplits[0]);
        }
    }, [availableSplits, selectedSplit]);

    useEffect(() => {
        if (availableRunIds.length > 0 && selectedRunId === null) {
            setSelectedRunId(availableRunIds[0]);
        }
    }, [availableRunIds, selectedRunId]);

    const selectedRun = useMemo(() => {
        if (selectedRunId === null) return null;
        return runDataList.find((runData) => runData.args[0].run_id == selectedRunId)
    }, [selectedRunId])

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
        runsToAnalyze.forEach(runData => {
            runData.tasks.forEach(task => {
                tasks.push({
                    ...task,
                    runId: runData.args[0]?.run_id // Add run ID for context
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
        setIsTaskAnalyzing(prev => ({ ...prev, [taskId]: true }));
        // Clear any previous error for this task
        setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[`task-${taskId}`];
            return newErrors;
        });

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

            setTaskAnalyses(prev => ({
                ...prev,
                [taskId]: {
                    ...result,
                }
            }));

        } catch (error) {
            console.error('Analysis failed:', error);
            setErrors(prev => ({
                ...prev,
                [`task-${taskId}`]: error instanceof Error ? error.message : 'Unknown error occurred'
            }));
        } finally {
            setIsTaskAnalyzing(prev => ({ ...prev, [taskId]: false }));
        }
    };

    const analyzeRun = async () => {
        setIsRunAnalyzing(true);
        // Clear any previous run analysis error
        setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors['run-analysis'];
            return newErrors;
        });

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
            setErrors(prev => ({
                ...prev,
                'run-analysis': error instanceof Error ? error.message : 'Unknown error occurred'
            }));
        } finally {
            setIsRunAnalyzing(false);
        }
    };

    const dismissError = (errorKey: string) => {
        setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[errorKey];
            return newErrors;
        });
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
            <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Analysis Selection
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Dataset
                        </label>
                        <select
                            value={selectedDataset}
                            onChange={(e) => {
                                setSelectedDataset(e.target.value);
                                setSelectedSplit('');
                                setSelectedRunId(null);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        >
                            <option value="">Select Dataset</option>
                            {availableDatasets.map(dataset => (
                                <option key={dataset} value={dataset}>{dataset}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Split
                        </label>
                        <select
                            value={selectedSplit}
                            onChange={(e) => {
                                setSelectedSplit(e.target.value);
                                setSelectedRunId(null);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            disabled={!selectedDataset}
                        >
                            <option value="">Select Split</option>
                            {availableSplits.map(split => (
                                <option key={split} value={split}>{split}</option>
                            ))}
                        </select>
                    </div>

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
                            disabled={!selectedSplit}
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
            </div>

            {/* Overall Metrics */}
            <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Overall Metrics
                </h2>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">{overallMetrics.totalTasks}</div>
                        <div className="text-sm text-gray-600">Total Tasks</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{overallMetrics.successfulTasks}</div>
                        <div className="text-sm text-gray-600">Successful</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">{overallMetrics.failedTasks}</div>
                        <div className="text-sm text-gray-600">Failed</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-600">{overallMetrics.partialTasks}</div>
                        <div className="text-sm text-gray-600">Partial</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{(overallMetrics.averageScore * 100).toFixed(1)}%</div>
                        <div className="text-sm text-gray-600">Avg Score</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">{overallMetrics.averageDuration.toFixed(1)}s</div>
                        <div className="text-sm text-gray-600">Avg Duration</div>
                    </div>
                </div>
            </div>

            {/* Run Information */}
            <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Selected Run Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {runsToAnalyze.slice(0, 6).map((runData, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                            <h4 className="font-medium mb-2">Run {runData.args[0]?.run_id}</h4>
                            <div className="text-sm text-gray-600 space-y-1">
                                <div><strong>Dataset:</strong> {runData.args[0]?.dataset}</div>
                                <div><strong>Split:</strong> {runData.args[0]?.split}</div>
                                <div><strong>System Type:</strong> {runData.args[0]?.system_type}</div>
                                <div><strong>Tasks:</strong> {runData.tasks.length}</div>
                                <div><strong>Mean Score:</strong> {runData.metrics.mean_score.toFixed(3)}</div>
                                <div><strong>Avg Time:</strong> {runData.metrics.average_time.toFixed(1)}s</div>
                            </div>
                        </div>
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
            </div>

            {/* Analysis Section */}
            {selectedDataset && selectedSplit && selectedRunId !== null ? (
                <div className="bg-white rounded-lg shadow-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Brain className="w-5 h-5" />
                            Task Analysis
                        </h3>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={analyzeAllFailedTasks}
                                disabled={Object.keys(isTaskAnalyzing).some(key => isTaskAnalyzing[key])}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                            >
                                <Play className="w-4 h-4" />
                                Analyze All Failed Tasks
                            </button>
                            
                            <button
                                onClick={analyzeRun}
                                disabled={!hasTaskAnalyses || isRunAnalyzing}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
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
                    </div>

                    {/* Error Display */}
                    {Object.keys(errors).length > 0 && (
                        <div className="mb-6 space-y-2">
                            {Object.entries(errors).map(([errorKey, errorMessage]) => (
                                <div key={errorKey} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 text-red-500" />
                                        <span className="text-sm text-red-700">
                                            <strong>
                                                {errorKey.startsWith('task-') ? 'Task Analysis Error:' : 
                                                 errorKey === 'run-analysis' ? 'Run Analysis Error:' : 'Error:'}
                                            </strong> {errorMessage}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => dismissError(errorKey)}
                                        className="text-red-400 hover:text-red-600"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Analysis Settings */}
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium mb-2">Analysis Settings</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Model
                                </label>
                                <input
                                    value={analysisSettings.model}
                                    onChange={(e) => setAnalysisSettings(prev => ({ ...prev, model: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                />
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
                                    onChange={(e) => setAnalysisSettings(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                />
                            </div>
                            <div className="flex items-center">
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={analysisSettings.includeSuccessfulTasks}
                                        onChange={(e) => setAnalysisSettings(prev => ({ ...prev, includeSuccessfulTasks: e.target.checked }))}
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
                                    key={`${task.taskId}-${task.runId}`}
                                    className="border border-gray-200 rounded-lg p-4 bg-white"
                                >
                                    {/* Task Header */}
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <AlertTriangle className="w-4 h-4 text-red-500" />
                                            <span className="text-sm font-medium">{task.taskId}</span>
                                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                                Run {task.runId}
                                            </span>
                                            {taskAnalyses[task.taskId] && (
                                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                                    Analyzed
                                                </span>
                                            )}
                                            {errors[`task-${task.taskId}`] && (
                                                <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                                                    Error
                                                </span>
                                            )}
                                        </div>

                                        <button
                                            onClick={() => analyzeTask(task.taskId)}
                                            disabled={isTaskAnalyzing[task.taskId]}
                                            className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                                        >
                                            {isTaskAnalyzing[task.taskId] ? (
                                                <>
                                                    <Clock className="w-3 h-3 animate-spin" />
                                                    Analyzing...
                                                </>
                                            ) : (
                                                <>
                                                    <Brain className="w-3 h-3" />
                                                    Analyze
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    {/* Task Analysis Results */}
                                    {taskAnalyses[task.taskId] && (
                                        <div className="mt-3 pt-3 border-t border-gray-100">
                                            <div className="space-y-3">
                                                <div>
                                                    <h5 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                                                        Failure Reason
                                                    </h5>
                                                    <p className="text-sm text-gray-700 bg-red-50 p-2 rounded border-l-2 border-red-200">
                                                        {taskAnalyses[task.taskId].reason}
                                                    </p>
                                                </div>
                                                <div>
                                                    <h5 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                                                        Suggestion
                                                    </h5>
                                                    <p className="text-sm text-gray-700 bg-blue-50 p-2 rounded border-l-2 border-blue-200">
                                                        {taskAnalyses[task.taskId].suggestion}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Error Display */}
                                    {errors[`task-${task.taskId}`] && (
                                        <div className="mt-3 pt-3 border-t border-gray-100">
                                            <div className="bg-red-50 border border-red-200 rounded p-2">
                                                <div className="flex items-center gap-2">
                                                    <AlertCircle className="w-4 h-4 text-red-500" />
                                                    <span className="text-sm text-red-700 font-medium">Analysis Error:</span>
                                                </div>
                                                <p className="text-sm text-red-600 mt-1">{errors[`task-${task.taskId}`]}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow-lg p-12">
                    <div className="text-center text-gray-500">
                        <Brain className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <h3 className="text-lg font-medium mb-2">Select Configuration for Analysis</h3>
                        <p>Choose dataset, split, and runs to begin task analysis</p>
                    </div>
                </div>
            )}

            {/* Run Analysis Results Card */}
            {runAnalysis && (
                <div className="bg-white rounded-lg shadow-lg p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-green-600" />
                        Run Analysis Results
                    </h3>
                    
                    {runAnalysis.suggestion && (
                        <div className="mb-6">
                            <h4 className="font-medium text-gray-800 mb-2">Overall Recommendations</h4>
                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-sm text-gray-700">{runAnalysis.suggestion}</p>
                            </div>
                        </div>
                    )}
                    
                    {runAnalysis.systemPromptAnalysis && (
                        <div className="mb-6">
                            <h4 className="font-medium text-gray-800 mb-2">System Prompt Analysis</h4>
                            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                <div className="mb-3">
                                    <h5 className="font-medium text-sm text-gray-700 mb-2">Original Prompt:</h5>
                                    <div className="p-3 bg-white border rounded text-sm text-gray-600 font-mono">
                                        {runAnalysis.systemPromptAnalysis.originalPrompt}
                                    </div>
                                </div>
                                <div>
                                    <h5 className="font-medium text-sm text-gray-700 mb-2">Suggested Improvement:</h5>
                                    <div className="p-3 bg-white border rounded text-sm text-gray-600 font-mono">
                                        {runAnalysis.systemPromptAnalysis.suggestedPrompt}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {Object.keys(runAnalysis.taskAnalyses || {}).length > 0 && (
                        <div>
                            <h4 className="font-medium text-gray-800 mb-2">Task Analysis Summary</h4>
                            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                                <div className="text-sm text-gray-600 mb-2">
                                    <strong>Analyzed Tasks:</strong> {Object.keys(runAnalysis.taskAnalyses || {}).length}
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
                </div>
            )}
        </div>
    );
};
