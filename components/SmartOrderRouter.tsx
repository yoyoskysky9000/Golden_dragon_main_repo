import React, { useState, useEffect } from 'react';
import { Activity, ArrowRightLeft, ShieldCheck, Zap, Layers, BarChart3, Loader2, CheckCircle2, AlertTriangle, Network } from 'lucide-react';

interface RouteNode {
  exchange: string;
  allocation: number; // percentage
  price: number;
  status: 'pending' | 'routing' | 'filled' | 'failed';
  type: 'lit' | 'dark_pool' | 'dex';
}

const SmartOrderRouter: React.FC = () => {
  const [asset, setAsset] = useState('ETH');
  const [amount, setAmount] = useState('100000');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [isRouting, setIsRouting] = useState(false);
  const [executionComplete, setExecutionComplete] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  const [routes, setRoutes] = useState<RouteNode[]>([
    { exchange: 'Binance', allocation: 45, price: 3450.20, status: 'pending', type: 'lit' },
    { exchange: 'Coinbase', allocation: 25, price: 3450.50, status: 'pending', type: 'lit' },
    { exchange: 'Kraken', allocation: 15, price: 3451.00, status: 'pending', type: 'lit' },
    { exchange: 'Sigma Dark Pool', allocation: 10, price: 3450.10, status: 'pending', type: 'dark_pool' },
    { exchange: 'Uniswap V3', allocation: 5, price: 3451.20, status: 'pending', type: 'dex' },
  ]);

  const [savedSlippage, setSavedSlippage] = useState(0);

  const handlePrepareExecution = () => {
    setShowConfirmation(true);
  };

  const handleExecute = () => {
    setShowConfirmation(false);
    setIsRouting(true);
    setExecutionComplete(false);
    
    // Reset statuses
    setRoutes(routes.map(r => ({ ...r, status: 'routing' })));
    
    // Simulate execution steps
    let completed = 0;
    
    routes.forEach((route, index) => {
      setTimeout(() => {
        setRoutes(prev => prev.map((r, i) => i === index ? { ...r, status: 'filled' } : r));
        completed++;
        
        if (completed === routes.length) {
          setIsRouting(false);
          setExecutionComplete(true);
          setSavedSlippage(parseFloat(amount) * 0.0045); // Simulate 0.45% saved
        }
      }, 1000 + (Math.random() * 2000)); // Random delay between 1-3s
    });
  };

  const formatMoney = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  return (
    <div className="flex-1 bg-gray-950 p-6 flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Network className="w-6 h-6 text-indigo-500" />
            Smart Order Routing (SOR)
          </h2>
          <p className="text-sm text-gray-500">Institutional-grade execution engine. Minimize slippage across fragmented liquidity.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full overflow-y-auto pb-6">
        {/* Order Entry Panel */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex flex-col gap-6">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-5 h-5 text-amber-500" />
            <h3 className="text-lg font-bold text-white">Order Parameters</h3>
          </div>
          
          <div className="flex bg-gray-950 p-1 rounded-lg border border-gray-800">
            <button 
              onClick={() => setSide('buy')}
              className={`flex-1 py-2 text-sm font-bold rounded transition-colors ${side === 'buy' ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' : 'text-gray-500 hover:text-gray-300'}`}
            >
              BUY
            </button>
            <button 
              onClick={() => setSide('sell')}
              className={`flex-1 py-2 text-sm font-bold rounded transition-colors ${side === 'sell' ? 'bg-rose-600/20 text-rose-400 border border-rose-500/30' : 'text-gray-500 hover:text-gray-300'}`}
            >
              SELL
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Asset</label>
            <select 
              value={asset}
              onChange={(e) => setAsset(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="ETH">ETH (Ethereum)</option>
              <option value="BTC">BTC (Bitcoin)</option>
              <option value="SOL">SOL (Solana)</option>
              <option value="NVDA">NVDA (NVIDIA)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Notional Value (USD)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input 
                type="number" 
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 pl-8 text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
          </div>

          <div className="bg-indigo-900/10 border border-indigo-500/20 rounded-lg p-4 mt-auto">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold text-indigo-300 uppercase">MEV Protection Active</span>
            </div>
            <p className="text-[10px] text-gray-500">Orders are routed through Flashbots and private mempools to prevent sandwich attacks and front-running.</p>
          </div>

          {!showConfirmation ? (
            <button 
              onClick={handlePrepareExecution}
              disabled={isRouting || !amount || parseFloat(amount) <= 0}
              className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${
                isRouting 
                  ? 'bg-indigo-900/50 text-indigo-300 cursor-not-allowed border border-indigo-500/30' 
                  : side === 'buy'
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20'
                    : 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/20'
              }`}
            >
              {isRouting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Routing Order...
                </>
              ) : (
                <>
                  <ArrowRightLeft className="w-5 h-5" />
                  Execute {side.toUpperCase()}
                </>
              )}
            </button>
          ) : (
            <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2">
              <div className="bg-gray-950 border border-gray-800 rounded-lg p-4 mb-2">
                <h4 className="text-sm font-bold text-white mb-2">Confirm Execution</h4>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Action:</span>
                  <span className={`font-bold ${side === 'buy' ? 'text-emerald-400' : 'text-rose-400'}`}>{side.toUpperCase()}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Asset:</span>
                  <span className="text-white font-bold">{asset}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Notional:</span>
                  <span className="text-white font-mono">{formatMoney(parseFloat(amount))}</span>
                </div>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowConfirmation(false)}
                  className="flex-1 py-3 rounded-xl font-bold text-sm bg-gray-800 hover:bg-gray-700 text-white transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleExecute}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                    side === 'buy'
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20'
                      : 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/20'
                  }`}
                >
                  Confirm
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Routing Visualization Panel */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-400" />
              <h3 className="text-lg font-bold text-white">Execution Matrix</h3>
            </div>
            {executionComplete && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-2 animate-in fade-in zoom-in duration-300">
                <CheckCircle2 className="w-4 h-4" />
                Execution Complete
              </div>
            )}
          </div>

          <div className="flex-1 flex flex-col gap-4">
            {routes.map((route, idx) => (
              <div key={idx} className={`relative p-4 rounded-xl border transition-all duration-500 ${
                route.status === 'filled' ? 'bg-emerald-900/10 border-emerald-500/30' :
                route.status === 'routing' ? 'bg-indigo-900/10 border-indigo-500/50' :
                'bg-gray-950 border-gray-800'
              }`}>
                {/* Progress Bar Background */}
                <div 
                  className={`absolute top-0 left-0 h-full rounded-xl transition-all duration-1000 ease-out opacity-10 ${
                    route.status === 'filled' ? 'bg-emerald-500 w-full' :
                    route.status === 'routing' ? 'bg-indigo-500 w-1/2 animate-pulse' :
                    'bg-transparent w-0'
                  }`}
                />
                
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-4 w-1/3">
                    <div className={`w-2 h-2 rounded-full ${
                      route.status === 'filled' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' :
                      route.status === 'routing' ? 'bg-indigo-500 animate-ping' :
                      'bg-gray-600'
                    }`} />
                    <div>
                      <div className="font-bold text-white flex items-center gap-2">
                        {route.exchange}
                        {route.type === 'dark_pool' && <span className="text-[9px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded uppercase border border-purple-500/30">Dark Pool</span>}
                        {route.type === 'dex' && <span className="text-[9px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded uppercase border border-blue-500/30">DEX</span>}
                      </div>
                      <div className="text-xs text-gray-500 font-mono">
                        {route.allocation}% Allocation
                      </div>
                    </div>
                  </div>

                  <div className="w-1/3 text-center">
                    <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Execution Price</div>
                    <div className="font-mono text-sm text-gray-300">{formatMoney(route.price)}</div>
                  </div>

                  <div className="w-1/3 flex justify-end">
                    {route.status === 'pending' && <span className="text-xs text-gray-600 font-bold uppercase">Pending</span>}
                    {route.status === 'routing' && <span className="text-xs text-indigo-400 font-bold uppercase flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Routing</span>}
                    {route.status === 'filled' && <span className="text-xs text-emerald-400 font-bold uppercase flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Filled</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Results Summary */}
          <div className={`mt-6 p-4 rounded-xl border transition-all duration-500 ${executionComplete ? 'bg-gray-950 border-emerald-500/30' : 'bg-gray-950 border-gray-800 opacity-50'}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500 uppercase font-bold mb-1">Estimated Slippage Saved</div>
                <div className={`text-2xl font-mono font-bold ${executionComplete ? 'text-emerald-400' : 'text-gray-600'}`}>
                  {executionComplete ? `+${formatMoney(savedSlippage)}` : '$0.00'}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500 uppercase font-bold mb-1">Effective Average Price</div>
                <div className={`text-xl font-mono font-bold ${executionComplete ? 'text-white' : 'text-gray-600'}`}>
                  {executionComplete ? formatMoney(routes.reduce((acc, r) => acc + (r.price * (r.allocation / 100)), 0)) : '---'}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default SmartOrderRouter;
