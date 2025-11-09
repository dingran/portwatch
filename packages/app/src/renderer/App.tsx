import { useState, useEffect } from 'react';
import { PortInfo, FilterOptions, FilterPreset } from '@portwatch/core';

function App() {
  const [ports, setPorts] = useState<PortInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Advanced filters
  const [portRangeMin, setPortRangeMin] = useState('');
  const [portRangeMax, setPortRangeMax] = useState('');
  const [searchMode, setSearchMode] = useState<'substring' | 'prefix'>('substring');

  // Presets
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);

  // Fetch ports with filters
  const fetchPorts = async () => {
    setLoading(true);
    try {
      const filters: FilterOptions = {};

      // Port range filter
      if (portRangeMin && portRangeMax) {
        const min = parseInt(portRangeMin, 10);
        const max = parseInt(portRangeMax, 10);
        if (!isNaN(min) && !isNaN(max) && min <= max) {
          filters.portRange = { min, max };
        }
      }

      // Process name filter
      if (searchText) {
        if (searchMode === 'prefix') {
          filters.processPrefix = searchText;
        } else {
          filters.processName = searchText;
        }
      }

      const result = await window.portwatchAPI.scanPorts(filters);
      if (result.success && result.data) {
        setPorts(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch ports:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load presets on mount
  useEffect(() => {
    const loadPresets = async () => {
      const result = await window.portwatchAPI.loadConfig();
      if (result.success && result.data?.presets) {
        setPresets(result.data.presets);
      }
    };
    loadPresets();
  }, []);

  // Initial fetch and auto-refresh
  useEffect(() => {
    fetchPorts();

    if (autoRefresh) {
      const interval = setInterval(fetchPorts, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, searchText, portRangeMin, portRangeMax, searchMode]);

  // Apply a preset (or toggle it off if already active)
  const applyPreset = async (preset: FilterPreset) => {
    // If clicking the same preset, toggle it off
    if (activePresetId === preset.id) {
      setSearchText('');
      setPortRangeMin('');
      setPortRangeMax('');
      setActivePresetId(null);
      setTimeout(() => fetchPorts(), 0);
      return;
    }

    const { filters } = preset;

    // Clear all filters first
    setSearchText('');
    setPortRangeMin('');
    setPortRangeMax('');

    // Apply port range
    if (filters.portRange) {
      setPortRangeMin(filters.portRange.min.toString());
      setPortRangeMax(filters.portRange.max.toString());
    }

    // Apply exact port
    if (filters.port !== undefined) {
      setPortRangeMin(filters.port.toString());
      setPortRangeMax(filters.port.toString());
    }

    // Apply process filter
    if (filters.processPrefix) {
      setSearchText(filters.processPrefix);
      setSearchMode('prefix');
    } else if (filters.processName) {
      setSearchText(filters.processName);
      setSearchMode('substring');
    }

    setActivePresetId(preset.id);

    // Immediately fetch with new filters
    await fetchPorts();
  };

  // Save current filters as preset
  const saveCurrentAsPreset = async () => {
    const name = prompt('Enter preset name:');
    if (!name) return;

    const description = prompt('Enter description (optional):');

    const newPreset: FilterPreset = {
      id: `custom-${Date.now()}`,
      name,
      description: description || undefined,
      filters: {},
    };

    // Build filters from current state
    if (portRangeMin && portRangeMax) {
      const min = parseInt(portRangeMin, 10);
      const max = parseInt(portRangeMax, 10);
      if (!isNaN(min) && !isNaN(max)) {
        if (min === max) {
          newPreset.filters.port = min;
        } else {
          newPreset.filters.portRange = { min, max };
        }
      }
    }

    if (searchText) {
      if (searchMode === 'prefix') {
        newPreset.filters.processPrefix = searchText;
      } else {
        newPreset.filters.processName = searchText;
      }
    }

    // Save to config
    const updatedPresets = [...presets, newPreset];
    setPresets(updatedPresets);

    const configResult = await window.portwatchAPI.loadConfig();
    if (configResult.success && configResult.data) {
      await window.portwatchAPI.saveConfig({
        ...configResult.data,
        presets: updatedPresets,
      });
    }

    alert(`Preset "${name}" saved!`);
  };

  // Delete a preset
  const deletePreset = async (presetId: string) => {
    if (!confirm('Delete this preset?')) return;

    const updatedPresets = presets.filter((p) => p.id !== presetId);
    setPresets(updatedPresets);

    const configResult = await window.portwatchAPI.loadConfig();
    if (configResult.success && configResult.data) {
      await window.portwatchAPI.saveConfig({
        ...configResult.data,
        presets: updatedPresets,
      });
    }

    if (activePresetId === presetId) {
      setActivePresetId(null);
    }
  };

  // Clear all filters
  const clearFilters = async () => {
    setSearchText('');
    setPortRangeMin('');
    setPortRangeMax('');
    setActivePresetId(null);

    // Immediately fetch with cleared filters
    // Use setTimeout to ensure state updates have been processed
    setTimeout(() => fetchPorts(), 0);
  };

  // Kill process
  const handleKill = async (port: number) => {
    if (confirm(`Kill process on port ${port}?`)) {
      const result = await window.portwatchAPI.killByPort(port, false);
      if (result.success) {
        fetchPorts();
      } else {
        alert(`Failed to kill process: ${result.message}`);
      }
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-3">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-semibold text-gray-800">PortWatch</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-2 py-1 text-xs rounded ${
                showFilters
                  ? 'bg-purple-500 text-white hover:bg-purple-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              title="Advanced filters"
            >
              ⚙️
            </button>
            <button
              onClick={fetchPorts}
              disabled={loading}
              className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? '...' : '↻'}
            </button>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-2 py-1 text-xs rounded ${
                autoRefresh
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              title="Auto-refresh"
            >
              Auto
            </button>
          </div>
        </div>

        {/* Preset Bar */}
        {presets.length > 0 && (
          <div className="flex gap-2 mb-2 overflow-x-auto pb-1">
            {presets.map((preset) => (
              <div key={preset.id} className="flex items-center gap-1">
                <button
                  onClick={() => applyPreset(preset)}
                  className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition-colors ${
                    activePresetId === preset.id
                      ? 'bg-purple-500 text-white'
                      : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                  }`}
                  title={preset.description}
                >
                  {preset.name}
                </button>
                {!['web-dev', 'inngest', 'postgres'].includes(preset.id) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deletePreset(preset.id);
                    }}
                    className="px-1 text-xs text-gray-400 hover:text-red-600"
                    title="Delete preset"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            {(portRangeMin || portRangeMax || searchText) && (
              <button
                onClick={saveCurrentAsPreset}
                className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-full hover:bg-green-200 whitespace-nowrap"
                title="Save current filters as preset"
              >
                + Save
              </button>
            )}
            {(portRangeMin || portRangeMax || searchText || activePresetId) && (
              <button
                onClick={clearFilters}
                className="px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 whitespace-nowrap"
                title="Clear all filters"
              >
                Clear
              </button>
            )}
          </div>
        )}

        {/* Search */}
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            placeholder={`Search ${searchMode === 'prefix' ? 'prefix' : 'name'}...`}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={searchMode}
            onChange={(e) => setSearchMode(e.target.value as 'substring' | 'prefix')}
            className="px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="substring">Contains</option>
            <option value="prefix">Starts with</option>
          </select>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="p-2 bg-gray-50 rounded border border-gray-200 space-y-2">
            <div>
              <label className="text-xs text-gray-600 font-medium mb-1 block">
                Port Range
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={portRangeMin}
                  onChange={(e) => setPortRangeMin(e.target.value)}
                  className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  max="65535"
                />
                <span className="text-gray-400 self-center">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={portRangeMax}
                  onChange={(e) => setPortRangeMax(e.target.value)}
                  className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  max="65535"
                />
                {(portRangeMin || portRangeMax) && (
                  <button
                    onClick={() => {
                      setPortRangeMin('');
                      setPortRangeMax('');
                      // Immediately refresh results
                      setTimeout(() => fetchPorts(), 0);
                    }}
                    className="px-2 py-1 text-xs text-gray-600 hover:text-red-600"
                    title="Clear"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Port List */}
      <div className="flex-1 overflow-y-auto">
        {ports.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            {loading ? 'Loading...' : 'No ports found'}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {ports.map((port, index) => (
              <div
                key={`${port.pid}-${port.port}-${index}`}
                className="p-3 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg font-bold text-blue-600">
                        :{port.port}
                      </span>
                      <span className="text-xs text-gray-500">PID {port.pid}</span>
                    </div>
                    <div className="text-sm font-medium text-gray-800 mb-0.5">
                      {port.processName}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {port.workingDirectory.replace(/^\/Users\/[^/]+/, '~')}
                    </div>
                  </div>
                  <button
                    onClick={() => handleKill(port.port)}
                    className="ml-2 px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition-colors"
                  >
                    Kill
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 px-3 py-2 text-xs text-gray-500 text-center">
        {ports.length} port{ports.length !== 1 ? 's' : ''} • PortWatch v1.0.0
      </div>
    </div>
  );
}

export default App;
