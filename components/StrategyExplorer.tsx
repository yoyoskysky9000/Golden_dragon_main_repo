import React, { useState } from 'react';
import { 
  Settings, 
  Play, 
  Sparkles, 
  TrendingUp, 
  ShieldCheck, 
  BarChart, 
  Activity,
  History,
  Target,
  FlaskConical,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ChevronRight,
  RefreshCw,
  LineChart as LineChartIcon
} from 'lucide-react';
import { StockData, TradingBot } from '../types';
import { backtestStrategy, optimizeStrategy, generateAIStrategy, tuneParameters } from '../services/geminiService';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area 
} from 'recharts';

interface StrategyExplorerProps {
  stocks: StockData[];
}

const StrategyExplorer: React.FC<StrategyExplorerProps> = ({ stocks }) => {
  const [selectedSymbol, setSelectedSymbol] = useState(stocks[0]?.symbol || 'NVDA');
  const [strategy, setStrategy] = useState<TradingBot['strategy']>({
    indicator: 'RSI',
    condition: 'LT',
    value: '30',
    action: 'buy'
  });

  const [isBacktesting, setIsBacktesting] = useState(false);
  const [backtestResult, setBacktestResult] = useState<any>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<any>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isTuning, setIsTuning] = useState(false);
  const [tuningResult, setTuningResult] = useState<any>(null);

  const selectedStock = stocks.find(s => s.symbol === selectedSymbol) || stocks[0];

  const handleGenerateAIStrategy = async () => {
    if (!selectedStock) return;
    setIsGeneratingAI(true);
    try {
      const aiStrategy = await generateAIStrategy(selectedStock);
      if (aiStrategy) {
        setStrategy(aiStrategy);
      }
    } catch (e) {
      console.error("AI strategy generation error", e);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleBacktest = async () => {
    if (!selectedStock) return;
    setIsBacktesting(true);
    setBacktestResult(null);
    setOptimizationResult(null);
    setTuningResult(null);
    
    // Simulate real history with some added metadata for the AI
    const history = selectedStock.history.map(h => ({
      price: h.price,
      timestamp: h.time
    }));

    const result = await backtestStrategy(selectedSymbol, strategy, history);
    setBacktestResult(result);
    setIsBacktesting(false);
  };

  const handleOptimize = async () => {
    if (!selectedStock) return;
    setIsOptimizing(true);
    setOptimizationResult(null);
    setTuningResult(null);

    // Mock bot to reuse optimization service
    const mockBot: TradingBot = {
      id: 'explorer-mock',
      name: 'Strategy Explorer Bot',
      symbol: selectedSymbol,
      type: 'custom',
      status: 'active',
      pnl: 0,
      pnlPercent: 0,
      trades: backtestResult?.trades || 0,
      strategy: strategy,
      autoMode: false,
      isLive: false,
      dataSources: []
    };

    const performance = {
      pnl: backtestResult?.totalReturn || 0,
      trades: backtestResult?.trades || 0
    };

    const result = await optimizeStrategy(mockBot, selectedStock, performance);
    setOptimizationResult(result);
    setIsOptimizing(false);
  };

  const applyOptimization = () => {
    if (optimizationResult?.strategy) {
      setStrategy(optimizationResult.strategy);
      setOptimizationResult(null);
    }
  };

  const handleTuneParameters = async () => {
    if (!selectedStock || !backtestResult) return;
    setIsTuning(true);
    setTuningResult(null);
    setOptimizationResult(null);

    try {
      const result = await tuneParameters(selectedSymbol, strategy, backtestResult, selectedStock);
      if (result) {
        setTuningResult(result);
      }
    } catch (e) {
      console.error("Tuning failed", e);
    } finally {
      setIsTuning(false);
    }
  };

  const applyTuning = () => {
    if (tuningResult) {
      setStrategy({
        indicator: tuningResult.indicator,
        condition: tuningResult.condition,
        value: tuningResult.value,
        action: tuningResult.action
      });
      setTuningResult(null);
    }
  };

  return (
    <div className="flex-1 bg-gray-950 p-6 flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold font-serif flex items-center gap-2">
            <FlaskConical className="w-6 h-6 text-indigo-500" />
            Strategy <span className="text-indigo-500">Explorer</span>
          </h2>
          <p className="text-sm text-gray-500">Simulation-driven strategy optimization & risk modeling</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 h-full min-h-0 overflow-hidden">
        {/* Left Panel: Configuration */}
        <div className="xl:col-span-4 flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-white">
              <Settings className="w-5 h-5 text-gray-400" />
              Strategy Parameters
            </h3>

            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Asset Selection</label>
                <select 
                  value={selectedSymbol}
                  onChange={(e) => setSelectedSymbol(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 font-bold"
                >
                  {stocks.map(s => (
                    <option key={s.symbol} value={s.symbol}>{s.symbol} - {s.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Indicator</label>
                  <select 
                    value={strategy.indicator}
                    onChange={(e) => setStrategy({...strategy, indicator: e.target.value})}
                    className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="RSI">RSI (Relative Strength Index)</option>
                    <option value="MACD">MACD (Crossover)</option>
                    <option value="SMA50">SMA 50 (Moving Average)</option>
                    <option value="EMA20">EMA 20 (Exponential MA)</option>
                    <option value="Bollinger">Bollinger Bands</option>
                    <option value="SUPER_TREND">Super Trend</option>
                    <option value="STOCH_RSI">Stochastic RSI</option>
                    <option value="SAR">Parabolic SAR</option>
                    <option value="RESISTANCE">Resistance Level / Breakout</option>
                    <option value="SUPPORT">Support Level / Bounce</option>
                    <option value="CUSTOM_COMBO">Custom AI Combo Signal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Condition</label>
                  <select 
                    value={strategy.condition}
                    onChange={(e) => setStrategy({...strategy, condition: e.target.value})}
                    className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="LT">Less Than (&lt;)</option>
                    <option value="GT">Greater Than (&gt;)</option>
                    <option value="EQ">Equal To (=)</option>
                    <option value="CROSS_UP">Crosses Up</option>
                    <option value="CROSS_DOWN">Crosses Down</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Threshold Value</label>
                <input 
                  type="text"
                  value={strategy.value}
                  onChange={(e) => setStrategy({...strategy, value: e.target.value})}
                  className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 font-mono"
                  placeholder="e.g. 30, 70, Cross"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Execution Action</label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => setStrategy({...strategy, action: 'buy'})}
                    className={`py-3 rounded-xl font-bold transition-all border ${strategy.action === 'buy' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500' : 'bg-gray-950 border-gray-700 text-gray-500'}`}
                  >
                    Buy
                  </button>
                  <button 
                    onClick={() => setStrategy({...strategy, action: 'sell'})}
                    className={`py-3 rounded-xl font-bold transition-all border ${strategy.action === 'sell' ? 'bg-rose-500/10 border-rose-500 text-rose-500' : 'bg-gray-950 border-gray-700 text-gray-500'}`}
                  >
                    Sell
                  </button>
                </div>
              </div>

              <div className="pt-4 space-y-3">
                <button 
                  onClick={handleGenerateAIStrategy}
                  disabled={isGeneratingAI}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-cyan-800 disabled:opacity-50 text-white py-3 rounded-xl font-bold shadow-lg shadow-cyan-900/20 transition-all flex items-center justify-center gap-2"
                >
                  {isGeneratingAI ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                  Generate Strategy via AI
                </button>

                <button 
                  onClick={handleBacktest}
                  disabled={isBacktesting}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:opacity-50 text-white py-4 rounded-xl font-bold shadow-lg shadow-indigo-900/20 transition-all flex items-center justify-center gap-2"
                >
                  {isBacktesting ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                  Run Backtest Simulation
                </button>
                
                {backtestResult && (
                  <div className="flex gap-2">
                    <button 
                      onClick={handleOptimize}
                      disabled={isOptimizing}
                      className="flex-1 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-200 py-3 rounded-xl font-bold border border-gray-700 transition-all flex items-center justify-center gap-2 text-sm"
                    >
                      {isOptimizing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-amber-500" />}
                      Apply AI Suggestions
                    </button>
                    <button 
                      onClick={handleTuneParameters}
                      disabled={isTuning}
                      className="flex-1 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-200 py-3 rounded-xl font-bold border border-gray-700 transition-all flex items-center justify-center gap-2 text-sm"
                    >
                      {isTuning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4 text-indigo-400" />}
                      Tune Parameters
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {optimizationResult && (
            <div className="bg-gray-900 border border-amber-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden animate-in slide-in-from-bottom-5 duration-500">
              <div className="absolute top-0 right-0 p-3">
                <div className="bg-amber-500 text-gray-950 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> BEST FIT
                </div>
              </div>
              <h3 className="text-base font-bold mb-3 text-amber-500 flex items-center gap-2">
                AI Optimization Detected
              </h3>
              <p className="text-xs text-gray-400 mb-4 leading-relaxed font-mono">
                {optimizationResult.reasoning}
              </p>
              
              <div className="bg-gray-950 border border-gray-800 rounded-xl p-3 mb-4 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500">Expected Score Improvement</span>
                  <span className="text-emerald-500 font-bold">+{optimizationResult.score}%</span>
                </div>
                <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: `${optimizationResult.score}%` }}></div>
                </div>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={applyOptimization}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-gray-950 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                >
                  Apply AI Suggestions
                </button>
                <button 
                  onClick={handleTuneParameters}
                  disabled={isTuning}
                  className="flex-1 bg-indigo-500 hover:bg-indigo-400 text-white py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                >
                  {isTuning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4" />}
                  Tune Parameters
                </button>
              </div>
            </div>
          )}

          {tuningResult && (
            <div className="bg-gray-900 border border-indigo-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden animate-in slide-in-from-bottom-5 duration-500">
              <div className="absolute top-0 right-0 p-3">
                <div className="bg-indigo-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Settings className="w-3 h-3" /> TUNED
                </div>
              </div>
              <h3 className="text-base font-bold mb-3 text-indigo-400 flex items-center gap-2">
                Suggested Parameters
              </h3>
              <p className="text-xs text-gray-400 mb-4 leading-relaxed font-mono">
                {tuningResult.reasoning}
              </p>
              
              <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 mb-4 grid grid-cols-2 gap-4">
                <div>
                   <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Indicator</div>
                   <div className="text-sm text-white font-bold">{tuningResult.indicator}</div>
                </div>
                <div>
                   <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Condition</div>
                   <div className="text-sm text-white font-bold">{tuningResult.condition} {tuningResult.value}</div>
                </div>
              </div>

              <button 
                onClick={applyTuning}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
              >
                Apply Tuned Parameters
              </button>
            </div>
          )}
        </div>

        {/* Right Panel: Results */}
        <div className="xl:col-span-8 flex flex-col gap-6 overflow-hidden min-h-0">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gray-800 flex items-center justify-center border border-gray-700">
                  <History className="w-6 h-6 text-gray-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white leading-tight">Simulation Results</h3>
                  <div className="flex gap-4 mt-1">
                    <span className="text-xs text-gray-500 flex items-center gap-1"><History className="w-3 h-3" /> Historical Snapshot</span>
                    <span className="text-xs text-gray-500 flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Isolated Environment</span>
                  </div>
                </div>
              </div>

              {backtestResult && (
                <div className="flex gap-3">
                  <div className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-500 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-xs font-bold font-mono">COMPLETE</span>
                  </div>
                </div>
              )}
            </div>

            {backtestResult ? (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-gray-950 border border-gray-800 rounded-2xl p-4">
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Total Return</div>
                    <div className={`text-xl font-bold font-mono ${backtestResult.totalReturn >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {backtestResult.totalReturn > 0 ? '+' : ''}{backtestResult.totalReturn.toFixed(2)}%
                    </div>
                  </div>
                  <div className="bg-gray-950 border border-gray-800 rounded-2xl p-4">
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Win Rate</div>
                    <div className="text-xl font-bold font-mono text-indigo-400">
                      {backtestResult.winRate.toFixed(1)}%
                    </div>
                  </div>
                  <div className="bg-gray-950 border border-gray-800 rounded-2xl p-4">
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Max Drawdown</div>
                    <div className="text-xl font-bold font-mono text-rose-400">
                      -{Math.abs(backtestResult.maxDrawdown).toFixed(2)}%
                    </div>
                  </div>
                  <div className="bg-gray-950 border border-gray-800 rounded-2xl p-4">
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Trade Count</div>
                    <div className="text-xl font-bold font-mono text-amber-400">
                      {backtestResult.trades}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <div className="bg-gray-950 border border-gray-800 rounded-2xl p-4">
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Sharpe Ratio</div>
                    <div className="text-xl font-bold font-mono text-white">
                      {backtestResult.sharpeRatio?.toFixed(2) || '0.00'}
                    </div>
                  </div>
                  <div className="bg-gray-950 border border-gray-800 rounded-2xl p-4">
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Sortino Ratio</div>
                    <div className="text-xl font-bold font-mono text-white">
                      {backtestResult.sortinoRatio?.toFixed(2) || '0.00'}
                    </div>
                  </div>
                  <div className="bg-gray-950 border border-gray-800 rounded-2xl p-4">
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Max Cons. Wins</div>
                    <div className="text-xl font-bold font-mono text-emerald-400">
                      {backtestResult.maxConsecutiveWins || '0'}
                    </div>
                  </div>
                  <div className="bg-gray-950 border border-gray-800 rounded-2xl p-4">
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Max Cons. Losses</div>
                    <div className="text-xl font-bold font-mono text-rose-400">
                      {backtestResult.maxConsecutiveLosses || '0'}
                    </div>
                  </div>
                </div>

                <div className="flex-1 min-h-0 mb-8 bg-gray-950/50 rounded-2xl border border-gray-800/50 p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                       <BarChart className="w-3 h-3" /> Simulated Equity Curve
                    </h4>
                  </div>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={backtestResult.equityCurve}>
                      <defs>
                        <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                      <XAxis 
                        dataKey="timestamp" 
                        stroke="#4b5563" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false}
                        tickFormatter={(val) => val.split(' ')[1] || val}
                      />
                      <YAxis 
                        stroke="#4b5563" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false}
                        tickFormatter={(val) => `$${val}`}
                        domain={['auto', 'auto']}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '12px', fontSize: '10px' }}
                        itemStyle={{ color: '#6366f1' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="equity" 
                        stroke="#6366f1" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorEquity)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-5">
                   <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                     <Target className="w-3 h-3" /> Strategy Verdict
                   </h4>
                   <p className="text-sm text-gray-400 leading-relaxed font-mono">
                     {backtestResult.reasoning}
                   </p>
                </div>
              </div>
            ) : isBacktesting ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 relative mb-6">
                  <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                  <Play className="absolute inset-0 m-auto w-8 h-8 text-indigo-500 animate-pulse" />
                </div>
                <h4 className="text-lg font-bold text-white mb-2 font-serif">Simulating Alpha Core...</h4>
                <p className="text-sm text-gray-500 max-w-xs">AI engine is brute-forcing strategy combinations across historical price data.</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40 grayscale">
                <LineChartIcon className="w-16 h-16 text-gray-700 mb-6" />
                <h4 className="text-lg font-bold text-gray-500 mb-2">No Simulation Active</h4>
                <p className="text-sm text-gray-400 max-w-xs">Configure strategy parameters on the left to begin backtesting and optimization.</p>
              </div>
            )}
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl h-48">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" /> Real-time Market Sentiment
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center gap-4">
                <div className="text-2xl font-bold font-mono text-emerald-500">65%</div>
                <div className="flex-1">
                  <div className="text-[10px] font-bold text-gray-600 uppercase">Bullish Sentiment</div>
                  <div className="h-1 bg-gray-800 rounded-full mt-1 overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: '65%' }}></div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-2xl font-bold font-mono text-indigo-500">42</div>
                <div className="flex-1">
                  <div className="text-[10px] font-bold text-gray-600 uppercase">Volatility Index</div>
                  <div className="h-1 bg-gray-800 rounded-full mt-1 overflow-hidden">
                    <div className="h-full bg-indigo-500" style={{ width: '42%' }}></div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-2xl font-bold font-mono text-amber-500">Neutral</div>
                <div className="flex-1">
                  <div className="text-[10px] font-bold text-gray-600 uppercase">Trend Consensus</div>
                  <div className="h-1 bg-gray-800 rounded-full mt-1 overflow-hidden">
                    <div className="h-full bg-amber-500" style={{ width: '50%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StrategyExplorer;
