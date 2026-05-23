
import React, { useMemo, useEffect, useRef, useState } from 'react';
import { generateOrderBook } from '../services/mockMarket';

interface OrderBookProps {
  currentPrice: number;
  symbol?: string;
  history?: { price: number }[];
}

const OrderRow = ({
  item,
  type,
  maxSize
}: {
  item: { price: number; size: number; total: number; percent: number };
  type: 'bid' | 'ask';
  maxSize: number;
}) => {
  const [flash, setFlash] = useState(false);
  const prevSize = useRef(item.size);

  useEffect(() => {
    if (item.size !== prevSize.current) {
      setFlash(true);
      const timeout = setTimeout(() => setFlash(false), 300);
      prevSize.current = item.size;
      return () => clearTimeout(timeout);
    }
  }, [item.size]);

  const heat = item.size / maxSize;
  const isBid = type === 'bid';

  const flashClass = flash
    ? (isBid ? 'bg-emerald-500/30' : 'bg-rose-500/30')
    : 'bg-transparent';

  return (
    <div className={`grid grid-cols-3 px-3 py-0.5 relative group hover:bg-gray-900 gap-2 items-center transition-colors duration-300 ${flashClass}`}>
      {/* Depth Bar (Cumulative) */}
      <div 
          className={`absolute right-0 top-0 bottom-0 z-0 transition-all duration-300 ${isBid ? 'bg-emerald-500/5' : 'bg-rose-500/5'}`} 
          style={{ width: `${item.percent}%` }}
      ></div>
      {/* Heat Bar (Individual Size) */}
      <div 
          className="absolute right-0 top-0 bottom-0 z-0 transition-all duration-300" 
          style={{ 
            width: `${(item.size / maxSize) * 100}%`,
            backgroundColor: isBid ? `rgba(16, 185, 129, ${0.1 + heat * 0.6})` : `rgba(244, 63, 94, ${0.1 + heat * 0.6})`
          }}
      ></div>
      <span className="z-10 text-gray-400 group-hover:text-white text-left">{item.size.toLocaleString()}</span>
      <span className="z-10 text-gray-500 text-center">{item.total.toLocaleString()}</span>
      <span className={`z-10 font-medium text-right ${isBid ? 'text-emerald-500' : 'text-rose-500'}`}>{item.price.toFixed(2)}</span>
    </div>
  );
};

const OrderBook: React.FC<OrderBookProps> = ({ currentPrice, symbol, history }) => {
  const [depth, setDepth] = useState(8);
  const { bids, asks } = useMemo(() => generateOrderBook(currentPrice, depth), [currentPrice, depth]);
  const [priceFlash, setPriceFlash] = useState<'up' | 'down' | 'none'>('none');
  const prevPriceRef = useRef(currentPrice);

  const [priceHistory, setPriceHistory] = useState<number[]>([]);

  useEffect(() => {
    if (history && history.length > 0) {
      setPriceHistory(history.map(h => h.price));
    }
  }, [history]);

  useEffect(() => {
    setPriceHistory(prev => {
      const newHistory = [...prev, currentPrice];
      if (newHistory.length > 50) return newHistory.slice(newHistory.length - 50);
      return newHistory;
    });
  }, [currentPrice]);

  const rsi = useMemo(() => {
    const period = 14;
    const prices = priceHistory;
    if (prices.length < period + 1) return 50;

    let gains = 0;
    let losses = 0;
    for (let i = 1; i <= period; i++) {
      const diff = prices[i] - prices[i - 1];
      if (diff >= 0) gains += diff;
      else losses -= diff;
    }
    let avgGain = gains / period;
    let avgLoss = losses / period;

    for (let i = period + 1; i < prices.length; i++) {
       const diff = prices[i] - prices[i-1];
       if (diff >= 0) {
          avgGain = (avgGain * (period - 1) + diff) / period;
          avgLoss = (avgLoss * (period - 1)) / period;
       } else {
          avgGain = (avgGain * (period - 1)) / period;
          avgLoss = (avgLoss * (period - 1) - diff) / period;
       }
    }
    
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }, [priceHistory]);

  useEffect(() => {
    if (currentPrice > prevPriceRef.current) {
      setPriceFlash('up');
    } else if (currentPrice < prevPriceRef.current) {
      setPriceFlash('down');
    }
    prevPriceRef.current = currentPrice;

    const timeout = setTimeout(() => {
      setPriceFlash('none');
    }, 500);

    return () => clearTimeout(timeout);
  }, [currentPrice]);

  const maxSize = useMemo(() => {
    const allSizes = [...bids.map(b => b.size), ...asks.map(a => a.size)];
    return Math.max(...allSizes, 1);
  }, [bids, asks]);

  return (
    <div className="flex flex-col h-full bg-gray-950 border border-gray-800 rounded-lg overflow-hidden font-mono text-xs">
      {/* Controls */}
      <div className="bg-gray-900 px-3 py-2 border-b border-gray-800 flex justify-between items-center">
        <span className="text-gray-400 font-bold font-sans">Order Book</span>
        <div className="flex items-center gap-2">
          <span className="text-gray-500 font-sans">Depth</span>
          <select 
            value={depth} 
            onChange={(e) => setDepth(Number(e.target.value))}
            className="bg-gray-800 text-gray-300 border border-gray-700 rounded px-1.5 py-0.5 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value={8}>8</option>
            <option value={12}>12</option>
            <option value={20}>20</option>
          </select>
        </div>
      </div>

      {/* Header */}
      <div className="bg-gray-900 px-3 py-1.5 border-b border-gray-800 grid grid-cols-3 font-bold text-gray-500 gap-2">
        <span className="text-left">SIZE</span>
        <span className="text-center">TOTAL SIZE</span>
        <span className="text-right">PRICE</span>
      </div>
      
      {/* Asks (Sell Orders) - Red - Reversed so lowest ask is at bottom */}
      <div className="flex-1 flex flex-col justify-end overflow-hidden">
        {[...asks].reverse().map((ask, i) => (
          <OrderRow key={ask.price} item={ask} type="ask" maxSize={maxSize} />
        ))}
      </div>

      {/* Spread Indicator */}
      <div className={`py-1.5 border-y flex justify-between px-3 items-center transition-colors duration-300 ${
        priceFlash === 'up' ? 'bg-emerald-500/20 border-emerald-500' :
        priceFlash === 'down' ? 'bg-rose-500/20 border-rose-500' :
        'bg-gray-900/50 border-gray-800'
      }`}>
         <span className={`font-bold text-lg ${currentPrice > bids[0].price ? 'text-emerald-500' : 'text-rose-500'}`}>
            {currentPrice.toFixed(2)}
         </span>
         <span className="text-[10px] text-gray-500">SPREAD: {(asks[0].price - bids[0].price).toFixed(2)}</span>
      </div>

      {/* Bids (Buy Orders) - Green */}
      <div className="flex-1 flex flex-col justify-start overflow-hidden">
        {bids.map((bid, i) => (
          <OrderRow key={bid.price} item={bid} type="bid" maxSize={maxSize} />
        ))}
      </div>

      {/* RSI Indicator */}
      <div className="bg-gray-900 border-t border-gray-800 px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
           <span className="text-gray-400 font-sans text-xs">RSI (14) {symbol ? `- ${symbol}` : ''}</span>
           <span className={`font-bold text-xs ${rsi > 70 ? 'text-rose-500' : rsi < 30 ? 'text-emerald-500' : 'text-gray-300'}`}>
              {rsi.toFixed(1)}
           </span>
        </div>
        <div className="flex-1 ml-4 relative h-1.5 bg-gray-800 rounded-full overflow-hidden">
           {/* Overbought/Oversold zones */}
           <div className="absolute left-[30%] top-0 bottom-0 w-px bg-gray-600 z-0"></div>
           <div className="absolute left-[70%] top-0 bottom-0 w-px bg-gray-600 z-0"></div>
           
           <div 
             className={`absolute left-0 top-0 bottom-0 transition-all duration-500 rounded-full ${
                rsi > 70 ? 'bg-rose-500' : rsi < 30 ? 'bg-emerald-500' : 'bg-blue-500'
             }`}
             style={{ width: `${rsi}%` }}
           ></div>
        </div>
      </div>
    </div>
  );
};

export default OrderBook;
