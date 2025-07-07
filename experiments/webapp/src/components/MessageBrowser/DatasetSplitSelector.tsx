interface DatasetSplitSelectorProps {
  availableDatasets: string[];
  availableSplits: string[];
  selectedDataset: string;
  selectedSplit: string;
  onDatasetChange: (dataset: string) => void;
  onSplitChange: (split: string) => void;
  disabled?: boolean;
}

export const DatasetSplitSelector = ({
  availableDatasets,
  availableSplits,
  selectedDataset,
  selectedSplit,
  onDatasetChange,
  onSplitChange,
  disabled = false
}: DatasetSplitSelectorProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      <div>
        <label className="block text-sm font-medium text-black mb-1">
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
        <label className="block text-sm font-medium text-black mb-1">
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
    </div>
  );
};
