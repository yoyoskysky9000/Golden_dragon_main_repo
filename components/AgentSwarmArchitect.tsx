import React, { useState, useEffect } from 'react';
import { 
  Network, BrainCircuit, Database, Cpu, Plus, X, 
  Trash2, Play, GitMerge, FileText, CheckCircle2, ChevronRight, Activity, 
  Settings, Loader2
} from 'lucide-react';
import { AIAgent, DataSource, AgentTask } from '../types';
import { simulateAgentTraining } from '../services/geminiService';

interface Props {
  agents: AIAgent[];
  setAgents: React.Dispatch<React.SetStateAction<AIAgent[]>>;
  dataSources: DataSource[];
  tasks?: AgentTask[];
  setTasks?: React.Dispatch<React.SetStateAction<AgentTask[]>>;
}

export default function AgentSwarmArchitect({ agents, setAgents, dataSources, tasks = [], setTasks }: Props) {
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [isSwarmModeActive, setIsSwarmModeActive] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [viewMode, setViewMode] = useState<'agents' | 'taskGraph'>('agents');
  const [newAgent, setNewAgent] = useState<Partial<AIAgent>>({
    name: '',
    role: 'Sector Analyst',
    model: 'gemini-3.1-pro-preview',
    trainingDataSources: [],
    systemPrompt: '',
    parentAgentId: null,
    status: 'idle',
    accuracyScore: 0
  });

  const selectedAgent = agents.find(a => a.id === selectedAgentId);

  // Auto-enable swarm mode on load if conditions are met
  useEffect(() => {
    if (agents.some(a => a.status === 'ready' || a.status === 'idle')) {
      setIsSwarmModeActive(true);
    }
  }, []);

  // Swarm execution loop
  useEffect(() => {
    if (!isSwarmModeActive || !setTasks) return;

    const interval = setInterval(() => {
      setTasks(prevTasks => {
        let changed = false;
        const newTasks = prevTasks.map(task => {
          // If task is ready to start
          if (task.status === 'todo') {
            const depsMet = task.dependencies ? task.dependencies.every(depId => prevTasks.find(t => t.id === depId)?.status === 'completed') : true;
            if (depsMet) {
              changed = true;
              return { ...task, status: 'in_progress' as const };
            }
          }
          // If task is running, give it a chance to complete
          else if (task.status === 'in_progress') {
            if (Math.random() < 0.2) { // 20% chance to finish per tick
              changed = true;
              return { ...task, status: 'completed' as const };
            }
          }
          return task;
        });
        return changed ? newTasks : prevTasks;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [isSwarmModeActive, setTasks]);

  const handleCreateAgent = () => {
    if (!newAgent.name || !newAgent.role) return;
    
    const agent: AIAgent = {
      ...(newAgent as AIAgent),
      id: `agent_${Date.now()}`,
      status: 'idle',
      accuracyScore: 85 + Math.random() * 10
    };

    setAgents(prev => [...prev, agent]);
    setIsCreating(false);
    setSelectedAgentId(agent.id);
    
    // Reset form
    setNewAgent({
      name: '',
      role: 'Sector Analyst',
      model: 'gemini-3.1-pro-preview',
      trainingDataSources: [],
      systemPrompt: '',
      parentAgentId: null,
      status: 'idle',
      accuracyScore: 0
    });
  };

  const handleTrainAgent = async (agentId: string) => {
    setAgents(prev => prev.map(a => a.id === agentId ? { ...a, status: 'training', trainingProgress: 0 } : a));
    
    // Simulate training process that could use the Kalshi or Coinbase datasets
    const finishTraining = await simulateAgentTraining(agentId, (progress) => {
      setAgents(prev => prev.map(a => a.id === agentId ? { ...a, trainingProgress: progress } : a));
    });

    setAgents(prev => prev.map(a => {
      if (a.id === agentId) {
        let accuracyBoost = Math.random() * 5;
        // Formulate a data source improvement factor
        if (a.trainingDataSources && a.trainingDataSources.length > 0) {
           const factor = a.trainingDataSources.reduce((sum, ds) => sum + (ds.priority / 100), 0);
           accuracyBoost += factor * 2; // Extra boost for having high priority data sources
        }
        return { 
          ...a, 
          status: 'ready', 
          trainingProgress: 100,
          accuracyScore: Math.min(99.9, a.accuracyScore + accuracyBoost),
          lastTrainedAt: Date.now()
        };
      }
      return a;
    }));
  };

  // Build tree organization
  const renderAgentTree = (parentId: string | null, depth = 0) => {
    const children = agents.filter(a => a.parentAgentId === parentId);
    
    return (
      <div className={`space-y-3 ${depth > 0 ? 'ml-6 border-l border-gray-700 pl-4' : ''}`}>
        {children.map(agent => (
          <div key={agent.id}>
            <div 
              onClick={() => setSelectedAgentId(agent.id)}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                selectedAgentId === agent.id 
                  ? 'bg-purple-500/10 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.15)] ring-1 ring-purple-500/30' 
                  : 'bg-gray-800 border-gray-700 hover:border-gray-600 hover:bg-gray-750'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${
                    agent.role === 'Master Strategist' ? 'bg-amber-500/20 text-amber-500' :
                    agent.role === 'Risk Manager' ? 'bg-red-500/20 text-red-500' :
                    agent.role === 'Data Engineer' ? 'bg-blue-500/20 text-blue-500' :
                    'bg-cyan-500/20 text-cyan-500'
                  }`}>
                    {agent.role === 'Master Strategist' ? <BrainCircuit className="w-4 h-4" /> :
                     agent.role === 'Data Engineer' ? <Database className="w-4 h-4" /> :
                     <Cpu className="w-4 h-4" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white leading-tight">{agent.name}</h3>
                    <div className="text-[10px] text-gray-400">{agent.role}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                    agent.status === 'ready' ? 'bg-emerald-500/20 text-emerald-400' :
                    agent.status === 'training' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-gray-700 text-gray-400'
                  }`}>
                    {agent.status}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleTrainAgent(agent.id); }}
                    disabled={agent.status === 'training'}
                    className="flex justify-center items-center px-2 py-1 gap-1 rounded bg-emerald-600/20 hover:bg-emerald-500/40 text-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 transition-colors text-[10px] font-bold uppercase tracking-wider"
                    title="Train Agent"
                  >
                    {agent.status === 'training' ? (
                      <><Loader2 className="w-3 h-3 animate-spin" /> Tuning</>
                    ) : (
                      <><Play className="w-3 h-3" /> Train Agent</>
                    )}
                  </button>
                </div>
              </div>

              {agent.status === 'training' && agent.trainingProgress !== undefined && (
                <div className="mt-2">
                  <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-300"
                      style={{ width: `${agent.trainingProgress}%` }}
                    />
                  </div>
                  <div className="text-[9px] text-gray-400 text-right mt-1 font-mono">
                    Training {agent.trainingProgress.toFixed(0)}%
                  </div>
                </div>
              )}
            </div>
            {/* Recursively render children */}
            {renderAgentTree(agent.id, depth + 1)}
          </div>
        ))}
      </div>
    );
  };

  // Topological grouping for tasks
  const renderTaskGraph = () => {
    if (!tasks || tasks.length === 0) {
      return (
        <div className="flex-1 h-full flex items-center justify-center flex-col text-gray-500 bg-gray-900 border-l border-gray-800">
          <GitMerge className="w-16 h-16 text-gray-800 mb-4" />
          <div className="text-lg font-bold text-gray-600">No Tasks Discovered</div>
          <div className="text-sm">Switch to the Tasks view and create some execution steps.</div>
        </div>
      );
    }

    // Calculate depths
    const depths = new Map<string, number>();
    const getDepth = (id: string, visited: Set<string> = new Set()): number => {
      if (depths.has(id)) return depths.get(id)!;
      if (visited.has(id)) return 0; // circular dependency safe
      visited.add(id);

      const task = tasks.find(t => t.id === id);
      if (!task || !task.dependencies || task.dependencies.length === 0) {
        depths.set(id, 0);
        return 0;
      }

      let maxDep = 0;
      for (const dep of task.dependencies) {
        maxDep = Math.max(maxDep, getDepth(dep, visited));
      }
      const d = maxDep + 1;
      depths.set(id, d);
      return d;
    };

    tasks.forEach(t => getDepth(t.id));

    // Group by depth
    const layers: AgentTask[][] = [];
    let maxDepth = -1;
    depths.forEach((d) => { if (d > maxDepth) maxDepth = d; });
    for (let i = 0; i <= maxDepth; i++) {
        layers.push(tasks.filter(t => depths.get(t.id) === i));
    }

    const NODE_WIDTH = 250;
    const NODE_HEIGHT = 100;
    const X_GAP = 100;
    const Y_GAP = 50;

    // Build positions
    const positions = new Map<string, {x: number, y: number}>();
    layers.forEach((layer, layerIndex) => {
        const x = layerIndex * (NODE_WIDTH + X_GAP) + 50;
        layer.forEach((task, taskIndex) => {
            const y = taskIndex * (NODE_HEIGHT + Y_GAP) + 50;
            positions.set(task.id, { x, y });
        });
    });

    const totalWidth = (maxDepth + 1) * (NODE_WIDTH + X_GAP) + 100;
    const totalHeight = Math.max(...layers.map(l => l.length)) * (NODE_HEIGHT + Y_GAP) + 100;

    return (
        <div className="flex-1 relative overflow-auto custom-scrollbar p-8 bg-gray-900 border-l border-gray-800">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <GitMerge className="w-5 h-5 text-purple-400" /> Swarm Execution Flow (DAG)
            </h3>
            <div style={{ width: Math.max(totalWidth, 800), height: Math.max(totalHeight, 600), position: 'relative' }}>
                <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                    {tasks.map(task => {
                        const targetPos = positions.get(task.id);
                        if (!targetPos) return null;
                        
                        return (task.dependencies || []).map(depId => {
                            const sourcePos = positions.get(depId);
                            if (!sourcePos) return null;

                            const startX = sourcePos.x + NODE_WIDTH;
                            const startY = sourcePos.y + NODE_HEIGHT / 2;
                            const endX = targetPos.x;
                            const endY = targetPos.y + NODE_HEIGHT / 2;
                            
                            const cp1X = startX + (endX - startX) / 2;
                            const cp1Y = startY;
                            const cp2X = startX + (endX - startX) / 2;
                            const cp2Y = endY;
                            
                            const isMet = tasks.find(t => t.id === depId)?.status === 'completed';

                            return (
                                <g key={`${depId}-${task.id}`}>
                                    <path 
                                        d={`M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`}
                                        fill="none"
                                        stroke={isMet ? "#10b981" : "#4b5563"}
                                        strokeWidth="2"
                                        strokeDasharray={isMet ? "none" : "5,5"}
                                        className="transition-all duration-500"
                                    />
                                    <circle cx={endX} cy={endY} r="4" fill={isMet ? "#10b981" : "#4b5563"} />
                                    <circle cx={startX} cy={startY} r="4" fill={isMet ? "#10b981" : "#4b5563"} />
                                </g>
                            );
                        });
                    })}
                </svg>
                {tasks.map(task => {
                    const pos = positions.get(task.id);
                    if (!pos) return null;
                    const assignedAgent = agents.find(a => a.id === task.assignedAgentId);
                    
                    return (
                        <div 
                            key={task.id}
                            className={`absolute p-4 rounded-xl border flex flex-col shadow-lg z-10 transition-colors ${
                                task.status === 'completed' ? 'bg-emerald-900/20 border-emerald-500/30' :
                                task.status === 'in_progress' ? 'bg-amber-900/20 border-amber-500/30 ring-1 ring-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.15)]' :
                                task.status === 'failed' ? 'bg-rose-900/20 border-rose-500/30' :
                                'bg-gray-800 border-gray-700'
                            }`}
                            style={{ width: NODE_WIDTH, height: NODE_HEIGHT, left: pos.x, top: pos.y }}
                        >
                            <div className="flex justify-between items-start mb-2 gap-2">
                                <div className="text-sm font-bold text-white truncate">{task.title}</div>
                                <div className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase whitespace-nowrap ${
                                    task.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                                    task.status === 'in_progress' ? 'bg-amber-500/20 text-amber-400' :
                                    task.status === 'failed' ? 'bg-rose-500/20 text-rose-400' :
                                    'bg-gray-700 text-gray-400'
                                }`}>
                                    {task.status.replace('_', ' ')}
                                </div>
                            </div>
                            <div className="text-[10px] text-gray-400 line-clamp-2 mb-auto" title={task.description}>{task.description}</div>
                            {assignedAgent && (
                                <div className="text-[9px] font-bold text-purple-400 mt-2 flex items-center gap-1.5 bg-purple-500/10 self-start px-2 py-1 rounded border border-purple-500/20">
                                    <BrainCircuit className="w-3 h-3" /> {assignedAgent.name}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
  };

  return (
    <div className="h-full flex overflow-hidden bg-gray-900 rounded-t-xl border border-gray-800">
      
      {/* Left Sidebar - Hierarchy Tree */}
      <div className="w-80 border-r border-gray-800 flex flex-col bg-gray-900/50">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900 sticky top-0 z-10">
          <div>
            <div className="flex gap-4 mb-2">
              <button 
                onClick={() => setViewMode('agents')}
                className={`text-xs font-bold uppercase tracking-wider pb-1 border-b-2 transition-colors ${viewMode === 'agents' ? 'text-white border-purple-500' : 'text-gray-500 border-transparent hover:text-gray-300'}`}
              >
                Nodes
              </button>
              <button 
                onClick={() => setViewMode('taskGraph')}
                className={`text-xs font-bold uppercase tracking-wider pb-1 border-b-2 transition-colors ${viewMode === 'taskGraph' ? 'text-white border-purple-500' : 'text-gray-500 border-transparent hover:text-gray-300'}`}
              >
                DAG
              </button>
            </div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Network className="w-4 h-4 text-purple-400" />
              {viewMode === 'agents' ? 'Swarm Topology' : 'Execution Flow'}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <div className="text-[10px] text-gray-400">Hierarchical AI Architecture</div>
              {isSwarmModeActive && (
                <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-500 uppercase bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                  <Activity className="w-2.5 h-2.5 animate-pulse" />
                  Swarm Mode Active
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsSwarmModeActive(!isSwarmModeActive)}
              className={`p-1.5 rounded-lg transition-colors border flex items-center gap-1 ${isSwarmModeActive ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'}`}
              title={isSwarmModeActive ? "Disable Swarm Mode" : "Enable Swarm Mode"}
            >
              <Cpu className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setIsCreating(true)}
              className="p-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
              title="Deploy New Agent Node"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
          {agents.length === 0 ? (
            <div className="text-center py-10">
              <Network className="w-10 h-10 text-gray-700 mx-auto mb-3" />
              <div className="text-gray-400 text-sm mb-4">No AI agents deployed</div>
              <button 
                onClick={() => setIsCreating(true)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-bold"
              >
                Initialize Swarm
              </button>
            </div>
          ) : (
             renderAgentTree(null)
          )}
        </div>
      </div>

      {/* Right Content Area */}
      {viewMode === 'taskGraph' ? (
        renderTaskGraph()
      ) : (
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-900">
        {isCreating ? (
          <div className="max-w-3xl mx-auto p-6 lg:p-10">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold text-white">Deploy AI Agent Node</h1>
                <p className="text-gray-400 text-sm mt-1">Configure a specialized LLM instance within the swarm.</p>
              </div>
              <button 
                onClick={() => setIsCreating(false)}
                className="p-2 hover:bg-gray-800 text-gray-400 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">Agent Initialization Name</label>
                  <input 
                    type="text" 
                    value={newAgent.name}
                    onChange={(e) => setNewAgent({...newAgent, name: e.target.value})}
                    placeholder="e.g. Kalshi Oracle v2"
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">Core Function / Role</label>
                  <select 
                    value={newAgent.role}
                    onChange={(e) => setNewAgent({...newAgent, role: e.target.value as any})}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="Master Strategist">Master Strategist</option>
                    <option value="Sector Analyst">Sector Analyst</option>
                    <option value="Quant Developer">Quant Developer</option>
                    <option value="Risk Manager">Risk Manager</option>
                    <option value="Data Engineer">Data Engineer</option>
                    <option value="Execution Specialist">Execution Specialist</option>
                    <option value="Prediction Market Sentinel">Prediction Market Sentinel</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">Base Foundational Model</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro', desc: 'Deep complex reasoning' },
                    { id: 'gemini-3.1-flash', name: 'Gemini 3.1 Flash', desc: 'Low-latency extraction' },
                    { id: 'kalshi-tuned-v1', name: 'Kalshi Master-Tuned API', desc: 'Fine-tuned on latest prediction market docs and orderbook history' },
                    { id: 'coinbase-tuned-v1', name: 'Coinbase Quant API', desc: 'Trained on high-frequency crypto trading APIs' }
                  ].map(m => (
                    <button
                      key={m.id}
                      onClick={() => setNewAgent({...newAgent, model: m.id as any})}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        newAgent.model === m.id 
                          ? 'bg-purple-500/20 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.15)] ring-1 ring-purple-500/50' 
                          : 'bg-gray-800 border-gray-700 hover:border-gray-600 text-gray-400'
                      }`}
                    >
                      <div className={`font-bold mb-1 ${newAgent.model === m.id ? 'text-purple-400' : 'text-white'}`}>
                        {m.name}
                      </div>
                      <div className="text-[10px] leading-tight">{m.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-2 uppercase flex justify-between">
                  <span>Training Data Context (RAG/Tuning)</span>
                  <span className="text-purple-400">Select sources to fine-tune</span>
                </label>
                <div className="bg-gray-800 border border-gray-700 rounded-xl max-h-48 overflow-y-auto custom-scrollbar p-2">
                  {dataSources.length === 0 ? (
                    <div className="text-center py-4 text-xs text-gray-500">
                      No data sources available. Please add some in the Data Marketplace.
                    </div>
                  ) : (
                    dataSources.map(ds => (
                      <label key={ds.id} className="flex items-center gap-3 p-3 hover:bg-gray-750/50 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-gray-700">
                        <input 
                          type="checkbox"
                          checked={newAgent.trainingDataSources?.some(tds => tds.id === ds.id) || false}
                          onChange={(e) => {
                            const updated = e.target.checked 
                              ? [...(newAgent.trainingDataSources || []), { id: ds.id, priority: 50 }]
                              : (newAgent.trainingDataSources || []).filter(tds => tds.id !== ds.id);
                            setNewAgent({...newAgent, trainingDataSources: updated});
                          }}
                          className="w-4 h-4 rounded bg-gray-900 border-gray-700 text-purple-500 focus:ring-purple-500 focus:ring-offset-gray-800"
                        />
                        <div className="flex-1">
                          <div className="text-sm text-white font-medium flex items-center gap-2">
                            {ds.name}
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase bg-gray-700 text-gray-300">
                              {ds.type}
                            </span>
                          </div>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">Swarm Position (Parent Node)</label>
                <select 
                  value={newAgent.parentAgentId || ''}
                  onChange={(e) => setNewAgent({...newAgent, parentAgentId: e.target.value || null})}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="">None (Top-Level Node)</option>
                  {agents.map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({a.role})</option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-500 mt-1">If assigned, this agent will report to the parent node for aggregated decision making.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">System Instruction / Persona Prompt</label>
                <textarea 
                  value={newAgent.systemPrompt}
                  onChange={(e) => setNewAgent({...newAgent, systemPrompt: e.target.value})}
                  rows={4}
                  placeholder="You are an expert Kalshi orderbook analyst. Your sole responsibility is to ingest live prediction market data from Kalshi APIs and detect arbitrage opportunities correlated with breaking macroeconomic news..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 font-mono text-sm leading-relaxed"
                />
              </div>

              <div className="pt-4 border-t border-gray-800 flex justify-end">
                <button 
                  onClick={handleCreateAgent}
                  disabled={!newAgent.name}
                  className="bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/50 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-purple-900/20 transition-all flex items-center gap-2"
                >
                  <BrainCircuit className="w-5 h-5" />
                  Initialize Agent Node
                </button>
              </div>
            </div>
          </div>
        ) : selectedAgent ? (
          <div className="p-6 lg:p-10 max-w-4xl mx-auto space-y-8">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-4 rounded-2xl border ${
                  selectedAgent.role === 'Master Strategist' ? 'bg-amber-500/10 border-amber-500/30' :
                  selectedAgent.role === 'Risk Manager' ? 'bg-red-500/10 border-red-500/30' :
                  'bg-cyan-500/10 border-cyan-500/30'
                }`}>
                  <Cpu className={`w-8 h-8 ${
                    selectedAgent.role === 'Master Strategist' ? 'text-amber-400' :
                    selectedAgent.role === 'Risk Manager' ? 'text-red-400' :
                    'text-cyan-400'
                  }`} />
                </div>
                <div>
                  <h1 className="text-3xl font-black text-white tracking-tight">{selectedAgent.name}</h1>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-gray-800 text-gray-300 border border-gray-700">
                      {selectedAgent.role}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs font-mono text-gray-400">
                      <Network className="w-3.5 h-3.5" />
                      Model: <span className="text-purple-400 font-bold">{selectedAgent.model}</span>
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleTrainAgent(selectedAgent.id)}
                  disabled={selectedAgent.status === 'training'}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded-lg text-sm font-bold shadow-lg transition-all flex items-center gap-2"
                >
                  {selectedAgent.status === 'training' ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> TUNING...</>
                  ) : (
                    <><Database className="w-4 h-4" /> Train Agent</>
                  )}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
              <div className="bg-gray-800/50 border border-gray-800 rounded-2xl p-5">
                <div className="text-xs text-gray-500 font-bold uppercase mb-1">Status</div>
                <div className="flex items-center gap-2">
                  {selectedAgent.status === 'ready' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                  {selectedAgent.status === 'training' && <Activity className="w-5 h-5 text-amber-500" />}
                  <span className={`text-lg font-bold capitalize ${
                    selectedAgent.status === 'ready' ? 'text-emerald-400' :
                    selectedAgent.status === 'training' ? 'text-amber-400' : 'text-gray-300'
                  }`}>{selectedAgent.status}</span>
                </div>
                {selectedAgent.status === 'training' && selectedAgent.trainingProgress !== undefined && (
                  <div className="mt-4">
                    <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-300"
                        style={{ width: `${selectedAgent.trainingProgress}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-gray-400 text-right mt-1 font-mono">
                      {selectedAgent.trainingProgress.toFixed(0)}%
                    </div>
                  </div>
                )}
              </div>
              <div className="bg-gray-800/50 border border-gray-800 rounded-2xl p-5">
                <div className="text-xs text-gray-500 font-bold uppercase mb-1">Inference Accuracy</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-white">{selectedAgent.accuracyScore.toFixed(1)}</span>
                  <span className="text-gray-400 font-bold">%</span>
                </div>
              </div>
              <div className="bg-gray-800/50 border border-gray-800 rounded-2xl p-5">
                <div className="text-xs text-gray-500 font-bold uppercase mb-1">Last Trained At</div>
                <div className="text-sm font-medium text-white">
                  {selectedAgent.lastTrainedAt ? new Date(selectedAgent.lastTrainedAt).toLocaleString() : 'Never'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-white border-b border-gray-800 pb-2 mb-4 flex items-center gap-2">
                    <Database className="w-4 h-4 text-purple-400" />
                    Data Corpus (Rag / Fine-tuning focus)
                  </h3>
                    <div className="space-y-4">
                      {dataSources.map(ds => {
                        const agentSource = selectedAgent.trainingDataSources.find(s => s.id === ds.id);
                        return (
                          <div key={ds.id} className={`p-3 rounded-xl border transition-all ${agentSource ? 'bg-purple-600/10 border-purple-500/30' : 'bg-gray-800 border-gray-700'}`}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <button 
                                  onClick={() => {
                                    const updatedDataSources = agentSource 
                                      ? selectedAgent.trainingDataSources.filter(s => s.id !== ds.id)
                                      : [...selectedAgent.trainingDataSources, { id: ds.id, priority: 50 }];
                                    const updatedAgent = { ...selectedAgent, trainingDataSources: updatedDataSources };
                                    setAgents(agents.map(a => a.id === selectedAgent.id ? updatedAgent : a));
                                  }}
                                  className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${agentSource ? 'bg-purple-500 border-purple-500 text-white' : 'bg-gray-900 border-gray-600'}`}
                                >
                                  {agentSource && <CheckCircle2 className="w-3 h-3 text-white" />}
                                </button>
                                <div>
                                  <div className="text-sm font-bold text-white max-w-full truncate">{ds.name}</div>
                                  <div className="text-[10px] text-gray-400 uppercase">{ds.type}</div>
                                </div>
                              </div>
                            </div>
                            
                            {agentSource && (
                              <div className="pl-7 pr-2">
                                <div className="flex items-center justify-between text-[10px] text-gray-500 uppercase font-bold mb-1">
                                  <span>Priority weight</span>
                                  <span className="text-purple-400">{agentSource.priority}</span>
                                </div>
                                <input 
                                  type="range" 
                                  min="1" 
                                  max="100" 
                                  value={agentSource.priority}
                                  onChange={(e) => {
                                    const newPriority = parseInt(e.target.value);
                                    const updatedDataSources = selectedAgent.trainingDataSources.map(s => 
                                      s.id === ds.id ? { ...s, priority: newPriority } : s
                                    );
                                    const updatedAgent = { ...selectedAgent, trainingDataSources: updatedDataSources };
                                    setAgents(agents.map(a => a.id === selectedAgent.id ? updatedAgent : a));
                                  }}
                                  className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                </div>

                <div>
                   <h3 className="text-sm font-bold text-white border-b border-gray-800 pb-2 mb-4 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-400" />
                    System Prompt
                  </h3>
                  <textarea 
                    value={selectedAgent.systemPrompt}
                    onChange={(e) => {
                      const updatedAgent = { ...selectedAgent, systemPrompt: e.target.value };
                      setAgents(agents.map(a => a.id === selectedAgent.id ? updatedAgent : a));
                    }}
                    rows={8}
                    placeholder="// No custom system prompt provided."
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl p-4 font-mono text-xs text-emerald-400 leading-relaxed max-h-60 overflow-y-auto custom-scrollbar focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white border-b border-gray-800 pb-2 mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-purple-400" />
                  Live Memory / Output Stream Simulation
                </h3>
                 <div className="bg-black border border-gray-800 rounded-xl p-4 font-mono text-[10px] text-gray-500 h-96 overflow-y-auto">
                    {selectedAgent.status === 'training' ? (
                      <div className="text-amber-500 animate-pulse">
                        &gt; Initiating weights adjustment...<br/>
                        &gt; Processing dataset embeddings...<br/>
                        &gt; Epoch 1/100... Loss: 0.24<br/>
                        &gt; Vectorizing orderbook history from Kalshi/Coinbase context...
                      </div>
                    ) : selectedAgent.status === 'ready' ? (
                      <div className="space-y-2">
                        <div className="text-green-500">&gt; Node Ready. Standing by for swarm queries.</div>
                        <div className="text-gray-600">&gt; [INFO] Loaded context window from Vector DB via 4 connected data sources.</div>
                        <div className="text-sky-500">&gt; Waiting for coordination from Master Strategist...</div>
                      </div>
                    ) : (
                      <div>&gt; System completely idle. Awaiting initialization.</div>
                    )}
                 </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center flex-col text-gray-500">
            <Cpu className="w-16 h-16 text-gray-800 mb-4" />
            <div className="text-lg font-bold text-gray-600">Select an Agent Node</div>
            <div className="text-sm">Or deploy a new AI instance to the swarm.</div>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
