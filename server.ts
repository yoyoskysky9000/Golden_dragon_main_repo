import express from "express";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import path from "path";
import { WebSocketServer } from "ws";
import http from "http";
import ccxt from "ccxt";

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
  ];

  const bots: any[] = [];

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

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: { server } },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist/index.html"));
    });
  }

  const wss = new WebSocketServer({ noServer: true });

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

  const EXCHANGES = ['DragonEx', 'KrakenMock', 'BinanceSim'];
  
  // Keep track of current prices for the simulation
  let currentPrices: Record<string, number> = {
    'NVDA': 135.50,
    'AAPL': 226.80,
    'BTC-USD': 64250.00,
    'ETH-USD': 2645.20,
    'SOL-USD': 148.75
  };

  setInterval(() => {
    const updates = Object.keys(currentPrices).map(symbol => {
      const isCrypto = symbol.includes('USD');
      const volatility = isCrypto ? 0.008 : 0.002;
      const momentum = (Math.random() - 0.5) > 0 ? 0.2 : -0.2;
      const randomComponent = (Math.random() - 0.5 + (momentum * 0.05));
      const change = currentPrices[symbol] * randomComponent * volatility * 3;
      const newPrice = Math.max(0.01, currentPrices[symbol] + change);
      currentPrices[symbol] = newPrice;

      const newExchanges: Record<string, number> = {};
      EXCHANGES.forEach(ex => {
        const drift = 1 + (Math.random() - 0.5) * 0.001;
        newExchanges[ex] = newPrice * drift;
      });

      return {
        symbol,
        price: newPrice,
        exchanges: newExchanges
      };
    });

    const message = JSON.stringify({ type: 'TICK', data: updates });
    wss.clients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(message);
      }
    });
  }, 2000);

}

startServer();
