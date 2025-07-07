import { useState } from 'react';
import { FilterOptions } from '@/types';

export const useMessageBrowserState = () => {
  const [selectedTask, setSelectedTask] = useState<string>('');
  const [selectedDataset, setSelectedDataset] = useState<string>('');
  const [selectedSplit, setSelectedSplit] = useState<string>('');
  const [filters, setFilters] = useState<FilterOptions>({
    selectedRuns: [],
    scoreFilter: 'all',
    categoryFilter: 'all'
  });
  const [showFilters, setShowFilters] = useState(false);

  return {
    selectedTask,
    setSelectedTask,
    selectedDataset,
    setSelectedDataset,
    selectedSplit,
    setSelectedSplit,
    filters,
    setFilters,
    showFilters,
    setShowFilters,
  };
};
