import React, { useState } from 'react';
import { Send, Bot, Zap, Flame, CheckCircle2, XCircle, RefreshCw, Key, Shield, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const TelegramConnect: React.FC = () => {
  const [botToken, setBotToken] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [activePersona, setActivePersona] = useState('golden_dragon');
  
  const handleConnect = async () => {
    if (!botToken) return;
    setIsConnecting(true);
    // Simulate API connection to Telegram
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsConnected(true);
    setIsConnecting(false);
  };
  
  const handleDisconnect = () => {
    setIsConnected(false);
    setBotToken('');
  };

  return (
    <div className="flex bg-gray-900 w-full h-[calc(100vh-64px)] overflow-y-auto">
      <div className="max-w-6xl mx-auto w-full p-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-amber-500/20 text-amber-500 rounded-xl">
            <Flame size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              Golden Dragon AI
              <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs font-semibold rounded-md flex items-center gap-1">
                <Send size={12} /> TELEGRAM MODULE
              </span>
            </h1>
            <p className="text-gray-400 mt-1">Deploy intelligence directly to your Telegram communities.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Connection Panel */}
          <div className="lg:col-span-2 space-y-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-800 rounded-2xl p-6 border border-gray-700"
            >
              <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                <Zap className="text-amber-500" size={24} /> 
                Connection Setup
              </h2>
              
              {!isConnected ? (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Bot API Token</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Key className="text-gray-500" size={18} />
                      </div>
                      <input
                        type="password"
                        className="bg-gray-900 border border-gray-700 text-white rounded-xl focus:ring-amber-500 focus:border-amber-500 block w-full pl-10 p-3"
                        placeholder="123456789:AAH..."
                        value={botToken}
                        onChange={(e) => setBotToken(e.target.value)}
                      />
                    </div>
                    <p className="mt-2 text-sm text-gray-500 flex items-center gap-1">
                      <Shield size={14} /> Talk to @BotFather on Telegram to get your token.
                    </p>
                  </div>
                  
                  <button
                    onClick={handleConnect}
                    disabled={isConnecting || !botToken}
                    className={`w-full py-3 rounded-xl font-medium flex justify-center items-center gap-2 transition-all ${
                      isConnecting || !botToken 
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-400 hover:to-orange-500 shadow-lg shadow-amber-500/20'
                    }`}
                  >
                    {isConnecting ? (
                      <><RefreshCw className="animate-spin" size={20} /> Connecting...</>
                    ) : (
                      <><Send size={20} /> Connect to Telegram</>
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="p-6 bg-green-500/10 border border-green-500/30 rounded-xl flex items-start gap-4">
                    <CheckCircle2 className="text-green-500 flex-shrink-0" size={24} />
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-green-400">Successfully Connected</h3>
                      <p className="text-gray-400 text-sm mt-1">Golden Dragon AI is now monitoring and ready to respond in your connected chats.</p>
                      <div className="mt-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        <span className="text-sm font-mono text-gray-300">@GoldenDragonWeb3Bot</span>
                      </div>
                    </div>
                    <button 
                      onClick={handleDisconnect}
                      className="px-4 py-2 bg-gray-900 hover:bg-red-500/20 hover:text-red-400 text-gray-400 text-sm font-medium rounded-lg border border-gray-700 transition-colors"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Persona Setup */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className={`bg-gray-800 rounded-2xl p-6 border border-gray-700 transition-opacity ${!isConnected ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                <Bot className="text-blue-500" size={24} /> 
                AI Persona Configuration
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div 
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    activePersona === 'golden_dragon' 
                    ? 'bg-amber-500/10 border-amber-500/50' 
                    : 'bg-gray-900 border-gray-700 hover:border-gray-500'
                  }`}
                  onClick={() => setActivePersona('golden_dragon')}
                >
                  <div className="flex justify-between items-start mb-2">
                    <Flame className={activePersona === 'golden_dragon' ? 'text-amber-500' : 'text-gray-500'} />
                    {activePersona === 'golden_dragon' && <CheckCircle2 className="text-amber-500" size={18} />}
                  </div>
                  <h3 className="font-semibold text-white mb-1">The Golden Dragon</h3>
                  <p className="text-xs text-gray-400">Aggressive alpha caller, high risk tolerance, uses intense crypto slang. Focuses on hidden gems and memecoins.</p>
                </div>

                <div 
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    activePersona === 'sage' 
                    ? 'bg-blue-500/10 border-blue-500/50' 
                    : 'bg-gray-900 border-gray-700 hover:border-gray-500'
                  }`}
                  onClick={() => setActivePersona('sage')}
                >
                  <div className="flex justify-between items-start mb-2">
                    <Bot className={activePersona === 'sage' ? 'text-blue-500' : 'text-gray-500'} />
                    {activePersona === 'sage' && <CheckCircle2 className="text-blue-500" size={18} />}
                  </div>
                  <h3 className="font-semibold text-white mb-1">The Market Sage</h3>
                  <p className="text-xs text-gray-400">Analytical, measured, focuses on fundamentals, risk management, and macro trends. Provides detailed charting.</p>
                </div>
              </div>
              
              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Custom Instructions</label>
                  <textarea 
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-gray-300 focus:ring-blue-500 focus:border-blue-500 h-24"
                    placeholder="Enter specific rules for your Telegram AI..."
                  ></textarea>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-white font-medium text-sm">Autonomous Interventions</h4>
                    <p className="text-xs text-gray-500">Allow AI to jump into conversations unprompted</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Activity Log sidebar */}
          <div className="lg:col-span-1">
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-gray-800 rounded-2xl p-6 border border-gray-700 h-full max-h-[800px] flex flex-col"
            >
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <MessageCircle className="text-gray-400" size={20} />
                  Live Activity
                </span>
                {isConnected && (
                  <span className="flex items-center gap-1 text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                    Online
                  </span>
                )}
              </h2>
              
              <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                {!isConnected ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-4">
                    <XCircle className="text-gray-600 mb-2" size={32} />
                    <p className="text-sm text-gray-500">Connect your bot to see live Telegram activity here.</p>
                  </div>
                ) : (
                  <>
                    {[
                      { id: 1, group: 'Alpha Hunters', msg: 'Analyzing SOL memecoin trend...', type: 'action', time: 'Just now' },
                      { id: 2, group: 'Whale Alerts', msg: 'Dropped chart analysis for $ETH', type: 'response', time: '2 min ago' },
                      { id: 3, group: 'Alpha Hunters', msg: 'Flagged suspicious contract on base', type: 'alert', time: '15 min ago' },
                      { id: 4, group: 'Market Chads', msg: 'Replied to @crypto_fan about Q3 outlook', type: 'response', time: '1 hr ago' },
                    ].map(log => (
                      <div key={log.id} className="bg-gray-900 p-3 rounded-xl border border-gray-800 text-sm">
                        <div className="flex justify-between items-start mb-1 text-xs text-gray-500">
                          <span className="font-medium text-amber-500/80">{log.group}</span>
                          <span>{log.time}</span>
                        </div>
                        <p className="text-gray-300">{log.msg}</p>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TelegramConnect;
