
import { StockData, CopyTrader, OrderBookRow } from '../types';

const INITIAL_ASSETS: Omit<StockData, 'history'>[] = [
  { symbol: 'NVDA', name: 'NVIDIA Corporation', price: 135.50, change: 2.45, changePercent: 1.84, volume: 45000000, sector: 'Technology', assetType: 'stock', description: 'Leader in AI computing.' },
  { symbol: 'AAPL', name: 'Apple Inc.', price: 226.80, change: -1.20, changePercent: -0.53, volume: 32000000, sector: 'Technology', assetType: 'stock', description: 'Global tech leader.' },
  { symbol: 'BTC-USD', name: 'Bitcoin', price: 64250.00, change: 1250.00, changePercent: 1.98, volume: 25000000000, sector: 'Crypto', assetType: 'crypto', description: 'Digital gold.' },
  { symbol: 'ETH-USD', name: 'Ethereum', price: 2645.20, change: -35.50, changePercent: -1.32, volume: 12000000000, sector: 'Crypto', assetType: 'crypto', description: 'Smart contract platform.' },
  { symbol: 'SOL-USD', name: 'Solana', price: 148.75, change: 4.25, changePercent: 2.94, volume: 3500000000, sector: 'Crypto', assetType: 'crypto', description: 'High-performance blockchain.' }
];

const EXCHANGES = ['DragonEx', 'KrakenMock', 'BinanceSim'];

export const generateInitialData = (): StockData[] => {
  return INITIAL_ASSETS.map(stock => {
    const history: { time: string; price: number; rsi?: number; sma?: number; kalman?: number }[] = [];
    let currentPrice = stock.price;
    const now = Date.now();
    for (let i = 50; i > 0; i--) {
      const time = new Date(now - i * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const volatility = stock.assetType === 'crypto' ? 0.008 : 0.003;
      currentPrice = currentPrice * (1 + (Math.random() - 0.5) * volatility * 2);
      history.push({ time, price: currentPrice });
    }

    // Apply Kalman filter initially
    let kalmanP = 1;
    let kalmanX = history[0].price;
    const kalmanR = stock.assetType === 'crypto' ? 0.02 : 0.005; // Process noise
    const kalmanQ = 0.1; // Measurement noise
    for (let i = 0; i < history.length; i++) {
        kalmanP = kalmanP + kalmanR;
        const K = kalmanP / (kalmanP + kalmanQ);
        kalmanX = kalmanX + K * (history[i].price - kalmanX);
        kalmanP = (1 - K) * kalmanP;
        history[i].kalman = kalmanX;
    }

    const exchangePrices: Record<string, number> = {};
    EXCHANGES.forEach(ex => {
        const variance = 1 + (Math.random() - 0.5) * 0.002; // 0.2% max spread
        exchangePrices[ex] = currentPrice * variance;
    });

    return { ...stock, history, exchanges: exchangePrices };
  });
};

export const simulateTick = (stocks: StockData[], updates?: any[]): StockData[] => {
  if (!updates) return stocks; // Fallback if no updates provided

  return stocks.map(stock => {
    const update = updates.find(u => u.symbol === stock.symbol);
    if (!update) return stock;

    const newPrice = update.price;
    const newPoint: { time: string; price: number; rsi?: number; sma?: number; kalman?: number } = {
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      price: newPrice
    };

    const newHistory = [...stock.history.slice(1), newPoint];

    // Calculate RSI (14 period)
    if (newHistory.length >= 15) {
      let gains = 0;
      let losses = 0;
      for (let i = newHistory.length - 14; i < newHistory.length; i++) {
        const change = newHistory[i].price - newHistory[i - 1].price;
        if (change > 0) gains += change;
        else losses -= change;
      }
      const avgGain = gains / 14;
      const avgLoss = losses / 14;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      const rsi = avgLoss === 0 ? 100 : 100 - (100 / (1 + rs));
      newHistory[newHistory.length - 1].rsi = rsi;
    }

    // Calculate SMA (20 period)
    if (newHistory.length >= 20) {
      let sum = 0;
      for (let i = newHistory.length - 20; i < newHistory.length; i++) {
        sum += newHistory[i].price;
      }
      newHistory[newHistory.length - 1].sma = sum / 20;
    }

    // Calculate Kalman Filter
    let kalmanP = 1;
    let kalmanX = newHistory[0].price;
    const kalmanR = stock.assetType === 'crypto' ? 0.02 : 0.005; // Process noise
    const kalmanQ = 0.1; // Measurement noise
    for (let i = 0; i < newHistory.length; i++) {
        kalmanP = kalmanP + kalmanR;
        const K = kalmanP / (kalmanP + kalmanQ);
        kalmanX = kalmanX + K * (newHistory[i].price - kalmanX);
        kalmanP = (1 - K) * kalmanP;
        newHistory[i].kalman = kalmanX;
    }

    // Simulate volume update
    const volumeUpdate = stock.volume + Math.floor(Math.random() * (stock.assetType === 'crypto' ? 50000 : 10000));

    return {
      ...stock,
      price: newPrice,
      change: newPrice - newHistory[0].price,
      changePercent: ((newPrice - newHistory[0].price) / newHistory[0].price) * 100,
      volume: volumeUpdate,
      history: newHistory,
      exchanges: update.exchanges || stock.exchanges
    };
  });
};

export const generateOrderBook = (currentPrice: number, depth: number = 8): { bids: OrderBookRow[], asks: OrderBookRow[] } => {
    const bids: OrderBookRow[] = [];
    const asks: OrderBookRow[] = [];
    let bidPrice = currentPrice;
    let askPrice = currentPrice;
    let bidTotal = 0;
    let askTotal = 0;

    for (let i = 0; i < depth; i++) {
        const spread = currentPrice * 0.0005;
        bidPrice = bidPrice - (Math.random() * spread);
        askPrice = askPrice + (Math.random() * spread);
        const baseSize = 100 + Math.random() * 1000;
        const bidSize = Math.floor(Math.random() > 0.8 ? baseSize * 5 : baseSize);
        const askSize = Math.floor(Math.random() > 0.8 ? baseSize * 5 : baseSize);
        bidTotal += bidSize;
        askTotal += askSize;
        bids.push({ price: bidPrice, size: bidSize, total: bidTotal, percent: 0 });
        asks.push({ price: askPrice, size: askSize, total: askTotal, percent: 0 });
    }

    const maxVol = Math.max(bidTotal, askTotal);
    bids.forEach(b => b.percent = (b.total / maxVol) * 100);
    asks.forEach(a => a.percent = (a.total / maxVol) * 100);
    return { bids, asks };
};

export const generateMockTraders = (): CopyTrader[] => {
  return [
    { id: '1', name: 'Sarah Quant', handle: '@quant_queen', bio: 'Algorithmic trading focused on mean reversion.', returnsAllTime: 45.2, winRate: 68.5, profitFactor: 2.1, followers: 1240, topAssets: ['NVDA', 'MSFT'], riskLevel: 'Medium', isCopying: false },
    { id: '2', name: 'Crypto Whale', handle: '@satoshi_disciple', bio: 'High conviction macro plays in crypto.', returnsAllTime: 312.8, winRate: 42.0, profitFactor: 3.5, followers: 8500, topAssets: ['BTC', 'SOL'], riskLevel: 'Degen', isCopying: false }
  ];
};
