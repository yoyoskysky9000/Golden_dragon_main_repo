import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Cpu, 
  Zap, 
  Layers, 
  Fingerprint, 
  TrendingUp, 
  ShieldCheck, 
  BarChart as BarChartIcon, 
  FlaskConical,
  Target,
  Tractor as Radar,
  Database,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Play,
  History,
  Sparkles
} from 'lucide-react';
import { StockData, TradingBot } from '../types';
import { performAlphaDeepDive, backtestStrategy } from '../services/geminiService';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from 'recharts';

interface AlphaDeepDiveProps {
  stocks: StockData[];
  onAddBot: (bot: TradingBot) => void;
}

const AlphaDeepDive: React.FC<AlphaDeepDiveProps> = ({ stocks, onAddBot }) => {
  const [selectedSymbol, setSelectedSymbol] = useState(stocks[0]?.symbol || 'NVDA');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [step, setStep] = useState<'idle' | 'researching' | 'requesting' | 'backtesting' | 'complete'>('idle');
  const [backtestResult, setBacktestResult] = useState<any>(null);

  const selectedStock = stocks.find(s => s.symbol === selectedSymbol) || stocks[0];

  const startDeepDive = async () => {
    setLoading(true);
    setStep('researching');
    setAnalysis(null);
    setBacktestResult(null);

    // Phase 1: Researching Drivers
    const result = await performAlphaDeepDive(selectedStock);
    setAnalysis(result);
    
    if (result) {
      setTimeout(() => setStep('requesting'), 2000);
    } else {
      setStep('idle');
      setLoading(false);
    }
  };

  const proceedToBacktest = async () => {
    setStep('backtesting');
    
    // Simulate backtesting based on AI suggestion
    if (analysis?.suggestedBacktest) {
      const history = selectedStock.history.map(h => ({
        price: h.price,
        timestamp: h.time
      }));

      const strategy = {
        indicator: analysis.suggestedBacktest.indicator,
        condition: analysis.suggestedBacktest.condition,
        value: analysis.suggestedBacktest.value,
        action: 'buy' as const
      };

      const btResult = await backtestStrategy(selectedSymbol, strategy, history);
      setBacktestResult(btResult);
      setTimeout(() => setStep('complete'), 2000);
    }
    setLoading(false);
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'High': return 'text-emerald-500';
      case 'Medium': return 'text-amber-500';
      case 'Low': return 'text-gray-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="flex-1 bg-black p-6 flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-black flex items-center gap-2 tracking-tighter text-white">
            <Fingerprint className="w-6 h-6 text-indigo-500" />
            ALPHA <span className="text-indigo-500">DEEP DIVE</span>
          </h2>
          <p className="text-xs font-mono text-gray-500 uppercase tracking-widest">Multi-Agent Value Driver Extraction & Strategy Synthesis</p>
        </div>
        
        <div className="flex bg-gray-900 border border-gray-800 rounded-xl p-1">
          {stocks.map(s => (
            <button
              key={s.symbol}
              onClick={() => setSelectedSymbol(s.symbol)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedSymbol === s.symbol ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
            >
              {s.symbol}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-0">
        {/* Left Column: Input and Status */}
        <div className="lg:col-span-4 flex flex-col gap-6 overflow-y-auto no-scrollbar">
          <div className="bg-gray-950 border border-gray-800 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <Radar className="w-24 h-24 text-indigo-500" />
            </div>
            
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Search className="w-4 h-4" /> Initiation Portal
            </h3>

            <div className="space-y-4">
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
                <div className="text-[10px] font-bold text-gray-600 uppercase mb-2">Target Asset</div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-bold text-white">{selectedStock.symbol}</div>
                    <div className="text-xs text-gray-500">{selectedStock.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-mono font-bold text-white">${selectedStock.price}</div>
                    <div className={`text-xs font-bold ${selectedStock.change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {selectedStock.change >= 0 ? '+' : ''}{selectedStock.changePercent}%
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={startDeepDive}
                disabled={loading}
                className="w-full bg-white hover:bg-gray-200 disabled:opacity-50 text-black py-4 rounded-xl font-black text-sm uppercase tracking-tighter flex items-center justify-center gap-2 transition-all"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                Initiate Alpha Deep Dive
              </button>
            </div>
          </div>

          {/* Stepper */}
          <div className="space-y-3">
            {[
              { id: 'researching', label: 'Extracting Price Drivers', icon: Cpu },
              { id: 'requesting', label: 'User Data Verification', icon: Database },
              { id: 'backtesting', label: 'Synthetic Backtesting', icon: History },
              { id: 'complete', label: 'Final Alpha Synthesis', icon: Target }
            ].map((s, idx) => {
              const isCurrent = step === s.id;
              const isPast = ['researching', 'requesting', 'backtesting', 'complete'].indexOf(step) > idx;
              
              return (
                <div 
                  key={s.id}
                  className={`flex items-center gap-4 p-3 rounded-xl border transition-all ${
                    isCurrent ? 'bg-indigo-500/10 border-indigo-500/30' : 
                    isPast ? 'bg-emerald-500/5 border-emerald-500/20 opacity-60' : 
                    'bg-gray-900/20 border-gray-800 opacity-40'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isCurrent ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 
                    isPast ? 'bg-emerald-500/20 text-emerald-500' : 
                    'bg-gray-800 text-gray-500'
                  }`}>
                    {isPast ? <CheckCircle2 className="w-4 h-4" /> : <s.icon className="w-4 h-4" />}
                  </div>
                  <span className={`text-xs font-bold uppercase tracking-widest ${isCurrent ? 'text-white' : 'text-gray-500'}`}>
                    {s.label}
                  </span>
                  {isCurrent && <Loader2 className="w-3 h-3 ml-auto animate-spin text-indigo-500" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Dynamic Content based on Step */}
        <div className="lg:col-span-8 flex flex-col min-h-0 overflow-hidden">
          <AnimatePresence mode="wait">
            {step === 'idle' && (
              <motion.div 
                key="idle"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex-1 flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-gray-800 rounded-3xl"
              >
                <div className="w-20 h-20 rounded-full bg-gray-900 flex items-center justify-center mb-6">
                  <Sparkles className="w-10 h-10 text-indigo-500" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Ready for Analysis</h3>
                <p className="text-gray-500 text-sm max-w-sm">Select an asset and initiate the deep dive to trigger multi-agent research and strategy synthesis.</p>
              </motion.div>
            )}

            {(step === 'researching' || step === 'requesting') && analysis && (
              <motion.div 
                key="research"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex-1 flex flex-col min-h-0"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  {analysis.drivers.map((driver: any, idx: number) => (
                    <div key={idx} className="bg-gray-950 border border-gray-800 rounded-2xl p-5 hover:border-indigo-500/30 transition-all group">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-bold text-white">{driver.name}</h4>
                        <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-900 border border-gray-800 ${getImpactColor(driver.impact)}`}>
                          {driver.impact} Impact
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed font-mono">{driver.description}</p>
                    </div>
                  ))}
                </div>

                {step === 'requesting' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-indigo-600 rounded-3xl p-8 relative overflow-hidden shadow-2xl"
                  >
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                      <Database className="w-32 h-32 text-white" />
                    </div>
                    <h3 className="text-2xl font-black text-white mb-4 tracking-tighter uppercase">Data Verification Required</h3>
                    <p className="text-indigo-100 text-sm mb-6 max-w-md">To confirm Alpha status, please verify the following metrics. These are simulated for this demonstration.</p>
                    
                    <div className="space-y-3 mb-8">
                      {analysis.requestedData.map((data: string, idx: number) => (
                        <div key={idx} className="flex items-center gap-3 bg-white/10 border border-white/10 rounded-xl p-4">
                          <div className="w-6 h-6 rounded-full bg-white text-indigo-600 flex items-center justify-center text-xs font-bold">{idx + 1}</div>
                          <span className="text-white font-bold text-sm uppercase tracking-tight">{data}</span>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={proceedToBacktest}
                      className="bg-white text-indigo-600 px-8 py-3 rounded-xl font-black text-sm uppercase tracking-tighter flex items-center gap-2 hover:scale-105 transition-all shadow-lg"
                    >
                      Verify & Run Synthetic Backtest <ArrowRight className="w-4 h-4" />
                    </button>
                  </motion.div>
                )}
              </motion.div>
            )}

            {(step === 'backtesting' || step === 'complete') && backtestResult && (
              <motion.div 
                key="backtest"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex-1 flex flex-col min-h-0"
              >
                <div className="bg-gray-900/50 border border-gray-800 rounded-3xl p-8 mb-8 flex flex-col flex-1">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">Synthetic Equity Curve</h3>
                      <p className="text-xs text-gray-500 font-mono">Strategy: {analysis.suggestedBacktest.indicator} {analysis.suggestedBacktest.condition} {analysis.suggestedBacktest.value}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-bold text-gray-600 uppercase mb-1 tracking-widest">Efficiency Rating</div>
                      <div className="text-2xl font-bold font-mono text-emerald-500">{backtestResult.winRate.toFixed(1)}%</div>
                    </div>
                  </div>

                  <div className="flex-1 min-h-0 mb-8">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={backtestResult.equityCurve}>
                        <defs>
                          <linearGradient id="colorAlpha" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                        <XAxis hide dataKey="timestamp" />
                        <YAxis hide domain={['auto', 'auto']} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#000', border: '1px solid #374151', borderRadius: '12px', fontSize: '10px' }}
                          itemStyle={{ color: '#818cf8' }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="equity" 
                          stroke="#818cf8" 
                          strokeWidth={3}
                          fillOpacity={1} 
                          fill="url(#colorAlpha)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="grid grid-cols-3 gap-6">
                    <div className="bg-gray-950/50 p-4 rounded-2xl border border-gray-800">
                      <div className="text-[10px] font-bold text-gray-600 uppercase mb-1">Total Return</div>
                      <div className="text-xl font-bold font-mono text-emerald-500">+{backtestResult.totalReturn.toFixed(2)}%</div>
                    </div>
                    <div className="bg-gray-950/50 p-4 rounded-2xl border border-gray-800">
                      <div className="text-[10px] font-bold text-gray-600 uppercase mb-1">Max Drawdown</div>
                      <div className="text-xl font-bold font-mono text-rose-500">-{Math.abs(backtestResult.maxDrawdown).toFixed(2)}%</div>
                    </div>
                    <div className="bg-gray-950/50 p-4 rounded-2xl border border-gray-800">
                      <div className="text-[10px] font-bold text-gray-600 uppercase mb-1">Trade Count</div>
                      <div className="text-xl font-bold font-mono text-white">{backtestResult.trades}</div>
                    </div>
                  </div>
                </div>

                {step === 'complete' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-emerald-500 rounded-3xl p-8 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-white border border-white/20 backdrop-blur-sm">
                        <Target className="w-8 h-8" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white mb-1">Alpha Bot Proposed</h3>
                        <p className="text-emerald-50 text-xs font-mono max-w-lg">{analysis.alphaVerdict}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        onAddBot({
                          id: `alpha-${Date.now()}`,
                          name: `Alpha ${selectedSymbol}`,
                          symbol: selectedSymbol,
                          exchange: 'Dragon-X',
                          type: 'multi-agent-swarm',
                          status: 'active',
                          pnl: 0,
                          pnlPercent: 0,
                          trades: 0,
                          strategy: {
                            indicator: analysis.suggestedBacktest.indicator,
                            condition: analysis.suggestedBacktest.condition,
                            value: analysis.suggestedBacktest.value,
                            action: 'buy'
                          },
                          aiDescription: analysis.alphaVerdict,
                          isLive: false,
                          autoMode: true,
                          dataSources: [],
                        });
                        alert('Alpha Bot Deployed to Bot Lab!');
                      }}
                      className="bg-black text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-tighter hover:bg-gray-900 transition-all"
                    >
                      Deploy Alpha Bot
                    </button>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default AlphaDeepDive;
