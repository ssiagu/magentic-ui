import React, { useMemo } from 'react';
import { RunData } from '../../types/run';
import { RunTaskList } from './RunTaskList';
import { Trash2 } from 'lucide-react';
import { computeTotalTokenUsageFromTasks, formatTokenCount } from '../../utils/dataUtils';

interface RunCardProps {
  run: RunData;
  onSelect?: () => void;
  onDelete?: () => void;
  showTasks?: boolean;
  selected?: boolean;
  onTaskSelect?: (taskId: string) => void;
  selectedTaskId?: string;
}

const findModel = (obj: any): (string | undefined) => {
    if (obj?.model !== undefined && typeof obj.model === "string") {
        return obj.model;
    }
    else if (Array.isArray(obj)) {
        for (const value of Object.values(obj)) {
            const model = findModel(value);
            if (model !== undefined) {
                return model;
            }
        }
    }
    else if (typeof obj === 'object') {
        for (const value of Object.values(obj)) {
            const model = findModel(value);
            if (model !== undefined) {
                return model;
            }
        }
    }

    return undefined;
}

export const RunCard: React.FC<RunCardProps> = ({ 
  run, 
  onSelect, 
  onDelete,
  showTasks = false,
  selected = false,
  onTaskSelect,
  selectedTaskId
}) => {
    const args = run.args[0];
    const metrics = run.metrics;

    const model = useMemo(() => {
        try {
            return args.config_content?.model_client?.config?.clients?.[0]?.config?.model ?? "unknown"
        } catch (error) {
            return "unknown"
        }
    }, [args])

    // Parse config filename without extension
    const configName = useMemo(() => {
        const fullPath = args.config || '';
        const filename = fullPath.split('/').pop() || fullPath;
        return filename.replace(/\.[^/.]+$/, ''); // Remove file extension
    }, [args.config]);

    // New title format: System type first, config name second
    const systemType = args.system_type
    const datasetSplit = `${args.dataset} - ${args.split}`

    // Calculate success rate
    const successRate = ((metrics.mean_score) * 100).toFixed(1);

    // Calculate token usage
    const totalTokenUsage = useMemo(() => computeTotalTokenUsageFromTasks(run.tasks), [run.tasks]);

    // Format average time
    const formatTime = (seconds: number) => {
        if (seconds < 60) return `${seconds.toFixed(1)}s`;
        if (seconds < 3600) return `${(seconds / 60).toFixed(1)}m`;
        return `${(seconds / 3600).toFixed(1)}h`;
    };

    return (
        <div 
            className={`bg-white shadow-md rounded-lg p-6 border border-gray-200 relative h-full flex flex-col
                ${selected ? 'border-blue-500 bg-blue-50' : ''}`}
            onClick={onSelect}
        >
            {/* Delete Button */}
            {onDelete && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                    }}
                    className="absolute top-3 right-3 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    title="Delete run"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            )}

            <div className="mb-4 pr-8">
                <p className="text-sm text-gray-500 mb-1">{systemType}</p>
                <h2 className="text-xl font-semibold text-gray-800 mb-3">{configName}</h2>
                <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                        Run {args.run_id}
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {model}
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {datasetSplit}
                    </span>
                </div>
            </div>

            <div className="space-y-3 flex-1">
                {/* Performance Metrics */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-3 rounded-lg">
                        <div className="text-sm text-gray-600">Success Rate</div>
                        <div className="text-lg font-semibold text-blue-700">{successRate}%</div>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                        <div className="text-sm text-gray-600">Max Score</div>
                        <div className="text-lg font-semibold text-green-700">{(metrics.max_score * 100).toFixed(1)}%</div>
                    </div>
                </div>

                {/* Task Information */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-purple-50 p-3 rounded-lg">
                        <div className="text-sm text-gray-600">Tasks</div>
                        <div className="text-lg font-semibold text-purple-700">{metrics.num_tasks}</div>
                    </div>
                    <div className="bg-orange-50 p-3 rounded-lg">
                        <div className="text-sm text-gray-600">Avg Time</div>
                        <div className="text-lg font-semibold text-orange-700">{formatTime(metrics.average_time)}</div>
                    </div>
                </div>

                {/* Token Usage Information */}
                {totalTokenUsage && (
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-yellow-50 p-3 rounded-lg">
                            <div className="text-sm text-gray-600">Total Tokens</div>
                            <div className="text-lg font-semibold text-yellow-700">{formatTokenCount(totalTokenUsage.grand_total.total_tokens)}</div>
                            <div className="text-xs text-gray-500">
                                {formatTokenCount(totalTokenUsage.grand_total.total_input_tokens)} in, {formatTokenCount(totalTokenUsage.grand_total.total_output_tokens)} out
                            </div>
                        </div>
                        <div className="bg-cyan-50 p-3 rounded-lg">
                            <div className="text-sm text-gray-600">Mean Tokens</div>
                            <div className="text-lg font-semibold text-cyan-700">
                                {formatTokenCount(Math.round(totalTokenUsage.grand_total.total_tokens / run.tasks.filter(t => t.tokenUsage).length))}
                            </div>
                            <div className="text-xs text-gray-500">per task</div>
                        </div>
                    </div>
                )}

                {/* Configuration Details */}
                <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-sm text-gray-600 mb-2">Configuration</div>
                    <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                            <span className="text-gray-500">Model:</span>
                            <span className="font-medium">{model}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Mode:</span>
                            <span className="font-medium">{args.mode}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Parallel:</span>
                            <span className="font-medium">{args.parallel}</span>
                        </div>
                        {args.subsample > 0 && (
                            <div className="flex justify-between">
                                <span className="text-gray-500">Subsample:</span>
                                <span className="font-medium">{args.subsample}</span>
                            </div>
                        )}
                        <div className="flex justify-between">
                            <span className="text-gray-500">Seed:</span>
                            <span className="font-medium">{args.seed}</span>
                        </div>
                    </div>
                </div>

                {/* Analysis Status */}
                {run.analysis && (
                    <div className="bg-indigo-50 p-3 rounded-lg">
                        <div className="text-sm text-gray-600">Analysis Available</div>
                    </div>
                )}

                {/* Tasks Section */}
                {showTasks && (
                    <div className="mt-4">
                        <RunTaskList 
                            tasks={run.tasks} 
                            onTaskSelect={onTaskSelect}
                            selectedTaskId={selectedTaskId}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};
