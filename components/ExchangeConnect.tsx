import React, { useState, useEffect } from 'react';
import { PlugZap, CheckCircle2, AlertCircle, Loader2, Key, Shield, RefreshCw, Wallet, Settings } from 'lucide-react';
import { auth, db } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { verify as verifyTotp } from 'otplib';

interface Exchange {
  id: string;
  name: string;
  logo: string;
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  assets?: { symbol: string; amount: number; value: number }[];
}

const initialExchanges: Exchange[] = [
  { id: 'binance', name: 'Binance', logo: 'BNB', status: 'disconnected' },
  { id: 'coinbase', name: 'Coinbase', logo: 'COIN', status: 'disconnected' },
  { id: 'kraken', name: 'Kraken', logo: 'KRK', status: 'disconnected' },
  { id: 'alpaca', name: 'Alpaca', logo: 'ALP', status: 'disconnected' },
  { id: 'polymarket', name: 'Polymarket', logo: 'POLY', status: 'disconnected' },
  { id: 'kalshi', name: 'Kalshi', logo: 'KAL', status: 'disconnected' },
];

interface ExchangeConnectProps {
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export default function ExchangeConnect({ onConnect, onDisconnect }: ExchangeConnectProps) {
  const [exchanges, setExchanges] = useState<Exchange[]>(initialExchanges);
  const [selectedExchange, setSelectedExchange] = useState<Exchange | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showMfaPrompt, setShowMfaPrompt] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [userMfaSecret, setUserMfaSecret] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const d = await getDoc(doc(db, 'users', user.uid));
        if (d.exists() && d.data().mfaEnabled && d.data().mfaSecret) {
          setUserMfaSecret(d.data().mfaSecret);
        } else {
          setUserMfaSecret(null);
        }
      } else {
        setUserMfaSecret(null);
      }
    });
    return unsub;
  }, []);

  React.useEffect(() => {
    const autoConnect = async () => {
      const updatedExchanges = [...initialExchanges];
      let hasUpdates = false;

      for (let i = 0; i < updatedExchanges.length; i++) {
        const ex = updatedExchanges[i];
        const saved = localStorage.getItem(`exchange_creds_${ex.id}`);
        if (saved) {
          try {
            const { key, secret } = JSON.parse(saved);
            if (key && secret) {
              updatedExchanges[i].status = 'connecting';
              hasUpdates = true;
            }
          } catch (e) {
            // ignore
          }
        }
      }

      if (hasUpdates) {
        setExchanges([...updatedExchanges]);
      }

      for (let i = 0; i < updatedExchanges.length; i++) {
        const ex = updatedExchanges[i];
        const saved = localStorage.getItem(`exchange_creds_${ex.id}`);
        if (saved) {
          try {
            const { key, secret } = JSON.parse(saved);
            if (key && secret) {
              try {
                const response = await fetch('/api/exchange/connect', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ exchangeId: ex.id, apiKey: key, apiSecret: secret }),
                });
                const data = await response.json();
                if (data.success) {
                  setExchanges(current => current.map(c => c.id === ex.id ? { ...c, status: 'connected', assets: data.assets } : c));
                  if (onConnect) onConnect();
                } else {
                  setExchanges(current => current.map(c => c.id === ex.id ? { ...c, status: 'error' } : c));
                }
              } catch (err) {
                setExchanges(current => current.map(c => c.id === ex.id ? { ...c, status: 'error' } : c));
              }
            }
          } catch (e) {
            // ignore
          }
        }
      }
    };

    autoConnect();
  }, []);

  const handleSelectExchange = (ex: Exchange) => {
    setSelectedExchange(ex);
    const saved = localStorage.getItem(`exchange_creds_${ex.id}`);
    if (saved) {
      try {
        const { key, secret } = JSON.parse(saved);
        setApiKey(key);
        setApiSecret(secret);
        setRememberMe(true);
      } catch (e) {
        setApiKey('');
        setApiSecret('');
        setRememberMe(false);
      }
    } else {
      setApiKey('');
      setApiSecret('');
      setRememberMe(true);
    }
  };

  const handleConnect = async () => {
    if (!selectedExchange || !apiKey || !apiSecret) return;

    if (userMfaSecret && !showMfaPrompt) {
        setShowMfaPrompt(true);
        return;
    }

    if (userMfaSecret && showMfaPrompt) {
        setIsConnecting(true);
        const result = await verifyTotp({ token: mfaCode, secret: userMfaSecret });
        if (!result.valid) {
            alert('Invalid 2FA Code');
            setIsConnecting(false);
            return;
        }
        setShowMfaPrompt(false);
        setMfaCode('');
    }
    
    setIsConnecting(true);
    
    // Always save if rememberMe is checked, even before testing connection
    if (rememberMe) {
      localStorage.setItem(`exchange_creds_${selectedExchange.id}`, JSON.stringify({ key: apiKey, secret: apiSecret }));
    } else {
      localStorage.removeItem(`exchange_creds_${selectedExchange.id}`);
    }
    
    try {
      const response = await fetch('/api/exchange/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          exchangeId: selectedExchange.id,
          apiKey,
          apiSecret,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setExchanges(current => current.map(ex => {
          if (ex.id === selectedExchange.id) {
            return {
              ...ex,
              status: 'connected',
              assets: data.assets
            };
          }
          return ex;
        }));
        setSelectedExchange(null);
        setApiKey('');
        setApiSecret('');
        if (onConnect) onConnect();
      } else {
        alert(`Connection failed: ${data.error}\n\nNote: Your API keys have been saved locally if 'Remember Me' was checked, but the connection test failed. This may be due to IP restrictions or invalid permissions.`);
        setExchanges(current => current.map(ex => 
          ex.id === selectedExchange.id ? { ...ex, status: 'error' } : ex
        ));
      }
    } catch (error) {
      console.error('Connection error:', error);
      alert('Failed to connect to exchange. Your keys were saved locally if "Remember Me" was checked.');
      setExchanges(current => current.map(ex => 
        ex.id === selectedExchange.id ? { ...ex, status: 'error' } : ex
      ));
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = (id: string) => {
    setExchanges(current => {
      const updated = current.map(ex => 
        ex.id === id ? { ...ex, status: 'disconnected' as const, assets: undefined } : ex
      );
      if (updated.every(ex => ex.status !== 'connected') && onDisconnect) {
        onDisconnect();
      }
      return updated;
    });
  };

  const formatMoney = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-950">
      <div className="p-6 border-b border-gray-800 bg-gray-900/50">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <PlugZap className="w-6 h-6 text-amber-500" />
              Exchange Connections
            </h1>
            <p className="text-sm text-gray-400 mt-1">Connect your external exchange accounts via API keys to manage all assets in one place.</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-400" /> Supported Exchanges
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {exchanges.map(ex => (
              <div key={ex.id} className={`bg-gray-900 border rounded-xl p-5 transition-colors ${ex.status === 'connected' ? 'border-emerald-500/30' : 'border-gray-800 hover:border-gray-700'}`}>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center font-bold text-gray-400 border border-gray-700">
                      {ex.logo}
                    </div>
                    <div>
                      <h3 className="font-bold text-white">{ex.name}</h3>
                      <span className={`text-xs font-medium flex items-center gap-1 ${
                        ex.status === 'connected' ? 'text-emerald-400' : 
                        ex.status === 'connecting' ? 'text-amber-400' : 'text-gray-500'
                      }`}>
                        {ex.status === 'connected' && <CheckCircle2 className="w-3 h-3" />}
                        {ex.status === 'connecting' && <Loader2 className="w-3 h-3 animate-spin" />}
                        {ex.status === 'disconnected' && <AlertCircle className="w-3 h-3" />}
                        {ex.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  {ex.status === 'connected' ? (
                    <button 
                      onClick={() => handleDisconnect(ex.id)}
                      className="text-xs text-rose-400 hover:text-rose-300 bg-rose-500/10 px-2 py-1 rounded"
                    >
                      Disconnect
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleSelectExchange(ex)}
                      disabled={ex.status === 'connecting'}
                      className="text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 px-3 py-1.5 rounded font-bold"
                    >
                      Connect
                    </button>
                  )}
                </div>

                {ex.status === 'connected' && ex.assets && (
                  <div className="mt-4 pt-4 border-t border-gray-800">
                    <div className="text-xs text-gray-500 font-bold uppercase mb-2">Owned Assets</div>
                    <div className="space-y-2">
                      {ex.assets.map(asset => (
                        <div key={asset.symbol} className="flex justify-between items-center bg-gray-950 p-2 rounded border border-gray-800/50">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">{asset.symbol}</span>
                            <span className="text-xs text-gray-500 font-mono">{asset.amount}</span>
                          </div>
                          <span className="text-sm font-medium text-emerald-400">{formatMoney(asset.value)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex justify-between items-center pt-2 border-t border-gray-800/50">
                      <span className="text-xs text-gray-400">Total Value</span>
                      <span className="font-bold text-white">
                        {formatMoney(ex.assets.reduce((sum, a) => sum + a.value, 0))}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-12">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-6">
              <Shield className="w-5 h-5 text-emerald-400" /> Smart Contract Wallet (ERC-4337)
            </h2>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-3xl rounded-full pointer-events-none"></div>
              
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">Non-Custodial Dual-Key Enclave</h3>
                    <p className="text-sm text-gray-400 max-w-2xl">
                      Secure your funds with a programmable smart wallet. You hold the master key, while the AI agent uses a subordinate key secured in a Trusted Execution Environment (TEE).
                    </p>
                  </div>
                  <div className="bg-emerald-500/10 text-emerald-500 px-3 py-1.5 rounded-lg border border-emerald-500/20 text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> SECURE ENCLAVE ACTIVE
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-gray-950 border border-gray-800 rounded-lg p-4">
                    <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-2">Asset Whitelisting</div>
                    <div className="flex flex-wrap gap-2">
                      <span className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded border border-gray-700">BTC</span>
                      <span className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded border border-gray-700">ETH</span>
                      <span className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded border border-gray-700">SPY</span>
                      <button className="text-xs bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors">+ ADD</button>
                    </div>
                  </div>
                  
                  <div className="bg-gray-950 border border-gray-800 rounded-lg p-4">
                    <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-2">Velocity Limits</div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white">Max 10% / 24h</span>
                      <button className="text-gray-500 hover:text-white transition-colors"><Settings className="w-4 h-4" /></button>
                    </div>
                    <div className="w-full bg-gray-800 h-1.5 rounded-full mt-3 overflow-hidden">
                      <div className="bg-emerald-500 h-full w-[25%]"></div>
                    </div>
                    <div className="text-[10px] text-gray-500 mt-1 text-right">2.5% used today</div>
                  </div>

                  <div className="bg-gray-950 border border-gray-800 rounded-lg p-4">
                    <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-2">Threshold Approvals</div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white">Require Auth &gt; $5,000</span>
                      <button className="text-gray-500 hover:text-white transition-colors"><Settings className="w-4 h-4" /></button>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-2">Multi-sig approval required for large transactions.</p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold px-6 py-2.5 rounded-lg transition-colors shadow-lg shadow-emerald-900/20">
                    CONFIGURE ON-CHAIN POLICIES
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Connection Form Sidebar */}
        <div className="space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 sticky top-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-6">
              <Key className="w-5 h-5 text-amber-400" /> API Configuration
            </h2>
            
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <div className="space-y-4 mb-8">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Select Exchange</label>
                  <select
                    value={selectedExchange?.id || ''}
                    onChange={(e) => {
                      const ex = exchanges.find(x => x.id === e.target.value);
                      if (ex) handleSelectExchange(ex);
                      else setSelectedExchange(null);
                    }}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500 text-sm"
                  >
                    <option value="" disabled>Select an exchange...</option>
                    {exchanges.map(ex => (
                      <option key={ex.id} value={ex.id}>{ex.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                    {selectedExchange?.id === 'polymarket' ? 'L1/L2 Key / API Key' : selectedExchange?.id === 'kalshi' ? 'API Key' : 'API Key'}
                  </label>
                  <input 
                    type="text" 
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder={selectedExchange?.id === 'polymarket' ? 'Enter public key or L1/L2 key' : 'Enter public API key'}
                    disabled={!selectedExchange}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500 font-mono text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                    {selectedExchange?.id === 'polymarket' ? 'Passphrase / Secret' : selectedExchange?.id === 'kalshi' ? 'Private Key / Secret' : 'API Secret'}
                  </label>
                  <input 
                    type="password" 
                    value={apiSecret}
                    onChange={e => setApiSecret(e.target.value)}
                    placeholder={selectedExchange?.id === 'kalshi' ? 'Enter private key or secret' : 'Enter secret key'}
                    disabled={!selectedExchange}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500 font-mono text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                
                <div className="flex items-center gap-2 mt-2">
                  <input 
                    type="checkbox" 
                    id="rememberMe"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    disabled={!selectedExchange}
                    className="w-4 h-4 rounded border-gray-800 bg-gray-950 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-gray-900 disabled:opacity-50"
                  />
                  <label htmlFor="rememberMe" className={`text-sm cursor-pointer select-none ${!selectedExchange ? 'text-gray-600' : 'text-gray-400'}`}>
                    Remember Me
                  </label>
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mt-4">
                <p className="text-xs text-amber-400 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  Keys are encrypted locally. Ensure your API keys have "Read-Only" or "Trade" permissions only. Do not enable "Withdrawal" access.
                </p>
              </div>

              <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-3 mt-2">
                <p className="text-xs text-indigo-400 flex items-start gap-2">
                  <PlugZap className="w-4 h-4 shrink-0 mt-0.5" />
                  Don't have API keys? Enter "demo" for both Key and Secret to test the connection with simulated assets.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                {showMfaPrompt ? (
                  <div className="flex-1 flex flex-col gap-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">Enter 2FA Code</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="000 000"
                            value={mfaCode}
                            onChange={(e) => setMfaCode(e.target.value)}
                            className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500 font-mono text-sm tracking-widest text-center"
                            maxLength={6}
                        />
                        <button 
                            onClick={handleConnect}
                            disabled={mfaCode.length < 6 || isConnecting}
                            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg px-4 font-bold transition-colors text-sm"
                        >
                            {isConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify'}
                        </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button 
                      onClick={() => {
                        setSelectedExchange(null);
                        setApiKey('');
                        setApiSecret('');
                      }}
                      disabled={!selectedExchange}
                      className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-bold transition-colors text-sm"
                    >
                      Clear
                    </button>
                    <button 
                      onClick={handleConnect}
                      disabled={!selectedExchange || !apiKey || !apiSecret || isConnecting}
                      className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-bold transition-colors flex items-center justify-center gap-2 text-sm shadow-lg shadow-indigo-900/20"
                    >
                      {isConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlugZap className="w-4 h-4" />}
                      Connect & Save
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
