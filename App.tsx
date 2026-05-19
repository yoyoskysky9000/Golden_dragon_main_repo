
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StockData, PortfolioPosition, AppView, ActiveOrder, TradingBot, CopyTrader, AIAgent, DataSource, AgentTask } from './types';
import { generateInitialData, simulateTick, generateMockTraders } from './services/mockMarket';
import StockChart from './components/StockChart';
import AIAssistant from './components/AIAssistant';
import StockDetailModal from './components/StockDetailModal';
import BotLab from './components/BotLab';
import CopyTradeHub from './components/CopyTradeHub';
import ArbitrageMatrix from './components/ArbitrageMatrix';
import Playground from './components/Playground';
import OracleSpace from './components/OracleSpace';
import ExchangeConnect from './components/ExchangeConnect';
import Backtesting from './components/Backtesting';
import SmartOrderRouter from './components/SmartOrderRouter';
import DataSourcesManager from './components/DataSourcesManager';
import MasterBotView from './components/MasterBotView';
import StrategyExplorer from './components/StrategyExplorer';
import AlphaDeepDive from './components/AlphaDeepDive';
import DeepSearchAI from './components/DeepSearchAI';
import AccountDashboard from './components/AccountDashboard';
import DataMarketplace from './components/DataMarketplace';
import PredictionMarketsLab from './components/PredictionMarketsLab';
import CommandCenterDashboard from './components/CommandCenterDashboard';
import AgentSwarmArchitect from './components/AgentSwarmArchitect';
import AgentTasks from './components/AgentTasks';
import TelegramConnect from './components/TelegramConnect';
import { generateTradingSignal, logSignalToBackend, optimizeStrategy } from './services/geminiService';
import { motion, AnimatePresence } from 'framer-motion';

import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  DollarSign, 
  Wallet, 
  Settings, 
  LayoutDashboard,
  Search,
  Bell,
  Briefcase,
  List,
  Clock,
  XCircle,
  Info,
  BellRing,
  Trash2,
  Power,
  Plus,
  Plug,
  PlugZap,
  AlertTriangle,
  PieChart,
  CheckCircle2,
  AlertCircle,
  Ban,
  Flame,
  Cpu,
  Users,
  Zap,
  Database,
  Sparkles,
  BarChart3,
  History,
  Network,
  BrainCircuit,
  FlaskConical,
  Fingerprint,
  MessageSquare,
  Store,
  Vote,
  ListTodo,
  Send
} from 'lucide-react';

import { SignalLog } from './types';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'alert';
}

interface PendingOrder {
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop-loss' | 'take-profit' | 'bracket';
  shares: number;
  price: number;
  estimatedTotal: number;
}

const DragonLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM11 19.93C7.05 19.44 4 16.08 4 12C4 11.38 4.08 10.79 4.21 10.21L9 15L11 17L11 19.93ZM17.9 17.39C17.64 16.8 16.9 16 16 16H15V13H17V11H13V9H15V7H13V5.07C16.97 5.54 20 8.9 20 13C20 14.67 19.26 16.2 17.9 17.39Z" fill="currentColor"/>
    <path d="M12 2L13.5 6L17 7L13.5 9L12 13L10.5 9L7 7L10.5 6L12 2Z" fill="#FFF" fillOpacity="0.3"/>
  </svg>
);

export const globalNotify = (title: string, message: string, type: 'success' | 'alert' = 'alert') => {
  window.dispatchEvent(new CustomEvent('app-notify', { detail: { title, message, type } }));
};

function App() {
  const [stocks, setStocks] = useState<StockData[]>(() => generateInitialData());
  const [selectedSymbol, setSelectedSymbol] = useState<string>('NVDA');
  const [sidebarTab, setSidebarTab] = useState<'watchlist' | 'holdings' | 'orders' | 'alerts'>('watchlist');
  const [isSimConnected, setIsSimConnected] = useState<boolean>(false);
  const [portfolio, setPortfolio] = useState<PortfolioPosition[]>(() => {
    if (localStorage.getItem('OMNITRADE_SIM_CONNECTED') !== 'true') return [];
    const saved = localStorage.getItem('OMNITRADE_PORTFOLIO');
    return saved ? JSON.parse(saved) : [{ symbol: 'NVDA', shares: 10, avgCost: 135.00 }];
  });
  const [cashBalance, setCashBalance] = useState<number>(() => {
    if (localStorage.getItem('OMNITRADE_SIM_CONNECTED') !== 'true') return 0;
    const saved = localStorage.getItem('OMNITRADE_CASH');
    return saved ? parseFloat(saved) : 50000;
  });
  const [realizedPL, setRealizedPL] = useState<number>(() => {
    if (localStorage.getItem('OMNITRADE_SIM_CONNECTED') !== 'true') return 0;
    const saved = localStorage.getItem('OMNITRADE_REALIZED_PL');
    return saved ? parseFloat(saved) : 0;
  });
  const [activeOrders, setActiveOrders] = useState<ActiveOrder[]>(() => {
    const saved = localStorage.getItem('OMNITRADE_ORDERS');
    return saved ? JSON.parse(saved) : [];
  });
  const [priceAlerts, setPriceAlerts] = useState<{id: string, symbol: string, targetPrice: number, condition: 'above' | 'below', isFired: boolean}[]>(() => {
    const saved = localStorage.getItem('OMNITRADE_PRICE_ALERTS');
    return saved ? JSON.parse(saved) : [];
  });
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false);
  const generateBotHistory = (basePnl: number) => {
    const history = [];
    const now = Date.now();
    let currentPnl = basePnl - 200; // Start lower than current
    let currentTrades = 0;
    for (let i = 0; i < 20; i++) {
      currentPnl += (Math.random() - 0.4) * 50; // Tend upwards
      currentTrades += Math.floor(Math.random() * 5); // Add 0-4 trades
      history.push({ timestamp: now - (20 - i) * 3600000, pnl: currentPnl, trades: currentTrades });
    }
    return history;
  };

  const [agents, setAgents] = useState<AIAgent[]>([
    {
      id: 'agent_master_0',
      name: 'OmniTrade Master',
      role: 'Master Strategist',
      model: 'gemini-3.1-pro-preview',
      trainingDataSources: [],
      systemPrompt: 'You are the Master Strategist. Oversee all subordinate AI Agents, aggregate their insights, and make the final trade execution calls.',
      parentAgentId: null,
      status: 'ready',
      accuracyScore: 94.5,
      lastTrainedAt: Date.now() - 86400000
    },
    {
      id: 'agent_api_health',
      name: 'API Health Monitor',
      role: 'Data Engineer',
      model: 'gemini-3.1-flash',
      trainingDataSources: [{ id: '8', priority: 99 }],
      systemPrompt: 'You monitor the status of all active API feeds and report any disconnections or errors to the Master Allocator AI.',
      parentAgentId: 'agent_master_0',
      status: 'ready',
      accuracyScore: 98.0,
      lastTrainedAt: Date.now() - 3600000
    },
    {
      id: 'agent_quant_dev',
      name: 'Quantitative Modeler Alpha',
      role: 'Quant Developer',
      model: 'gemini-3.1-pro-preview',
      trainingDataSources: [{ id: '3', priority: 80 }],
      systemPrompt: 'You are the Quant Developer. Develop and maintain statistical arbitrage models based on incoming news sentiment.',
      parentAgentId: 'agent_master_0',
      status: 'ready',
      accuracyScore: 92.1,
      lastTrainedAt: Date.now() - 7200000
    }
  ]);

  const [tasks, setTasks] = useState<AgentTask[]>([
    {
      id: 'task_1',
      title: 'Analyze Coinbase Earnings',
      description: 'Review the latest Q3 earnings report from Coinbase and adjust quant models accordingly.',
      assignedAgentId: 'agent_quant_dev',
      deadline: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      status: 'todo',
      createdAt: Date.now()
    },
    {
      id: 'task_2',
      title: 'Analyze Market Sentiment',
      description: 'Aggregate social media and news feeds to score overall market sentiment.',
      assignedAgentId: 'agent_master_0',
      deadline: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
      status: 'todo',
      createdAt: Date.now(),
      dataSources: [{ id: 'ds_crypto_market_data', priority: 100 }]
    }
  ]);

  const [bots, setBots] = useState<TradingBot[]>(() => {
    const saved = localStorage.getItem('OMNITRADE_BOTS');
    if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.length > 0) return parsed;
    }
    return [
      {
        id: 'bot-binance-1',
        name: 'Binance Omni-Tasker',
        symbol: 'BTC',
        exchange: 'Binance',
        type: 'multi-agent-swarm',
        status: 'active',
        pnl: 1250.50,
        pnlPercent: 12.5,
        trades: 142,
        strategy: { indicator: 'AI Signal', condition: 'EQ', value: 'buy', action: 'buy' },
        aiDescription: 'Universal bot capable of executing any task on Binance, from spot trading to futures arbitrage.',
        isLive: true,
        autoMode: true,
        autoOptimize: true,
        dataSources: [{ id: '1', priority: 100 }],
        performanceHistory: generateBotHistory(1250.5)
      },
      {
        id: 'bot-coinbase-1',
        name: 'Coinbase Omni-Tasker',
        symbol: 'ETH',
        exchange: 'Coinbase',
        type: 'ai_adaptive',
        status: 'paused',
        pnl: 450.20,
        pnlPercent: 4.5,
        trades: 38,
        strategy: { indicator: 'RSI', condition: 'LT', value: '30', action: 'buy' },
        aiDescription: 'Universal bot capable of executing any task on Coinbase, optimizing for low fees and deep liquidity.',
        isLive: false,
        autoMode: true,
        autoOptimize: false,
        dataSources: [{ id: '1', priority: 100 }],
        performanceHistory: generateBotHistory(450.2)
      },
      {
        id: 'bot-kraken-1',
        name: 'Kraken Omni-Tasker',
        symbol: 'SOL',
        exchange: 'Kraken',
        type: 'momentum',
        status: 'active',
        pnl: 890.75,
        pnlPercent: 8.9,
        trades: 87,
        strategy: { indicator: 'MACD', condition: 'GT', value: '0', action: 'buy' },
        aiDescription: 'Universal bot capable of executing any task on Kraken, including margin trading and staking.',
        isLive: true,
        autoMode: true,
        autoOptimize: false,
        dataSources: [{ id: '1', priority: 100 }],
        performanceHistory: generateBotHistory(890.75)
      },
      {
        id: 'bot-alpaca-1',
        name: 'Alpaca Omni-Tasker',
        symbol: 'SPY',
        exchange: 'Alpaca',
        type: 'mean_reversion',
        status: 'paused',
        pnl: -120.40,
        pnlPercent: -1.2,
        trades: 15,
        strategy: { indicator: 'Bollinger Bands', condition: 'LT', value: 'Lower Band', action: 'buy' },
        aiDescription: 'Universal bot capable of executing any task on Alpaca, managing equities and options portfolios.',
        isLive: false,
        autoMode: false,
        dataSources: [{ id: '1', priority: 100 }],
        performanceHistory: generateBotHistory(-120.4)
      },
      {
        id: 'bot-polymarket-1',
        name: 'Polymarket Omni-Tasker',
        symbol: 'ELECTION_24',
        exchange: 'Polymarket',
        type: 'custom',
        status: 'active',
        pnl: 340.00,
        pnlPercent: 34.0,
        trades: 56,
        strategy: { indicator: 'Sentiment', condition: 'GT', value: '70', action: 'buy' },
        aiDescription: 'Universal bot capable of executing any task on Polymarket, from liquidity provision to event arbitrage.',
        isLive: true,
        autoMode: true,
        dataSources: [{ id: '1', priority: 100 }],
        performanceHistory: generateBotHistory(340)
      },
      {
        id: 'bot-kalshi-1',
        name: 'Kalshi Omni-Tasker',
        symbol: 'FED_RATE',
        exchange: 'Kalshi',
        type: 'ai_adaptive',
        status: 'learning',
        pnl: 0,
        pnlPercent: 0,
        trades: 0,
        strategy: { indicator: 'News', condition: 'EQ', value: 'Hawkish', action: 'sell' },
        aiDescription: 'Universal bot capable of executing any task on Kalshi, analyzing economic data releases in real-time.',
        isLive: false,
        autoMode: true,
        dataSources: [{ id: '1', priority: 100 }],
        performanceHistory: generateBotHistory(0)
      },
      {
        id: 'bot-prediction-market',
        name: 'Prediction Market Bot',
        symbol: 'ELECTION_24',
        exchange: 'Polymarket',
        type: 'ai_adaptive',
        status: 'active',
        pnl: 560.20,
        pnlPercent: 15.4,
        trades: 112,
        strategy: { indicator: 'News Sentiment', condition: 'GT', value: '80', action: 'buy' },
        aiDescription: 'Scours news outlets and predictive markets to find arbitrage opportunities in political and cultural events.',
        isLive: true,
        autoMode: true,
        dataSources: [{ id: '1', priority: 100 }],
        performanceHistory: generateBotHistory(560.2)
      },
      {
        id: 'bot-lip-reader',
        name: 'Lip Reading Live Bot',
        symbol: 'ALL',
        exchange: 'Alpaca',
        type: 'ai_adaptive',
        status: 'learning',
        pnl: 45.00,
        pnlPercent: 2.1,
        trades: 9,
        strategy: { indicator: 'Video Feed', condition: 'EQ', value: 'Key Phrase Detected', action: 'buy' },
        aiDescription: 'Uses vision AI to read lips on live video feeds of executives and lawmakers, front-running audio broadcast delays.',
        isLive: false,
        autoMode: false,
        dataSources: [{ id: '1', priority: 100 }],
        performanceHistory: generateBotHistory(45.0)
      },
      {
        id: 'bot-speech-pattern',
        name: 'Speech Pattern Oracle',
        symbol: 'ALL',
        exchange: 'Binance',
        type: 'custom',
        status: 'active',
        pnl: 890.00,
        pnlPercent: 24.5,
        trades: 432,
        strategy: { indicator: 'Audio Feed', condition: 'EQ', value: 'Precursor Words', action: 'sell' },
        aiDescription: 'Deep search on speech patterns and commonly used precursor words by executives to predict forward guidance sentiment.',
        isLive: true,
        autoMode: true,
        dataSources: [{ id: '1', priority: 100 }],
        performanceHistory: generateBotHistory(890.0)
      },
      {
        id: 'bot-tech-sentiment-agg',
        name: 'Tech Sentiment Aggressive',
        symbol: 'NVDA',
        exchange: 'Alpaca',
        type: 'ai_adaptive',
        status: 'active',
        pnl: 1045.50,
        pnlPercent: 28.5,
        trades: 312,
        strategy: { 
          indicator: 'News Sentiment', 
          condition: 'GT', 
          value: 'Spike', 
          action: 'buy', 
          additionalRules: [
            { indicator: 'Social Media Feed', condition: 'LT', value: 'Drop', action: 'sell' },
            { indicator: 'MACD Crossover', condition: 'GT', value: '0', action: 'buy' }
          ] 
        },
        aiDescription: 'Monitors news sentiment related to tech stocks. Buys on positive sentiment spikes and sells on negative sentiment drops, with aggressive risk parameters. Uses MACD Crossover confirmation.',
        isLive: true,
        autoMode: true,
        dataSources: [{ id: '3', priority: 100 }, { id: '4', priority: 100 }],
        performanceHistory: generateBotHistory(1045.5)
      }
    ];
  });
  const [copyTraders, setCopyTraders] = useState<CopyTrader[]>(() => {
    const saved = localStorage.getItem('OMNITRADE_COPY_TRADERS');
    return saved ? JSON.parse(saved) : generateMockTraders();
  });
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeView, setActiveView] = useState<AppView>(AppView.DATA_SOURCES);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);
  const [modalStock, setModalStock] = useState<StockData | null>(null);
  const [tradeShares, setTradeShares] = useState<string>('1');
  const [orderType, setOrderType] = useState<'market' | 'limit' | 'stop-loss'>('market');
  const [orderPrice, setOrderPrice] = useState<string>('');
  const [pendingOrder, setPendingOrder] = useState<PendingOrder | null>(null);
  const [aiInitialMessage, setAiInitialMessage] = useState<string>('');
  const [botToOptimize, setBotToOptimize] = useState<TradingBot | null>(null);
  const [manualConfirmationOrder, setManualConfirmationOrder] = useState<PendingOrder & { isLive?: boolean, originalOrder?: any } | null>(null);

  // Hypothetical fetch API for selected stock details

  const fetchStockData = async (symbol: string): Promise<StockData | undefined> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const stock = stocks.find(s => s.symbol === symbol);
        if (stock) {
          resolve({
            ...stock,
            marketCap: stock.assetType === 'crypto' ? "$850B" : (stock.assetType === 'option' || stock.assetType === 'future' ? "N/A" : "$2.4T"),
            peRatio: stock.assetType === 'crypto' || stock.assetType === 'option' || stock.assetType === 'future' ? "N/A" : "35.2",
            dividend: stock.assetType === 'crypto' || stock.assetType === 'option' || stock.assetType === 'future' ? "N/A" : "1.2%",
            fiftyTwoWeekHigh: stock.price * 1.3,
            fiftyTwoWeekLow: stock.price * 0.7,
            about: `${stock.name} is a globally recognized asset with significant market presence and technological backing.`
          });
        } else {
          resolve(undefined);
        }
      }, 600); // 600ms artificial delay
    });
  };

  const addNotification = useCallback((title: string, message: string, type: 'success' | 'alert' = 'alert') => {
      const id = Math.random().toString();
      setNotifications(prev => [...prev, { id, title, message, type }]);
      setTimeout(() => {
          setNotifications(prev => prev.filter(n => n.id !== id));
      }, 5000);
  }, []);

  useEffect(() => {
    const handleGlobalNotify = (e: CustomEvent) => {
      addNotification(e.detail.title, e.detail.message, e.detail.type);
    };
    window.addEventListener('app-notify', handleGlobalNotify as EventListener);
    return () => window.removeEventListener('app-notify', handleGlobalNotify as EventListener);
  }, [addNotification]);

  const previousBotStatuses = useRef<Record<string, string>>({});

  useEffect(() => {
    bots.forEach(bot => {
      const prevStatus = previousBotStatuses.current[bot.id];
      if (bot.status === 'error' && prevStatus !== 'error') {
        // When going from any state (or initial state) to 'error'
        if (prevStatus !== undefined) {
          addNotification(
            'Bot Alert',
            `Bot ${bot.name} encountered an error: ${bot.errorMessage || 'Unknown error'}`,
            'alert'
          );
        } else {
           // Optionally, if we don't want to alert on initial load if it's already an error:
           // do nothing, but set the previous status.
        }
      }
      previousBotStatuses.current[bot.id] = bot.status;
    });
  }, [bots, addNotification]);

  const handleOpenDetails = async (symbol: string) => {
    // Show a loading state if we had a loading spinner, but we can just set it straight away or use placeholder
    const detailedStock = await fetchStockData(symbol);
    if (detailedStock) {
        setModalStock(detailedStock);
        setIsDetailModalOpen(true);
    }
  };

  const effectiveDataSources = React.useMemo(() => {
    const resolveStatus = (ds: DataSource, visited = new Set<string>()): DataSource['status'] => {
      if (visited.has(ds.id)) return ds.status; // prevent infinite loops
      visited.add(ds.id);
      
      let currentStatus = ds.status;
      if (currentStatus === 'error' || currentStatus === 'disconnected') return currentStatus;

      if (ds.dependencies && ds.dependencies.length > 0) {
        for (const depId of ds.dependencies) {
          const dep = dataSources.find(s => s.id === depId);
          if (dep) {
             const depStatus = resolveStatus(dep, visited);
             if (depStatus === 'error') currentStatus = 'error';
             else if (depStatus === 'disconnected' && currentStatus !== 'error') currentStatus = 'disconnected';
          }
        }
      }
      return currentStatus;
    };

    return dataSources.map(ds => ({
      ...ds,
      effectiveStatus: resolveStatus(ds)
    }));
  }, [dataSources]);

  const botsRef = useRef(bots);
  const stocksRef = useRef(stocks);
  const dataSourcesRef = useRef(effectiveDataSources);
  const cashBalanceRef = useRef(cashBalance);
  const portfolioRef = useRef(portfolio);
  const isSimConnectedRef = useRef(isSimConnected);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    botsRef.current = bots;
    stocksRef.current = stocks;
    dataSourcesRef.current = effectiveDataSources;
    cashBalanceRef.current = cashBalance;
    portfolioRef.current = portfolio;
    isSimConnectedRef.current = isSimConnected;
  }, [bots, stocks, effectiveDataSources, cashBalance, portfolio, isSimConnected]);

  useEffect(() => {
    if (isSimConnected) {
      localStorage.setItem('OMNITRADE_PORTFOLIO', JSON.stringify(portfolio));
      localStorage.setItem('OMNITRADE_CASH', cashBalance.toString());
      localStorage.setItem('OMNITRADE_REALIZED_PL', realizedPL.toString());
    }
    localStorage.setItem('OMNITRADE_SIM_CONNECTED', isSimConnected.toString());
    localStorage.setItem('OMNITRADE_ORDERS', JSON.stringify(activeOrders));
    localStorage.setItem('OMNITRADE_BOTS', JSON.stringify(bots));
    localStorage.setItem('OMNITRADE_COPY_TRADERS', JSON.stringify(copyTraders));
    localStorage.setItem('OMNITRADE_PRICE_ALERTS', JSON.stringify(priceAlerts));
  }, [portfolio, cashBalance, realizedPL, activeOrders, isSimConnected, bots, copyTraders, priceAlerts]);

  useEffect(() => {
    if (priceAlerts.length === 0) return;
    
    let updatedAlerts = false;
    const newAlerts = priceAlerts.map(alert => {
      if (alert.isFired) return alert;
      
      const stock = stocks.find(s => s.symbol === alert.symbol);
      if (!stock) return alert;
      
      if (alert.condition === 'above' && stock.price >= alert.targetPrice) {
        addNotification("Price Alert", `${stock.symbol} is above ${formatMoney(alert.targetPrice)}. Current: ${formatMoney(stock.price)}`, 'success');
        updatedAlerts = true;
        return { ...alert, isFired: true };
      }
      
      if (alert.condition === 'below' && stock.price <= alert.targetPrice) {
        addNotification("Price Alert", `${stock.symbol} is below ${formatMoney(alert.targetPrice)}. Current: ${formatMoney(stock.price)}`, 'success');
        updatedAlerts = true;
        return { ...alert, isFired: true };
      }
      
      return alert;
    });
    
    if (updatedAlerts) {
      setPriceAlerts(newAlerts);
    }
  }, [stocks, priceAlerts, addNotification]);

  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimeout: ReturnType<typeof setTimeout>;
    let currentBackoff = 1000;
    const MAX_BACKOFF = 30000;
    let isConnected = false;
    let isClosing = false; // Prevent logic when explicitly closing on unmount

    const connect = () => {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//${window.location.host}/ws`;
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isConnected && currentBackoff > 1000) {
          addNotification('Connection Restored', 'Successfully reconnected to live data feed.', 'success');
        }
        isConnected = true;
        currentBackoff = 1000; // reset
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'TICK' && message.data) {
            setStocks(currentStocks => simulateTick(currentStocks, message.data));
          } else if (message.type === 'ORDER_UPDATE' && message.order) {
            const updatedOrder = message.order;
            
            setActiveOrders(prev => {
                const existing = prev.find(o => o.id === updatedOrder.id);
                if (existing) {
                    return prev.map(o => o.id === updatedOrder.id ? updatedOrder : o);
                }
                return [...prev, updatedOrder];
            });

            if (updatedOrder.status === 'FILLED') {
              const totalCost = updatedOrder.shares * updatedOrder.executionPrice;
              if (updatedOrder.side === 'buy') {
                  // Assuming cash was reserved, but wait, market orders don't reserve cash beforehand in our updated logic.
                  setCashBalance(prev => prev - totalCost);
                  setPortfolio(prev => {
                      const existing = prev.find(p => p.symbol === updatedOrder.symbol);
                      if (existing) {
                          return prev.map(p => p.symbol === updatedOrder.symbol ? {
                              ...p,
                              shares: p.shares + updatedOrder.shares,
                              avgCost: ((p.shares * p.avgCost) + totalCost) / (p.shares + updatedOrder.shares)
                          } : p);
                      }
                      return [...prev, { symbol: updatedOrder.symbol, shares: updatedOrder.shares, avgCost: updatedOrder.executionPrice }];
                  });
              } else {
                  setCashBalance(prev => prev + totalCost);
                  setPortfolio(prev => {
                      const existing = prev.find(p => p.symbol === updatedOrder.symbol);
                      if (existing) {
                          const realized = (updatedOrder.executionPrice - existing.avgCost) * updatedOrder.shares;
                          setRealizedPL(prevPL => prevPL + realized);
                          if (existing.shares <= updatedOrder.shares) {
                              return prev.filter(p => p.symbol !== updatedOrder.symbol);
                          }
                          return prev.map(p => p.symbol === updatedOrder.symbol ? {
                              ...p,
                              shares: p.shares - updatedOrder.shares
                          } : p);
                      }
                      return prev;
                  });
              }
              const mode = updatedOrder.isLive ? 'LIVE' : 'PAPER';
              addNotification(`${mode} Order Executed`, `Successfully ${updatedOrder.side === 'buy' ? 'bought' : 'sold'} ${updatedOrder.shares} ${updatedOrder.symbol} at ${formatMoney(updatedOrder.executionPrice)}.`, 'success');
            }
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message', err);
        }
      };

      ws.onerror = (error) => {
         console.error('WebSocket encountered an error:', error);
      };

      ws.onclose = () => {
        if (isClosing) return;
        
        if (isConnected) {
          addNotification('Connection Lost', 'Live data feed disconnected. Attempting to reconnect...', 'alert');
          isConnected = false;
        }
        
        // Auto-reconnect with exponential backoff
        clearTimeout(reconnectTimeout);
        reconnectTimeout = setTimeout(() => {
          currentBackoff = Math.min(currentBackoff * 1.5, MAX_BACKOFF);
          connect();
        }, currentBackoff);
      };
    };

    connect();

    return () => {
      isClosing = true;
      clearTimeout(reconnectTimeout);
      if (ws) {
        ws.close();
      }
    };
  }, [addNotification]);

  useEffect(() => {
    const fetchSources = async (retries = 3) => {
      try {
        const res = await fetch(window.location.origin + '/api/data-sources');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        if (!text) return;
        const data = JSON.parse(text);
        setDataSources(data);
      } catch (e: any) {
        // Suppress network errors in console if it's just a background refresh to avoid noise
        if (retries > 0) {
          setTimeout(() => fetchSources(retries - 1), 2000);
        }
      }
    };
    fetchSources();
    const interval = setInterval(() => fetchSources(0), 10000); // Refresh every 10 seconds, no retries for background refresh
    return () => clearInterval(interval);
  }, []);

  // Agent monitor loop for data source dependencies
  useEffect(() => {
    const newsDataSource = effectiveDataSources.find(ds => ds.id === '3');
    
    setAgents(prev => {
      let changed = false;
      const newAgents = prev.map(agent => {
        if (agent.role === 'Quant Developer' && agent.trainingDataSources.some(ds => ds.id === '3')) {
          if (newsDataSource && newsDataSource.effectiveStatus === 'error' && agent.status !== 'error' && agent.status !== 'paused') {
            changed = true;
            return { ...agent, status: 'paused' as const };
          } else if (newsDataSource && newsDataSource.effectiveStatus === 'connected' && agent.status === 'paused') {
            changed = true;
            return { ...agent, status: 'ready' as const };
          }
        }
        return agent;
      });
      return changed ? newAgents : prev;
    });
  }, [effectiveDataSources]);

  // Auto-AI Trading Loop
  useEffect(() => {
    const autoLoop = setInterval(async () => {
      const currentBots = botsRef.current;
      const currentStocks = stocksRef.current;
      const currentSources = dataSourcesRef.current;
      const currentCash = cashBalanceRef.current;
      const currentPortfolio = portfolioRef.current;

      const activeAutoBots = currentBots.filter(b => b.status === 'active' && b.autoMode);
      for (const bot of activeAutoBots) {
        const stock = currentStocks.find(s => s.symbol === bot.symbol);
        if (stock) {
          // Filter data sources based on bot's selection, prioritize them, and ensure they are connected
          const selectedSources = currentSources
            .filter(ds => ds.effectiveStatus === 'connected')
            .filter(ds => bot.dataSources.some(s => s.id === ds.id))
            .map(ds => {
               const botConfig = bot.dataSources.find(s => s.id === ds.id);
               return {
                 ...ds,
                 priority: botConfig?.priority ?? ds.priority
               };
            })
            .sort((a, b) => b.priority - a.priority);
          try {
            const signal = await generateTradingSignal(bot, stock, selectedSources);
            if (signal) {
              await logSignalToBackend(signal);
              if (signal.signal !== 'neutral') {
                // Execute trade if confidence is high enough
                if (signal.confidence > 75) {
                  
                  // Dynamic Kelly Criterion Sizing
                  // f* = p - (q / b)
                  // p = probability of winning (confidence / 100)
                  // q = probability of losing (1 - p)
                  // b = proportion of the bet gained with a win (assume 1:1 risk/reward for simplicity here, so b = 1)
                  const p = signal.confidence / 100;
                  const q = 1 - p;
                  const b = 1; // Assuming 1:1 risk/reward
                  let kellyFraction = p - (q / b);
                  
                  // Apply a "Half-Kelly" for safer risk management
                  kellyFraction = Math.max(0, kellyFraction / 2);
                  
                  // Cap maximum allocation to 10% of total equity to prevent ruin
                  kellyFraction = Math.min(kellyFraction, 0.10);
                  
                  const totalEquity = cashBalance + portfolio.reduce((acc, pos) => {
                    const s = stocks.find(st => st.symbol === pos.symbol);
                    return acc + (s ? s.price * pos.shares : 0);
                  }, 0);

                  const targetInvestment = totalEquity * kellyFraction;
                  const sharesToTrade = Math.max(1, Math.floor(targetInvestment / signal.price));

                  handlePlaceOrder({
                    symbol: signal.symbol,
                    side: signal.signal === 'buy' ? 'buy' : 'sell',
                    type: 'market',
                    shares: sharesToTrade,
                    price: signal.price,
                    isLive: bot.isLive
                  });
                  
                  addNotification("Kelly Criterion Sizing", `Allocating ${(kellyFraction * 100).toFixed(1)}% of equity based on ${signal.confidence}% confidence.`, 'success');
                }
              }
            }
          } catch (err) {
            console.error("Auto-trading signal generation failed:", err);
            setBots(currentBots => currentBots.map(b => {
               if (b.id !== bot.id) return b;
               return {
                 ...b,
                 status: 'error',
                 errorMessage: err instanceof Error ? err.message : 'Error generating signal'
               };
            }));
            addNotification("Bot Error", `${bot.name} encountered an error during signal generation.`, 'alert');
          }
        }
      }
    }, 15000); // Check every 15 seconds
    return () => clearInterval(autoLoop);
  }, []);

  // Bot PnL Simulation Loop
  useEffect(() => {
    const pnlLoop = setInterval(() => {
      setBots(currentBots => currentBots.map(bot => {
        if (bot.status !== 'active') return bot;
        
        // Simulate small PnL changes
        const change = (Math.random() - 0.45) * 5; // Slight positive bias
        const newPnl = bot.pnl + change;
        const tradesIncrement = Math.random() > 0.8 ? 1 : 0;
        const newTrades = bot.trades + tradesIncrement;
        const newHistory = [...(bot.performanceHistory || []), { timestamp: Date.now(), pnl: newPnl, trades: newTrades }];
        
        // Keep history manageable
        if (newHistory.length > 50) newHistory.shift();
        
        return {
          ...bot,
          pnl: newPnl,
          performanceHistory: newHistory,
          trades: newTrades
        };
      }));
    }, 3000);
    return () => clearInterval(pnlLoop);
  }, []);

  // Autonomous Optimization Loop
  useEffect(() => {
    const optimizationLoop = setInterval(async () => {
      const currentBots = botsRef.current;
      const currentStocks = stocksRef.current;

      const activeAutoBots = currentBots.filter(b => b.status === 'active' && b.autoOptimize);
      for (const bot of activeAutoBots) {
        // Only optimize if bot has accumulated at least 5 trades or enough time has passed (1 hour)
        if (bot.trades >= 5 || !bot.lastOptimizedAt || Date.now() - bot.lastOptimizedAt > 3600000) {
          const stock = currentStocks.find(s => s.symbol === bot.symbol);
          if (stock) {
            try {
                const result = await optimizeStrategy(bot, stock, { pnl: bot.pnl, trades: bot.trades });
                if (result && result.suggestions && result.suggestions.length > 0) {
                  const bestSuggestion = result.suggestions.reduce((prev, current) => (prev.score > current.score) ? prev : current);
                  setBots(currentBots => currentBots.map(b => {
                    if (b.id !== bot.id) return b;
                    if (bestSuggestion.score > 70) {
                      return {
                        ...b,
                        strategy: bestSuggestion.strategy,
                        lastOptimizedAt: Date.now(),
                        optimizationScore: bestSuggestion.score,
                        aiDescription: `[Optimized] ${bestSuggestion.reasoning}`
                      };
                    } else {
                      return {
                        ...b,
                        lastOptimizedAt: Date.now()
                      };
                    }
                  }));
                  if (bestSuggestion.score > 70) {
                    addNotification("Strategy Optimized", `Bot ${bot.name} strategy improved by AI (Score: ${bestSuggestion.score})`, 'success');
                  }
                }
            } catch (err) {
                setBots(currentBots => currentBots.map(b => {
                  if (b.id !== bot.id) return b;
                  return {
                    ...b,
                    status: 'error',
                    errorMessage: err instanceof Error ? err.message : 'Unknown optimization error'
                  };
                }));
                addNotification("Bot Error", `${bot.name} encountered an error during autonomous optimization.`, 'alert');
            }
          }
        }
      }
    }, 30000); // Check for optimization every 30 seconds
    return () => clearInterval(optimizationLoop);
  }, [addNotification]);


  const handleAddDataSource = async (source: Partial<DataSource>) => {
    try {
      const res = await fetch('/api/data-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(source)
      });
      const data = await res.json();
      setDataSources(prev => [...prev, data]);
      addNotification("Source Added", `New data source ${data.name} is now online.`, 'success');
    } catch (e) { console.error("Failed to add source", e); }
  };

  const handleUpdateDataSource = async (source: DataSource) => {
    try {
      const res = await fetch(`/api/data-sources/${source.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(source)
      });
      const data = await res.json();
      setDataSources(prev => prev.map(ds => ds.id === data.id ? data : ds));
      addNotification("Source Updated", `Configuration for ${data.name} has been saved.`, 'success');
    } catch (e) { console.error("Failed to update source", e); }
  };

  const handleDeleteDataSource = async (id: string) => {
    try {
      await fetch(`/api/data-sources/${id}`, { method: 'DELETE' });
      setDataSources(prev => prev.filter(ds => ds.id !== id));
      addNotification("Source Removed", "Data source has been disconnected.", 'alert');
    } catch (e) { console.error("Failed to delete source", e); }
  };

  const handleReorderDataSources = async (newSources: DataSource[]) => {
    setDataSources(newSources); // Optimistic update
    try {
      await Promise.all(newSources.map(source => 
        fetch(`/api/data-sources/${source.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(source)
        })
      ));
      addNotification("Sources Reordered", "Data source priorities have been updated.", 'success');
    } catch (e) {
      console.error("Failed to reorder sources", e);
      addNotification("Reorder Failed", "Failed to save new priority order.", 'alert');
    }
  };

  useEffect(() => {
    if (localStorage.getItem('OMNITRADE_SIM_CONNECTED') === 'true') {
      handleConnectSim();
    }
  }, []);

  const selectedStock = stocks.find(s => s.symbol === selectedSymbol) || stocks[0];
  const portfolioValue = portfolio.reduce((acc, pos) => {
    const stock = stocks.find(s => s.symbol === pos.symbol);
    return acc + (stock ? stock.price * pos.shares : 0);
  }, 0);
  const totalEquity = cashBalance + portfolioValue;

  const handleConnectSim = () => {
    setIsSimConnected(true);
    localStorage.setItem('OMNITRADE_SIM_CONNECTED', 'true');
    addNotification("Exchange Connected", "Exchange connected successfully.", 'success');
  };

  const handleDisconnectSim = () => {
    setIsSimConnected(false);
    localStorage.removeItem('OMNITRADE_SIM_CONNECTED');
    addNotification("Exchange Disconnected", "All exchanges disconnected.", 'alert');
  };

  const handlePlaceOrder = (order: { 
      symbol: string, side: 'buy' | 'sell', type: 'market' | 'limit' | 'stop-loss' | 'take-profit' | 'bracket', 
      shares: number, price?: number, isLive?: boolean,
      isPreMarket?: boolean, stopLossPrice?: number, takeProfitPrice?: number
  }, skipConfirmation?: boolean) => {
    if (!isSimConnectedRef.current) {
        addNotification("Trade Failed", "Please connect an exchange first.", 'alert');
        setActiveView(AppView.CONNECTIONS);
        return;
    }
    
    const stock = stocksRef.current.find(s => s.symbol === order.symbol);
    if (!stock) {
        addNotification("Trade Failed", "Invalid stock symbol.", 'alert');
        return;
    }

    const orderPrice = order.type === 'market' ? stock.price : (order.price || stock.price);
    const totalCost = orderPrice * order.shares;
    
    if (!skipConfirmation) {
        setManualConfirmationOrder({
            symbol: order.symbol,
            side: order.side,
            type: order.type,
            shares: order.shares,
            price: orderPrice,
            estimatedTotal: totalCost,
            isLive: order.isLive,
            originalOrder: order
        });
        return;
    }

    const mode = order.isLive ? 'LIVE' : 'PAPER';

    // Validation
    if (order.side === 'buy') {
        if (totalCost > cashBalanceRef.current) {
            addNotification("Insufficient Funds", `Required: ${formatMoney(totalCost)}. Available: ${formatMoney(cashBalanceRef.current)}`, 'alert');
            return;
        }
    } else {
        const position = portfolioRef.current.find(p => p.symbol === order.symbol);
        if (!position || position.shares < order.shares) {
            addNotification("Insufficient Shares", `Cannot sell ${order.shares} shares. You own ${position?.shares || 0}.`, 'alert');
            return;
        }
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
            type: 'PLACE_ORDER',
            order: {
                symbol: order.symbol,
                side: order.side,
                type: order.type,
                shares: order.shares,
                price: orderPrice,
                isPreMarket: order.isPreMarket,
                stopLossPrice: order.stopLossPrice,
                takeProfitPrice: order.takeProfitPrice,
                isLive: order.isLive
            }
        }));
        
        addNotification(`Order Sent`, `Sent ${mode} order for ${order.shares} ${order.symbol}.`, 'success');
    } else {
        addNotification("Trade Failed", "WebSocket is not connected.", 'alert');
    }
  };

  const formatMoney = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  const formatPct = (val: number) => `${val > 0 ? '+' : ''}${val.toFixed(2)}%`;

  return (
    <div className="flex h-screen w-screen bg-[var(--bg)] text-gray-100 overflow-hidden font-sans relative">
      <div className="absolute inset-0 pointer-events-none cyber-grid z-0"></div>
      
      {/* Toast Notifications */}
      <div className="absolute bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
          {notifications.map(note => (
              <div key={note.id} className={`pointer-events-auto bg-gray-900/90 backdrop-blur-sm border border-gray-800 border-l-2 ${note.type === 'success' ? 'border-l-emerald-500' : 'border-l-rose-500'} text-white p-2.5 rounded shadow-2xl flex flex-col min-w-[200px] max-w-[250px] animate-in slide-in-from-bottom-5 fade-in duration-300`}>
                  <div className="flex justify-between items-start gap-2">
                      <span className={`font-bold text-[10px] uppercase tracking-wider mb-0.5 ${note.type === 'success' ? 'text-emerald-500' : 'text-rose-500'}`}>{note.title}</span>
                      <button onClick={() => setNotifications(prev => prev.filter(n => n.id !== note.id))} className="text-gray-500 hover:text-white transition-colors cursor-pointer">
                          <XCircle className="w-3 h-3" />
                      </button>
                  </div>
                  <span className="text-[10px] text-gray-400 leading-tight">{note.message}</span>
              </div>
          ))}
      </div>

      {/* Sidebar Navigation */}
      <aside className="w-16 bg-gray-900 border-r border-gray-800 flex flex-col items-center py-6 space-y-8 z-20 shadow-xl shadow-black/20">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-900/30">
          <DragonLogo className="text-gray-950 w-6 h-6" />
        </div>
        <nav className="flex-1 flex flex-col space-y-4">
          <button 
            onClick={() => setActiveView(AppView.DASHBOARD)}
            className={`p-3 rounded-xl transition-all ${activeView === AppView.DASHBOARD ? 'bg-gray-800 text-amber-500' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'}`}
          >
            <LayoutDashboard className="w-6 h-6" />
          </button>
          <button 
             onClick={() => setActiveView(AppView.ARBITRAGE)}
             className={`p-3 rounded-xl transition-all ${activeView === AppView.ARBITRAGE ? 'bg-gray-800 text-amber-500' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'}`}
          >
            <Zap className="w-6 h-6" />
          </button>
          <button 
             onClick={() => setActiveView(AppView.BOTS)}
             className={`p-3 rounded-xl transition-all ${activeView === AppView.BOTS ? 'bg-gray-800 text-amber-500' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'}`}
          >
            <Cpu className="w-6 h-6" />
          </button>
          <button 
             onClick={() => setActiveView(AppView.COPY_TRADE)}
             className={`p-3 rounded-xl transition-all ${activeView === AppView.COPY_TRADE ? 'bg-gray-800 text-amber-500' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'}`}
          >
            <Users className="w-6 h-6" />
          </button>
          <button 
             onClick={() => setActiveView(AppView.ORACLE)}
             className={`p-3 rounded-xl transition-all ${activeView === AppView.ORACLE ? 'bg-gray-800 text-amber-500' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'}`}
             title="Gemini Oracle"
          >
            <Sparkles className="w-6 h-6" />
          </button>
          <button 
             onClick={() => setActiveView(AppView.PLAYGROUND)}
             className={`p-3 rounded-xl transition-all ${activeView === AppView.PLAYGROUND ? 'bg-gray-800 text-amber-500' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'}`}
             title="Playground"
          >
            <Database className="w-6 h-6" />
          </button>
          <button 
             onClick={() => setActiveView(AppView.DATA_SOURCES)}
             className={`p-3 rounded-xl transition-all ${activeView === AppView.DATA_SOURCES ? 'bg-gray-800 text-amber-500' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'}`}
             title="Data Sources"
          >
            <Database className="w-6 h-6" />
          </button>
          <button 
             onClick={() => setActiveView(AppView.MASTER_BOT)}
             className={`p-3 rounded-xl transition-all ${activeView === AppView.MASTER_BOT ? 'bg-gray-800 text-amber-500' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'}`}
             title="Master Bot"
          >
            <BrainCircuit className="w-6 h-6" />
          </button>
          <button 
             onClick={() => setActiveView(AppView.BACKTESTING)}
             className={`p-3 rounded-xl transition-all ${activeView === AppView.BACKTESTING ? 'bg-gray-800 text-amber-500' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'}`}
             title="Backtesting"
          >
            <History className="w-6 h-6" />
          </button>
          <button 
             onClick={() => setActiveView(AppView.SOR)}
             className={`p-3 rounded-xl transition-all ${activeView === AppView.SOR ? 'bg-gray-800 text-amber-500' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'}`}
             title="Smart Order Routing"
          >
            <Network className="w-6 h-6" />
          </button>
          <button 
             onClick={() => setActiveView(AppView.STRATEGY_EXPLORER)}
             className={`p-3 rounded-xl transition-all ${activeView === AppView.STRATEGY_EXPLORER ? 'bg-gray-800 text-indigo-500' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'}`}
             title="Strategy Explorer"
          >
            <FlaskConical className="w-6 h-6" />
          </button>
          <button 
             onClick={() => setActiveView(AppView.ALPHA_DEEP_DIVE)}
             className={`p-3 rounded-xl transition-all ${activeView === AppView.ALPHA_DEEP_DIVE ? 'bg-gray-800 text-indigo-500 shadow-lg shadow-indigo-500/20' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'}`}
             title="Alpha Deep Dive"
          >
            <Fingerprint className="w-6 h-6" />
          </button>
          <button 
             onClick={() => setActiveView(AppView.DEEP_SEARCH)}
             className={`p-3 rounded-xl transition-all ${activeView === AppView.DEEP_SEARCH ? 'bg-fuchsia-900/40 text-fuchsia-400 shadow-lg shadow-fuchsia-500/20' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'}`}
             title="Deep AI Search"
          >
            <Search className="w-6 h-6 text-fuchsia-500" />
          </button>
          <button 
             onClick={() => setActiveView(AppView.CONNECTIONS)}
             className={`p-3 rounded-xl transition-all ${activeView === AppView.CONNECTIONS ? 'bg-gray-800 text-amber-500' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'}`}
             title="Connections"
          >
            <PlugZap className="w-6 h-6" />
          </button>
          <button 
             onClick={() => setActiveView(AppView.ACCOUNT)}
             className={`p-3 rounded-xl transition-all ${activeView === AppView.ACCOUNT ? 'bg-indigo-900/40 text-indigo-400 shadow-lg shadow-indigo-500/20' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'}`}
             title="Account & Gas"
          >
            <Wallet className="w-6 h-6" />
          </button>
          <button 
             onClick={() => setActiveView(AppView.MARKETPLACE)}
             className={`p-3 rounded-xl transition-all ${activeView === AppView.MARKETPLACE ? 'bg-fuchsia-900/40 text-fuchsia-400 shadow-lg shadow-fuchsia-500/20' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'}`}
             title="Data Marketplace"
          >
            <Store className="w-6 h-6 text-fuchsia-500" />
          </button>
          <button 
             onClick={() => setActiveView(AppView.PREDICTION_MARKETS)}
             className={`p-3 rounded-xl transition-all ${activeView === AppView.PREDICTION_MARKETS ? 'bg-rose-900/40 text-rose-400 shadow-lg shadow-rose-500/20' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'}`}
             title="Prediction Markets"
          >
            <Vote className="w-6 h-6 text-rose-500" />
          </button>
          <button 
             onClick={() => setActiveView(AppView.SWARM)}
             className={`p-3 rounded-xl transition-all ${activeView === AppView.SWARM ? 'bg-emerald-900/40 text-emerald-400 shadow-lg shadow-emerald-500/20' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'}`}
             title="AI Swarm Architect"
          >
            <BrainCircuit className="w-6 h-6 text-emerald-500" />
          </button>
          <button 
             onClick={() => setActiveView(AppView.TASKS)}
             className={`p-3 rounded-xl transition-all ${activeView === AppView.TASKS ? 'bg-sky-900/40 text-sky-400 shadow-lg shadow-sky-500/20' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'}`}
             title="Agent Tasks"
          >
            <ListTodo className="w-6 h-6 text-sky-500" />
          </button>
          <button 
             onClick={() => setActiveView(AppView.TELEGRAM_BOT)}
             className={`p-3 rounded-xl transition-all ${activeView === AppView.TELEGRAM_BOT ? 'bg-amber-900/40 text-amber-500 shadow-lg shadow-amber-500/20' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'}`}
             title="Telegram AI Bot"
          >
            <Send className="w-6 h-6 text-amber-500" />
          </button>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-gray-950/50 backdrop-blur-md border-b border-gray-800 flex items-center justify-between px-6 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold tracking-tight text-white font-serif uppercase flex items-center gap-2">
                <span className="text-amber-500">Golden</span> Dragon
                <span className="text-xs bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded border border-amber-500/20 font-sans normal-case tracking-normal">Terminal</span>
            </h1>
            <div className="h-4 w-[1px] bg-gray-700 mx-2"></div>
            <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-400">Net Worth</span>
                <span className="font-mono font-medium text-amber-400">{formatMoney(totalEquity)}</span>
            </div>
          </div>
          <div className="flex items-center gap-4 relative">
             <button onClick={() => setIsAlertsModalOpen(!isAlertsModalOpen)} className="p-2 text-gray-400 hover:text-white transition-colors relative">
                 <Bell className="w-5 h-5" />
                 {priceAlerts.filter(a => !a.isFired).length > 0 && (
                     <span className="absolute top-1 right-2 w-2 h-2 bg-amber-500 rounded-full border border-gray-900"></span>
                 )}
             </button>
             {isAlertsModalOpen && (
                 <div className="absolute top-12 right-0 w-[400px] bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden z-20">
                     <div className="p-4 border-b border-gray-800 bg-gray-950/50">
                         <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2"><BellRing className="w-4 h-4 text-amber-500"/> Price Alerts</h3>
                         <div className="flex gap-2">
                             <select id="alertSymbol" className="bg-gray-950 border border-gray-800 text-white text-sm rounded outline-none focus:border-amber-500 px-2 py-1.5 flex-1">
                                {stocks.map(s => <option key={s.symbol} value={s.symbol}>{s.symbol} ({formatMoney(s.price)})</option>)}
                             </select>
                             <select id="alertCondition" className="bg-gray-950 border border-gray-800 text-white text-sm rounded outline-none focus:border-amber-500 px-2 py-1.5 w-24">
                                <option value="above">Above</option>
                                <option value="below">Below</option>
                             </select>
                             <input id="alertPrice" type="number" step="0.01" className="bg-gray-950 border border-gray-800 text-white text-sm rounded outline-none focus:border-amber-500 px-2 py-1.5 w-24" placeholder="Price" />
                             <button onClick={() => {
                                 const symbol = (document.getElementById('alertSymbol') as HTMLSelectElement).value;
                                 const condition = (document.getElementById('alertCondition') as HTMLSelectElement).value as 'above'|'below';
                                 const price = parseFloat((document.getElementById('alertPrice') as HTMLInputElement).value);
                                 if (price > 0) {
                                     setPriceAlerts(prev => [...prev, { id: Math.random().toString(), symbol, targetPrice: price, condition, isFired: false }]);
                                     addNotification("Alert Added", `Will notify when ${symbol} goes ${condition} ${formatMoney(price)}`, 'success');
                                     (document.getElementById('alertPrice') as HTMLInputElement).value = '';
                                 }
                             }} className="bg-amber-500 hover:bg-amber-400 text-gray-950 p-2 rounded transition-colors">
                                 <Plus className="w-4 h-4" />
                             </button>
                         </div>
                     </div>
                     <div className="max-h-60 overflow-y-auto">
                        {priceAlerts.length === 0 ? (
                            <div className="p-6 text-center text-sm text-gray-500">No active alerts set</div>
                        ) : (
                            priceAlerts.map(alert => (
                                <div key={alert.id} className="p-3 border-b border-gray-800/50 hover:bg-gray-800/20 flex justify-between items-center text-sm transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${alert.isFired ? 'bg-gray-600' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'}`}></div>
                                        <div>
                                            <span className="font-bold text-white">{alert.symbol}</span>
                                            <span className="text-gray-400 mx-2 text-xs uppercase tracking-wider">{alert.condition}</span>
                                            <span className="text-amber-400 font-mono">{formatMoney(alert.targetPrice)}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {alert.isFired && <span className="text-[10px] uppercase font-bold tracking-wider text-green-500 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">Triggered</span>}
                                        <button onClick={() => setPriceAlerts(prev => prev.filter(a => a.id !== alert.id))} className="text-gray-600 hover:text-red-400 transition-colors p-1">
                                           <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                     </div>
                 </div>
             )}
          </div>
        </header>

        {isDetailModalOpen && modalStock && (
          <StockDetailModal 
            stock={modalStock}
            availableCash={cashBalance}
            availableShares={portfolio.find(p => p.symbol === modalStock.symbol)?.shares || 0}
            currentPosition={portfolio.find(p => p.symbol === modalStock.symbol)}
            onClose={() => {
              setIsDetailModalOpen(false);
              setModalStock(null);
            }}
            onSetAlert={(symbol, price) => addNotification("Alert Set", `Alert for ${symbol} at ${formatMoney(price)}`, 'success')}
            onNavigateToAI={(symbol, message) => {
              setSelectedSymbol(symbol);
              setIsDetailModalOpen(false);
              setModalStock(null);
              if (message) {
                  setAiInitialMessage(message);
                  setIsAIPanelOpen(true);
              }
            }}
            onPlaceOrder={handlePlaceOrder}
          />
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col relative overflow-y-auto custom-scrollbar"
          >
            {activeView === AppView.ARBITRAGE ? (
                <ArbitrageMatrix stocks={stocks} />
            ) : activeView === AppView.CONNECTIONS ? (
                <ExchangeConnect onConnect={handleConnectSim} onDisconnect={handleDisconnectSim} />
            ) : activeView === AppView.SOR ? (
                <SmartOrderRouter />
            ) : activeView === AppView.DATA_SOURCES ? (
                <DataSourcesManager 
                  dataSources={effectiveDataSources}
                  onAddDataSource={handleAddDataSource}
                  onUpdateDataSource={handleUpdateDataSource}
                  onDeleteDataSource={handleDeleteDataSource}
                  onReorderDataSources={handleReorderDataSources}
                  onLiveTick={(updates) => {
                    const updatesArr = Object.entries(updates).map(([symbol, price]) => ({ symbol: symbol.replace('USDT', '-USD'), price }));
                    setStocks(currentStocks => simulateTick(currentStocks, updatesArr as any));
                  }}
                />
            ) : activeView === AppView.MASTER_BOT ? (
                <MasterBotView bots={bots} dataSources={effectiveDataSources} />
            ) : activeView === AppView.STRATEGY_EXPLORER ? (
                <StrategyExplorer stocks={stocks} />
            ) : activeView === AppView.ALPHA_DEEP_DIVE ? (
                <AlphaDeepDive stocks={stocks} onAddBot={(b) => setBots(prev => [...prev, b])} />
            ) : activeView === AppView.DEEP_SEARCH ? (
                <DeepSearchAI stocks={stocks} onAddBot={(b) => setBots(prev => [...prev, b])} />
            ) : activeView === AppView.ACCOUNT ? (
                <AccountDashboard addNotification={addNotification} />
            ) : activeView === AppView.MARKETPLACE ? (
                <DataMarketplace 
                  addNotification={addNotification} 
                  onAddDataSource={handleAddDataSource}
                  onUpdateDataSource={handleUpdateDataSource}
                  onDeleteDataSource={handleDeleteDataSource}
                  userDataSources={effectiveDataSources}
                />
            ) : activeView === AppView.PREDICTION_MARKETS ? (
                <PredictionMarketsLab />
            ) : activeView === AppView.SWARM ? (
                <AgentSwarmArchitect agents={agents} setAgents={setAgents} dataSources={effectiveDataSources} tasks={tasks} setTasks={setTasks} stocks={stocks} />
            ) : activeView === AppView.TASKS ? (
                <AgentTasks tasks={tasks} setTasks={setTasks} agents={agents} dataSources={effectiveDataSources} />
            ) : activeView === AppView.TELEGRAM_BOT ? (
                <TelegramConnect />
            ) : activeView === AppView.BOTS ? (
               <BotLab 
                stocks={stocks} 
                bots={bots} 
                dataSources={effectiveDataSources}
                selectedSymbol={selectedSymbol}
                onAddBot={(b) => setBots(prev => [...prev, b])} 
                onDeleteBot={(id) => setBots(prev => prev.filter(b => b.id !== id))} 
                onToggleBot={(id) => setBots(prev => prev.map(b => b.id === id ? {...b, status: b.status === 'active' ? 'paused' : 'active'} : b))} 
                onUpdateBot={(updatedBot) => setBots(prev => prev.map(b => b.id === updatedBot.id ? updatedBot : b))}
                onAddDataSource={handleAddDataSource}
                onUpdateDataSource={handleUpdateDataSource}
                onDeleteDataSource={handleDeleteDataSource}
                onReorderDataSources={handleReorderDataSources}
                initialOptimizeBot={botToOptimize}
                onClearOptimizeBot={() => setBotToOptimize(null)}
                addNotification={addNotification}
               />
            ) : activeView === AppView.PLAYGROUND ? (
                <Playground bots={bots} dataSources={effectiveDataSources} stocks={stocks} />
            ) : activeView === AppView.ORACLE ? (
                <OracleSpace />
            ) : activeView === AppView.BACKTESTING ? (
                <Backtesting 
                  bots={bots} 
                  stocks={stocks} 
                  onOptimize={(botId) => {
                    const bot = bots.find(b => b.id === botId);
                    if (bot) {
                      setBotToOptimize(bot);
                      setActiveView(AppView.BOTS);
                    }
                  }}
                  onUpdateBot={(updatedBot) => setBots(current => current.map(b => b.id === updatedBot.id ? updatedBot : b))}
                />
            ) : activeView === AppView.COPY_TRADE ? (
               <CopyTradeHub traders={copyTraders} onToggleCopy={() => {}} onUpdateTrader={() => {}} />
            ) : activeView === AppView.DASHBOARD ? (
                 <CommandCenterDashboard 
                    stocks={stocks} 
                    bots={bots} 
                    selectedSymbol={selectedSymbol} 
                    setSelectedSymbol={setSelectedSymbol} 
                    portfolio={portfolio} 
                    cashBalance={cashBalance} 
                    realizedPL={realizedPL}
                    onExecuteTrade={(o) => handlePlaceOrder({...o, shares: o.quantity, isLive: false})}
                    onOpenDetails={handleOpenDetails}
                 />
            ) : (
                <div className="flex-1 flex items-center justify-center p-12 text-center bg-gray-950">
                    <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800 max-w-lg w-full relative overflow-hidden shadow-2xl">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-amber-700"></div>
                        <h2 className="text-2xl font-bold text-white mb-8">Exchange Connections</h2>
                        <button onClick={handleConnectSim} className={`w-full py-4 rounded-xl font-bold transition-all ${isSimConnected ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg'}`}>
                            {isSimConnected ? "DRAGON SIM CONNECTED" : "CONNECT TO DRAGON SIM"}
                        </button>
                    </div>
                </div>
            )}
          </motion.div>
        </AnimatePresence>
        
        {/* Global Manual Trade Confirmation Modal */}
        {manualConfirmationOrder && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col p-6">
                    <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-amber-500" /> Confirm Manual Order
                    </h3>
                    <p className="text-sm text-gray-400 mb-6">Please verify the order details before proceeding.</p>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                            <span className="text-gray-500 text-sm uppercase font-bold tracking-wider">Symbol</span>
                            <span className="text-white font-bold">{manualConfirmationOrder.symbol}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                            <span className="text-gray-500 text-sm uppercase font-bold tracking-wider">Action</span>
                            <span className={`font-bold ${manualConfirmationOrder.side === 'buy' ? 'text-emerald-500' : 'text-rose-500'} uppercase`}>
                                {manualConfirmationOrder.side}
                            </span>
                        </div>
                        <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                            <span className="text-gray-500 text-sm uppercase font-bold tracking-wider">Type</span>
                            <span className="text-white font-bold">{manualConfirmationOrder.type.toUpperCase()}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                            <span className="text-gray-500 text-sm uppercase font-bold tracking-wider">Quantity</span>
                            <span className="text-white font-bold">{manualConfirmationOrder.shares} Shares</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                            <span className="text-gray-500 text-sm uppercase font-bold tracking-wider">Price</span>
                            <span className="text-white font-bold font-mono">
                                {manualConfirmationOrder.type === 'market' ? 'Market Price' : formatMoney(manualConfirmationOrder.price)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                            <span className="text-gray-500 text-sm uppercase font-bold tracking-wider">Est. Total</span>
                            <span className="text-amber-500 font-bold font-mono text-lg">{formatMoney(manualConfirmationOrder.estimatedTotal)}</span>
                        </div>
                        {manualConfirmationOrder.originalOrder?.isPreMarket && (
                            <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                                <span className="text-gray-500 text-xs uppercase font-bold tracking-wider">Timing</span>
                                <span className="text-indigo-400 font-bold text-xs uppercase">Pre-Market (Queued)</span>
                            </div>
                        )}
                        {manualConfirmationOrder.originalOrder?.takeProfitPrice && (
                            <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                                <span className="text-gray-500 text-xs uppercase font-bold tracking-wider">Take Profit</span>
                                <span className="text-emerald-500 font-bold font-mono text-xs">
                                    {formatMoney(manualConfirmationOrder.originalOrder.takeProfitPrice)}
                                </span>
                            </div>
                        )}
                        {manualConfirmationOrder.originalOrder?.stopLossPrice && (
                            <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                                <span className="text-gray-500 text-xs uppercase font-bold tracking-wider">Stop Loss</span>
                                <span className="text-rose-500 font-bold font-mono text-xs">
                                    {formatMoney(manualConfirmationOrder.originalOrder.stopLossPrice)}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 mt-8">
                        <button 
                            onClick={() => setManualConfirmationOrder(null)}
                            className="px-5 py-2.5 rounded-lg font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={() => {
                                handlePlaceOrder(manualConfirmationOrder.originalOrder, true);
                                setManualConfirmationOrder(null);
                            }}
                            className={`px-6 py-2.5 rounded-lg font-bold text-white shadow-lg flex items-center gap-2 ${
                                manualConfirmationOrder.side === 'buy' 
                                ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/30' 
                                : 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/30'
                            }`}
                        >
                            Confirm Order
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Floating AI Button & Panel */}
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            {isAIPanelOpen && (
                <div className="bg-gray-900 border border-gray-800 shadow-2xl shadow-indigo-900/20 rounded-2xl w-80 h-[500px] mb-4 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5">
                    <div className="p-3 border-b border-gray-800 flex justify-between items-center bg-gray-950">
                        <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 flex items-center gap-2">
                           <BrainCircuit className="w-5 h-5 text-indigo-400" />
                           Dragon AI
                        </span>
                        <button onClick={() => setIsAIPanelOpen(false)} className="text-gray-500 hover:text-white transition-colors">
                            <XCircle className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="flex-1 overflow-hidden bg-[#0A0A18]">
                        <AIAssistant 
                            selectedStock={stocks.find(s => s.symbol === selectedSymbol) || stocks[0]} 
                            allStocks={stocks} 
                            onExecuteTrade={(o) => handlePlaceOrder({...o, shares: o.quantity, isLive: false})} 
                            initialMessage={aiInitialMessage} 
                            onMessageConsumed={() => setAiInitialMessage('')} 
                        />
                    </div>
                </div>
            )}
            <button 
                onClick={() => setIsAIPanelOpen(!isAIPanelOpen)}
                className={`p-4 rounded-full shadow-lg transition-all ${isAIPanelOpen ? 'bg-gray-800 text-gray-400 border border-gray-700' : 'bg-indigo-600 text-white hover:bg-indigo-500 hover:scale-105 shadow-indigo-900/50'}`}
                title="Chat with Dragon AI"
            >
                <MessageSquare className="w-6 h-6" />
            </button>
        </div>

      </main>
    </div>
  );
}

export default App;
