import { EmptyStateType } from './types';

interface EmptyStateProps {
  type: EmptyStateType;
  selectedDataset?: string;
  selectedSplit?: string;
}

export const EmptyState = ({ type, selectedDataset, selectedSplit }: EmptyStateProps) => {
  const getContent = () => {
    switch (type) {
      case 'no-selection':
        return {
          title: 'Select Dataset and Split',
          description: 'Choose a dataset and split to view common tasks across runs'
        };
      case 'no-tasks':
        return {
          title: 'No Common Tasks Found',
          description: `No tasks are common across all runs for ${selectedDataset} - ${selectedSplit}`
        };
      case 'no-data':
        return {
          title: 'No Data Available',
          description: 'No data found for the selected criteria'
        };
      default:
        return {
          title: 'No Data',
          description: 'No data available'
        };
    }
  };

  const { title, description } = getContent();

  return (
    <div className="bg-white rounded-lg shadow-lg p-12">
      <div className="text-center text-gray-500">
        <h3 className="text-lg font-medium mb-2">{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
};
