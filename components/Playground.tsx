import React, { useState, useEffect } from 'react';
import { SignalLog, TradingBot, DataSource, StockData } from '../types';
import { Terminal, Database, Activity, TrendingUp, TrendingDown, Filter, Trash2, RefreshCcw, Zap, ShieldCheck, ShieldAlert, BarChart2 } from 'lucide-react';

interface PlaygroundProps {
  bots: TradingBot[];
  dataSources: DataSource[];
  stocks: StockData[];
}

const Playground: React.FC<PlaygroundProps> = ({ bots, dataSources, stocks }) => {
  const [logs, setLogs] = useState<SignalLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterBot, setFilterBot] = useState<string>('all');

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/logs');
      const data = await response.json();
      setLogs(data.reverse()); // Newest first
    } catch (e) {
      console.error("Failed to fetch logs", e);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  const filteredLogs = filterBot === 'all' ? logs : logs.filter(l => l.botId === filterBot);

  return (
    <div className="flex-1 bg-gray-950 p-6 flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Database className="w-6 h-6 text-indigo-500" />
            AI Training Playground
          </h2>
          <p className="text-sm text-gray-500">Real-time signal logging and strategy optimization</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchLogs}
            className="p-2 text-gray-400 hover:text-white bg-gray-900 border border-gray-800 rounded-lg transition-colors"
          >
            <RefreshCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <select 
            value={filterBot}
            onChange={(e) => setFilterBot(e.target.value)}
            className="bg-gray-900 border border-gray-800 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Bots</option>
            {bots.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      </div>

      {/* New Top Market Ticker Section */}
      <div className="flex gap-4 overflow-x-auto pb-4 mb-2 custom-scrollbar no-scrollbar">
        {stocks.map(stock => (
          <div key={`${stock.symbol}-ticker`} className="flex-none bg-gray-900/40 border border-white/5 rounded-2xl p-4 min-w-[200px] hover:border-indigo-500/30 transition-all group">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center font-bold text-xs text-indigo-400">
                  {stock.symbol.substring(0, 2)}
                </div>
                <span className="font-bold text-sm text-white">{stock.symbol}</span>
              </div>
              <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${stock.change >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                {stock.change >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
              </div>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <div className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-0.5">Price</div>
                <div className="text-lg font-bold font-mono text-white">${stock.price.toLocaleString()}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-0.5">Vol</div>
                <div className="text-xs font-mono font-bold text-gray-400">{(stock.volume / 1000000).toFixed(1)}M</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 overflow-hidden">
        {/* Data Sources Panel */}
        <div className="lg:col-span-3 flex flex-col gap-4 overflow-y-auto pr-2">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
            <Zap className="w-3 h-3" /> Active Signal Sources
          </h3>
          {dataSources.map(ds => (
            <div key={ds.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${(ds.effectiveStatus || ds.status) === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
                  <div>
                    <div className="text-sm font-bold text-white">{ds.name}</div>
                    <div className="text-[10px] text-gray-500 uppercase">{ds.type}</div>
                  </div>
                </div>
                <div className="text-[10px] font-bold text-gray-600">v1.0</div>
              </div>
              {ds.lastData && (
                <div className="bg-black/30 rounded p-2 border border-gray-800">
                  <div className="text-[9px] text-gray-500 uppercase font-bold mb-1">Live Feed</div>
                  <div className="text-[10px] text-indigo-300 font-mono truncate">{ds.lastData}</div>
                </div>
              )}
            </div>
          ))}
          
          <div className="mt-4 p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-xl">
            <h4 className="text-sm font-bold text-indigo-400 mb-2">Optimization Engine</h4>
            <p className="text-xs text-gray-500 leading-relaxed mb-4">
              AI is currently analyzing signal accuracy vs market outcome. 
              {bots.filter(b => b.lastOptimizedAt).length} bots have been autonomously optimized.
            </p>
            <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-indigo-500 h-full" style={{ width: `${(bots.filter(b => b.lastOptimizedAt).length / Math.max(1, bots.length)) * 100}%` }}></div>
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-[10px] text-gray-600">Optimization Coverage</span>
              <span className="text-[10px] text-indigo-400 font-bold">
                {Math.round((bots.filter(b => b.lastOptimizedAt).length / Math.max(1, bots.length)) * 100)}%
              </span>
            </div>
          </div>
        </div>

        {/* Logs Terminal */}
        <div className="lg:col-span-6 bg-gray-900 border border-gray-800 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
          <div className="bg-gray-850 px-4 py-3 border-b border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-mono font-bold text-gray-300 uppercase tracking-widest">Signal_Log_Stream</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <span className="text-[10px] text-gray-500 font-bold">LIVE FEED</span>
              </div>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-2">
            {filteredLogs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-600 italic">
                <Activity className="w-8 h-8 mb-2 opacity-20" />
                Waiting for signals...
              </div>
            ) : (
              filteredLogs.map(log => (
                <div key={log.id} className="group border-b border-gray-800/50 pb-2 hover:bg-white/5 transition-colors p-2 rounded">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                      <span className="text-indigo-400 font-bold">{log.symbol}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        log.signal === 'buy' ? 'bg-emerald-500/20 text-emerald-400' : 
                        log.signal === 'sell' ? 'bg-rose-500/20 text-rose-400' : 
                        'bg-gray-700 text-gray-400'
                      }`}>
                        {log.signal.toUpperCase()}
                      </span>
                      <span className="text-gray-500">@ ${log.price.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">Conf:</span>
                      <span className={log.confidence > 70 ? 'text-emerald-500' : 'text-amber-500'}>{log.confidence}%</span>
                      {log.isPaper ? (
                        <span title="Paper Trade"><ShieldCheck className="w-3.5 h-3.5 text-sky-500" /></span>
                      ) : (
                        <span title="Live Trade"><ShieldAlert className="w-3.5 h-3.5 text-rose-500" /></span>
                      )}
                    </div>
                  </div>
                  <p className="text-gray-400 pl-4 border-l border-gray-800 ml-2 italic">
                    {log.reasoning}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Market Data Feeds */}
        <div className="lg:col-span-3 flex flex-col gap-4 overflow-y-auto pl-2">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
            <BarChart2 className="w-3 h-3" /> Real-Time Market Data
          </h3>
          {stocks.map(stock => (
            <div key={stock.symbol} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">{stock.symbol}</span>
                  <span className="text-[10px] text-gray-500 uppercase px-1.5 py-0.5 bg-gray-800 rounded">{stock.assetType}</span>
                </div>
                <div className="text-sm font-mono font-bold text-white">
                  ${stock.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-950 rounded p-2 border border-gray-800">
                  <div className="text-[9px] text-gray-500 uppercase font-bold mb-1">24h Change</div>
                  <div className={`text-xs font-mono font-bold flex items-center gap-1 ${stock.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {stock.change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {Math.abs(stock.changePercent).toFixed(2)}%
                  </div>
                </div>
                <div className="bg-gray-950 rounded p-2 border border-gray-800">
                  <div className="text-[9px] text-gray-500 uppercase font-bold mb-1">Volume</div>
                  <div className="text-xs font-mono font-bold text-gray-300">
                    {(stock.volume / 1000000).toFixed(1)}M
                  </div>
                </div>
              </div>
              {stock.history && stock.history.length > 0 && stock.history[stock.history.length - 1].rsi && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center justify-between bg-gray-950 rounded p-2 border border-gray-800">
                    <span className="text-[9px] text-gray-500 uppercase font-bold">RSI (14)</span>
                    <span className={`text-xs font-mono font-bold ${
                      stock.history[stock.history.length - 1].rsi! > 70 ? 'text-rose-400' :
                      stock.history[stock.history.length - 1].rsi! < 30 ? 'text-emerald-400' :
                      'text-indigo-400'
                    }`}>
                      {stock.history[stock.history.length - 1].rsi!.toFixed(1)}
                    </span>
                  </div>
                  {stock.history[stock.history.length - 1].sma && (
                    <div className="flex items-center justify-between bg-gray-950 rounded p-2 border border-gray-800">
                      <span className="text-[9px] text-gray-500 uppercase font-bold">SMA (20)</span>
                      <span className="text-xs font-mono font-bold text-gray-300">
                        ${stock.history[stock.history.length - 1].sma!.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Playground;
