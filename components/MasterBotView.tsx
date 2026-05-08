import React, { useState, useEffect } from 'react';
import { BrainCircuit, Activity, Zap, Network, ArrowRightLeft, CheckCircle2, AlertTriangle, Layers, Loader2 } from 'lucide-react';
import { TradingBot, DataSource } from '../types';

interface MasterBotViewProps {
  bots: TradingBot[];
  dataSources: DataSource[];
}

interface MasterLog {
  id: string;
  timestamp: number;
  message: string;
  type: 'info' | 'action' | 'alert' | 'success';
  details?: string;
}

const MasterBotView: React.FC<MasterBotViewProps> = ({ bots, dataSources }) => {
  const [isActive, setIsActive] = useState(false);
  const [logs, setLogs] = useState<MasterLog[]>([]);
  const [isAllocating, setIsAllocating] = useState(false);

  const activeBots = bots.filter(b => b.status === 'active');
  const connectedSources = dataSources.filter(ds => (ds.effectiveStatus || ds.status) === 'connected');

  const addLog = (message: string, type: 'info' | 'action' | 'alert' | 'success' = 'info', details?: string) => {
    setLogs(prev => [{
      id: Math.random().toString(36).substring(7),
      timestamp: Date.now(),
      message,
      type,
      details
    }, ...prev].slice(0, 50));
  };

  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      if (activeBots.length === 0) {
        addLog("No active bots to monitor.", 'alert');
        return;
      }

      // Simulate Master Bot analyzing signals and finding arbitrage opportunities
      const randomBot = activeBots[Math.floor(Math.random() * activeBots.length)];
      const signalType = Math.random() > 0.5 ? 'BUY' : 'SELL';
      
      addLog(`Synthesizing signals from ${randomBot.name}...`, 'info');
      
      setTimeout(() => {
        setIsAllocating(true);
        addLog(`Strong ${signalType} signal detected for ${randomBot.symbol}. Initiating Smart Order Routing...`, 'action', `Confidence: ${(Math.random() * 20 + 80).toFixed(1)}%`);
        
        setTimeout(() => {
          const exchanges = ['Binance', 'Coinbase', 'Kraken', 'Sigma Dark Pool'];
          const selectedExchange = exchanges[Math.floor(Math.random() * exchanges.length)];
          const priceDiff = (Math.random() * 0.5 + 0.1).toFixed(2);
          
          addLog(`Optimal path found via ${selectedExchange}. Executing cross-exchange arbitrage.`, 'success', `Est. Profit: +${priceDiff}%`);
          setIsAllocating(false);
        }, 2000);
      }, 1500);

    }, 8000);

    return () => clearInterval(interval);
  }, [isActive, activeBots]);

  return (
    <div className="flex-1 bg-gray-950 p-6 flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400 border border-amber-500/20">
            <BrainCircuit className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Master Allocator AI</h2>
            <p className="text-sm text-gray-500">
              Combines signals from all active bots and data sources, routing orders through the Arbitrage engine for maximum profit.
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setIsActive(!isActive);
            if (!isActive) addLog("Master Allocator AI initialized.", 'info');
            else addLog("Master Allocator AI paused.", 'alert');
          }}
          className={`px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 transition-all shadow-lg ${
            isActive 
              ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/20' 
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20'
          }`}
        >
          {isActive ? <><AlertTriangle className="w-4 h-4" /> Halt Operations</> : <><Zap className="w-4 h-4" /> Activate Master AI</>}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full overflow-hidden">
        
        {/* Status Panel */}
        <div className="flex flex-col gap-6 overflow-y-auto">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-400" /> System Status
            </h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-950 rounded-lg border border-gray-800">
                <span className="text-sm text-gray-400">Master AI Status</span>
                <span className={`text-xs font-bold uppercase px-2 py-1 rounded-full flex items-center gap-1 ${isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-gray-800 text-gray-500 border border-gray-700'}`}>
                  {isActive && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>}
                  {isActive ? 'Active' : 'Standby'}
                </span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-gray-950 rounded-lg border border-gray-800">
                <span className="text-sm text-gray-400">Active Sub-Bots</span>
                <span className="text-sm font-bold text-white">{activeBots.length} / {bots.length}</span>
              </div>

              <div className="flex justify-between items-center p-3 bg-gray-950 rounded-lg border border-gray-800">
                <span className="text-sm text-gray-400">Connected Data Sources</span>
                <span className="text-sm font-bold text-white">{connectedSources.length} / {dataSources.length}</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex-1 flex flex-col">
             <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Network className="w-5 h-5 text-amber-400" /> Routing Engine
            </h3>
            <div className="flex-1 flex items-center justify-center border border-dashed border-gray-800 rounded-lg bg-gray-950 relative overflow-hidden">
                {isAllocating ? (
                   <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-500">
                      <div className="relative">
                        <div className="absolute inset-0 border-4 border-amber-500/30 rounded-full animate-ping"></div>
                        <div className="w-16 h-16 bg-amber-500/20 border border-amber-500/50 rounded-full flex items-center justify-center relative z-10">
                          <ArrowRightLeft className="w-8 h-8 text-amber-400 animate-pulse" />
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-amber-400 font-bold text-sm mb-1">Calculating Optimal Path...</div>
                        <div className="text-xs text-gray-500 font-mono">Analyzing cross-exchange liquidity</div>
                      </div>
                   </div>
                ) : (
                  <div className="text-center opacity-50">
                     <Layers className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                     <div className="text-sm text-gray-400 font-medium">Awaiting Signals</div>
                  </div>
                )}
            </div>
          </div>
        </div>

        {/* Live Execution Log */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-400" /> Execution Log
            </h3>
            {isActive && <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />}
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-sm">
            {logs.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-600 italic">
                System idle. Activate Master AI to begin monitoring.
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 animate-in slide-in-from-left-2 fade-in">
                  <div className="text-gray-500 text-xs mt-0.5 shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}
                  </div>
                  <div className={`flex-1 p-2.5 rounded border ${
                    log.type === 'action' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300' :
                    log.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' :
                    log.type === 'alert' ? 'bg-rose-500/10 border-rose-500/20 text-rose-300' :
                    'bg-gray-950 border-gray-800 text-gray-300'
                  }`}>
                    <div className="flex items-start gap-2">
                      {log.type === 'action' && <Zap className="w-4 h-4 shrink-0 mt-0.5 text-indigo-400" />}
                      {log.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />}
                      {log.type === 'alert' && <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />}
                      {log.type === 'info' && <Activity className="w-4 h-4 shrink-0 mt-0.5 text-gray-500" />}
                      <div>
                        <div>{log.message}</div>
                        {log.details && <div className="text-xs opacity-70 mt-1">{log.details}</div>}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default MasterBotView;
