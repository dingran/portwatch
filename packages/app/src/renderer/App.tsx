import { useState, useEffect, useRef } from 'react';
import { PortInfo, FilterOptions, FilterPreset } from '@portwatch/core';

function App() {
  const [ports, setPorts] = useState<PortInfo[]>([]);
  const [cachedAllPorts, setCachedAllPorts] = useState<PortInfo[]>([]); // Cache for instant filtering
  const [presetResultsCache, setPresetResultsCache] = useState<Record<string, PortInfo[]>>({}); // Cache results per preset
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
  const [activeFilters, setActiveFilters] = useState<FilterOptions>({});
  const [isApplyingPreset, setIsApplyingPreset] = useState(false);

  // Fetch ID tracking to prevent race conditions
  const latestFetchId = useRef(0);

  // Client-side filtering for instant results
  const filterPortsLocally = (allPorts: PortInfo[], filters: FilterOptions): PortInfo[] => {
    return allPorts.filter(port => {
      // Port range filter
      if (filters.portRange) {
        const { min, max } = filters.portRange;
        if (port.port < min || port.port > max) return false;
      }

      // Exact port filter
      if (filters.port !== undefined && port.port !== filters.port) {
        return false;
      }

      // Process name filters
      if (filters.processPrefix) {
        if (!port.processName.toLowerCase().startsWith(filters.processPrefix.toLowerCase())) {
          return false;
        }
      } else if (filters.processName) {
        if (!port.processName.toLowerCase().includes(filters.processName.toLowerCase())) {
          return false;
        }
      }

      return true;
    });
  };

  // Get current active filters - single source of truth
  const getCurrentFilters = (): FilterOptions => {
    // If preset is active, return preset filters directly
    if (activePresetId && presets.length > 0) {
      const preset = presets.find(p => p.id === activePresetId);
      if (preset) {
        return preset.filters;
      }
    }

    // Otherwise build from state
    const filters: FilterOptions = {};

    if (portRangeMin && portRangeMax) {
      const min = parseInt(portRangeMin, 10);
      const max = parseInt(portRangeMax, 10);
      if (!isNaN(min) && !isNaN(max) && min <= max) {
        filters.portRange = { min, max };
      }
    }

    if (searchText) {
      if (searchMode === 'prefix') {
        filters.processPrefix = searchText;
      } else {
        filters.processName = searchText;
      }
    }

    return filters;
  };

  // Fetch ports with filters (can pass explicit filters or use state)
  const fetchPorts = async (explicitFilters?: FilterOptions, cachePresetId?: string) => {
    // Track this fetch with an ID to prevent race conditions
    const fetchId = ++latestFetchId.current;

    setLoading(true);
    try {
      let filters: FilterOptions = {};

      if (explicitFilters !== undefined) {
        // Use explicitly passed filters
        filters = explicitFilters;
      } else {
        // Build filters from state
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
      }

      const result = await window.portwatchAPI.scanPorts(filters);

      // Only update UI if this is still the latest fetch
      if (fetchId === latestFetchId.current) {
        if (result.success && result.data) {
          setPorts(result.data);

          // Update cache when fetching all ports (no filters)
          if (Object.keys(filters).length === 0) {
            setCachedAllPorts(result.data);
          }

          // Update preset cache if this was a preset fetch
          if (cachePresetId) {
            setPresetResultsCache(prev => ({
              ...prev,
              [cachePresetId]: result.data!
            }));
          }
        } else {
          console.error('Failed to fetch ports:', result.message || 'Unknown error');
          setPorts([]); // Set empty array on error so UI updates
        }
      }
    } catch (error) {
      console.error('Failed to fetch ports:', error);
      // Only update on error if this is still the latest fetch
      if (fetchId === latestFetchId.current) {
        setPorts([]); // Set empty array on error so UI updates
      }
    } finally {
      // Only clear loading if this is still the latest fetch
      if (fetchId === latestFetchId.current) {
        setLoading(false);
      }
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
    // Skip if we're in the middle of applying a preset
    if (isApplyingPreset) {
      return;
    }

    // Get current filters (single source of truth)
    const currentFilters = getCurrentFilters();

    // Update activeFilters if not already set by applyPreset
    if (!activePresetId) {
      setActiveFilters(currentFilters);
    }

    // Fetch with current filters
    fetchPorts(currentFilters);

    if (autoRefresh) {
      const interval = setInterval(async () => {
        // Fetch ALL ports (no filters) to keep cache fresh
        const result = await window.portwatchAPI.scanPorts({});

        if (result.success && result.data) {
          // Update cache with all ports
          setCachedAllPorts(result.data);

          // Apply current filters client-side for instant update
          const filters = getCurrentFilters();
          const filtered = filterPortsLocally(result.data, filters);
          setPorts(filtered);

          // Update preset cache if a preset is active
          if (activePresetId) {
            setPresetResultsCache(prev => ({
              ...prev,
              [activePresetId]: filtered
            }));
          }
        }
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, searchText, portRangeMin, portRangeMax, searchMode, activePresetId, isApplyingPreset]);

  // Apply a preset (or toggle it off if already active)
  const applyPreset = async (preset: FilterPreset) => {
    // Prevent useEffect from firing during preset application
    setIsApplyingPreset(true);

    // If clicking the same preset, toggle it off
    if (activePresetId === preset.id) {
      // Show cached all ports instantly
      if (cachedAllPorts.length > 0) {
        setPorts(cachedAllPorts);
      }

      // Clear state
      setSearchText('');
      setPortRangeMin('');
      setPortRangeMax('');
      setActivePresetId(null);
      setActiveFilters({});

      // Fetch fresh all ports
      await fetchPorts({});
      setIsApplyingPreset(false);
      return;
    }

    const { filters } = preset;

    // INSTANT: Show cached results for this preset if available
    if (presetResultsCache[preset.id] !== undefined) {
      setPorts(presetResultsCache[preset.id]);
    } else {
      // No cache for this preset yet, clear display
      setPorts([]);
    }

    // Update activeFilters and activePresetId FIRST (single source of truth)
    setActiveFilters(filters);
    setActivePresetId(preset.id);

    // Then update UI state to match (for display purposes only)
    setSearchText('');
    setPortRangeMin('');
    setPortRangeMax('');

    // Apply port range to UI
    if (filters.portRange) {
      setPortRangeMin(filters.portRange.min.toString());
      setPortRangeMax(filters.portRange.max.toString());
    }

    // Apply exact port to UI
    if (filters.port !== undefined) {
      setPortRangeMin(filters.port.toString());
      setPortRangeMax(filters.port.toString());
    }

    // Apply process filter to UI
    if (filters.processPrefix) {
      setSearchText(filters.processPrefix);
      setSearchMode('prefix');
    } else if (filters.processName) {
      setSearchText(filters.processName);
      setSearchMode('substring');
    }

    // Fetch with preset filters and cache the results
    await fetchPorts(filters, preset.id);

    setIsApplyingPreset(false);
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
  const clearFilters = () => {
    setSearchText('');
    setPortRangeMin('');
    setPortRangeMax('');
    setActivePresetId(null);
    setActiveFilters({});

    // Show cached all ports instantly
    if (cachedAllPorts.length > 0) {
      setPorts(cachedAllPorts);
    }

    // useEffect will handle fetching with empty filters
  };

  // Kill process (graceful SIGTERM)
  const handleKill = async (port: number, force: boolean = false) => {
    const action = force ? 'Force kill' : 'Kill';
    if (confirm(`${action} process on port ${port}?${force ? '\n\n(Force kill will not allow the process to clean up gracefully)' : ''}`)) {
      // Optimistically remove from UI for instant feedback
      setPorts(prevPorts => prevPorts.filter(p => p.port !== port));

      const result = await window.portwatchAPI.killByPort(port, force);

      if (result.success) {
        // Wait for process to die
        await new Promise(resolve => setTimeout(resolve, force ? 300 : 500));
        // Refresh to verify
        await fetchPorts();
      } else {
        // Kill failed, restore UI
        alert(`Failed to ${action.toLowerCase()} process: ${result.message}`);
        await fetchPorts();
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
          <div className="mb-2">
            <div className="text-xs text-gray-600 font-medium mb-1.5">Presets</div>
            <div className="flex flex-wrap gap-2">
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
              {(portRangeMin || portRangeMax || searchText) && !activePresetId && (
                <button
                  onClick={saveCurrentAsPreset}
                  className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-full hover:bg-green-200 whitespace-nowrap"
                  title="Save current filters as preset"
                >
                  + Create Preset
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
                      setActivePresetId(null);
                      // useEffect will handle refetching with remaining filters
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
                  <div className="ml-2 flex gap-1">
                    <button
                      onClick={() => handleKill(port.port, false)}
                      className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Kill process (SIGTERM - allows cleanup)"
                    >
                      Kill
                    </button>
                    <button
                      onClick={() => handleKill(port.port, true)}
                      className="px-2 py-1 text-xs text-red-700 bg-red-50 hover:bg-red-100 rounded transition-colors font-semibold"
                      title="Force kill process (SIGKILL - immediate)"
                    >
                      Force
                    </button>
                  </div>
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
