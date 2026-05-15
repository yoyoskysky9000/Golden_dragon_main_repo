import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, Time, CandlestickData, LineData, LineSeries, CandlestickSeries } from 'lightweight-charts';
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

const StockChart: React.FC<StockChartProps> = ({ data, color, referenceLines = [], type = 'line', onRsiCalculated, allStocks = [], selectedSymbol, onSymbolSelect }) => {
  const [showSMA, setShowSMA] = useState(false);
  const [showSMA50, setShowSMA50] = useState(false);
  const [showEMA, setShowEMA] = useState(false);
  const [showEMA20, setShowEMA20] = useState(false);
  const [showRSI, setShowRSI] = useState(false);
  const [liveData, setLiveData] = useState<StockData['history']>(data);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const rsiContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const rsiChartRef = useRef<IChartApi | null>(null);
  const mainSeriesRef = useRef<ISeriesApi<"Line" | "Candlestick"> | null>(null);
  const smaSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const sma50SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const emaSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const ema20SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const rsiSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const refLinesRefs = useRef<any[]>([]);

  const [tooltipData, setTooltipData] = useState<{
    visible: boolean;
    x: number;
    y: number;
    time?: string;
    open?: number;
    high?: number;
    low?: number;
    close?: number;
    price?: number;
  }>({ visible: false, x: 0, y: 0 });

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
  
  const chartProcessedData = useMemo(() => {
    if (liveData.length === 0) return [];
    const periodSMA = 10;
    const periodSMA50 = 50;
    const periodEMA20 = 20;
    const periodRSI = 14;
    
    let gains: number[] = [];
    let losses: number[] = [];
    
    const getOHLC = (point: any, index: number, array: any[]) => {
        const close = point.price;
        const open = index > 0 ? array[index - 1].price : close;
        const pseudoRandom = (Math.sin(index * 12.9898 + close) * 43758.5453) % 1;
        const vol = close * 0.005;
        const high = Math.max(open, close) + (Math.abs(pseudoRandom) * vol);
        const low = Math.min(open, close) - ((1 - Math.abs(pseudoRandom)) * vol);
        return { open, close, high, low };
    };

    return liveData.map((point, index, array) => {
        const { open, close, high, low } = getOHLC(point, index, array);

        let sma = null, sma50 = null, ema = null, ema20 = null;
        let rsi = null;

        if (index >= periodSMA - 1) {
            sma = array.slice(index - periodSMA + 1, index + 1).reduce((a, b) => a + b.price, 0) / periodSMA;
        }
        if (index >= periodSMA50 - 1) {
            sma50 = array.slice(index - periodSMA50 + 1, index + 1).reduce((a, b) => a + b.price, 0) / periodSMA50;
        }

        if (index === 0) {
            ema = close;
            ema20 = close;
        } else {
            const prevEMA: number = (array[index - 1] as any).ema || array[index - 1].price;
            ema = close * (2 / (periodSMA + 1)) + prevEMA * (1 - (2 / (periodSMA + 1)));

            const prevEMA20: number = (array[index - 1] as any).ema20 || array[index - 1].price;
            ema20 = close * (2 / (periodEMA20 + 1)) + prevEMA20 * (1 - (2 / (periodEMA20 + 1)));
        }

        if (index > 0) {
            const change = close - array[index - 1].price;
            gains.push(Math.max(0, change));
            losses.push(Math.max(0, -change));
            if (index >= periodRSI) {
                 const avgGain = gains.slice(-periodRSI).reduce((a, b) => a + b, 0) / periodRSI;
                 const avgLoss = losses.slice(-periodRSI).reduce((a, b) => a + b, 0) / periodRSI;
                 rsi = avgLoss === 0 ? 100 : 100 - (100 / (1 + (avgGain / avgLoss)));
            }
        }
        
        (point as any).ema = ema;
        (point as any).ema20 = ema20;

        const [timePart, period] = point.time.split(' ');
        const [hourStr, minStr] = timePart.split(':');
        let hours = parseInt(hourStr);
        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        
        const now = new Date();
        now.setHours(hours, parseInt(minStr), 0, 0);
        const t = (now.getTime() / 1000) + (index * 60); // Fake sequential strictly increasing timestamps

        return { ...point, t, sma, sma50, ema, ema20, rsi, open, close, high, low };
    });
  }, [liveData]);

  const rsiValues = useMemo(() => chartProcessedData.map(d => d.rsi || 50), [chartProcessedData]);

  React.useEffect(() => {
    if (onRsiCalculated && rsiValues.length > 0) {
      onRsiCalculated(rsiValues);
    }
  }, [rsiValues, onRsiCalculated]);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
        layout: {
            background: { type: ColorType.Solid, color: 'transparent' },
            textColor: '#6b7280',
        },
        grid: {
            vertLines: { color: '#1f2937' },
            horzLines: { color: '#1f2937' },
        },
        crosshair: {
            mode: 1,
            vertLine: { width: 1, color: '#4b5563', style: 3 },
            horzLine: { width: 1, color: '#4b5563', style: 3 },
        },
        rightPriceScale: { borderColor: '#1f2937' },
        timeScale: { borderColor: '#1f2937', timeVisible: true, secondsVisible: false },
        autoSize: true,
    });
    chartRef.current = chart;

    let series: ISeriesApi<"Candlestick" | "Line">;
    
    if (type === 'candlestick') {
        series = chart.addSeries(CandlestickSeries, {
            upColor: '#10b981',
            downColor: '#ef4444',
            borderVisible: false,
            wickUpColor: '#10b981',
            wickDownColor: '#ef4444',
        });
    } else {
        series = chart.addSeries(LineSeries, {
            color: color || '#10b981',
            lineWidth: 2,
        });
    }
    mainSeriesRef.current = series;

    chart.subscribeCrosshairMove((param) => {
        if (!param.point || !param.time || !param.seriesData.get(series)) {
            setTooltipData({ visible: false, x: 0, y: 0 });
            return;
        }

        const data = param.seriesData.get(series) as any;
        const x = param.point.x;
        const y = param.point.y;
        
        const originalPoint = chartProcessedData.find(d => Math.floor(d.t) === Math.floor(param.time as number));

        setTooltipData({
            visible: true,
            x,
            y,
            time: originalPoint?.time || '',
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close,
            price: data.value,
        });
    });

    return () => {
        chart.remove();
    };
  }, [type, color]);

  useEffect(() => {
      if (!mainSeriesRef.current || !referenceLines) return;
      refLinesRefs.current.forEach(r => mainSeriesRef.current?.removePriceLine(r));
      refLinesRefs.current = [];

      referenceLines.forEach(line => {
          const l = mainSeriesRef.current?.createPriceLine({
              price: line.y,
              color: line.color,
              lineWidth: 1,
              lineStyle: 2,
              axisLabelVisible: true,
              title: line.label,
          });
          refLinesRefs.current.push(l);
      });
  }, [referenceLines, type, color]);

  useEffect(() => {
    if (!rsiContainerRef.current || !showRSI) return;

    const rsiChart = createChart(rsiContainerRef.current, {
        layout: {
            background: { type: ColorType.Solid, color: 'transparent' },
            textColor: '#6b7280',
        },
        grid: {
            vertLines: { color: '#1f2937' },
            horzLines: { color: '#1f2937' },
        },
        rightPriceScale: { borderColor: '#1f2937', autoScale: true },
        timeScale: { borderColor: '#f97316', visible: false },
        autoSize: true,
    });
    rsiChartRef.current = rsiChart;

    const rsiSeries = rsiChart.addSeries(LineSeries, {
        color: '#f97316',
        lineWidth: 1.5,
        autoscaleInfoProvider: () => ({
            priceRange: {
                minValue: 0,
                maxValue: 100,
            },
            margins: {
                above: 10,
                below: 10,
            }
        }),
    });
    
    rsiSeries.createPriceLine({
        price: 70,
        color: '#ef4444', // overbought color
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: 'Overbought',
    });
    
    rsiSeries.createPriceLine({
        price: 30,
        color: '#10b981', // oversold color
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: 'Oversold',
    });

    rsiSeriesRef.current = rsiSeries;

    if (chartRef.current) {
        chartRef.current.timeScale().subscribeVisibleLogicalRangeChange(range => {
            if (range) rsiChart.timeScale().setVisibleLogicalRange(range);
        });
        rsiChart.timeScale().subscribeVisibleLogicalRangeChange(range => {
             if (range) chartRef.current?.timeScale().setVisibleLogicalRange(range);
        });
    }

    return () => {
        rsiChart.remove();
    };
  }, [showRSI]);

  useEffect(() => {
    if (!mainSeriesRef.current || chartProcessedData.length === 0) return;

    const mwData = chartProcessedData.map(d => {
        if (type === 'candlestick') {
            return {
                time: Math.floor(d.t) as Time,
                open: d.open,
                high: d.high,
                low: d.low,
                close: d.close
            } as CandlestickData;
        } else {
            return {
                time: Math.floor(d.t) as Time,
                value: d.price
            } as LineData;
        }
    });

    const uniqueMwData = [];
    const seenTimes = new Set();
    for (const item of mwData) {
        let t = item.time as number;
        while (seenTimes.has(t)) t += 1;
        seenTimes.add(t);
        uniqueMwData.push({ ...item, time: t as Time });
    }

    uniqueMwData.sort((a,b) => (a.time as number) - (b.time as number));

    mainSeriesRef.current.setData(uniqueMwData as any);

    if (showSMA) {
        if (!smaSeriesRef.current && chartRef.current) {
            smaSeriesRef.current = chartRef.current.addSeries(LineSeries, { color: '#818cf8', lineWidth: 1.5, crosshairMarkerVisible: false });
        }
        const smaData = uniqueMwData.map((d, i) => ({ time: d.time, value: chartProcessedData[i].sma })).filter(d => d.value !== null) as LineData[];
        smaSeriesRef.current?.setData(smaData);
    } else if (smaSeriesRef.current && chartRef.current) {
        chartRef.current.removeSeries(smaSeriesRef.current);
        smaSeriesRef.current = null;
    }

    if (showSMA50) {
        if (!sma50SeriesRef.current && chartRef.current) {
            sma50SeriesRef.current = chartRef.current.addSeries(LineSeries, { color: '#60a5fa', lineWidth: 1.5, crosshairMarkerVisible: false });
        }
        const sma50Data = uniqueMwData.map((d, i) => ({ time: d.time, value: chartProcessedData[i].sma50 })).filter(d => d.value !== null) as LineData[];
        sma50SeriesRef.current?.setData(sma50Data);
    } else if (sma50SeriesRef.current && chartRef.current) {
        chartRef.current.removeSeries(sma50SeriesRef.current);
        sma50SeriesRef.current = null;
    }
    
    if (showEMA) {
        if (!emaSeriesRef.current && chartRef.current) {
            emaSeriesRef.current = chartRef.current.addSeries(LineSeries, { color: '#c084fc', lineWidth: 1.5, crosshairMarkerVisible: false });
        }
        const emaData = uniqueMwData.map((d, i) => ({ time: d.time, value: chartProcessedData[i].ema })).filter(d => d.value !== null) as LineData[];
        emaSeriesRef.current?.setData(emaData);
    } else if (emaSeriesRef.current && chartRef.current) {
        chartRef.current.removeSeries(emaSeriesRef.current);
        emaSeriesRef.current = null;
    }

    if (showEMA20) {
        if (!ema20SeriesRef.current && chartRef.current) {
            ema20SeriesRef.current = chartRef.current.addSeries(LineSeries, { color: '#e879f9', lineWidth: 1.5, crosshairMarkerVisible: false });
        }
        const ema20Data = uniqueMwData.map((d, i) => ({ time: d.time, value: chartProcessedData[i].ema20 })).filter(d => d.value !== null) as LineData[];
        ema20SeriesRef.current?.setData(ema20Data);
    } else if (ema20SeriesRef.current && chartRef.current) {
        chartRef.current.removeSeries(ema20SeriesRef.current);
        ema20SeriesRef.current = null;
    }

    if (showRSI && rsiSeriesRef.current) {
        const rsiData = uniqueMwData.map((d, i) => ({ time: d.time, value: chartProcessedData[i].rsi })).filter(d => d.value !== null) as LineData[];
        rsiSeriesRef.current.setData(rsiData);
    }

  }, [chartProcessedData, type, showSMA, showSMA50, showEMA, showEMA20, showRSI]);


  const currentPrice = chartProcessedData.length > 0 ? chartProcessedData[chartProcessedData.length - 1].price : 0;
  const previousPrice = chartProcessedData.length > 1 ? chartProcessedData[chartProcessedData.length - 2].price : currentPrice;
  const isUp = currentPrice >= previousPrice;
  const priceChange = currentPrice - previousPrice;
  const priceChangePct = previousPrice > 0 ? (priceChange / previousPrice) * 100 : 0;

  return (
    <div className="w-full h-full relative group flex flex-col gap-2 bg-[#0a0a18] rounded-xl overflow-hidden" data-rsi={JSON.stringify(rsiValues)}>
        <div className="absolute top-4 left-4 z-20 flex flex-col pointer-events-none">
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

        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 flex gap-2 bg-gray-900/90 backdrop-blur-md p-1.5 rounded-xl border border-gray-800 shadow-2xl flex-wrap justify-center pointer-events-auto">
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
            <button onClick={() => setShowRSI(!showRSI)} className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-all flex items-center gap-1.5 ${showRSI ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50' : 'text-gray-500 hover:text-gray-300 border border-transparent'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${showRSI ? 'bg-orange-400' : 'bg-gray-700'}`} /> RSI
            </button>
        </div>

        {allStocks.length > 0 && onSymbolSelect && (
            <div className="absolute top-4 right-4 z-30" ref={searchContainerRef} onClick={(e) => e.stopPropagation()}>
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

      {tooltipData.visible && (
        <div 
            className="absolute z-50 bg-gray-900 border border-gray-700 p-3 rounded-lg shadow-2xl text-xs pointer-events-none"
            style={{ left: Math.min(tooltipData.x + 15, chartContainerRef.current?.offsetWidth! - 150) + 'px', top: tooltipData.y + 15 + 'px' }}
        >
           <p className="text-gray-400 mb-2 font-mono">{tooltipData.time}</p>
           {type === 'candlestick' && tooltipData.open !== undefined ? (
             <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono">
               <span className="text-gray-500">O: <span className={tooltipData.open > (tooltipData.close||0) ? 'text-rose-400' : 'text-emerald-400'}>{tooltipData.open.toFixed(2)}</span></span>
               <span className="text-gray-500">H: <span className="text-gray-300">{tooltipData.high?.toFixed(2)}</span></span>
               <span className="text-gray-500">L: <span className="text-gray-300">{tooltipData.low?.toFixed(2)}</span></span>
               <span className="text-gray-500">C: <span className={tooltipData.open > (tooltipData.close||0) ? 'text-rose-400' : 'text-emerald-400'}>{tooltipData.close?.toFixed(2)}</span></span>
             </div>
           ) : (
             <div className="font-mono text-gray-200 font-bold">Price: ${(tooltipData.price || 0).toFixed(2)}</div>
           )}
        </div>
      )}

      <div ref={chartContainerRef} className={`w-full ${showRSI ? 'h-[70%]' : 'h-full'} mt-16 px-2`} />
      
      {showRSI && (
          <div className="h-[30%] border-t border-gray-800 relative z-10 px-2 mt-2 pt-2 pb-2">
            <span className="absolute top-2 left-2 text-[10px] font-bold text-orange-500 opacity-50 z-20">RSI (14)</span>
            <div ref={rsiContainerRef} className="w-full h-full" />
          </div>
      )}
    </div>
  );
};

export default StockChart;
