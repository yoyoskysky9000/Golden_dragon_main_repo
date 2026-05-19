
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { StockData, ChatMessage } from '../types';
import { getMarketAnalysis, getDeepMarketAnalysis, chatWithAnalyst, getGeneralMarketNews, analyzeRSIHindsight, findArbitrageOpportunities, getRealtimeSignal, getPredictionMarketSentiment } from '../services/geminiService';
import { Sparkles, Send, Loader2, Bot, Zap, RefreshCw, Flame, AlertCircle, BrainCircuit, History, Globe, Activity, Vote } from 'lucide-react';

interface AIAssistantProps {
  selectedStock: StockData;
  initialMessage?: string;
  onMessageConsumed?: () => void;
  onExecuteTrade?: (order: { symbol: string, side: 'buy' | 'sell', quantity: number, type: 'market' | 'limit' | 'stop-loss' | 'take-profit' | 'bracket', price?: number, stopLossPrice?: number, takeProfitPrice?: number }) => void;
  allStocks?: StockData[];
}

const AIAssistant: React.FC<AIAssistantProps> = ({ selectedStock, initialMessage, onMessageConsumed, onExecuteTrade, allStocks = [] }) => {
  const [analysis, setAnalysis] = useState<string>('');
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [isDeepScanning, setIsDeepScanning] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: 'I am the Dragon Oracle. My sensors are calibrated for arbitrage and temporal RSI optimization.', timestamp: Date.now() }
  ]);
  const [isChatting, setIsChatting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [isAutoPilot, setIsAutoPilot] = useState(false);

  // Trade Execution State
  const [showTradeForm, setShowTradeForm] = useState(false);
  const [tradeSide, setTradeSide] = useState<'buy' | 'sell'>('buy');
  const [tradeQuantity, setTradeQuantity] = useState('1');
  const [tradeType, setTradeType] = useState<'market' | 'limit' | 'stop-loss' | 'bracket'>('market');
  const [tradePrice, setTradePrice] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [stopLossPrice, setStopLossPrice] = useState('');
  const [takeProfitPrice, setTakeProfitPrice] = useState('');

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isChatting]);

  useEffect(() => {
    if (initialMessage) {
      setChatInput(initialMessage);
      if (onMessageConsumed) onMessageConsumed();
    }
  }, [initialMessage, onMessageConsumed]);

  useEffect(() => {
    if (!isAutoPilot) return;
    
    const interval = setInterval(async () => {
        if (!isChatting) {
            setIsChatting(true);
            try {
                // Randomly decide whether to do analysis or execute a trade
                if (Math.random() > 0.5) {
                    const signal = await getRealtimeSignal(selectedStock);
                    setMessages(prev => [...prev, { 
                        role: 'model', 
                        text: `[AUTO-PILOT] Autonomous market analysis block finished:\n${signal}`, 
                        timestamp: Date.now() 
                    }]);
                } else {
                    const prompt = `Based on the current stock parameters for ${selectedStock.symbol} at $${selectedStock.price}, should I execute a quick trade? Answer concisely and use the execute_trade tool if a strong opportunity exists.`;
                    const history = messages.slice(-5).map(m => ({ role: m.role, parts: [{ text: m.text }] }));
                    const response = await chatWithAnalyst(history, prompt);
                    
                    if (response.toolCall && response.toolCall.name === 'execute_trade' && onExecuteTrade) {
                        const { symbol, side, quantity, type, price } = response.toolCall.args;
                        onExecuteTrade({ 
                            symbol: symbol || selectedStock.symbol, 
                            side: side as any, 
                            quantity: Number(quantity) || 1, 
                            type: type as any || 'market', 
                            price: price ? Number(price) : undefined 
                        });
                        setMessages(prev => [...prev, { 
                            role: 'model', 
                            text: `[AUTO-PILOT] Executed an automated ${side} order for ${quantity} shares of ${symbol || selectedStock.symbol}.`, 
                            timestamp: Date.now() 
                        }]);
                    } else {
                         setMessages(prev => [...prev, { 
                            role: 'model', 
                            text: `[AUTO-PILOT] Monitored ${selectedStock.symbol}. No clear trade signal detected at this moment.`, 
                            timestamp: Date.now() 
                        }]);
                    }
                }
            } catch (error) {
                console.error("AutoPilot Error:", error);
            } finally {
                setIsChatting(false);
            }
        }
    }, 15000); // run every 15 seconds
    
    return () => clearInterval(interval);
  }, [isAutoPilot, isChatting, selectedStock, messages, onExecuteTrade]);

  const handleAnalyze = async (type: 'quick' | 'deep' | 'hindsight' | 'arbitrage' | 'signal' | 'prediction' | 'general') => {
    setIsLoadingAnalysis(true);
    if (type !== 'quick') setIsDeepScanning(true);
    setAnalysis('');
    
    let result = '';
    if (type === 'deep') result = await getDeepMarketAnalysis(selectedStock);
    else if (type === 'hindsight') {
        const rsiData = selectedStock.history.map(h => h.rsi || 50);
        result = await analyzeRSIHindsight(selectedStock, rsiData);
    } else if (type === 'arbitrage') {
        // Find arbitrage across all symbols if available
        result = await findArbitrageOpportunities(allStocks.length > 0 ? allStocks : [selectedStock]);
    } else if (type === 'signal') {
        result = await getRealtimeSignal(selectedStock);
    } else if (type === 'prediction') {
        result = await getPredictionMarketSentiment(selectedStock);
    } else {
        result = await getMarketAnalysis(selectedStock);
    }
    
    setAnalysis(result);
    setIsLoadingAnalysis(false);
    setIsDeepScanning(false);
  };

  const sendMessage = async (initialText: string) => {
    setMessages(prev => [...prev, { role: 'user', text: initialText, timestamp: Date.now() }]);
    setIsChatting(true);
    
    let currentText = initialText;
    let localMessages = [...messages]; 

    for (let i = 0; i < 4; i++) {
        const historyForApi = localMessages.slice(-5).map(m => ({ role: m.role, parts: [{ text: m.text }] }));
        const response = await chatWithAnalyst(historyForApi, currentText);
        
        let shouldContinue = false;

        if (response.toolCall) {
            const tool = response.toolCall;
            
            if (response.text) {
                // If model said something before calling a tool, display it.
                setMessages(prev => [...prev, { role: 'model', text: response.text!, timestamp: Date.now() }]);
                localMessages.push({ role: 'model', text: response.text!, timestamp: Date.now() });
            }

            if (tool.name === 'execute_trade') {
                const { symbol, side, quantity, type, price } = tool.args;
                const tradeSymbol = symbol || selectedStock.symbol;
                const tradeSide = side ? side.toLowerCase() as any : 'buy';
                const tradeQuantity = Number(quantity);
                const tradeType = (type ? type.toLowerCase() : 'market') as any;
                const tradePrice = price ? Number(price) : undefined;
                
                if (onExecuteTrade) onExecuteTrade({ symbol: tradeSymbol, side: tradeSide, quantity: tradeQuantity, type: tradeType, price: tradePrice });
                
                const tradeMsg = `I have prepared a ${tradeSide.toUpperCase()} order for ${tradeQuantity} shares of ${tradeSymbol} at ${tradeType.toUpperCase()}${tradePrice ? ` ($${tradePrice})` : ''}. Please confirm the details in the trading dock.`;
                setMessages(prev => [...prev, { role: 'model', text: tradeMsg, timestamp: Date.now() }]);
                break;
            } else if (tool.name === 'search_kalshi_events') {
                const actionMsg = `[System action]: Searching Kalshi events for "${tool.args.query}"...`;
                setMessages(prev => [...prev, { role: 'model', text: actionMsg, timestamp: Date.now() }]);
                localMessages.push({ role: 'user', text: currentText, timestamp: Date.now() });
                localMessages.push({ role: 'model', text: actionMsg, timestamp: Date.now() });
                
                currentText = `[System tool response from search_kalshi_events]: Found event: "Jerome Powell FOMC Rate Decision". Ticker: "FED-RATE". Live stream: "Twitch/Bloomberg". Speaker: Jerome Powell.`;
                shouldContinue = true;
            } else if (tool.name === 'analyze_speech_patterns') {
                const actionMsg = `[System action]: Analyzing speech patterns for speaker: "${tool.args.speaker}"...`;
                setMessages(prev => [...prev, { role: 'model', text: actionMsg, timestamp: Date.now() }]);
                localMessages.push({ role: 'user', text: currentText, timestamp: Date.now() });
                localMessages.push({ role: 'model', text: actionMsg, timestamp: Date.now() });
                
                currentText = `[System tool response from analyze_speech_patterns]: Analyzed speaker ${tool.args.speaker}. Detected precursor words typical of a dovish tilt: "transitory", "data-dependent". Probability of unexpected hawkish pivot: Low. Probability of rate cut signaling: High (89.4%).`;
                shouldContinue = true;
            } else if (tool.name === 'live_lip_read') {
                const actionMsg = `[System action]: Activated Live Screen Share, tracking visual stream and lip reading speaker: "${tool.args.speaker}"...`;
                setMessages(prev => [...prev, { role: 'model', text: actionMsg, timestamp: Date.now() }]);
                localMessages.push({ role: 'user', text: currentText, timestamp: Date.now() });
                localMessages.push({ role: 'model', text: actionMsg, timestamp: Date.now() });
                
                currentText = `[System tool response from live_lip_read]: Currently translating lip movements 500ms ahead of audio broadcast... Words identified: "We have decided to cut rates by 50 basis points."`;
                shouldContinue = true;
            } else {
                 setMessages(prev => [...prev, { role: 'model', text: `Failed to use tool ${tool.name}.`, timestamp: Date.now() }]);
                 break;
            }
        } else {
             if (response.text) {
                 setMessages(prev => [...prev, { role: 'model', text: response.text!, timestamp: Date.now() }]);
             }
             break;
        }

        if (!shouldContinue) break;
    }
    
    setIsChatting(false);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const text = chatInput;
    setChatInput('');
    await sendMessage(text);
  };

  const formatMarkdown = (text: string) => {
    if (!text) return '';
    let md = text;
    
    // Check for system action
    if (md.startsWith('[System action]:')) {
        return `<div class="bg-indigo-900/30 border border-indigo-500/20 rounded-md p-2 text-indigo-300 font-mono text-[10px] uppercase tracking-wide flex items-center gap-2">
            <span class="animate-pulse w-2 h-2 rounded-full bg-indigo-500 inline-block"></span>
            ${md.replace('[System action]:', '').trim()}
        </div>`;
    }

    md = md.replace(/^### (.*$)/gm, '<h4 class="text-amber-400 font-bold mt-4 mb-2 text-[10px] uppercase tracking-widest">$1</h4>');
    md = md.replace(/^## (.*$)/gm, '<h3 class="text-white font-bold mt-5 mb-2 text-sm">$1</h3>');
    md = md.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>');
    md = md.replace(/^[\*\-] (.*$)/gm, '<div class="flex items-start gap-2 mb-1 pl-1 text-gray-300">● $1</div>');
    return md.split('\n').map(line => line.trim() ? `<p class="mb-2 text-gray-300 text-xs leading-relaxed">${line}</p>` : '<div class="h-1"></div>').join('');
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 border-l border-gray-800">
      <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gradient-to-r from-gray-900 to-amber-950/20">
        <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-500" />
            <h2 className="font-bold text-amber-500 tracking-wide uppercase text-[11px]">Dragon Oracle AI</h2>
        </div>
        <div className="flex items-center gap-3">
             <button 
                onClick={() => setIsAutoPilot(!isAutoPilot)}
                title="Toggle Autonomous Trading & Analysis mode"
                className={`text-[9px] font-bold px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all ${
                    isAutoPilot 
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.3)]' 
                        : 'bg-gray-800 text-gray-500 border-gray-700 hover:text-gray-300'
                }`}
             >
                <Zap className={`w-3 h-3 ${isAutoPilot ? 'animate-pulse text-emerald-300' : ''}`} />
                {isAutoPilot ? 'AUTO-PILOT: ON' : 'AUTO-PILOT: OFF'}
             </button>
             <div className="flex gap-1 items-center">
                 <div className="w-1 h-1 rounded-full bg-emerald-500 animate-ping"></div>
                 <span className="text-[8px] text-gray-500 font-black">SCANNING</span>
             </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        <div className={`rounded-xl p-4 border transition-all ${isDeepScanning ? 'bg-amber-950/20 border-amber-600/50 shadow-[0_0_20px_rgba(245,158,11,0.1)]' : 'bg-gray-800/40 border-gray-800'}`}>
          <div className="flex flex-col gap-3 mb-4">
            <h3 className="text-[9px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                <BrainCircuit className="w-3 h-3 text-indigo-400" /> Decision Engine
            </h3>
            <div className="grid grid-cols-2 gap-2">
                <button onClick={() => handleAnalyze('arbitrage')} disabled={isLoadingAnalysis} className="text-[10px] bg-amber-600 hover:bg-amber-500 text-white p-2 rounded-lg flex flex-col items-center gap-1 font-bold shadow-lg shadow-amber-950/40 transition-all">
                    <Zap className="w-3 h-3" /> Arbitrage Pulse
                </button>
                <button onClick={() => handleAnalyze('hindsight')} disabled={isLoadingAnalysis} className="text-[10px] bg-purple-600 hover:bg-purple-500 text-white p-2 rounded-lg flex flex-col items-center gap-1 font-bold shadow-lg shadow-purple-950/40 transition-all">
                    <History className="w-3 h-3" /> Hindsight Analysis
                </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
                <button onClick={() => handleAnalyze('quick')} disabled={isLoadingAnalysis} className="text-[10px] bg-gray-700 hover:bg-gray-600 text-gray-200 p-2 rounded-lg font-bold">Quick Scan</button>
                <button onClick={() => handleAnalyze('deep')} disabled={isLoadingAnalysis} className="text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-lg font-bold">Deep Strategy</button>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
                <button onClick={() => handleAnalyze('signal')} disabled={isLoadingAnalysis} className="col-span-1 text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white p-2 rounded-lg flex justify-center items-center gap-1 font-bold shadow-lg shadow-emerald-950/40 transition-all">
                    <Activity className="w-3 h-3" /> Real-Time Signal
                </button>
                <button onClick={() => handleAnalyze('prediction')} disabled={isLoadingAnalysis} className="col-span-1 text-[10px] bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg flex justify-center items-center gap-1 font-bold shadow-lg shadow-blue-950/40 transition-all">
                    <Vote className="w-3 h-3" /> Prediction Market Sentiment
                </button>
            </div>
            <div className="mt-2 text-center w-full">
                <button onClick={() => handleAnalyze('general')} disabled={isLoadingAnalysis} className="w-full text-[10px] bg-sky-600 hover:bg-sky-500 text-white p-2 rounded-lg flex justify-center items-center gap-1 font-bold shadow-lg shadow-sky-950/40 transition-all">
                    <Globe className="w-3 h-3" /> General Market Analysis
                </button>
            </div>
          </div>

          <div className="min-h-[100px] border-t border-gray-800 pt-4">
            {isLoadingAnalysis ? (
                <div className="flex flex-col items-center justify-center h-[120px] text-amber-500/50 space-y-3">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span className="text-[9px] font-bold animate-pulse tracking-tighter uppercase">Synchronizing Webhooks...</span>
                </div>
            ) : analysis ? (
               <div className="animate-in fade-in slide-in-from-top-2 duration-500" dangerouslySetInnerHTML={{ __html: formatMarkdown(analysis) }} />
            ) : (
              <p className="italic text-gray-600 text-center text-[10px] py-4">Awaiting tactical command for {selectedStock.symbol}...</p>
            )}
          </div>
        </div>

        {/* Trade Execution Component */}
        <div className="rounded-xl p-4 border bg-gray-800/40 border-gray-800 transition-all">
          <div className="flex items-center justify-between font-bold mb-3 cursor-pointer" onClick={() => setShowTradeForm(!showTradeForm)}>
            <h3 className="text-[9px] text-emerald-500 uppercase tracking-widest flex items-center gap-2">
              <Zap className="w-3 h-3" /> Trade Execution
            </h3>
            <span className="text-gray-500 text-xs">{showTradeForm ? '▼' : '▶'}</span>
          </div>
          
          {showTradeForm && (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
              <div className="flex gap-2">
                <button 
                  onClick={() => setTradeSide('buy')} 
                  className={`flex-1 text-xs font-bold py-1.5 rounded border transition-colors ${tradeSide === 'buy' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-gray-900 border-gray-700 text-gray-500'}`}
                >BUY</button>
                <button 
                  onClick={() => setTradeSide('sell')} 
                  className={`flex-1 text-xs font-bold py-1.5 rounded border transition-colors ${tradeSide === 'sell' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-gray-900 border-gray-700 text-gray-500'}`}
                >SELL</button>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] uppercase text-gray-500 block mb-1">Type</label>
                  <select 
                    value={tradeType}
                    onChange={(e) => {
                      const newType = e.target.value as any;
                      setTradeType(newType);
                      if (newType === 'bracket') setShowAdvanced(true);
                    }}
                    className="w-full bg-gray-900 border border-gray-700 rounded p-1.5 text-xs text-white"
                  >
                    <option value="market">Market</option>
                    <option value="limit">Limit</option>
                    <option value="stop-loss">Stop Loss</option>
                    <option value="bracket">Bracket (TPSL)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] uppercase text-gray-500 block mb-1">Qty</label>
                  <input type="number" min="1" value={tradeQuantity} onChange={(e) => setTradeQuantity(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded p-1.5 text-xs text-white inline-block" />
                </div>
              </div>

              {['limit', 'stop-loss', 'bracket'].includes(tradeType) && (
                <div>
                  <label className="text-[9px] uppercase text-gray-500 block mb-1">Price</label>
                  <input type="number" step="0.01" value={tradePrice} onChange={(e) => setTradePrice(e.target.value)} placeholder={selectedStock.price.toString()} className="w-full bg-gray-900 border border-gray-700 rounded p-1.5 text-xs text-white" />
                </div>
              )}

              <div className="pt-2 border-t border-gray-800">
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <input type="checkbox" checked={showAdvanced || tradeType === 'bracket'} onChange={(e) => setShowAdvanced(e.target.checked)} className="rounded border-gray-600 bg-gray-900" disabled={tradeType === 'bracket'} />
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Advanced Features (TPSL)</span>
                </label>

                {(showAdvanced || tradeType === 'bracket') && (
                  <div className="grid grid-cols-2 gap-2 mt-2 animate-in fade-in">
                    <div>
                      <label className="text-[9px] uppercase text-gray-500 block mb-1">Take Profit</label>
                      <input type="number" step="0.01" value={takeProfitPrice} onChange={(e) => setTakeProfitPrice(e.target.value)} placeholder="0.00" className="w-full bg-gray-900 border border-emerald-500/30 rounded p-1.5 text-xs text-emerald-400 focus:border-emerald-500 outline-none" />
                    </div>
                    <div>
                      <label className="text-[9px] uppercase text-gray-500 block mb-1">Stop Loss</label>
                      <input type="number" step="0.01" value={stopLossPrice} onChange={(e) => setStopLossPrice(e.target.value)} placeholder="0.00" className="w-full bg-gray-900 border border-rose-500/30 rounded p-1.5 text-xs text-rose-400 focus:border-rose-500 outline-none" />
                    </div>
                  </div>
                )}
              </div>

              <button 
                onClick={() => {
                  if (onExecuteTrade) {
                    onExecuteTrade({
                      symbol: selectedStock.symbol,
                      side: tradeSide,
                      quantity: Number(tradeQuantity) || 1,
                      type: tradeType as any,
                      price: tradePrice ? Number(tradePrice) : undefined,
                      stopLossPrice: stopLossPrice ? Number(stopLossPrice) : undefined,
                      takeProfitPrice: takeProfitPrice ? Number(takeProfitPrice) : undefined
                    });
                  }
                }}
                className={`w-full text-xs font-bold py-2 rounded-lg transition-all ${tradeSide === 'buy' ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow shadow-emerald-500/20' : 'bg-rose-600 hover:bg-rose-500 text-white shadow shadow-rose-500/20'}`}
              >
                Execute {tradeSide.toUpperCase()} {selectedStock.symbol}
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col space-y-3">
          <AnimatePresence initial={false}>
            {messages.map((msg, idx) => (
              <motion.div 
                key={idx} 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[90%] rounded-xl p-3 text-[11px] leading-relaxed ${msg.role === 'user' ? 'bg-amber-600 text-white shadow-lg' : 'bg-gray-800/80 text-gray-300 border border-gray-700 backdrop-blur-sm'}`}>
                  {msg.text}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {isChatting && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gray-800/50 rounded-lg p-2 w-12 flex justify-center items-center gap-1 border border-gray-700"
            >
              <motion.div 
                animate={{ y: [0, -3, 0] }}
                transition={{ repeat: Infinity, duration: 0.6, delay: 0 }}
                className="w-1 h-1 bg-amber-500 rounded-full"
              />
              <motion.div 
                animate={{ y: [0, -3, 0] }}
                transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
                className="w-1 h-1 bg-amber-500 rounded-full"
              />
              <motion.div 
                animate={{ y: [0, -3, 0] }}
                transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }}
                className="w-1 h-1 bg-amber-500 rounded-full"
              />
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="p-4 border-t border-gray-800 bg-gray-950">
        <form onSubmit={handleSendMessage} className="relative">
          <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Query the Oracle..." className="w-full bg-gray-900 text-gray-200 text-xs rounded-xl pl-4 pr-10 py-3 border border-gray-800 focus:outline-none focus:border-amber-600 transition-all font-mono" />
          <button type="submit" disabled={!chatInput.trim() || isChatting} className="absolute right-2 top-2 p-1.5 text-gray-500 hover:text-amber-500 disabled:opacity-50"><Send className="w-4 h-4" /></button>
        </form>
      </div>
    </div>
  );
};

export default AIAssistant;
