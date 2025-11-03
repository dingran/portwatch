import { useState, useEffect } from 'react';
import { PortInfo } from '@portwatch/core';

function App() {
  const [ports, setPorts] = useState<PortInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch ports
  const fetchPorts = async () => {
    setLoading(true);
    try {
      const result = await window.portwatchAPI.scanPorts();
      if (result.success && result.data) {
        setPorts(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch ports:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and auto-refresh
  useEffect(() => {
    fetchPorts();

    if (autoRefresh) {
      const interval = setInterval(fetchPorts, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  // Filter ports
  const filteredPorts = ports.filter(
    (port) =>
      port.port.toString().includes(filter) ||
      port.processName.toLowerCase().includes(filter.toLowerCase()) ||
      port.workingDirectory.toLowerCase().includes(filter.toLowerCase())
  );

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
            >
              Auto
            </button>
          </div>
        </div>
        <input
          type="text"
          placeholder="Filter by port, name, or directory..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Port List */}
      <div className="flex-1 overflow-y-auto">
        {filteredPorts.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            {loading ? 'Loading...' : 'No ports found'}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredPorts.map((port, index) => (
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
                      {port.workingDirectory.replace(process.env.HOME || '', '~')}
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
        {filteredPorts.length} port{filteredPorts.length !== 1 ? 's' : ''} • PortWatch v1.0.0
      </div>
    </div>
  );
}

export default App;
