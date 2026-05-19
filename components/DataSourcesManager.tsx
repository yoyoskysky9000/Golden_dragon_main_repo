import React, { useState } from 'react';
import { Database, Plus, GripVertical, Settings, Trash2, Link, Network, List, Activity } from 'lucide-react';
import { DataSource } from '../types';
import DataSourceGraph from './DataSourceGraph';
import { LiveWebsocketManager } from './LiveWebsocketManager';

interface DataSourcesManagerProps {
  dataSources: DataSource[];
  onAddDataSource: (source: Partial<DataSource>) => void;
  onUpdateDataSource: (source: DataSource) => void;
  onDeleteDataSource: (id: string) => void;
  onReorderDataSources: (sources: DataSource[]) => void;
  onLiveTick?: (updates: Record<string, number>) => void;
}

const DataSourcesManager: React.FC<DataSourcesManagerProps> = ({
  dataSources,
  onAddDataSource,
  onUpdateDataSource,
  onDeleteDataSource,
  onReorderDataSources,
  onLiveTick
}) => {
  const [editingSource, setEditingSource] = useState<Partial<DataSource> | null>(null);
  const [isAddingSource, setIsAddingSource] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'graph' | 'live'>('list');
  const [draggedSourceId, setDraggedSourceId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const hasAddedDefaultRef = React.useRef(false);

  React.useEffect(() => {
    if (!hasAddedDefaultRef.current && dataSources.length > 0) {
      hasAddedDefaultRef.current = true;
      if (!dataSources.some(ds => ds.name === 'News Sentiment')) {
        onAddDataSource({
          name: 'News Sentiment',
          type: 'ai_processed',
          status: 'connected',
          priority: 50,
          dependencies: ['1']
        });
      }
    }
  }, [dataSources, onAddDataSource]);

  const sortedDataSources = [...dataSources].sort((a, b) => (b.priority || 0) - (a.priority || 0));

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedSourceId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedSourceId && draggedSourceId !== id) {
      setDragOverId(id);
    }
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    setDraggedSourceId(null);
    setDragOverId(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDragOverId(null);
    if (!draggedSourceId || draggedSourceId === targetId) return;

    const sourceIndex = sortedDataSources.findIndex(ds => ds.id === draggedSourceId);
    const targetIndex = sortedDataSources.findIndex(ds => ds.id === targetId);

    const newSources = [...sortedDataSources];
    const [removed] = newSources.splice(sourceIndex, 1);
    newSources.splice(targetIndex, 0, removed);

    // Update priorities based on new order
    const updatedSources = newSources.map((ds, index) => ({
      ...ds,
      priority: 100 - Math.floor((index / (newSources.length - 1 || 1)) * 99)
    }));

    onReorderDataSources(updatedSources);
    setDraggedSourceId(null);
  };

  return (
    <div className="flex-1 bg-gray-950 p-6 flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 border border-indigo-500/20">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Data Nexus</h2>
            <p className="text-sm text-gray-500">Manage your real-time data feeds. <span className="text-indigo-400/80 italic">Higher priority sources are favored during signal synthesis.</span></p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="flex bg-gray-900 border border-gray-800 rounded-lg p-1">
            <button 
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-indigo-600/20 text-indigo-400' : 'text-gray-500 hover:text-gray-300'}`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('graph')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'graph' ? 'bg-indigo-600/20 text-indigo-400' : 'text-gray-500 hover:text-gray-300'}`}
              title="Dependency Graph"
            >
              <Network className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('live')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'live' ? 'bg-emerald-600/20 text-emerald-400' : 'text-gray-500 hover:text-gray-300'}`}
              title="Test Live WebSocket Feed"
            >
              <Activity className="w-4 h-4" />
            </button>
          </div>
          <button 
            onClick={() => { setIsAddingSource(true); setEditingSource({ name: '', type: 'external_api', priority: 50 }); }}
            className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all"
          >
            <Link className="w-4 h-4" /> Connect External Source
          </button>
          <button 
            onClick={() => { setIsAddingSource(true); setEditingSource({ name: '', type: 'realtime', priority: 50 }); }}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4" /> Add Source
          </button>
        </div>
      </div>

      {viewMode === 'graph' ? (
        <div className="flex-1 w-full relative">
            <DataSourceGraph dataSources={sortedDataSources} />
        </div>
      ) : viewMode === 'live' ? (
        <div className="flex-1 w-full p-4 overflow-y-auto">
            <LiveWebsocketManager onUpdatePrices={onLiveTick || (() => {})} />
        </div>
      ) : (
      <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedDataSources.map(ds => (
          <div 
            key={ds.id} 
            draggable
            onDragStart={(e) => handleDragStart(e, ds.id)}
            onDragOver={(e) => handleDragOver(e, ds.id)}
            onDragLeave={handleDragLeave}
            onDragEnd={handleDragEnd}
            onDrop={(e) => handleDrop(e, ds.id)}
            className={`bg-gray-900 border rounded-xl p-5 flex flex-col gap-4 cursor-move transition-all relative ${
               draggedSourceId === ds.id ? 'opacity-50 border-indigo-500 shadow-xl shadow-indigo-500/20 z-10' : 
               dragOverId === ds.id ? 'border-amber-500 scale-[1.02] bg-gray-800' : 'border-gray-800 hover:border-gray-700'
            }`}
          >
            {dragOverId === ds.id && (
              <div className="absolute inset-0 border-2 border-dashed border-amber-500 rounded-xl pointer-events-none z-20"></div>
            )}
            <div className="flex justify-between items-start">
              <div className="flex items-start gap-3">
                <div className="mt-1 text-gray-600 cursor-grab active:cursor-grabbing">
                  <GripVertical className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-white leading-tight">{ds.name}</h3>
                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full flex items-center gap-1 ${
                      (ds.effectiveStatus || ds.status) === 'connected' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                      (ds.effectiveStatus || ds.status) === 'error' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                      'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                    }`} title={ds.effectiveStatus !== ds.status ? `Derived from dependencies (Base: ${ds.status})` : `Base Status: ${ds.status}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${(ds.effectiveStatus || ds.status) === 'connected' ? 'bg-emerald-400 animate-pulse' : (ds.effectiveStatus || ds.status) === 'error' ? 'bg-rose-400' : 'bg-amber-500'}`}></div>
                      {ds.effectiveStatus !== ds.status ? `EFFECTIVE: ${ds.effectiveStatus}` : ds.status}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-500 uppercase font-bold">{ds.type}</div>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => { setEditingSource(ds); setIsAddingSource(false); }} className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded transition-colors">
                  <Settings className="w-4 h-4" />
                </button>
                <button onClick={() => onDeleteDataSource(ds.id)} className="p-1.5 text-gray-500 hover:text-rose-500 hover:bg-rose-500/10 rounded transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="bg-gray-950 rounded-lg p-3 border border-gray-800">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] text-gray-500 uppercase font-bold">Global Priority</span>
                <span className="text-xs font-mono text-indigo-400 font-bold">{ds.priority}/100</span>
              </div>
              <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div 
                      className="h-full bg-indigo-500 transition-all duration-500 relative" 
                      style={{ width: `${ds.priority}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite]"></div>
                  </div>
              </div>
              <div className="text-[9px] text-gray-500 mt-2 text-center italic">Drag card to reorder priority</div>
            </div>
            
            {ds.lastData && (
              <div className="bg-black/30 rounded p-3 border border-gray-800">
                <div className="text-[9px] text-gray-500 uppercase font-bold mb-1">Live Sample</div>
                <div className="text-xs text-indigo-300 font-mono truncate">{ds.lastData}</div>
              </div>
            )}

            {ds.dependencies && ds.dependencies.length > 0 && (
              <div className="flex flex-wrap gap-1 items-center">
                <Link className="w-3 h-3 text-indigo-400" />
                <span className="text-[9px] text-gray-500 uppercase font-bold mr-1">Depends on:</span>
                {ds.dependencies.map(depId => {
                  const dep = dataSources.find(s => s.id === depId);
                  return dep ? (
                    <span key={depId} className="text-[9px] bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/20">
                      {dep.name}
                    </span>
                  ) : null;
                })}
              </div>
            )}
          </div>
        ))}
      </div>
      )}

      {editingSource && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-6">{isAddingSource ? 'Add New Data Source' : 'Edit Data Source'}</h3>
            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-xs text-gray-500 uppercase font-bold mb-1">Source Name</label>
                <input 
                  type="text" 
                  value={editingSource.name} 
                  onChange={e => setEditingSource({...editingSource, name: e.target.value})}
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-white focus:border-indigo-500 outline-none"
                  placeholder="e.g. Twitter Sentiment"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase font-bold mb-1">Feed Type</label>
                <select 
                  value={editingSource.type} 
                  onChange={e => setEditingSource({...editingSource, type: e.target.value as any})}
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-white focus:border-indigo-500 outline-none"
                >
                  <option value="realtime">Real-time Price</option>
                  <option value="computed">Technical Indicator</option>
                  <option value="ai_processed">AI Processed</option>
                  <option value="external_api">External API</option>
                  <option value="live_feed">Live Data Feed</option>
                </select>
              </div>

              {editingSource.type === 'realtime' && (
                <div>
                  <label className="block text-xs text-gray-500 uppercase font-bold mb-1">WebSocket URL</label>
                  <input
                    type="text"
                    value={editingSource.config?.wsUrl || ''}
                    onChange={e => setEditingSource({...editingSource, config: { ...editingSource.config, wsUrl: e.target.value }})}
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-white focus:border-indigo-500 outline-none font-mono text-sm"
                    placeholder="wss://stream.binance.com:9443/ws/!ticker@arr"
                  />
                  <p className="text-[9px] text-gray-600 mt-1">Connect directly via WebSocket instead of HTTP polling.</p>
                </div>
              )}

              <div>
                <label className="block text-xs text-gray-500 uppercase font-bold mb-1">Priority (1-100)</label>
                <input 
                  type="number" 
                  min="1"
                  max="100"
                  value={editingSource.priority || 50} 
                  onChange={e => setEditingSource({...editingSource, priority: parseInt(e.target.value)})}
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-white focus:border-indigo-500 outline-none"
                />
                <p className="text-[9px] text-gray-600 mt-1">Higher priority sources are favored during discrepancies.</p>
              </div>

              <div>
                <label className="block text-xs text-gray-500 uppercase font-bold mb-1">Base Status (Simulate Issues)</label>
                <select 
                  value={editingSource.status || 'connected'} 
                  onChange={e => setEditingSource({...editingSource, status: e.target.value as any})}
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-white focus:border-indigo-500 outline-none"
                >
                  <option value="connected">Connected (Normal)</option>
                  <option value="disconnected">Disconnected (Delay)</option>
                  <option value="error">Error (Broken)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-500 uppercase font-bold mb-2">Dependencies</label>
                <div className="max-h-32 overflow-y-auto bg-gray-950 border border-gray-700 rounded-lg p-2 space-y-1">
                  {dataSources
                    .filter(ds => ds.id !== editingSource.id)
                    .map(ds => {
                      const isChecked = editingSource.dependencies?.includes(ds.id);
                      return (
                        <div key={ds.id} className="flex items-center gap-2 px-2 py-1 hover:bg-gray-800 rounded transition-colors cursor-pointer" 
                             onClick={() => {
                               const currentDeps = editingSource.dependencies || [];
                               const newDeps = isChecked 
                                 ? currentDeps.filter(id => id !== ds.id)
                                 : [...currentDeps, ds.id];
                               setEditingSource({...editingSource, dependencies: newDeps});
                             }}>
                          <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isChecked ? 'bg-indigo-600 border-indigo-600' : 'border-gray-600'}`}>
                            {isChecked && <div className="w-2 h-2 bg-white rounded-full"></div>}
                          </div>
                          <span className="text-xs text-gray-300">{ds.name}</span>
                        </div>
                      );
                    })
                  }
                  {dataSources.length <= 1 && (
                    <div className="text-[10px] text-gray-600 p-2 italic text-center">No other data sources available.</div>
                  )}
                </div>
                <p className="text-[9px] text-gray-600 mt-1">Select data sources required for this feed's signal synthesis.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setEditingSource(null)} className="flex-1 py-3 text-gray-400 hover:text-white font-bold">Cancel</button>
              <button 
                onClick={() => {
                  if (isAddingSource) onAddDataSource(editingSource);
                  else onUpdateDataSource(editingSource as DataSource);
                  setEditingSource(null);
                }}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-900/20"
              >
                {isAddingSource ? 'Connect Source' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataSourcesManager;
