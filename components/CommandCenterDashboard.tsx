import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { StockData, TradingBot, PortfolioPosition, ActiveOrder } from '../types';
import StockChart from './StockChart';
import AIAssistant from './AIAssistant';
import { BrainCircuit, Activity, Zap, TrendingUp, TrendingDown, Target, Focus, List, Briefcase, Clock, Search, Network, Globe } from 'lucide-react';

interface CommandCenterProps {
  stocks: StockData[];
  bots: TradingBot[];
  selectedSymbol: string;
  setSelectedSymbol: (symbol: string) => void;
  portfolio: PortfolioPosition[];
  cashBalance: number;
  realizedPL: number;
  onExecuteTrade: (order: { symbol: string, side: 'buy' | 'sell', quantity: number, type: 'market' | 'limit' | 'stop-loss', price?: number }) => void;
  onOpenDetails: (symbol: string) => void;
}

const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};
const formatCompactMoney = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: "compact", maximumFractionDigits: 1 }).format(amount);
};
const formatPct = (pct: number) => {
    return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
};

const CommandCenterDashboard: React.FC<CommandCenterProps> = ({ 
    stocks, 
    bots, 
    selectedSymbol, 
    setSelectedSymbol,
    portfolio,
    cashBalance,
    realizedPL,
    onExecuteTrade,
    onOpenDetails
}) => {
  const selectedStock = stocks.find(s => s.symbol === selectedSymbol);
  
  // Fake some AI statistics
  const totalBotTrades = bots.reduce((sum, b) => sum + (b.trades || 0), 0);
  const activeBots = bots.filter(b => b.status === 'active').length;
  const overallPnL = bots.reduce((sum, b) => sum + (b.pnl || 0), 0);

  const bestBot = [...bots].sort((a,b) => (b.pnl || 0) - (a.pnl || 0))[0];

  const marketSentiment = useMemo(() => {
     const up = stocks.filter(s => s.change >= 0).length;
     const ratio = up / (stocks.length || 1);
     return ratio > 0.6 ? 'Bullish' : ratio < 0.4 ? 'Bearish' : 'Neutral';
  }, [stocks]);

  const oracleSentiment = useMemo(() => {
     if (!selectedStock) return { score: 50, status: 'Neutral', activeThemes: ['Awaiting Asset Focus'] };
     
     const trendBias = selectedStock.changePercent > 0 ? 25 : -25;
     
     // Oscillate between -5 and 5 based on timestamp / 1000
     const dynamicOscillator = Math.sin(Date.now() / 2000) * 5; 
     
     let score = 50 + trendBias + dynamicOscillator + selectedStock.changePercent;
     score = Math.max(5, Math.min(95, score));
     
     let status = 'Neutral';
     let themePool = ['Consolidation', 'Mixed Volume', 'Market Indecision', 'Range Bound'];
     let color = 'text-amber-400';
     let barColor = 'bg-amber-500 shadow-[0_0_10px_#f59e0b]';
     
     if (score > 75) {
         status = 'Extreme Bullish';
         themePool = ['Viral Breakout', 'Institutional Buying', 'Short Squeeze Alert', 'Moon Math'];
         color = 'text-emerald-400';
         barColor = 'bg-emerald-500 shadow-[0_0_10px_#10b981]';
     } else if (score > 55) {
         status = 'Bullish';
         themePool = ['Accumulation Phase', 'Positive News Cycle', 'Retail Interest Rising', 'Higher Highs'];
         color = 'text-emerald-400';
         barColor = 'bg-emerald-500 shadow-[0_0_10px_#10b981]';
     } else if (score < 25) {
         status = 'Extreme Bearish';
         themePool = ['Capitulation', 'Liquidations Cascading', 'FUD Overload', 'Panic Selling'];
         color = 'text-rose-400';
         barColor = 'bg-rose-500 shadow-[0_0_10px_#f43f5e]';
     } else if (score < 45) {
         status = 'Bearish';
         themePool = ['Distribution Phase', 'Negative Sentiment', 'Support Testing', 'Social Volume Drops'];
         color = 'text-rose-400';
         barColor = 'bg-rose-500 shadow-[0_0_10px_#f43f5e]';
     }
     
     const roundedScore = Math.floor(score);
     const theme1 = themePool[roundedScore % themePool.length];
     const theme2 = themePool[(roundedScore + 1) % themePool.length];
     
     return {
         score,
         status,
         activeThemes: [...new Set([theme1, theme2])].slice(0, 2),
         color,
         barColor
     };
  }, [selectedStock, stocks]);

  return (
    <div className="flex-1 flex overflow-hidden bg-[#050510] text-gray-300">
      
      {/* Left Sidebar - Market Overview */}
      <div className="w-80 bg-[#0a0a18]/70 border-r border-indigo-900/30 flex flex-col z-10 backdrop-blur-md">
        <div className="p-5 border-b border-indigo-900/40 space-y-4">
             <div className="flex items-center justify-between pb-2 border-b border-gray-800">
                 <h2 className="text-sm font-bold text-gray-200 tracking-wider flex items-center gap-2">
                     <BrainCircuit className="w-4 h-4 text-indigo-400" />
                     NEXUS HUB
                 </h2>
                 <span className={`text-[10px] font-mono px-2 py-1 rounded bg-indigo-500/10 border ${marketSentiment === 'Bullish' ? 'text-emerald-400 border-emerald-500/30' : marketSentiment === 'Bearish' ? 'text-rose-400 border-rose-500/30' : 'text-amber-400 border-amber-500/30'}`}>
                     {marketSentiment.toUpperCase()}
                 </span>
             </div>
             
             <div className="grid grid-cols-2 gap-2">
                 <div className="bg-[#101020] p-3 rounded-lg border border-gray-800">
                     <label className="text-[9px] uppercase tracking-widest text-gray-500 block mb-1">Total Equity</label>
                     <div className="text-sm font-bold text-indigo-300 font-mono">{formatMoney(cashBalance + portfolio.reduce((a,b) => a + (b.shares * b.avgCost), 0))}</div>
                 </div>
                 <div className="bg-[#101020] p-3 rounded-lg border border-gray-800">
                     <label className="text-[9px] uppercase tracking-widest text-gray-500 block mb-1">Bot P&L</label>
                     <div className={`text-sm font-bold font-mono ${overallPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                         {formatMoney(overallPnL)}
                     </div>
                 </div>
             </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
            <h3 className="text-[10px] uppercase tracking-widest text-gray-500 font-bold ml-2 mb-2">Live Market Streams</h3>
            {stocks.map((stock, idx) => {
                const multiplier = stock.assetType === 'crypto' ? 40 : 150;
                const marketCap = stock.price * stock.volume * multiplier;
                
                return (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                  key={stock.symbol} 
                  onClick={() => setSelectedSymbol(stock.symbol)} 
                  className={`p-3 rounded-xl border transition-all cursor-pointer relative overflow-hidden group ${
                      selectedSymbol === stock.symbol 
                          ? 'bg-indigo-900/20 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.1)]' 
                          : 'bg-[#151525]/50 border-transparent hover:border-indigo-500/30 hover:bg-[#1a1a30]/50'
                  }`}
                >
                    {selectedSymbol === stock.symbol && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 shadow-[0_0_10px_#6366f1]" />
                    )}
                    <div className="flex justify-between items-start mb-1">
                        <span className={`font-bold ${selectedSymbol === stock.symbol ? 'text-indigo-300' : 'text-gray-300'}`}>{stock.symbol}</span>
                        <span className="font-mono text-sm text-gray-200">{formatMoney(stock.price)}</span>
                    </div>
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-gray-500 truncate max-w-[120px]">{stock.name}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${stock.change >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                            {formatPct(stock.changePercent)}
                        </span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] text-gray-600">Mkt Cap:</span>
                        <span className="text-[10px] font-mono text-gray-400">{formatCompactMoney(marketCap)}</span>
                    </div>
                </motion.div>
            )})}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative z-0">
          {/* Subtle background effects */}
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-amber-600/5 rounded-full blur-[120px] pointer-events-none" />

          {/* Top HUD */}
          <div className="h-24 border-b border-indigo-900/30 bg-[#0a0a18]/40 backdrop-blur-sm p-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-6">
                 <div>
                    <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 flex items-center gap-2 tracking-tight">
                        {selectedStock?.symbol || 'GLOBAL'} <span className="text-gray-500 font-light text-xl">|</span>
                        <span className="text-lg text-gray-300">{selectedStock?.name || 'Markets'}</span>
                    </h1>
                 </div>
              </div>

              <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3 bg-[#101020] border border-gray-800 rounded-xl px-4 py-2">
                       <Zap className="w-5 h-5 text-amber-400" />
                       <div>
                           <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Active Bots</div>
                           <div className="text-sm font-bold text-white leading-none">{activeBots}</div>
                       </div>
                  </div>
                  <div className="flex items-center gap-3 bg-[#101020] border border-gray-800 rounded-xl px-4 py-2">
                       <Network className="w-5 h-5 text-cyan-400" />
                       <div>
                           <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">System Trades</div>
                           <div className="text-sm font-bold text-white leading-none">{totalBotTrades}</div>
                       </div>
                  </div>
              </div>
          </div>

          {/* Chart Area */}
          <div className="flex-1 relative p-4 flex flex-col">
              {selectedStock ? (
                  <div 
                     className="flex-1 bg-[#0a0a1a] border border-indigo-500/10 rounded-2xl overflow-hidden shadow-2xl relative group cursor-pointer"
                     onClick={() => onOpenDetails(selectedSymbol)}
                  >
                      <div className="absolute inset-0 z-10 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center pointer-events-none">
                          <div className="bg-gray-900/80 backdrop-blur-sm text-white px-4 py-2 rounded-lg border border-gray-700 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 shadow-xl">
                              <Target className="w-4 h-4" /> View Details & Trade
                          </div>
                      </div>
                      <div className="absolute inset-0 z-0 bg-gradient-to-t from-[#050510]/50 to-transparent pointer-events-none" />
                      <StockChart 
                          data={selectedStock.history} 
                          color={selectedStock.change >= 0 ? '#10b981' : '#ef4444'} 
                          allStocks={stocks}
                          selectedSymbol={selectedSymbol}
                          onSymbolSelect={setSelectedSymbol}
                      />
                  </div>
              ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-500">
                      Select an asset to view DeepMetrics
                  </div>
              )}

              {/* Bottom Analytics Panel */}
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="h-48 mt-4 grid grid-cols-4 gap-4"
              >
                  {/* AI Prediction Matrix */}
                  <div className="col-span-1 bg-[#0a0a18]/70 border border-indigo-900/30 rounded-xl p-4 relative overflow-hidden backdrop-blur-md">
                      <div className="absolute top-0 right-0 p-4 opacity-5"><BrainCircuit className="w-24 h-24 text-indigo-500" /></div>
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <Target className="w-4 h-4 text-indigo-400" /> AI Quant Overlay
                      </h3>
                      <div className="space-y-3 relative z-10">
                          <div>
                              <div className="flex justify-between text-[10px] text-gray-500 font-bold uppercase mb-1">
                                  <span>Neural Confidence</span>
                                  <span className="text-indigo-400">87.4%</span>
                              </div>
                              <div className="h-1.5 w-full bg-gray-900 rounded-full overflow-hidden">
                                  <div className="h-full bg-indigo-500 shadow-[0_0_10px_#6366f1] w-[87.4%]" />
                              </div>
                          </div>
                           <div>
                              <div className="flex justify-between text-[10px] text-gray-500 font-bold uppercase mb-1">
                                  <span>Trend Velocity</span>
                                  <span className="text-emerald-400">+2.4v</span>
                              </div>
                              <div className="h-1.5 w-full bg-gray-900 rounded-full overflow-hidden">
                                  <div className="h-full bg-emerald-500 shadow-[0_0_10px_#10b981] w-[70%]" />
                              </div>
                          </div>
                          <div>
                              <div className="flex justify-between text-[10px] text-gray-500 font-bold uppercase mb-1">
                                  <span>Volatility Risk (VaR)</span>
                                  <span className="text-amber-400">High</span>
                              </div>
                              <div className="h-1.5 w-full bg-gray-900 rounded-full overflow-hidden">
                                  <div className="h-full bg-amber-500 shadow-[0_0_10px_#f59e0b] w-[85%]" />
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* Oracle Sentiment Engine */}
                  <div className="col-span-1 bg-[#0a0a18]/70 border border-indigo-900/30 rounded-xl p-4 relative overflow-hidden backdrop-blur-md">
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <Globe className="w-4 h-4 text-cyan-400" /> Oracle Sentiment
                      </h3>
                      {selectedStock ? (
                          <div className="flex flex-col h-full justify-between pb-2 relative z-10 w-full">
                              <div>
                                  <div className={`text-xl font-black ${oracleSentiment.color} tracking-tighter uppercase`}>
                                      {oracleSentiment.status}
                                  </div>
                                  <div className="flex items-center justify-between mt-2">
                                      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Aggregated Score</span>
                                      <span className={`text-sm font-bold font-mono ${oracleSentiment.color}`}>{oracleSentiment.score.toFixed(1)}/100</span>
                                  </div>
                                  <div className="h-1.5 w-full bg-gray-900 rounded-full overflow-hidden mt-1 mb-3">
                                      <div className={`h-full ${oracleSentiment.barColor} transition-all duration-300`} style={{ width: `${oracleSentiment.score}%` }} />
                                  </div>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                      {oracleSentiment.activeThemes.map((theme, idx) => (
                                          <span key={idx} className="text-[9px] px-1.5 py-0.5 rounded bg-gray-800/50 text-gray-400 border border-gray-700/50 whitespace-nowrap">
                                              #{theme.replace(' ', '')}
                                          </span>
                                      ))}
                                  </div>
                              </div>
                          </div>
                      ) : (
                          <div className="text-xs text-gray-600 flex h-full items-center justify-center text-center">
                              Select an asset to view<br/>social media sentiment.
                          </div>
                      )}
                  </div>

                  {/* Best Performing Algorithm */}
                  <div className="col-span-1 bg-[#0a0a18]/70 border border-indigo-900/30 rounded-xl p-4 relative overflow-hidden backdrop-blur-md">
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-emerald-400" /> Alpha Generator
                      </h3>
                      {bestBot ? (
                          <div className="flex flex-col h-full justify-between pb-2">
                              <div>
                                  <div className="text-sm font-bold text-indigo-300">{bestBot.name}</div>
                                  <div className="text-[10px] text-gray-500">{bestBot.type.replace('_', ' ').toUpperCase()} • {bestBot.symbol}</div>
                              </div>
                              <div className="flex justify-between items-end">
                                  <div>
                                      <div className="text-[10px] uppercase tracking-widest text-gray-600 font-bold">Total P&L</div>
                                      <div className="text-2xl font-black text-emerald-400 font-mono tracking-tighter">
                                          {formatMoney(bestBot.pnl || 0)}
                                      </div>
                                  </div>
                                  <div className="text-right">
                                      <div className="text-[10px] uppercase tracking-widest text-gray-600 font-bold">Trades</div>
                                      <div className="text-lg font-bold text-gray-300 font-mono">{bestBot.trades || 0}</div>
                                  </div>
                              </div>
                          </div>
                      ) : (
                          <div className="text-xs text-gray-600 flex h-full items-center justify-center text-center">
                              No active algorithms with positive returns deployed.
                          </div>
                      )}
                  </div>

                  {/* Portfolio Pulse */}
                  <div className="col-span-1 bg-[#0a0a18]/70 border border-indigo-900/30 rounded-xl p-4 relative overflow-hidden backdrop-blur-md flex flex-col">
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <Activity className="w-4 h-4 text-cyan-400" /> Portfolio Pulse
                      </h3>
                      <div className="flex-1 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                         {portfolio.length > 0 ? portfolio.map(p => {
                             const stock = stocks.find(s => s.symbol === p.symbol);
                             const currentPrice = stock?.price || p.avgCost;
                             const pl = (currentPrice - p.avgCost) * p.shares;
                             const plPct = (pl / (p.avgCost * p.shares)) * 100;
                             
                             return (
                                 <div key={p.symbol} className="flex items-center justify-between bg-gray-900/50 p-2 rounded-lg border border-gray-800/50">
                                     <div>
                                         <div className="font-bold text-sm text-gray-300">{p.symbol}</div>
                                         <div className="text-[10px] text-gray-500">{p.shares} shrs</div>
                                     </div>
                                     <div className="text-right">
                                         <div className={`text-sm font-bold font-mono ${pl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                             {formatMoney(pl)}
                                         </div>
                                         <div className={`text-[10px] font-bold ${pl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                             {formatPct(plPct)}
                                         </div>
                                     </div>
                                 </div>
                             )
                         }) : (
                             <div className="text-xs text-gray-600 h-full flex items-center justify-center text-center">
                                 No active holdings.<br/>Bots are waiting for alpha.
                             </div>
                         )}
                      </div>
                  </div>
              </motion.div>
          </div>
      </div>
      
      {/* Right Sidebar - AI Assistant */}
      <div className="w-80 bg-[#0a0a18]/70 border-l border-indigo-900/30 flex flex-col z-10 backdrop-blur-md hidden xl:flex">
          {selectedStock ? (
              <AIAssistant 
                  selectedStock={selectedStock} 
                  allStocks={stocks} 
                  onExecuteTrade={onExecuteTrade} 
              />
          ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500 p-4 text-center">
                  Select an asset to connect the Oracle
              </div>
          )}
      </div>
    </div>
  );
};

export default CommandCenterDashboard;
