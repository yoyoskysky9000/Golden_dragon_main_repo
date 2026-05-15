
import React, { useState } from 'react';
import { Bot, Plus, Play, Pause, Trash2, Copy, Cpu, Zap, Activity, BrainCircuit, Sparkles, Loader2, Save, Database, Settings, GripVertical, X, CheckCircle2, AlertTriangle, Layers, History, ChevronDown, Wand2, TrendingUp, ArrowRight, Globe, Clock, Target } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, YAxis, XAxis, CartesianGrid, Tooltip } from 'recharts';
import { StockData, TradingBot, DataSource } from '../types';
import { generateBotStrategy, optimizeStrategy, createAIBot, spawnHedgeFundBots } from '../services/geminiService';
import { BacktestModule } from './BacktestModule';

interface BotLabProps {
  stocks: StockData[];
  bots: TradingBot[];
  dataSources: DataSource[];
  selectedSymbol?: string;
  onAddBot: (bot: TradingBot) => void;
  onDeleteBot: (id: string) => void;
  onToggleBot: (id: string) => void;
  onUpdateBot: (bot: TradingBot) => void;
  onAddDataSource: (source: Partial<DataSource>) => void;
  onUpdateDataSource: (source: DataSource) => void;
  onDeleteDataSource: (id: string) => void;
  onReorderDataSources: (sources: DataSource[]) => void;
  initialOptimizeBot?: TradingBot | null;
  onClearOptimizeBot?: () => void;
  addNotification?: (title: string, message: string, type?: 'success' | 'alert') => void;
}

const computeChartData = (data: any[]) => {
    let enriched = [...data];
    for (let i = 0; i < enriched.length; i++) {
        enriched[i] = { ...enriched[i] };
        
        // SMA & BB (3-period)
        if (i >= 2) {
            enriched[i].sma = (enriched[i].pnl + enriched[i-1].pnl + enriched[i-2].pnl) / 3;
            const variance = (Math.pow(enriched[i].pnl - enriched[i].sma, 2) + Math.pow(enriched[i-1].pnl - enriched[i].sma, 2) + Math.pow(enriched[i-2].pnl - enriched[i].sma, 2)) / 3;
            const std = Math.sqrt(variance);
            enriched[i].bbUpper = enriched[i].sma + 2 * std;
            enriched[i].bbLower = enriched[i].sma - 2 * std;
        } else {
            enriched[i].sma = enriched[i].pnl;
            enriched[i].bbUpper = enriched[i].pnl;
            enriched[i].bbLower = enriched[i].pnl;
        }

        // EMA (3-period)
        if (i === 0) {
            enriched[i].ema = enriched[i].pnl;
        } else {
            const k = 2 / (3 + 1);
            enriched[i].ema = (enriched[i].pnl - enriched[i-1].ema) * k + enriched[i-1].ema;
        }

        // RSI (3-period)
        if (i >= 3) {
            let gains = 0, losses = 0;
            for (let j = 0; j < 3; j++) {
                const diff = enriched[i-j].pnl - enriched[i-j-1].pnl;
                if (diff > 0) gains += diff;
                else losses -= diff;
            }
            if (losses === 0) {
               enriched[i].rsi = 100;
            } else {
               const rs = (gains / 3) / (losses / 3);
               enriched[i].rsi = 100 - (100 / (1 + rs));
            }
        } else {
            enriched[i].rsi = 50; 
        }
    }
    return enriched;
};

const CustomChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-[#0a0a18]/90 border border-indigo-500/30 p-3 rounded-lg shadow-xl shadow-black/50 backdrop-blur-md z-50 min-w-[160px]">
                <p className="text-gray-400 text-xs mb-2 border-b border-gray-800 pb-1">{new Date(label).toLocaleString()}</p>
                <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center gap-4">
                        <span className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">PnL</span>
                        <span className={`text-sm font-mono font-bold ${data.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {data.pnl >= 0 ? '+' : ''}${data.pnl.toFixed(2)}
                        </span>
                    </div>
                    {data.trades !== undefined && (
                        <div className="flex justify-between items-center gap-4">
                            <span className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">Trades</span>
                            <span className="text-gray-300 text-sm font-mono font-bold">{data.trades}</span>
                        </div>
                    )}
                    {payload.map((entry: any) => {
                        if (entry.name === 'pnl' || entry.name === 'trades') return null;
                        
                        let color = entry.color;
                        let valStr = entry.value?.toFixed(2);
                        if (entry.name === 'rsi') valStr = entry.value?.toFixed(1);
                        
                        return (
                            <div key={entry.name} className="flex justify-between items-center gap-4 mt-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>{entry.name}</span>
                                <span className="text-xs font-mono" style={{ color }}>{valStr}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }
    return null;
};

const BotLab: React.FC<BotLabProps> = ({ 
  stocks, 
  bots, 
  dataSources, 
  selectedSymbol,
  onAddBot, 
  onDeleteBot, 
  onToggleBot, 
  onUpdateBot,
  onAddDataSource,
  onUpdateDataSource,
  onDeleteDataSource,
  onReorderDataSources,
  initialOptimizeBot,
  onClearOptimizeBot,
  addNotification
}) => {
  const [view, setView] = useState<'list' | 'create' | 'backtest'>('list');
  const [creationMode, setCreationMode] = useState<'manual' | 'ai'>('ai');
  
  const [selectedBotForAudit, setSelectedBotForAudit] = useState<TradingBot | null>(null);
  const [errorModalBot, setErrorModalBot] = useState<TradingBot | null>(null);

  const [chartIndicators, setChartIndicators] = useState({ sma: false, ema: false, bb: false, rsi: false });

  const auditChartData = React.useMemo(() => {
      return selectedBotForAudit?.performanceHistory ? computeChartData(selectedBotForAudit.performanceHistory) : [];
  }, [selectedBotForAudit?.performanceHistory]);

  const sortedDataSources = [...dataSources].sort((a, b) => (b.priority || 0) - (a.priority || 0));
  
  // AI Creation State
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiRiskLevel, setAiRiskLevel] = useState<'Conservative' | 'Balanced' | 'Aggressive'>('Balanced');
  
  // Pre-fill target asset based on selectedSymbol, or default to stocks[0]
  const initialAsset = selectedSymbol || stocks[0]?.symbol || 'NVDA';
  const initialAssetType = stocks.find(s => s.symbol === initialAsset)?.assetType;
  
  const [aiSymbol, setAiSymbol] = useState(initialAsset);
  // execution protocol: Binance if crypto, Alpaca if stock
  const [aiExchange, setAiExchange] = useState(initialAssetType === 'crypto' ? 'Binance' : 'Alpaca');

  React.useEffect(() => {
    if (selectedSymbol) {
      setAiSymbol(selectedSymbol);
      const isCrypto = stocks.find(s => s.symbol === selectedSymbol)?.assetType === 'crypto';
      setAiExchange(isCrypto ? 'Binance' : 'Alpaca');
      
      setManualConfig(prev => ({
        ...prev,
        symbol: selectedSymbol,
        exchange: isCrypto ? 'Binance' : 'Alpaca'
      }));
    }
  }, [selectedSymbol, stocks]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isSpawningFund, setIsSpawningFund] = useState(false);
  const [spawnMagicEffects, setSpawnMagicEffects] = useState(false);
  const [generatedConfig, setGeneratedConfig] = useState<any>(null);

  const handleSpawnFund = async () => {
    setIsSpawningFund(true);
    setSpawnMagicEffects(true);
    const fundBots = await spawnHedgeFundBots(stocks);
    if (fundBots && fundBots.length > 0) {
      fundBots.forEach(config => {
        const newBot: TradingBot = {
          id: `fund-bot-${Math.random().toString(36).substr(2, 9)}`,
          name: config.name || 'AI Bot',
          symbol: config.symbol || stocks[0]?.symbol || 'NVDA',
          exchange: config.exchange || 'Binance',
          type: 'ai_adaptive',
          status: 'active', // instantly active
          autoMode: true,
          autoOptimize: true, // auto optimize right out of the gate
          pnl: 0,
          pnlPercent: 0,
          trades: 0,
          strategy: {
            indicator: config.strategy?.indicator || 'RSI',
            condition: config.strategy?.condition || 'LT',
            value: config.strategy?.value || '30',
            action: config.strategy?.action || 'buy'
          },
          aiDescription: config.aiDescription || 'Autonomously spawned hedge fund strategy.',
          isLive: false,
          dataSources: dataSources.map(ds => ({ id: ds.id, priority: 100 })),
          startDate: new Date().toISOString().split('T')[0]
        };
        onAddBot(newBot);
      });
      setCreationMode(null); // Return to main view
    }
    setIsSpawningFund(false);
    setTimeout(() => setSpawnMagicEffects(false), 2000);
  };

  // Manual Creation State
  const [manualConfig, setManualConfig] = useState({
    name: 'Alpha Seeker',
    symbol: stocks[0]?.symbol || 'NVDA',
    exchange: 'Binance',
    indicator: 'RSI',
    condition: 'LT',
    value: '30',
    action: 'buy',
    logic: 'AND' as 'AND' | 'OR',
    additionalRules: [] as { indicator: string; condition: string; value: string; logic?: 'AND' | 'OR' }[],
    selectedSources: dataSources.map(ds => ({ id: ds.id, priority: ds.priority }))
  });

  const [editingBot, setEditingBot] = useState<TradingBot | null>(null);
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
  
  // Optimization State
  const [optimizingBotId, setOptimizingBotId] = useState<string | null>(null);
  const [optimizationResult, setOptimizationResult] = useState<{ suggestions: Array<{ name: string; strategy: TradingBot['strategy']; reasoning: string; score: number }>; botId: string } | null>(null);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState<number>(0);
  
  const [backtestingBotId, setBacktestingBotId] = useState<string | null>(null);

  const latestBots = React.useRef(bots);
  const latestStocks = React.useRef(stocks);
  const latestOnUpdate = React.useRef(onUpdateBot);

  React.useEffect(() => {
    latestBots.current = bots;
    latestStocks.current = stocks;
    latestOnUpdate.current = onUpdateBot;
  }, [bots, stocks, onUpdateBot]);

  const [isOptimizing, setIsOptimizing] = useState<string | null>(null);

  const handleRunBacktest = async (botId: string) => {
    setBacktestingBotId(botId);
    
    // Simulate backtesting delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const bot = bots.find(b => b.id === botId);
    if (bot) {
        // Generate mock test data
        const dataPoints = 20;
        let currentPnl = bot.pnl;
        let history = [];
        
        // Base volatility on bot risk or type
        const volatility = bot.type === 'ai_adaptive' ? 50 : 20;
        
        let currentTrades = bot.trades;
        for (let i = 0; i < dataPoints; i++) {
            const date = new Date();
            date.setHours(date.getHours() - (dataPoints - i) * 4); // roughly past week
            
            // Random walk with drift
            const change = (Math.random() - 0.45) * volatility;
            currentPnl += change;
            currentTrades += Math.floor(Math.random() * 2);
            
            history.push({
                timestamp: date.getTime(),
                pnl: currentPnl,
                trades: currentTrades
            });
        }
        
        const totalReturn = (Math.random() * 15 + 5); // 5% to 20%
        const winRate = (Math.random() * 40 + 40); // 40% to 80%
        const maxDrawdown = (Math.random() * 10 + 2); // 2% to 12%

        onUpdateBot({
            ...bot,
            pnl: currentPnl,
            trades: currentTrades,
            performanceHistory: history,
            backtestMetrics: {
                totalReturn,
                winRate,
                maxDrawdown,
                totalTrades: Math.floor(Math.random() * 50) + 10,
                sharpeRatio: (Math.random() * 2) + 0.5,
                sortinoRatio: (Math.random() * 2) + 0.5,
                maxConsecutiveWins: Math.floor(Math.random() * 5) + 3,
                maxConsecutiveLosses: Math.floor(Math.random() * 4) + 1
            }
        });
    }
    
    setBacktestingBotId(null);
  };

  const manualStrategyTemplates = [
    { name: 'RSI Mean Reversion', indicator: 'RSI', condition: 'LT', value: '30', action: 'buy' },
    { name: 'MACD Momentum Breakout', indicator: 'MACD', condition: 'GT', value: '0', action: 'buy' },
    { name: 'Bollinger Band Scalper', indicator: 'BOLL_LOWER', condition: 'LT', value: 'PRICE', action: 'buy' },
    { name: 'Super Trend Follower', indicator: 'SUPER_TREND', condition: 'CROSS_UP', value: 'PRICE', action: 'buy'},
    { name: 'Stoch RSI Overbought', indicator: 'STOCH_RSI', condition: 'GT', value: '80', action: 'sell'},
    { name: 'Parabolic SAR Flip', indicator: 'SAR', condition: 'LT', value: 'PRICE', action: 'buy'},
    { name: 'AI Custom Signal Combo', indicator: 'CUSTOM_COMBO', condition: 'GT', value: '0', action: 'buy'}
  ];

  const applyManualTemplate = (template: typeof manualStrategyTemplates[0]) => {
    setManualConfig(prev => ({
      ...prev,
      name: `${template.name} Bot`,
      indicator: template.indicator,
      condition: template.condition,
      value: template.value,
      action: template.action
    }));
  };

  const botTemplates = [
    { category: 'Binance', name: 'Binance Omni-Tasker', symbol: 'BTC', type: 'multi-agent-swarm', desc: 'Universal bot capable of executing any task on Binance, from spot trading to futures arbitrage.' },
    { category: 'Binance', name: 'HFT Market Maker', symbol: 'BTC', type: 'ai_adaptive', desc: 'High-frequency market making bot optimized for Binance order books and low-latency execution.' },
    { category: 'Binance', name: 'Statistical Arbitrage', symbol: 'ETH', type: 'multi-agent-swarm', desc: 'Cross-pair statistical arbitrage utilizing mean-reversion models.' },
    { category: 'Coinbase', name: 'Coinbase Omni-Tasker', symbol: 'ETH', type: 'ai_adaptive', desc: 'Universal bot capable of executing any task on Coinbase, optimizing for low fees and deep liquidity.' },
    { category: 'Coinbase', name: 'Smart DCA Accumulator', symbol: 'SOL', type: 'momentum', desc: 'Dollar-Cost Averaging accumulator for Coinbase with dynamic buy sizing based on RSI.' },
    { category: 'Coinbase', name: 'Whale Tracker', symbol: 'BTC', type: 'ai_adaptive', desc: 'Follows large on-chain movements and Coinbase Pro order flow to front-run momentum.' },
    { category: 'Kraken', name: 'Kraken Omni-Tasker', symbol: 'SOL', type: 'momentum', desc: 'Universal bot capable of executing any task on Kraken, including margin trading and staking.' },
    { category: 'Kraken', name: 'Flash Crash Buyer', symbol: 'ADA', type: 'mean_reversion', desc: 'Monitors Kraken for sudden liquidity drops and flash crashes to buy at deep discounts.' },
    { category: 'Kraken', name: 'Funding Rate Arbitrage', symbol: 'XRP', type: 'custom', desc: 'Captures funding rate premiums between Kraken spot and perpetual futures.' },
    { category: 'Alpaca', name: 'Alpaca Omni-Tasker', symbol: 'SPY', type: 'mean_reversion', desc: 'Universal bot capable of executing any task on Alpaca, managing equities and options portfolios.' },
    { category: 'Alpaca', name: 'Options Straddle', symbol: 'SPY', type: 'multi-agent-swarm', desc: 'Multi-agent swarm executing delta-neutral straddles on Alpaca ahead of earnings calls.' },
    { category: 'Alpaca', name: 'Equities Momentum', symbol: 'NVDA', type: 'momentum', desc: 'Trend-following algorithm scanning for high relative volume breakouts.' },
    { category: 'Polymarket', name: 'Polymarket Omni-Tasker', symbol: 'ELECTION_24', type: 'custom', desc: 'Universal bot capable of executing any task on Polymarket, from liquidity provision to event arbitrage.' },
    { category: 'Polymarket', name: 'Combinatorial Arbitrage', symbol: 'ELECTION_24', type: 'custom', desc: 'Combinatorial arbitrage bot scanning Polymarket for mispriced mutually exclusive outcomes.' },
    { category: 'Polymarket', name: 'News Sentiment Scalper', symbol: 'FED_RATE', type: 'ai_adaptive', desc: 'Scrapes breaking news to scalp short-term probability shifts on Polymarket.' },
    { category: 'Polymarket', name: 'Prediction Market Bot', symbol: 'ELECTION_24', type: 'ai_adaptive', desc: 'Scours news outlets and predictive markets to find arbitrage opportunities in political and cultural events.' },
    { category: 'Kalshi', name: 'Kalshi Omni-Tasker', symbol: 'FED_RATE', type: 'ai_adaptive', desc: 'Universal bot capable of executing any task on Kalshi, analyzing economic data releases in real-time.' },
    { category: 'Kalshi', name: 'Event-Driven Trader', symbol: 'CPI_DATA', type: 'ai_adaptive', desc: 'Event-driven sentiment trader for Kalshi, parsing economic data releases in real-time.' },
    { category: 'Kalshi', name: 'Weather Derivatives', symbol: 'TEMP_NYC', type: 'mean_reversion', desc: 'Trades Kalshi weather markets based on NOAA forecast deviations.' },
    { category: 'Specialized', name: 'Lip Reading Live Bot', symbol: 'ALL', type: 'ai_adaptive', desc: 'Uses vision AI to read lips on live video feeds of executives and lawmakers, front-running audio broadcast delays.' },
    { category: 'Specialized', name: 'Speech Pattern Oracle', symbol: 'ALL', type: 'custom', desc: 'Deep search on speech patterns and commonly used precursor words by executives to predict forward guidance sentiment.' }
  ];

  React.useEffect(() => {
    if (initialOptimizeBot) {
      handleOptimizeAction(initialOptimizeBot);
      if (onClearOptimizeBot) onClearOptimizeBot();
    }
  }, [initialOptimizeBot, onClearOptimizeBot]);

  const handleSourceToggle = (sourceId: string) => {
    setManualConfig(prev => {
      const exists = prev.selectedSources.find(s => s.id === sourceId);
      if (exists) {
        return { ...prev, selectedSources: prev.selectedSources.filter(s => s.id !== sourceId) };
      } else {
        const source = dataSources.find(ds => ds.id === sourceId);
        return { ...prev, selectedSources: [...prev.selectedSources, { id: sourceId, priority: source?.priority || 50 }] };
      }
    });
  };

  const handleSourcePriorityChange = (sourceId: string, priority: number) => {
    setManualConfig(prev => ({
      ...prev,
      selectedSources: prev.selectedSources.map(s => s.id === sourceId ? { ...s, priority } : s)
    }));
  };

  const handleGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    setGeneratedConfig(null);
    
    const selectedSourceDetails = manualConfig.selectedSources.map(s => {
      const ds = dataSources.find(d => d.id === s.id);
      return ds ? { name: ds.name, type: ds.type } : { name: 'Unknown', type: 'unknown' };
    });

    // We use the new createAIBot function for better name/desc/strategy mapping
    const result = await createAIBot(aiPrompt, aiSymbol, aiRiskLevel, selectedSourceDetails);
    
    if (result) {
        setGeneratedConfig({ ...result, symbol: aiSymbol });
    }
    setIsGenerating(false);
  };

  const saveAiBot = () => {
    if (!generatedConfig) return;
    const newBot: TradingBot = {
        id: Math.random().toString(36).substr(2, 9),
        name: generatedConfig.name || 'AI Bot',
        symbol: generatedConfig.symbol || 'NVDA',
        exchange: aiExchange,
        type: (generatedConfig.type as any) || 'ai_adaptive',
        status: 'paused',
        pnl: 0,
        pnlPercent: 0,
        trades: 0,
        strategy: generatedConfig.strategy as any,
        aiDescription: generatedConfig.aiDescription,
        isLive: false,
        autoMode: true,
        dataSources: manualConfig.selectedSources
    };
    onAddBot(newBot);
    setGeneratedConfig(null);
    setAiPrompt('');
    setView('list');
  };

  const saveManualBot = () => {
      const newBot: TradingBot = {
          id: Math.random().toString(36).substr(2, 9),
          name: manualConfig.name,
          symbol: manualConfig.symbol,
          exchange: manualConfig.exchange,
          type: 'custom',
          status: 'paused',
          pnl: 0,
          pnlPercent: 0,
          trades: 0,
          strategy: {
              indicator: manualConfig.indicator,
              condition: manualConfig.condition,
              value: manualConfig.value,
              action: manualConfig.action as 'buy' | 'sell',
              logic: manualConfig.logic,
              additionalRules: manualConfig.additionalRules
          },
          isLive: false,
          autoMode: false,
          dataSources: manualConfig.selectedSources
      };
      onAddBot(newBot);
      setView('list');
  };

  const handleLoadTemplate = (template: typeof botTemplates[0]) => {
    const marketPriceSource = dataSources.find(ds => ds.name === 'Market Price');
    const sources = marketPriceSource ? [{ id: marketPriceSource.id, priority: 100 }] : [];
    
    const isAi = template.type === 'ai_adaptive' || template.type === 'multi-agent-swarm';
    
    if (isAi) {
      setCreationMode('ai');
      setAiPrompt(`Create a ${template.name} bot for ${template.category}. ${template.desc}`);
      setAiSymbol(template.symbol);
      setAiExchange(template.category);
      setAiRiskLevel('Balanced');
      setGeneratedConfig(null);
    } else {
      setCreationMode('manual');
      setManualConfig({
        name: template.name,
        symbol: template.symbol,
        exchange: template.category,
        indicator: 'RSI',
        condition: 'LT',
        value: '30',
        action: 'buy',
        logic: 'AND',
        additionalRules: [],
        selectedSources: sources
      });
    }
    
    setView('create');
    setShowTemplateDropdown(false);
  };

  const handleOptimizeAction = async (bot: TradingBot) => {
    setOptimizingBotId(bot.id);
    const stock = stocks.find(s => s.symbol === bot.symbol) || stocks[0];
    const performance = { pnl: bot.pnl, trades: bot.trades };
    
    try {
        const result = await optimizeStrategy(bot, stock, performance);
        if (result && result.suggestions) {
            setOptimizationResult({ suggestions: result.suggestions, botId: bot.id });
            setSelectedSuggestionIndex(0);
        }
    } catch (err) {
        onUpdateBot({
            ...bot,
            status: 'error',
            errorMessage: err instanceof Error ? err.message : 'Unknown error during optimization'
        });
    } finally {
        setOptimizingBotId(null);
    }
  };

  const applyOptimization = () => {
    if (!optimizationResult) return;
    const bot = bots.find(b => b.id === optimizationResult.botId);
    if (bot) {
        const suggestion = optimizationResult.suggestions[selectedSuggestionIndex];
        onUpdateBot({
            ...bot,
            strategy: suggestion.strategy,
            lastOptimizedAt: Date.now(),
            optimizationScore: suggestion.score
        });
    }
    setOptimizationResult(null);
  };


  if (view === 'backtest') {
      return (
          <BacktestModule 
             bots={bots} 
             dataSources={dataSources} 
             stocks={stocks} 
             onClose={() => setView('list')} 
          />
      );
  }

  if (view === 'create') {
      return (
          <div className="flex-1 bg-gray-950 p-6 flex flex-col h-full overflow-hidden">
              <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                      <button 
                          onClick={() => setView('list')}
                          className="p-2 bg-gray-900 border border-gray-800 rounded-xl text-gray-400 hover:text-white transition-colors"
                      >
                          <ChevronDown className="w-5 h-5 rotate-90" />
                      </button>
                      <div>
                          <h2 className="text-xl font-bold text-white flex items-center gap-2">
                              <Plus className="w-5 h-5 text-indigo-500" />
                              New Strategy
                          </h2>
                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest px-7">Dragon Architect v3.1</p>
                      </div>
                  </div>
                  
                  <div className="flex bg-gray-900 p-1 rounded-xl border border-gray-800">
                      <button 
                          onClick={() => setCreationMode('ai')}
                          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${creationMode === 'ai' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-gray-500 hover:text-gray-300'}`}
                      >
                          <Sparkles className="w-3.5 h-3.5" /> AI
                      </button>
                      <button 
                          onClick={() => setCreationMode('manual')}
                          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${creationMode === 'manual' ? 'bg-amber-600 text-white shadow-lg shadow-amber-500/20' : 'text-gray-500 hover:text-gray-300'}`}
                      >
                          <Settings className="w-3.5 h-3.5" /> MANUAL
                      </button>
                  </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  {creationMode === 'ai' ? (
                      <div className="max-w-2xl mx-auto flex flex-col h-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                          {!generatedConfig ? (
                              <div className="bg-gray-950 border border-gray-800 rounded-2xl p-8 backdrop-blur-sm relative overflow-hidden group">
                                  <div className="absolute top-0 right-0 p-8 opacity-5">
                                      <BrainCircuit className="w-32 h-32 text-indigo-500" />
                                  </div>
                                  
                                  <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                                      <Sparkles className="w-5 h-5 text-indigo-500" />
                                      AI Bot Architect
                                  </h3>
                                  <p className="text-sm text-gray-500 mb-8 leading-relaxed">
                                      Describe your trading logic or objective. The Dragon AI will formulate technical parameters and risk profiles from your vision.
                                  </p>
                                  
                                  <div className="grid grid-cols-2 gap-6 mb-8">
                                      <div>
                                          <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-2">Target Asset</label>
                                          <select 
                                             value={aiSymbol}
                                             onChange={e => setAiSymbol(e.target.value)}
                                             className="w-full bg-gray-900 border border-gray-800 rounded-xl p-3 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                                          >
                                              {stocks.map(s => <option key={s.symbol} value={s.symbol}>{s.symbol} - {s.name}</option>)}
                                          </select>
                                      </div>
                                      <div>
                                          <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-2">Execution Protocol</label>
                                          <select 
                                             value={aiExchange}
                                             onChange={e => setAiExchange(e.target.value)}
                                             className="w-full bg-gray-900 border border-gray-800 rounded-xl p-3 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                                          >
                                              <option value="Binance">Binance</option>
                                              <option value="Coinbase">Coinbase</option>
                                              <option value="Kraken">Kraken</option>
                                              <option value="OKX">OKX</option>
                                              <option value="Alpaca">Alpaca</option>
                                          </select>
                                      </div>
                                  </div>

                                  <div className="mb-8">
                                      <div className="flex justify-between items-end mb-2">
                                          <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-widest">Behavioral Prompt</label>
                                          <span className="text-[10px] text-gray-500 font-mono">
                                              {aiPrompt.length} / 1000
                                          </span>
                                      </div>
                                      <textarea 
                                          value={aiPrompt}
                                          onChange={(e) => setAiPrompt(e.target.value.slice(0, 1000))}
                                          placeholder="e.g. A moderate risk bot that buys Bitcoin on RSI oversold and sells on a 3% bounce..."
                                          className="w-full h-32 bg-gray-900 border border-gray-800 rounded-xl p-4 text-sm text-gray-200 focus:ring-1 focus:ring-indigo-500 outline-none resize-none transition-all mb-3"
                                      />
                                      <div className="flex flex-wrap gap-2">
                                          {[
                                              "Buy NVDA on 5% dips, sell 2% higher",
                                              "Scalp BTC based on MACD crossovers",
                                              "Arbitrage between spot and futures",
                                              "Mean reversion trading on SOL"
                                          ].map((suggestion, idx) => (
                                              <button
                                                  key={idx}
                                                  onClick={() => setAiPrompt(suggestion)}
                                                  className="text-[10px] bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200 px-2.5 py-1 rounded-md border border-gray-700/50 transition-colors"
                                              >
                                                  {suggestion}
                                              </button>
                                          ))}
                                      </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-6 mb-8">
                                      <div>
                                          <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-3 text-center">Risk Configuration</label>
                                          <select 
                                             value={aiRiskLevel}
                                             onChange={e => setAiRiskLevel(e.target.value as 'Conservative' | 'Balanced' | 'Aggressive')}
                                             className="w-full bg-gray-900 border border-gray-800 rounded-xl p-3 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                                          >
                                              <option value="Conservative">Conservative</option>
                                              <option value="Balanced">Balanced</option>
                                              <option value="Aggressive">Aggressive</option>
                                          </select>
                                      </div>
                                      <div>
                                          <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-3 text-center" title="Enable complex signal aggregation and cross-validation">Data Sources for Signal Aggregation</label>
                                          <div className="bg-gray-900 border border-gray-800 rounded-xl p-2 max-h-32 overflow-y-auto custom-scrollbar flex flex-col gap-1">
                                              {dataSources.map(ds => {
                                                  const isSelected = manualConfig.selectedSources.some(s => s.id === ds.id);
                                                  return (
                                                      <button
                                                          key={ds.id}
                                                          onClick={() => handleSourceToggle(ds.id)}
                                                          className={`text-left px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between ${isSelected ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30' : 'text-gray-400 hover:bg-gray-800'}`}
                                                      >
                                                          <span className="font-bold">{ds.name}</span>
                                                          <span className="text-[9px] uppercase">{ds.type}</span>
                                                      </button>
                                                  )
                                              })}
                                          </div>
                                      </div>
                                  </div>

                                  <button 
                                    onClick={handleGenerate}
                                    disabled={!aiPrompt.trim() || isGenerating}
                                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-xl shadow-indigo-900/20"
                                  >
                                      {isGenerating ? (
                                          <>
                                              <Loader2 className="w-5 h-5 animate-spin" />
                                              Architecting Bot...
                                          </>
                                      ) : (
                                          <>
                                              <Sparkles className="w-5 h-5" />
                                              Synthesize Strategy
                                          </>
                                      )}
                                  </button>
                              </div>
                          ) : (
                              <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-8 animate-in slide-in-from-top-4 duration-500">
                                  <div className="flex items-center justify-between mb-8">
                                      <div className="flex items-center gap-4">
                                          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-indigo-500/30">
                                              <Zap className="w-8 h-8" />
                                          </div>
                                          <div>
                                              <h3 className="text-2xl font-black text-white tracking-tighter uppercase">{generatedConfig.name}</h3>
                                              <div className="flex items-center gap-2">
                                                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">{aiRiskLevel} ARCHITECTURE</span>
                                                  <span className="w-1 h-1 bg-gray-700 rounded-full"></span>
                                                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{generatedConfig.symbol}</span>
                                              </div>
                                          </div>
                                      </div>
                                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-900 border border-gray-800 text-[10px] font-bold text-emerald-500">
                                          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                                          VALIDATED
                                      </div>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                                      <div>
                                          <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-3 block">Neural Summary</label>
                                          <p className="text-xs text-gray-400 leading-relaxed font-mono italic">
                                              "{generatedConfig.aiDescription}"
                                          </p>
                                      </div>
                                      <div>
                                          <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-3 block">Code Logic</label>
                                          <div className="bg-gray-950 rounded-xl p-4 border border-gray-800">
                                              <div className="text-xs font-mono text-white mb-2">IF {generatedConfig.strategy.indicator} {generatedConfig.strategy.condition} {generatedConfig.strategy.value}</div>
                                              <div className="text-[10px] text-indigo-400 font-bold">THEN EXECUTE BUY ORDER</div>
                                          </div>
                                      </div>
                                  </div>

                                  <div className="flex gap-4">
                                      <button 
                                        onClick={() => setGeneratedConfig(null)}
                                        className="flex-1 py-4 border border-gray-800 rounded-xl text-gray-500 font-bold text-xs uppercase tracking-widest hover:text-white hover:border-gray-700 transition-all"
                                      >
                                          Re-Architect
                                      </button>
                                      <button 
                                        onClick={saveAiBot}
                                        className="flex-[2] bg-white text-black py-4 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-100 transition-all shadow-xl"
                                      >
                                          Deploy to Production <ArrowRight className="w-4 h-4 ml-1" />
                                      </button>
                                  </div>
                              </div>
                          )}
                      </div>
                  ) : (
                      <div className="max-w-2xl mx-auto flex flex-col h-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                           <div className="bg-gray-950 border border-gray-800 rounded-2xl p-8 backdrop-blur-sm relative overflow-hidden group">
                              <div className="absolute top-0 right-0 p-8 opacity-5">
                                  <Settings className="w-32 h-32 text-amber-500" />
                              </div>

                              <div className="flex items-center justify-between mb-4">
                                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                      <Activity className="w-5 h-5 text-amber-500" />
                                      Core Strategy Smith
                                  </h3>
                              </div>
                              <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                                  Define precise execution triggers. Manual strategies offer absolute control over indicator thresholds and logic gates.
                              </p>

                              <div className="mb-6">
                                  <label className="block text-sm text-gray-500 mb-2 uppercase font-bold">Strategy Template</label>
                                  <select 
                                     onChange={e => {
                                         const t = manualStrategyTemplates.find(tpl => tpl.name === e.target.value);
                                         if(t) applyManualTemplate(t);
                                     }}
                                     className="w-full bg-gray-900 border border-gray-800 rounded-lg p-3 text-white focus:outline-none focus:border-amber-500"
                                  >
                                      <option value="">-- Choose a predefined template --</option>
                                      {manualStrategyTemplates.map((t, idx) => (
                                          <option key={idx} value={t.name}>{t.name}</option>
                                      ))}
                                  </select>
                              </div>

                              <div>
                                  <label className="block text-sm text-gray-500 mb-2 uppercase font-bold">Bot Name</label>
                                  <input 
                                    type="text" 
                                    value={manualConfig.name}
                                    onChange={e => setManualConfig({...manualConfig, name: e.target.value})}
                                    className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-amber-500"
                                  />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                  <div>
                                      <label className="block text-sm text-gray-500 mb-2 uppercase font-bold">Target Asset</label>
                                      <select 
                                         value={manualConfig.symbol}
                                         onChange={e => setManualConfig({...manualConfig, symbol: e.target.value})}
                                         className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-amber-500"
                                      >
                                          {stocks.map(s => <option key={s.symbol} value={s.symbol}>{s.symbol} - {s.name}</option>)}
                                      </select>
                                  </div>
                                  <div>
                                      <label className="block text-sm text-gray-500 mb-2 uppercase font-bold">Exchange</label>
                                      <select 
                                         value={manualConfig.exchange}
                                         onChange={e => setManualConfig({...manualConfig, exchange: e.target.value})}
                                         className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-amber-500"
                                      >
                                          <option value="Binance">Binance</option>
                                          <option value="Coinbase">Coinbase</option>
                                          <option value="Kraken">Kraken</option>
                                          <option value="OKX">OKX</option>
                                          <option value="Alpaca">Alpaca</option>
                                          <option value="Polymarket">Polymarket</option>
                                          <option value="Kalshi">Kalshi</option>
                                      </select>
                                  </div>
                              </div>
                              <div className="p-4 bg-gray-950 rounded-xl border border-gray-800">
                                  <div className="flex items-center gap-2 mb-4 text-amber-500 text-sm font-bold uppercase">
                                      <Activity className="w-4 h-4" /> Trigger Logic
                                  </div>
                                  <div className="grid grid-cols-2 gap-4 mb-4">
                                      <div>
                                          <label className="text-xs text-gray-500 block mb-1">Indicator</label>
                                          <select 
                                              value={manualConfig.indicator}
                                              onChange={e => setManualConfig({...manualConfig, indicator: e.target.value})}
                                              className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white"
                                          >
                                              <option value="RSI">RSI (14)</option>
                                              <option value="STOCH_RSI">Stoch RSI</option>
                                              <option value="MACD">MACD</option>
                                              <option value="SMA">SMA (50)</option>
                                              <option value="EMA">EMA (10)</option>
                                              <option value="BOLL_UPPER">Bollinger Upper</option>
                                              <option value="BOLL_LOWER">Bollinger Lower</option>
                                              <option value="SUPER_TREND">Super Trend</option>
                                              <option value="SAR">Parabolic SAR</option>
                                              <option value="RESISTANCE">Resistance Level</option>
                                              <option value="SUPPORT">Support Level</option>
                                              <option value="PRICE">Price</option>
                                              <option value="CUSTOM_COMBO">AI Custom Combo</option>
                                          </select>
                                      </div>
                                      <div>
                                          <label className="text-xs text-gray-500 block mb-1">Action</label>
                                          <select 
                                              value={manualConfig.action}
                                              onChange={e => setManualConfig({...manualConfig, action: e.target.value})}
                                              className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white"
                                          >
                                              <option value="buy">BUY</option>
                                              <option value="sell">SELL</option>
                                          </select>
                                      </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                      <div>
                                          <label className="text-xs text-gray-500 block mb-1">Condition</label>
                                          <select 
                                              value={manualConfig.condition}
                                              onChange={e => setManualConfig({...manualConfig, condition: e.target.value})}
                                              className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white"
                                          >
                                              <option value="LT">Less Than (&lt;)</option>
                                              <option value="GT">Greater Than (&gt;)</option>
                                              <option value="CROSS_UP">Crosses Up</option>
                                              <option value="CROSS_DOWN">Crosses Down</option>
                                          </select>
                                      </div>
                                      <div>
                                          <label className="text-xs text-gray-500 block mb-1">Value</label>
                                          <input 
                                              type="text"
                                              value={manualConfig.value}
                                              onChange={e => setManualConfig({...manualConfig, value: e.target.value})}
                                              placeholder="e.g. 30, PRICE, 100"
                                              className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white"
                                          />
                                      </div>
                                  </div>

                                  {manualConfig.additionalRules.map((rule, index) => (
                                      <div key={index} className="mt-4 pt-4 border-t border-gray-800">
                                          <div className="flex items-center justify-between mb-2">
                                              <select 
                                                  value={index === 0 ? manualConfig.logic : (rule.logic || 'AND')}
                                                  onChange={e => {
                                                      const value = e.target.value as 'AND' | 'OR';
                                                      if (index === 0) {
                                                          setManualConfig({...manualConfig, logic: value});
                                                      } else {
                                                          const newRules = [...manualConfig.additionalRules];
                                                          newRules[index].logic = value;
                                                          setManualConfig({...manualConfig, additionalRules: newRules});
                                                      }
                                                  }}
                                                  className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white"
                                              >
                                                  <option value="AND">AND</option>
                                                  <option value="OR">OR</option>
                                              </select>
                                              <button 
                                                  onClick={() => {
                                                      const newRules = [...manualConfig.additionalRules];
                                                      newRules.splice(index, 1);
                                                      setManualConfig({...manualConfig, additionalRules: newRules});
                                                  }}
                                                  className="text-xs text-red-500 hover:text-red-400"
                                              >
                                                  Remove
                                              </button>
                                          </div>
                                          <div className="grid grid-cols-3 gap-2">
                                               <div>
                                                  <select 
                                                      value={rule.indicator}
                                                      onChange={e => {
                                                          const newRules = [...manualConfig.additionalRules];
                                                          newRules[index].indicator = e.target.value;
                                                          setManualConfig({...manualConfig, additionalRules: newRules});
                                                      }}
                                                      className="w-full bg-gray-900 border border-gray-700 rounded p-1.5 text-xs text-white"
                                                  >
                                                      <option value="RSI">RSI (14)</option>
                                                      <option value="STOCH_RSI">Stoch RSI</option>
                                                      <option value="MACD">MACD</option>
                                                      <option value="SMA">SMA (50)</option>
                                                      <option value="EMA">EMA (10)</option>
                                                      <option value="BOLL_UPPER">Bollinger Upper</option>
                                                      <option value="BOLL_LOWER">Bollinger Lower</option>
                                                      <option value="SUPER_TREND">Super Trend</option>
                                                      <option value="SAR">Parabolic SAR</option>
                                                      <option value="RESISTANCE">Resistance Level</option>
                                                      <option value="SUPPORT">Support Level</option>
                                                      <option value="PRICE">Price</option>
                                                      <option value="CUSTOM_COMBO">AI Custom Combo</option>
                                                  </select>
                                              </div>
                                              <div>
                                                  <select 
                                                      value={rule.condition}
                                                      onChange={e => {
                                                          const newRules = [...manualConfig.additionalRules];
                                                          newRules[index].condition = e.target.value;
                                                          setManualConfig({...manualConfig, additionalRules: newRules});
                                                      }}
                                                      className="w-full bg-gray-900 border border-gray-700 rounded p-1.5 text-xs text-white"
                                                  >
                                                      <option value="LT">Less Than (&lt;)</option>
                                                      <option value="GT">Greater Than (&gt;)</option>
                                                      <option value="CROSS_UP">Crosses Up</option>
                                                      <option value="CROSS_DOWN">Crosses Down</option>
                                                  </select>
                                              </div>
                                              <div>
                                                  <input 
                                                      type="text"
                                                      value={rule.value}
                                                      onChange={e => {
                                                          const newRules = [...manualConfig.additionalRules];
                                                          newRules[index].value = e.target.value;
                                                          setManualConfig({...manualConfig, additionalRules: newRules});
                                                      }}
                                                      placeholder="Value"
                                                      className="w-full bg-gray-900 border border-gray-700 rounded p-1.5 text-xs text-white"
                                                  />
                                              </div>
                                          </div>
                                      </div>
                                  ))}

                                  {manualConfig.additionalRules.length < 3 && (
                                    <button 
                                        onClick={() => setManualConfig({
                                            ...manualConfig, 
                                            additionalRules: [...manualConfig.additionalRules, { indicator: 'RSI', condition: 'LT', value: '30' }]
                                        })}
                                        className="mt-4 w-full py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded border border-gray-700 text-xs flex items-center justify-center gap-2 transition-colors"
                                    >
                                        + Add Condition
                                    </button>
                                  )}
                              </div>

                              <div>
                                  <div className="flex items-center justify-between mb-3">
                                      <label className="block text-sm text-gray-500 uppercase font-bold">Data Sources & Bot-Specific Priority</label>
                                      <button 
                                          onClick={() => onAddDataSource({
                                              name: 'Live Data Feed',
                                              type: 'live_feed',
                                              status: 'connected',
                                              priority: 90,
                                              config: { updateIntervalMs: 100, requiresAuth: true }
                                          })}
                                          className="text-[10px] bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 px-2 py-1 flex items-center gap-1 rounded font-bold border border-emerald-500/20"
                                      >
                                      <Plus className="w-3 h-3" /> Live Feed
                                      </button>
                                  </div>
                                  <div className="grid grid-cols-1 gap-3">
                                      {dataSources.map(ds => {
                                          const botSource = manualConfig.selectedSources.find(s => s.id === ds.id);
                                          return (
                                              <div key={ds.id} className={`p-3 rounded-xl border transition-all ${botSource ? 'bg-indigo-600/10 border-indigo-500/50' : 'bg-gray-950 border-gray-800'}`}>
                                                  <div className="flex items-center justify-between mb-2">
                                                      <div className="flex items-center gap-2">
                                                          <button 
                                                              onClick={() => handleSourceToggle(ds.id)}
                                                              className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${botSource ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-gray-700'}`}
                                                          >
                                                              {botSource && <Zap className="w-3 h-3 fill-current" />}
                                                          </button>
                                                          <span className={`text-xs font-bold ${botSource ? 'text-white' : 'text-gray-500'}`}>{ds.name}</span>
                                                          <div className={`w-1.5 h-1.5 rounded-full ${(ds.effectiveStatus || ds.status) === 'connected' ? 'bg-emerald-500' : (ds.effectiveStatus || ds.status) === 'error' ? 'bg-rose-500' : 'bg-gray-500'}`} title={`Status: ${ds.effectiveStatus || ds.status}`} />
                                                      </div>
                                                      <span className="text-[10px] text-gray-600 uppercase font-black">{ds.type}</span>
                                                  </div>
                                                  {botSource && (
                                                      <div className="flex items-center gap-3">
                                                          <input 
                                                              type="range" 
                                                              min="1" 
                                                              max="100" 
                                                              value={botSource.priority}
                                                              onChange={(e) => handleSourcePriorityChange(ds.id, parseInt(e.target.value))}
                                                              className="flex-1 h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                                          />
                                                          <span className="text-[10px] font-mono text-indigo-400 w-8 text-right">{botSource.priority}</span>
                                                      </div>
                                                  )}
                                              </div>
                                          );
                                      })}
                                  </div>
                              </div>

                              <button 
                                onClick={saveManualBot}
                                className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold shadow-lg shadow-amber-900/20 flex items-center justify-center gap-2"
                              >
                                  <Save className="w-4 h-4" /> Deploy Bot
                              </button>
                           </div>
                      </div>
                  )}
              </div>
          </div>
      );
  }

  return (
    <div className="flex-1 bg-transparent p-6 flex flex-col h-full overflow-hidden relative">
      <div className="absolute inset-0 pointer-events-none cyber-grid z-0"></div>

      {spawnMagicEffects && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none bg-black/60 backdrop-blur-sm transition-opacity duration-1000">
           <div className="relative flex items-center justify-center">
             <div className="absolute w-[800px] h-[800px] magic-circle opacity-30"></div>
             <div className="absolute w-[600px] h-[600px] magic-circle-reverse opacity-40"></div>
             <div className="absolute w-[400px] h-[400px] border-2 border-dashed border-[var(--neon-purple)] rounded-full animate-pulse opacity-50"></div>
             <Sparkles className="w-32 h-32 neon-text-cyan magic-pulse" />
             <div className="absolute mt-56 font-sans font-bold text-4xl tracking-widest neon-text-pink uppercase glitch-hover">
               Summoning Cyber Swarm...
             </div>
           </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-8 relative z-10">
          <div>
            <h2 className="text-3xl font-black text-white flex items-center gap-3 font-sans uppercase tracking-widest neon-text-cyan">
                <Globe className="w-8 h-8 text-[var(--neon-cyan)] animate-pulse" />
                Cyber Swarm
            </h2>
            <p className="text-sm text-indigo-200/60 font-mono italic">Deploy magical automation agents into the neon grid.</p>
          </div>
          <div className="flex gap-3">
            <div className="relative">
              <button 
                onClick={() => setShowTemplateDropdown(!showTemplateDropdown)}
                className="bg-transparent border border-[var(--neon-cyan)] hover:bg-[var(--neon-cyan)]/20 text-[var(--neon-cyan)] hover:text-white hover:shadow-[0_0_15px_var(--neon-cyan)] px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-lg"
              >
                <Sparkles className="w-4 h-4" /> Quick Summon <ChevronDown className="w-4 h-4" />
              </button>
              
              {showTemplateDropdown && (
                <div className="absolute right-0 mt-2 w-72 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl z-50 overflow-hidden">
                  <div className="p-3 border-b border-gray-800 bg-gray-950">
                    <h3 className="text-xs font-bold text-gray-400 uppercase">Exchange Templates</h3>
                  </div>
                  <div className="max-h-80 overflow-y-auto custom-scrollbar">
                    {Array.from(new Set(botTemplates.map(t => t.category))).map(category => (
                      <div key={category}>
                        <div className="px-3 py-1.5 bg-gray-900/80 border-y border-gray-800 text-[10px] font-bold text-amber-500 uppercase tracking-wider sticky top-0 backdrop-blur-sm">
                          {category}
                        </div>
                        {botTemplates.filter(t => t.category === category).map((template, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleLoadTemplate(template)}
                            className="w-full text-left p-3 hover:bg-gray-800 border-b border-gray-800/50 last:border-0 transition-colors group"
                          >
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-bold text-sm text-gray-200 group-hover:text-indigo-400 transition-colors">{template.name}</span>
                              <span className="text-[10px] font-mono bg-gray-800 px-1.5 py-0.5 rounded text-gray-400">{template.symbol}</span>
                            </div>
                            <p className="text-xs text-gray-500 line-clamp-2">{template.desc}</p>
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button 
              onClick={handleSpawnFund}
              disabled={isSpawningFund}
              className="bg-transparent border border-[var(--neon-purple)] hover:bg-[var(--neon-purple)]/20 text-[var(--neon-purple)] hover:text-white hover:shadow-[0_0_15px_var(--neon-purple)] px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-50 shadow-lg"
            >
              {isSpawningFund ? <Loader2 className="w-4 h-4 animate-spin" /> : <BrainCircuit className="w-4 h-4" />}
              {isSpawningFund ? 'Summoning...' : 'Summon Cyber Swarm'}
            </button>
            <button 
              onClick={() => setView('create')}
              className="bg-transparent border border-[var(--neon-pink)] hover:bg-[var(--neon-pink)]/20 text-[var(--neon-pink)] hover:text-white hover:shadow-[0_0_15px_var(--neon-pink)] px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-lg"
            >
              <Plus className="w-4 h-4" /> Arcane Forge
            </button>
          </div>
      </div>

      {bots.some(b => b.trades > 0 && (!b.optimizationScore || b.lastOptimizedAt! < Date.now() - 86400000)) && (
          <div className="mb-6 bg-[var(--neon-purple)]/10 border border-[var(--neon-purple)]/30 rounded-xl p-4 flex items-start gap-4">
              <div className="p-2 bg-[var(--neon-purple)]/20 rounded-lg">
                  <BrainCircuit className="w-5 h-5 text-[var(--neon-purple)]" />
              </div>
              <div className="flex-1">
                  <h4 className="text-sm font-bold text-white neon-text-cyan">Optimize Your Strategy</h4>
                  <p className="text-xs text-gray-400 mt-1 pb-1">
                      Your bots have accumulated performance history. We highly recommend running the AI optimization process on your existing bots to improve their parameters based on historical performance.
                  </p>
                  <p className="text-[10px] text-gray-500 font-mono">
                      (Hint: Click the "OPTIMIZE" button on any active bot card below, or enable Auto-Optimize for continuous adjustments)
                  </p>
              </div>
          </div>
      )}

      {bots.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50 relative z-10">
              <Bot className="w-16 h-16 text-gray-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-300">No Active Entities</h3>
              <p className="text-gray-500 max-w-sm mb-6">Your grid is empty. Use the AI Adaptive Strategy builder to summon your first automated construct, or instantly deploy a Cyber Swarm.</p>
              <div className="flex gap-4">
                  <button onClick={() => setView('create')} className="text-[var(--neon-pink)] hover:text-white font-medium hover:text-shadow-[0_0_10px_var(--neon-pink)] transition-all">Open Arcane Forge</button>
                  <button onClick={handleSpawnFund} disabled={isSpawningFund} className="text-[var(--neon-cyan)] hover:text-white font-medium hover:text-shadow-[0_0_10px_var(--neon-cyan)] transition-all">Summon Cyber Swarm</button>
              </div>
          </div>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-6">
              {bots.map(bot => (
                  <div key={bot.id} className="relative bg-[#050510]/80 backdrop-blur-lg border border-[#05d9e8]/20 shadow-[0_0_20px_rgba(5,217,232,0.05)] rounded-xl p-5 hover:border-[var(--neon-cyan)] transition-colors group overflow-hidden">
                      {/* Magical background highlights */}
                      <div className="absolute -top-10 -left-10 w-32 h-32 bg-[var(--neon-purple)] opacity-10 blur-3xl pointer-events-none group-hover:opacity-20 transition-opacity"></div>
                      <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-[var(--neon-cyan)] opacity-10 blur-3xl pointer-events-none group-hover:opacity-20 transition-opacity"></div>
                      {bot.status === 'active' && <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[var(--neon-purple)] via-[var(--neon-cyan)] to-[var(--neon-purple)] animate-pulse shadow-[0_0_10px_var(--neon-cyan)]"></div>}
                      
                      <div className="flex justify-between items-start mb-4 relative z-10">
                          <div className="flex items-center gap-3">
                              <div className={`p-2.5 rounded-lg ${bot.type === 'ai_adaptive' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'}`}>
                                  {bot.type === 'ai_adaptive' ? <BrainCircuit className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
                              </div>
                              <div>
                                  <h3 className="font-bold text-white leading-tight">{bot.name}</h3>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500 font-mono">{bot.symbol}</span>
                                    {bot.exchange && <span className="text-[9px] px-1 rounded font-bold bg-gray-800 text-gray-400 border border-gray-700">{bot.exchange}</span>}
                                    <button 
                                        onClick={() => onUpdateBot?.({...bot, isLive: !bot.isLive})}
                                        className={`text-[9px] px-1 rounded font-bold transition-colors ${bot.isLive ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30' : 'bg-sky-500/20 text-sky-400 border border-sky-500/30 hover:bg-sky-500/30'}`}
                                        title="Toggle Paper/Live Trading"
                                    >
                                        {bot.isLive ? 'LIVE' : 'PAPER'}
                                    </button>
                                  </div>
                              </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <div className="flex items-center gap-2">
                                {bot.status === 'error' && (
                                    <button 
                                        onClick={() => setErrorModalBot(bot)}
                                        className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors flex items-center gap-1"
                                    >
                                        Details
                                    </button>
                                )}
                                <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border flex items-center gap-1 ${
                                    bot.status === 'active' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                                    bot.status === 'learning' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 
                                    bot.status === 'error' ? 'bg-red-500/20 text-red-500 border-red-500/30' :
                                    'bg-gray-800 text-gray-500 border-gray-700'
                                }`}>
                                    {bot.status === 'active' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                                    {bot.status === 'learning' && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
                                    {bot.status === 'paused' && <div className="w-1.5 h-1.5 rounded-full bg-gray-500" />}
                                    {bot.status === 'error' && <AlertTriangle className="w-2.5 h-2.5 text-red-500" />}
                                    {bot.status}
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => onUpdateBot?.({...bot, autoMode: !bot.autoMode})}
                                        className={`flex items-center gap-1.5 px-2 py-1 rounded-md border transition-colors ${
                                            bot.autoMode 
                                                ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' 
                                                : 'bg-gray-800 border-gray-700 text-gray-500 hover:text-gray-300'
                                        }`}
                                        title="Toggle Automatic Trading Adjustments"
                                    >
                                        <Sparkles className="w-2.5 h-2.5" />
                                        <span className="text-[8px] font-bold uppercase">Auto-Trade</span>
                                        <div className={`w-5 h-2.5 rounded-full relative transition-colors ${bot.autoMode ? 'bg-indigo-500' : 'bg-gray-600'}`}>
                                            <div className={`absolute top-0.5 w-1.5 h-1.5 rounded-full bg-white transition-transform ${bot.autoMode ? 'left-3' : 'left-0.5'}`} />
                                        </div>
                                    </button>
                                    <button 
                                        onClick={() => onUpdateBot?.({...bot, autoOptimize: !bot.autoOptimize})}
                                        className={`flex items-center gap-1.5 px-2 py-1 rounded-md border transition-colors ${
                                            bot.autoOptimize 
                                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                                                : 'bg-gray-800 border-gray-700 text-gray-500 hover:text-gray-300'
                                        }`}
                                        title="Auto-Optimization (Runs periodically in background)"
                                    >
                                        <BrainCircuit className="w-2.5 h-2.5" />
                                        <span className="text-[8px] font-bold uppercase">Auto-Optimize</span>
                                        <div className={`w-5 h-2.5 rounded-full relative transition-colors ${bot.autoOptimize ? 'bg-emerald-500' : 'bg-gray-600'}`}>
                                            <div className={`absolute top-0.5 w-1.5 h-1.5 rounded-full bg-white transition-transform ${bot.autoOptimize ? 'left-3' : 'left-0.5'}`} />
                                        </div>
                                    </button>
                                </div>
                                {bot.lastOptimizedAt && (
                                    <div className="flex gap-2 text-[9px] text-gray-500 font-mono mt-1 w-full justify-end">
                                        <div className="flex items-center gap-0.5" title="Last optimized">
                                            <Clock className="w-2.5 h-2.5" />
                                            {new Date(bot.lastOptimizedAt).toLocaleDateString()} {new Date(bot.lastOptimizedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        {bot.optimizationScore !== undefined && (
                                            <div className="flex items-center gap-0.5 text-amber-500/80" title="Optimization score">
                                                <Target className="w-2 h-2" />
                                                Score: {bot.optimizationScore}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                          </div>
                      </div>

                      <div className="bg-gray-950 rounded-lg p-3 mb-4 border border-gray-800/50">
                          <div className="flex justify-between items-center text-sm mb-1">
                              <span className="text-gray-500">Strategy</span>
                              {bot.type !== 'multi-agent-swarm' && editingBot?.id !== bot.id && (
                                  <button onClick={() => setEditingBot(bot)} className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold">EDIT</button>
                              )}
                          </div>
                          {editingBot?.id === bot.id ? (
                              <div className="mt-2 space-y-2 animate-in fade-in duration-200">
                                  <div className="grid grid-cols-3 gap-2 text-xs">
                                      <input 
                                          className="bg-gray-900 border border-gray-700 rounded p-1.5 text-white" 
                                          value={editingBot.strategy.indicator} 
                                          onChange={e => setEditingBot({...editingBot, strategy: {...editingBot.strategy, indicator: e.target.value}})}
                                      />
                                      <select 
                                          className="bg-gray-900 border border-gray-700 rounded p-1.5 text-white" 
                                          value={editingBot.strategy.condition} 
                                          onChange={e => setEditingBot({...editingBot, strategy: {...editingBot.strategy, condition: e.target.value as 'GT' | 'LT' | 'EQ' | 'CROSS_UP' | 'CROSS_DOWN'}})}
                                      >
                                          <option value="GT">{'>'}</option>
                                          <option value="LT">{'<'}</option>
                                          <option value="EQ">{'=='}</option>
                                          <option value="CROSS_UP">Crosses Up</option>
                                          <option value="CROSS_DOWN">Crosses Down</option>
                                      </select>
                                      <input 
                                          className="bg-gray-900 border border-gray-700 rounded p-1.5 text-white" 
                                          value={editingBot.strategy.value} 
                                          onChange={e => setEditingBot({...editingBot, strategy: {...editingBot.strategy, value: e.target.value}})}
                                      />
                                  </div>
                                  <div className="flex gap-2 justify-end mt-3 border-t border-gray-800/50 pt-2">
                                      <button onClick={() => setEditingBot(null)} className="px-3 py-1 text-[10px] text-gray-400 hover:text-white uppercase font-bold tracking-wider">Cancel</button>
                                      <button 
                                          onClick={() => {
                                              if (onUpdateBot) onUpdateBot(editingBot);
                                              setEditingBot(null);
                                          }} 
                                          className="px-3 py-1 text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white rounded font-bold uppercase tracking-wider"
                                      >
                                          Save Changes
                                      </button>
                                  </div>
                              </div>
                          ) : (
                              <>
                                  <div className="text-gray-300 font-mono text-xs mb-1">
                                      {bot.type === 'multi-agent-swarm' ? 'SWARM CONSENSUS' : (
                                          <span>
                                              {bot.strategy.action.toUpperCase()} IF {bot.strategy.indicator} {bot.strategy.condition} {bot.strategy.value}
                                              {bot.strategy.additionalRules && bot.strategy.additionalRules.length > 0 && (
                                                  <span className="text-gray-500"> {bot.strategy.logic} {bot.strategy.additionalRules.length} more rule{bot.strategy.additionalRules.length > 1 ? 's' : ''}</span>
                                              )}
                                          </span>
                                      )}
                                  </div>
                                  {bot.aiDescription && (
                                      <div className={`text-[10px] mt-2 border-t border-gray-800 pt-2 ${bot.type === 'multi-agent-swarm' ? 'text-amber-400 font-mono whitespace-pre-wrap' : 'text-gray-600 italic'}`}>
                                          {bot.aiDescription}
                                      </div>
                                  )}
                              </>
                          )}
                      </div>

                      {/* Performance Chart */}
                      <div className="mb-6 bg-gray-950/50 rounded-lg border border-gray-800/30 p-4 relative group/chart">
                          <div className="flex items-center justify-between pointer-events-auto mb-4">
                              <div className="flex items-center gap-1.5">
                                <History className="w-4 h-4 text-gray-500" />
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Performance History</span>
                              </div>
                              <div className="flex gap-3 text-xs">
                                  <label className="flex items-center gap-1.5 text-gray-400 cursor-pointer hover:text-white transition-colors">
                                      <input type="checkbox" checked={chartIndicators.sma} onChange={() => setChartIndicators(prev => ({...prev, sma: !prev.sma}))} className="rounded border-gray-700 bg-gray-900 text-amber-500 focus:ring-amber-500 focus:ring-offset-gray-950" />
                                      SMA
                                  </label>
                                  <label className="flex items-center gap-1.5 text-gray-400 cursor-pointer hover:text-white transition-colors">
                                      <input type="checkbox" checked={chartIndicators.ema} onChange={() => setChartIndicators(prev => ({...prev, ema: !prev.ema}))} className="rounded border-gray-700 bg-gray-900 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-950" />
                                      EMA
                                  </label>
                                  <label className="flex items-center gap-1.5 text-gray-400 cursor-pointer hover:text-white transition-colors">
                                      <input type="checkbox" checked={chartIndicators.bb} onChange={() => setChartIndicators(prev => ({...prev, bb: !prev.bb}))} className="rounded border-gray-700 bg-gray-900 text-purple-500 focus:ring-purple-500 focus:ring-offset-gray-950" />
                                      BB
                                  </label>
                                  <label className="flex items-center gap-1.5 text-gray-400 cursor-pointer hover:text-white transition-colors">
                                      <input type="checkbox" checked={chartIndicators.rsi} onChange={() => setChartIndicators(prev => ({...prev, rsi: !prev.rsi}))} className="rounded border-gray-700 bg-gray-900 text-orange-500 focus:ring-orange-500 focus:ring-offset-gray-950" />
                                      RSI
                                  </label>
                              </div>
                          </div>
                          
                          <div className="h-48 w-full">
                          {bot.performanceHistory && bot.performanceHistory.length > 0 ? (
                              <ResponsiveContainer width="100%" height="100%">
                                  <LineChart data={computeChartData(bot.performanceHistory)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                      <XAxis 
                                          dataKey="timestamp" 
                                          stroke="#6b7280" 
                                          fontSize={10} 
                                          tickLine={false} 
                                          axisLine={false} 
                                          minTickGap={30}
                                          tickFormatter={(val) => new Date(val).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      />
                                      <YAxis 
                                          yAxisId="left"
                                          stroke="#6b7280" 
                                          fontSize={10} 
                                          tickLine={false} 
                                          axisLine={false} 
                                          tickFormatter={(v) => `$${v.toFixed(0)}`} 
                                          domain={['auto', 'auto']} 
                                      />
                                      {chartIndicators.rsi && <YAxis yAxisId="rsiAxis" orientation="right" domain={[0, 100]} hide />}
                                      <Tooltip content={<CustomChartTooltip />} cursor={{ fill: '#374151', opacity: 0.4 }} />
                                      {chartIndicators.bb && (
                                          <>
                                            <Line yAxisId="left" type="monotone" dataKey="bbUpper" stroke="#a855f7" strokeWidth={1} strokeDasharray="5 5" dot={false} name="bbUpper" isAnimationActive={false} />
                                            <Line yAxisId="left" type="monotone" dataKey="bbLower" stroke="#a855f7" strokeWidth={1} strokeDasharray="5 5" dot={false} name="bbLower" isAnimationActive={false} />
                                          </>
                                      )}
                                      {chartIndicators.sma && <Line yAxisId="left" type="monotone" dataKey="sma" stroke="#f59e0b" strokeWidth={1.5} dot={false} name="sma" isAnimationActive={false} />}
                                      {chartIndicators.ema && <Line yAxisId="left" type="monotone" dataKey="ema" stroke="#3b82f6" strokeWidth={1.5} dot={false} name="ema" isAnimationActive={false} />}
                                      {chartIndicators.rsi && <Line yAxisId="rsiAxis" type="monotone" dataKey="rsi" stroke="#f97316" strokeWidth={1.5} dot={false} name="rsi" isAnimationActive={false} />}
                                      <Line 
                                          yAxisId="left"
                                          type="monotone" 
                                          dataKey="pnl" 
                                          stroke={bot.pnl >= 0 ? '#10b981' : '#f43f5e'} 
                                          strokeWidth={2} 
                                          dot={false}
                                          animationDuration={2000}
                                          name="pnl"
                                      />
                                  </LineChart>
                              </ResponsiveContainer>
                          ) : (
                              <div className="flex h-full items-center justify-center">
                                  <span className="text-[10px] text-gray-600 font-mono uppercase">Collecting Data...</span>
                              </div>
                          )}
                          </div>
                      </div>

                      <div className="mb-4">
                          <div className="text-[10px] text-gray-500 uppercase font-bold mb-2">Data Sources & Priority</div>
                          <div className="flex flex-col gap-2">
                              {dataSources.map(ds => {
                                  const botSource = bot.dataSources.find(s => s.id === ds.id);
                                  return (
                                      <div key={ds.id} className={`p-2 rounded border transition-all ${botSource ? 'bg-indigo-600/10 border-indigo-500/30' : 'bg-gray-950 border-gray-800'}`}>
                                          <div className="flex items-center justify-between">
                                              <div className="flex items-center gap-2">
                                                  <button 
                                                      onClick={() => {
                                                          const newSources = botSource
                                                              ? bot.dataSources.filter(s => s.id !== ds.id)
                                                              : [...bot.dataSources, { id: ds.id, priority: ds.priority || 50 }];
                                                          onUpdateBot({...bot, dataSources: newSources});
                                                      }}
                                                      className={`w-3 h-3 rounded-sm border flex items-center justify-center transition-colors ${botSource ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-gray-700'}`}
                                                  >
                                                      {botSource && <Zap className="w-2 h-2 fill-current" />}
                                                  </button>
                                                  <span className={`text-[10px] font-bold ${botSource ? 'text-indigo-300' : 'text-gray-500'}`}>{ds.name}</span>
                                                  <div className={`w-1.5 h-1.5 rounded-full ${(ds.effectiveStatus || ds.status) === 'connected' ? 'bg-emerald-500' : (ds.effectiveStatus || ds.status) === 'error' ? 'bg-rose-500' : 'bg-gray-500'}`} title={`Status: ${ds.effectiveStatus || ds.status}`} />
                                              </div>
                                              {botSource && (
                                                  <div className="flex items-center gap-2 w-1/2">
                                                      <input 
                                                          type="range" 
                                                          min="1" 
                                                          max="100" 
                                                          value={botSource.priority}
                                                          onChange={(e) => {
                                                              const newPriority = parseInt(e.target.value);
                                                              const newSources = bot.dataSources.map(s => s.id === ds.id ? { ...s, priority: newPriority } : s);
                                                              onUpdateBot({...bot, dataSources: newSources});
                                                          }}
                                                          className="flex-1 h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                                      />
                                                      <span className="text-[9px] font-mono text-indigo-400 w-6 text-right">{botSource.priority}</span>
                                                  </div>
                                              )}
                                          </div>
                                      </div>
                                  );
                              })}
                          </div>
                      </div>

                      <div className="mb-4 bg-gray-950 p-3 rounded-lg border border-gray-800">
                          <div className="flex justify-between items-center mb-3">
                              <div className="text-[10px] text-gray-500 uppercase font-bold flex items-center gap-1.5">
                                  <History className="w-3 h-3" /> Backtest Engine
                              </div>
                              <button 
                                  onClick={() => handleRunBacktest(bot.id)}
                                  disabled={backtestingBotId === bot.id}
                                  className="px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20 rounded text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5 transition-colors disabled:opacity-50"
                              >
                                  {backtestingBotId === bot.id ? (
                                      <><Loader2 className="w-3 h-3 animate-spin" /> Simulating...</>
                                  ) : (
                                      <><Play className="w-3 h-3" /> Run Backtest</>
                                  )}
                              </button>
                          </div>
                          <div className="flex gap-2">
                              <div className="flex-1">
                                  <label className="text-[9px] text-gray-600 uppercase font-bold block mb-1">Start Date</label>
                                  <input 
                                      type="date" 
                                      value={bot.startDate || ''}
                                      onChange={(e) => onUpdateBot({...bot, startDate: e.target.value})}
                                      className="w-full bg-gray-900 border border-gray-800 rounded p-1.5 text-[10px] text-white focus:outline-none focus:border-indigo-500"
                                  />
                              </div>
                              <div className="flex-1">
                                  <label className="text-[9px] text-gray-600 uppercase font-bold block mb-1">End Date</label>
                                  <input 
                                      type="date" 
                                      value={bot.endDate || ''}
                                      onChange={(e) => onUpdateBot({...bot, endDate: e.target.value})}
                                      className="w-full bg-gray-900 border border-gray-800 rounded p-1.5 text-[10px] text-white focus:outline-none focus:border-indigo-500"
                                  />
                              </div>
                          </div>
                          
                          {bot.backtestMetrics && (
                              <div className="mt-3 pt-3 border-t border-gray-800/50 grid grid-cols-3 gap-2">
                                  <div className="bg-gray-900 rounded p-2">
                                      <div className="text-[9px] text-gray-500 uppercase font-bold mb-1">Total Return</div>
                                      <div className={`font-mono text-xs font-bold ${bot.backtestMetrics.totalReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                          {bot.backtestMetrics.totalReturn >= 0 ? '+' : ''}{bot.backtestMetrics.totalReturn.toFixed(2)}%
                                      </div>
                                  </div>
                                  <div className="bg-gray-900 rounded p-2">
                                      <div className="text-[9px] text-gray-500 uppercase font-bold mb-1">Win Rate</div>
                                      <div className="font-mono text-xs font-bold text-white">
                                          {bot.backtestMetrics.winRate.toFixed(1)}%
                                      </div>
                                  </div>
                                  <div className="bg-gray-900 rounded p-2">
                                      <div className="text-[9px] text-gray-500 uppercase font-bold mb-1">Max Drawdown</div>
                                      <div className="font-mono text-xs font-bold text-rose-400">
                                          -{bot.backtestMetrics.maxDrawdown.toFixed(2)}%
                                      </div>
                                  </div>
                              </div>
                          )}
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4 items-end">
                          <div>
                              <div className="text-[10px] text-gray-500 uppercase font-bold">Total P/L</div>
                              <div className={`font-mono text-lg font-bold ${bot.pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                  {bot.pnl >= 0 ? '+' : ''}${bot.pnl.toFixed(2)}
                              </div>
                          </div>
                          <div className="flex flex-col items-end">
                              {bot.performanceHistory && bot.performanceHistory.length > 1 && (
                                  <div className="w-24 h-8 mb-1 opacity-80">
                                      <ResponsiveContainer width="100%" height="100%">
                                          <LineChart data={bot.performanceHistory}>
                                              <YAxis domain={['dataMin', 'dataMax']} hide />
                                              <Line 
                                                  type="monotone" 
                                                  dataKey="pnl" 
                                                  stroke={bot.pnl >= 0 ? '#10b981' : '#f43f5e'} 
                                                  strokeWidth={1.5} 
                                                  dot={false} 
                                                  isAnimationActive={false} 
                                              />
                                          </LineChart>
                                      </ResponsiveContainer>
                                  </div>
                              )}
                              <div className="flex items-center gap-2">
                                  <div className="text-[10px] text-gray-500 uppercase font-bold">Trades: <span className="text-white font-mono">{bot.trades}</span></div>
                                  {bot.lastOptimizedAt && (
                                      <div className="text-[9px] text-gray-500 font-bold flex items-center gap-1" title="Last auto-optimized">
                                          <Clock className="w-2.5 h-2.5" />
                                          {new Date(bot.lastOptimizedAt).toLocaleDateString()}
                                      </div>
                                  )}
                                  {bot.optimizationScore && (
                                      <div className="text-[9px] text-amber-500/80 font-bold flex items-center gap-1" title="Optimization score">
                                          <Target className="w-2.5 h-2.5" />
                                          Score: {bot.optimizationScore}
                                      </div>
                                  )}
                              </div>
                          </div>
                      </div>

                      <div className="flex gap-2 mb-4">
                          <button
                              onClick={() => handleOptimizeAction(bot)}
                              disabled={optimizingBotId === bot.id}
                              className="flex-1 py-2 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                          >
                              {optimizingBotId === bot.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                  <Wand2 className="w-3.5 h-3.5" />
                              )}
                              Optimize Strategy
                          </button>
                          <button
                              onClick={() => setSelectedBotForAudit(bot)}
                              className="flex-1 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                          >
                              <BrainCircuit className="w-3.5 h-3.5" /> XAI AUDIT
                          </button>
                      </div>

                      <div className="flex gap-2">
                          <button 
                            onClick={() => onToggleBot(bot.id)}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${bot.status === 'active' ? 'bg-gray-800 text-gray-400 hover:text-white' : bot.status === 'error' ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}
                          >
                              {bot.status === 'active' ? <><Pause className="w-3 h-3" /> PAUSE</> : bot.status === 'error' ? <><Play className="w-3 h-3" /> RESTART</> : <><Play className="w-3 h-3" /> ACTIVATE</>}
                          </button>
                          <button 
                            onClick={() => onUpdateBot?.({...bot, isLive: !bot.isLive})}
                            className={`px-3 py-2 rounded-lg text-[10px] font-bold border transition-colors ${bot.isLive ? 'bg-rose-500/10 text-rose-500 border-rose-500/20 hover:bg-rose-500/20' : 'bg-sky-500/10 text-sky-400 border-sky-500/20 hover:bg-sky-500/20'}`}
                          >
                            {bot.isLive ? 'GO PAPER' : 'GO LIVE'}
                          </button>
                          <button 
                            onClick={() => onUpdateBot?.({...bot, autoOptimize: !bot.autoOptimize})}
                            className={`p-2 rounded-lg transition-colors border ${bot.autoOptimize ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/30' : 'text-gray-600 border-transparent hover:text-white hover:bg-gray-800'}`}
                            title={bot.autoOptimize ? "Auto-Optimize Enabled" : "Enable Auto-Optimize"}
                          >
                            <Sparkles className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                                const clone: TradingBot = {
                                    ...bot,
                                    id: Math.random().toString(36).substring(7),
                                    name: `${bot.name} (Clone)`,
                                    status: 'paused',
                                    pnl: 0,
                                    trades: 0,
                                    performanceHistory: []
                                };
                                onAddBot(clone);
                            }}
                            className="p-2 text-gray-600 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                            title="Clone Bot"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => onDeleteBot(bot.id)}
                            className="p-2 text-gray-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                            title="Delete Bot"
                          >
                              <Trash2 className="w-4 h-4" />
                          </button>
                      </div>
                  </div>
              ))}
          </div>
      )}

      {optimizationResult && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
                  <div className="p-6 border-b border-gray-800 flex items-center justify-between bg-gray-950">
                      <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-500 border border-indigo-500/20">
                              <Wand2 className="w-5 h-5" />
                          </div>
                          <div>
                              <h3 className="text-xl font-bold text-white">Strategy Optimization</h3>
                              <p className="text-xs text-gray-500">AI Suggested Calibrations</p>
                          </div>
                      </div>
                      <button 
                          onClick={() => setOptimizationResult(null)}
                          className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                      >
                          <X className="w-5 h-5" />
                      </button>
                  </div>
                  
                  <div className="p-6 space-y-6">
                      <div className="space-y-4">
                          <h4 className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">Select Optimization Path</h4>
                          <div className="flex flex-col gap-3">
                              {optimizationResult.suggestions && optimizationResult.suggestions.map((suggestion, idx) => (
                                  <button
                                      key={idx}
                                      onClick={() => setSelectedSuggestionIndex(idx)}
                                      className={`text-left p-4 rounded-xl border transition-all ${
                                          selectedSuggestionIndex === idx
                                              ? 'bg-indigo-500/10 border-indigo-500/50'
                                              : 'bg-gray-950 border-gray-800 hover:border-gray-700'
                                      }`}
                                  >
                                      <div className="flex justify-between items-center mb-2">
                                          <div className={`text-sm font-bold ${selectedSuggestionIndex === idx ? 'text-indigo-400' : 'text-gray-300'}`}>
                                              {suggestion.name || 'Optimization Suggestion'}
                                          </div>
                                          <div className="text-xs font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">
                                              Score: +{suggestion.score}
                                          </div>
                                      </div>
                                      <div className="text-xs font-mono text-gray-400">
                                          {suggestion.strategy.indicator} {suggestion.strategy.condition} {suggestion.strategy.value}
                                      </div>
                                  </button>
                              ))}
                          </div>
                      </div>

                      {optimizationResult.suggestions && optimizationResult.suggestions[selectedSuggestionIndex] && (
                          <div className="bg-gray-950 border border-gray-800 rounded-xl p-4">
                              <div className="text-[10px] font-bold text-gray-600 uppercase mb-2 flex items-center gap-1.5">
                                  <Sparkles className="w-3 h-3 text-amber-500" /> AI Reasoning
                              </div>
                              <p className="text-xs text-gray-400 leading-relaxed font-mono">
                                  {optimizationResult.suggestions[selectedSuggestionIndex].reasoning}
                              </p>
                          </div>
                      )}

                      <div className="flex gap-3 pt-2">
                          <button 
                              onClick={() => setOptimizationResult(null)}
                              className="flex-1 py-3 text-gray-500 hover:text-white font-bold text-xs uppercase tracking-widest transition-colors"
                          >
                              Discard
                          </button>
                          <button 
                              onClick={applyOptimization}
                              className="flex-2 py-3 px-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-indigo-900/20 flex items-center justify-center gap-2 transition-all"
                          >
                              Save Selected <ArrowRight className="w-4 h-4" />
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {selectedBotForAudit && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                  <div className="p-6 border-b border-gray-800 flex items-center justify-between bg-gray-950">
                      <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500 border border-amber-500/20">
                              <BrainCircuit className="w-5 h-5" />
                          </div>
                          <div>
                              <h3 className="text-xl font-bold text-white">XAI Audit Trail</h3>
                              <p className="text-xs text-gray-500">Multi-Agent Swarm Reasoning for {selectedBotForAudit.name}</p>
                          </div>
                      </div>
                      <button 
                          onClick={() => setSelectedBotForAudit(null)}
                          className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                      >
                          <X className="w-5 h-5" />
                      </button>
                  </div>
                  
                  <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                      <div className="space-y-6">
                          {selectedBotForAudit.performanceHistory && selectedBotForAudit.performanceHistory.length > 0 && (
                              <div className="bg-gray-950 border border-gray-800 rounded-xl p-4">
                                  <div className="flex items-center justify-between mb-4">
                                      <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                                          <Activity className="w-4 h-4 text-emerald-500" /> Performance & Activity
                                      </h4>
                                      <div className="flex gap-3 text-xs">
                                          <label className="flex items-center gap-1.5 text-gray-400 cursor-pointer hover:text-white transition-colors">
                                              <input type="checkbox" checked={chartIndicators.sma} onChange={() => setChartIndicators(prev => ({...prev, sma: !prev.sma}))} className="rounded border-gray-700 bg-gray-900 text-amber-500 focus:ring-amber-500 focus:ring-offset-gray-950" />
                                              SMA
                                          </label>
                                          <label className="flex items-center gap-1.5 text-gray-400 cursor-pointer hover:text-white transition-colors">
                                              <input type="checkbox" checked={chartIndicators.ema} onChange={() => setChartIndicators(prev => ({...prev, ema: !prev.ema}))} className="rounded border-gray-700 bg-gray-900 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-950" />
                                              EMA
                                          </label>
                                          <label className="flex items-center gap-1.5 text-gray-400 cursor-pointer hover:text-white transition-colors">
                                              <input type="checkbox" checked={chartIndicators.bb} onChange={() => setChartIndicators(prev => ({...prev, bb: !prev.bb}))} className="rounded border-gray-700 bg-gray-900 text-purple-500 focus:ring-purple-500 focus:ring-offset-gray-950" />
                                              BB
                                          </label>
                                          <label className="flex items-center gap-1.5 text-gray-400 cursor-pointer hover:text-white transition-colors">
                                              <input type="checkbox" checked={chartIndicators.rsi} onChange={() => setChartIndicators(prev => ({...prev, rsi: !prev.rsi}))} className="rounded border-gray-700 bg-gray-900 text-orange-500 focus:ring-orange-500 focus:ring-offset-gray-950" />
                                              RSI
                                          </label>
                                      </div>
                                  </div>
                                  <div className="h-56 w-full">
                                      <ResponsiveContainer width="100%" height="100%">
                                          <LineChart data={auditChartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                                              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                              <XAxis 
                                                  dataKey="timestamp" 
                                                  tickFormatter={(unixTime) => new Date(unixTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} 
                                                  stroke="#666" 
                                                  fontSize={10} 
                                                  tickMargin={10} 
                                              />
                                              <YAxis yAxisId="left" stroke="#666" fontSize={10} tickFormatter={(val) => `$${val.toFixed(0)}`} width={60} />
                                              <YAxis yAxisId="right" orientation="right" stroke="#666" fontSize={10} width={40} />
                                              {chartIndicators.rsi && <YAxis yAxisId="rsiAxis" orientation="right" domain={[0, 100]} hide />}
                                              <Tooltip content={<CustomChartTooltip />} cursor={{ fill: '#374151', opacity: 0.4 }} />
                                              {chartIndicators.bb && (
                                                  <>
                                                    <Line yAxisId="left" type="monotone" dataKey="bbUpper" stroke="#a855f7" strokeWidth={1} strokeDasharray="5 5" dot={false} name="bbUpper" />
                                                    <Line yAxisId="left" type="monotone" dataKey="bbLower" stroke="#a855f7" strokeWidth={1} strokeDasharray="5 5" dot={false} name="bbLower" />
                                                  </>
                                              )}
                                              {chartIndicators.sma && <Line yAxisId="left" type="monotone" dataKey="sma" stroke="#f59e0b" strokeWidth={1.5} dot={false} name="sma" />}
                                              {chartIndicators.ema && <Line yAxisId="left" type="monotone" dataKey="ema" stroke="#3b82f6" strokeWidth={1.5} dot={false} name="ema" />}
                                              {chartIndicators.rsi && <Line yAxisId="rsiAxis" type="monotone" dataKey="rsi" stroke="#f97316" strokeWidth={1.5} dot={false} name="rsi" />}
                                              <Line yAxisId="left" type="monotone" dataKey="pnl" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 4 }} name="pnl" />
                                              <Line yAxisId="right" type="stepAfter" dataKey="trades" stroke="#8b5cf6" strokeWidth={1} dot={false} name="trades" opacity={0.5} />
                                          </LineChart>
                                      </ResponsiveContainer>
                                  </div>
                              </div>
                          )}

                          <div className="bg-gray-950 border border-gray-800 rounded-xl p-4">
                              <div className="flex items-center gap-2 mb-3">
                                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                  <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Fundamental Agent</h4>
                              </div>
                              <p className="text-sm text-gray-400 leading-relaxed">
                                  Analyzed recent SEC filings and macroeconomic indicators. Identified strong long-term viability metrics and positive cash flow trends. Assigned a fundamental score of <span className="text-emerald-400 font-mono font-bold">85/100</span>.
                              </p>
                          </div>

                          <div className="bg-gray-950 border border-gray-800 rounded-xl p-4">
                              <div className="flex items-center gap-2 mb-3">
                                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                  <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Technical Agent</h4>
                              </div>
                              <p className="text-sm text-gray-400 leading-relaxed">
                                  Processed historical price action and order book depth. Detected a bullish breakout pattern with RSI crossing above 50. Confirmed upward momentum. Suggested entry price target: <span className="text-blue-400 font-mono font-bold">Market</span>.
                              </p>
                          </div>

                          <div className="bg-gray-950 border border-gray-800 rounded-xl p-4">
                              <div className="flex items-center gap-2 mb-3">
                                  <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                                  <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Sentiment Agent</h4>
                              </div>
                              <p className="text-sm text-gray-400 leading-relaxed">
                                  Scraped real-time news feeds and social media. Detected minor negative sentiment regarding a recent product delay, but overall narrative remains positive. Sentiment score: <span className="text-rose-400 font-mono font-bold">Neutral-Positive</span>.
                              </p>
                          </div>

                          <div className="bg-gray-950 border border-amber-500/30 rounded-xl p-4 relative overflow-hidden">
                              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-3xl rounded-full pointer-events-none"></div>
                              <div className="flex items-center gap-2 mb-3 relative z-10">
                                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                                  <h4 className="text-sm font-bold text-amber-500 uppercase tracking-wider">Orchestrator Agent (Consensus)</h4>
                              </div>
                              <p className="text-sm text-gray-300 leading-relaxed relative z-10">
                                  Synthesized inputs from all subordinate agents. The strong fundamental and technical signals outweighed the minor negative sentiment. Risk Management approved the trade size.
                              </p>
                              <div className="mt-4 flex items-center gap-2 relative z-10">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                  <span className="text-xs font-bold text-emerald-500 uppercase">Trade Execution Approved</span>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {errorModalBot && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="bg-gray-900 border border-red-500/30 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col shadow-red-500/10">
                  <div className="p-6 border-b border-gray-800 flex items-center justify-between bg-gray-950">
                      <div>
                          <h2 className="text-lg font-black text-white flex items-center gap-2 uppercase tracking-wide">
                              <AlertTriangle className="w-5 h-5 text-red-500" />
                              Execution Error
                          </h2>
                          <div className="text-xs text-gray-500 font-mono mt-1">{errorModalBot.name}</div>
                      </div>
                      <button 
                          onClick={() => setErrorModalBot(null)}
                          className="p-2 text-gray-400 hover:text-white rounded-lg transition-colors bg-gray-800"
                      >
                          <X className="w-5 h-5" />
                      </button>
                  </div>
                  <div className="p-6">
                      <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 flex items-start gap-4 mb-6">
                          <div className="p-3 bg-red-500/10 rounded-lg shrink-0">
                              <Activity className="w-6 h-6 text-red-500" />
                          </div>
                          <div>
                              <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest mb-1">Error Diagnostics</h3>
                              <p className="text-sm text-gray-400 leading-relaxed font-mono whitespace-pre-wrap">
                                  {errorModalBot.errorMessage || 'Unknown execution error occurred during bot operation. Pipeline halted to prevent further loss.'}
                              </p>
                          </div>
                      </div>

                      <div className="flex gap-4">
                          <button
                            onClick={() => {
                                onToggleBot(errorModalBot.id); // This restarts or attempts to reconnect
                                setErrorModalBot(null);
                            }}
                            className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg flex justify-center items-center gap-2"
                          >
                              <Play className="w-4 h-4" /> Restart Bot
                          </button>
                          <button
                            onClick={() => setErrorModalBot(null)}
                            className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 rounded-xl transition-all"
                          >
                              Acknowledge
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default BotLab;
