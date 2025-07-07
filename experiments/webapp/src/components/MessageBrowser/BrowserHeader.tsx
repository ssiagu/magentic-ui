import { ChevronDown, Settings, Download } from 'lucide-react';

interface BrowserHeaderProps {
  showFilters: boolean;
  onToggleFilters: () => void;
  onExportData: () => void;
  canExport: boolean;
}

export const BrowserHeader = ({
  showFilters,
  onToggleFilters,
  onExportData,
  canExport
}: BrowserHeaderProps) => {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-xl font-semibold">Message Browser</h2>
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleFilters}
          className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
        >
          <Settings className="w-4 h-4" />
          {showFilters ? 'Hide' : 'Show'} Filters
          <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>
        <button
          onClick={onExportData}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
          disabled={!canExport}
        >
          <Download className="w-4 h-4" />
          Export Data
        </button>
      </div>
    </div>
  );
};
