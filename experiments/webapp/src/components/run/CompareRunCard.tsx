import React, { useMemo } from 'react';
import { RunData, TaskData } from '../../types/run';
import { Trash2, CheckCircle, XCircle, MessageCircleQuestion } from 'lucide-react';

interface CompareRunCardProps {
  run: RunData;
  commonTasks: TaskData[];
  onSelect?: () => void;
  onDelete?: () => void;
  selected?: boolean;
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

export const CompareRunCard: React.FC<CompareRunCardProps> = ({ 
  run, 
  commonTasks,
  onSelect, 
  onDelete,
  selected = false,
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

    // Calculate scores for common tasks only
    const commonTaskScores = useMemo(() => {
        const taskMap = new Map(run.tasks.map(task => [task.taskId, task]));
        const scores = commonTasks.map(commonTask => {
            const runTask = taskMap.get(commonTask.taskId);
            return runTask ? runTask.score.score : 0;
        });
        
        const successCount = scores.filter(score => score === 1).length;
        const failureCount = scores.filter(score => score === 0).length;
        const partialCount = scores.filter(score => score > 0 && score < 1).length;
        const avgScore = scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
        
        return {
            scores,
            successCount,
            failureCount, 
            partialCount,
            avgScore,
            totalTasks: scores.length
        };
    }, [run.tasks, commonTasks]);

    const successRate = (commonTaskScores.avgScore * 100).toFixed(1);

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
                {/* Common Tasks Performance */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                    <div className="text-sm text-gray-600 mb-2">Common Tasks Performance</div>
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-2xl font-bold text-blue-700">{successRate}%</div>
                        <div className="text-xs text-gray-500">{commonTaskScores.totalTasks} tasks</div>
                    </div>
                    
                    {/* Task breakdown */}
                    <div className="flex items-center space-x-4 text-xs">
                        <div className="flex items-center space-x-1">
                            <CheckCircle className="w-3 h-3 text-green-500" />
                            <span className="text-green-700 font-medium">{commonTaskScores.successCount}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                            <XCircle className="w-3 h-3 text-red-500" />
                            <span className="text-red-700 font-medium">{commonTaskScores.failureCount}</span>
                        </div>
                        {commonTaskScores.partialCount > 0 && (
                            <div className="flex items-center space-x-1">
                                <MessageCircleQuestion className="w-3 h-3 text-yellow-500" />
                                <span className="text-yellow-700 font-medium">{commonTaskScores.partialCount}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Overall Performance Metrics */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-green-50 p-3 rounded-lg">
                        <div className="text-sm text-gray-600">Overall Success</div>
                        <div className="text-lg font-semibold text-green-700">{((metrics.mean_score) * 100).toFixed(1)}%</div>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-lg">
                        <div className="text-sm text-gray-600">Total Tasks</div>
                        <div className="text-lg font-semibold text-purple-700">{metrics.num_tasks}</div>
                    </div>
                </div>

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
                            <span className="text-gray-500">Avg Time:</span>
                            <span className="font-medium">{formatTime(metrics.average_time)}</span>
                        </div>
                    </div>
                </div>

                {/* Analysis Status */}
                {run.analysis && (
                    <div className="bg-indigo-50 p-3 rounded-lg">
                        <div className="text-sm text-gray-600">Analysis Available</div>
                    </div>
                )}
            </div>
        </div>
    );
};