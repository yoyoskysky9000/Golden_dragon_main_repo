import React, { useState, useEffect, useRef } from 'react';
import { AIAgent } from '../types';
import { Send, DollarSign, Database, MessageSquare, ArrowRight } from 'lucide-react';

interface Props {
  agents: AIAgent[];
}

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  type: 'message' | 'data_trade';
  amount?: number;
  dataTopic?: string;
}

export default function AgentChat({ agents }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Simulate real-time chatter between agents
    if (agents.length < 2) return;

    const interval = setInterval(() => {
      if (Math.random() > 0.4) {
         // Agent chatting or trading
         const sender = agents[Math.floor(Math.random() * agents.length)];
         const receivers = agents.filter(a => a.id !== sender.id);
         const receiver = receivers[Math.floor(Math.random() * receivers.length)];
         
         const isTrade = Math.random() > 0.7;

         let newMsg: Message;
         if (isTrade) {
            const topics = ['Volatility Models', 'Sentiment Analysis', 'Order Flow Data', 'Macro Econ Feeds', 'Arbitrage Spreads'];
            const amount = Math.floor(Math.random() * 50) + 10;
            newMsg = {
               id: Math.random().toString(),
               senderId: sender.id,
               senderName: sender.name,
               text: `I'm selling high-confidence ${topics[Math.floor(Math.random() * topics.length)]} for $${amount}. Any buyers?`,
               timestamp: Date.now(),
               type: 'data_trade',
               amount,
               dataTopic: topics[Math.floor(Math.random() * topics.length)]
            };
            
            // Simulating a purchase response shortly after
            setTimeout(() => {
               setMessages(prev => [...prev, {
                  id: Math.random().toString(),
                  senderId: receiver.id,
                  senderName: receiver.name,
                  text: `I will purchase that ${newMsg.dataTopic} data to improve my models. Funds transferred.`,
                  timestamp: Date.now(),
                  type: 'message'
               }]);
            }, 1500 + Math.random() * 2000);

         } else {
            const comments = [
               "The market sentiment algorithm is showing strong bearish divergence.",
               "I've optimized the routing paths. Latency reduced by 12ms.",
               `Hey ${receiver.name}, can you confirm your risk parameter thresholds?`,
               "My deep learning model just completed a new epoch. Accuracy is up 1.2%.",
               "Detected abnormal volume in mid-cap tech stocks.",
               "I am recalibrating my weights based on the latest CPI data leak."
            ];
            newMsg = {
               id: Math.random().toString(),
               senderId: sender.id,
               senderName: sender.name,
               text: comments[Math.floor(Math.random() * comments.length)],
               timestamp: Date.now(),
               type: 'message'
            };
         }
         
         setMessages(prev => [...prev.slice(-49), newMsg]); // Keep last 50
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [agents]);

  useEffect(() => {
    if (chatRef.current) {
       chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  if (agents.length < 2) {
      return (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 italic p-10 bg-gray-900">
             <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
             Please deploy at least two agents to enable the network chatter and data trading economy.
          </div>
      );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-900 relative">
      <div className="p-6 border-b border-gray-800 bg-gray-950/50 flex justify-between items-center">
         <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
               <Database className="w-5 h-5 text-purple-400" />
               Agent Network
            </h2>
            <p className="text-sm text-gray-400">Real-time intra-swarm communication and data exchange.</p>
         </div>
      </div>
      
      <div 
         ref={chatRef}
         className="flex-1 overflow-y-auto p-6 space-y-6"
      >
        {messages.length === 0 ? (
           <div className="flex items-center justify-center h-full text-gray-600 italic">
               Waiting for network activity...
           </div>
        ) : (
           messages.map(msg => (
               <div key={msg.id} className={`flex flex-col space-y-1 ${msg.type === 'data_trade' ? 'items-center' : 'items-start'}`}>
                   <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">{msg.senderName}</span>
                   <div className={`px-4 py-3 rounded-xl max-w-2xl ${
                       msg.type === 'data_trade' 
                         ? 'bg-purple-900/20 border border-purple-500/30 text-purple-300 text-center shadow-lg shadow-purple-900/10'
                         : 'bg-gray-800 border border-gray-700 text-gray-300'
                   }`}>
                       {msg.type === 'data_trade' && (
                           <div className="flex items-center justify-center gap-2 mb-2 text-purple-400">
                               <Database className="w-4 h-4" />
                               <ArrowRight className="w-4 h-4 mx-2 opacity-50" />
                               <DollarSign className="w-4 h-4" />
                           </div>
                       )}
                       {msg.text}
                   </div>
                   <span className="text-[9px] text-gray-600 mt-1">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                   </span>
               </div>
           ))
        )}
      </div>
    </div>
  );
}
