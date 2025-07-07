import { useMemo } from 'react';
import { RunData, FilterOptions } from '@/types';
import { SelectedTaskRunData } from '@/components/MessageBrowser/types';

interface UseMessageBrowserDataProps {
  runDataList: RunData[];
  selectedDataset: string;
  selectedSplit: string;
  selectedTask: string;
  filters: FilterOptions;
}

export const useMessageBrowserData = ({
  runDataList,
  selectedDataset,
  selectedSplit,
  selectedTask,
  filters
}: UseMessageBrowserDataProps) => {
  // Extract all available datasets from all runs
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

  // Get runs that match the selected dataset and split
  const filteredRuns = useMemo(() => {
    if (!selectedDataset || !selectedSplit) return [];
    
    return runDataList.filter(runData => {
      return runData.args.some(args => 
        args.dataset === selectedDataset && args.split === selectedSplit
      );
    });
  }, [runDataList, selectedDataset, selectedSplit]);

  // Find tasks that are common across all filtered runs
  const commonTasks = useMemo(() => {
    if (filteredRuns.length === 0) return [];
    
    if (filteredRuns.length === 1) {
      return filteredRuns[0].tasks.filter(task => {
        switch (filters.scoreFilter) {
          case 'success':
            return task.score.score === 1;
          case 'failure':
            return task.score.score === 0;
          case 'partial':
            return task.score.score > 0 && task.score.score < 1;
          default:
            return true;
        }
      });
    }

    // Find task IDs that exist in all runs
    const firstRunTaskIds = new Set(filteredRuns[0].tasks.map(t => t.taskId));
    const commonTaskIds = filteredRuns.slice(1).reduce((common, runData) => {
      const runTaskIds = new Set(runData.tasks.map(t => t.taskId));
      return new Set([...common].filter(id => runTaskIds.has(id)));
    }, firstRunTaskIds);

    // Get the actual task objects from the first run (they should be the same across runs)
    return filteredRuns[0].tasks.filter(task => {
      const isCommon = commonTaskIds.has(task.taskId);
      if (!isCommon) return false;
      
      switch (filters.scoreFilter) {
        case 'success':
          return task.score.score === 1;
        case 'failure':
          return task.score.score === 0;
        case 'partial':
          return task.score.score > 0 && task.score.score < 1;
        default:
          return true;
      }
    });
  }, [filteredRuns, filters.scoreFilter]);

  const taskSummary = useMemo(() => {
    const totalTasks = commonTasks.length;
    const successTasks = commonTasks.filter(t => t.score.score === 1).length;
    const failedTasks = commonTasks.filter(t => t.score.score === 0).length;
    const partialTasks = commonTasks.filter(t => t.score.score > 0 && t.score.score < 1).length;
    
    return `${totalTasks} tasks • ${successTasks} passed, ${failedTasks} failed, ${partialTasks} partial • ${filteredRuns.length} runs`;
  }, [commonTasks, filteredRuns.length]);

  // Get selected task data from all runs
  const selectedTaskDataFromRuns = useMemo(() => {
    if (!selectedTask || filteredRuns.length === 0) return [];
    
    return filteredRuns.map(runData => {
      const task = runData.tasks.find(t => t.taskId === selectedTask);
      const runInfo = runData.args[0]; // Assuming first args entry contains run info
      return {
        runInfo,
        task,
        runMetrics: runData.metrics
      } as SelectedTaskRunData;
    }).filter(item => item.task); // Only include runs that have this task
  }, [selectedTask, filteredRuns]);

  return {
    availableDatasets,
    availableSplits,
    filteredRuns,
    commonTasks,
    taskSummary,
    selectedTaskDataFromRuns,
  };
};
