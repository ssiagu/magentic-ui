'use client';

import { useState, useRef } from 'react';
import { Upload, AlertCircle, CheckCircle, Folder } from 'lucide-react';
import {
    RunData,
    RunDataSchema,
    TaskDataSchema,
    TaskMessageSchema,
    TaskAnswerSchema,
    TaskScoreSchema,
    TaskTimesSchema,
    RunArgsSchema,
    RunMetricsSchema
} from '@/types';
import { z } from 'zod';
import { ErrorState, LoadingState } from '@/components/common';
import { RunCard } from '@/components/run'

interface DataImportProps {
    onDataImport: (data: RunData) => void;
    onDataDelete?: (index: number) => void;
    onClearAll?: () => void;
    existingDataList?: RunData[];
}

export const Import = ({ onDataImport, onDataDelete, onClearAll, existingDataList = [] }: DataImportProps) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const folderInputRef = useRef<HTMLInputElement>(null);

    const validateAndParseRunData = (data: any): RunData => {
        try {
            // First validate the overall structure
            const validatedData = RunDataSchema.parse(data);
            console.log(validatedData)

            // Additional custom validations
            const errors: string[] = [];

            // Check if we have at least one run arg
            if (validatedData.args.length === 0) {
                errors.push("At least one run argument is required");
            }

            // Check if we have tasks
            if (validatedData.tasks.length === 0) {
                errors.push("At least one task is required");
            }

            // Validate that all task IDs are unique
            const taskIds = validatedData.tasks.map(task => task.taskId);
            const uniqueTaskIds = new Set(taskIds);
            if (taskIds.length !== uniqueTaskIds.size) {
                errors.push("All task IDs must be unique");
            }

            // Validate that run metrics match the number of tasks
            if (validatedData.metrics.num_tasks !== validatedData.tasks.length) {
                errors.push(`Metrics num_tasks (${validatedData.metrics.num_tasks}) doesn't match actual tasks (${validatedData.tasks.length})`);
            }

            // Validate score consistency
            validatedData.tasks.forEach((task, index) => {
                if (task.score.score < 0 || task.score.score > 1) {
                    errors.push(`Task ${task.taskId}: Score must be between 0 and 1`);
                }

                if (task.messages.length === 0) {
                    errors.push(`Task ${task.taskId}: Must have at least one message`);
                }

                if (task.times.duration <= 0) {
                    errors.push(`Task ${task.taskId}: Duration must be positive`);
                }
            });

            if (errors.length > 0) {
                setValidationErrors(errors);
                throw new Error(`Validation failed: ${errors.join(', ')}`);
            }

            setValidationErrors([]);
            return validatedData;

        } catch (err) {
            if (err instanceof z.ZodError) {
                const zodErrors = err.errors.map(e => `${e.path.join('.')}: ${e.message}`);
                setValidationErrors(zodErrors);
                throw new Error(`Schema validation failed: ${zodErrors.join(', ')}`);
            }
            throw err;
        }
    };

    const parseRunFolders = async (files: FileList): Promise<RunData> => {
        const tasks: any[] = [];
        const runArgs: any[] = [];
        let runMetrics: any = null;

        // Group files by their directory structure
        const filesByPath: Record<string, File[]> = {};
        const rootFiles: File[] = [];

        // Organize files by their paths
        Array.from(files).forEach(file => {
            const pathParts = (file.webkitRelativePath || file.name).split('/');

            if (pathParts.length <= 2) {
                // Root level file
                rootFiles.push(file);
            } else {
                // File in a subdirectory (task folder)
                const taskId = pathParts[pathParts.length - 2]; // Parent directory name
                if (!filesByPath[taskId]) {
                    filesByPath[taskId] = [];
                }
                filesByPath[taskId].push(file);
            }
        });

        // Process root-level files (args and metrics)
        for (const file of rootFiles) {
            try {
                const content = await file.text();

                if (file.name.startsWith('args_')) {
                    // Parse run arguments file
                    const argsData = JSON.parse(content);
                    const validatedArgs = RunArgsSchema.parse(argsData);
                    runArgs.push(validatedArgs);
                } else if (file.name === 'metrics.json') {
                    // Parse metrics file
                    const metricsData = JSON.parse(content);
                    runMetrics = RunMetricsSchema.parse(metricsData);
                }
            } catch (error) {
                console.warn(`Failed to process root file ${file.name}:`, error);
            }
        }

        // Process task directories
        for (const [taskId, files] of Object.entries(filesByPath)) {
            let score: any = { score: 0, metadata: {} };
            let answer: any = { answer: '', screenshots: [] };
            let messages: any[] = [];
            let times: any = { start_time: Date.now(), end_time: Date.now(), duration: 0 };

            // Process all files for this task
            for (const file of files) {
                const fileName = file.name;

                try {
                    const content = await file.text();

                    if (fileName === 'score.json') {
                        // Parse score file
                        const scoreData = JSON.parse(content);
                        score = TaskScoreSchema.parse(scoreData);
                    } else if (fileName.endsWith('_answer.json')) {
                        // Parse answer file
                        const answerData = JSON.parse(content);
                        // Handle different possible answer formats
                        const answerText = answerData.answer ||
                            answerData.computed_answer ||
                            answerData.final_answer ||
                            answerData.response ||
                            JSON.stringify(answerData);
                        const screenshots = answerData.screenshots || [];
                        answer = TaskAnswerSchema.parse({
                            answer: answerText,
                            screenshots: Array.isArray(screenshots) ? screenshots : []
                        });
                    } else if (fileName.endsWith('_messages.json')) {
                        // Parse messages file
                        const messagesData = JSON.parse(content);
                        if (Array.isArray(messagesData)) {
                            messages = messagesData.map(msg => TaskMessageSchema.parse(msg));
                        }
                    } else if (fileName === 'times.json') {
                        // Parse times file
                        const timesData = JSON.parse(content);
                        times = TaskTimesSchema.parse(timesData);
                    }
                } catch (error) {
                    console.warn(`Failed to process task file ${fileName} for task ${taskId}:`, error);
                }
            }

            // Create and validate task data
            try {
                const taskData = TaskDataSchema.parse({
                    taskId,
                    messages,
                    answer,
                    score,
                    times
                });
                tasks.push(taskData);
            } catch (error) {
                console.warn(`Failed to create task data for ${taskId}:`, error);
            }
        }

        // Create default metrics if not found
        if (!runMetrics) {
            const meanScore = tasks.length > 0 ? tasks.reduce((sum, task) => sum + task.score.score, 0) / tasks.length : 0;
            runMetrics = RunMetricsSchema.parse({
                mean_score: meanScore,
                max_score: Math.max(...tasks.map(t => t.score.score), 0),
                num_tasks: tasks.length,
                average_time: tasks.length > 0 ? tasks.reduce((sum, task) => sum + task.times.duration, 0) / tasks.length / 1000 : 0,
                scores: tasks.map(task => [task.taskId, JSON.stringify({ score: task.score.score, metadata: task.score.metadata })])
            });
        }

        // Validate and return the complete run data
        return validateAndParseRunData({
            args: runArgs,
            metrics: runMetrics,
            tasks
        });
    };

    const handleFolderUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        setIsLoading(true);
        setError(null);
        setSuccess(null);
        setValidationErrors([]);

        try {
            const runData = await parseRunFolders(files);
            onDataImport(runData);
            setSuccess(`Successfully imported ${runData.tasks.length} tasks from ${runData.args.length} runs!`);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(`Error processing folder: ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Upload className="w-5 h-5" />
                    Data Import with Validation
                </h2>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center gap-2 text-red-700 mb-2">
                            <AlertCircle className="w-4 h-4" />
                            <span className="font-medium">Import Error</span>
                        </div>
                        <div className="text-red-600 text-sm">{error}</div>
                    </div>
                )}

                {validationErrors.length > 0 && (
                    <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="flex items-center gap-2 text-orange-700 mb-2">
                            <AlertCircle className="w-4 h-4" />
                            <span className="font-medium">Validation Errors</span>
                        </div>
                        <ul className="text-orange-600 text-sm space-y-1">
                            {validationErrors.map((err, index) => (
                                <li key={index} className="list-disc list-inside">{err}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {success && (
                    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
                        <CheckCircle className="w-4 h-4" />
                        {success}
                    </div>
                )}

                <div>
                    {/* Folder Upload */}
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <input
                            type="file"
                            ref={folderInputRef}
                            onChange={handleFolderUpload}
                            multiple
                            {...({ webkitdirectory: "" } as any)}
                            className="hidden"
                        />
                        <Folder className="w-12 h-12 mx-auto mb-4 text-black" />
                        <h3 className="text-lg font-medium mb-2">Upload Run Folder</h3>
                        <button
                            onClick={() => folderInputRef.current?.click()}
                            disabled={isLoading}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                            {isLoading ? 'Processing...' : 'Select Folder'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Existing Data Display */}
            {existingDataList.length > 0 && (
                <div className="bg-white rounded-lg shadow-lg p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">Imported Data ({existingDataList.length} runs)</h3>
                        {onClearAll && (
                            <button
                                onClick={() => {
                                    if (window.confirm('Are you sure you want to clear all imported data? This action cannot be undone.')) {
                                        onClearAll();
                                        setSuccess('All data cleared successfully');
                                        setError(null);
                                    }
                                }}
                                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                            >
                                Clear All
                            </button>
                        )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {existingDataList.map((runData, index) => (
                            <RunCard
                                key={index}
                                run={runData}
                                onDelete={() => onDataDelete?.(index)}
                                showTasks={false}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
