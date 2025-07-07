interface TaskSummaryDisplayProps {
  taskSummary: string;
}

export const TaskSummaryDisplay = ({ taskSummary }: TaskSummaryDisplayProps) => {
  return (
    <div className="text-sm text-black mb-4">
      {taskSummary}
    </div>
  );
};
