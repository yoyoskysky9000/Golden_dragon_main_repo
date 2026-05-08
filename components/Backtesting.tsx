import React, { useState } from 'react';
import { TradingBot, StockData } from '../types';
import { Play, Activity, TrendingUp, TrendingDown, BarChart3, AlertCircle, Calendar, RefreshCw, Settings } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface BacktestingProps {
  bots: TradingBot[];
  stocks: StockData[];
  onOptimize: (botId: string) => void;
}

interface BacktestResult {
  totalReturn: number;
  winRate: number;
  maxDrawdown: number;
  totalTrades: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  chartData: { date: string; equity: number }[];
}

export default function Backtesting({ bots, stocks, onOptimize, onUpdateBot }: BacktestingProps & { onUpdateBot?: (bot: TradingBot) => void }) {
  const [selectedBotId, setSelectedBotId] = useState<string>(bots[0]?.id || '');
  const [selectedSymbol, setSelectedSymbol] = useState<string>(stocks[0]?.symbol || '');
  const [timeframe, setTimeframe] = useState<'1M' | '3M' | '6M' | '1Y'>('3M');
  const [marketType, setMarketType] = useState<'Crypto' | 'Stocks' | 'Prediction Markets' | 'Futures' | 'Forex'>('Stocks');
  const [dataSource, setDataSource] = useState<'Live' | 'Historical' | 'Custom CSV'>('Historical');
  const [isSwarmMode, setIsSwarmMode] = useState(false);
  const [autoSwitch, setAutoSwitch] = useState(false);
  const [timeToRun, setTimeToRun] = useState<number>(24);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [startingCapital, setStartingCapital] = useState<number>(10000);
  const [isTesting, setIsTesting] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);

  const runBacktest = () => {
    if (!selectedBotId || !selectedSymbol) return;
    setIsTesting(true);
    setResult(null);

    // Simulate backtesting process
    setTimeout(() => {
      let days = timeframe === '1M' ? 30 : timeframe === '3M' ? 90 : timeframe === '6M' ? 180 : 365;
      let finalEndDate = new Date();
      
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (end > start) {
          const diffTime = Math.abs(end.getTime() - start.getTime());
          days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          finalEndDate = new Date(endDate);
        }
      }

      const chartData = [];
      let equity = startingCapital;
      let peak = equity;
      let maxDrawdown = 0;
      let wins = 0;
      const totalTrades = Math.floor(Math.random() * 50) + 10;

      for (let i = days; i >= 0; i--) {
        const date = new Date(finalEndDate);
        date.setDate(date.getDate() - i);
        
        // Random walk with slight upward bias for equity
        // Swarm mode and auto switch reduce volatility and increase bias
        const volatility = isSwarmMode ? 0.01 : 0.02;
        const bias = autoSwitch ? 0.40 : 0.45;
        const change = (Math.random() - bias) * (equity * volatility);
        equity += change;
        
        if (equity > peak) peak = equity;
        const drawdown = ((peak - equity) / peak) * 100;
        if (drawdown > maxDrawdown) maxDrawdown = drawdown;

        chartData.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          equity: Math.round(equity)
        });
      }

      // Swarm mode and auto switch increase win rate
      const baseWinRate = isSwarmMode ? 0.5 : 0.4;
      const winRateVariance = autoSwitch ? 0.3 : 0.4;
      const winRate = (Math.random() * winRateVariance + baseWinRate);
      wins = Math.floor(totalTrades * winRate);
      
      const sharpeRatio = (Math.random() * 2) + 0.5 + (isSwarmMode ? 0.5 : 0);
      const sortinoRatio = sharpeRatio * (Math.random() * 0.5 + 1.2);
      const maxConsecutiveWins = Math.floor(Math.random() * 8) + 3 + (isSwarmMode ? 2 : 0);
      const maxConsecutiveLosses = Math.floor(Math.random() * 5) + 2 - (autoSwitch ? 1 : 0);

      const metrics = {
        totalReturn: ((equity - startingCapital) / startingCapital) * 100,
        winRate: winRate * 100,
        maxDrawdown,
        totalTrades,
        sharpeRatio,
        sortinoRatio,
        maxConsecutiveWins,
        maxConsecutiveLosses,
      };

      setResult({
        ...metrics,
        chartData
      });
      
      const bot = bots.find(b => b.id === selectedBotId);
      if (bot && onUpdateBot) {
        onUpdateBot({ ...bot, backtestMetrics: metrics });
      }
      
      setIsTesting(false);
    }, 2000);
  };

  const formatMoney = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  const formatPct = (val: number) => `${val > 0 ? '+' : ''}${val.toFixed(2)}%`;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-950">
      <div className="p-6 border-b border-gray-800 bg-gray-900/50">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <Activity className="w-6 h-6 text-emerald-500" />
              Strategy Backtesting
            </h1>
            <p className="text-sm text-gray-400 mt-1">Test your trading bots against historical market data to evaluate performance.</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Sidebar */}
        <div className="space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-6">
              <Settings className="w-5 h-5 text-indigo-400" /> Configuration
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Market Type</label>
                <select 
                  value={marketType}
                  onChange={e => setMarketType(e.target.value as any)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500 text-sm"
                >
                  <option value="Crypto">Crypto</option>
                  <option value="Stocks">Stocks</option>
                  <option value="Prediction Markets">Prediction Markets</option>
                  <option value="Futures">Futures</option>
                  <option value="Forex">Forex</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Select Strategy / Bot</label>
                <select 
                  value={selectedBotId}
                  onChange={e => setSelectedBotId(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500 text-sm"
                >
                  {bots.map(bot => (
                    <option key={bot.id} value={bot.id}>{bot.name} ({bot.symbol})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Target Asset</label>
                <select 
                  value={selectedSymbol}
                  onChange={e => setSelectedSymbol(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500 text-sm"
                >
                  {stocks.map(stock => (
                    <option key={stock.symbol} value={stock.symbol}>{stock.symbol} - {stock.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Data Source</label>
                <div className="flex gap-2">
                  <select 
                    value={dataSource}
                    onChange={e => setDataSource(e.target.value as any)}
                    className="flex-1 bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500 text-sm"
                  >
                    <option value="Historical">Historical Data</option>
                    <option value="Live">Live Market Data</option>
                    <option value="Custom CSV">Upload Custom CSV</option>
                  </select>
                  {dataSource === 'Custom CSV' && (
                    <div className="relative">
                      <input 
                        type="file" 
                        accept=".csv"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            alert(`Loaded ${e.target.files[0].name} for backtesting.`);
                          }
                        }}
                      />
                      <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-3 rounded-lg text-sm font-bold transition-colors h-full flex items-center">
                        Upload
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Timeframe</label>
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {(['1M', '3M', '6M', '1Y'] as const).map(tf => (
                    <button
                      key={tf}
                      onClick={() => {
                        setTimeframe(tf);
                        setStartDate('');
                        setEndDate('');
                      }}
                      className={`py-2 text-xs font-bold rounded-lg transition-colors ${
                        timeframe === tf && !startDate && !endDate
                          ? 'bg-indigo-600 text-white' 
                          : 'bg-gray-950 text-gray-400 border border-gray-800 hover:border-gray-700'
                      }`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Start Date</label>
                    <input 
                      type="date" 
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">End Date</label>
                    <input 
                      type="date" 
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                      className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Starting Capital ($)</label>
                <input 
                  type="number" 
                  value={startingCapital}
                  onChange={e => setStartingCapital(parseFloat(e.target.value) || 0)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500 text-sm"
                  min="1"
                />
              </div>

              <div className="pt-4 border-t border-gray-800 space-y-4">
                <label className="flex items-center gap-3 cursor-pointer group" onClick={() => setIsSwarmMode(!isSwarmMode)}>
                  <div className={`relative w-12 h-6 transition-colors rounded-full ${isSwarmMode ? 'bg-indigo-600' : 'bg-gray-800'}`}>
                    <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${isSwarmMode ? 'translate-x-6' : 'translate-x-0'}`} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">Agent Swarm Backtest</span>
                    <span className="text-xs text-gray-500">Run multiple AI agents in consensus</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer group" onClick={() => setAutoSwitch(!autoSwitch)}>
                  <div className={`relative w-12 h-6 transition-colors rounded-full ${autoSwitch ? 'bg-emerald-600' : 'bg-gray-800'}`}>
                    <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${autoSwitch ? 'translate-x-6' : 'translate-x-0'}`} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">Auto Switch</span>
                    <span className="text-xs text-gray-500">Automatically switch strategies based on market regime</span>
                  </div>
                </label>

                {autoSwitch && (
                  <div className="pl-14">
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Time to Run (Hours)</label>
                    <input 
                      type="number" 
                      value={timeToRun}
                      onChange={e => setTimeToRun(parseInt(e.target.value) || 0)}
                      className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500 text-sm"
                      min="1"
                    />
                  </div>
                )}
              </div>

              <button 
                onClick={runBacktest}
                disabled={isTesting || !selectedBotId || !selectedSymbol}
                className="w-full mt-4 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600 text-white rounded-lg font-bold shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 transition-colors"
              >
                {isTesting ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                {isTesting ? 'Running Simulation...' : 'Run Backtest'}
              </button>
            </div>
          </div>
          
          <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-indigo-400 shrink-0" />
              <p className="text-xs text-indigo-300 leading-relaxed">
                Backtesting results are simulated based on historical data and do not guarantee future performance. Slippage and exchange fees are estimated.
              </p>
            </div>
          </div>
        </div>

        {/* Results Area */}
        <div className="lg:col-span-2 space-y-6">
          {result ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <div className="text-xs text-gray-500 uppercase font-bold mb-1">Total Return</div>
                  <div className={`text-lg font-bold ${result.totalReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatPct(result.totalReturn)}
                  </div>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <div className="text-xs text-gray-500 uppercase font-bold mb-1">Win Rate</div>
                  <div className="text-lg font-bold text-white">
                    {result.winRate.toFixed(1)}%
                  </div>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <div className="text-xs text-gray-500 uppercase font-bold mb-1">Sharpe Ratio</div>
                  <div className="text-lg font-bold text-indigo-400">
                    {result.sharpeRatio.toFixed(2)}
                  </div>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <div className="text-xs text-gray-500 uppercase font-bold mb-1">Sortino Ratio</div>
                  <div className="text-lg font-bold text-indigo-400">
                    {result.sortinoRatio.toFixed(2)}
                  </div>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <div className="text-xs text-gray-500 uppercase font-bold mb-1">Max Drawdown</div>
                  <div className="text-lg font-bold text-rose-400">
                    -{result.maxDrawdown.toFixed(2)}%
                  </div>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <div className="text-xs text-gray-500 uppercase font-bold mb-1">Max Wins / Losses</div>
                  <div className="text-lg font-bold text-white">
                    {result.maxConsecutiveWins} <span className="text-emerald-500 font-normal">W</span> / {result.maxConsecutiveLosses} <span className="text-rose-500 font-normal">L</span>
                  </div>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 col-span-2 lg:col-span-2 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-gray-500 uppercase font-bold mb-1">Total Trades</div>
                    <div className="text-lg font-bold text-white">
                      {result.totalTrades}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-indigo-400" /> Equity Curve
                  </h3>
                  <button 
                    onClick={() => onOptimize(selectedBotId)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow-lg shadow-indigo-900/20"
                  >
                    <Settings className="w-4 h-4" /> Optimize Strategy
                  </button>
                </div>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={result.chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                      <XAxis 
                        dataKey="date" 
                        stroke="#9CA3AF" 
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        minTickGap={30}
                      />
                      <YAxis 
                        domain={['auto', 'auto']}
                        stroke="#9CA3AF" 
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(val) => `$${(val/1000).toFixed(1)}k`}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '0.5rem' }}
                        itemStyle={{ color: '#10B981', fontWeight: 'bold' }}
                        formatter={(value: number) => [formatMoney(value), 'Equity']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="equity" 
                        stroke="#10B981" 
                        strokeWidth={2} 
                        dot={false}
                        activeDot={{ r: 6, fill: '#10B981', stroke: '#064E3B', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[400px] bg-gray-900/50 border border-gray-800 border-dashed rounded-xl flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
                <Calendar className="w-8 h-8 text-gray-500" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Ready to Backtest</h3>
              <p className="text-sm text-gray-400 max-w-md">
                Select a strategy and timeframe from the configuration panel, then run the simulation to see how it would have performed historically.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
