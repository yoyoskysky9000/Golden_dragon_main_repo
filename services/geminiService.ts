
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { StockData, CopyTrader, ArbitrageOpportunity, TradingBot, DataSource, SignalLog } from "../types";

// Always initialize the client inside the function call to ensure it uses the latest process.env.API_KEY.

export const analyzeCompanyDescription = async (symbol: string, name: string, description: string, sector?: string, price?: number): Promise<string> => {
  if (!process.env.API_KEY) return "API Key missing. Unable to analyze.";
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Please analyze the following description for ${name} (${symbol}) and highlight key investment themes. 
Specifically, focus on:
- Risk assessment
- Potential future catalysts based on the stock's sector (${sector || 'Unknown'}) and recent performance (Current Price: $${price ? price.toFixed(2) : 'Unknown'}).

Description: "${description}"

Format your response using Markdown with bolding and bullet points where appropriate, keeping it concise and impactful.`;
  try {
    const response = await ai.models.generateContent({ model: 'gemini-3.1-flash', contents: prompt });
    return response.text || "Analysis unavailable.";
  } catch (error) { return "Unable to generate analysis."; }
};

export const getMarketAnalysis = async (stock: StockData): Promise<string> => {
  if (!process.env.API_KEY) return "API Key missing.";
  // Initialize AI client per request for key freshness.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Analyze ${stock.name} (${stock.symbol}). Price: $${stock.price.toFixed(2)}. Trend (Last 5 mins): ${stock.history.slice(-5).map(h => `$${h.price.toFixed(2)}`).join(', ')}. Provide a concise identification (Bullish/Bearish/Neutral) and trading recommendation.`;
  try {
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
    return response.text || "Analysis unavailable.";
  } catch (error) { return "Unable to generate analysis."; }
};

export const findArbitrageOpportunities = async (stocks: StockData[]): Promise<string> => {
    if (!process.env.API_KEY) return "API Key missing.";
    // Initialize AI client per request for key freshness.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const context = stocks.map(s => {
        const exStr = Object.entries(s.exchanges || {}).map(([ex, p]) => `${ex}: $${p.toFixed(2)}`).join(', ');
        return `${s.symbol} Prices -> ${exStr}`;
    }).join('\n');

    const prompt = `
        ACT AS: Cross-Exchange Arbitrage Commander.
        DATA:
        ${context}

        TASK:
        1. Scan these price points across DragonEx, KrakenMock, and BinanceSim.
        2. Identify the single most profitable arbitrage trade (Buy Low on X, Sell High on Y).
        3. Account for a simulated 0.1% taker fee per leg.
        4. Output a summary including: Target Symbol, Path, Net Profit % after fees, and a "Risk Warning" if the spread is narrowing.
        
        Keep it sharp, tactical, and display as a terminal output.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
            config: { thinkingConfig: { thinkingBudget: 4096 } }
        });
        return response.text || "No arbitrage detected.";
    } catch (e) { return "Arbitrage scanner offline."; }
}

export const analyzeRSIHindsight = async (stock: StockData, rsiData: number[]): Promise<string> => {
  if (!process.env.API_KEY) return "API Key missing.";
  // Initialize AI client per request for key freshness.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `
    ACT AS: A "Temporal Trading Auditor". 
    ASSET: ${stock.name} (${stock.symbol})
    CONTEXT: The user wants to "mess with the RSI" to see if their trade would have been better if placed differently.
    
    DATA (Last 20 ticks):
    Price: ${stock.history.slice(-20).map(h => h.price.toFixed(2)).join(', ')}
    RSI: ${rsiData.slice(-20).map(r => r.toFixed(1)).join(', ')}

    TASK:
    1. Identify the "Optimal RSI Cross": Looking at this specific 20-point window, what was the absolute best RSI value to enter a Buy order?
    2. "The What-If": If the user had waited for that specific RSI level instead of a standard 30, what is the estimated % difference in entry price?
    3. Strategy Calibration: Suggest a custom RSI "oversold" threshold for this specific asset's current volatility.
    
    Be precise, data-driven, and slightly "eccentric".
  `;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: { thinkingConfig: { thinkingBudget: 8192 } }
    });
    return response.text || "Temporal audit failed.";
  } catch (error) { return "Temporal rift detected."; }
};

export const getPredictionMarketSentiment = async (stock: StockData): Promise<string> => {
  if (!process.env.API_KEY) return "API Key missing.";
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `
    ACT AS: "Prediction Market Sentinel".
    ASSET: ${stock.name} (${stock.symbol})
    TYPE: ${stock.assetType}
    PRICE: $${stock.price.toFixed(2)}

    TASK:
    1. Cross-reference the asset's current trajectory with hypothetical (or known) Polymarket prediction data points.
    2. Synthesize political event probabilities, macroscopic betting flows, and derivative open interest to create a "Prediction Confidence Score".
    3. Generate a tactical signal update incorporating these variables.
    4. Provide actionable insights based on this prediction logic.

    FORMAT: 
    - Include a Prediction Confidence Score metric (e.g. 84%).
    - Use terminal-esque formatting.
    - Be highly analytical and focus on forward-looking probabilities.
  `;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: prompt,
      config: { thinkingConfig: { thinkingBudget: 4096 } }
    });
    return response.text || "Prediction Market analysis failed.";
  } catch (error) { return "Unable to reach oracle."; }
};

export const getDeepMarketAnalysis = async (stock: StockData): Promise<string> => {
  if (!process.env.API_KEY) return "API Key missing.";
  // Initialize AI client per request for key freshness.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Deep Technical Dive for ${stock.name} (${stock.symbol}). Price: $${stock.price.toFixed(2)}. History: ${stock.history.slice(-10).map(h => h.price.toFixed(2)).join(', ')}.`;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: { thinkingConfig: { thinkingBudget: 16384 } }
    });
    return response.text || "Analysis unavailable.";
  } catch (error) { return "Analysis failed."; }
};

export const getRealtimeSignal = async (stock: StockData): Promise<string> => {
  if (!process.env.API_KEY) return "API Key missing.";
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `
    ACT AS: A "Real-Time AI Trading Signal Generator".
    ASSET: ${stock.name} (${stock.symbol})
    DATA:
    Current Price: $${stock.price.toFixed(2)}
    Recent Price History: ${stock.history.slice(-10).map(h => h.price.toFixed(2)).join(', ')}
    
    TASK:
    1. Analyze the provided stock data and simulate fetching recent market news for ${stock.symbol}.
    2. Generate a clear, actionable trading signal (STRONG BUY, BUY, NEUTRAL, SELL, STRONG SELL).
    3. Provide a 'Confidence Score' out of 100%.
    4. Briefly explain the reasoning incorporating both technicals and simulated news catalysts.
    
    Format the output using markdown. Use clear headings like "### SIGNAL", "### CONFIDENCE", and "### REASONING" so it renders beautifully in the UI. Make the reasoning concise and punchy.
  `;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt
    });
    return response.text || "Failed to generate signal.";
  } catch (error) { return "Signal generation failed."; }
};

export const getGeneralMarketNews = async (): Promise<string> => {
  if (!process.env.API_KEY) return "API Key missing.";
  // Initialize AI client per request for key freshness.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: 'Generate 3 breaking market news headlines for tech/crypto.',
    });
    return response.text || "News unavailable.";
  } catch (error) { return "News error."; }
}

const searchKalshiEventsTool: FunctionDeclaration = {
  name: 'search_kalshi_events',
  description: 'Searches for upcoming prediction market events, speakers, tickers, and live stream sources.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: { type: Type.STRING }
    },
    required: ['query'],
  },
};

const analyzeSpeechPatternsTool: FunctionDeclaration = {
  name: 'analyze_speech_patterns',
  description: 'Finds speech patterns in the speaker and precursor words that could lead up to the words that are being traded on.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      speaker: { type: Type.STRING },
      event: { type: Type.STRING }
    },
    required: ['speaker'],
  },
};

const liveLipReadTool: FunctionDeclaration = {
  name: 'live_lip_read',
  description: 'Lip reads from a live stream by screen sharing live with the AI before the price moves, to get the absolute earliest signal.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      speaker: { type: Type.STRING },
      source: { type: Type.STRING }
    },
    required: ['speaker'],
  },
};

const executeTradeTool: FunctionDeclaration = {
  name: 'execute_trade',
  description: 'Executes a buy or sell trade order.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      symbol: { type: Type.STRING },
      side: { type: Type.STRING },
      quantity: { type: Type.NUMBER },
      type: { type: Type.STRING },
      price: { type: Type.NUMBER }
    },
    required: ['symbol', 'side', 'quantity'],
  },
};

export interface ToolCallResponse { text?: string; toolCall?: { name: string; args: any; } }

export const chatWithAnalyst = async (history: {role: string, parts: {text: string}[]}[], message: string): Promise<ToolCallResponse> => {
    if (!process.env.API_KEY) return { text: "API Key missing." };
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: [...history.map(h => ({ role: h.role, parts: h.parts })), { role: 'user', parts: [{ text: message }] }],
            config: {
                systemInstruction: "You are the 'Golden Dragon Oracle'. Expert trading assistant. You can screen share live streams to lip read, analyze speech patterns, search kalshi events, and trade based on them. If the user asks to execute a trade, you MUST use the execute_trade tool and provide the required parameters. ALWAYS explain what you are doing. If you use a tool, synthesize its output naturally for the user.",
                tools: [{ functionDeclarations: [executeTradeTool, searchKalshiEventsTool, analyzeSpeechPatternsTool, liveLipReadTool] }]
            }
        });
        const functionCalls = response.functionCalls;
        if (functionCalls && functionCalls.length > 0) {
            const call = functionCalls[0];
            return { text: response.text, toolCall: { name: call.name, args: call.args } };
        }
        return { text: response.text || "No response." };
    } catch (error) { 
        console.error(error);
        return { text: "Connection error." }; 
    }
}

export const generateBotStrategy = async (userDescription: string, availableSymbols: string[], riskLevel: string = 'Balanced'): Promise<any> => {
  if (!process.env.API_KEY) return null;
  // Initialize AI client per request for key freshness.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const isSwarm = riskLevel === 'Swarm';
  const prompt = isSwarm 
    ? `Create a Multi-Agent Swarm trading strategy based on: "${userDescription}". Available symbols: ${availableSymbols.join(', ')}. The strategy should utilize multiple AI agents (Fundamental, Technical, Sentiment, Risk) working in consensus.`
    : `Convert request to JSON trading bot config: "${userDescription}". Available: ${availableSymbols.join(', ')}. Desired Risk Level: ${riskLevel}. You can use any technical indicator (e.g. RSI, MACD, SUPER_TREND, RESISTANCE, SAR, STOCH_RSI, or any indicator from Kraken/OKX) and can combine them (CUSTOM_COMBO). Adjust values to match risk profile.`;
    
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                name: { type: Type.STRING },
                symbol: { type: Type.STRING },
                type: { type: Type.STRING },
                strategy: {
                    type: Type.OBJECT,
                    properties: {
                        indicator: { type: Type.STRING },
                        condition: { type: Type.STRING },
                        value: { type: Type.STRING },
                        action: { type: Type.STRING }
                    }
                },
                aiDescription: { type: Type.STRING }
            }
        },
        thinkingConfig: { thinkingBudget: 2048 }
      }
    });
    
    const parsed = JSON.parse(response.text || '{}');
    if (isSwarm) {
        parsed.name = `Swarm: ${parsed.name || 'Alpha'}`;
        parsed.type = 'multi-agent-swarm';
        parsed.aiDescription = `[MULTI-AGENT SWARM ACTIVE]\n\n${parsed.aiDescription}\n\nAgents Deployed:\n- Technical Analyst: Active\n- Sentiment Oracle: Active\n- Risk Manager: Active`;
    }
    return parsed;
  } catch (error) { return null; }
}

export const auditTraderProfile = async (trader: CopyTrader): Promise<CopyTrader['aiAnalysis'] | null> => {
  if (!process.env.API_KEY) return null;
  // Initialize AI client per request for key freshness.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Audit trader: ${trader.name}. PF: ${trader.profitFactor}, Win: ${trader.winRate}%.`;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            confidenceScore: { type: Type.NUMBER },
            sustainability: { type: Type.STRING },
            verdict: { type: Type.STRING }
          }
        }
      }
    });
    const result = JSON.parse(response.text || '{}');
    return { ...result, scannedAt: Date.now() };
  } catch (error) { return null; }
}

export const generateTradingSignal = async (
  bot: TradingBot, 
  stock: StockData, 
  dataSources: DataSource[]
): Promise<SignalLog | null> => {
  if (!process.env.API_KEY) return null;
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Compute analytics "perfect data"
  const history = stock.history;
  let currentRsi = 50;
  let currentStochRsi = 50;
  let currentAtr = 0;
  let bUpper = 0;
  let bLower = 0;

  if (history.length > 14) {
      let gains = 0;
      let losses = 0;
      const period = 14;
      const recent = history.slice(-period - 1);
      for(let i=1; i<recent.length; i++){
          const change = recent[i].price - recent[i-1].price;
          if(change > 0) gains += change;
          else losses -= change;
      }
      const avgGain = gains / period;
      const avgLoss = losses / period;
      currentRsi = avgLoss === 0 ? 100 : 100 - (100 / (1 + (avgGain / avgLoss)));
      
      const prices = history.slice(-period).map(h => h.price);
      const mean = prices.reduce((a,b)=>a+b, 0)/period;
      const stdDev = Math.sqrt(prices.map(p => Math.pow(p - mean, 2)).reduce((a,b)=>a+b,0)/period);
      bUpper = mean + (2 * stdDev);
      bLower = mean - (2 * stdDev);
      
      const trs = [];
      for(let i=Math.max(1, history.length - 14); i<history.length; i++){
          const h = history[i].price * 1.002;
          const l = history[i].price * 0.998;
          const prevC = history[i-1].price;
          trs.push(Math.max(h-l, Math.abs(h-prevC), Math.abs(l-prevC)));
      }
      currentAtr = trs.reduce((a,b)=>a+b, 0) / trs.length;
  }

  // Sort sources by priority (highest first)
  const sortedSources = [...dataSources].sort((a, b) => b.priority - a.priority);
  
  const sourcesContext = sortedSources.map(ds => `- [Priority: ${ds.priority}] ${ds.name} (${ds.type}): ${ds.effectiveStatus || ds.status}${ds.lastData ? ` | Latest Data: ${ds.lastData}` : ''}${ds.dependencies && ds.dependencies.length > 0 ? ` | Dependencies: ${ds.dependencies.join(', ')}` : ''}`).join('\n');
  const prompt = `
    ACT AS: Autonomous Trading Signal Generator.
    BOT: ${bot.name} (Strategy: ${bot.strategy.indicator} ${bot.strategy.condition} ${bot.strategy.value})
    ASSET: ${stock.symbol} at $${stock.price.toFixed(2)}
    
    PERFECT ANALYTICS DATA (Hyper Tune Context):
    - RSI (14): ${currentRsi.toFixed(2)}
    - Bollinger Upper: ${bUpper.toFixed(2)} | Lower: ${bLower.toFixed(2)}
    - ATR (14): ${currentAtr.toFixed(4)}
    
    DATA SOURCES AVAILABLE:
    ${sourcesContext}
    
    CRITICAL INSTRUCTIONS:
    1. PRIORITIZATION: If data sources provide conflicting information, you MUST favor the source with the HIGHEST priority.
    2. VALIDATION: Ignore any data source marked as 'disconnected' or 'error'. If a source provides data that seems statistically impossible or corrupt, flag it in your reasoning and discount it.
    3. DEPENDENCIES: If a data source has dependencies, take care to factor in those dependency relationships. A failure or anomaly in a parent dependency should lower your confidence in or invalidate the dependent signal.
    4. ERROR HANDLING: If no reliable data sources are available, return a 'NEUTRAL' signal with 0 confidence and explain the data failure.
    5. STRATEGY TRIGGER: Use the 'PERFECT ANALYTICS DATA' to cross-check if the bot's strategy condition (${bot.strategy.indicator} ${bot.strategy.condition} ${bot.strategy.value}) is met. If strictly met, confidently trigger the action.
    
    TASK:
    1. Evaluate the current price action and strategy using the prioritized data.
    2. Synthesize a signal (BUY, SELL, or NEUTRAL).
    3. Provide a confidence score (0-100).
    4. Explain the reasoning, specifically mentioning how you resolved any discrepancies between sources and handled dependency chains.
    
    OUTPUT JSON ONLY.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            signal: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
            reasoning: { type: Type.STRING }
          }
        }
      }
    });
    const result = JSON.parse(response.text || '{}');
    return {
      id: Math.random().toString(36).substr(2, 9),
      botId: bot.id,
      symbol: stock.symbol,
      signal: result.signal.toLowerCase() as any,
      confidence: result.confidence,
      reasoning: result.reasoning,
      price: stock.price,
      timestamp: Date.now(),
      isPaper: !bot.isLive
    };
  } catch (error) { return null; }
};

export const logSignalToBackend = async (log: SignalLog) => {
  try {
    await fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(log)
    });
  } catch (e) { console.error("Failed to log signal", e); }
};

export const optimizeStrategy = async (
  bot: TradingBot,
  stock: StockData,
  performance: { pnl: number; trades: number }
): Promise<{ suggestions: Array<{ name: string; strategy: TradingBot['strategy']; reasoning: string; score: number }> } | null> => {
  if (!process.env.API_KEY) return null;
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  let backtestContext = '';
  if (bot.backtestMetrics) {
    backtestContext = `
    BACKTEST METRICS:
    - Win Rate: ${bot.backtestMetrics.winRate.toFixed(2)}%
    - Sharpe Ratio: ${bot.backtestMetrics.sharpeRatio.toFixed(2)}
    - Sortino Ratio: ${bot.backtestMetrics.sortinoRatio.toFixed(2)}
    - Max Drawdown: ${bot.backtestMetrics.maxDrawdown.toFixed(2)}%
    - Consecutive Wins/Losses: ${bot.backtestMetrics.maxConsecutiveWins}W / ${bot.backtestMetrics.maxConsecutiveLosses}L
    
    Incorporate risk-adjusted returns (Sharpe/Sortino) and trading psychology (handling drawdowns and losing streaks) into your optimization. Suggest parameter adjustments specifically targeting weak risk/reward or streak vulnerabilities.`;
  }

  const prompt = `
    ACT AS: Quantitative Strategy Optimizer.
    BOT: ${bot.name}
    CURRENT STRATEGY: ${bot.strategy.indicator} ${bot.strategy.condition} ${bot.strategy.value} -> ${bot.strategy.action}
    RUNTIME PERFORMANCE: PnL: $${performance.pnl.toFixed(2)}, Trades: ${performance.trades}
    MARKET CONTEXT: ${stock.symbol} at $${stock.price.toFixed(2)}, Change: ${stock.changePercent.toFixed(2)}%
    ${backtestContext}
    
    TASK:
    1. Analyze if the current strategy is effective.
    2. Provide 3 distinct optimization suggestions with varying approaches (e.g., Aggressive, Conservative, Balanced).
    3. Suggest adjustments to the indicator value or condition to improve win rate or risk-adjusted returns (e.g. optimizing for a higher Sharpe ratio).
    4. Provide an "Optimization Score" (0-100) representing the expected improvement for each.
    
    OUTPUT JSON ONLY:
    {
      "suggestions": [
        {
          "name": "Conservative Tweak",
          "strategy": { "indicator": "...", "condition": "...", "value": "...", "action": "..." },
          "reasoning": "...",
          "score": 85
        }
      ]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  strategy: {
                    type: Type.OBJECT,
                    properties: {
                      indicator: { type: Type.STRING },
                      condition: { type: Type.STRING },
                      value: { type: Type.STRING },
                      action: { type: Type.STRING },
                      additionalRules: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            indicator: { type: Type.STRING },
                            condition: { type: Type.STRING },
                            value: { type: Type.STRING }
                          }
                        }
                      }
                    }
                  },
                  reasoning: { type: Type.STRING },
                  score: { type: Type.NUMBER }
                }
              }
            }
          }
        }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (error) { 
    if (error instanceof Error) {
        throw new Error(`Optimization failure: ${error.message}`);
    }
    throw new Error('Unknown optimization error.');
  }
};

export const backtestStrategy = async (
  symbol: string,
  strategy: TradingBot['strategy'],
  history: { price: number; timestamp: string }[]
): Promise<{ 
  totalReturn: number; 
  winRate: number; 
  maxDrawdown: number; 
  trades: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  equityCurve: { timestamp: string; equity: number }[];
  reasoning: string;
} | null> => {
  if (!process.env.API_KEY) return null;
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    ACT AS: High-Fidelity Backtesting Engine.
    ASSET: ${symbol}
    STRATEGY: ${strategy.indicator} ${strategy.condition} ${strategy.value} -> ${strategy.action}
    HISTORY: ${JSON.stringify(history.slice(-30))} (Last 30 data points)

    TASK:
    1. Simulate trade executions based on the strategy across this history.
    2. Calculate key performance metrics: Total Return %, Win Rate %, Max Drawdown %, Sharpe Ratio, Sortino Ratio, Max Consecutive Wins, and Max Consecutive Losses.
    3. Generate a hypothetical equity curve data set (10 points).
    4. Provide a "Strategy Verdict" summarizing the performance.

    OUTPUT JSON ONLY.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            totalReturn: { type: Type.NUMBER },
            winRate: { type: Type.NUMBER },
            maxDrawdown: { type: Type.NUMBER },
            trades: { type: Type.NUMBER },
            sharpeRatio: { type: Type.NUMBER },
            sortinoRatio: { type: Type.NUMBER },
            maxConsecutiveWins: { type: Type.NUMBER },
            maxConsecutiveLosses: { type: Type.NUMBER },
            equityCurve: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  timestamp: { type: Type.STRING },
                  equity: { type: Type.NUMBER }
                }
              }
            },
            reasoning: { type: Type.STRING }
          }
        }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (error) { return null; }
};

export const tuneParameters = async (
  symbol: string,
  currentStrategy: TradingBot['strategy'],
  backtestResults: any,
  stockData: StockData
): Promise<{
    indicator: string;
    condition: string;
    value: string;
    action: 'BUY' | 'SELL';
    takeProfit?: string;
    stopLoss?: string;
    reasoning: string;
} | null> => {
    if (!process.env.API_KEY) return null;
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const prompt = `
        ACT AS: High-Frequency Quant Analyst.
        ASSET: ${symbol}
        CURRENT STRATEGY: ${JSON.stringify(currentStrategy)}
        BACKTEST PERFORMANCE: ${JSON.stringify(backtestResults)}
        MARKET DATA: ${JSON.stringify(stockData)}

        TASK:
        The user wants to tune this strategy for better performance. Look at the backtest metrics and market data.
        If win rate is low, perhaps make the condition stricter. If trades are too few, make it looser.
        Suggest parameter tweaks (e.g., changing RSI from 30 to 28), and consider suggesting a takeProfit (e.g. 5.0) and stopLoss (e.g. 2.0).
        Keep the same indicator if possible, just tweak the value or condition slightly.

        OUTPUT JSON ONLY.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        indicator: { type: Type.STRING },
                        condition: { type: Type.STRING },
                        value: { type: Type.STRING },
                        action: { type: Type.STRING },
                        takeProfit: { type: Type.STRING },
                        stopLoss: { type: Type.STRING },
                        reasoning: { type: Type.STRING }
                    }
                }
            }
        });
        return JSON.parse(response.text || '{}');
    } catch (e) {
        return null;
    }
};

export const performAlphaDeepDive = async (
  stock: StockData
): Promise<{
  drivers: { name: string; impact: 'High' | 'Medium' | 'Low'; description: string }[];
  requestedData: string[];
  suggestedBacktest: {
    indicator: string;
    condition: string;
    value: string;
    description: string;
  };
  alphaVerdict: string;
} | null> => {
  if (!process.env.API_KEY) return null;
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    ACT AS: Quant Investment Analyst.
    STOCK: ${stock.symbol} - ${stock.name}
    PRICE: $${stock.price}
    CHANGE: ${stock.changePercent}%

    TASK:
    1. Identify 3-4 core "Value Drivers" that move this stock's price (e.g. Interest rates for banks, GPU demand for NVDA).
    2. List 2 specific data points or metrics a user should retrieve to prove Alpha (e.g. "Monthly Active Users", "Quarterly R&D Spend").
    3. Suggest a technical backtest strategy that complements these fundamental drivers.
    4. Provide a "Alpha Verdict" summarizing the bot's potential.

    OUTPUT JSON ONLY.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            drivers: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  impact: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] },
                  description: { type: Type.STRING }
                }
              }
            },
            requestedData: { type: Type.ARRAY, items: { type: Type.STRING } },
            suggestedBacktest: {
              type: Type.OBJECT,
              properties: {
                indicator: { type: Type.STRING },
                condition: { type: Type.STRING },
                value: { type: Type.STRING },
                description: { type: Type.STRING }
              }
            },
            alphaVerdict: { type: Type.STRING }
          }
        }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (error) { return null; }
};

export const spawnHedgeFundBots = async (stocks: StockData[]): Promise<any[] | null> => {
  if (!process.env.API_KEY) return null;
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const marketContext = stocks.map(s => `${s.symbol} (${s.name}) - Current: $${s.price.toFixed(2)}, Sector: ${s.sector}`).join('\n');

  const prompt = `
    ACT AS: Elite Hedge Fund Manager (The "Dragon AI").
    AVAILABLE ASSETS:
    ${marketContext}
    
    TASK:
    Analyze the current asset landscape and build out a mini hedge fund portfolio of EXACTLY 5 diverse trading bots.
    Each bot must target a DIFFERENT asset from the available list above.
    The goal is to create the "perfect" auto-adjusting portfolio strategies across the given assets.
    
    For each bot:
    1. Select the Best Target Asset.
    2. Design a precise technical strategy (indicator, condition, value, action) for it.
    3. Determine if the execution protocol should be "Binance" (for crypto) or "Alpaca" (for stocks).
    4. Create a professional, aggressive name for this bot.
    5. Write a short, punchy explanation for why this is the perfect strategy for this asset.

    STRATEGY CONSTRAINTS:
    - Indicator: RSI, MACD, SMA50, EMA20, Bollinger, VWAP, MOMENTUM
    - Condition: GT, LT, EQ, CROSS_UP, CROSS_DOWN
    - Action: buy, sell

    OUTPUT EXACTLY 5 BOTS IN A JSON ARRAY.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              symbol: { type: Type.STRING },
              exchange: { type: Type.STRING },
              strategy: {
                type: Type.OBJECT,
                properties: {
                  indicator: { type: Type.STRING },
                  condition: { type: Type.STRING },
                  value: { type: Type.STRING },
                  action: { type: Type.STRING, enum: ['buy', 'sell'] }
                }
              },
              aiDescription: { type: Type.STRING }
            }
          }
        }
      }
    });
    return JSON.parse(response.text || '[]');
  } catch (error) { return null; }
};

export const generateAIStrategy = async (stock: StockData): Promise<TradingBot['strategy'] | null> => {
  try {
    if (!process.env.API_KEY) throw new Error("API Key missing");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const prompt = `Analyze this stock data and propose the best simple technical indicator strategy based on recent momentum.
Stock: ${stock.symbol} - ${stock.name}
Current Price: $${stock.price}
Sector: ${stock.sector}
Asset Type: ${stock.assetType}
Trend: ${stock.change >= 0 ? 'Bullish' : 'Bearish'} (${stock.changePercent}%)

Return ONLY a valid JSON object representing the strategy. Do not use markdown blocks. Ensure the fields match this structure exactly:
{
  "indicator": "RSI" | "MACD" | "SMA50" | "EMA20" | "Bollinger" | "SUPER_TREND" | "STOCH_RSI" | "SAR" | "RESISTANCE" | "SUPPORT" | "CUSTOM_COMBO",
  "condition": "LT" | "GT" | "EQ" | "CROSS_UP" | "CROSS_DOWN",
  "value": "string (number or threshold)",
  "action": "buy" | "sell"
}`;

    const result = await ai.models.generateContent({
      model: 'gemini-3.1-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { temperature: 0.2 }
    });
    
    let rawText = result.text;
    if (rawText.startsWith('```json')) rawText = rawText.replace(/```json\n?/, '').replace(/\n?```/g, '').trim();
    if (rawText.startsWith('```')) rawText = rawText.replace(/```\n?/, '').replace(/\n?```/g, '').trim();
    
    return JSON.parse(rawText) as TradingBot['strategy'];
  } catch (error) {
    console.error("Failed to generate AI Strategy", error);
    return null;
  }
};

export const simulateAgentTraining = async (agentId: string, onProgress: (progress: number) => void): Promise<boolean> => {
  return new Promise((resolve) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 10) + 5;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        onProgress(progress);
        resolve(true);
      } else {
        onProgress(progress);
      }
    }, 300);
  });
};

export const createAIBot = async (
  description: string,
  symbol: string,
  riskLevel: 'Conservative' | 'Balanced' | 'Aggressive',
  selectedSources?: { name: string, type: string }[]
): Promise<{
  name: string;
  strategy: TradingBot['strategy'];
  aiDescription: string;
} | null> => {
  if (!process.env.API_KEY) return null;
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const sourcesContext = selectedSources && selectedSources.length > 0 
    ? `\n    AVAILABLE DATA SOURCES FOR AGGREGATION & CROSS-VALIDATION:\n    ${selectedSources.map(s => `- ${s.name} (${s.type})`).join('\n')}\n    \n    INSTRUCTIONS FOR SIGNAL AGGREGATION: Design this bot's strategy to utilize cross-validation from the above sources.`
    : '';

  const prompt = `
    ACT AS: Advanced Trading Bot Architect.
    ASSET: ${symbol}
    USER REQUEST: "${description}"
    RISK ARCHITECTURE: ${riskLevel}${sourcesContext}

    TASK:
    1. Design a precise technical strategy (indicator, condition, value, action).
    2. Create a professional name for this bot based on the selected strategies / data sources.
    3. Write a short description detailing how the bot leverages its data sources to synthesize trading decisions and perform cross-validation.

    STRATEGY CONSTRAINTS:
    - Indicator: RSI, MACD, SMA50, EMA20, Bollinger
    - Condition: GT, LT, EQ, CROSS_UP, CROSS_DOWN
    - Value: Choose a valid threshold (e.g., "30", "70", "0", "MA_CROSS")

    OUTPUT JSON ONLY.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            strategy: {
              type: Type.OBJECT,
              properties: {
                indicator: { type: Type.STRING },
                condition: { type: Type.STRING },
                value: { type: Type.STRING },
                action: { type: Type.STRING, enum: ['buy', 'sell'] }
              }
            },
            aiDescription: { type: Type.STRING }
          }
        }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (error) { return null; }
};
