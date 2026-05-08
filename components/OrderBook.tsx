
import React, { useMemo } from 'react';
import { generateOrderBook } from '../services/mockMarket';

interface OrderBookProps {
  currentPrice: number;
}

const OrderBook: React.FC<OrderBookProps> = ({ currentPrice }) => {
  const { bids, asks } = useMemo(() => generateOrderBook(currentPrice), [currentPrice]);

  const maxSize = useMemo(() => {
    const allSizes = [...bids.map(b => b.size), ...asks.map(a => a.size)];
    return Math.max(...allSizes, 1);
  }, [bids, asks]);

  return (
    <div className="flex flex-col h-full bg-gray-950 border border-gray-800 rounded-lg overflow-hidden font-mono text-xs">
      {/* Header */}
      <div className="bg-gray-900 px-3 py-2 border-b border-gray-800 grid grid-cols-3 font-bold text-gray-400 gap-2">
        <span className="text-left">SIZE</span>
        <span className="text-right">TOTAL</span>
        <span className="text-right">PRICE</span>
      </div>
      
      {/* Asks (Sell Orders) - Red - Reversed so lowest ask is at bottom */}
      <div className="flex-1 flex flex-col justify-end overflow-hidden">
        {[...asks].reverse().map((ask, i) => {
          const heat = ask.size / maxSize;
          return (
            <div key={i} className="grid grid-cols-3 px-3 py-0.5 relative group hover:bg-gray-900 gap-2 items-center">
              {/* Depth Bar (Cumulative) */}
              <div 
                  className="absolute right-0 top-0 bottom-0 bg-rose-500/5 z-0 transition-all duration-300" 
                  style={{ width: `${ask.percent}%` }}
              ></div>
              {/* Heat Bar (Individual Size) */}
              <div 
                  className="absolute right-0 top-0 bottom-0 z-0 transition-all duration-300" 
                  style={{ 
                    width: `${(ask.size / maxSize) * 100}%`,
                    backgroundColor: `rgba(244, 63, 94, ${0.1 + heat * 0.6})`
                  }}
              ></div>
              <span className="z-10 text-gray-400 group-hover:text-white text-left">{ask.size.toLocaleString()}</span>
              <span className="z-10 text-gray-500 text-right">{ask.total.toLocaleString()}</span>
              <span className="z-10 text-rose-500 font-medium text-right">{ask.price.toFixed(2)}</span>
            </div>
          );
        })}
      </div>

      {/* Spread Indicator */}
      <div className="bg-gray-900/50 py-1.5 border-y border-gray-800 flex justify-between px-3 items-center">
         <span className={`font-bold text-lg ${currentPrice > bids[0].price ? 'text-emerald-500' : 'text-rose-500'}`}>
            {currentPrice.toFixed(2)}
         </span>
         <span className="text-[10px] text-gray-500">SPREAD: {(asks[0].price - bids[0].price).toFixed(2)}</span>
      </div>

      {/* Bids (Buy Orders) - Green */}
      <div className="flex-1 flex flex-col justify-start overflow-hidden">
        {bids.map((bid, i) => {
          const heat = bid.size / maxSize;
          return (
            <div key={i} className="grid grid-cols-3 px-3 py-0.5 relative group hover:bg-gray-900 gap-2 items-center">
              {/* Depth Bar (Cumulative) */}
              <div 
                  className="absolute right-0 top-0 bottom-0 bg-emerald-500/5 z-0 transition-all duration-300" 
                  style={{ width: `${bid.percent}%` }}
              ></div>
              {/* Heat Bar (Individual Size) */}
              <div 
                  className="absolute right-0 top-0 bottom-0 z-0 transition-all duration-300" 
                  style={{ 
                    width: `${(bid.size / maxSize) * 100}%`,
                    backgroundColor: `rgba(16, 185, 129, ${0.1 + heat * 0.6})`
                  }}
              ></div>
              <span className="z-10 text-gray-400 group-hover:text-white text-left">{bid.size.toLocaleString()}</span>
              <span className="z-10 text-gray-500 text-right">{bid.total.toLocaleString()}</span>
              <span className="z-10 text-emerald-500 font-medium text-right">{bid.price.toFixed(2)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OrderBook;
