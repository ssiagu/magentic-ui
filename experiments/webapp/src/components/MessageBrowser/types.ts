import { RunData, FilterOptions, TaskData, RunArgs, RunMetrics } from '@/types';

export interface TaskRunStatus {
  runId: string;
  score: number;
}

export interface SelectedTaskRunData {
  runInfo: RunArgs;
  task: TaskData;
  runMetrics: RunMetrics;
}

export interface MessageBrowserProps {
  runDataList: RunData[];
  onDataUpdate?: (updatedRunDataList: RunData[]) => void;
}

export type EmptyStateType = 'no-selection' | 'no-tasks' | 'no-data';
