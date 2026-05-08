
import React, { useState } from 'react';
import { CopyTrader } from '../types';
import { auditTraderProfile } from '../services/geminiService';
import { Users, TrendingUp, ShieldCheck, AlertTriangle, ScanEye, Zap, BrainCircuit, CheckCircle2, UserPlus, UserCheck, Lock } from 'lucide-react';

interface CopyTradeHubProps {
  traders: CopyTrader[];
  onToggleCopy: (id: string) => void;
  onUpdateTrader: (updatedTrader: CopyTrader) => void;
}

const CopyTradeHub: React.FC<CopyTradeHubProps> = ({ traders, onToggleCopy, onUpdateTrader }) => {
  const [scanningId, setScanningId] = useState<string | null>(null);
  const [freeScans, setFreeScans] = useState(5);

  const handleAudit = async (trader: CopyTrader) => {
    if (freeScans <= 0) {
        alert("Out of free scans! Upgrade to Pro to unlock unlimited Deep Scans.");
        return;
    }
    setScanningId(trader.id);
    const analysis = await auditTraderProfile(trader);
    if (analysis) {
      onUpdateTrader({ ...trader, aiAnalysis: analysis });
      setFreeScans(prev => prev - 1);
    }
    setScanningId(null);
  };

  return (
    <div className="flex-1 bg-gray-950 p-6 flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-amber-500" />
            Social Copy Trading
          </h2>
          <p className="text-sm text-gray-500">Replicate the success of top performers. Verified by Dragon AI.</p>
        </div>
        <div className="flex items-center gap-4">
            <div className={`px-4 py-2 rounded-lg border flex items-center gap-3 transition-colors ${freeScans > 0 ? 'bg-indigo-900/20 border-indigo-500/30' : 'bg-rose-900/20 border-rose-500/30'}`}>
                <BrainCircuit className={`w-4 h-4 ${freeScans > 0 ? 'text-indigo-400' : 'text-rose-400'}`} />
                <div className="flex flex-col">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${freeScans > 0 ? 'text-indigo-300' : 'text-rose-300'}`}>AI Confidence Scans</span>
                    <span className={`text-xs font-mono font-bold ${freeScans > 0 ? 'text-indigo-100' : 'text-rose-100'}`}>{freeScans} / 5 Free Remaining</span>
                </div>
            </div>
            {freeScans <= 0 && (
                <button className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-amber-900/20">
                    <Lock className="w-3.5 h-3.5" /> Upgrade to Pro
                </button>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-6">
        {traders.map(trader => (
          <div key={trader.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-all group relative overflow-hidden flex flex-col">
            
            {/* Background Flair for Degen/High Risk */}
            {trader.riskLevel === 'Degen' && <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 blur-2xl rounded-full pointer-events-none"></div>}
            
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold border-2 ${trader.riskLevel === 'Low' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : trader.riskLevel === 'Degen' ? 'border-rose-500/30 bg-rose-500/10 text-rose-400' : 'border-amber-500/30 bg-amber-500/10 text-amber-400'}`}>
                  {trader.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-white leading-tight flex items-center gap-2">
                    {trader.name}
                    {trader.followers > 5000 && <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />}
                  </h3>
                  <span className="text-xs text-gray-500 font-mono">{trader.handle}</span>
                </div>
              </div>
              <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${trader.riskLevel === 'Low' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : trader.riskLevel === 'Degen' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                {trader.riskLevel} Risk
              </div>
            </div>

            <p className="text-xs text-gray-400 mb-4 h-8 line-clamp-2">{trader.bio}</p>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-2 mb-4 bg-gray-950 p-3 rounded-lg border border-gray-800/50">
              <div>
                <div className="text-[10px] text-gray-600 uppercase">Return</div>
                <div className="text-emerald-400 font-mono font-bold text-sm">+{trader.returnsAllTime}%</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-gray-600 uppercase">Win Rate</div>
                <div className={`font-mono font-bold text-sm ${trader.winRate > 60 ? 'text-gray-200' : 'text-gray-400'}`}>{trader.winRate}%</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-gray-600 uppercase">Profit Fctr</div>
                <div className="text-amber-500 font-mono font-bold text-sm">{trader.profitFactor}</div>
              </div>
            </div>

            {/* AI Analysis Section */}
            <div className="mb-4 flex-1">
              {!trader.aiAnalysis ? (
                 <div className="h-full flex items-end">
                    <button 
                      onClick={() => handleAudit(trader)}
                      disabled={scanningId === trader.id}
                      className={`w-full py-2 border rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                        scanningId === trader.id 
                          ? 'bg-indigo-900/50 border-indigo-500/50 text-indigo-300 cursor-not-allowed' 
                          : 'bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border-indigo-500/20'
                      }`}
                    >
                       {scanningId === trader.id ? <BrainCircuit className="w-3.5 h-3.5 animate-pulse" /> : <ScanEye className="w-3.5 h-3.5" />}
                       {scanningId === trader.id ? 'Running Deep Scan...' : 'Run AI Confidence Scan'}
                    </button>
                 </div>
              ) : (
                 <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-lg p-3 animate-in fade-in duration-500">
                    <div className="flex justify-between items-center mb-2">
                       <span className="text-[10px] font-bold text-indigo-400 uppercase flex items-center gap-1">
                          <BrainCircuit className="w-3 h-3" /> AI Verdict
                       </span>
                       <span className="text-[10px] text-gray-500">{new Date(trader.aiAnalysis.scannedAt).toLocaleTimeString()}</span>
                    </div>
                    
                    <div className="flex items-center gap-3 mb-2">
                        <div className="relative w-10 h-10 flex items-center justify-center">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                <path className="text-indigo-900" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                                <path className={`${trader.aiAnalysis.confidenceScore > 70 ? 'text-emerald-500' : trader.aiAnalysis.confidenceScore > 40 ? 'text-amber-500' : 'text-rose-500'}`} strokeDasharray={`${trader.aiAnalysis.confidenceScore}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                            </svg>
                            <span className="absolute text-[10px] font-bold text-white">{trader.aiAnalysis.confidenceScore}</span>
                        </div>
                        <div>
                            <div className={`text-xs font-bold ${trader.aiAnalysis.sustainability === 'Sustainable' ? 'text-emerald-400' : trader.aiAnalysis.sustainability === 'Risky' ? 'text-amber-400' : 'text-rose-400'}`}>
                                {trader.aiAnalysis.sustainability}
                            </div>
                            <div className="text-[9px] text-gray-400 leading-tight">Confidence Score</div>
                        </div>
                    </div>
                    <p className="text-[10px] text-gray-300 italic border-t border-indigo-500/10 pt-2">"{trader.aiAnalysis.verdict}"</p>
                 </div>
              )}
            </div>

            <button 
              onClick={() => onToggleCopy(trader.id)}
              className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${trader.isCopying ? 'bg-gray-800 text-gray-400 border border-gray-700' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20'}`}
            >
               {trader.isCopying ? (
                   <>
                      <UserCheck className="w-4 h-4" /> Copying
                   </>
               ) : (
                   <>
                      <UserPlus className="w-4 h-4" /> Copy Trade
                   </>
               )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CopyTradeHub;
