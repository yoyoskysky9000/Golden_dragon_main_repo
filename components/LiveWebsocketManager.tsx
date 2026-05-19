import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Activity, TrendingUp, TrendingDown, Database, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip, AreaChart, Area } from 'recharts';
import { StockData } from '../types';

interface LiveWebsocketManagerProps {
  onUpdatePrices: (prices: Record<string, number>) => void;
}

export const LiveWebsocketManager: React.FC<LiveWebsocketManagerProps> = ({ onUpdatePrices }) => {
  const [url, setUrl] = useState('wss://stream.binance.com:9443/ws/!ticker@arr');
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<{ time: string, message: string, type: 'info' | 'data' | 'err' }[]>([]);
  const ws = useRef<WebSocket | null>(null);

  // Store mini histories for a few top pairs to render a small sparkline
  const [liveData, setLiveData] = useState<Record<string, { price: number, history: number[] }>>({});

  const MAX_LOGS = 50;

  const addLog = (msg: string, type: 'info' | 'data' | 'err' = 'info') => {
    setLogs(prev => {
      const updated = [{ time: new Date().toLocaleTimeString(), message: msg, type }, ...prev];
      return updated.slice(0, MAX_LOGS);
    });
  };

  const connect = () => {
    if (ws.current) {
      ws.current.close();
    }
    setError(null);
    try {
      addLog(`Connecting to ${url}...`, 'info');
      // For testing, we connect to Binance directly if it's binance, or whatever url the user has
      ws.current = new WebSocket(url);

      ws.current.onopen = () => {
        setIsConnected(true);
        addLog('Websocket Connected successfully.', 'info');
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          let updates: Record<string, number> = {};
          
          if (Array.isArray(data)) {
            // Binance ticker array
            data.forEach((ticker: any) => {
              if (ticker.s === 'BTCUSDT' || ticker.s === 'ETHUSDT' || ticker.s === 'SOLUSDT') {
                 updates[ticker.s] = parseFloat(ticker.c);
              }
            });
          } else if (data.data) {
             // Mock app format
             const mockData = data.data;
             if (mockData.symbol && mockData.price) {
                updates[mockData.symbol] = parseFloat(mockData.price);
             }
          }

          if (Object.keys(updates).length > 0) {
            setLiveData(prev => {
              const next = { ...prev };
              Object.entries(updates).forEach(([sym, price]) => {
                const existing = next[sym]?.history || [];
                next[sym] = {
                  price,
                  history: [...existing, price].slice(-30) // keep last 30 for sparkline
                };
              });
              return next;
            });
            onUpdatePrices(updates);
            // Optionally log some data
            if (Math.random() < 0.1) {
              addLog(`Price Update: ${Object.entries(updates).map(([k, v]) => `${k} $${v}`).join(', ')}`, 'data');
            }
          }
        } catch (e) {
           console.error(e);
        }
      };

      ws.current.onerror = (e) => {
        setError('Error connecting to websocket. Check console or CORS.');
        addLog('Websocket Error encountered.', 'err');
        setIsConnected(false);
      };

      ws.current.onclose = () => {
        setIsConnected(false);
        addLog('Websocket Disconnected.', 'info');
      };

    } catch (e: any) {
      setError(e.message);
      setIsConnected(false);
    }
  };

  const disconnect = () => {
    if (ws.current) {
      ws.current.close();
    }
  };

  useEffect(() => {
    return () => {
      if (ws.current) ws.current.close();
    };
  }, []);

  return (
    <div className="bg-gray-950 border border-gray-800 rounded-xl overflow-hidden flex flex-col h-full h-[600px]">
      <div className="p-4 border-b border-gray-800 bg-gray-900/50 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white font-bold flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-500" />
              Live WebSocket Tester
            </h2>
            <p className="text-gray-500 text-sm">Stream real data to the Agent Swarm and Backtester</p>
          </div>
          <div className="flex items-center gap-2">
            <div className={`px-2 py-1 rounded text-xs font-bold uppercase flex items-center gap-1 ${isConnected ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-500 border border-red-500/30'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`} />
              {isConnected ? 'Connected' : 'Disconnected'}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <input 
            type="text" 
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="wss://"
            className="flex-1 bg-gray-900 border border-gray-700 text-white rounded-lg p-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-sm"
          />
          {isConnected ? (
             <button onClick={disconnect} className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400 px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors">
               <Pause className="w-4 h-4" /> Stop Feed
             </button>
          ) : (
             <button onClick={connect} className="bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-400 px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors">
               <Play className="w-4 h-4" /> Connect Live
             </button>
          )}
        </div>
        {error && (
           <div className="p-2 bg-red-500/10 border border-red-500/20 rounded flex items-center gap-2 text-red-400 text-xs text-left">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
           </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden grid grid-cols-2">
         <div className="border-r border-gray-800 p-4 overflow-y-auto custom-scrollbar flex flex-col gap-3">
            <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Live Top Assets</h3>
            {Object.keys(liveData).length === 0 && (
               <div className="flex-1 flex items-center justify-center text-gray-600 text-sm italic">
                  Waiting for data points...
               </div>
            )}
            {Object.entries(liveData).map(([sym, data]) => {
                const latest = data.history[data.history.length - 1];
                const prev = data.history[data.history.length - 2] || latest;
                const change = latest - prev;
                return (
                  <div key={sym} className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex flex-col gap-2">
                     <div className="flex items-center justify-between">
                         <span className="font-bold text-white text-sm">{sym}</span>
                         <span className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${change >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-500'}`}>
                           {change >= 0 ? '+' : ''}{change.toFixed(2)}
                         </span>
                     </div>
                     <div className="flex items-end justify-between">
                         <span className="font-mono text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-200 to-gray-400">
                             ${data.price.toFixed(4)}
                         </span>
                         <div className="w-20 h-8">
                             <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data.history.map((val, i) => ({ value: val, index: i }))}>
                                    <defs>
                                        <linearGradient id={`grad-${sym}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={change >= 0 ? '#10b981' : '#ef4444'} stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor={change >= 0 ? '#10b981' : '#ef4444'} stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <Area 
                                      type="monotone" 
                                      dataKey="value" 
                                      stroke={change >= 0 ? '#10b981' : '#ef4444'} 
                                      fillOpacity={1} 
                                      fill={`url(#grad-${sym})`} 
                                      isAnimationActive={false}
                                    />
                                </AreaChart>
                             </ResponsiveContainer>
                         </div>
                     </div>
                  </div>
                )
            })}
         </div>

         <div className="p-4 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-gray-950/20">
            <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
               <Database className="w-3 h-3" /> Event Log
            </h3>
            <div className="h-[calc(100%-24px)] overflow-y-auto custom-scrollbar font-mono text-[10px] space-y-1.5 p-2 bg-black/40 rounded-lg border border-white/5">
                {logs.length === 0 && <span className="text-gray-600">No events yet...</span>}
                {logs.map((L, i) => (
                    <div key={i} className={`flex gap-2 ${L.type === 'err' ? 'text-red-400' : L.type === 'data' ? 'text-emerald-400/70' : 'text-blue-400/80'}`}>
                       <span className="text-gray-600 shrink-0">[{L.time}]</span>
                       <span className="break-all">{L.message}</span>
                    </div>
                ))}
            </div>
         </div>
      </div>

    </div>
  );
};
