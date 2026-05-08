
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { StockData, ChatMessage } from '../types';
import { getMarketAnalysis, getDeepMarketAnalysis, chatWithAnalyst, getGeneralMarketNews, analyzeRSIHindsight, findArbitrageOpportunities, getRealtimeSignal } from '../services/geminiService';
import { Sparkles, Send, Loader2, Bot, Zap, RefreshCw, Flame, AlertCircle, BrainCircuit, History, Globe, Activity } from 'lucide-react';

interface AIAssistantProps {
  selectedStock: StockData;
  initialMessage?: string;
  onMessageConsumed?: () => void;
  onExecuteTrade?: (order: { symbol: string, side: 'buy' | 'sell', quantity: number, type: 'market' | 'limit' | 'stop-loss', price?: number }) => void;
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

  const handleAnalyze = async (type: 'quick' | 'deep' | 'hindsight' | 'arbitrage' | 'signal') => {
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
    } else {
        result = await getMarketAnalysis(selectedStock);
    }
    
    setAnalysis(result);
    setIsLoadingAnalysis(false);
    setIsDeepScanning(false);
  };

  const sendMessage = async (text: string) => {
    setMessages(prev => [...prev, { role: 'user', text, timestamp: Date.now() }]);
    setIsChatting(true);
    const history = messages.map(m => ({ role: m.role, parts: [{ text: m.text }] }));
    const response = await chatWithAnalyst(history, text);
    if (response.toolCall) {
         const tool = response.toolCall;
         if (tool.name === 'execute_trade' && onExecuteTrade) {
             const { symbol, side, quantity, type, price } = tool.args;
             const tradeSymbol = symbol || selectedStock.symbol;
             const tradeSide = side.toLowerCase() as any;
             const tradeQuantity = Number(quantity);
             const tradeType = (type || 'market').toLowerCase() as any;
             const tradePrice = price ? Number(price) : undefined;
             
             onExecuteTrade({ symbol: tradeSymbol, side: tradeSide, quantity: tradeQuantity, type: tradeType, price: tradePrice });
             
             setMessages(prev => [...prev, { 
                 role: 'model', 
                 text: `I have prepared a ${tradeSide.toUpperCase()} order for ${tradeQuantity} shares of ${tradeSymbol} at ${tradeType.toUpperCase()}${tradePrice ? ` ($${tradePrice})` : ''}. Please confirm the details in the trading dock.`, 
                 timestamp: Date.now() 
             }]);
         }
    } else {
        setMessages(prev => [...prev, { role: 'model', text: response.text || "No response.", timestamp: Date.now() }]);
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
            <button onClick={() => handleAnalyze('signal')} disabled={isLoadingAnalysis} className="text-[10px] w-full bg-emerald-600 hover:bg-emerald-500 text-white p-2 rounded-lg flex justify-center items-center gap-1 font-bold shadow-lg shadow-emerald-950/40 transition-all">
                <Activity className="w-3 h-3" /> Generate Real-Time Signal
            </button>
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
