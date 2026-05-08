
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ComposedChart, Line, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Search } from 'lucide-react';
import { StockData } from '../types';

interface ReferenceLineData {
  y: number;
  label: string;
  color: string;
}

interface StockChartProps {
  data: StockData['history'];
  color: string;
  showActiveDot?: boolean;
  referenceLines?: ReferenceLineData[];
  type?: 'line' | 'candlestick';
  onRsiCalculated?: (rsiValues: number[]) => void;
  allStocks?: StockData[];
  selectedSymbol?: string;
  onSymbolSelect?: (symbol: string) => void;
}

const CandleStickShape = (props: any) => {
  const { x, y, width, height, payload, yAxis } = props;
  const { open, close, high, low } = payload;
  const yOpen = yAxis.scale(open);
  const yClose = yAxis.scale(close);
  const yHigh = yAxis.scale(high);
  const yLow = yAxis.scale(low);
  const isUp = close >= open;
  const color = isUp ? '#10b981' : '#ef4444';
  const bodyHeight = Math.max(2, Math.abs(yOpen - yClose));
  const bodyY = Math.min(yOpen, yClose);
  return (
    <g>
      <line x1={x + width / 2} y1={yHigh} x2={x + width / 2} y2={yLow} stroke={color} strokeWidth={1} />
      <rect x={x} y={bodyY} width={width} height={bodyHeight} fill={color} stroke={color} />
    </g>
  );
};

const StockChart: React.FC<StockChartProps> = ({ data, color, showActiveDot = false, referenceLines = [], type = 'line', onRsiCalculated, allStocks = [], selectedSymbol, onSymbolSelect }) => {
  const [showSMA, setShowSMA] = useState(false);
  const [showSMA50, setShowSMA50] = useState(false);
  const [showEMA, setShowEMA] = useState(false);
  const [showEMA20, setShowEMA20] = useState(false);
  const [showBollinger, setShowBollinger] = useState(false);
  const [showRSI, setShowRSI] = useState(false);
  const [showStochRSI, setShowStochRSI] = useState(false);
  const [showSuperTrend, setShowSuperTrend] = useState(false);
  const [showSAR, setShowSAR] = useState(false);
  const [showSupportResistance, setShowSupportResistance] = useState(false);
  const [showKalman, setShowKalman] = useState(false);
  const [liveData, setLiveData] = useState<StockData['history']>(data);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredStocks = useMemo(() => {
    if (!searchQuery) return allStocks;
    return allStocks.filter(s => 
      s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) || 
      s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allStocks, searchQuery]);

  React.useEffect(() => {
    setLiveData(data);
  }, [data]);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setLiveData(prev => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1];
        const change = (Math.random() - 0.5) * (last.price * 0.005);
        const newPrice = Math.max(0.01, last.price + change);
        
        // Occasionally add a new data point instead of just updating the last one
        if (Math.random() > 0.8) {
            const [time, period] = last.time.split(' ');
            const [hour, minute] = time.split(':').map(Number);
            let newMinute = minute + 5;
            let newHour = hour;
            let newPeriod = period;
            if (newMinute >= 60) {
                newMinute -= 60;
                newHour += 1;
                if (newHour === 12) {
                    newPeriod = period === 'AM' ? 'PM' : 'AM';
                } else if (newHour > 12) {
                    newHour -= 12;
                }
            }
            const newTime = `${newHour}:${newMinute.toString().padStart(2, '0')} ${newPeriod}`;
            return [...prev.slice(1), { time: newTime, price: newPrice }];
        }
        
        return [...prev.slice(0, -1), { ...last, price: newPrice }];
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);
  
  const chartData = useMemo(() => {
    if (liveData.length === 0) return [];
    const periodSMA = 10;
    const periodSMA50 = 50;
    const periodEMA20 = 20;
    const periodBollinger = 20;
    const periodRSI = 14;
    const periodStoch = 14;
    const periodATR = 10;
    
    let gains: number[] = [];
    let losses: number[] = [];
    let rsiHistory: number[] = [];
    let trHistory: number[] = [];
    
    // For Sar
    let sarAcc = liveData[0]?.price || 0;
    let ep = liveData[0]?.price || 0;
    let af = 0.02;
    let isLong = true;

    // Helper for pseudo high/low/open/close consistently based on price
    // Since original just added random vol, we'll keep it simple or base it on pseudo values
    const getOHLC = (point: any, index: number, array: any[]) => {
        const close = point.price;
        const open = index > 0 ? array[index - 1].price : close;
        // Deterministic pseudo high/low to prevent flickering on re-renders for same points
        const pseudoRandom = (Math.sin(index * 12.9898 + close) * 43758.5453) % 1;
        const vol = close * 0.005;
        const high = Math.max(open, close) + (Math.abs(pseudoRandom) * vol);
        const low = Math.min(open, close) - ((1 - Math.abs(pseudoRandom)) * vol);
        return { open, close, high, low };
    };

    return liveData.map((point, index, array) => {
        const { open, close, high, low } = getOHLC(point, index, array);

        let sma = null, sma50 = null, ema = null, ema20 = null;
        let bUpper = null, bLower = null, bMiddle = null;
        let rsi = null, stochRsi = null, atr = null, superTrend = null;
        let sar = null, resistance = null, support = null;

        if (index >= periodSMA - 1) {
            sma = array.slice(index - periodSMA + 1, index + 1).reduce((a, b) => a + b.price, 0) / periodSMA;
        }
        if (index >= periodSMA50 - 1) {
            sma50 = array.slice(index - periodSMA50 + 1, index + 1).reduce((a, b) => a + b.price, 0) / periodSMA50;
        }

        if (index === 0) {
            ema = close;
            ema20 = close;
            sar = low;
        } else {
            const prevEMA: number = (array[index - 1] as any).ema || array[index - 1].price;
            ema = close * (2 / (periodSMA + 1)) + prevEMA * (1 - (2 / (periodSMA + 1)));

            const prevEMA20: number = (array[index - 1] as any).ema20 || array[index - 1].price;
            ema20 = close * (2 / (periodEMA20 + 1)) + prevEMA20 * (1 - (2 / (periodEMA20 + 1)));
            
            // SAR Calculation (simplified)
            sar = sarAcc;
            if (isLong) {
                if (low < sar) {
                    isLong = false;
                    sarAcc = ep;
                    ep = low;
                    af = 0.02;
                    sar = sarAcc;
                } else {
                    if (high > ep) { ep = high; af = Math.min(0.2, af + 0.02); }
                    sarAcc = sarAcc + af * (ep - sarAcc);
                }
            } else {
                if (high > sar) {
                    isLong = true;
                    sarAcc = ep;
                    ep = high;
                    af = 0.02;
                    sar = sarAcc;
                } else {
                    if (low < ep) { ep = low; af = Math.min(0.2, af + 0.02); }
                    sarAcc = sarAcc + af * (ep - sarAcc);
                }
            }
        }

        if (index >= periodBollinger - 1) {
             const slice = array.slice(index - periodBollinger + 1, index + 1);
             const mean = slice.reduce((a, b) => a + b.price, 0) / periodBollinger;
             const variance = slice.reduce((a, b) => a + Math.pow(b.price - mean, 2), 0) / periodBollinger;
             const stdDev = Math.sqrt(variance);
             bUpper = mean + (2 * stdDev);
             bLower = mean - (2 * stdDev);
             bMiddle = mean;
        }

        if (index > 0) {
            const change = close - array[index - 1].price;
            gains.push(Math.max(0, change));
            losses.push(Math.max(0, -change));
            if (index >= periodRSI) {
                 const avgGain = gains.slice(-periodRSI).reduce((a, b) => a + b, 0) / periodRSI;
                 const avgLoss = losses.slice(-periodRSI).reduce((a, b) => a + b, 0) / periodRSI;
                 rsi = avgLoss === 0 ? 100 : 100 - (100 / (1 + (avgGain / avgLoss)));
                 rsiHistory.push(rsi);
                 
                 // Stoch RSI
                 if (rsiHistory.length >= periodStoch) {
                     const rsiSlice = rsiHistory.slice(-periodStoch);
                     const minRsi = Math.min(...rsiSlice);
                     const maxRsi = Math.max(...rsiSlice);
                     stochRsi = maxRsi === minRsi ? 50 : ((rsi - minRsi) / (maxRsi - minRsi)) * 100;
                 }
            }
            
            // True Range
            const prevClose = array[index - 1].price;
            const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
            trHistory.push(tr);
            
            if (trHistory.length >= periodATR) {
                atr = trHistory.slice(-periodATR).reduce((a, b) => a + b, 0) / periodATR;
                // SuperTrend (simplified multiplier = 3)
                const hl2 = (high + low) / 2;
                const basicUpper = hl2 + (3 * atr);
                const basicLower = hl2 - (3 * atr);
                superTrend = isLong ? basicLower : basicUpper; // very simplified representation
            }
        }
        
        // Support and Resistance (Recent local min/max over 20 periods)
        if (index >= 20) {
           const slice20 = array.slice(index - 20, index);
           support = Math.min(...slice20.map(p => p.price));
           resistance = Math.max(...slice20.map(p => p.price));
        }

        // Keep these fields attached for tooltips/lines
        (point as any).ema = ema;
        (point as any).ema20 = ema20;

        return { ...point, sma, sma50, ema, ema20, bUpper, bLower, bMiddle, rsi, stochRsi, atr, superTrend, sar, support, resistance, open, close, high, low };
    });
  }, [liveData]);

  // Expose RSI values to the DOM so AI Assistant can scrape them easily if needed
  // In our case we'll pass them via props in the parent but this keeps data aligned
  const rsiValues = useMemo(() => chartData.map(d => d.rsi || 50), [chartData]);

  React.useEffect(() => {
    if (onRsiCalculated && rsiValues.length > 0) {
      onRsiCalculated(rsiValues);
    }
  }, [rsiValues, onRsiCalculated]);

  const minPrice = Math.min(...chartData.map(d => d.low || d.price));
  const maxPrice = Math.max(...chartData.map(d => d.high || d.price));
  const refMin = referenceLines.length ? Math.min(...referenceLines.map(r => r.y)) : minPrice;
  const refMax = referenceLines.length ? Math.max(...referenceLines.map(r => r.y)) : maxPrice;
  const finalMin = Math.min(minPrice, refMin);
  const finalMax = Math.max(maxPrice, refMax);
  const domainPadding = (finalMax - finalMin) * 0.1;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-gray-900 border border-gray-700 p-3 rounded-lg shadow-xl text-xs z-50">
           <p className="text-gray-400 mb-2">{label}</p>
           {type === 'candlestick' ? (
             <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono">
               <span className="text-gray-500">O:</span> <span className={d.open > d.close ? 'text-rose-400' : 'text-emerald-400'}>{d.open.toFixed(2)}</span>
               <span className="text-gray-500">C:</span> <span className={d.open > d.close ? 'text-rose-400' : 'text-emerald-400'}>{d.close.toFixed(2)}</span>
             </div>
           ) : (
             <div className="font-mono text-gray-200 font-bold">Price: ${d.price.toFixed(2)}</div>
           )}
           {showSMA && d.sma && <div className="text-indigo-400">SMA (10): {d.sma.toFixed(2)}</div>}
           {showSMA50 && d.sma50 && <div className="text-blue-400">SMA (50): {d.sma50.toFixed(2)}</div>}
           {showEMA && d.ema && <div className="text-purple-400">EMA (10): {d.ema.toFixed(2)}</div>}
           {showEMA20 && d.ema20 && <div className="text-fuchsia-400">EMA (20): {d.ema20.toFixed(2)}</div>}
           {showBollinger && d.bUpper && <div className="text-sky-300">BB: {d.bLower?.toFixed(2)} - {d.bMiddle?.toFixed(2)} - {d.bUpper?.toFixed(2)}</div>}
           {showRSI && d.rsi && <div className="text-orange-400 font-bold">RSI: {d.rsi.toFixed(1)}</div>}
           {showStochRSI && d.stochRsi && <div className="text-amber-400 font-bold">StochRSI: {d.stochRsi.toFixed(1)}</div>}
           {showSuperTrend && d.superTrend && <div className="text-emerald-400 font-bold">SuperTrend: {d.superTrend.toFixed(2)}</div>}
           {showSAR && d.sar && <div className="text-cyan-400 font-bold">PSAR: {d.sar.toFixed(2)}</div>}
           {showSupportResistance && d.support && <div className="text-emerald-500">Sup: {d.support.toFixed(2)}</div>}
           {showSupportResistance && d.resistance && <div className="text-rose-500">Res: {d.resistance.toFixed(2)}</div>}
           {showKalman && d.kalman && <div className="text-yellow-400 font-bold">Kalman: {d.kalman.toFixed(2)}</div>}
        </div>
      );
    }
    return null;
  };

  const currentPrice = chartData.length > 0 ? chartData[chartData.length - 1].price : 0;
  const previousPrice = chartData.length > 1 ? chartData[chartData.length - 2].price : currentPrice;
  const isUp = currentPrice >= previousPrice;
  const priceChange = currentPrice - previousPrice;
  const priceChangePct = previousPrice > 0 ? (priceChange / previousPrice) * 100 : 0;

  return (
    <div className="w-full h-full relative group flex flex-col gap-2" data-rsi={JSON.stringify(rsiValues)}>
        {/* Live Price Ticker Overlay */}
        <div className="absolute top-2 left-2 z-20 flex flex-col pointer-events-none">
            <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-bold font-mono tracking-tight ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                    ${currentPrice.toFixed(2)}
                </span>
                <span className="relative flex h-2 w-2">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isUp ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${isUp ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                </span>
            </div>
            <div className={`text-xs font-mono font-medium ${isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                {isUp ? '+' : ''}{priceChange.toFixed(2)} ({isUp ? '+' : ''}{priceChangePct.toFixed(2)}%)
            </div>
        </div>

        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-20 flex gap-2 bg-gray-950/80 backdrop-blur-md p-1 rounded-xl border border-gray-800 shadow-2xl flex-wrap justify-center" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowSMA(!showSMA)} className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-all flex items-center gap-1.5 ${showSMA ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/50' : 'text-gray-500 hover:text-gray-300 border border-transparent'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${showSMA ? 'bg-indigo-400' : 'bg-gray-700'}`} /> SMA 10
            </button>
            <button onClick={() => setShowSMA50(!showSMA50)} className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-all flex items-center gap-1.5 ${showSMA50 ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50' : 'text-gray-500 hover:text-gray-300 border border-transparent'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${showSMA50 ? 'bg-blue-400' : 'bg-gray-700'}`} /> SMA 50
            </button>
            <button onClick={() => setShowEMA(!showEMA)} className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-all flex items-center gap-1.5 ${showEMA ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50' : 'text-gray-500 hover:text-gray-300 border border-transparent'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${showEMA ? 'bg-purple-400' : 'bg-gray-700'}`} /> EMA 10
            </button>
            <button onClick={() => setShowEMA20(!showEMA20)} className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-all flex items-center gap-1.5 ${showEMA20 ? 'bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/50' : 'text-gray-500 hover:text-gray-300 border border-transparent'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${showEMA20 ? 'bg-fuchsia-400' : 'bg-gray-700'}`} /> EMA 20
            </button>
            <button onClick={() => setShowKalman(!showKalman)} className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-all flex items-center gap-1.5 ${showKalman ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50' : 'text-gray-500 hover:text-gray-300 border border-transparent'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${showKalman ? 'bg-yellow-400' : 'bg-gray-700'}`} /> Kalman Filter
            </button>
            <button onClick={() => setShowBollinger(!showBollinger)} className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-all flex items-center gap-1.5 ${showBollinger ? 'bg-sky-500/20 text-sky-400 border border-sky-500/50' : 'text-gray-500 hover:text-gray-300 border border-transparent'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${showBollinger ? 'bg-sky-400' : 'bg-gray-700'}`} /> BB
            </button>
            <button onClick={() => setShowRSI(!showRSI)} className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-all flex items-center gap-1.5 ${showRSI ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50' : 'text-gray-500 hover:text-gray-300 border border-transparent'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${showRSI ? 'bg-orange-400' : 'bg-gray-700'}`} /> RSI
            </button>
            <button onClick={() => setShowStochRSI(!showStochRSI)} className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-all flex items-center gap-1.5 ${showStochRSI ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50' : 'text-gray-500 hover:text-gray-300 border border-transparent'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${showStochRSI ? 'bg-amber-400' : 'bg-gray-700'}`} /> StochRSI
            </button>
            <button onClick={() => setShowSuperTrend(!showSuperTrend)} className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-all flex items-center gap-1.5 ${showSuperTrend ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' : 'text-gray-500 hover:text-gray-300 border border-transparent'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${showSuperTrend ? 'bg-emerald-400' : 'bg-gray-700'}`} /> SuperTrend
            </button>
            <button onClick={() => setShowSAR(!showSAR)} className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-all flex items-center gap-1.5 ${showSAR ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50' : 'text-gray-500 hover:text-gray-300 border border-transparent'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${showSAR ? 'bg-cyan-400' : 'bg-gray-700'}`} /> SAR
            </button>
            <button onClick={() => setShowSupportResistance(!showSupportResistance)} className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-all flex items-center gap-1.5 ${showSupportResistance ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50' : 'text-gray-500 hover:text-gray-300 border border-transparent'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${showSupportResistance ? 'bg-rose-400' : 'bg-gray-700'}`} /> Sup/Res
            </button>
        </div>

        {allStocks.length > 0 && onSymbolSelect && (
            <div className="absolute top-2 right-2 z-30" ref={searchContainerRef} onClick={(e) => e.stopPropagation()}>
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                    <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => setIsSearchOpen(true)}
                        placeholder="Search symbol..."
                        className="bg-gray-900 border border-gray-700 text-white text-xs rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:border-indigo-500 w-48 shadow-lg transition-all placeholder-gray-600"
                    />
                </div>
                {isSearchOpen && (
                    <div className="absolute top-full right-0 mt-1 w-56 max-h-64 overflow-y-auto bg-gray-900 border border-gray-700 rounded-lg shadow-2xl py-1">
                        {filteredStocks.length > 0 ? (
                            filteredStocks.map(stock => (
                                <button
                                    key={stock.symbol}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSymbolSelect(stock.symbol);
                                        setSearchQuery('');
                                        setIsSearchOpen(false);
                                    }}
                                    className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-800 transition-colors flex items-center justify-between ${stock.symbol === selectedSymbol ? 'bg-indigo-500/10 text-indigo-400' : 'text-gray-300'}`}
                                >
                                    <span className="font-bold font-mono">{stock.symbol}</span>
                                    <span className="text-[10px] text-gray-500 truncate ml-2 text-right">{stock.name}</span>
                                </button>
                            ))
                        ) : (
                            <div className="px-3 py-2 text-xs text-gray-500 text-center">No symbols found</div>
                        )}
                    </div>
                )}
            </div>
        )}

      <div className={`w-full ${showRSI ? 'h-[70%]' : 'h-full'}`}>
        <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
            <XAxis hide={showRSI} dataKey="time" tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis domain={[finalMin - domainPadding, finalMax + domainPadding]} tick={{ fill: '#6b7280', fontSize: 11, fontFamily: 'monospace' }} tickLine={false} axisLine={false} orientation="right" tickFormatter={(v) => v.toFixed(2)} />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#4b5563', strokeDasharray: '3 3' }} />
            {showBollinger && <Area dataKey={["bLower", "bUpper"] as any} stroke="none" fill="#0ea5e9" fillOpacity={0.15} isAnimationActive={false} />}
            {showBollinger && <Line type="monotone" dataKey="bUpper" stroke="#0ea5e9" strokeWidth={1.5} strokeDasharray="3 3" dot={false} isAnimationActive={false} />}
            {showBollinger && <Line type="monotone" dataKey="bMiddle" stroke="#0ea5e9" strokeWidth={1} strokeOpacity={0.8} dot={false} isAnimationActive={false} />}
            {showBollinger && <Line type="monotone" dataKey="bLower" stroke="#0ea5e9" strokeWidth={1.5} strokeDasharray="3 3" dot={false} isAnimationActive={false} />}
            {type === 'candlestick' ? <Bar dataKey="high" shape={<CandleStickShape />} isAnimationActive={false} /> : <Area type="monotone" dataKey="price" stroke={color} strokeWidth={2} fillOpacity={1} fill="url(#colorPrice)" isAnimationActive={false} activeDot={showActiveDot ? { r: 6, fill: '#1f2937', stroke: color, strokeWidth: 2 } : false} />}
            {showSMA && <Line type="monotone" dataKey="sma" stroke="#818cf8" strokeWidth={1.5} dot={false} isAnimationActive={false} />}
            {showSMA50 && <Line type="monotone" dataKey="sma50" stroke="#60a5fa" strokeWidth={1.5} dot={false} isAnimationActive={false} />}
            {showEMA && <Line type="monotone" dataKey="ema" stroke="#c084fc" strokeWidth={1.5} dot={false} isAnimationActive={false} />}
            {showEMA20 && <Line type="monotone" dataKey="ema20" stroke="#e879f9" strokeWidth={1.5} dot={false} isAnimationActive={false} />}
            {showKalman && <Line type="monotone" dataKey="kalman" stroke="#facc15" strokeWidth={1.5} dot={false} isAnimationActive={false} />}
            {showSuperTrend && <Line type="stepAfter" dataKey="superTrend" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />}
            {showSAR && <Line type="monotone" dataKey="sar" stroke="#06b6d4" strokeWidth={0} dot={{ r: 2, fill: '#06b6d4', strokeWidth: 0 }} isAnimationActive={false} />}
            {showSupportResistance && <Line type="stepAfter" dataKey="support" stroke="#10b981" strokeWidth={1.5} strokeDasharray="3 3" dot={false} isAnimationActive={false} opacity={0.5} />}
            {showSupportResistance && <Line type="stepAfter" dataKey="resistance" stroke="#f43f5e" strokeWidth={1.5} strokeDasharray="3 3" dot={false} isAnimationActive={false} opacity={0.5} />}
            {referenceLines.map((line, i) => <ReferenceLine key={i} y={line.y} stroke={line.color} strokeDasharray="3 3" label={{ value: line.label, position: 'insideRight', fill: line.color, fontSize: 10, dy: -10 }} />)}
            </ComposedChart>
        </ResponsiveContainer>
      </div>

      {(showRSI || showStochRSI) && (
          <div className="h-[30%] border-t border-gray-800 pt-2">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                    <XAxis dataKey="time" tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 100]} ticks={[20, 80]} tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} orientation="right" />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#4b5563', strokeDasharray: '3 3' }} />
                    <ReferenceLine y={80} stroke="#f97316" strokeDasharray="3 3" strokeOpacity={0.3} />
                    <ReferenceLine y={20} stroke="#f97316" strokeDasharray="3 3" strokeOpacity={0.3} />
                    {showRSI && <Line type="monotone" dataKey="rsi" stroke="#f97316" strokeWidth={1.5} dot={false} isAnimationActive={false} />}
                    {showStochRSI && <Line type="monotone" dataKey="stochRsi" stroke="#fbbf24" strokeWidth={1.5} dot={false} isAnimationActive={false} />}
                </ComposedChart>
            </ResponsiveContainer>
          </div>
      )}
    </div>
  );
};

export default StockChart;
