import React, { useState, useEffect } from 'react';
import { PredictionMarket, PredictionBot } from '../types';
import { Sparkles, BrainCircuit, Activity, TrendingUp, TrendingDown, Target, Zap, Loader2, Play, Pause, Plus, CheckCircle, Settings } from 'lucide-react';

const mockMarkets: PredictionMarket[] = [
  { id: 'm1', question: 'Will the Fed cut rates in March 2026?', category: 'economics', probabilityYes: 42, volume: 1520000, endDate: '2026-03-20', resolutionSource: 'Federal Reserve', platforms: { polymarket: { yesPrice: 0.42, noPrice: 0.58, volume: 1520000 } } },
  { id: 'm2', question: 'Will Bitcoin hit $150k by EOY?', category: 'crypto', probabilityYes: 68, volume: 8400000, endDate: '2026-12-31', resolutionSource: 'Coinbase', platforms: { kalshi: { yesPrice: 0.68, noPrice: 0.32, volume: 8400000 } } },
  { id: 'm3', question: 'Will OpenAI release GPT-5 before Q3?', category: 'tech', probabilityYes: 85, volume: 3100000, endDate: '2026-06-30', resolutionSource: 'OpenAI Blog', platforms: { coinbase: { yesPrice: 0.85, noPrice: 0.15, volume: 3100000 } } },
  { id: 'm4', question: 'Will Ethereum flip Bitcoin in Market Cap?', category: 'crypto', probabilityYes: 12, volume: 5600000, endDate: '2026-12-31', resolutionSource: 'CoinMarketCap', platforms: { polymarket: { yesPrice: 0.12, noPrice: 0.88, volume: 5600000 } } },
  { id: 'm5', question: 'Will the S&P 500 close above 5000 next Friday?', category: 'economics', probabilityYes: 55, volume: 12500000, endDate: '2026-03-06', resolutionSource: 'NYSE', platforms: { kalshi: { yesPrice: 0.55, noPrice: 0.45, volume: 12500000 } } },
];

const mockBots: PredictionBot[] = [
  { id: 'b1', name: 'Macro Oracle', marketId: 'm1', targetPlatforms: ['polymarket'], strategy: 'NLP on Fed speeches + CPI data', status: 'active', pnl: 14.5, trades: 10, confidence: 88 },
  { id: 'b2', name: 'Crypto Sentiment', marketId: 'm2', targetPlatforms: ['kalshi'], strategy: 'Twitter/Reddit sentiment + On-chain flows', status: 'learning', pnl: 2.1, trades: 12, confidence: 65 },
  { id: 'b3', name: 'SPX Sentiment Oracle', marketId: 'm5', targetPlatforms: ['polymarket'], strategy: 'Gemini Real-time Market Analysis + Financial News Sentiment', status: 'active', pnl: 8.4, trades: 8, confidence: 72 },
  { id: 'b4', name: 'Polymarket Arbitrageur', marketId: 'm1', targetPlatforms: ['polymarket', 'kalshi'], strategy: 'Cross-platform combinatorial arbitrage scanning Polymarket and Kalshi', status: 'active', pnl: 22.1, trades: 45, confidence: 95 },
  { id: 'b5', name: 'Kalshi Event Trader', marketId: 'm5', targetPlatforms: ['kalshi'], strategy: 'Event-driven sentiment trader parsing economic data releases in real-time', status: 'learning', pnl: 0.5, trades: 2, confidence: 55 },
];

export default function OracleSpace() {
  const [markets, setMarkets] = useState<PredictionMarket[]>(mockMarkets);
  const [bots, setBots] = useState<PredictionBot[]>(mockBots);
  const [isAgentActive, setIsAgentActive] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [isCreatingMarket, setIsCreatingMarket] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'volume' | 'endDate' | 'probabilityYes'>('volume');
  const [deployExchanges, setDeployExchanges] = useState<Record<string, string>>({});
  const [isApiKeysModalOpen, setIsApiKeysModalOpen] = useState(false);
  const [apiKeys, setApiKeys] = useState({
    polymarketKey: localStorage.getItem('exchange_creds_polymarket') ? JSON.parse(localStorage.getItem('exchange_creds_polymarket')!).key : '',
    polymarketSecret: localStorage.getItem('exchange_creds_polymarket') ? JSON.parse(localStorage.getItem('exchange_creds_polymarket')!).secret : '',
    kalshiKey: localStorage.getItem('exchange_creds_kalshi') ? JSON.parse(localStorage.getItem('exchange_creds_kalshi')!).key : '',
    kalshiSecret: localStorage.getItem('exchange_creds_kalshi') ? JSON.parse(localStorage.getItem('exchange_creds_kalshi')!).secret : '',
  });

  const [newMarket, setNewMarket] = useState<Partial<PredictionMarket>>({
    category: 'crypto',
    probabilityYes: 50,
    volume: 0
  });

  const handleSaveApiKeys = () => {
    localStorage.setItem('exchange_creds_polymarket', JSON.stringify({ key: apiKeys.polymarketKey, secret: apiKeys.polymarketSecret }));
    localStorage.setItem('exchange_creds_kalshi', JSON.stringify({ key: apiKeys.kalshiKey, secret: apiKeys.kalshiSecret }));
    setIsApiKeysModalOpen(false);
    alert('Prediction Market API Keys saved successfully.');
  };

  // Simulate agent activity
  useEffect(() => {
    if (isAgentActive) {
      const interval = setInterval(() => {
        setBots(current => current.map(bot => {
          if (bot.status === 'learning') {
            return { ...bot, confidence: Math.min(99, bot.confidence + Math.random() * 5), pnl: bot.pnl + (Math.random() * 2 - 0.5) };
          }
          return bot;
        }));
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isAgentActive]);

  const handleDeployBot = (marketId: string) => {
    setIsDeploying(true);
    setTimeout(() => {
      const market = markets.find(m => m.id === marketId);
      const exchange = deployExchanges[marketId] || 'polymarket';
      const newBot: PredictionBot = {
        id: `b${Date.now()}`,
        name: `Gemini ${market?.category} Agent`,
        marketId,
        targetPlatforms: [exchange as any],
        strategy: `Analyzing ${market?.category} trends for "${market?.question}" using data from ${market?.resolutionSource}`,
        status: 'learning',
        pnl: 0,
        trades: 0,
        confidence: 50
      };
      setBots([...bots, newBot]);
      setIsDeploying(false);
    }, 2000);
  };

  const handleCreateMarket = () => {
    if (!newMarket.question || !newMarket.endDate || !newMarket.resolutionSource) return;
    
    const market: PredictionMarket = {
      id: `m${Date.now()}`,
      question: newMarket.question,
      category: newMarket.category as any,
      probabilityYes: newMarket.probabilityYes || 50,
      volume: 0,
      endDate: newMarket.endDate,
      resolutionSource: newMarket.resolutionSource,
      platforms: {}
    };
    
    setMarkets([market, ...markets]);
    setIsCreatingMarket(false);
    setNewMarket({ category: 'crypto', probabilityYes: 50, volume: 0 });
  };

  const formatMoney = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact' }).format(val);

  const filteredAndSortedMarkets = markets
    .filter(m => filterCategory === 'all' || m.category === filterCategory)
    .sort((a, b) => {
      if (sortBy === 'volume') return b.volume - a.volume;
      if (sortBy === 'probabilityYes') return b.probabilityYes - a.probabilityYes;
      if (sortBy === 'endDate') return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
      return 0;
    });

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-950">
      {/* Header */}
      <div className="p-6 border-b border-gray-800 bg-gray-900/50">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-purple-500" />
              Gemini Oracle Space
            </h1>
            <p className="text-sm text-gray-400 mt-1">Prediction Market Meta-Learning & Automated Deployment</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsApiKeysModalOpen(true)}
              className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-lg border border-gray-700"
            >
              <Settings className="w-4 h-4" /> API Keys
            </button>
            <button
              onClick={() => setIsCreatingMarket(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-900/20"
            >
              <Plus className="w-4 h-4" /> Create Market
            </button>
            <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-lg p-2">
              <span className="text-sm font-medium text-gray-300">Meta-Agent Status:</span>
              <button 
                onClick={() => setIsAgentActive(!isAgentActive)}
                className={`px-4 py-1.5 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${isAgentActive ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}
              >
                {isAgentActive ? <><Activity className="w-4 h-4 animate-pulse" /> Active</> : <><Pause className="w-4 h-4" /> Paused</>}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Markets Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-400" /> Active Prediction Markets
            </h2>
            <div className="flex items-center gap-3">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="bg-gray-900 border border-gray-800 text-gray-300 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2"
              >
                <option value="all">All Categories</option>
                <option value="crypto">Crypto</option>
                <option value="economics">Economics</option>
                <option value="politics">Politics</option>
                <option value="tech">Tech</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-gray-900 border border-gray-800 text-gray-300 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2"
              >
                <option value="volume">Sort by Volume</option>
                <option value="probabilityYes">Sort by Probability</option>
                <option value="endDate">Sort by End Date</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAndSortedMarkets.map(market => (
              <div key={market.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                  <BrainCircuit className="w-16 h-16 text-indigo-500" />
                </div>
                
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${
                    market.category === 'crypto' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                    market.category === 'economics' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                    'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                  }`}>
                    {market.category}
                  </span>
                  <span className="text-xs text-gray-500">Vol: {formatMoney(market.volume)}</span>
                </div>
                
                <h3 className="text-lg font-bold text-white mb-4 relative z-10 leading-tight">{market.question}</h3>
                
                <div className="space-y-3 relative z-10">
                  <div className="flex justify-between text-sm">
                    <span className="text-emerald-400 font-medium">Yes: {market.probabilityYes}%</span>
                    <span className="text-rose-400 font-medium">No: {100 - market.probabilityYes}%</span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden flex">
                    <div className="h-full bg-emerald-500" style={{ width: `${market.probabilityYes}%` }}></div>
                    <div className="h-full bg-rose-500" style={{ width: `${100 - market.probabilityYes}%` }}></div>
                  </div>
                </div>

                <div className="mt-6 flex gap-2 relative z-10">
                  <select
                    value={deployExchanges[market.id] || 'Polymarket'}
                    onChange={(e) => setDeployExchanges({...deployExchanges, [market.id]: e.target.value})}
                    disabled={isDeploying || bots.some(b => b.marketId === market.id)}
                    className="bg-gray-950 border border-gray-800 text-gray-300 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2 w-1/3"
                  >
                    <option value="Polymarket">Polymarket</option>
                    <option value="Kalshi">Kalshi</option>
                  </select>
                  <button 
                    onClick={() => handleDeployBot(market.id)}
                    disabled={isDeploying || bots.some(b => b.marketId === market.id)}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white py-2 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2"
                  >
                    {bots.some(b => b.marketId === market.id) ? (
                      <><CheckCircle className="w-4 h-4" /> Agent Deployed</>
                    ) : (
                      <><Zap className="w-4 h-4" /> Deploy Gemini Agent</>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Deployed Bots Column */}
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-purple-400" /> Deployed Agents
          </h2>
          
          <div className="space-y-4">
            {bots.map(bot => {
              const market = markets.find(m => m.id === bot.marketId);
              return (
                <div key={bot.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-white text-sm">{bot.name}</h3>
                        {bot.targetPlatforms && bot.targetPlatforms.map(platform => <span key={platform} className="text-[9px] px-1 rounded font-bold bg-gray-800 text-gray-400 border border-gray-700">{platform}</span>)}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">{market?.question}</p>
                    </div>
                    <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded flex items-center gap-1 ${
                      bot.status === 'active' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                      bot.status === 'learning' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                      'bg-gray-800 text-gray-400'
                    }`}>
                      {bot.status === 'learning' && <Loader2 className="w-3 h-3 animate-spin" />}
                      {bot.status}
                    </span>
                  </div>
                  
                  <div className="bg-gray-950 rounded p-3 mb-4 border border-gray-800/50">
                    <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Strategy</div>
                    <div className="text-xs text-indigo-300">{bot.strategy}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Performance</div>
                      <div className={`text-lg font-bold flex items-center gap-1 ${bot.pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {bot.pnl >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        {bot.pnl > 0 ? '+' : ''}{bot.pnl.toFixed(2)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">AI Confidence</div>
                      <div className="text-lg font-bold text-purple-400">{bot.confidence.toFixed(1)}%</div>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {bots.length === 0 && (
              <div className="text-center p-8 border border-dashed border-gray-800 rounded-xl">
                <BrainCircuit className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-400">No agents deployed yet.<br/>Deploy an agent to start predicting.</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Create Market Modal */}
      {isCreatingMarket && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-indigo-400" />
                Create Prediction Market
              </h2>
              <button onClick={() => setIsCreatingMarket(false)} className="text-gray-500 hover:text-gray-300">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Question</label>
                <input 
                  type="text" 
                  value={newMarket.question || ''} 
                  onChange={e => setNewMarket({...newMarket, question: e.target.value})}
                  placeholder="e.g. Will Bitcoin hit $100k?"
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Category</label>
                  <select 
                    value={newMarket.category}
                    onChange={e => setNewMarket({...newMarket, category: e.target.value as any})}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="crypto">Crypto</option>
                    <option value="economics">Economics</option>
                    <option value="politics">Politics</option>
                    <option value="tech">Tech</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Initial Probability (%)</label>
                  <input 
                    type="number" 
                    min="1" max="99"
                    value={newMarket.probabilityYes || 50} 
                    onChange={e => setNewMarket({...newMarket, probabilityYes: parseInt(e.target.value)})}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">End Date</label>
                  <input 
                    type="date" 
                    value={newMarket.endDate || ''} 
                    onChange={e => setNewMarket({...newMarket, endDate: e.target.value})}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Resolution Source</label>
                  <input 
                    type="text" 
                    value={newMarket.resolutionSource || ''} 
                    onChange={e => setNewMarket({...newMarket, resolutionSource: e.target.value})}
                    placeholder="e.g. CoinMarketCap"
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-800 bg-gray-900/50 flex gap-3">
              <button 
                onClick={() => setIsCreatingMarket(false)}
                className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-bold transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateMarket}
                disabled={!newMarket.question || !newMarket.endDate || !newMarket.resolutionSource}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Create
              </button>
            </div>
          </div>
        </div>
      )}
      {/* API Keys Modal */}
      {isApiKeysModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-400" />
                Prediction Market API Keys
              </h2>
              <button onClick={() => setIsApiKeysModalOpen(false)} className="text-gray-500 hover:text-gray-300">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <h3 className="text-sm font-bold text-gray-300 border-b border-gray-800 pb-2">Polymarket</h3>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">L1/L2 Key / API Key</label>
                <input 
                  type="text" 
                  value={apiKeys.polymarketKey} 
                  onChange={e => setApiKeys({...apiKeys, polymarketKey: e.target.value})}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500 font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Passphrase / Secret</label>
                <input 
                  type="password" 
                  value={apiKeys.polymarketSecret} 
                  onChange={e => setApiKeys({...apiKeys, polymarketSecret: e.target.value})}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500 font-mono text-sm"
                />
              </div>

              <h3 className="text-sm font-bold text-gray-300 border-b border-gray-800 pb-2 mt-6">Kalshi</h3>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">API Key</label>
                <input 
                  type="text" 
                  value={apiKeys.kalshiKey} 
                  onChange={e => setApiKeys({...apiKeys, kalshiKey: e.target.value})}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500 font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Private Key / Secret</label>
                <input 
                  type="password" 
                  value={apiKeys.kalshiSecret} 
                  onChange={e => setApiKeys({...apiKeys, kalshiSecret: e.target.value})}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500 font-mono text-sm"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-800 bg-gray-900/50 flex gap-3">
              <button 
                onClick={() => setIsApiKeysModalOpen(false)}
                className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-bold transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveApiKeys}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
              >
                Save Keys
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
