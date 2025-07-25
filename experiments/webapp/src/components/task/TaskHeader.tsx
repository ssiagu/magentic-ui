import React from 'react';

interface TaskHeaderProps {
  task: { taskId: string };
  icon?: React.ReactNode;
}

export const TaskHeader: React.FC<TaskHeaderProps> = ({ task, icon }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      {icon}
      <pre>{task.taskId}</pre>
    </div>
  </div>
);
