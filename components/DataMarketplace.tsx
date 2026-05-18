import React, { useEffect, useState } from 'react';
import { DataListing } from '../types';
import { db, auth, handleFirestoreError, OperationType, createDataListing } from '../services/firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { Database, TrendingUp, Search, Plus, Filter, Users, Tag, AlertTriangle } from 'lucide-react';

import { DataSource } from '../types';

interface DataMarketplaceProps {
  addNotification: (title: string, message: string, type: 'success' | 'alert') => void;
  onAddDataSource?: (source: Partial<DataSource>) => void;
  onUpdateDataSource?: (source: DataSource) => void;
  onDeleteDataSource?: (id: string) => void;
  userDataSources?: DataSource[];
}

const DataMarketplace: React.FC<DataMarketplaceProps> = ({ 
  addNotification, 
  onAddDataSource, 
  onUpdateDataSource, 
  onDeleteDataSource,
  userDataSources = []
}) => {
    const [listings, setListings] = useState<DataListing[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);

    // New Listing Form State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState(10);
    const [currency, setCurrency] = useState<'USD'|'GAS_CO1N'>('GAS_CO1N');

    useEffect(() => {
        // We do not require auth to list active items based on our rules, but we require auth to actually interact.
        // Wait till auth is ready or just load if they are signed in.
        const unsubscribeAuth = auth.onAuthStateChanged((user) => {
             if (user && user.emailVerified) {
                const q = query(collection(db, 'dataMarketplace'), where('status', '==', 'active'));
                const unsubscribe = onSnapshot(q, (snapshot) => {
                    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DataListing));
                    setListings(data);
                    setLoading(false);
                }, (error) => {
                    handleFirestoreError(error, OperationType.LIST, 'dataMarketplace');
                    setLoading(false);
                });
                return () => unsubscribe();
             } else {
                 setLoading(false);
             }
        });

        return () => unsubscribeAuth();
    }, []);

    const handleCreateListing = async (e: React.FormEvent) => {
        e.preventDefault();
        const user = auth.currentUser;
        if (!user) {
            addNotification('Auth Required', 'You must be signed in to create a listing.', 'alert');
            return;
        }
        
        try {
            await createDataListing(user.uid, {
                title,
                description,
                price,
                currency,
                status: 'active',
                buyersCount: 0
            });
            setShowCreate(false);
            setTitle('');
            setDescription('');
            setPrice(10);
            addNotification('Listing Created', 'Your data source is now live on the marketplace.', 'success');
        } catch(error) {
            handleFirestoreError(error, OperationType.CREATE, 'dataMarketplace');
            addNotification('Creation Failed', 'Could not create listing.', 'alert');
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-[#050510]">
                <div className="text-gray-500 flex flex-col items-center gap-4">
                    <Database className="w-8 h-8 animate-bounce text-fuchsia-500" />
                    <span className="text-sm font-bold uppercase tracking-widest">Loading Marketplace...</span>
                </div>
            </div>
        );
    }

    if (!auth.currentUser) {
        return (
            <div className="flex-1 flex items-center justify-center bg-[#050510]">
                <div className="max-w-md bg-[#0a0a18] border border-fuchsia-900/30 rounded-2xl p-8 text-center text-gray-400">
                    <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-white mb-2">Authentication Required</h2>
                    <p className="text-sm">Please connect your identity via the Account tab to access the decentralized data marketplace.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-[#050510] relative">
            {/* Header */}
            <div className="bg-[#0a0a18] border-b border-fuchsia-900/30 p-6 z-10 sticky top-0">
                <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tighter flex items-center gap-3">
                            <Database className="w-8 h-8 text-fuchsia-500" /> DATA MARKETPLACE
                        </h1>
                        <p className="text-gray-400 text-sm mt-1">Buy and sell premium alternative data streams.</p>
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                         <button 
                            onClick={() => setShowCreate(!showCreate)}
                            className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white px-5 py-2.5 rounded-lg font-bold text-sm transition-colors flex items-center gap-2 whitespace-nowrap"
                        >
                            {showCreate ? 'Browse Offerings' : <><Plus className="w-4 h-4" /> Sell Data</>}
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-6 max-w-6xl mx-auto w-full">
                
                {showCreate ? (
                    <div className="bg-[#0a0a18]/80 border border-fuchsia-900/40 rounded-2xl p-8 backdrop-blur-md max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <h2 className="text-xl font-black text-white uppercase tracking-widest mb-6 border-b border-gray-800 pb-4">Create New Data Listing</h2>
                        <form onSubmit={handleCreateListing} className="space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Title</label>
                                <input 
                                    type="text" 
                                    value={title} 
                                    onChange={(e) => setTitle(e.target.value)}
                                    required 
                                    maxLength={200}
                                    placeholder="e.g., Global Shipping Container NLP Analysis"
                                    className="w-full bg-[#050510] border border-gray-800 rounded-lg p-3 text-white focus:outline-none focus:border-fuchsia-500 transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Description</label>
                                <textarea 
                                    value={description} 
                                    onChange={(e) => setDescription(e.target.value)}
                                    required 
                                    maxLength={1000}
                                    rows={4}
                                    placeholder="Detail what insight this data provides..."
                                    className="w-full bg-[#050510] border border-gray-800 rounded-lg p-3 text-white focus:outline-none focus:border-fuchsia-500 transition-colors resize-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Price / Month</label>
                                    <input 
                                        type="number" 
                                        value={price} 
                                        onChange={(e) => setPrice(Number(e.target.value))}
                                        required 
                                        min={0}
                                        step="0.01"
                                        className="w-full bg-[#050510] border border-gray-800 rounded-lg p-3 text-white focus:outline-none focus:border-fuchsia-500 transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Currency</label>
                                    <select 
                                        value={currency} 
                                        onChange={(e) => setCurrency(e.target.value as 'USD' | 'GAS_CO1N')}
                                        className="w-full bg-[#050510] border border-gray-800 rounded-lg p-3 text-white focus:outline-none focus:border-fuchsia-500 transition-colors"
                                    >
                                        <option value="GAS_CO1N">GAS CO1N</option>
                                        <option value="USD">USD</option>
                                    </select>
                                </div>
                            </div>
                            <div className="pt-4 border-t border-gray-800 flex justify-end gap-3">
                                <button type="button" onClick={() => setShowCreate(false)} className="px-6 py-3 rounded-lg text-gray-400 hover:text-white font-bold text-sm transition-colors">Cancel</button>
                                <button type="submit" className="px-6 py-3 bg-fuchsia-600 hover:bg-fuchsia-500 text-white rounded-lg font-bold text-sm transition-colors">Publish Listing</button>
                            </div>
                        </form>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {listings.map(listing => (
                            <div key={listing.id} className="bg-[#0a0a18]/70 border border-gray-800 hover:border-fuchsia-500/50 rounded-xl p-6 transition-all group flex flex-col h-full">
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-lg font-black text-white leading-tight">{listing.title}</h3>
                                    <div className="bg-fuchsia-500/10 text-fuchsia-400 px-2.5 py-1 rounded-md text-xs font-bold border border-fuchsia-500/20 whitespace-nowrap ml-4">
                                        {listing.price} {listing.currency}
                                    </div>
                                </div>
                                <p className="text-sm text-gray-400 mb-6 flex-1 line-clamp-3">{listing.description}</p>
                                
                                <div className="mt-auto pt-4 border-t border-gray-800/50 flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-xs text-gray-500 font-bold">
                                        <Users className="w-3.5 h-3.5" /> {listing.buyersCount} Subs
                                    </div>
                                    {(() => {
                                        const isSubscribed = userDataSources.find(ds => ds.marketplaceListingId === listing.id);
                                        return isSubscribed ? (
                                            <button 
                                                className="px-4 py-2 bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/20 hover:border-rose-600 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2"
                                                onClick={() => {
                                                    if (onDeleteDataSource) onDeleteDataSource(isSubscribed.id);
                                                    addNotification('Unsubscribed', `You have unsubscribed from ${listing.title}`, 'alert');
                                                }}
                                            >
                                                Unsubscribe
                                            </button>
                                        ) : (
                                            <button 
                                                className="px-4 py-2 bg-gray-800 group-hover:bg-fuchsia-600 text-gray-400 group-hover:text-white rounded-lg text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2"
                                                onClick={() => {
                                                    if (onAddDataSource) {
                                                        onAddDataSource({
                                                            name: listing.title,
                                                            type: 'external_api',
                                                            status: 'connected',
                                                            priority: 50,
                                                            dependencies: [],
                                                            marketplaceListingId: listing.id,
                                                            lastData: 'Awaiting data from marketplace...'
                                                        } as any);
                                                    }
                                                    addNotification('Subscribed', `You are now receiving data from ${listing.title}`, 'success');
                                                }}
                                            >
                                                <Tag className="w-3.5 h-3.5" /> Subscribe
                                            </button>
                                        );
                                    })()}
                                </div>
                            </div>
                        ))}
                        {listings.length === 0 && (
                            <div className="col-span-full py-20 text-center text-gray-500">
                                <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p className="text-lg">No active data listings found.</p>
                                <p className="text-sm mt-2">Be the first to monetize your proprietary data streams.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DataMarketplace;
