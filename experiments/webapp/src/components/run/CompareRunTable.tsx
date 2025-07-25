import React, { useMemo, useState } from 'react';
import { RunData, TaskData } from '../../types/run';
import { CheckCircle, XCircle, MessageCircleQuestion, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

interface CompareRunTableProps {
  runs: RunData[];
  commonTasks: TaskData[];
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

type SortKey = 'runId' | 'systemType' | 'configName' | 'model' | 'dataset' | 'split' | 'commonTasksSuccessRate' | 'overallSuccessRate' | 'overallNumTasks' | 'avgTime';
type SortDirection = 'asc' | 'desc' | null;

export const CompareRunTable: React.FC<CompareRunTableProps> = ({ runs, commonTasks }) => {
    const [sortKey, setSortKey] = useState<SortKey | null>(null);
    const [sortDirection, setSortDirection] = useState<SortDirection>(null);

    // Format average time
    const formatTime = (seconds: number) => {
        if (seconds < 60) return `${seconds.toFixed(1)}s`;
        if (seconds < 3600) return `${(seconds / 60).toFixed(1)}m`;
        return `${(seconds / 3600).toFixed(1)}h`;
    };

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            // Cycle through: asc -> desc -> null
            if (sortDirection === 'asc') {
                setSortDirection('desc');
            } else if (sortDirection === 'desc') {
                setSortKey(null);
                setSortDirection(null);
            } else {
                setSortDirection('asc');
            }
        } else {
            setSortKey(key);
            setSortDirection('asc');
        }
    };

    const getSortIcon = (key: SortKey) => {
        if (sortKey !== key) {
            return <ChevronsUpDown className="w-4 h-4 text-gray-400" />;
        }
        if (sortDirection === 'asc') {
            return <ChevronUp className="w-4 h-4 text-blue-600" />;
        }
        if (sortDirection === 'desc') {
            return <ChevronDown className="w-4 h-4 text-blue-600" />;
        }
        return <ChevronsUpDown className="w-4 h-4 text-gray-400" />;
    };

    const tableData = useMemo(() => {
        const data = runs.map((run, index) => {
            const args = run.args[0];
            const metrics = run.metrics;

            // Parse config filename without extension
            const configName = (() => {
                const fullPath = args.config || '';
                const filename = fullPath.split('/').pop() || fullPath;
                return filename.replace(/\.[^/.]+$/, '');
            })();

            // Extract model
            const model = (() => {
                try {
                    return args.config_content?.model_client?.config?.clients?.[0]?.config?.model ?? "unknown"
                } catch (error) {
                    return "unknown"
                }
            })();

            // Calculate scores for common tasks only
            const commonTaskScores = (() => {
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
                    successCount,
                    failureCount, 
                    partialCount,
                    avgScore,
                    totalTasks: scores.length
                };
            })();

            return {
                index,
                runId: args.run_id,
                systemType: args.system_type,
                configName,
                model,
                dataset: args.dataset,
                split: args.split,
                overallSuccessRate: ((metrics.mean_score) * 100).toFixed(1),
                overallMaxScore: (metrics.max_score * 100).toFixed(1),
                overallNumTasks: metrics.num_tasks,
                avgTime: formatTime(metrics.average_time),
                mode: args.mode,
                parallel: args.parallel,
                seed: args.seed,
                hasAnalysis: !!run.analysis,
                // Common task specific data
                commonTasksSuccessRate: (commonTaskScores.avgScore * 100).toFixed(1),
                commonTasksSuccessCount: commonTaskScores.successCount,
                commonTasksFailureCount: commonTaskScores.failureCount,
                commonTasksPartialCount: commonTaskScores.partialCount,
                commonTasksTotal: commonTaskScores.totalTasks,
                // Raw values for sorting
                rawCommonTasksSuccessRate: commonTaskScores.avgScore * 100,
                rawOverallSuccessRate: metrics.mean_score * 100,
                rawAvgTime: metrics.average_time
            };
        });

        // Apply sorting if active
        if (sortKey && sortDirection) {
            data.sort((a, b) => {
                let aValue: any;
                let bValue: any;

                // Get the appropriate values for comparison
                switch (sortKey) {
                    case 'runId':
                        aValue = a.runId;
                        bValue = b.runId;
                        break;
                    case 'systemType':
                        aValue = a.systemType.toLowerCase();
                        bValue = b.systemType.toLowerCase();
                        break;
                    case 'configName':
                        aValue = a.configName.toLowerCase();
                        bValue = b.configName.toLowerCase();
                        break;
                    case 'model':
                        aValue = a.model.toLowerCase();
                        bValue = b.model.toLowerCase();
                        break;
                    case 'dataset':
                        aValue = a.dataset.toLowerCase();
                        bValue = b.dataset.toLowerCase();
                        break;
                    case 'split':
                        aValue = a.split.toLowerCase();
                        bValue = b.split.toLowerCase();
                        break;
                    case 'commonTasksSuccessRate':
                        aValue = a.rawCommonTasksSuccessRate;
                        bValue = b.rawCommonTasksSuccessRate;
                        break;
                    case 'overallSuccessRate':
                        aValue = a.rawOverallSuccessRate;
                        bValue = b.rawOverallSuccessRate;
                        break;
                    case 'overallNumTasks':
                        aValue = a.overallNumTasks;
                        bValue = b.overallNumTasks;
                        break;
                    case 'avgTime':
                        aValue = a.rawAvgTime;
                        bValue = b.rawAvgTime;
                        break;
                    default:
                        return 0;
                }

                // Compare values
                if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return data;
    }, [runs, commonTasks, sortKey, sortDirection]);

    if (runs.length === 0) {
        return null;
    }

    return (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold">Run Comparison Table</h3>
                <p className="text-sm text-gray-500 mt-1">
                    Comparing {runs.length} runs on {commonTasks.length} common tasks
                </p>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                <button
                                    onClick={() => handleSort('runId')}
                                    className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
                                >
                                    <span>Run</span>
                                    {getSortIcon('runId')}
                                </button>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                <button
                                    onClick={() => handleSort('systemType')}
                                    className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
                                >
                                    <span>System Type</span>
                                    {getSortIcon('systemType')}
                                </button>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                <button
                                    onClick={() => handleSort('configName')}
                                    className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
                                >
                                    <span>Config</span>
                                    {getSortIcon('configName')}
                                </button>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                <button
                                    onClick={() => handleSort('model')}
                                    className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
                                >
                                    <span>Model</span>
                                    {getSortIcon('model')}
                                </button>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                <button
                                    onClick={() => handleSort('dataset')}
                                    className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
                                >
                                    <span>Dataset</span>
                                    {getSortIcon('dataset')}
                                </button>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                <button
                                    onClick={() => handleSort('split')}
                                    className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
                                >
                                    <span>Split</span>
                                    {getSortIcon('split')}
                                </button>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50">
                                <button
                                    onClick={() => handleSort('commonTasksSuccessRate')}
                                    className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
                                >
                                    <span>Common Tasks Score</span>
                                    {getSortIcon('commonTasksSuccessRate')}
                                </button>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50">
                                Common Tasks Breakdown
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                <button
                                    onClick={() => handleSort('overallSuccessRate')}
                                    className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
                                >
                                    <span>Overall Success Rate</span>
                                    {getSortIcon('overallSuccessRate')}
                                </button>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                <button
                                    onClick={() => handleSort('overallNumTasks')}
                                    className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
                                >
                                    <span>Total Tasks</span>
                                    {getSortIcon('overallNumTasks')}
                                </button>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                <button
                                    onClick={() => handleSort('avgTime')}
                                    className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
                                >
                                    <span>Avg Time</span>
                                    {getSortIcon('avgTime')}
                                </button>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Analysis
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {tableData.map((row) => (
                            <tr key={row.index} className="hover:bg-gray-50">
                                <td className="px-4 py-4 whitespace-nowrap">
                                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                                        {row.runId}
                                    </span>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {row.systemType}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {row.configName}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                        {row.model}
                                    </span>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {row.dataset}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {row.split}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap bg-blue-25">
                                    <div className="flex flex-col items-start">
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border border-blue-200">
                                            {row.commonTasksSuccessRate}%
                                        </span>
                                        <span className="text-xs text-gray-500 mt-1">
                                            {row.commonTasksTotal} tasks
                                        </span>
                                    </div>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap bg-blue-25">
                                    <div className="flex items-center space-x-3 text-xs">
                                        <div className="flex items-center space-x-1">
                                            <CheckCircle className="w-3 h-3 text-green-500" />
                                            <span className="text-green-700 font-medium">{row.commonTasksSuccessCount}</span>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                            <XCircle className="w-3 h-3 text-red-500" />
                                            <span className="text-red-700 font-medium">{row.commonTasksFailureCount}</span>
                                        </div>
                                        {row.commonTasksPartialCount > 0 && (
                                            <div className="flex items-center space-x-1">
                                                <MessageCircleQuestion className="w-3 h-3 text-yellow-500" />
                                                <span className="text-yellow-700 font-medium">{row.commonTasksPartialCount}</span>
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                        {row.overallSuccessRate}%
                                    </span>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {row.overallNumTasks}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {row.avgTime}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap">
                                    {row.hasAnalysis ? (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                            Available
                                        </span>
                                    ) : (
                                        <span className="text-xs text-gray-400">None</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};