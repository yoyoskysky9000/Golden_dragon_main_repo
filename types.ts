
export interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  history: { time: string; price: number; rsi?: number; sma?: number; kalman?: number }[];
  sector: string;
  assetType: 'stock' | 'crypto' | 'option' | 'future';
  description: string;
  exchanges?: Record<string, number>; // symbol -> price on that exchange
  marketCap?: string;
  peRatio?: string;
  dividend?: string;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  about?: string;
}

export interface ArbitrageOpportunity {
  symbol: string;
  buyExchange: string;
  sellExchange: string;
  buyPrice: number;
  sellPrice: number;
  spread: number;
  spreadPercent: number;
  profitPotential: number;
}

export interface PredictionArbitrageOpportunity {
  id: string;
  event: string;
  category: 'crypto' | 'politics' | 'economics' | 'tech';
  polymarketYesPrice: number;
  kalshiNoPrice: number;
  combinedCost: number;
  guaranteedProfit: number;
  guaranteedProfitPercent: number;
  liquidity: number;
}

export interface OrderBookRow {
  price: number;
  size: number;
  total: number;
  percent: number; // For depth visualization
}

export interface PortfolioPosition {
  symbol: string;
  shares: number;
  avgCost: number;
}

export interface TradeOrder {
  symbol: string;
  side: 'buy' | 'sell';
  shares: number;
  price: number;
  timestamp: number;
}

export interface ActiveOrder {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop-loss' | 'take-profit' | 'bracket';
  shares: number;
  price: number; // Represents limitPrice or stopPrice
  timestamp: number;
  status: 'open' | 'filled' | 'cancelled';
  stopLoss?: number;
  takeProfit?: number;
  isPreMarket?: boolean;
}

export interface BaseDataSource {
  id: string;
  name: string;
  status: 'connected' | 'disconnected' | 'error';
  effectiveStatus?: 'connected' | 'disconnected' | 'error';
  config?: any;
  lastData?: string;
  priority: number;
  dependencies?: string[];
  marketplaceListingId?: string;
}

export interface RealtimeDataSource extends BaseDataSource {
  type: 'realtime';
}

export interface ComputedDataSource extends BaseDataSource {
  type: 'computed';
}

export interface AIProcessedDataSource extends BaseDataSource {
  type: 'ai_processed';
}

export interface ExternalApiDataSource extends BaseDataSource {
  type: 'external_api';
}

export interface LiveFeedDataSource extends BaseDataSource {
  type: 'live_feed';
}

export type DataSource = RealtimeDataSource | ComputedDataSource | AIProcessedDataSource | ExternalApiDataSource | LiveFeedDataSource;

export interface SignalLog {
  id: string;
  botId: string;
  symbol: string;
  signal: 'buy' | 'sell' | 'neutral';
  confidence: number;
  reasoning: string;
  price: number;
  timestamp: number;
  isPaper: boolean;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface AIAgent {
  id: string;
  name: string;
  role: 'Master Strategist' | 'Sector Analyst' | 'Quant Developer' | 'Risk Manager' | 'Data Engineer' | 'Execution Specialist' | 'Prediction Market Sentinel';
  model: 'gemini-3.1-pro-preview' | 'gemini-3.1-flash' | 'kalshi-tuned-v1' | 'coinbase-tuned-v1' | 'custom-api';
  trainingDataSources: { id: string; priority: number }[];
  systemPrompt: string;
  parentAgentId: string | null; // For hierarchy
  status: 'idle' | 'training' | 'analyzing' | 'ready' | 'error' | 'paused';
  accuracyScore: number;
  lastTrainedAt?: number;
  trainingProgress?: number;
  estimatedTimeRemaining?: number; // In seconds
}

export interface TradingBotSource {
  id: string;
  priority: number;
}

export interface TradingBot {
  id: string;
  name: string;
  symbol: string;
  exchange?: string;
  type: 'ai_adaptive' | 'momentum' | 'mean_reversion' | 'custom' | 'multi-agent-swarm';
  status: 'active' | 'paused' | 'learning' | 'error';
  errorMessage?: string;
  pnl: number;
  pnlPercent: number;
  trades: number;
  strategy: {
    indicator: string;
    condition: string;
    value: string;
    action: 'buy' | 'sell';
    logic?: 'AND' | 'OR';
    additionalRules?: {
      indicator: string;
      condition: string;
      value: string;
      logic?: 'AND' | 'OR';
    }[];
  };
  aiDescription?: string;
  isLive: boolean;
  autoMode: boolean;
  dataSources: TradingBotSource[];
  lastOptimizedAt?: number;
  optimizationScore?: number;
  autoOptimize?: boolean;
  performanceHistory?: { timestamp: number; pnl: number; trades?: number }[];
  startDate?: string;
  endDate?: string;
  backtestMetrics?: {
    totalReturn: number;
    winRate: number;
    maxDrawdown: number;
    totalTrades: number;
    sharpeRatio: number;
    sortinoRatio: number;
    maxConsecutiveWins: number;
    maxConsecutiveLosses: number;
  };
}

export interface CopyTrader {
  id: string;
  name: string;
  handle: string;
  bio: string;
  returnsAllTime: number; // percentage
  winRate: number; // percentage
  profitFactor: number;
  followers: number;
  topAssets: string[];
  riskLevel: 'Low' | 'Medium' | 'High' | 'Degen';
  isCopying: boolean;
  aiAnalysis?: {
    confidenceScore: number; // 0-100
    sustainability: 'Sustainable' | 'Risky' | 'Luck-based';
    verdict: string;
    scannedAt: number;
  };
}

export interface PredictionMarket {
  id: string;
  question: string;
  category: 'crypto' | 'politics' | 'economics' | 'tech' | 'sports';
  probabilityYes: number;
  volume: number;
  endDate: string;
  resolutionSource: string;
  platforms: {
    kalshi?: { yesPrice: number, noPrice: number, volume: number },
    polymarket?: { yesPrice: number, noPrice: number, volume: number },
    coinbase?: { yesPrice: number, noPrice: number, volume: number }
  };
}

export interface PredictionBot {
  id: string;
  name: string;
  marketId: string;
  targetPlatforms: ('kalshi' | 'polymarket' | 'coinbase')[];
  strategy: string;
  status: 'active' | 'learning' | 'paused' | 'error';
  pnl: number;
  trades: number;
  performanceHistory?: { timestamp: number; pnl: number }[];
  confidence: number;
}

export interface UserAccount {
  id: string; // from Firebase Auth
  email?: string;
  planType: 'free' | 'subscription' | 'staking';
  stakedAmount: number;
  gasBalance: number;
  isSellingData: boolean;
  mfaEnabled?: boolean;
  mfaSecret?: string;
  createdAt: number;
  updatedAt: number;
}

export interface DataListing {
  id: string;
  sellerId: string;
  title: string;
  description: string;
  price: number;
  currency: 'USD' | 'GAS_COIN' | 'GAS_CO1N';
  dataSourceType?: string;
  status: 'active' | 'suspended' | 'sold_out';
  buyersCount: number;
  createdAt: number;
  updatedAt: number;
}

export enum AppView {
  DASHBOARD = 'DASHBOARD',
  CONNECTIONS = 'CONNECTIONS',
  BOTS = 'BOTS',
  COPY_TRADE = 'COPY_TRADE',
  ARBITRAGE = 'ARBITRAGE',
  PLAYGROUND = 'PLAYGROUND',
  SETTINGS = 'SETTINGS',
  ORACLE = 'ORACLE',
  BACKTESTING = 'BACKTESTING',
  SOR = 'SOR',
  DATA_SOURCES = 'DATA_SOURCES',
  MASTER_BOT = 'MASTER_BOT',
  STRATEGY_EXPLORER = 'STRATEGY_EXPLORER',
  ALPHA_DEEP_DIVE = 'ALPHA_DEEP_DIVE',
  DEEP_SEARCH = 'DEEP_SEARCH',
  ACCOUNT = 'ACCOUNT',
  MARKETPLACE = 'MARKETPLACE',
  PREDICTION_MARKETS = 'PREDICTION_MARKETS',
  SWARM = 'SWARM',
  TASKS = 'TASKS'
}

export interface AgentTask {
  id: string;
  title: string;
  description: string;
  assignedAgentId: string | null;
  deadline: string;
  status: 'todo' | 'in_progress' | 'completed' | 'failed';
  createdAt: number;
  dependencies?: string[];
  dataSources?: { id: string; priority: number }[];
}
