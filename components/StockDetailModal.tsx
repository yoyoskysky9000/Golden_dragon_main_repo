
import React, { useState, useEffect } from 'react';
import { StockData, PortfolioPosition } from '../types';
import StockChart from './StockChart';
import OrderBook from './OrderBook';
import { X, TrendingUp, TrendingDown, Activity, Tag, BarChart3, Globe, Bell, BellPlus, Sparkles, ChevronLeft, ArrowRightLeft, DollarSign, CheckCircle2, ShieldAlert, AlertTriangle, Layers, CandlestickChart, LineChart, BrainCircuit, ChevronDown, Maximize, Loader2, ArrowLeft } from 'lucide-react';
import { analyzeCompanyDescription } from '../services/geminiService';
import Markdown from 'react-markdown';

interface StockDetailModalProps {
  stock: StockData;
  availableCash?: number;
  availableShares?: number;
  currentPosition?: PortfolioPosition;
  onClose: () => void;
  onSetAlert: (symbol: string, price: number) => void;
  onNavigateToAI: (symbol: string, message?: string) => void;
  onPlaceOrder: (order: { 
    symbol: string, 
    side: 'buy' | 'sell', 
    type: 'market' | 'limit' | 'stop-loss' | 'take-profit' | 'bracket', 
    shares: number, 
    price: number,
    isLive: boolean,
    isPreMarket?: boolean,
    stopLossPrice?: number,
    takeProfitPrice?: number
  }, skipConfirmation?: boolean) => void;
}

const StockDetailModal: React.FC<StockDetailModalProps> = ({ 
    stock, 
    availableCash = 0, 
    availableShares = 0,
    currentPosition, 
    onClose, 
    onSetAlert, 
    onNavigateToAI,
    onPlaceOrder
}) => {
  const [alertPrice, setAlertPrice] = useState<string>('');
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'alert' } | null>(null);
  const [isLiveTrading, setIsLiveTrading] = useState(false);
  
  // Trading State
  const [isTrading, setIsTrading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false); // New confirmation state
  const [tradeSide, setTradeSide] = useState<'buy' | 'sell'>('buy');
  const [tradeShares, setTradeShares] = useState<string>('1');
  const [orderType, setOrderType] = useState<'market' | 'limit' | 'stop-loss' | 'bracket'>('market');
  const [limitPrice, setLimitPrice] = useState<string>('');
  
  // Advanced Order State
  const [isPreMarket, setIsPreMarket] = useState(false);
  const [useBracket, setUseBracket] = useState(false);
  const [stopLossPriceBracket, setStopLossPriceBracket] = useState<string>('');
  const [takeProfitPriceBracket, setTakeProfitPriceBracket] = useState<string>('');

  // Chart State
  const [chartType, setChartType] = useState<'line' | 'candlestick'>('line');
  
  // Description Analysis State
  const [isAnalyzingDescription, setIsAnalyzingDescription] = useState(false);
  const [descriptionAnalysis, setDescriptionAnalysis] = useState<string | null>(null);

  const handleAnalyzeDescription = async () => {
      setIsAnalyzingDescription(true);
      const analysis = await analyzeCompanyDescription(stock.symbol, stock.name, stock.about || stock.description, stock.sector, stock.price);
      setDescriptionAnalysis(analysis);
      setIsAnalyzingDescription(false);
  };
  
  // Detailed History State
  const [showDetailedHistory, setShowDetailedHistory] = useState(false);
  const [detailedData, setDetailedData] = useState<{date: string, open: number, high: number, low: number, close: number, volume: number}[] | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const fetchDetailedData = async () => {
      setIsLoadingDetails(true);
      setShowDetailedHistory(true);
      // Simulate network request
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Generate mock OHLCV data
      const data = [];
      let currentP = stock.price * 0.8;
      for(let i=30; i>=0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          
          const change = (Math.random() - 0.45) * currentP * 0.05;
          const open = currentP;
          const close = currentP + change;
          const high = Math.max(open, close) + Math.random() * currentP * 0.02;
          const low = Math.min(open, close) - Math.random() * currentP * 0.02;
          const volume = Math.floor(Math.random() * 5000000) + 1000000;
          
          data.push({
              date: date.toISOString().split('T')[0],
              open, high, low, close, volume
          });
          currentP = close;
      }
      // Ensure the last generated price matches current precisely if today
      data[data.length - 1].close = stock.price;
      
      setDetailedData(data);
      setIsLoadingDetails(false);
  };

  // Initialize defaults when trading opens
  useEffect(() => {
      if (isTrading) {
          setIsConfirming(false); // Reset confirmation if re-opening
          // Ensure we have a valid start state
          if (orderType === 'market') {
              setLimitPrice(stock.price.toFixed(2));
          } else if (orderType === 'limit') {
              setLimitPrice(tradeSide === 'buy' ? stock.price.toFixed(2) : (stock.price * 1.05).toFixed(2));
          } else if (orderType === 'stop-loss') {
              setLimitPrice((stock.price * 0.95).toFixed(2));
          }
      }
  }, [isTrading]);

  // Notification Auto-dismiss
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleSideChange = (side: 'buy' | 'sell') => {
      setTradeSide(side);
      setIsConfirming(false);

      // Smart pre-fill based on side strategy
      if (orderType === 'limit') {
          // Buy Limit: Usually Entry at current or lower -> Default to Current
          // Sell Limit: Usually Take Profit at higher -> Default to +5%
          setLimitPrice(side === 'buy' ? stock.price.toFixed(2) : (stock.price * 1.05).toFixed(2));
      } else if (orderType === 'stop-loss') {
           // Stop Loss is typically for selling below market
           setLimitPrice((stock.price * 0.95).toFixed(2));
      }

      // If switching to Buy while Stop Loss is active (which isn't supported), switch to Market
      if (side === 'buy' && orderType === 'stop-loss') {
          setOrderType('market');
      }
  };

  const handleOrderTypeChange = (type: 'market' | 'limit' | 'stop-loss') => {
      setOrderType(type);
      setIsConfirming(false);

      // Smart pre-fill based on type
      if (type === 'limit') {
          setLimitPrice(tradeSide === 'buy' ? stock.price.toFixed(2) : (stock.price * 1.05).toFixed(2));
      } else if (type === 'stop-loss') {
          // Stop Loss implies Sell. Auto-switch side if needed for better UX.
          if (tradeSide === 'buy') setTradeSide('sell');
          setLimitPrice((stock.price * 0.95).toFixed(2));
      }
  };

  if (!stock) return null;

  const formatMoney = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  const formatCompactMoney = (val: number) => new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD',
    notation: "compact",
    maximumFractionDigits: 2
  }).format(val);
  
  const formatPct = (val: number) => `${val > 0 ? '+' : ''}${val.toFixed(2)}%`;

  const handleSetAlert = () => {
    const price = parseFloat(alertPrice);
    if (!isNaN(price) && price > 0) {
        onSetAlert(stock.symbol, price);
        setAlertPrice('');
    }
  };

  const handleReviewOrder = () => {
      // Validate before going to confirmation screen
      const shares = parseInt(tradeShares);
      if (isNaN(shares) || shares <= 0) return;
      
      const price = parseFloat(limitPrice);
      if (orderType !== 'market' && (isNaN(price) || price <= 0)) return;

      setIsConfirming(true);
  };

  const handleSubmitOrder = () => {
      const shares = parseInt(tradeShares);
      const price = parseFloat(limitPrice);
      const executionPrice = orderType === 'market' ? stock.price : price;
      
      onPlaceOrder({
          symbol: stock.symbol,
          side: tradeSide,
          type: orderType,
          shares,
          price: isNaN(price) ? 0 : price,
          isLive: isLiveTrading,
          isPreMarket: isPreMarket,
          ...(useBracket && {
              stopLossPrice: parseFloat(stopLossPriceBracket) || undefined,
              takeProfitPrice: parseFloat(takeProfitPriceBracket) || undefined
          })
      }, true); // Pass true to skip global confirmation since we just did it inline
      
      setNotification({
        message: `${tradeSide === 'buy' ? 'Bought' : 'Sold'} ${shares} shares of ${stock.symbol} at ${formatMoney(executionPrice)} (${isLiveTrading ? 'LIVE' : 'PAPER'})`,
        type: 'success'
      });
      
      setIsTrading(false);
      setIsConfirming(false);
  };

  // Calculations for Trade Dock
  const qty = parseInt(tradeShares) || 0;
  // Use live stock price for market orders, but user input for Limit/Stop
  const execPrice = orderType === 'market' ? stock.price : parseFloat(limitPrice) || 0;
  const totalValue = qty * execPrice;
  
  // Fake Mkt Cap calculation based on Volume * Price * Multiplier (Turnover Ratio Heuristic)
  const turnoverMultiplier = stock.assetType === 'crypto' ? 40 : 150; 
  const estimatedMarketCap = stock.price * stock.volume * turnoverMultiplier;

  const positionPnL = currentPosition ? (stock.price - currentPosition.avgCost) * currentPosition.shares : 0;
  const positionPnLPct = currentPosition ? ((stock.price - currentPosition.avgCost) / currentPosition.avgCost) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800 bg-gray-950">
          <div className="flex items-center gap-5">
             <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold shadow-lg ${stock.change >= 0 ? 'bg-emerald-500/10 text-emerald-500 shadow-emerald-500/10' : 'bg-rose-500/10 text-rose-500 shadow-rose-500/10'}`}>
                {stock.symbol[0]}
             </div>
             <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  {stock.name} <span className="text-gray-500 text-lg font-medium">({stock.symbol})</span>
                </h2>
                <div className="flex items-center gap-3 mt-1.5">
                   <span className="text-xs font-medium bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20 flex items-center gap-1">
                      <Tag className="w-3 h-3" /> {stock.sector}
                   </span>
                   <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Globe className="w-3 h-3" /> Global Market
                   </span>
                   <div className="flex bg-gray-800/50 p-0.5 rounded-lg border border-gray-700 ml-2">
                        <button 
                            onClick={() => setIsLiveTrading(false)}
                            className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${!isLiveTrading ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            PAPER
                        </button>
                        <button 
                            onClick={() => setIsLiveTrading(true)}
                            className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${isLiveTrading ? 'bg-amber-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            LIVE
                        </button>
                   </div>
                </div>
             </div>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-800 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white transition-colors border border-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar relative">
           
           {/* Success Notification */}
           {notification && (
             <div className={`p-4 rounded-xl border animate-in slide-in-from-top-4 duration-300 flex items-center justify-between ${
               notification.type === 'success' 
               ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
               : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
             }`}>
               <div className="flex items-center gap-3">
                 <div className={`p-1.5 rounded-full ${notification.type === 'success' ? 'bg-emerald-500/20' : 'bg-amber-500/20'}`}>
                   <CheckCircle2 className="w-4 h-4" />
                 </div>
                 <div>
                   <div className="text-xs font-bold uppercase tracking-wider opacity-80">Order Confirmed</div>
                   <div className="text-sm font-medium">{notification.message}</div>
                 </div>
               </div>
               <button 
                 onClick={() => setNotification(null)}
                 className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
               >
                 <X className="w-4 h-4" />
               </button>
             </div>
           )}
           
           {/* Price, Chart & Order Book Section */}
           <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Left Column: Chart (Takes 3/4) */}
              <div className="lg:col-span-3 flex flex-col gap-4">
                  <div className={`bg-gray-950/50 rounded-xl border border-gray-800 p-1 relative overflow-hidden group ${showDetailedHistory ? 'h-[500px]' : 'h-80'}`}>
                      
                      {/* Chart Controls Overlay */}
                      <div className="absolute top-5 right-5 z-20 flex bg-gray-900 rounded-lg border border-gray-700 p-0.5">
                          <button 
                             onClick={() => showDetailedHistory ? setShowDetailedHistory(false) : fetchDetailedData()}
                             className={`p-1.5 rounded transition-all ${showDetailedHistory ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                             title={showDetailedHistory ? "Close Details" : "View Full History / Deep Insight"}
                          >
                              <Maximize className="w-4 h-4" />
                          </button>
                          {!showDetailedHistory && (
                              <>
                                  <button 
                                     onClick={() => setChartType('line')}
                                     className={`p-1.5 rounded transition-all ${chartType === 'line' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                                     title="Line Chart"
                                  >
                                      <LineChart className="w-4 h-4" />
                                  </button>
                                  <button 
                                     onClick={() => setChartType('candlestick')}
                                     className={`p-1.5 rounded transition-all ${chartType === 'candlestick' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                                     title="Candlestick Chart"
                                  >
                                      <CandlestickChart className="w-4 h-4" />
                                  </button>
                              </>
                          )}
                      </div>

                      {showDetailedHistory ? (
                          <div className="absolute inset-0 z-10 bg-gray-950 flex flex-col p-6">
                              <div className="flex items-center gap-3 mb-6 relative z-10">
                                  <button onClick={() => setShowDetailedHistory(false)} className="text-gray-400 hover:text-white">
                                      <ArrowLeft className="w-5 h-5" />
                                  </button>
                                  <div>
                                      <h3 className="text-lg font-bold text-white tracking-wider uppercase">{stock.symbol} Detailed History</h3>
                                      <p className="text-xs text-gray-500">Trailing 30-Day OHLCV Deep Insight</p>
                                  </div>
                              </div>
                              
                              {isLoadingDetails ? (
                                  <div className="flex-1 flex flex-col items-center justify-center text-indigo-500/50">
                                      <Loader2 className="w-8 h-8 animate-spin mb-4" />
                                      <span className="text-xs uppercase tracking-widest font-bold">Fetching Market Data...</span>
                                  </div>
                              ) : (
                                  <div className="flex-1 overflow-auto custom-scrollbar">
                                      <table className="w-full text-xs text-left">
                                          <thead className="text-[10px] uppercase text-gray-500 sticky top-0 bg-gray-950 shadow-[0_10px_10px_-10px_rgba(0,0,0,0.5)] z-10">
                                              <tr>
                                                  <th className="py-3 px-4 font-bold">Date</th>
                                                  <th className="py-3 px-4 font-bold text-right">Open</th>
                                                  <th className="py-3 px-4 font-bold text-right">High</th>
                                                  <th className="py-3 px-4 font-bold text-right">Low</th>
                                                  <th className="py-3 px-4 font-bold text-right">Close</th>
                                                  <th className="py-3 px-4 font-bold text-right">Volume</th>
                                              </tr>
                                          </thead>
                                          <tbody className="divide-y divide-gray-800 font-mono">
                                              {detailedData?.map((row, idx) => (
                                                  <tr key={idx} className="hover:bg-gray-900/50 transition-colors group">
                                                      <td className="py-2.5 px-4 text-gray-400 group-hover:text-gray-300">{row.date}</td>
                                                      <td className="py-2.5 px-4 text-right text-gray-300">{formatMoney(row.open)}</td>
                                                      <td className="py-2.5 px-4 text-right text-emerald-400/80">{formatMoney(row.high)}</td>
                                                      <td className="py-2.5 px-4 text-right text-rose-400/80">{formatMoney(row.low)}</td>
                                                      <td className={`py-2.5 px-4 text-right font-bold ${row.close >= row.open ? 'text-emerald-500' : 'text-rose-500'}`}>{formatMoney(row.close)}</td>
                                                      <td className="py-2.5 px-4 text-right text-gray-500">{new Intl.NumberFormat('en-US').format(row.volume)}</td>
                                                  </tr>
                                              ))}
                                          </tbody>
                                      </table>
                                  </div>
                              )}
                          </div>
                      ) : (
                          <>
                              <div className="absolute top-5 left-5 z-10 pointer-events-none">
                                 <div className="text-4xl font-mono text-white font-light tracking-tight">{formatMoney(stock.price)}</div>
                                 <div className={`text-sm font-medium flex items-center mt-1 ${stock.change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {stock.change >= 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
                                    {formatPct(stock.changePercent)} Today
                                 </div>
                              </div>
                              <StockChart 
                                data={stock.history} 
                                color={stock.change >= 0 ? '#10b981' : '#ef4444'} 
                                showActiveDot={true}
                                type={chartType}
                              />
                          </>
                      )}
                  </div>
                  
                  {/* Quick Trade Buttons */}
                  <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={() => {
                            handleSideChange('buy');
                            setIsTrading(true);
                        }}
                        className="bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-500 hover:text-emerald-400 border border-emerald-500/20 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:shadow-emerald-900/10 group"
                      >
                        <TrendingUp className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
                        BUY {stock.symbol}
                      </button>
                      <button 
                        onClick={() => {
                            handleSideChange('sell');
                            setIsTrading(true);
                        }}
                        className="bg-rose-600/10 hover:bg-rose-600/20 text-rose-500 hover:text-rose-400 border border-rose-500/20 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:shadow-rose-900/10 group"
                      >
                        <TrendingDown className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
                        SELL {stock.symbol}
                      </button>
                  </div>
              </div>

              {/* Right Column: Order Book & Stats */}
              <div className="flex flex-col gap-4">
                 {currentPosition && (
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                        <div className="text-xs text-gray-500 uppercase font-bold mb-2">Your Position</div>
                        <div className="flex justify-between items-end">
                            <div>
                                <div className="text-2xl font-bold text-white">{currentPosition.shares} <span className="text-sm text-gray-500 font-normal">shares</span></div>
                                <div className="text-sm text-gray-400">Avg Cost: {formatMoney(currentPosition.avgCost)}</div>
                            </div>
                            <div className="text-right">
                                <div className={`text-lg font-bold ${positionPnL >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {positionPnL >= 0 ? '+' : ''}{formatMoney(positionPnL)}
                                </div>
                                <div className={`text-sm font-medium ${positionPnL >= 0 ? 'text-emerald-500/80' : 'text-rose-500/80'}`}>
                                    {positionPnL >= 0 ? '+' : ''}{positionPnLPct.toFixed(2)}%
                                </div>
                            </div>
                        </div>
                    </div>
                 )}
                 {/* Level 2 Order Book */}
                 <div className="h-48">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase mb-2">
                        <Layers className="w-3 h-3 text-amber-500" /> Market Depth (L2)
                    </div>
                    <OrderBook currentPrice={stock.price} symbol={stock.symbol} history={stock.history} />
                 </div>

                 <div className="grid grid-cols-2 gap-3 content-start flex-1">
                    <StatCard label="High" value={formatMoney(stock.price * 1.02)} icon={<Activity className="w-3 h-3 text-emerald-500" />} />
                    <StatCard label="Low" value={formatMoney(stock.price * 0.98)} icon={<Activity className="w-3 h-3 text-rose-500" />} />
                    <StatCard label="Volume" value={(stock.volume / 1000000).toFixed(2) + 'M'} />
                    <StatCard label="Mkt Cap" value={formatCompactMoney(estimatedMarketCap)} />
                 </div>
                 
                 {/* Set Alert Section */}
                 <div className="bg-gray-800/20 border border-gray-800 rounded-xl p-4 mt-auto">
                    <div className="flex items-center gap-2 mb-3 text-gray-300 text-sm font-medium">
                        <Bell className="w-4 h-4 text-amber-500" />
                        <span>Set Price Alert</span>
                    </div>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <span className="absolute left-2 top-2 text-gray-500">$</span>
                            <input 
                                type="number" 
                                placeholder="Target Price"
                                value={alertPrice}
                                onChange={(e) => setAlertPrice(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg py-1.5 pl-6 pr-2 text-sm text-white focus:outline-none focus:border-blue-500"
                            />
                        </div>
                        <button 
                            onClick={handleSetAlert}
                            disabled={!alertPrice}
                            className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white rounded-lg px-3 transition-colors"
                        >
                            <BellPlus className="w-4 h-4" />
                        </button>
                    </div>
                 </div>
              </div>
           </div>

           {/* Key Statistics */}
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="bg-gray-800/20 border border-gray-800/50 rounded-xl p-3">
                 <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">Market Cap</div>
                 <div className="text-sm font-medium text-gray-200">{stock.marketCap || 'N/A'}</div>
              </div>
              <div className="bg-gray-800/20 border border-gray-800/50 rounded-xl p-3">
                 <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">P/E Ratio</div>
                 <div className="text-sm font-medium text-gray-200">{stock.peRatio || 'N/A'}</div>
              </div>
              <div className="bg-gray-800/20 border border-gray-800/50 rounded-xl p-3">
                 <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">Div Yield</div>
                 <div className="text-sm font-medium text-gray-200">{stock.dividend || 'N/A'}</div>
              </div>
              <div className="bg-gray-800/20 border border-gray-800/50 rounded-xl p-3">
                 <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">52W Range</div>
                 <div className="text-sm font-medium text-gray-200">
                     {stock.fiftyTwoWeekLow && stock.fiftyTwoWeekHigh 
                         ? `$${stock.fiftyTwoWeekLow.toFixed(2)} - $${stock.fiftyTwoWeekHigh.toFixed(2)}`
                         : 'N/A'}
                 </div>
              </div>
           </div>

           {/* Description */}
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
             <div className="lg:col-span-3">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center justify-between">
                   <div className="flex items-center gap-2">
                     <BarChart3 className="w-5 h-5 text-purple-500" /> Company Profile
                   </div>
                   <button 
                     onClick={handleAnalyzeDescription}
                     disabled={isAnalyzingDescription}
                     className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border transition-all ${isAnalyzingDescription ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 cursor-not-allowed' : 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border-purple-500/20 hover:shadow-lg hover:shadow-purple-500/10'}`}
                     title="Analyze with Dragon AI"
                   >
                     {isAnalyzingDescription ? (
                         <>
                             <Loader2 className="w-3.5 h-3.5 animate-spin" />
                             Analyzing...
                         </>
                     ) : (
                         <>
                             <Sparkles className="w-3.5 h-3.5" />
                             Analyze Description
                         </>
                     )}
                   </button>
                </h3>
                <div className="text-gray-400 leading-relaxed text-sm bg-gray-800/30 p-5 rounded-xl border border-gray-800 space-y-4">
                  <p>{stock.about || stock.description}</p>
                  <p>
                    {stock.name} is a key component of the <span className="text-gray-300 font-medium">{stock.sector}</span> index. 
                    With a current volume of <strong>{(stock.volume).toLocaleString()}</strong> shares, the stock is showing 
                    {stock.changePercent > 0 ? ' bullish momentum ' : ' some bearish pressure '} in today's session. 
                    Analysts are closely watching the <strong>{formatMoney(stock.price * 1.05)}</strong> resistance level.
                  </p>
                  
                  {(isAnalyzingDescription || descriptionAnalysis) && (
                      <div className="mt-6 pt-6 border-t border-gray-700/50">
                          <div className="flex flex-col gap-3">
                              <h4 className="text-purple-400 font-semibold flex items-center gap-2 text-sm uppercase tracking-wider">
                                  <Sparkles className="w-4 h-4" />
                                  Dragon AI Analysis
                              </h4>
                              {isAnalyzingDescription ? (
                                  <div className="flex flex-col items-center justify-center p-8 text-purple-500/50">
                                      <Loader2 className="w-8 h-8 animate-spin mb-4" />
                                      <span className="text-xs uppercase tracking-widest font-bold">Extracting Investment Themes...</span>
                                  </div>
                              ) : (
                                  <div className="text-gray-300 markdown-body text-sm bg-gray-900/50 p-4 rounded-lg border border-purple-500/20">
                                      <Markdown>{descriptionAnalysis}</Markdown>
                                  </div>
                              )}
                          </div>
                      </div>
                  )}
                </div>
             </div>
           </div>
        </div>

        {/* Footer Actions / Trading Dock */}
        <div className="border-t border-gray-800 bg-gray-950 relative">
            {!isTrading ? (
                // Standard Footer
                <div className="p-4 flex justify-between items-center">
                    <div className="text-xs text-gray-600 pl-2">
                        Last updated: {new Date().toLocaleTimeString()}
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-5 py-2 text-sm text-gray-400 hover:text-white transition-colors">Close</button>
                        
                        <button 
                        onClick={() => onNavigateToAI(stock.symbol)}
                        className="px-5 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-700 hover:border-gray-600 rounded-lg text-sm font-semibold transition-all flex items-center gap-2"
                        >
                            <Sparkles className="w-4 h-4" />
                            Ask AI
                        </button>

                        <button 
                            onClick={() => onNavigateToAI(stock.symbol, `Please provide a detailed analysis of ${stock.symbol} (${stock.name}) considering its current price of $${stock.price} and recent performance.`)}
                            className="px-5 py-2 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 hover:text-indigo-300 border border-indigo-500/20 rounded-lg text-sm font-semibold transition-all flex items-center gap-2"
                        >
                            <BrainCircuit className="w-4 h-4" />
                            Analyze Stock
                        </button>

                        <button 
                            onClick={() => onNavigateToAI(stock.symbol, `Analyze the company profile for ${stock.name} based on this description: "${stock.description}". Identify 3 key bullish themes and 3 major risks.`)}
                            className="px-5 py-2 bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 hover:text-purple-300 border border-purple-500/20 rounded-lg text-sm font-semibold transition-all flex items-center gap-2"
                        >
                            <ShieldAlert className="w-4 h-4" />
                            Analyze Profile
                        </button>

                        <button 
                            onClick={() => {
                                handleSideChange('buy');
                                setIsTrading(true);
                            }}
                            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold transition-all shadow-lg shadow-emerald-900/20 hover:shadow-emerald-900/40 flex items-center gap-2"
                        >
                            <TrendingUp className="w-4 h-4" />
                            Buy {stock.symbol}
                        </button>
                        
                        <button 
                            onClick={() => {
                                handleSideChange('sell');
                                setIsTrading(true);
                            }}
                            className="px-6 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-sm font-semibold transition-all shadow-lg shadow-rose-900/20 hover:shadow-rose-900/40 flex items-center gap-2"
                        >
                            <TrendingDown className="w-4 h-4" />
                            Sell {stock.symbol}
                        </button>
                    </div>
                </div>
            ) : !isConfirming ? (
                // Trading Dock - Input View
                <div className="bg-gray-900 p-4 border-t border-amber-500/30 shadow-[0_-5px_30px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom-5 duration-300">
                    <div className="flex items-center justify-between gap-6">
                        
                        {/* Back Button */}
                        <button 
                            onClick={() => setIsTrading(false)}
                            className="p-2 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>

                        {/* Order Form */}
                        <div className="flex-1 grid grid-cols-6 gap-4 items-end">
                            
                            {/* Mode Indicator */}
                            <div className="col-span-1">
                                <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Mode</label>
                                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-bold text-[10px] ${isLiveTrading ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-500'}`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${isLiveTrading ? 'bg-amber-500 animate-pulse' : 'bg-indigo-500'}`}></div>
                                    {isLiveTrading ? 'LIVE' : 'PAPER'}
                                </div>
                            </div>

                            {/* Side Selector */}
                            <div className="col-span-1">
                                <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Side</label>
                                <div className="flex bg-gray-950 p-1 rounded-lg border border-gray-800">
                                    <button 
                                        onClick={() => handleSideChange('buy')} 
                                        className={`flex-1 py-1.5 text-xs font-bold rounded flex items-center justify-center gap-1 transition-colors ${tradeSide === 'buy' ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                                    >
                                        BUY
                                    </button>
                                    <button 
                                        onClick={() => handleSideChange('sell')} 
                                        className={`flex-1 py-1.5 text-xs font-bold rounded flex items-center justify-center gap-1 transition-colors ${tradeSide === 'sell' ? 'bg-rose-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                                    >
                                        SELL
                                    </button>
                                </div>
                            </div>

                            {/* Type Selector */}
                            <div className="col-span-1">
                                <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Order Type</label>
                                <div className="relative">
                                    <select 
                                        className="w-full bg-gray-950 border border-gray-800 rounded-lg pl-3 pr-8 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 appearance-none"
                                        value={orderType}
                                        onChange={(e) => handleOrderTypeChange(e.target.value as 'market' | 'limit' | 'stop-loss')}
                                    >
                                        <option value="market">Market (MKT)</option>
                                        <option value="limit">Limit (LMT)</option>
                                        <option value="stop-loss">Stop Loss (STOP)</option>
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-gray-500">
                                        <ChevronDown className="w-4 h-4" />
                                    </div>
                                </div>
                            </div>

                            {/* Shares Input */}
                            <div>
                                <div className="flex justify-between items-baseline mb-1">
                                    <label className="text-[10px] text-gray-500 uppercase font-bold block">Quantity</label>
                                    <span className="text-[10px] text-gray-500">Avail: <span className="text-gray-300 font-mono">{availableShares}</span></span>
                                </div>
                                <div className="bg-gray-950 rounded-lg border border-gray-800 flex items-center px-3 py-1.5">
                                    <input 
                                        type="number" 
                                        min="1"
                                        value={tradeShares}
                                        onChange={(e) => setTradeShares(e.target.value)}
                                        className="bg-transparent text-white font-mono w-full focus:outline-none"
                                    />
                                    <span className="text-xs text-gray-600 font-medium">SH</span>
                                </div>
                            </div>

                            {/* Price Input */}
                            <div>
                                <div className="flex justify-between items-baseline mb-1">
                                    <label className="text-[10px] text-gray-500 uppercase font-bold block">
                                        {orderType === 'market' ? 'Price' : orderType === 'stop-loss' ? 'Stop Price' : 'Limit Price'}
                                    </label>
                                    {orderType === 'limit' && tradeSide === 'buy' && (
                                        <div className="flex gap-1.5">
                                            <button onClick={() => setLimitPrice(stock.price.toFixed(2))} className="text-[9px] text-gray-400 hover:text-white transition-colors">MKT</button>
                                            <button onClick={() => setLimitPrice((stock.price * 0.99).toFixed(2))} className="text-[9px] text-gray-400 hover:text-white transition-colors">-1%</button>
                                            <button onClick={() => setLimitPrice((stock.price * 0.95).toFixed(2))} className="text-[9px] text-gray-400 hover:text-white transition-colors">-5%</button>
                                        </div>
                                    )}
                                    {orderType === 'limit' && tradeSide === 'sell' && (
                                        <div className="flex gap-1.5">
                                            <button onClick={() => setLimitPrice(stock.price.toFixed(2))} className="text-[9px] text-gray-400 hover:text-white transition-colors">MKT</button>
                                            <button onClick={() => setLimitPrice((stock.price * 1.05).toFixed(2))} className="text-[9px] text-gray-400 hover:text-white transition-colors">+5%</button>
                                            <button onClick={() => setLimitPrice((stock.price * 1.10).toFixed(2))} className="text-[9px] text-gray-400 hover:text-white transition-colors">+10%</button>
                                        </div>
                                    )}
                                    {orderType === 'stop-loss' && tradeSide === 'sell' && (
                                        <div className="flex gap-1.5">
                                            <button onClick={() => setLimitPrice((stock.price * 0.99).toFixed(2))} className="text-[9px] text-gray-400 hover:text-white transition-colors">-1%</button>
                                            <button onClick={() => setLimitPrice((stock.price * 0.95).toFixed(2))} className="text-[9px] text-gray-400 hover:text-white transition-colors">-5%</button>
                                            <button onClick={() => setLimitPrice((stock.price * 0.90).toFixed(2))} className="text-[9px] text-gray-400 hover:text-white transition-colors">-10%</button>
                                        </div>
                                    )}
                                </div>
                                <div className={`bg-gray-950 rounded-lg border border-gray-800 flex items-center px-3 py-1.5 ${orderType === 'market' ? 'opacity-50' : ''}`}>
                                    <span className="text-gray-500 mr-1">$</span>
                                    <input 
                                        type="number" 
                                        value={orderType === 'market' ? stock.price.toFixed(2) : limitPrice}
                                        onChange={(e) => setLimitPrice(e.target.value)}
                                        disabled={orderType === 'market'}
                                        className="bg-transparent text-white font-mono w-full focus:outline-none disabled:cursor-not-allowed"
                                        step="0.01"
                                    />
                                </div>
                            </div>
                            
                            {/* Totals */}
                            <div className="flex flex-col items-end justify-center pb-1">
                                <div className="text-[10px] text-gray-500 uppercase">Est. Total</div>
                                <div className="text-lg font-mono font-bold text-white">{formatMoney(totalValue)}</div>
                            </div>
                        </div>

                        <div className="w-[1px] h-12 bg-gray-800 mx-2"></div>

                        {/* Action Buttons */}
                        <div className="w-48 flex flex-col gap-2">
                             <button 
                                onClick={handleReviewOrder}
                                className={`w-full rounded-lg py-2 flex flex-col items-center justify-center transition-all shadow-lg active:scale-[0.98] ${
                                    tradeSide === 'buy' 
                                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20' 
                                      : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/20'
                                }`}
                             >
                                <span className="font-bold text-sm uppercase">
                                    {tradeSide === 'buy' ? 'Review Buy Order' : orderType === 'stop-loss' ? 'Review Stop' : 'Review Sell Order'}
                                </span>
                                <span className="text-[10px] opacity-80 font-normal">
                                    {orderType === 'market' ? '@ Market Price' : `@ ${formatMoney(execPrice)}`}
                                </span>
                             </button>
                             <button
                                onClick={() => {
                                    const action = tradeSide === 'buy' ? 'buying' : 'selling';
                                    const priceText = orderType === 'market' ? 'market price' : `$${limitPrice}`;
                                    const prompt = `Analyze my trade idea: I am considering ${action} ${tradeShares} shares of ${stock.symbol} at ${priceText}. What are the risks and potential upside?`;
                                    onNavigateToAI(stock.symbol, prompt);
                                    onClose();
                                }}
                                className="w-full rounded-lg py-1.5 flex items-center justify-center gap-1.5 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 transition-colors"
                             >
                                <BrainCircuit className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-bold uppercase">Ask Dragon AI</span>
                             </button>
                        </div>
                    </div>
                    
                    {/* Advanced Order Options Row */}
                    <div className="mt-4 pt-3 border-t border-gray-800 flex items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={isPreMarket}
                                    onChange={(e) => setIsPreMarket(e.target.checked)}
                                    className="rounded border-gray-700 bg-gray-900 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-gray-900"
                                />
                                Queue for Market Open
                            </label>
                            
                            <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={useBracket}
                                    onChange={(e) => setUseBracket(e.target.checked)}
                                    className="rounded border-gray-700 bg-gray-900 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-gray-900"
                                />
                                Auto Bracket (TPSL)
                            </label>
                        </div>
                        
                        {useBracket && (
                            <div className="flex flex-1 items-center gap-4 animate-in fade-in duration-200">
                                <div className="flex-1 flex items-center gap-2 bg-gray-950 rounded-lg border border-gray-800 px-3 py-1.5 focus-within:border-indigo-500">
                                    <span className="text-[10px] text-emerald-500 uppercase font-bold">Take Profit: $</span>
                                    <input 
                                        type="number" 
                                        placeholder={(execPrice * 1.05).toFixed(2)}
                                        value={takeProfitPriceBracket}
                                        onChange={(e) => setTakeProfitPriceBracket(e.target.value)}
                                        className="bg-transparent text-white font-mono text-xs w-full focus:outline-none"
                                    />
                                </div>
                                <div className="flex-1 flex items-center gap-2 bg-gray-950 rounded-lg border border-gray-800 px-3 py-1.5 focus-within:border-indigo-500">
                                    <span className="text-[10px] text-rose-500 uppercase font-bold">Stop Loss: $</span>
                                    <input 
                                        type="number" 
                                        placeholder={(execPrice * 0.95).toFixed(2)}
                                        value={stopLossPriceBracket}
                                        onChange={(e) => setStopLossPriceBracket(e.target.value)}
                                        className="bg-transparent text-white font-mono text-xs w-full focus:outline-none"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Position/Funds Footer Context */}
                    <div className="flex justify-between mt-3 px-1 text-[10px] text-gray-500 font-medium">
                        <div className="flex gap-4">
                            <span>Buying Power: <span className="text-gray-300 font-mono">{formatMoney(availableCash)}</span></span>
                            <span>Owned: <span className="text-gray-300 font-mono">{currentPosition?.shares || 0} Shares</span></span>
                        </div>
                        {orderType !== 'market' && <span className="text-amber-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Pre-filled for {tradeSide === 'buy' ? 'Entry' : 'Exit'} Strategy</span>}
                    </div>
                </div>
            ) : (
                 // Trading Dock - Confirmation View
                 <div className="bg-gray-900 p-6 border-t border-amber-500/30 shadow-[0_-5px_30px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom-5 duration-300">
                    <div className="flex items-start justify-between">
                         <div className="flex items-start gap-4">
                             <div className={`p-3 rounded-full ${tradeSide === 'buy' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                 {tradeSide === 'buy' ? <TrendingUp className="w-8 h-8" /> : <TrendingDown className="w-8 h-8" />}
                             </div>
                             <div>
                                 <h3 className="text-lg font-bold text-white mb-1">Confirm {tradeSide === 'buy' ? 'Buy' : 'Sell'} Order</h3>
                                 <div className="flex items-center gap-2 mb-2">
                                     <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${isLiveTrading ? 'bg-amber-500/20 text-amber-500 border border-amber-500/20' : 'bg-indigo-500/20 text-indigo-500 border border-indigo-500/20'}`}>
                                         {isLiveTrading ? 'LIVE TRADING' : 'PAPER TRADING'}
                                     </span>
                                 </div>
                                 <div className="flex items-center gap-4 text-sm">
                                     <div className="flex flex-col">
                                         <span className="text-gray-500 text-[10px] uppercase">Symbol</span>
                                         <span className="font-bold text-white">{stock.symbol}</span>
                                     </div>
                                     <div className="w-[1px] h-8 bg-gray-800"></div>
                                     <div className="flex flex-col">
                                         <span className="text-gray-500 text-[10px] uppercase">Quantity</span>
                                         <span className="font-bold text-white font-mono">{qty} Shares</span>
                                     </div>
                                     <div className="w-[1px] h-8 bg-gray-800"></div>
                                     <div className="flex flex-col">
                                         <span className="text-gray-500 text-[10px] uppercase">Type</span>
                                         <span className="font-bold text-white">{orderType === 'stop-loss' ? 'STOP LOSS' : orderType.toUpperCase()}</span>
                                     </div>
                                     <div className="w-[1px] h-8 bg-gray-800"></div>
                                     <div className="flex flex-col">
                                         <span className="text-gray-500 text-[10px] uppercase">Price</span>
                                         <span className="font-bold text-white font-mono">{orderType === 'market' ? 'Market' : formatMoney(execPrice)}</span>
                                     </div>
                                 </div>
                             </div>
                         </div>
                         
                         <div className="flex flex-col items-end min-w-[240px]">
                              <div className="text-right mb-3">
                                  <span className="text-gray-500 text-xs uppercase mb-1 block">Est. Trade Value</span>
                                  <span className="text-2xl font-bold font-mono text-white">{formatMoney(totalValue)}</span>
                              </div>
                              
                              <div className="bg-gray-950 p-3 rounded-lg border border-gray-800 text-xs w-full space-y-2">
                                   <div className="flex justify-between items-center text-gray-500">
                                       <span>Current Buying Power</span>
                                       <span className="font-mono">{formatMoney(availableCash)}</span>
                                   </div>
                                   <div className="flex justify-between items-center">
                                       <span className="text-gray-500">{tradeSide === 'buy' ? 'Cost Impact' : 'Est. Proceeds'}</span>
                                       <span className={`font-mono font-medium ${tradeSide === 'buy' ? 'text-rose-400' : 'text-emerald-400'}`}>
                                           {tradeSide === 'buy' ? '-' : '+'}{formatMoney(totalValue)}
                                       </span>
                                   </div>
                                   <div className="border-t border-gray-800 my-1"></div>
                                   <div className="flex justify-between items-center font-bold">
                                       <span className="text-gray-300">Projected Balance</span>
                                       <span className="text-amber-500 font-mono">
                                           {formatMoney(tradeSide === 'buy' ? availableCash - totalValue : availableCash + totalValue)}
                                       </span>
                                   </div>
                              </div>
                         </div>
                    </div>
                    
                    <div className="flex justify-end gap-3 mt-6">
                         <button 
                             onClick={() => setIsConfirming(false)}
                             className="px-6 py-2 rounded-lg font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                         >
                             Cancel
                         </button>
                         <button 
                             onClick={handleSubmitOrder}
                             className={`px-8 py-2 rounded-lg font-bold text-white shadow-lg flex items-center gap-2 ${
                                 tradeSide === 'buy' 
                                 ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/30' 
                                 : 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/30'
                             }`}
                         >
                             Confirm
                             <ArrowRightLeft className="w-4 h-4" />
                         </button>
                    </div>
                 </div>
            )}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon }: { label: string, value: string, icon?: React.ReactNode }) => (
  <div className="bg-gray-800/40 p-3 rounded-xl border border-gray-800/50 flex flex-col justify-center">
     <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1 flex justify-between">
        {label}
        {icon}
     </div>
     <div className="text-gray-200 font-mono font-medium text-sm">{value}</div>
  </div>
);

export default StockDetailModal;
