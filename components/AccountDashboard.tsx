import React, { useEffect, useState } from 'react';
import { UserAccount } from '../types';
import { auth, db, handleFirestoreError, signInWithGoogle, signOut, OperationType, ensureUserAccount } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { LogIn, LogOut, Wallet, Target, Cpu, Flame, Database, Plus, ShieldCheck } from 'lucide-react';

interface AccountDashboardProps {
  addNotification: (title: string, message: string, type: 'success' | 'alert') => void;
}

const AccountDashboard: React.FC<AccountDashboardProps> = ({ addNotification }) => {
    const [user, setUser] = useState<any>(null);
    const [account, setAccount] = useState<UserAccount | null>(null);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                await ensureUserAccount(currentUser.uid, currentUser.email);
            } else {
                setAccount(null);
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!user) return;
        setLoading(true);
        const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (doc) => {
            if (doc.exists()) {
                setAccount({ id: doc.id, ...doc.data() } as UserAccount);
            }
            setLoading(false);
        }, (error) => {
            handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const handleUpdatePlan = async (planType: 'free' | 'subscription' | 'staking', stakeAmount?: number) => {
        if (!user) return;
        try {
            const updates: any = {
                planType,
                updatedAt: serverTimestamp()
            };
            if (planType === 'staking' && stakeAmount) {
                updates.stakedAmount = stakeAmount;
            } else if (planType !== 'staking') {
                updates.stakedAmount = 0;
            }
            
            // Just for demonstration, if you go to a paid plan we give some mock gas.
            if (planType === 'subscription') updates.gasBalance = 1000;
            if (planType === 'staking') updates.gasBalance = (stakeAmount || 0) * 0.1;

            await updateDoc(doc(db, 'users', user.uid), updates);
            addNotification('Plan Updated', `Successfully changed your plan to ${planType.toUpperCase()}`, 'success');
        } catch (error) {
            addNotification('Update Failed', 'Failed to update plan.', 'alert');
            handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
        }
    };

    const handleToggleSelling = async () => {
        if (!user || !account) return;
        try {
            await updateDoc(doc(db, 'users', user.uid), {
                isSellingData: !account.isSellingData,
                updatedAt: serverTimestamp()
            });
            addNotification('Data Selling', `Data selling is now ${!account.isSellingData ? 'ENABLED' : 'DISABLED'}.`, 'success');
        } catch (error) {
            handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
        }
    }

    if (!user) {
        return (
            <div className="flex-1 overflow-y-auto bg-[#050510] text-gray-300 p-8 flex items-center justify-center">
                <div className="max-w-md w-full bg-[#0a0a18]/70 border border-indigo-900/30 rounded-2xl p-8 text-center backdrop-blur-md">
                    <Wallet className="w-16 h-16 text-indigo-500 mx-auto mb-6" />
                    <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-2">Connect Identity</h2>
                    <p className="text-gray-400 mb-8 text-sm">Sign in to manage your compute gas, staking, and data monetization.</p>
                    <button 
                        onClick={signInWithGoogle}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors uppercase tracking-widest text-sm"
                    >
                        <LogIn className="w-4 h-4" /> Sign In with Google
                    </button>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center text-indigo-500 bg-[#050510]">
                <Cpu className="w-12 h-12 animate-pulse" />
            </div>
        )
    }

    return (
        <div className="flex-1 overflow-y-auto bg-[#050510] text-gray-300 p-8 flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-1 flex items-center gap-2">
                        <Wallet className="w-6 h-6 text-indigo-500" /> Account & Yield
                    </h2>
                    <p className="text-gray-500 text-sm">{user.email}</p>
                </div>
                <button 
                    onClick={signOut}
                    className="p-3 bg-gray-900 rounded-xl hover:bg-gray-800 text-gray-400 hover:text-white transition-colors border border-gray-800 flex items-center gap-2 text-xs font-bold uppercase tracking-widest"
                >
                    <LogOut className="w-4 h-4" /> Sign Out
                </button>
            </div>

            {account && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Gas Balance */}
                    <div className="col-span-1 bg-[#0a0a18]/70 border border-indigo-900/30 rounded-xl p-6 relative overflow-hidden backdrop-blur-md">
                        <div className="absolute top-0 right-0 p-6 opacity-5"><Flame className="w-32 h-32 text-amber-500" /></div>
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <Flame className="w-4 h-4 text-amber-500" /> Compute Gas
                        </h3>
                        <div className="relative z-10">
                            <div className="text-5xl font-black text-amber-500 tracking-tighter shadow-amber-500/20 drop-shadow-lg flex items-baseline gap-2">
                                {account.gasBalance > 0 ? account.gasBalance.toFixed(0) : '0'}
                                <span className="text-sm text-gray-500 tracking-normal">GAS</span>
                            </div>
                            <p className="text-gray-500 text-xs mt-4 leading-relaxed">
                                Gas is required to run high-frequency strategies and use AI oracle data. Refill by subscribing or staking.
                            </p>
                        </div>
                    </div>

                    {/* Subscription Plan */}
                    <div className={`col-span-1 bg-[#0a0a18]/70 border ${account.planType === 'subscription' ? 'border-indigo-500 shadow-lg shadow-indigo-500/20' : 'border-gray-800'} rounded-xl p-6 relative backdrop-blur-md transition-all`}>
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Target className={`w-4 h-4 ${account.planType === 'subscription' ? 'text-indigo-400' : 'text-gray-500'}`} /> Subscription
                        </h3>
                        <div className="mb-6">
                            <div className="text-3xl font-black text-white flex items-baseline gap-1">
                                $99<span className="text-sm text-gray-500 font-normal">/mo</span>
                            </div>
                            <p className="text-xs text-gray-400 mt-2">1000 GAS per month.</p>
                        </div>
                        {account.planType === 'subscription' ? (
                            <button className="w-full py-3 rounded-lg bg-indigo-500/20 text-indigo-400 font-bold text-xs uppercase tracking-widest cursor-default flex justify-center items-center gap-2">
                                <ShieldCheck className="w-4 h-4" /> Active Plan
                            </button>
                        ) : (
                            <button 
                                onClick={() => handleUpdatePlan('subscription')}
                                className="w-full py-3 rounded-lg bg-gray-800 hover:bg-indigo-600 text-white font-bold text-xs uppercase tracking-widest transition-colors flex justify-center items-center gap-2"
                            >
                                <Plus className="w-4 h-4" /> Upgrade
                            </button>
                        )}
                    </div>

                    {/* Staking Plan */}
                    <div className={`col-span-1 bg-[#0a0a18]/70 border ${account.planType === 'staking' ? 'border-emerald-500 shadow-lg shadow-emerald-500/20' : 'border-gray-800'} rounded-xl p-6 relative backdrop-blur-md transition-all`}>
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Database className={`w-4 h-4 ${account.planType === 'staking' ? 'text-emerald-400' : 'text-gray-500'}`} /> Staking
                        </h3>
                        <div className="mb-6">
                            <div className="text-3xl font-black text-white flex items-baseline gap-1">
                                5,000<span className="text-sm text-gray-500 font-normal">COIN</span>
                            </div>
                            <p className="text-xs text-gray-400 mt-2">Generate GAS passively by staking. (10% Yield)</p>
                        </div>
                        {account.planType === 'staking' ? (
                            <button className="w-full py-3 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold text-xs uppercase tracking-widest cursor-default flex justify-center items-center gap-2">
                                <ShieldCheck className="w-4 h-4" /> Currently Staking
                            </button>
                        ) : (
                            <button 
                                onClick={() => handleUpdatePlan('staking', 5000)}
                                className="w-full py-3 rounded-lg bg-gray-800 hover:bg-emerald-600 text-white font-bold text-xs uppercase tracking-widest transition-colors flex justify-center items-center gap-2"
                            >
                                <Plus className="w-4 h-4" /> Stake Now
                            </button>
                        )}
                    </div>

                    {/* Data Monetization */}
                    <div className="col-span-1 md:col-span-3 bg-[#0a0a18]/70 border border-fuchsia-900/30 rounded-xl p-6 mt-4 backdrop-blur-md flex flex-col md:flex-row items-center justify-between">
                        <div>
                            <h3 className="text-lg font-black text-fuchsia-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                Data Monetization
                            </h3>
                            <p className="text-sm text-gray-400 max-w-2xl">
                                Allow other users to subscribe to your proprietary alternative data streams or model outputs. Earn GAS or USD when users consume your feeds via the decentralized Data Marketplace.
                            </p>
                        </div>
                        <div className="mt-6 md:mt-0">
                            <button 
                                onClick={handleToggleSelling}
                                className={`px-8 py-4 rounded-xl font-bold uppercase tracking-widest text-sm transition-all shadow-lg ${account.isSellingData ? 'bg-fuchsia-500 text-white shadow-fuchsia-500/30' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                            >
                                {account.isSellingData ? 'Monetization Active' : 'Enable Monetization'}
                            </button>
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
};

export default AccountDashboard;
