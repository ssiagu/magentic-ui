import { TaskData, RunData } from '@/types';
import { CheckCircle, XCircle, MessageCircleQuestion, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { useMemo, useState } from 'react';
import { formatTokenCount } from '@/utils/dataUtils';

interface TaskCompareTableProps {
  commonTasks: TaskData[];
  filteredRuns: RunData[];
  selectedTask: string;
  onTaskSelect: (taskId: string) => void;
}

type SortKey = 'taskId' | string; // 'taskId' or run ID as string
type SortDirection = 'asc' | 'desc' | null;

export const TaskCompareTable = ({ 
  commonTasks, 
  filteredRuns, 
  selectedTask, 
  onTaskSelect 
}: TaskCompareTableProps) => {
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

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
      return <ChevronsUpDown className="w-3 h-3 text-gray-400" />;
    }
    if (sortDirection === 'asc') {
      return <ChevronUp className="w-3 h-3 text-blue-600" />;
    }
    if (sortDirection === 'desc') {
      return <ChevronDown className="w-3 h-3 text-blue-600" />;
    }
    return <ChevronsUpDown className="w-3 h-3 text-gray-400" />;
  };
  
  // Process data for table display
  const tableData = useMemo(() => {
    const data = commonTasks.map(task => {
      const runResults = filteredRuns.map(runData => {
        const runTask = runData.tasks.find(t => t.taskId === task.taskId);
        const runInfo = runData.args[0];
        
        return {
          runId: runInfo.run_id,
          score: runTask?.score.score || 0,
          hasTask: !!runTask,
          tokenUsage: {
            input: runTask?.tokenUsage?.grand_total.total_input_tokens || 0,
            output: runTask?.tokenUsage?.grand_total.total_output_tokens || 0,
            total: runTask?.tokenUsage?.grand_total.total_tokens || 0
          }
        };
      });

      return {
        taskId: task.taskId,
        task: task,
        runResults
      };
    });

    // Apply sorting if active
    if (sortKey && sortDirection) {
      data.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        if (sortKey === 'taskId') {
          aValue = a.taskId.toLowerCase();
          bValue = b.taskId.toLowerCase();
        } else {
          // Sorting by run column - find the run result for this run ID
          const runId = parseInt(sortKey);
          const aResult = a.runResults.find(r => r.runId === runId);
          const bResult = b.runResults.find(r => r.runId === runId);
          
          // Sort by score, then by hasTask status
          aValue = aResult ? (aResult.hasTask ? aResult.score : -1) : -1;
          bValue = bResult ? (bResult.hasTask ? bResult.score : -1) : -1;
        }

        // Compare values
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return data;
  }, [commonTasks, filteredRuns, sortKey, sortDirection]);

  // Extract run info for column headers
  const runHeaders = useMemo(() => {
    return filteredRuns.map(runData => {
      const args = runData.args[0];
      
      // Parse config filename without extension
      const configName = (() => {
        const fullPath = args.config || '';
        const filename = fullPath.split('/').pop() || fullPath;
        return filename.replace(/\.[^/.]+$/, '');
      })();

      return {
        runId: args.run_id,
        configName,
        systemType: args.system_type
      };
    });
  }, [filteredRuns]);

  const getScoreIcon = (score: number) => {
    if (score === 1) return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (score === 0) return <XCircle className="w-4 h-4 text-red-500" />;
    return <MessageCircleQuestion className="w-4 h-4 text-yellow-500" />;
  };

  const getScoreBadgeClass = (score: number) => {
    if (score === 1) return 'bg-green-100 text-green-800 border-green-200';
    if (score === 0) return 'bg-red-100 text-red-800 border-red-200';
    return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  };

  if (commonTasks.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold">Common Tasks Comparison</h3>
        <p className="text-sm text-gray-500 mt-1">
          {commonTasks.length} tasks across {filteredRuns.length} runs
        </p>
      </div>
      <div className="overflow-auto max-h-96">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0 z-20">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-30">
                <button
                  onClick={() => handleSort('taskId')}
                  className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
                >
                  <span>Task ID</span>
                  {getSortIcon('taskId')}
                </button>
              </th>
              {runHeaders.map((runHeader) => (
                <th key={runHeader.runId} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-32">
                  <button
                    onClick={() => handleSort(runHeader.runId.toString())}
                    className="flex flex-col items-center space-y-1 hover:text-gray-700 transition-colors w-full"
                  >
                    <div className="flex items-center space-x-1">
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                        Run {runHeader.runId}
                      </span>
                      {getSortIcon(runHeader.runId.toString())}
                    </div>
                    <span className="text-xs text-gray-600 font-normal normal-case truncate max-w-24" title={runHeader.configName}>
                      {runHeader.configName}
                    </span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tableData.map((row) => (
              <tr 
                key={row.taskId} 
                className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                  selectedTask === row.taskId ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                }`}
                onClick={() => onTaskSelect(row.taskId)}
              >
                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white z-10 border-r border-gray-200">
                  <div className="flex items-center">
                    {selectedTask === row.taskId && (
                      <div className="w-1 h-6 bg-blue-500 rounded-full mr-2"></div>
                    )}
                    <span className="truncate max-w-48" title={row.taskId}>
                      {row.taskId}
                    </span>
                  </div>
                </td>
                {row.runResults.map((result) => (
                  <td key={result.runId} className="px-4 py-4 whitespace-nowrap text-center">
                    {result.hasTask ? (
                      <div className="flex flex-col items-center justify-center space-y-1">
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getScoreBadgeClass(result.score)}`}>
                          {getScoreIcon(result.score)}
                          <span className="ml-1">{(result.score * 100).toFixed(0)}%</span>
                        </div>
                        {result.tokenUsage.total > 0 && (
                          <div className="flex flex-col items-center justify-center space-y-0.5">
                            <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                              <span className="font-semibold">In:</span>
                              <span className="ml-1">{formatTokenCount(result.tokenUsage.input)}</span>
                            </div>
                            <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                              <span className="font-semibold">Out:</span>
                              <span className="ml-1">{formatTokenCount(result.tokenUsage.output)}</span>
                            </div>
                            <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
                              <span className="font-semibold">Total:</span>
                              <span className="ml-1">{formatTokenCount(result.tokenUsage.total)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-gray-400 text-xs">N/A</div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};