import { TaskData, RunData } from '@/types';
import { TaskCard } from './TaskCard';

interface TaskListProps {
  commonTasks: TaskData[];
  filteredRuns: RunData[];
  selectedTask: string;
  onTaskSelect: (taskId: string) => void;
}

export const TaskList = ({ 
  commonTasks, 
  filteredRuns, 
  selectedTask, 
  onTaskSelect 
}: TaskListProps) => {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Common Tasks ({commonTasks.length})</h3>
      <div className="overflow-x-auto shadow-inner rounded-lg bg-gray-50 p-4">
        <div className="flex gap-4 pb-2">
          {commonTasks.map((task) => {
            // Get status for this task across all runs
            const taskStatusAcrossRuns = filteredRuns.map(runData => {
              const runTask = runData.tasks.find(t => t.taskId === task.taskId);
              const runInfo = runData.args[0];
              return {
                runId: runInfo?.run_id?.toString() || 'Unknown',
                score: runTask?.score.score || 0
              };
            });

            return (
              <TaskCard
                key={task.taskId}
                task={task}
                isSelected={selectedTask === task.taskId}
                taskStatusAcrossRuns={taskStatusAcrossRuns}
                onClick={() => onTaskSelect(task.taskId)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
