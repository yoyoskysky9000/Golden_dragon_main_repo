
import React, { useMemo, useState, useEffect } from 'react';
import { StockData, ArbitrageOpportunity, PredictionArbitrageOpportunity } from '../types';
import { Layers, ArrowRight, Zap, TrendingUp, AlertTriangle, Globe, Activity, BrainCircuit } from 'lucide-react';

interface ArbitrageMatrixProps {
  stocks: StockData[];
}

const MOCK_PREDICTION_ARBITRAGE: PredictionArbitrageOpportunity[] = [
  {
    id: 'pm-1',
    event: 'Candidate X to win the 2026 Election',
    category: 'politics',
    polymarketYesPrice: 0.41,
    kalshiNoPrice: 0.57,
    combinedCost: 0.98,
    guaranteedProfit: 0.02,
    guaranteedProfitPercent: 2.04,
    liquidity: 1250000
  },
  {
    id: 'pm-2',
    event: 'Fed to cut rates by 25bps in March',
    category: 'economics',
    polymarketYesPrice: 0.65,
    kalshiNoPrice: 0.33,
    combinedCost: 0.98,
    guaranteedProfit: 0.02,
    guaranteedProfitPercent: 2.04,
    liquidity: 850000
  },
  {
    id: 'pm-3',
    event: 'Bitcoin to hit $150k by end of Q2',
    category: 'crypto',
    polymarketYesPrice: 0.22,
    kalshiNoPrice: 0.76,
    combinedCost: 0.98,
    guaranteedProfit: 0.02,
    guaranteedProfitPercent: 2.04,
    liquidity: 3200000
  },
  {
    id: 'pm-4',
    event: 'SpaceX to launch manned Mars mission in 2026',
    category: 'tech',
    polymarketYesPrice: 0.15,
    kalshiNoPrice: 0.82,
    combinedCost: 0.97,
    guaranteedProfit: 0.03,
    guaranteedProfitPercent: 3.09,
    liquidity: 450000
  }
];

const ArbitrageMatrix: React.FC<ArbitrageMatrixProps> = ({ stocks }) => {
  const [activeTab, setActiveTab] = useState<'crypto' | 'prediction'>('prediction');
  const [autoArbEnabled, setAutoArbEnabled] = useState(false);
  const [autoArbLogs, setAutoArbLogs] = useState<string[]>([]);

  useEffect(() => {
    if (!autoArbEnabled) return;
    
    const interval = setInterval(() => {
        if (Math.random() > 0.7) {
            const isCrypto = Math.random() > 0.5;
            const log = isCrypto 
                ? `[AUTO-ARB] Executed cross-exchange path for BTC. Net yield: +${(Math.random() * 0.5 + 0.1).toFixed(2)}%`
                : `[AUTO-ARB] Executed prediction market Dutch-book. Net yield: +${(Math.random() * 2 + 1).toFixed(2)}%`;
            
            setAutoArbLogs(prev => [log, ...prev].slice(0, 5));
        }
    }, 3000);
    
    return () => clearInterval(interval);
  }, [autoArbEnabled]);

  const opportunities = useMemo(() => {
    const ops: ArbitrageOpportunity[] = [];
    stocks.forEach(stock => {
      if (!stock.exchanges) return;
      // Fix: Cast Object.entries to [string, number][] to ensure types are correctly inferred as numbers.
      const exchangeEntries = Object.entries(stock.exchanges) as [string, number][];
      
      if (exchangeEntries.length === 0) return;

      let minEx = exchangeEntries[0];
      let maxEx = exchangeEntries[0];

      exchangeEntries.forEach(ex => {
        // Fix: Explicitly compare prices from the entries to find min and max.
        // ex[1], minEx[1], maxEx[1] are now inferred as number due to the cast above.
        const price = ex[1];
        if (price < minEx[1]) minEx = ex;
        if (price > maxEx[1]) maxEx = ex;
      });

      // Fix: Extract prices after identifying min/max to ensure they are treated as numbers and avoid 'unknown' type issues.
      const minPrice: number = minEx[1];
      const maxPrice: number = maxEx[1];
      const spread: number = maxPrice - minPrice;
      const spreadPct: number = (spread / minPrice) * 100;

      if (spreadPct > 0.1) { // Threshold for reporting
        ops.push({
          symbol: stock.symbol,
          buyExchange: minEx[0],
          sellExchange: maxEx[0],
          buyPrice: minPrice,
          sellPrice: maxPrice,
          spread,
          spreadPercent: spreadPct,
          profitPotential: spreadPct - 0.2 // Deducting 0.2% for fees (0.1% per side)
        });
      }
    });
    return ops.sort((a, b) => b.spreadPercent - a.spreadPercent);
  }, [stocks]);

  const formatMoney = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  return (
    <div className="flex-1 bg-gray-950 p-6 flex flex-col h-full overflow-hidden">
        <div className="flex items-center justify-between mb-8">
            <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <Zap className="w-6 h-6 text-amber-500 fill-amber-500/20" />
                    Arbitrage Matrix
                </h2>
                <p className="text-sm text-gray-500">Cross-exchange inefficiencies detected via Dragon Webhooks.</p>
            </div>
            <div className="flex gap-4">
                 <button 
                    onClick={() => setAutoArbEnabled(!autoArbEnabled)}
                    className={`border rounded-lg px-4 py-2 flex items-center gap-3 transition-all ${
                        autoArbEnabled 
                            ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)]' 
                            : 'bg-gray-900 border-gray-800 text-gray-500 hover:text-gray-300'
                    }`}
                 >
                    <BrainCircuit className={`w-4 h-4 ${autoArbEnabled ? 'animate-pulse' : ''}`} />
                    <span className="text-xs font-bold uppercase tracking-wider">
                        {autoArbEnabled ? 'Auto-Arb Swarm: Active' : 'Enable Auto-Arb Swarm'}
                    </span>
                 </button>
                 <div className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-2 flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-xs font-bold text-gray-400">WEBHOOKS ACTIVE</span>
                 </div>
            </div>
        </div>

        {autoArbEnabled && autoArbLogs.length > 0 && (
            <div className="mb-6 bg-indigo-950/20 border border-indigo-500/20 rounded-xl p-4 animate-in fade-in slide-in-from-top-4">
                <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <Activity className="w-3 h-3" /> Swarm Execution Logs
                </div>
                <div className="space-y-1">
                    {autoArbLogs.map((log, i) => (
                        <div key={i} className="text-xs font-mono text-indigo-200/80 flex items-center gap-2">
                            <span className="text-indigo-500">{'>'}</span> {log}
                        </div>
                    ))}
                </div>
            </div>
        )}

        <div className="flex gap-4 border-b border-gray-800 mb-6">
            <button 
                onClick={() => setActiveTab('crypto')}
                className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'crypto' ? 'border-amber-500 text-amber-500' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
            >
                <TrendingUp className="w-4 h-4" /> Crypto Arbitrage
            </button>
            <button 
                onClick={() => setActiveTab('prediction')}
                className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'prediction' ? 'border-amber-500 text-amber-500' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
            >
                <Globe className="w-4 h-4" /> Prediction Markets
            </button>
        </div>

        <div className="grid grid-cols-1 gap-4 overflow-y-auto custom-scrollbar">
            {activeTab === 'crypto' ? (
                opportunities.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center text-gray-600 italic">
                        <Layers className="w-12 h-12 mb-4 opacity-20" />
                        No profitable spreads currently detected.
                    </div>
                ) : (
                    opportunities.map((op, idx) => (
                        <div key={idx} className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-amber-500/50 transition-all group relative overflow-hidden shadow-2xl">
                            {op.profitPotential > 0.5 && (
                                 <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-3xl rounded-full pointer-events-none"></div>
                            )}
                            
                            <div className="flex items-center justify-between gap-8 relative z-10">
                                <div className="flex items-center gap-4 w-48">
                                    <div className="w-12 h-12 bg-gray-950 rounded-xl flex items-center justify-center font-bold text-amber-500 border border-gray-800 group-hover:border-amber-500/30 transition-colors shadow-inner">
                                        {op.symbol}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-200">{op.symbol}</h3>
                                        <div className="text-[10px] text-gray-500 uppercase font-bold mt-1">Cross-Exchange</div>
                                    </div>
                                </div>

                                <div className="flex-1 flex flex-col gap-3">
                                    <div className="grid grid-cols-3 gap-6">
                                        <div>
                                            <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Buy Side</div>
                                            <div className="font-mono text-emerald-400 font-bold">{formatMoney(op.buyPrice)}</div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Sell Side</div>
                                            <div className="font-mono text-rose-400 font-bold">{formatMoney(op.sellPrice)}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Spread</div>
                                            <div className="font-mono text-white font-bold">{op.spreadPercent.toFixed(3)}%</div>
                                        </div>
                                    </div>
                                    <button className="w-full bg-gray-950 hover:bg-gray-800 border border-gray-800 text-gray-300 text-[10px] font-bold py-2 rounded-lg flex items-center justify-center gap-3 transition-colors">
                                        <span className="text-gray-500">BUY PATH:</span>
                                        <span className="bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded border border-emerald-500/20 uppercase">{op.buyExchange}</span>
                                        <ArrowRight className="w-3 h-3 text-gray-600" />
                                        <span className="bg-rose-500/10 text-rose-500 px-2 py-0.5 rounded border border-rose-500/20 uppercase">{op.sellExchange}</span>
                                    </button>
                                </div>

                                <div className="min-w-[140px] flex flex-col items-end">
                                    <div className={`text-xl font-mono font-black ${op.profitPotential > 0 ? 'text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.3)]' : 'text-gray-600'}`}>
                                        {op.profitPotential > 0 ? '+' : ''}{op.profitPotential.toFixed(3)}%
                                    </div>
                                    <div className="text-[9px] text-gray-500 font-bold uppercase tracking-tighter">Est. Net Yield</div>
                                    <button className="mt-3 bg-amber-600 hover:bg-amber-500 text-gray-950 text-[10px] font-black px-4 py-1.5 rounded-full transition-all active:scale-95 shadow-lg shadow-amber-900/20">
                                        EXECUTE ARBITRAGE
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )
            ) : (
                MOCK_PREDICTION_ARBITRAGE.map((op) => (
                    <div key={op.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-amber-500/50 transition-all group relative overflow-hidden shadow-2xl">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-3xl rounded-full pointer-events-none"></div>
                        
                        <div className="flex items-center justify-between gap-8 relative z-10">
                            <div className="flex items-center gap-4 flex-1">
                                <div className="w-12 h-12 bg-gray-950 rounded-xl flex items-center justify-center text-indigo-400 border border-gray-800 group-hover:border-indigo-500/30 transition-colors shadow-inner">
                                    <Globe className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[9px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20 font-bold uppercase">{op.category}</span>
                                        <span className="text-[10px] text-gray-500 font-mono">Liq: {formatMoney(op.liquidity)}</span>
                                    </div>
                                    <h3 className="font-bold text-gray-200 text-sm">{op.event}</h3>
                                </div>
                            </div>

                            <div className="flex-1 grid grid-cols-3 gap-6">
                                <div>
                                    <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1 flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div> Polymarket (YES)
                                    </div>
                                    <div className="font-mono text-white font-bold">${op.polymarketYesPrice.toFixed(2)}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1 flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div> Kalshi (NO)
                                    </div>
                                    <div className="font-mono text-white font-bold">${op.kalshiNoPrice.toFixed(2)}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Combined Cost</div>
                                    <div className="font-mono text-emerald-400 font-bold">${op.combinedCost.toFixed(2)}</div>
                                </div>
                            </div>

                            <div className="min-w-[140px] flex flex-col items-end">
                                <div className="text-xl font-mono font-black text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.3)]">
                                    +{op.guaranteedProfitPercent.toFixed(2)}%
                                </div>
                                <div className="text-[9px] text-gray-500 font-bold uppercase tracking-tighter">Guaranteed Yield</div>
                                <button className="mt-3 bg-amber-600 hover:bg-amber-500 text-gray-950 text-[10px] font-black px-4 py-1.5 rounded-full transition-all active:scale-95 shadow-lg shadow-amber-900/20">
                                    EXECUTE ARBITRAGE
                                </button>
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
        
        <div className="mt-6 bg-gray-900/50 border border-gray-800 rounded-xl p-4 flex items-center gap-4 animate-in fade-in duration-700">
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
                <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="text-xs text-gray-400">
                <span className="text-amber-500 font-bold">PRO TIP:</span> The Golden Dragon terminal accounts for cross-exchange transfer latency. High spreads may be due to "Network Gaps" or "Wallet Congestion". Verify withdrawal status before execution.
            </div>
        </div>
    </div>
  );
};

export default ArbitrageMatrix;
