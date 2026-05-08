import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bot, 
  Search, 
  Target, 
  Zap, 
  Clock, 
  Layers, 
  Fingerprint,
  TrendingUp,
  Cpu,
  ArrowRight,
  Database,
  Lock
} from 'lucide-react';
import { StockData } from '../types';

interface DeepSearchAIProps {
  stocks: StockData[];
  onAddBot: (bot: any) => void;
}

const DeepSearchAI: React.FC<DeepSearchAIProps> = ({ stocks, onAddBot }) => {
  const [isSearching, setIsSearching] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'scan' | 'analyze' | 'timing' | 'results'>('idle');
  const [results, setResults] = useState<any[]>([]);

  const startDeepSearch = async () => {
    setIsSearching(true);
    setPhase('scan');
    
    // Simulate AI Phase 1: Deep Scan
    await new Promise(r => setTimeout(r, 2500));
    setPhase('analyze');
    
    // Simulate AI Phase 2: Analyzing Catalysts
    await new Promise(r => setTimeout(r, 3000));
    setPhase('timing');
    
    // Simulate AI Phase 3: Perfect Timing & Triggers
    await new Promise(r => setTimeout(r, 2500));
    setPhase('results');
    
    // Generate amazing fake results using available stocks or fallback to big names
    const targetStocks = stocks.slice(0, 3);
    
    const catalysts = [
      "Approaching FDA Approval phase 3 clinical trial readouts expecting 85% efficacy.",
      "Unannounced autonomous vehicle partnership expected to be revealed at upcoming tech summit.",
      "Earnings whisper numbers suggest a 45% beat on EPS due to hidden supply chain efficiencies.",
      "Major institutional accumulation detected via dark pool data analysis."
    ];
    
    const triggers = [
      "Set aggressive trailing buy trigger 12 hours before the event date, target entry post-consolidation.",
      "Deploy mean-reversion algorithm 3 days prior, aiming for volatility compression breakout.",
      "Accumulate on VWAP dips starting next Tuesday at 10:30 AM EST before the institutional rebalancing.",
      "Execute algorithmic buy ladder when RSI drops below 35 on the 4H chart within the next 48 hours."
    ];

    setResults(targetStocks.map((s, i) => ({
      symbol: s.symbol,
      name: s.name,
      price: s.price,
      catalyst: catalysts[i % catalysts.length],
      trigger: triggers[i % triggers.length],
      confidence: Math.floor(Math.random() * 15 + 85), // 85-99%
      timeline: `${Math.floor(Math.random() * 7) + 1} Days`
    })));
  };

  const handleDeployChain = (result: any) => {
    onAddBot({
      id: `deepsearch-${result.symbol}-${Date.now()}`,
      name: `Deep Agent: ${result.symbol}`,
      symbol: result.symbol,
      exchange: 'Global',
      type: 'multi-agent-swarm',
      status: 'active',
      pnl: 0,
      pnlPercent: 0,
      trades: 0,
      strategy: { indicator: 'AI Deep Trigger', condition: 'EQ', value: 'dynamic', action: 'buy' },
      aiDescription: `Trigger: ${result.trigger} | Catalyst: ${result.catalyst}`,
      isLive: false,
      autoMode: true,
      dataSources: [],
    });
    alert(`Deployed Perfect AI Chain for ${result.symbol}`);
  };

  return (
    <div className="flex-1 bg-black p-6 flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-black flex items-center gap-2 tracking-tighter text-white">
            <Cpu className="w-6 h-6 text-fuchsia-500" />
            DEEP <span className="text-fuchsia-500">SEARCH SWARM</span>
          </h2>
          <p className="text-xs font-mono text-gray-400 uppercase tracking-widest mt-1">Autonomous 3-Stage Catalyst & Timing Discovery Chain</p>
        </div>
      </div>

      {phase === 'idle' && (
        <div className="flex-1 flex flex-col items-center justify-center min-h-0 bg-gray-950/50 border border-gray-800 rounded-3xl relative overflow-hidden p-8">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-fuchsia-900/20 via-black to-black"></div>
          <Fingerprint className="w-32 h-32 text-fuchsia-500/20 mb-8" />
          <h1 className="text-4xl font-black text-white text-center mb-4 z-10">THE PERFECT AI CHAIN</h1>
          <p className="text-gray-400 text-center max-w-lg mb-10 z-10">
            Deploy an interconnected swarm of AI models to simultaneously scan global markets, identify upcoming hidden catalysts, and calculate the exact microsecond to trigger the play.
          </p>
          <button 
            onClick={startDeepSearch}
            className="group relative px-8 py-4 bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-black uppercase text-sm tracking-widest rounded-full overflow-hidden transition-all shadow-[0_0_40px_rgba(192,38,211,0.4)] hover:shadow-[0_0_60px_rgba(192,38,211,0.6)] z-10"
          >
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
            <span className="flex items-center gap-2">Initiate Deep Search <Zap className="w-4 h-4" /></span>
          </button>
        </div>
      )}

      {(phase === 'scan' || phase === 'analyze' || phase === 'timing') && (
        <div className="flex-1 flex flex-col items-center justify-center min-h-0 relative">
          <div className="w-full max-w-3xl space-y-6">
            
            <div className={`p-6 rounded-2xl border transition-all duration-1000 ${phase === 'scan' ? 'bg-fuchsia-900/20 border-fuchsia-500 shadow-[0_0_30px_rgba(192,38,211,0.2)]' : 'bg-gray-900/50 border-gray-800 opacity-50'}`}>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-bold text-white flex items-center gap-3">
                  <Search className={`w-5 h-5 ${phase === 'scan' ? 'animate-pulse text-fuchsia-500' : 'text-gray-500'}`} />
                  Agent 1: Global Asset Scan
                </h3>
                {phase !== 'scan' && <span className="text-xs font-mono text-emerald-500 uppercase">Complete</span>}
              </div>
              <p className="text-sm font-mono text-gray-400">Scanning 18,492 global equities across 42 dark pools and lit exchanges...</p>
            </div>

            <div className={`p-6 rounded-2xl border transition-all duration-1000 ${phase === 'analyze' ? 'bg-indigo-900/20 border-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.2)]' : phase === 'scan' ? 'bg-black border-gray-900 opacity-20' : 'bg-gray-900/50 border-gray-800 opacity-50'}`}>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-bold text-white flex items-center gap-3">
                  <Database className={`w-5 h-5 ${phase === 'analyze' ? 'animate-pulse text-indigo-500' : 'text-gray-500'}`} />
                  Agent 2: Deep Catalyst Extraction
                </h3>
                {phase === 'timing' && <span className="text-xs font-mono text-emerald-500 uppercase">Complete</span>}
              </div>
              <p className="text-sm font-mono text-gray-400">Filtering top 3 assets. Synthesizing news, sentiment, and hidden SEC filings to determine guaranteed movers...</p>
            </div>

            <div className={`p-6 rounded-2xl border transition-all duration-1000 ${phase === 'timing' ? 'bg-emerald-900/20 border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.2)]' : 'bg-black border-gray-900 opacity-20'}`}>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-bold text-white flex items-center gap-3">
                  <Clock className={`w-5 h-5 ${phase === 'timing' ? 'animate-pulse text-emerald-500' : 'text-gray-500'}`} />
                  Agent 3: Perfect Timing Calculus
                </h3>
              </div>
              <p className="text-sm font-mono text-gray-400">Calculating execution triggers, optimal pre-market entry windows, and risk-adjusted positioning...</p>
            </div>

          </div>
        </div>
      )}

      {phase === 'results' && (
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto no-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {results.map((result, idx) => (
              <motion.div 
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.2 }}
                key={result.symbol} 
                className="bg-gray-950 border border-gray-800 rounded-3xl p-6 relative overflow-hidden group hover:border-fuchsia-500/50 transition-colors"
              >
                <div className="absolute top-0 right-0 p-6 opacity-5 z-0">
                  <Target className="w-32 h-32 text-fuchsia-500" />
                </div>
                
                <div className="z-10 relative">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-3xl font-black text-white">{result.symbol}</h2>
                      <div className="text-sm text-gray-500">{result.name}</div>
                    </div>
                    <div className="bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-500 px-3 py-1 rounded-lg text-xs font-black">
                      {result.confidence}% INTENT
                    </div>
                  </div>

                  <div className="space-y-4 mb-8">
                    <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
                      <div className="text-[10px] uppercase font-bold text-gray-500 mb-2 flex items-center gap-1.5"><Zap className="w-3 h-3 text-amber-500" /> The Catalyst</div>
                      <p className="text-sm text-gray-300 leading-relaxed font-mono">{result.catalyst}</p>
                    </div>

                    <div className="bg-fuchsia-500/5 rounded-2xl p-4 border border-fuchsia-500/20">
                      <div className="text-[10px] uppercase font-bold text-fuchsia-500 mb-2 flex items-center gap-1.5"><Clock className="w-3 h-3 text-fuchsia-500" /> Perfect Trigger Timing</div>
                      <p className="text-sm text-fuchsia-50 leading-relaxed">{result.trigger}</p>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs font-mono pt-2 border-t border-gray-800">
                      <span className="text-gray-500">Current: <span className="text-white font-bold">${result.price.toFixed(2)}</span></span>
                      <span className="text-gray-500">Horizon: <span className="text-emerald-500 font-bold">{result.timeline}</span></span>
                    </div>
                  </div>

                  <button 
                    onClick={() => handleDeployChain(result)}
                    className="w-full py-4 bg-white hover:bg-gray-200 text-black font-black uppercase text-xs tracking-widest rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    Deploy Perfect AI Chain <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DeepSearchAI;
