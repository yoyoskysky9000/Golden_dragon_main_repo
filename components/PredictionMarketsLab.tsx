import React, { useState } from 'react';
import { PredictionMarket, PredictionBot } from '../types';
import { BrainCircuit, TrendingUp, Globe, Target, AlertTriangle, Plus, Activity, Play, Pause, Search, Crosshair, BarChart2, Loader2, Settings, CheckCircle } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, YAxis, XAxis, CartesianGrid, Tooltip } from 'recharts';

interface PredictionMarketsLabProps {}

const mockMarkets: PredictionMarket[] = [
    {
        id: 'pm-1',
        question: 'Will the Fed cut rates by 25bps in June?',
        category: 'economics',
        probabilityYes: 0.65,
        volume: 24500000,
        endDate: '2026-06-15T00:00:00Z',
        resolutionSource: 'Federal Reserve',
        platforms: {
            kalshi: { yesPrice: 0.66, noPrice: 0.35, volume: 12000000 },
            polymarket: { yesPrice: 0.64, noPrice: 0.36, volume: 8000000 },
            coinbase: { yesPrice: 0.65, noPrice: 0.35, volume: 4500000 } // Coinbase PM hypothetically
        }
    },
    {
        id: 'pm-2',
        question: 'Bitcoin to touch $150k before EOY?',
        category: 'crypto',
        probabilityYes: 0.42,
        volume: 89000000,
        endDate: '2026-12-31T23:59:59Z',
        resolutionSource: 'CoinGecko',
        platforms: {
            polymarket: { yesPrice: 0.42, noPrice: 0.58, volume: 70000000 },
            coinbase: { yesPrice: 0.41, noPrice: 0.59, volume: 19000000 }
        }
    },
    {
        id: 'pm-3',
        question: 'AI Regulations passed by Congress in 2026?',
        category: 'politics',
        probabilityYes: 0.28,
        volume: 3500000,
        endDate: '2026-12-31T23:59:59Z',
        resolutionSource: 'congress.gov',
        platforms: {
            kalshi: { yesPrice: 0.28, noPrice: 0.73, volume: 2100000 },
            polymarket: { yesPrice: 0.27, noPrice: 0.73, volume: 1400000 }
        }
    },
    {
        id: 'pm-4',
        question: 'Will Microsoft acquire another major tech company by EOY 2026?',
        category: 'tech',
        probabilityYes: 0.30,
        volume: 1500000,
        endDate: '2026-12-31T23:59:59Z',
        resolutionSource: 'SEC Filings',
        platforms: {
            kalshi: { yesPrice: 0.30, noPrice: 0.70, volume: 900000 },
            polymarket: { yesPrice: 0.31, noPrice: 0.69, volume: 600000 }
        }
    }
];

const mockBots: PredictionBot[] = [
    {
        id: 'pb-1',
        name: 'Fed Rate Arb Bot',
        marketId: 'pm-1',
        targetPlatforms: ['kalshi', 'polymarket'],
        strategy: 'Cross-platform Arbitrage & NLP Sentiment on Powell Speeches',
        status: 'active',
        pnl: 1450.50,
        trades: 124,
        confidence: 88,
        performanceHistory: Array.from({length: 20}).map((_, i) => ({
            timestamp: Date.now() - (20 - i) * 86400000,
            pnl: 1000 + i * 22 + (Math.random() * 50 - 25)
        }))
    }
];

const PredictionMarketsLab: React.FC<PredictionMarketsLabProps> = () => {
    const [view, setView] = useState<'markets' | 'bots'>('markets');
    const [selectedMarket, setSelectedMarket] = useState<PredictionMarket | null>(null);
    const [bots, setBots] = useState<PredictionBot[]>(mockBots);
    const [deployingMarketId, setDeployingMarketId] = useState<string | null>(null);
    const [selectedExchange, setSelectedExchange] = useState<string>('kalshi');
    const [isDeploying, setIsDeploying] = useState(false);
    
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [apiKeys, setApiKeys] = useState({
        polymarketKey: localStorage.getItem('pm_polymarket_key') || '',
        polymarketSecret: localStorage.getItem('pm_polymarket_secret') || '',
        kalshiKey: localStorage.getItem('pm_kalshi_key') || '',
        kalshiSecret: localStorage.getItem('pm_kalshi_secret') || '',
    });

    const [realMarkets, setRealMarkets] = useState<PredictionMarket[]>(mockMarkets);

    React.useEffect(() => {
        const fetchRealMarkets = async () => {
            try {
                // Fetch from Polymarket via proxy
                const res = await fetch('/api/prediction-markets/polymarket');
                if (res.ok) {
                    const data = await res.json();
                    if (data.data && Array.isArray(data.data)) {
                        const parsedMarkets: PredictionMarket[] = data.data.slice(0, 5).map((evt: any) => {
                            const pYes = evt.markets && evt.markets[0] ? parseFloat(JSON.parse(evt.markets[0].outcomePrices)[0]) : 0.5;
                            const pNo = evt.markets && evt.markets[0] ? parseFloat(JSON.parse(evt.markets[0].outcomePrices)[1]) : 0.5;
                            
                            return {
                                id: evt.id,
                                question: evt.title || evt.description?.substring(0, 50) + '...',
                                category: 'crypto', // Defaulting since Gamma doesn't always provide simple categories
                                probabilityYes: pYes,
                                volume: evt.volume || 0,
                                endDate: evt.endDate,
                                resolutionSource: evt.resolutionSource || 'Polymarket UMA',
                                platforms: {
                                    polymarket: { yesPrice: pYes, noPrice: pNo, volume: evt.volume }
                                }
                            };
                        });
                        
                        // Merge with mock markets for a robust display
                        setRealMarkets([...mockMarkets, ...parsedMarkets]);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch real markets:", err);
            }
        };
        fetchRealMarkets();
    }, []);

    const handleSaveApiKeys = () => {
        localStorage.setItem('pm_polymarket_key', apiKeys.polymarketKey);
        localStorage.setItem('pm_polymarket_secret', apiKeys.polymarketSecret);
        localStorage.setItem('pm_kalshi_key', apiKeys.kalshiKey);
        localStorage.setItem('pm_kalshi_secret', apiKeys.kalshiSecret);
        setIsSettingsModalOpen(false);
        // Simulate a toast or success feedback
        alert("API Keys Saved successfully.");
    };

    const handleDeployConfirm = async (marketId: string) => {
        setIsDeploying(true);
        const market = realMarkets.find(m => m.id === marketId);
        
        try {
            // Attempt to make a simulated/real trade using backend
            const res = await fetch('/api/prediction-markets/trade', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    platform: selectedExchange,
                    marketId: marketId,
                    amount: 100, // Example starting capital for bot
                    isYes: true, // Example starting position strategy
                    apiKeys: apiKeys
                })
            });
            const data = await res.json();
            
            if (!res.ok || !data.success) {
                // We'll show an alert or throw if the key was invalid
                alert(data.error || 'Failed to deploy: Missing or invalid API keys.');
                setIsDeploying(false);
                return;
            }

            // deployment successful
            setTimeout(() => {
                const newBot: PredictionBot = {
                    id: `pb-${Date.now()}`,
                    name: `Oracle Agent - ${market?.category.toUpperCase()}`,
                    marketId: marketId,
                    targetPlatforms: [selectedExchange as any],
                    strategy: `Automated sentiment and probability routing for ${market?.question}`,
                    status: 'learning',
                    pnl: 0,
                    trades: 1, // Started with 1 trade from deployment
                    confidence: 50,
                    performanceHistory: []
                };
                setBots([newBot, ...bots]);
                setIsDeploying(false);
                setDeployingMarketId(null);
                setView('bots');
            }, 800);
            
        } catch (error) {
            console.error('Trading API error', error);
            alert('Failed to connect to API Gateway.');
            setIsDeploying(false);
        }
    };

    return (
        <div className="flex-1 overflow-y-auto bg-[#050510] relative text-gray-300 flex flex-col">
            {/* Header */}
            <div className="bg-[#0a0a18] border-b border-rose-900/40 p-6 z-10 sticky top-0">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tighter flex items-center gap-3 uppercase">
                            <Crosshair className="w-8 h-8 text-rose-500" /> Prediction Markets
                        </h1>
                        <p className="text-gray-400 text-sm mt-1">Cross-exchange prediction betting and automated oracle strategies.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex bg-gray-900 p-1 rounded-xl">
                            <button 
                                onClick={() => setView('markets')}
                                className={`px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-widest transition-colors ${view === 'markets' ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/50' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                Active Markets
                            </button>
                            <button 
                                onClick={() => setView('bots')}
                                className={`px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-widest transition-colors ${view === 'bots' ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/50' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                Market Bots
                            </button>
                        </div>
                        <button 
                            onClick={() => setIsSettingsModalOpen(true)}
                            className="bg-gray-800 hover:bg-gray-700 p-2.5 rounded-xl border border-gray-700 transition-colors"
                            title="Exchange API Keys"
                        >
                            <Settings className="w-5 h-5 text-gray-400" />
                        </button>
                    </div>
                </div>
            </div>

            {isSettingsModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-[#0a0a18] border border-gray-800 rounded-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900/40">
                            <h2 className="text-xl font-black text-white flex items-center gap-2 uppercase tracking-tight">
                                <Settings className="w-5 h-5 text-fuchsia-500" /> Exchange Integration
                            </h2>
                            <button onClick={() => setIsSettingsModalOpen(false)} className="text-gray-500 hover:text-white transition-colors">
                                <Plus className="w-6 h-6 rotate-45 transform" />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Polymarket API Key (Or Proxy)</label>
                                <input 
                                    type="password"
                                    placeholder="Enter Polymarket API Key"
                                    value={apiKeys.polymarketKey}
                                    onChange={(e) => setApiKeys({...apiKeys, polymarketKey: e.target.value})}
                                    className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-sm text-white focus:border-fuchsia-500 outline-none transition-colors"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Polymarket Private Key / Secret</label>
                                <input 
                                    type="password"
                                    placeholder="Enter Polymarket Private Key"
                                    value={apiKeys.polymarketSecret}
                                    onChange={(e) => setApiKeys({...apiKeys, polymarketSecret: e.target.value})}
                                    className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-sm text-white focus:border-fuchsia-500 outline-none transition-colors"
                                />
                            </div>
                            <div className="pt-4 border-t border-gray-800/50">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Kalshi API Key</label>
                                <input 
                                    type="password"
                                    placeholder="Enter Kalshi API Key"
                                    value={apiKeys.kalshiKey}
                                    onChange={(e) => setApiKeys({...apiKeys, kalshiKey: e.target.value})}
                                    className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-sm text-white focus:border-fuchsia-500 outline-none transition-colors"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Kalshi Private Key</label>
                                <textarea 
                                    placeholder="Enter Kalshi Private Key (PEM format)"
                                    value={apiKeys.kalshiSecret}
                                    onChange={(e) => setApiKeys({...apiKeys, kalshiSecret: e.target.value})}
                                    className="w-full h-24 bg-gray-950 border border-gray-800 rounded-lg p-3 text-sm text-white focus:border-fuchsia-500 outline-none transition-colors resize-none font-mono text-xs"
                                />
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-800 bg-gray-900/20 flex justify-end gap-3">
                            <button 
                                onClick={() => setIsSettingsModalOpen(false)}
                                className="px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSaveApiKeys}
                                className="px-5 py-2.5 bg-fuchsia-600 hover:bg-fuchsia-500 text-white rounded-lg text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2"
                            >
                                <CheckCircle className="w-4 h-4" /> Save Keys
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-7xl mx-auto w-full p-6 flex-1 flex flex-col">
                {view === 'markets' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {realMarkets.map(market => (
                                <div key={market.id} className="bg-[#0a0a18]/70 border border-gray-800 hover:border-rose-500/50 rounded-xl p-6 transition-all group flex flex-col">
                                    <div className="flex justify-between items-start mb-4">
                                        <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-widest ${
                                            market.category === 'crypto' ? 'bg-blue-900/30 text-blue-400 border border-blue-800/50' :
                                            market.category === 'economics' ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800/50' :
                                            market.category === 'tech' ? 'bg-amber-900/30 text-amber-500 border border-amber-800/50' :
                                            'bg-purple-900/30 text-purple-400 border border-purple-800/50'
                                        }`}>{market.category}</span>
                                        <div className="text-xs text-gray-500 bg-gray-900 px-2 py-1 rounded border border-gray-800">
                                            Vol: ${(market.volume / 1000000).toFixed(1)}M
                                        </div>
                                    </div>
                                    <h3 className="text-lg font-black text-white leading-tight mb-6">{market.question}</h3>
                                    
                                    <div className="mt-auto space-y-3">
                                        {market.platforms.kalshi && (
                                            <div className="flex items-center justify-between bg-gray-900/50 p-2 rounded-lg border border-gray-800/50">
                                                <span className="text-xs font-bold text-gray-400 tracking-wider">KALSHI</span>
                                                <div className="flex gap-2">
                                                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-mono">Y: {(market.platforms.kalshi.yesPrice * 100).toFixed(1)}c</span>
                                                    <span className="text-[10px] bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded font-mono">N: {(market.platforms.kalshi.noPrice * 100).toFixed(1)}c</span>
                                                </div>
                                            </div>
                                        )}
                                        {market.platforms.polymarket && (
                                            <div className="flex items-center justify-between bg-gray-900/50 p-2 rounded-lg border border-gray-800/50">
                                                <span className="text-xs font-bold text-blue-400 tracking-wider">POLYMARKET</span>
                                                <div className="flex gap-2">
                                                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-mono">Y: {(market.platforms.polymarket.yesPrice * 100).toFixed(1)}c</span>
                                                    <span className="text-[10px] bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded font-mono">N: {(market.platforms.polymarket.noPrice * 100).toFixed(1)}c</span>
                                                </div>
                                            </div>
                                        )}
                                        {market.platforms.coinbase && (
                                            <div className="flex items-center justify-between bg-gray-900/50 p-2 rounded-lg border border-gray-800/50">
                                                <span className="text-xs font-bold text-indigo-400 tracking-wider">COINBASE PM</span>
                                                <div className="flex gap-2">
                                                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-mono">Y: {(market.platforms.coinbase.yesPrice * 100).toFixed(1)}c</span>
                                                    <span className="text-[10px] bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded font-mono">N: {(market.platforms.coinbase.noPrice * 100).toFixed(1)}c</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    {deployingMarketId === market.id ? (
                                        <div className="mt-4 space-y-2 bg-gray-900/50 p-3 rounded-lg border border-gray-800 animate-in fade-in zoom-in-95 duration-200">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Select Exchange</label>
                                            <select 
                                                value={selectedExchange}
                                                onChange={(e) => setSelectedExchange(e.target.value)}
                                                className="w-full bg-gray-950 border border-gray-700 rounded p-2 text-xs text-white outline-none focus:border-rose-500 transition-colors"
                                            >
                                                <option value="kalshi">Kalshi</option>
                                                <option value="polymarket">Polymarket</option>
                                                <option value="coinbase">Coinbase PM</option>
                                            </select>
                                            <button 
                                                onClick={() => handleDeployConfirm(market.id)}
                                                disabled={isDeploying}
                                                className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-bold uppercase tracking-widest transition-colors flex justify-center items-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {isDeploying ? <Loader2 className="w-4 h-4 animate-spin" /> : <><BrainCircuit className="w-4 h-4" /> Deploy Gemini Agent</>}
                                            </button>
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={() => setDeployingMarketId(market.id)}
                                            className="w-full mt-4 py-3 bg-gray-800 hover:bg-rose-600 text-white rounded-lg text-xs font-bold uppercase tracking-widest transition-colors flex justify-center items-center gap-2"
                                        >
                                            <BrainCircuit className="w-4 h-4" /> Deploy Gemini Agent
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {view === 'bots' && (
                    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {bots.map(bot => {
                            const market = realMarkets.find(m => m.id === bot.marketId);
                            return (
                                <div key={bot.id} className="bg-[#0a0a18]/70 border border-gray-800 rounded-xl overflow-hidden flex flex-col lg:flex-row">
                                    <div className="p-6 lg:w-1/3 border-b lg:border-b-0 lg:border-r border-gray-800">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="text-lg font-black text-white leading-tight">{bot.name}</h3>
                                                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{market?.question}</p>
                                            </div>
                                            <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest ${bot.status === 'active' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-500 border border-amber-500/30'}`}>
                                                {bot.status}
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-4 mb-6">
                                            <div>
                                                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block mb-1">Strategy Logic</span>
                                                <p className="text-xs text-gray-400">{bot.strategy}</p>
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block mb-1">Target Bridges</span>
                                                <div className="flex gap-2">
                                                    {bot.targetPlatforms.map(p => (
                                                        <span key={p} className="text-[10px] bg-gray-900 text-gray-400 px-2 py-1 rounded border border-gray-800 uppercase tracking-widest">
                                                            {p}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <button className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-xs font-bold uppercase tracking-widest transition-colors flex justify-center items-center gap-2">
                                                <Pause className="w-3 h-3" /> Pause
                                            </button>
                                            <button className="flex-1 py-2 bg-rose-600/20 hover:bg-rose-600 text-rose-500 hover:text-white border border-rose-500/30 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors flex justify-center items-center gap-2">
                                                <TrendingUp className="w-3 h-3" /> Optimize
                                            </button>
                                        </div>
                                    </div>
                                    <div className="p-6 lg:w-2/3 flex flex-col">
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-center">
                                            <div className="bg-gray-900/50 border border-gray-800/50 p-4 rounded-xl">
                                                <span className="block text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Bot PnL</span>
                                                <span className={`text-xl font-black font-mono ${bot.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                    {bot.pnl >= 0 ? '+' : ''}${bot.pnl.toFixed(2)}
                                                </span>
                                            </div>
                                            <div className="bg-gray-900/50 border border-gray-800/50 p-4 rounded-xl">
                                                <span className="block text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Trades Executed</span>
                                                <span className="text-xl font-black text-white font-mono">{bot.trades}</span>
                                            </div>
                                            <div className="bg-gray-900/50 border border-gray-800/50 p-4 rounded-xl">
                                                <span className="block text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Oracle Confidence</span>
                                                <span className="text-xl font-black text-amber-400 font-mono">{bot.confidence}%</span>
                                            </div>
                                            <div className="bg-gray-900/50 border border-gray-800/50 p-4 rounded-xl">
                                                <span className="block text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Avg Spread Capture</span>
                                                <span className="text-xl font-black text-blue-400 font-mono">1.2c</span>
                                            </div>
                                        </div>

                                        <div className="flex-1 min-h-[160px] bg-gray-900/30 border border-gray-800/30 rounded-xl p-4">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={bot.performanceHistory}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                                    <XAxis dataKey="timestamp" hide />
                                                    <YAxis stroke="#666" fontSize={10} tickFormatter={(val) => `$${val}`} axisLine={false} tickLine={false} width={40} />
                                                    <Tooltip 
                                                        contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }}
                                                        labelFormatter={(v) => new Date(v).toLocaleDateString()}
                                                        formatter={(v: number) => [`$${v.toFixed(2)}`, 'PnL']}
                                                    />
                                                    <Line type="monotone" dataKey="pnl" stroke="#10b981" strokeWidth={2} dot={false} />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PredictionMarketsLab;
