import React, { useMemo, useState } from 'react';
import { RunData } from '../../types/run';
import { Trash2, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

interface RunTableProps {
  runs: RunData[];
  onDelete?: (index: number) => void;
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

type SortKey = 'runId' | 'systemType' | 'configName' | 'model' | 'dataset' | 'split' | 'successRate' | 'maxScore' | 'numTasks' | 'avgTime' | 'mode';
type SortDirection = 'asc' | 'desc' | null;

export const RunTable: React.FC<RunTableProps> = ({ runs, onDelete }) => {
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

            return {
                index,
                runId: args.run_id,
                systemType: args.system_type,
                configName,
                model,
                dataset: args.dataset,
                split: args.split,
                successRate: ((metrics.mean_score) * 100).toFixed(1),
                maxScore: (metrics.max_score * 100).toFixed(1),
                numTasks: metrics.num_tasks,
                avgTime: formatTime(metrics.average_time),
                mode: args.mode,
                parallel: args.parallel,
                seed: args.seed,
                hasAnalysis: !!run.analysis,
                // Raw values for sorting
                rawSuccessRate: metrics.mean_score * 100,
                rawMaxScore: metrics.max_score * 100,
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
                    case 'successRate':
                        aValue = a.rawSuccessRate;
                        bValue = b.rawSuccessRate;
                        break;
                    case 'maxScore':
                        aValue = a.rawMaxScore;
                        bValue = b.rawMaxScore;
                        break;
                    case 'numTasks':
                        aValue = a.numTasks;
                        bValue = b.numTasks;
                        break;
                    case 'avgTime':
                        aValue = a.rawAvgTime;
                        bValue = b.rawAvgTime;
                        break;
                    case 'mode':
                        aValue = a.mode.toLowerCase();
                        bValue = b.mode.toLowerCase();
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
    }, [runs, sortKey, sortDirection]);

    if (runs.length === 0) {
        return null;
    }

    return (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold">Run Details Table</h3>
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
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                <button
                                    onClick={() => handleSort('successRate')}
                                    className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
                                >
                                    <span>Success Rate</span>
                                    {getSortIcon('successRate')}
                                </button>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                <button
                                    onClick={() => handleSort('maxScore')}
                                    className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
                                >
                                    <span>Max Score</span>
                                    {getSortIcon('maxScore')}
                                </button>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                <button
                                    onClick={() => handleSort('numTasks')}
                                    className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
                                >
                                    <span>Tasks</span>
                                    {getSortIcon('numTasks')}
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
                                <button
                                    onClick={() => handleSort('mode')}
                                    className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
                                >
                                    <span>Mode</span>
                                    {getSortIcon('mode')}
                                </button>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Analysis
                            </th>
                            {onDelete && (
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            )}
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
                                <td className="px-4 py-4 whitespace-nowrap">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                        {row.successRate}%
                                    </span>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                        {row.maxScore}%
                                    </span>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {row.numTasks}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {row.avgTime}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {row.mode}
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
                                {onDelete && (
                                    <td className="px-4 py-4 whitespace-nowrap">
                                        <button
                                            onClick={() => onDelete(row.index)}
                                            className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                            title="Delete run"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};