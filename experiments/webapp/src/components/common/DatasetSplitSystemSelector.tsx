interface DatasetSplitSystemSelectorProps {
  availableDatasets: string[];
  availableSplits: string[];
  availableSystems?: string[];
  selectedDataset: string;
  selectedSplit: string;
  selectedSystem?: string;
  onDatasetChange: (dataset: string) => void;
  onSplitChange: (split: string) => void;
  onSystemChange?: (system: string) => void;
  disabled?: boolean;
  showSystem?: boolean;
}

export const DatasetSplitSystemSelector = ({
  availableDatasets,
  availableSplits,
  availableSystems = [],
  selectedDataset,
  selectedSplit,
  selectedSystem = '',
  onDatasetChange,
  onSplitChange,
  onSystemChange,
  disabled = false,
  showSystem = false,
}: DatasetSplitSystemSelectorProps) => {
  const gridClass = showSystem 
    ? `grid-cols-1 sm:grid-cols-3`
    : `grid-cols-1 sm:grid-cols-2`;

  return (
    <div className={`grid ${gridClass} gap-4 mb-4 max-w-4xl`}>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Dataset
        </label>
        <select
          value={selectedDataset}
          onChange={(e) => onDatasetChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          disabled={disabled}
        >
          <option value="">Select Dataset</option>
          {availableDatasets.map(dataset => (
            <option key={dataset} value={dataset}>{dataset}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Split
        </label>
        <select
          value={selectedSplit}
          onChange={(e) => onSplitChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          disabled={!selectedDataset || disabled}
        >
          <option value="">Select Split</option>
          {availableSplits.map(split => (
            <option key={split} value={split}>{split}</option>
          ))}
        </select>
      </div>

      {showSystem && onSystemChange && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            System
          </label>
          <select
            value={selectedSystem}
            onChange={(e) => onSystemChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            disabled={!selectedSplit || disabled}
          >
            <option value="">Select System</option>
            {availableSystems.map(system => (
              <option key={system} value={system}>{system}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};
