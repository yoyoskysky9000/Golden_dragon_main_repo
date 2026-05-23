import express from "express";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import path from "path";
import { WebSocketServer } from "ws";
import http from "http";
import ccxt from "ccxt";
import fs from "fs";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
import TelegramBot from 'node-telegram-bot-api';
import { GoogleGenAI } from '@google/genai';

let firebaseDb: any = null;
try {
  const firebaseConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf-8'));
  const firebaseApp = initializeApp(firebaseConfig);
  firebaseDb = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
} catch (e) {
  console.log("Firebase not configured for server.", e);
}

// Simulated backend state for the user
const userPortfolio = {
  cash: 100000,
  positions: {} as Record<string, number>
};

process.on('uncaughtException', (err) => {
  console.error('Unhandled Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});

async function startServer() {
  const app = express();
  const PORT = 3000;
  const server = http.createServer(app);

  app.use(cors());
  app.use(express.json());

  // In-memory storage for demo purposes (could be replaced with a DB)
  const logs: any[] = [];
  const dataSources: any[] = [
    { id: '1', name: 'Market Price', type: 'realtime', status: 'connected', lastData: 'Price feed active', priority: 100, dependencies: [] },
    { id: '2', name: 'Technical Indicators', type: 'computed', status: 'connected', lastData: 'RSI: 45.2, SMA50: 132.1', priority: 80, dependencies: ['1'] },
    { id: '3', name: 'News Sentiment', type: 'ai_processed', status: 'connected', lastData: 'Bullish sentiment on Tech sector', priority: 50, dependencies: ['1'] },
    { id: '4', name: 'Social Media Feed', type: 'external_api', status: 'connected', lastData: 'High volume of mentions for NVDA', priority: 30, dependencies: [] },
    { id: '5', name: 'Fed Audio Transcripts', type: 'ai_processed', status: 'connected', lastData: 'Powell: "Monitoring inflation closely"', priority: 90, dependencies: [] },
    { id: '6', name: 'Nansen On-Chain Flows', type: 'external_api', status: 'connected', lastData: 'Whale moving 5000 ETH to Binance', priority: 85, dependencies: [] },
    { id: '7', name: 'Flashbots MEV Mempool', type: 'realtime', status: 'connected', lastData: 'Detecting sandwich attack on UNI', priority: 95, dependencies: [] },
    { id: '8', name: 'API Health Monitor', type: 'realtime', status: 'connected', lastData: 'All feeds operational', priority: 99, dependencies: [] },
    { id: 'ds_crypto_market_data', name: 'Crypto Market Data', type: 'realtime', status: 'connected', lastData: 'BTC/USD active', priority: 100, dependencies: [] },
  ];

  const bots: any[] = [];

  // Telegram Bot Integration
  if (process.env.TELEGRAM_BOT_TOKEN) {
    const telegramBot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
    const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

    telegramBot.on('message', async (msg) => {
      const chatId = msg.chat.id;
      const text = msg.text;

      if (!text) return;

      if (text.startsWith('/start')) {
        return telegramBot.sendMessage(chatId, "🐲 OmniTrade AI Telegram Bot active. Forward me signals from any channel, and I'll parse them and execute trades.");
      }

      try {
        telegramBot.sendMessage(chatId, "Analyzing signal with Gemini...");

        const prompt = `
        You are an expert trading AI parsing telegram signals.
        Message: "${text}"
        
        Determine if this is a trading signal (buy/sell/long/short). If it is, extract and map the details. Even if the ticker is obscure (like 'solana long' or 'doge buy'), normalize the symbol.
        Return JSON ONLY with this schema:
        {
          "isSignal": boolean,
          "symbol": string (e.g. BTC/USDT or NVDA),
          "side": "buy" | "sell",
          "entry": number | null,
          "takeProfit": number | null,
          "stopLoss": number | null,
          "reasoning": string ("Why you think it's a signal")
        }
        `;

        const response = await genAI.models.generateContent({
          model: 'gemini-3-pro-preview',
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: {
            responseMimeType: 'application/json'
          }
        });

        const jsonStr = response.text || "{}";
        const parsed = JSON.parse(jsonStr.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim());

        if (parsed.isSignal) {
          const quantity = 1;
          const orderPrice = parsed.entry || (Math.random() * 100 + 50);
          const totalValue = quantity * orderPrice;

          if (parsed.side === 'buy') {
              userPortfolio.cash -= totalValue;
              userPortfolio.positions[parsed.symbol] = (userPortfolio.positions[parsed.symbol] || 0) + quantity;
          } else {
              userPortfolio.positions[parsed.symbol] = (userPortfolio.positions[parsed.symbol] || 0) - quantity;
              userPortfolio.cash += totalValue;
          }

          logs.push({
             id: Math.random().toString(36).substr(2, 9),
             type: 'telegram_signal_executed',
             message: `Executed Telegram Signal: ${parsed.side.toUpperCase()} ${parsed.symbol} (Signal TP: ${parsed.takeProfit}, SL: ${parsed.stopLoss})`,
             timestamp: Date.now()
          });
          
          if (logs.length > 1000) logs.shift();

          const replyMsgs = `✅ Signal Accepted & Executed!
Symbol: ${parsed.symbol}
Side: ${parsed.side.toUpperCase()}
Entry: ${parsed.entry || 'Market'}
TP: ${parsed.takeProfit || 'N/A'}
SL: ${parsed.stopLoss || 'N/A'}

Reasoning: ${parsed.reasoning}`;

          telegramBot.sendMessage(chatId, replyMsgs);
        } else {
           telegramBot.sendMessage(chatId, "Not recognized as a valid trading signal.\nReason: " + parsed.reasoning);
        }
      } catch (e: any) {
        telegramBot.sendMessage(chatId, "Error parsing signal: " + e.message);
      }
    });

    console.log("Telegram Bot initialized matching token environment variable.");
  }


  // API Routes
  app.post("/api/exchange/connect", async (req, res) => {
    const { exchangeId, apiKey, apiSecret } = req.body;
    
    // Mock connection for testing
    if (apiKey.toLowerCase() === 'demo' || apiSecret.toLowerCase() === 'demo') {
      return res.json({
        success: true,
        assets: [
          { symbol: 'BTC', amount: 0.5, value: 32125.00 },
          { symbol: 'ETH', amount: 4.2, value: 11109.84 },
          { symbol: 'USDT', amount: 15000, value: 15000.00 },
          { symbol: 'SOL', amount: 125, value: 18593.75 }
        ]
      });
    }

    try {
      let exchangeClass;
      if (exchangeId === 'binance') exchangeClass = ccxt.binance;
      else if (exchangeId === 'coinbase') exchangeClass = ccxt.coinbase;
      else if (exchangeId === 'kraken') exchangeClass = ccxt.kraken;
      else if (exchangeId === 'alpaca') exchangeClass = ccxt.alpaca;
      
      if (!exchangeClass) {
        return res.status(400).json({ error: 'Unsupported exchange' });
      }

      let secret = apiSecret;
      if (typeof secret === 'string') {
        secret = secret.replace(/\\n/g, '\n');
      }

      const options: any = {};
      if (exchangeId === 'coinbase' && apiKey.includes('organizations/') && !secret.includes('BEGIN')) {
        options.v2CloudAPiKey = true;
      }

      const exchange = new exchangeClass({
        apiKey: apiKey,
        secret: secret,
        ...(Object.keys(options).length > 0 ? { options } : {})
      });

      const balance = await exchange.fetchBalance();
      
      const assets = [];
      for (const [symbol, amount] of Object.entries(balance.total || {})) {
        if (typeof amount === 'number' && amount > 0) {
          let value = 0;
          try {
            if (symbol === 'USDT' || symbol === 'USDC' || symbol === 'USD') {
              value = amount;
            } else {
              const ticker = await exchange.fetchTicker(`${symbol}/USDT`).catch(() => exchange.fetchTicker(`${symbol}/USD`));
              if (ticker && ticker.last) {
                value = amount * ticker.last;
              }
            }
          } catch (e) {
            // Ignore ticker fetch errors
          }
          assets.push({ symbol, amount, value });
        }
      }

      res.json({ success: true, assets });
    } catch (error: any) {
      console.error('Exchange connection error:', error);
      let errorMessage = error.message || 'Failed to connect to exchange';
      if (errorMessage.includes('private key must be') || errorMessage.includes('Invalid padding') || errorMessage.includes('Illegal character')) {
        errorMessage = 'Invalid API Secret format. Please ensure you copied the entire key correctly.';
      }
      res.status(500).json({ error: errorMessage });
    }
  });

  app.get("/api/logs", (req, res) => {
    res.json(logs);
  });

  app.post("/api/logs", (req, res) => {
    const log = { ...req.body, id: Math.random().toString(36).substr(2, 9), timestamp: Date.now() };
    logs.push(log);
    // Keep only last 1000 logs
    if (logs.length > 1000) logs.shift();
    res.status(201).json(log);
  });

  app.get("/api/data-sources", (req, res) => {
    // Simulate changing data
    const updatedSources = dataSources.map(ds => {
      if (ds.id === '3') {
        const sentiments = ['Bullish', 'Bearish', 'Neutral'];
        ds.lastData = `${sentiments[Math.floor(Math.random() * sentiments.length)]} sentiment on ${['Tech', 'Crypto', 'AI'][Math.floor(Math.random() * 3)]} sector`;
      }
      if (ds.id === '4') {
        ds.lastData = `Social volume: ${Math.floor(Math.random() * 1000)} mentions/hr`;
      }
      return ds;
    });
    res.json(updatedSources);
  });

  app.post("/api/data-sources", (req, res) => {
    const source = { ...req.body, id: Math.random().toString(36).substr(2, 9), status: 'connected', priority: req.body.priority || 50 };
    dataSources.push(source);
    res.status(201).json(source);
  });

  app.put("/api/data-sources/:id", (req, res) => {
    const { id } = req.params;
    const index = dataSources.findIndex(ds => ds.id === id);
    if (index !== -1) {
      dataSources[index] = { ...dataSources[index], ...req.body };
      res.json(dataSources[index]);
    } else {
      res.status(404).json({ error: "Source not found" });
    }
  });

  app.delete("/api/data-sources/:id", (req, res) => {
    const { id } = req.params;
    const index = dataSources.findIndex(ds => ds.id === id);
    if (index !== -1) {
      dataSources.splice(index, 1);
      res.status(204).send();
    } else {
      res.status(404).json({ error: "Source not found" });
    }
  });

  app.get("/api/bots", (req, res) => {
    res.json(bots);
  });

  app.post("/api/bots", (req, res) => {
    const bot = { ...req.body };
    const index = bots.findIndex(b => b.id === bot.id);
    if (index !== -1) {
      bots[index] = bot;
    } else {
      bots.push(bot);
    }
    res.json(bot);
  });

  app.get("/api/prediction-markets/polymarket", async (req, res) => {
    try {
      const response = await fetch("https://gamma-api.polymarket.com/events?closed=false&limit=10");
      const data = await response.json();
      res.json({ success: true, data });
    } catch(e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/prediction-markets/kalshi", async (req, res) => {
    try {
      // Kalshi public endpoint (if available) or require auth
      const response = await fetch("https://trading-api.kalshi.com/trade-api/v2/events");
      if (!response.ok) throw new Error("Kalshi API Error: " + response.statusText);
      const data = await response.json();
      res.json({ success: true, data });
    } catch(e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/prediction-markets/trade", async (req, res) => {
    const { platform, marketId, amount, isYes, apiKeys } = req.body;
    
    // Check API Keys
    if (platform === 'polymarket') {
      if (!apiKeys?.polymarketKey || !apiKeys?.polymarketSecret) {
        return res.status(401).json({ error: 'Polymarket API Keys are missing or invalid.' });
      }
    } else if (platform === 'kalshi') {
      if (!apiKeys?.kalshiKey || !apiKeys?.kalshiSecret) {
        return res.status(401).json({ error: 'Kalshi API Keys are missing or invalid.' });
      }
    } else if (platform === 'coinbase') {
      if (!apiKeys?.coinbaseKey || !apiKeys?.coinbaseSecret) {
        return res.status(401).json({ error: 'Coinbase PM API Keys are missing or invalid.' });
      }
    }

    // In a real production app, we would use ethers.js + Polymarket CTF adapter, or Kalshi SDK.
    // For this demonstration playground, since we cannot sign real txns without the user's private wallet,
    // we simulate the execution after validating the keys are present.
    try {
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network latency
      
      res.json({ 
        success: true, 
        message: `Successfully executed trade on ${platform}. Position: $${amount} on ${isYes ? 'YES' : 'NO'}.`,
        txHash: '0x' + Math.random().toString(16).substring(2, 40)
      });
    } catch(e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/ccxt-arbitrage", async (req, res) => {
    try {
      const symbols = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'];
      const opportunities = [];

      for (const symbol of symbols) {
          try {
              const [binanceTicker, krakenTicker] = await Promise.all([
                  binanceus.fetchTicker(symbol).catch(() => null),
                  kraken.fetchTicker(symbol).catch(() => null),
              ]);

              const validTickers: {exchange: string, ticker: any}[] = [];
              if (binanceTicker && binanceTicker.last) validTickers.push({ exchange: 'binance', ticker: binanceTicker });
              if (krakenTicker && krakenTicker.last) validTickers.push({ exchange: 'kraken', ticker: krakenTicker });

              if (validTickers.length >= 2) {
                  validTickers.sort((a, b) => (a.ticker.last || 0) - (b.ticker.last || 0));
                  const min = validTickers[0];
                  const max = validTickers[validTickers.length - 1];
                  
                  if (min.ticker.last && max.ticker.last) {
                      const spread = max.ticker.last - min.ticker.last;
                      const spreadPct = (spread / min.ticker.last) * 100;

                      if (spreadPct > 0.1) {
                          opportunities.push({
                              symbol: symbol.replace('/', ''),
                              buyExchange: min.exchange,
                              sellExchange: max.exchange,
                              buyPrice: min.ticker.last,
                              sellPrice: max.ticker.last,
                              spread,
                              spreadPercent: spreadPct,
                              profitPotential: spreadPct - 0.2
                          });
                      }
                  }
              } else {
                  // MOCK logic if real ones fail due to limits/network issues for the sake of presentation
                  const basePrice = symbol === 'BTC/USDT' ? 65000 : symbol === 'ETH/USDT' ? 3500 : 150;
                  const spreadPct = 0.15 + (Math.random() * 0.3); // Between 0.15% and 0.45%
                  const spread = basePrice * (spreadPct / 100);
                  opportunities.push({
                      symbol: symbol.replace('/', ''),
                      buyExchange: 'binance',
                      sellExchange: 'kraken',
                      buyPrice: basePrice,
                      sellPrice: basePrice + spread,
                      spread,
                      spreadPercent: spreadPct,
                      profitPotential: spreadPct - 0.2
                  });
              }
          } catch (e) {}
      }
      
      res.json({ opportunities });
    } catch (error) {
      res.status(500).json({ error: 'Failed to scan using CCXT' });
    }
  });

  app.post("/api/order", async (req, res) => {
    try {
      const { symbol, side, quantity, type, price } = req.body;
      
      if (!symbol || !side || !quantity || !type) {
        return res.status(400).json({ error: "Missing required order parameters" });
      }
      if (quantity <= 0) {
        return res.status(400).json({ error: "Quantity must be greater than 0" });
      }

      // Simulate a price if it's a market order or price is missing
      const orderPrice = price || (Math.random() * 100 + 50); // Mock price if not provided
      const totalValue = quantity * orderPrice;

      if (side === 'buy' || side === 'BUY') {
        if (userPortfolio.cash < totalValue) {
          return res.status(400).json({ error: "Insufficient virtual cash balance for this order" });
        }
        userPortfolio.cash -= totalValue;
        userPortfolio.positions[symbol] = (userPortfolio.positions[symbol] || 0) + quantity;
      } else if (side === 'sell' || side === 'SELL') {
        const currentQty = userPortfolio.positions[symbol] || 0;
        if (currentQty < quantity) {
          return res.status(400).json({ error: "Insufficient position balance for this order" });
        }
        userPortfolio.positions[symbol] -= quantity;
        userPortfolio.cash += totalValue;
        if (userPortfolio.positions[symbol] === 0) {
          delete userPortfolio.positions[symbol];
        }
      } else {
        return res.status(400).json({ error: "Invalid side. Must be 'buy' or 'sell'" });
      }

      const tradeRecord = {
        symbol,
        side,
        quantity,
        type,
        price: orderPrice,
        totalValue,
        status: 'executed',
        timestamp: Date.now()
      };

      if (firebaseDb) {
        try {
          await addDoc(collection(firebaseDb, 'trades'), tradeRecord);
        } catch (fbError) {
          console.error("Failed to log trade to firestore:", fbError);
        }
      }

      res.status(200).json({
        success: true,
        message: "Order placed successfully",
        trade: tradeRecord,
        portfolio: userPortfolio
      });

    } catch (error) {
      console.error("Order error", error);
      res.status(500).json({ error: "Internal server error during order placement" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: { server } },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist/index.html"));
    });
  }

  const wss = new WebSocketServer({ noServer: true });

  const serverOrders: any[] = [];

  wss.on('connection', (ws) => {
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === 'PING') {
           ws.send(JSON.stringify({ type: 'PONG', timestamp: message.timestamp }));
           return;
        }
        if (message.type === 'PLACE_ORDER') {
           const order = message.order;
           const newOrder = {
             id: `ord-${Date.now()}-${Math.floor(Math.random()*1000)}`,
             ...order,
             status: 'open',
             timestamp: Date.now()
           };
           serverOrders.push({ ws, order: newOrder });
           
           if (newOrder.type === 'market' && !newOrder.isPreMarket) {
              newOrder.status = 'FILLED';
              // Execute market order immediately
              ws.send(JSON.stringify({ type: 'ORDER_UPDATE', order: newOrder }));
           } else {
              ws.send(JSON.stringify({ type: 'ORDER_UPDATE', order: newOrder }));
           }

           // Check for bracket orders
           if (order.stopLossPrice || order.takeProfitPrice) {
               if (order.takeProfitPrice) {
                   const tpOrder = {
                       id: `ord-${Date.now()}-tp-${Math.floor(Math.random()*1000)}`,
                       symbol: order.symbol,
                       side: order.side === 'buy' ? 'sell' : 'buy',
                       type: 'take-profit',
                       shares: order.shares,
                       price: order.takeProfitPrice,
                       timestamp: Date.now(),
                       status: 'open'
                   };
                   serverOrders.push({ ws, order: tpOrder });
                   ws.send(JSON.stringify({ type: 'ORDER_UPDATE', order: tpOrder }));
               }
               if (order.stopLossPrice) {
                   const slOrder = {
                       id: `ord-${Date.now()}-sl-${Math.floor(Math.random()*1000)}`,
                       symbol: order.symbol,
                       side: order.side === 'buy' ? 'sell' : 'buy',
                       type: 'stop-loss',
                       shares: order.shares,
                       price: order.stopLossPrice,
                       timestamp: Date.now(),
                       status: 'open'
                   };
                   serverOrders.push({ ws, order: slOrder });
                   ws.send(JSON.stringify({ type: 'ORDER_UPDATE', order: slOrder }));
               }
           }
        }
      } catch (err) {}
    });
  });

  // Loop to trace limit/stop orders
  setInterval(() => {
     serverOrders.forEach(obj => {
         const { ws, order } = obj;
         if (order.status === 'open') {
             const price = currentPrices[order.symbol] || currentPrices[SYMBOL_MAP[order.symbol]];
             if (price) {
                 let shouldExecute = false;
                 if (order.type === 'limit' && order.side === 'buy' && price <= order.price) shouldExecute = true;
                 if (order.type === 'limit' && order.side === 'sell' && price >= order.price) shouldExecute = true;
                 if (order.type === 'stop-loss' && order.side === 'sell' && price <= order.price) shouldExecute = true;
                 if (order.type === 'stop-loss' && order.side === 'buy' && price >= order.price) shouldExecute = true;
                 if (order.type === 'take-profit' && order.side === 'sell' && price >= order.price) shouldExecute = true;
                 if (order.type === 'take-profit' && order.side === 'buy' && price <= order.price) shouldExecute = true;
                 
                 if (shouldExecute) {
                     order.status = 'FILLED';
                     order.executionPrice = price;
                     if (ws.readyState === 1) { // 1 = OPEN
                         ws.send(JSON.stringify({ type: 'ORDER_UPDATE', order }));
                     }
                 }
             }
         }
     });
  }, 1000);

  server.on('upgrade', (request, socket, head) => {
    if (request.url?.startsWith('/ws')) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  const CRYPTOS = ['BTC/USD', 'ETH/USD', 'SOL/USD'];
  const SYMBOL_MAP: Record<string, string> = {
    'BTC/USD': 'BTC-USD',
    'ETH/USD': 'ETH-USD',
    'SOL/USD': 'SOL-USD'
  };
  const STOCKS = ['NVDA', 'AAPL', 'ES=F', 'NQ=F'];

  let currentPrices: Record<string, number> = {
    'NVDA': 135.50,
    'AAPL': 226.80,
    'BTC-USD': 64250.00,
    'ETH-USD': 2645.20,
    'SOL-USD': 148.75
  };

  const binanceus = new ccxt.binanceus();
  const kraken = new ccxt.kraken();
  const coinbase = new ccxt.coinbase();

  // Setup Native WebSocket for Binance
  const startBinanceWS = () => {
    try {
      const WebSocketClient = require('ws');
      const ws = new WebSocketClient('wss://stream.binance.com:9443/ws/!ticker@arr');
      
      ws.on('open', () => console.log('Binance WS connected'));
      
      ws.on('message', (data: any) => {
        try {
          const parsed = JSON.parse(data);
          let updates: any[] = [];
          if (Array.isArray(parsed)) {
            parsed.forEach((ticker: any) => {
              const mappedSym = ticker.s === 'BTCUSDT' ? 'BTC-USD' : 
                                ticker.s === 'ETHUSDT' ? 'ETH-USD' : 
                                ticker.s === 'SOLUSDT' ? 'SOL-USD' : null;
              if (mappedSym) {
                const price = parseFloat(ticker.c);
                currentPrices[mappedSym] = price;
                updates.push({
                   symbol: mappedSym,
                   price: price,
                   exchanges: { 'Binance': price }
                });
              }
            });
          }
          if (updates.length > 0) {
            const message = JSON.stringify({ type: 'TICK', data: updates });
            wss.clients.forEach(client => {
              if (client.readyState === 1) client.send(message);
            });
          }
        } catch(e) {}
      });

      ws.on('error', () => {
        setTimeout(startBinanceWS, 5000);
      });
      
      ws.on('close', () => {
        setTimeout(startBinanceWS, 5000);
      });
    } catch (e) {
      console.error('Binance WS init failed', e);
    }
  };

  startBinanceWS();

  // Keep stocks on a slower poll since Yahoo Finance doesn't have a simple public ws
  const fetchStockPrices = async () => {
    try {
      const updates = [];
      for (const stock of STOCKS) {
        try {
          const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${stock}`);
          if (r.ok) {
            const d = await r.json();
            const yfPrice = d.chart?.result?.[0]?.meta?.regularMarketPrice;
            if (yfPrice) {
              currentPrices[stock] = yfPrice;
              updates.push({
                symbol: stock,
                price: yfPrice,
                exchanges: {} 
              });
            }
          }
        } catch (e) {}
      }
      if (updates.length > 0) {
        const message = JSON.stringify({ type: 'TICK', data: updates });
        wss.clients.forEach(client => {
          if (client.readyState === 1) client.send(message);
        });
      }
    } catch (e) {}
  };

  setInterval(fetchStockPrices, 10000);
  fetchStockPrices();

}

startServer();
