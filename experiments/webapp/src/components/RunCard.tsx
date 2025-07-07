import { RunData } from "@/types";
import React, { useMemo } from "react";
import { Trash2 } from "lucide-react";

interface RunCardProps {
    runData: RunData;
    onDelete?: () => void;
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

const RunCard: React.FC<RunCardProps> = ({ runData, onDelete }) => {
    const args = runData.args[0];
    const title = `${args.dataset} (${args.split}): ${args.system_type}`
    const subtitle = args.config
    const metrics = runData.metrics;

    const model = useMemo(() => {
        return findModel(args.config_content.model_client) ?? "unknown"
    }, [args])

    // Calculate success rate
    const successRate = ((metrics.mean_score) * 100).toFixed(1);

    // Format average time
    const formatTime = (seconds: number) => {
        if (seconds < 60) return `${seconds.toFixed(1)}s`;
        if (seconds < 3600) return `${(seconds / 60).toFixed(1)}m`;
        return `${(seconds / 3600).toFixed(1)}h`;
    };

    return (
        <div className="bg-white shadow-md rounded-lg p-6 max-w-md mx-auto border border-gray-200 hover:shadow-lg transition-shadow relative">
            {/* Delete Button */}
            {onDelete && (
                <button
                    onClick={onDelete}
                    className="absolute top-3 right-3 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    title="Delete run"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            )}

            <div className="mb-4 pr-8">
                <h2 className="text-xl font-semibold text-gray-800 mb-1">{title}</h2>
                <p className="text-sm text-gray-600">{subtitle}</p>
                <p className="text-xs text-gray-500 mt-1">Run ID: {args.run_id}</p>
            </div>

            <div className="space-y-3">
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
                {runData.analysis && (
                    <div className="bg-indigo-50 p-3 rounded-lg">
                        <div className="text-sm text-gray-600">Analysis Available</div>
                        <div className="text-xs text-indigo-700 mt-1">
                            {Object.keys(runData.analysis.taskAnalyses).length} task analyses
                            {runData.analysis.systemPromptAnalysis && " • System prompt analysis"}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RunCard;