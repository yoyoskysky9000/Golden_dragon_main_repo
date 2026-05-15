import React, { useState, useEffect } from 'react';
import { Activity, ArrowRightLeft, ShieldCheck, Zap, Layers, BarChart3, Loader2, CheckCircle2, AlertTriangle, Network, Clock, Settings, TrendingUp } from 'lucide-react';

interface RouteNode {
  exchange: string;
  allocation: number; // percentage
  price: number;
  status: 'pending' | 'routing' | 'filled' | 'failed';
  type: 'lit' | 'dark_pool' | 'dex';
  fee: number;
}

type OrderType = 'market' | 'limit' | 'stop_loss' | 'take_profit' | 'trailing_stop' | 'twap' | 'vwap' | 'stop_limit';

const SmartOrderRouter: React.FC = () => {
  const [asset, setAsset] = useState('ETH');
  const [amount, setAmount] = useState('100000');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  
  const [orderType, setOrderType] = useState<OrderType>('market');
  const [routingStrategy, setRoutingStrategy] = useState<'smart' | 'fast' | 'low_fee'>('smart');
  
  // Advanced parameters
  const [limitPrice, setLimitPrice] = useState('');
  const [stopPrice, setStopPrice] = useState('');
  const [trailPercent, setTrailPercent] = useState('1.5');
  const [executionTime, setExecutionTime] = useState('60'); // Minutes for TWAP/VWAP
  
  const [isRouting, setIsRouting] = useState(false);
  const [executionComplete, setExecutionComplete] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  const [routes, setRoutes] = useState<RouteNode[]>([]);
  const [savedSlippage, setSavedSlippage] = useState(0);

  // Asset mock prices
  const assetPrices = {
    ETH: 3450.00,
    BTC: 64200.00,
    SOL: 145.20,
    NVDA: 850.50
  };

  useEffect(() => {
    // Dynamically calculate routes when amount, asset, or strategy changes
    calculateRoutes();
  }, [amount, asset, routingStrategy, side, orderType]);

  const calculateRoutes = () => {
    const basePrice = assetPrices[asset as keyof typeof assetPrices] || 100;
    const notional = parseFloat(amount) || 0;
    
    let simulatedRoutes: RouteNode[] = [];
    
    if (notional <= 0) {
      setRoutes([]);
      return;
    }
    
    // Base exchange profiles with liquidity depth & fee info
    const exchanges = [
      { name: 'Binance', type: 'lit', feeTier: 0.001, liquidityScore: 100 },
      { name: 'Coinbase', type: 'lit', feeTier: 0.004, liquidityScore: 60 },
      { name: 'Kraken', type: 'lit', feeTier: 0.0026, liquidityScore: 40 },
      { name: 'Sigma Dark Pool', type: 'dark_pool', feeTier: 0.000, liquidityScore: 200 },
      { name: 'Uniswap V3', type: 'dex', feeTier: 0.003, liquidityScore: 50 },
    ];
    
    // Vary the price slightly based on exchange and side
    const getSimPrice = (base: number) => {
      const variance = (Math.random() * 0.001) * base;
      return side === 'buy' ? base + variance : base - variance;
    };

    if (routingStrategy === 'fast') {
      simulatedRoutes = [
        { exchange: 'Binance', allocation: 80, price: getSimPrice(basePrice), status: 'pending', type: 'lit', fee: 0.001 },
        { exchange: 'Coinbase', allocation: 20, price: getSimPrice(basePrice), status: 'pending', type: 'lit', fee: 0.004 }
      ];
    } else if (routingStrategy === 'low_fee') {
      simulatedRoutes = [
        { exchange: 'Sigma Dark Pool', allocation: 60, price: getSimPrice(basePrice), status: 'pending', type: 'dark_pool', fee: 0 },
        { exchange: 'Binance', allocation: 40, price: getSimPrice(basePrice), status: 'pending', type: 'lit', fee: 0.001 }
      ];
    } else {
      if (notional > 250000) {
        simulatedRoutes = [
          { exchange: 'Sigma Dark Pool', allocation: 45, price: getSimPrice(basePrice), status: 'pending', type: 'dark_pool', fee: 0 },
          { exchange: 'Binance', allocation: 25, price: getSimPrice(basePrice), status: 'pending', type: 'lit', fee: 0.001 },
          { exchange: 'Coinbase', allocation: 15, price: getSimPrice(basePrice), status: 'pending', type: 'lit', fee: 0.004 },
          { exchange: 'Uniswap V3', allocation: 15, price: getSimPrice(basePrice), status: 'pending', type: 'dex', fee: 0.003 },
        ];
      } else {
        simulatedRoutes = [
          { exchange: 'Binance', allocation: 50, price: getSimPrice(basePrice), status: 'pending', type: 'lit', fee: 0.001 },
          { exchange: 'Coinbase', allocation: 30, price: getSimPrice(basePrice), status: 'pending', type: 'lit', fee: 0.004 },
          { exchange: 'Kraken', allocation: 20, price: getSimPrice(basePrice), status: 'pending', type: 'lit', fee: 0.0026 },
        ];
      }
    }
    
    setRoutes(simulatedRoutes as RouteNode[]);
  };

  const handlePrepareExecution = () => {
    setShowConfirmation(true);
  };

  const handleExecute = () => {
    setShowConfirmation(false);
    setIsRouting(true);
    setExecutionComplete(false);
    
    setRoutes(routes.map(r => ({ ...r, status: 'routing' })));
    
    let completed = 0;
    
    routes.forEach((route, index) => {
      const delay = (orderType === 'twap' || orderType === 'vwap') 
        ? 3000 + (Math.random() * 4000) 
        : 1000 + (Math.random() * 2000);

      setTimeout(() => {
        setRoutes(prev => prev.map((r, i) => i === index ? { ...r, status: 'filled' } : r));
        completed++;
        
        if (completed === routes.length) {
          setIsRouting(false);
          setExecutionComplete(true);
          
          const notional = parseFloat(amount);
          const baseSlip = routingStrategy === 'fast' ? 0.008 : 0.01; 
          const currentSlip = routingStrategy === 'smart' ? 0.002 : (routingStrategy === 'low_fee' ? 0.004 : 0.006);
          setSavedSlippage(notional * (baseSlip - currentSlip)); 
        }
      }, delay);
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
          <p className="text-sm text-gray-500">Institutional-grade execution engine for advanced order types and algorithmic execution.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 h-full overflow-y-auto pb-6">
        {/* Order Entry Panel */}
        <div className="xl:col-span-4 bg-gray-900 border border-gray-800 rounded-xl p-6 flex flex-col gap-6 overflow-y-auto">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-5 h-5 text-amber-500" />
            <h3 className="text-lg font-bold text-white">Order Parameters</h3>
          </div>
          
          <div className="flex bg-gray-950 p-1 rounded-lg border border-gray-800 shrink-0">
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

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Asset</label>
                <select 
                  value={asset}
                  onChange={(e) => setAsset(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="ETH">ETH</option>
                  <option value="BTC">BTC</option>
                  <option value="SOL">SOL</option>
                  <option value="NVDA">NVDA</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Type</label>
                <select 
                  value={orderType}
                  onChange={(e) => setOrderType(e.target.value as OrderType)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="market">Market</option>
                  <option value="limit">Limit</option>
                  <option value="stop_loss">Stop Loss</option>
                  <option value="stop_limit">Stop Limit</option>
                  <option value="take_profit">Take Profit</option>
                  <option value="trailing_stop">Trailing Stop</option>
                  <option value="twap">Algorithm: TWAP</option>
                  <option value="vwap">Algorithm: VWAP</option>
                </select>
              </div>
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

            {/* Dynamic Inputs Based on Order Type */}
            {(orderType === 'limit' || orderType === 'take_profit' || orderType === 'stop_limit') && (
              <div className="animate-in fade-in">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Limit Price</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input 
                    type="number" 
                    value={limitPrice}
                    onChange={(e) => setLimitPrice(e.target.value)}
                    placeholder={assetPrices[asset as keyof typeof assetPrices].toString()}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 pl-8 text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>
            )}

            {(orderType === 'stop_loss' || orderType === 'trailing_stop' || orderType === 'stop_limit') && (
              <div className="animate-in fade-in">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                  {orderType === 'trailing_stop' ? 'Trail (%)' : 'Stop Price'}
                </label>
                <div className="relative">
                  {(orderType === 'stop_loss' || orderType === 'stop_limit') && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>}
                  <input 
                    type="number" 
                    value={orderType === 'trailing_stop' ? trailPercent : stopPrice}
                    onChange={(e) => orderType === 'trailing_stop' ? setTrailPercent(e.target.value) : setStopPrice(e.target.value)}
                    placeholder={orderType === 'trailing_stop' ? '1.5' : assetPrices[asset as keyof typeof assetPrices].toString()}
                    className={`w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500 font-mono ${(orderType === 'stop_loss' || orderType === 'stop_limit') ? 'pl-8' : ''}`}
                  />
                  {orderType === 'trailing_stop' && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>}
                </div>
              </div>
            )}

            {(orderType === 'twap' || orderType === 'vwap') && (
              <div className="animate-in fade-in">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-2">
                  <Clock className="w-3 h-3" /> Execution Duration (Minutes)
                </label>
                <div className="relative">
                  <input 
                    type="number" 
                    value={executionTime}
                    onChange={(e) => setExecutionTime(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-2">
                <Settings className="w-3 h-3" /> Routing Strategy
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setRoutingStrategy('smart')}
                  className={`py-2 px-2 text-xs font-bold rounded-lg transition-colors border ${routingStrategy === 'smart' ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/50' : 'bg-gray-950 text-gray-400 border-gray-800 hover:border-gray-600'}`}
                >
                  Smart Split
                </button>
                <button
                  onClick={() => setRoutingStrategy('fast')}
                  className={`py-2 px-2 text-xs font-bold rounded-lg transition-colors border ${routingStrategy === 'fast' ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/50' : 'bg-gray-950 text-gray-400 border-gray-800 hover:border-gray-600'}`}
                >
                  Fast Exec
                </button>
                <button
                  onClick={() => setRoutingStrategy('low_fee')}
                  className={`py-2 px-2 text-xs font-bold rounded-lg transition-colors border ${routingStrategy === 'low_fee' ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/50' : 'bg-gray-950 text-gray-400 border-gray-800 hover:border-gray-600'}`}
                >
                  Low Fee
                </button>
              </div>
            </div>
          </div>

          <div className="bg-indigo-900/10 border border-indigo-500/20 rounded-lg p-4 mt-auto shrink-0">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold text-indigo-300 uppercase">MEV Protection Active</span>
            </div>
            <p className="text-[10px] text-gray-500">Orders are routed through Flashbots and private mempools to prevent front-running.</p>
          </div>

          <div className="shrink-0 pt-2">
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
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Type:</span>
                    <span className="text-white font-bold capitalize">{orderType.replace('_', ' ')}</span>
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
        </div>

        {/* Routing Visualization Panel */}
        <div className="xl:col-span-8 bg-gray-900 border border-gray-800 rounded-xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-400" />
              <h3 className="text-lg font-bold text-white">Execution Matrix & Liquidity Map</h3>
            </div>
            {executionComplete && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-2 animate-in fade-in zoom-in duration-300">
                <CheckCircle2 className="w-4 h-4" />
                Execution Complete
              </div>
            )}
            {(orderType === 'twap' || orderType === 'vwap') && isRouting && (
              <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-2 animate-pulse">
                <Activity className="w-4 h-4" />
                Algo Working...
              </div>
            )}
          </div>

          <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
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
                
                <div className="relative z-10 flex flex-wrap lg:flex-nowrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4 w-full lg:w-2/5">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${
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
                      <div className="text-xs text-gray-500 font-mono flex items-center gap-2 mt-1">
                        <div className="h-1.5 bg-gray-800 rounded-full w-20 overflow-hidden">
                          <div className="h-full bg-indigo-500" style={{ width: `${route.allocation}%` }} />
                        </div>
                        {route.allocation}% Allocation ({formatMoney((parseFloat(amount) || 0) * (route.allocation / 100))})
                      </div>
                    </div>
                  </div>

                  <div className="w-1/2 lg:w-1/5 text-left lg:text-center">
                    <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Execution Price</div>
                    <div className="font-mono text-sm text-gray-300">{formatMoney(route.price)}</div>
                  </div>
                  
                  <div className="w-1/2 lg:w-1/5 text-left lg:text-center">
                    <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Est. Fee</div>
                    <div className="font-mono text-sm text-gray-400">{(route.fee * 100).toFixed(2)}%</div>
                  </div>

                  <div className="w-full lg:w-1/5 flex justify-end">
                    {route.status === 'pending' && <span className="text-xs text-gray-600 font-bold uppercase">Pending</span>}
                    {route.status === 'routing' && <span className="text-xs text-indigo-400 font-bold uppercase flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Routing</span>}
                    {route.status === 'filled' && <span className="text-xs text-emerald-400 font-bold uppercase flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Filled</span>}
                  </div>
                </div>
              </div>
            ))}
            
            {routes.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-600">
                <Network className="w-12 h-12 mb-4 opacity-50" />
                <p>Enter an order amount to preview routing topology.</p>
              </div>
            )}
          </div>

          {/* Results Summary */}
          <div className={`mt-6 p-4 rounded-xl border transition-all duration-500 shrink-0 ${executionComplete ? 'bg-gray-950 border-emerald-500/30' : 'bg-gray-950 border-gray-800 opacity-50'}`}>
            <div className="flex flex-wrap md:flex-nowrap items-center justify-between gap-4">
              <div>
                <div className="text-xs text-gray-500 uppercase font-bold mb-1 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Estimated Slippage Saved
                </div>
                <div className={`text-2xl font-mono font-bold ${executionComplete ? 'text-emerald-400' : 'text-gray-600'}`}>
                  {executionComplete ? `+${formatMoney(savedSlippage)}` : '$0.00'}
                </div>
              </div>
              <div className="text-left md:text-right">
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

