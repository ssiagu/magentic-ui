import { FilterOptions } from '@/types';

interface FilterPanelProps {
  filters: FilterOptions;
  showFilters: boolean;
  onFiltersChange: (filters: FilterOptions) => void;
}

export const FilterPanel = ({
  filters,
  showFilters,
  onFiltersChange
}: FilterPanelProps) => {
  if (!showFilters) return null;

  return (
    <div className="border-t pt-4 mt-4">
      <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-black mb-1">
            Score Filter
          </label>
          <select
            value={filters.scoreFilter}
            onChange={(e) => onFiltersChange({ 
              ...filters, 
              scoreFilter: e.target.value as FilterOptions['scoreFilter']
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">All Scores</option>
            <option value="success">Success Only</option>
            <option value="failure">Failure Only</option>
            <option value="partial">Partial Only</option>
          </select>
        </div>
      </div>
    </div>
  );
};
