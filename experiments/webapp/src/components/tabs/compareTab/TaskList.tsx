import { TaskData, RunData } from '@/types';
import { TaskCard } from '@/components/task';
import { Badge } from '@/components/common';

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
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-lg font-semibold">Common Tasks</h3>
        <Badge variant="info" size="sm">
          {commonTasks.length}
        </Badge>
      </div>
      <div className="overflow-x-auto shadow-inner rounded-lg bg-gray-50 p-4">
        <div className="flex gap-4 pb-2">
          {commonTasks.map((task) => {
            // Get status for this task across all runs
            const badges = filteredRuns.map(runData => {
              const runTask = runData.tasks.find(t => t.taskId === task.taskId);
              const runInfo = runData.args[0];
              return <Badge
                key={runInfo.run_id}
                variant={runTask?.score.score === 1 ? "success" : "error"}
                size="sm">
                  {runInfo.run_id}
                </Badge>
            });

            return (
                <div
                key={task.taskId}
                className=
                {`flex rounded-lg transition-colors 
                  border ${selectedTask === task.taskId ? 'border-blue-600' : 'border-transparent'} 
                  hover:shadow-lg transition-shadow relative cursor-pointer`}
                onClick={() => onTaskSelect(task.taskId)}
                >
                <TaskCard
                  task={task}
                  badge={badges}
                />
                </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
