import React, { useState, useMemo } from 'react';
import { TradingBot, DataSource, StockData, SignalLog } from '../types';
import { ArrowLeft, Play, BarChart2, Calendar, Target, Activity, CheckCircle2, TrendingUp, TrendingDown, DollarSign, Database, BrainCircuit, RotateCcw } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, YAxis, XAxis, CartesianGrid, Tooltip, AreaChart, Area } from 'recharts';

interface BacktestModuleProps {
  bots: TradingBot[];
  dataSources: DataSource[];
  stocks: StockData[];
  onClose: () => void;
  initialBotId?: string | null;
}

export const BacktestModule: React.FC<BacktestModuleProps> = ({ bots, dataSources, stocks, onClose, initialBotId }) => {
  const [selectedBotId, setSelectedBotId] = useState<string>(initialBotId || '');
  const [timeframe, setTimeframe] = useState<string>('1M'); // '1W', '1M', '3M', '6M', '1Y'
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [results, setResults] = useState<any | null>(null);

  const activeBot = bots.find(b => b.id === selectedBotId);

  const handleSimulate = () => {
    if (!selectedBotId) return;
    setIsSimulating(true);
    setResults(null);

    // Simulate a backtest
    setTimeout(() => {
      const winRate = 45 + Math.random() * 25; // 45% - 70%
      const totalReturn = (Math.random() - 0.2) * 30; // -6% to +24%
      const maxDrawdown = -(Math.random() * 15 + 5); // -5% to -20%
      const totalTrades = Math.floor(Math.random() * 300) + 50;
      const sharpeRatio = (Math.random() * 2 + 0.5).toFixed(2);
      const profitFactor = (Math.random() * 1.5 + 0.8).toFixed(2);

      // Generate sparkline equity curve
      let equity = 10000;
      const history = Array.from({ length: 30 }).map((_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (30 - i));
        
        let change = 0;
        if (i > 0) {
           const isWin = Math.random() < winRate / 100;
           const changeAmount = Math.random() * 200 + 50;
           change = isWin ? changeAmount : -changeAmount * 0.9;
        }
        equity += change;

        return {
          date: date.toLocaleDateString(),
          equity: equity
        };
      });

      setResults({
        winRate,
        totalReturn,
        maxDrawdown,
        totalTrades,
        sharpeRatio,
        profitFactor,
        history,
        initialCapital: 10000,
        finalCapital: equity
      });
      setIsSimulating(false);
    }, 1500);
  };

  const toggleSource = (sourceId: string) => {
    setSelectedSourceIds(prev => 
      prev.includes(sourceId) 
        ? prev.filter(id => id !== sourceId)
        : [...prev, sourceId]
    );
  };

  // Pre-select bot's sources if a bot is chosen and no sources are selected yet
  React.useEffect(() => {
    if (activeBot && selectedSourceIds.length === 0) {
      if (activeBot.dataSources) {
         setSelectedSourceIds(activeBot.dataSources.map(ds => ds.id));
      }
    }
  }, [activeBot]);

  return (
    <div className="flex-1 bg-gray-950 p-6 flex flex-col h-full overflow-hidden">
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
                <button 
                    onClick={onClose}
                    className="p-2 bg-gray-900 border border-gray-800 rounded-xl text-gray-400 hover:text-white transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Activity className="w-6 h-6 text-purple-500" />
                        Simulation Sandbox
                    </h2>
                    <p className="text-sm text-gray-500">Backtest your trading constructs across historical datasets.</p>
                </div>
            </div>
        </div>

        <div className="flex gap-6 h-full overflow-hidden">
            {/* Left Panel: Configuration */}
            <div className="w-1/3 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar pb-10">
                
                <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-5">
                    <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Target className="w-4 h-4 text-emerald-500" /> Target Construct
                    </h3>
                    {bots.length === 0 ? (
                        <div className="text-sm text-gray-500 italic">No bots available. Create one first.</div>
                    ) : (
                        <div className="space-y-2">
                            {bots.map(bot => (
                                <button
                                    key={bot.id}
                                    onClick={() => setSelectedBotId(bot.id)}
                                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                                        selectedBotId === bot.id 
                                        ? 'bg-purple-500/10 border-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.15)]' 
                                        : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-700 hover:bg-gray-900'
                                    }`}
                                >
                                    <div className="font-bold flex items-center justify-between">
                                        {bot.name}
                                        <span className="text-[10px] uppercase font-black tracking-wider text-gray-500">{bot.symbol}</span>
                                    </div>
                                    <div className="text-xs mt-1 font-mono opacity-60">Type: {bot.type}</div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-5">
                    <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-blue-500" /> Temporal Range
                    </h3>
                    <div className="grid grid-cols-5 gap-2">
                        {['1W', '1M', '3M', '6M', '1Y'].map(tf => (
                            <button
                                key={tf}
                                onClick={() => setTimeframe(tf)}
                                className={`py-2 rounded-lg text-xs font-bold transition-all ${
                                    timeframe === tf 
                                    ? 'bg-blue-500 text-white shadow-[0_0_10px_rgba(59,130,246,0.3)]' 
                                    : 'bg-gray-950 text-gray-500 hover:bg-gray-800'
                                }`}
                            >
                                {tf}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-5">
                    <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Database className="w-4 h-4 text-amber-500" /> Data Feeds
                    </h3>
                    <div className="space-y-2">
                        {dataSources.map(ds => {
                            const isSelected = selectedSourceIds.includes(ds.id);
                            return (
                                <button
                                    key={ds.id}
                                    onClick={() => toggleSource(ds.id)}
                                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between ${
                                        isSelected 
                                        ? 'bg-amber-500/10 border-amber-500/50 text-white' 
                                        : 'bg-gray-950 border-gray-800 text-gray-400 hover:bg-gray-900'
                                    }`}
                                >
                                    <div>
                                      <div className="font-bold text-sm">{ds.name}</div>
                                      <div className="text-[10px] uppercase font-bold text-gray-500 mt-1">{ds.type}</div>
                                    </div>
                                    <div className={`w-4 h-4 rounded flex items-center justify-center ${isSelected ? 'bg-amber-500' : 'bg-gray-800'}`}>
                                        {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                </div>

                <button
                    onClick={handleSimulate}
                    disabled={!selectedBotId || isSimulating}
                    className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-black uppercase tracking-widest shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_30px_rgba(168,85,247,0.5)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSimulating ? (
                        <>
                            <RotateCcw className="w-5 h-5 animate-spin" /> Simulating...
                        </>
                    ) : (
                        <>
                            <Play className="w-5 h-5 fill-current" /> Run Backtest
                        </>
                    )}
                </button>
            </div>

            {/* Right Panel: Results */}
            <div className="flex-1 bg-gray-900/30 border border-gray-800 rounded-2xl overflow-hidden flex flex-col relative">
                {!results && !isSimulating && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
                        <BarChart2 className="w-16 h-16 mb-4 opacity-20" />
                        <h3 className="text-xl font-bold text-gray-400">No Simulation Data</h3>
                        <p className="text-sm mt-2 max-w-sm text-center">Configure the parameters on the left and run a backtest to visualize historical performance.</p>
                    </div>
                )}
                
                {isSimulating && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-purple-500 bg-gray-950/80 backdrop-blur-sm z-10">
                        <BrainCircuit className="w-16 h-16 mb-6 animate-pulse" />
                        <h3 className="text-xl font-bold text-white mb-2">Analyzing Historical Context</h3>
                        <div className="text-sm text-gray-400 font-mono flex items-center gap-2">
                             Processing {timeframe} tick data <span className="animate-bounce">...</span>
                        </div>
                    </div>
                )}

                {results && !isSimulating && (
                    <div className="p-8 flex flex-col h-full animate-in fade-in zoom-in-95 duration-500">
                        <div className="flex items-center justify-between mb-8">
                           <div>
                               <h3 className="text-2xl font-bold text-white mb-1">Backtest Complete</h3>
                               <p className="text-sm text-gray-400">Target: <span className="text-purple-400 font-bold">{activeBot?.name}</span> | Period: {timeframe}</p>
                           </div>
                           <div className="text-right">
                               <div className="text-[10px] uppercase font-bold text-gray-500 tracking-widest mb-1">Net Profit</div>
                               <div className={`text-3xl font-black font-mono ${results.totalReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                   {results.totalReturn >= 0 ? '+' : ''}{results.totalReturn.toFixed(2)}%
                               </div>
                           </div>
                        </div>

                        <div className="grid grid-cols-4 gap-4 mb-8">
                            <div className="bg-gray-950 border border-gray-800 rounded-xl p-4">
                                <div className="text-[10px] text-gray-500 font-bold uppercase mb-1 flex items-center gap-1.5">
                                    <Target className="w-3 h-3" /> Win Rate
                                </div>
                                <div className="text-xl font-bold text-white">{results.winRate.toFixed(1)}%</div>
                            </div>
                            <div className="bg-gray-950 border border-gray-800 rounded-xl p-4">
                                <div className="text-[10px] text-gray-500 font-bold uppercase mb-1 flex items-center gap-1.5">
                                    <TrendingDown className="w-3 h-3 text-rose-500" /> Max Drawdown
                                </div>
                                <div className="text-xl font-bold text-rose-400">{results.maxDrawdown.toFixed(2)}%</div>
                            </div>
                            <div className="bg-gray-950 border border-gray-800 rounded-xl p-4">
                                <div className="text-[10px] text-gray-500 font-bold uppercase mb-1 flex items-center gap-1.5">
                                    <Activity className="w-3 h-3 text-blue-500" /> Total Trades
                                </div>
                                <div className="text-xl font-bold text-white">{results.totalTrades}</div>
                            </div>
                            <div className="bg-gray-950 border border-gray-800 rounded-xl p-4">
                                <div className="text-[10px] text-gray-500 font-bold uppercase mb-1 flex items-center gap-1.5">
                                    <BarChart2 className="w-3 h-3 text-amber-500" /> Sharpe Ratio
                                </div>
                                <div className="text-xl font-bold text-white">{results.sharpeRatio}</div>
                            </div>
                        </div>

                        <div className="flex-1 bg-gray-950 border border-gray-800 rounded-xl p-6 flex flex-col">
                            <h4 className="text-sm font-bold text-gray-300 uppercase tracking-widest mb-6">Equity Curve Simulation</h4>
                            <div className="flex-1 min-h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={results.history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={results.totalReturn >= 0 ? '#10b981' : '#f43f5e'} stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor={results.totalReturn >= 0 ? '#10b981' : '#f43f5e'} stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                                        <XAxis 
                                            dataKey="date" 
                                            stroke="#525252" 
                                            tick={{ fill: '#737373', fontSize: 10 }}
                                            tickFormatter={(val) => val.slice(0, 5)}
                                            minTickGap={30}
                                        />
                                        <YAxis 
                                            stroke="#525252" 
                                            tick={{ fill: '#737373', fontSize: 10 }}
                                            domain={['auto', 'auto']}
                                            tickFormatter={(val) => `$${(val/1000).toFixed(1)}k`}
                                        />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px' }}
                                            itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                                            formatter={(value: any) => [`$${parseFloat(value).toFixed(2)}`, 'Equity']}
                                            labelStyle={{ color: '#a1a1aa', fontSize: '12px' }}
                                        />
                                        <Area 
                                            type="monotone" 
                                            dataKey="equity" 
                                            stroke={results.totalReturn >= 0 ? '#10b981' : '#f43f5e'} 
                                            strokeWidth={2}
                                            fillOpacity={1} 
                                            fill="url(#colorEquity)" 
                                            isAnimationActive={true}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};
