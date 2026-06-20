import { useEffect, useMemo, useRef, useState } from 'react';
import { FilterOptions, FilterPreset, PortInfo } from '@portwatch/core';

type SearchMode = 'substring' | 'prefix';
type ToastTone = 'success' | 'error' | 'info';

interface Toast {
  message: string;
  tone: ToastTone;
}

interface PendingKill {
  port: PortInfo;
  force: boolean;
}

interface IconProps {
  name: 'filter' | 'refresh' | 'pause' | 'play' | 'x' | 'save' | 'trash' | 'zap' | 'terminal' | 'shield';
  className?: string;
}

const BUILT_IN_PRESETS = new Set(['web-dev', 'vite', 'postgres']);

function Icon({ name, className = 'h-4 w-4' }: IconProps) {
  const paths: Record<IconProps['name'], JSX.Element> = {
    filter: (
      <>
        <path d="M3 5h18" />
        <path d="M7 12h10" />
        <path d="M10 19h4" />
      </>
    ),
    refresh: (
      <>
        <path d="M21 12a9 9 0 0 1-15.3 6.4" />
        <path d="M3 12A9 9 0 0 1 18.3 5.6" />
        <path d="M18 2v4h-4" />
        <path d="M6 22v-4h4" />
      </>
    ),
    pause: (
      <>
        <path d="M8 5v14" />
        <path d="M16 5v14" />
      </>
    ),
    play: <path d="m8 5 11 7-11 7Z" />,
    x: (
      <>
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </>
    ),
    save: (
      <>
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
        <path d="M17 21v-8H7v8" />
        <path d="M7 3v5h8" />
      </>
    ),
    trash: (
      <>
        <path d="M3 6h18" />
        <path d="M8 6V4h8v2" />
        <path d="M19 6 18 20H6L5 6" />
        <path d="M10 11v5" />
        <path d="M14 11v5" />
      </>
    ),
    zap: (
      <>
        <path d="M13 2 4 14h7l-1 8 10-13h-7l0-7Z" />
      </>
    ),
    terminal: (
      <>
        <path d="m4 17 6-6-6-6" />
        <path d="M12 19h8" />
      </>
    ),
    shield: (
      <>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
        <path d="m9 12 2 2 4-5" />
      </>
    ),
  };

  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

function formatPath(path: string) {
  return path.replace(/^\/Users\/[^/]+/, '~');
}

function describeFilters(filters: FilterOptions) {
  const parts: string[] = [];
  if (filters.port !== undefined) parts.push(`:${filters.port}`);
  if (filters.portRange) parts.push(`${filters.portRange.min}-${filters.portRange.max}`);
  if (filters.processPrefix) parts.push(`${filters.processPrefix}*`);
  if (filters.processName) parts.push(filters.processName);
  return parts.length > 0 ? parts.join(' / ') : 'All ports';
}

function buildFilters(
  searchText: string,
  searchMode: SearchMode,
  portRangeMin: string,
  portRangeMax: string,
  activePresetId: string | null,
  presets: FilterPreset[],
): FilterOptions {
  if (activePresetId) {
    const preset = presets.find((item) => item.id === activePresetId);
    if (preset) return preset.filters;
  }

  const filters: FilterOptions = {};

  if (portRangeMin && portRangeMax) {
    const min = parseInt(portRangeMin, 10);
    const max = parseInt(portRangeMax, 10);
    if (!Number.isNaN(min) && !Number.isNaN(max) && min <= max) {
      filters.portRange = { min, max };
    }
  }

  if (searchText.trim()) {
    if (searchMode === 'prefix') {
      filters.processPrefix = searchText.trim();
    } else {
      filters.processName = searchText.trim();
    }
  }

  return filters;
}

function App() {
  const [ports, setPorts] = useState<PortInfo[]>([]);
  const [cachedAllPorts, setCachedAllPorts] = useState<PortInfo[]>([]);
  const [presetResultsCache, setPresetResultsCache] = useState<Record<string, PortInfo[]>>({});
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [portRangeMin, setPortRangeMin] = useState('');
  const [portRangeMax, setPortRangeMax] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('substring');
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [isApplyingPreset, setIsApplyingPreset] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [presetDialogOpen, setPresetDialogOpen] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [presetDescription, setPresetDescription] = useState('');
  const [pendingKill, setPendingKill] = useState<PendingKill | null>(null);
  const latestFetchId = useRef(0);

  const activeFilters = useMemo(
    () => buildFilters(searchText, searchMode, portRangeMin, portRangeMax, activePresetId, presets),
    [searchText, searchMode, portRangeMin, portRangeMax, activePresetId, presets],
  );

  const hasFilters = Object.keys(activeFilters).length > 0;
  const activePreset = activePresetId ? presets.find((preset) => preset.id === activePresetId) : null;
  const portsByProcess = new Set(ports.map((port) => port.processName)).size;
  const portRangeError = portRangeMin && portRangeMax && parseInt(portRangeMin, 10) > parseInt(portRangeMax, 10);

  const showToast = (message: string, tone: ToastTone = 'info') => {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), 3200);
  };

  const filterPortsLocally = (allPorts: PortInfo[], filters: FilterOptions): PortInfo[] => {
    return allPorts.filter((port) => {
      if (filters.portRange) {
        const { min, max } = filters.portRange;
        if (port.port < min || port.port > max) return false;
      }

      if (filters.port !== undefined && port.port !== filters.port) return false;

      if (filters.processPrefix) {
        if (!port.processName.toLowerCase().startsWith(filters.processPrefix.toLowerCase())) return false;
      } else if (filters.processName) {
        if (!port.processName.toLowerCase().includes(filters.processName.toLowerCase())) return false;
      }

      return true;
    });
  };

  const fetchPorts = async (explicitFilters?: FilterOptions, cachePresetId?: string) => {
    const fetchId = ++latestFetchId.current;
    const filters = explicitFilters ?? activeFilters;

    setLoading(true);
    try {
      const result = await window.portwatchAPI.scanPorts(filters);

      if (fetchId !== latestFetchId.current) return;

      if (result.success && result.data) {
        setPorts(result.data);

        if (Object.keys(filters).length === 0) {
          setCachedAllPorts(result.data);
        }

        if (cachePresetId) {
          setPresetResultsCache((prev) => ({ ...prev, [cachePresetId]: result.data! }));
        }
      } else {
        setPorts([]);
        showToast(result.error || 'Port scan failed', 'error');
      }
    } catch (error) {
      if (fetchId === latestFetchId.current) {
        setPorts([]);
        showToast(error instanceof Error ? error.message : 'Port scan failed', 'error');
      }
    } finally {
      if (fetchId === latestFetchId.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const loadPresets = async () => {
      const result = await window.portwatchAPI.loadConfig();
      if (result.success && result.data?.presets) {
        setPresets(result.data.presets);
      }
    };

    loadPresets();
  }, []);

  useEffect(() => {
    if (isApplyingPreset) return;

    fetchPorts(activeFilters);

    if (!autoRefresh) return;

    const interval = setInterval(async () => {
      const result = await window.portwatchAPI.scanPorts({});
      if (!result.success || !result.data) return;

      setCachedAllPorts(result.data);
      const filtered = filterPortsLocally(result.data, activeFilters);
      setPorts(filtered);

      if (activePresetId) {
        setPresetResultsCache((prev) => ({ ...prev, [activePresetId]: filtered }));
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [autoRefresh, activeFilters, activePresetId, isApplyingPreset]);

  const applyPreset = async (preset: FilterPreset) => {
    setIsApplyingPreset(true);

    if (activePresetId === preset.id) {
      setSearchText('');
      setPortRangeMin('');
      setPortRangeMax('');
      setActivePresetId(null);
      if (cachedAllPorts.length > 0) setPorts(cachedAllPorts);
      await fetchPorts({});
      setIsApplyingPreset(false);
      return;
    }

    if (presetResultsCache[preset.id] !== undefined) {
      setPorts(presetResultsCache[preset.id]);
    } else {
      setPorts([]);
    }

    setActivePresetId(preset.id);
    setSearchText('');
    setPortRangeMin('');
    setPortRangeMax('');

    if (preset.filters.portRange) {
      setPortRangeMin(preset.filters.portRange.min.toString());
      setPortRangeMax(preset.filters.portRange.max.toString());
    }

    if (preset.filters.port !== undefined) {
      setPortRangeMin(preset.filters.port.toString());
      setPortRangeMax(preset.filters.port.toString());
    }

    if (preset.filters.processPrefix) {
      setSearchText(preset.filters.processPrefix);
      setSearchMode('prefix');
    } else if (preset.filters.processName) {
      setSearchText(preset.filters.processName);
      setSearchMode('substring');
    }

    await fetchPorts(preset.filters, preset.id);
    setIsApplyingPreset(false);
  };

  const clearFilters = () => {
    setSearchText('');
    setPortRangeMin('');
    setPortRangeMax('');
    setActivePresetId(null);
    if (cachedAllPorts.length > 0) setPorts(cachedAllPorts);
  };

  const saveCurrentAsPreset = async () => {
    const name = presetName.trim();
    if (!name) return;

    const newPreset: FilterPreset = {
      id: `custom-${Date.now()}`,
      name,
      description: presetDescription.trim() || undefined,
      filters: activeFilters,
    };

    const updatedPresets = [...presets, newPreset];
    setPresets(updatedPresets);

    const configResult = await window.portwatchAPI.loadConfig();
    if (configResult.success && configResult.data) {
      await window.portwatchAPI.saveConfig({ ...configResult.data, presets: updatedPresets });
    }

    setPresetName('');
    setPresetDescription('');
    setPresetDialogOpen(false);
    showToast(`Saved "${name}"`, 'success');
  };

  const deletePreset = async (presetId: string) => {
    const updatedPresets = presets.filter((preset) => preset.id !== presetId);
    setPresets(updatedPresets);

    const configResult = await window.portwatchAPI.loadConfig();
    if (configResult.success && configResult.data) {
      await window.portwatchAPI.saveConfig({ ...configResult.data, presets: updatedPresets });
    }

    if (activePresetId === presetId) setActivePresetId(null);
    showToast('Preset deleted', 'info');
  };

  const confirmKill = async () => {
    if (!pendingKill) return;

    const { port, force } = pendingKill;
    setPendingKill(null);
    setPorts((current) => current.filter((item) => item.port !== port.port));

    const result = await window.portwatchAPI.killByPort(port.port, force);
    if (result.success) {
      showToast(`${force ? 'Force stopped' : 'Stopped'} ${port.processName} on :${port.port}`, 'success');
      await new Promise((resolve) => setTimeout(resolve, force ? 300 : 500));
      await fetchPorts();
    } else {
      showToast(result.message || 'Process action failed', 'error');
      await fetchPorts();
    }
  };

  return (
    <div className="app-shell">
      <header className="toolbar">
        <div className="toolbar-top">
          <div>
            <div className="eyebrow">Menu bar monitor</div>
            <h1>PortWatch</h1>
          </div>
          <div className="toolbar-actions">
            <button
              className={`icon-button ${showFilters ? 'is-active' : ''}`}
              onClick={() => setShowFilters((value) => !value)}
              title="Filters"
              aria-label="Filters"
            >
              <Icon name="filter" />
            </button>
            <button
              className="icon-button"
              onClick={() => fetchPorts()}
              disabled={loading}
              title="Refresh"
              aria-label="Refresh"
            >
              <Icon name="refresh" className={`h-4 w-4 ${loading ? 'spin' : ''}`} />
            </button>
            <button
              className={`auto-button ${autoRefresh ? 'is-on' : ''}`}
              onClick={() => setAutoRefresh((value) => !value)}
              title="Auto-refresh"
              aria-label="Auto-refresh"
            >
              <Icon name={autoRefresh ? 'pause' : 'play'} />
              <span>{autoRefresh ? 'Live' : 'Paused'}</span>
            </button>
          </div>
        </div>

        <div className="stats-strip">
          <div>
            <strong>{ports.length}</strong>
            <span>ports</span>
          </div>
          <div>
            <strong>{portsByProcess}</strong>
            <span>processes</span>
          </div>
          <div>
            <strong>{activePreset?.name || (hasFilters ? 'Custom' : 'All')}</strong>
            <span>{describeFilters(activeFilters)}</span>
          </div>
        </div>

        <div className="search-row">
          <div className="search-box">
            <Icon name="terminal" className="h-4 w-4" />
            <input
              type="text"
              placeholder={`Search process ${searchMode === 'prefix' ? 'prefix' : 'name'}`}
              value={searchText}
              onChange={(event) => {
                setActivePresetId(null);
                setSearchText(event.target.value);
              }}
            />
          </div>
          <div className="segmented" aria-label="Search mode">
            <button className={searchMode === 'substring' ? 'is-selected' : ''} onClick={() => setSearchMode('substring')}>
              Contains
            </button>
            <button className={searchMode === 'prefix' ? 'is-selected' : ''} onClick={() => setSearchMode('prefix')}>
              Prefix
            </button>
          </div>
        </div>

        {showFilters && (
          <section className="filter-panel" aria-label="Advanced filters">
            <div className="range-row">
              <label>
                <span>Min port</span>
                <input
                  type="number"
                  placeholder="3000"
                  value={portRangeMin}
                  onChange={(event) => {
                    setActivePresetId(null);
                    setPortRangeMin(event.target.value);
                  }}
                  min="0"
                  max="65535"
                />
              </label>
              <label>
                <span>Max port</span>
                <input
                  type="number"
                  placeholder="9000"
                  value={portRangeMax}
                  onChange={(event) => {
                    setActivePresetId(null);
                    setPortRangeMax(event.target.value);
                  }}
                  min="0"
                  max="65535"
                />
              </label>
              {(portRangeMin || portRangeMax) && (
                <button
                  className="icon-button quiet"
                  onClick={() => {
                    setPortRangeMin('');
                    setPortRangeMax('');
                    setActivePresetId(null);
                  }}
                  title="Clear port range"
                  aria-label="Clear port range"
                >
                  <Icon name="x" />
                </button>
              )}
            </div>
            {portRangeError && <div className="field-error">Min port must be lower than max port.</div>}
          </section>
        )}

        {presets.length > 0 && (
          <div className="preset-row" aria-label="Presets">
            {presets.map((preset) => (
              <div className="preset-chip" key={preset.id}>
                <button
                  className={activePresetId === preset.id ? 'is-selected' : ''}
                  onClick={() => applyPreset(preset)}
                  title={preset.description}
                >
                  {preset.name}
                </button>
                {!BUILT_IN_PRESETS.has(preset.id) && (
                  <button className="preset-delete" onClick={() => deletePreset(preset.id)} title="Delete preset" aria-label={`Delete ${preset.name}`}>
                    <Icon name="x" className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
            {hasFilters && !activePresetId && (
              <button className="preset-action" onClick={() => setPresetDialogOpen(true)} title="Save current filters">
                <Icon name="save" className="h-3.5 w-3.5" />
                Save
              </button>
            )}
            {hasFilters && (
              <button className="preset-action muted" onClick={clearFilters}>
                Clear
              </button>
            )}
          </div>
        )}
      </header>

      <main className="port-list">
        {ports.length === 0 ? (
          <div className="empty-state">
            <Icon name={loading ? 'refresh' : 'shield'} className={`h-7 w-7 ${loading ? 'spin' : ''}`} />
            <strong>{loading ? 'Scanning ports' : 'No listening ports found'}</strong>
            <span>{hasFilters ? 'Try clearing filters or broadening the port range.' : 'Everything is quiet right now.'}</span>
          </div>
        ) : (
          ports.map((port, index) => (
            <article className="port-row" key={`${port.pid}-${port.port}-${index}`}>
              <div className="port-badge">:{port.port}</div>
              <div className="port-main">
                <div className="port-title">
                  <strong>{port.processName}</strong>
                  <span>PID {port.pid}</span>
                </div>
                <div className="port-meta">
                  <span>{port.protocol || 'TCP'}</span>
                  <span>{port.address || '*'}</span>
                  <span title={port.workingDirectory}>{formatPath(port.workingDirectory)}</span>
                </div>
              </div>
              <div className="row-actions">
                <button className="danger-button soft" onClick={() => setPendingKill({ port, force: false })}>
                  Stop
                </button>
                <button className="icon-button danger" onClick={() => setPendingKill({ port, force: true })} title="Force stop" aria-label={`Force stop ${port.processName}`}>
                  <Icon name="zap" />
                </button>
              </div>
            </article>
          ))
        )}
      </main>

      <footer className="status-bar">
        <span>{ports.length} port{ports.length === 1 ? '' : 's'} - {loading ? 'Refreshing...' : autoRefresh ? 'Live refresh every 5s' : 'Manual refresh'}</span>
        <span>PortWatch v1.1.0</span>
      </footer>

      {presetDialogOpen && (
        <div className="dialog-backdrop" role="presentation">
          <form
            className="dialog"
            onSubmit={(event) => {
              event.preventDefault();
              saveCurrentAsPreset();
            }}
          >
            <h2>Save Preset</h2>
            <p>{describeFilters(activeFilters)}</p>
            <label>
              <span>Name</span>
              <input value={presetName} onChange={(event) => setPresetName(event.target.value)} autoFocus />
            </label>
            <label>
              <span>Description</span>
              <input value={presetDescription} onChange={(event) => setPresetDescription(event.target.value)} />
            </label>
            <div className="dialog-actions">
              <button type="button" className="secondary-button" onClick={() => setPresetDialogOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="primary-button" disabled={!presetName.trim()}>
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      {pendingKill && (
        <div className="dialog-backdrop" role="presentation">
          <div className="dialog">
            <h2>{pendingKill.force ? 'Force Stop Process?' : 'Stop Process?'}</h2>
            <p>
              {pendingKill.port.processName} on :{pendingKill.port.port} will receive {pendingKill.force ? 'SIGKILL immediately.' : 'SIGTERM and can clean up.'}
            </p>
            <div className="dialog-actions">
              <button type="button" className="secondary-button" onClick={() => setPendingKill(null)}>
                Cancel
              </button>
              <button type="button" className="danger-button" onClick={confirmKill}>
                {pendingKill.force ? 'Force Stop' : 'Stop'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`toast ${toast.tone}`}>{toast.message}</div>}
    </div>
  );
}

export default App;
