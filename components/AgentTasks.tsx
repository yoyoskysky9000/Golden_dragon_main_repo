import React, { useState } from 'react';
import { AgentTask, AIAgent, DataSource } from '../types';
import { 
  ListTodo, Plus, X, Calendar, Clock, CheckCircle2, Circle, AlertCircle, 
  BrainCircuit, ArrowRight, Play, Check, Trash2, Edit2, Link, Database
} from 'lucide-react';

interface Props {
  tasks: AgentTask[];
  setTasks: React.Dispatch<React.SetStateAction<AgentTask[]>>;
  agents: AIAgent[];
  dataSources: DataSource[];
}

export default function AgentTasks({ tasks, setTasks, agents, dataSources }: Props) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  
  const defaultDeadline = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const [newTask, setNewTask] = useState<Partial<AgentTask>>({
    title: '',
    description: '',
    assignedAgentId: '',
    deadline: defaultDeadline,
    status: 'todo',
    dependencies: [],
    dataSources: []
  });

  const handleSaveTask = () => {
    if (!newTask.title || !newTask.deadline) return;
    
    if (editingTaskId) {
      setTasks(prev => prev.map(t => t.id === editingTaskId ? { ...t, ...newTask } as AgentTask : t));
    } else {
      const task: AgentTask = {
        ...(newTask as AgentTask),
        id: `task_${Date.now()}`,
        status: newTask.status || 'todo',
        createdAt: Date.now(),
        assignedAgentId: newTask.assignedAgentId || null,
        dependencies: newTask.dependencies || [],
        dataSources: newTask.dataSources || []
      };
      setTasks(prev => [...prev, task]);
    }
    
    setIsCreating(false);
    setEditingTaskId(null);
    setNewTask({
      title: '',
      description: '',
      assignedAgentId: '',
      deadline: defaultDeadline,
      status: 'todo',
      dependencies: [],
      dataSources: []
    });
  };

  const handleEdit = (task: AgentTask) => {
    setNewTask(task);
    setEditingTaskId(task.id);
    setIsCreating(true);
  };

  const handleDelete = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const handleUpdateStatus = (id: string, status: AgentTask['status']) => {
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        if (status === 'in_progress' && t.dependencies && t.dependencies.length > 0) {
          const areDependenciesMet = t.dependencies.every(depId => {
            const depTask = prev.find(pt => pt.id === depId);
            return depTask && depTask.status === 'completed';
          });
          if (!areDependenciesMet) {
            return t; // Do not update status if dependencies are not met
          }
        }
        return { ...t, status };
      }
      return t;
    }));
  };

  const renderStatusBadge = (status: AgentTask['status']) => {
    switch(status) {
      case 'todo': return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gray-800 text-gray-400 border border-gray-700 flex items-center gap-1"><Circle className="w-3 h-3" /> To Do</span>;
      case 'in_progress': return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30 flex items-center gap-1"><Clock className="w-3 h-3" /> In Progress</span>;
      case 'completed': return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Completed</span>;
      case 'failed': return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-500 border border-rose-500/30 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Failed</span>;
    }
  };

  const sortedTasks = [...tasks].sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());

  return (
    <div className="h-full flex flex-col bg-gray-950 p-6 overflow-hidden">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <ListTodo className="w-8 h-8 text-sky-500" />
            Agent Missions & Task Management
          </h1>
          <p className="text-gray-400 mt-2">Assign objectives, manage deadlines, and track execution status for the AI Swarm.</p>
        </div>
        {!isCreating && (
          <button 
            onClick={() => {
              setEditingTaskId(null);
              setNewTask({
                title: '',
                description: '',
                assignedAgentId: '',
                deadline: defaultDeadline,
                status: 'todo',
                dependencies: [],
                dataSources: []
              });
              setIsCreating(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-sky-900/20"
          >
            <Plus className="w-5 h-5" />
            Create Mission
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {isCreating ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 max-w-3xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                {editingTaskId ? <Edit2 className="w-5 h-5 text-sky-500" /> : <Plus className="w-5 h-5 text-sky-500" />}
                {editingTaskId ? 'Edit Mission Parameters' : 'Deploy New Mission'}
              </h2>
              <button onClick={() => setIsCreating(false)} className="text-gray-500 hover:text-gray-300">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Mission Title</label>
                <input 
                  type="text" 
                  value={newTask.title}
                  onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                  placeholder="e.g. Backtest Momentum on TSLA"
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Description / Objective</label>
                <textarea 
                  value={newTask.description}
                  onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                  rows={4}
                  placeholder="Provide precise execution details for the agent..."
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-sky-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Assigned Agent</label>
                  <select 
                    value={newTask.assignedAgentId || ''}
                    onChange={(e) => setNewTask({...newTask, assignedAgentId: e.target.value || null})}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-sky-500 appearance-none"
                  >
                    <option value="">Unassigned (Auto-delegate)</option>
                    {agents.map(a => (
                      <option key={a.id} value={a.id}>{a.name} ({a.role})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Deadline</label>
                  <input 
                    type="date" 
                    value={newTask.deadline}
                    onChange={(e) => setNewTask({...newTask, deadline: e.target.value})}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-sky-500 color-scheme-dark"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Dependencies (Optional)</label>
                <div className="bg-gray-950 border border-gray-800 rounded-xl p-3 max-h-40 overflow-y-auto custom-scrollbar flex flex-col gap-1">
                   {tasks.filter(t => t.id !== editingTaskId).map(task => {
                       const isSelected = newTask.dependencies?.includes(task.id);
                       return (
                           <button
                             key={task.id}
                             onClick={() => {
                               setNewTask(prev => ({
                                 ...prev,
                                 dependencies: isSelected 
                                   ? prev.dependencies?.filter(id => id !== task.id) 
                                   : [...(prev.dependencies || []), task.id]
                               }))
                             }}
                             type="button"
                             className={`text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-between ${isSelected ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30' : 'text-gray-400 hover:bg-gray-800 border border-transparent'}`}
                           >
                             <span className="font-bold truncate max-w-[80%]">{task.title}</span>
                             {renderStatusBadge(task.status)}
                           </button>
                       )
                   })}
                   {tasks.filter(t => t.id !== editingTaskId).length === 0 && (
                     <div className="text-gray-500 text-xs italic p-2 text-center">No other tasks available for dependencies.</div>
                   )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase flex justify-between mb-2">
                  <span>Task Specific Data Sources</span>
                  <span className="text-sky-500">Attach datasets for execution</span>
                </label>
                <div className="bg-gray-950 border border-gray-800 rounded-xl p-3 max-h-40 overflow-y-auto custom-scrollbar space-y-2">
                  {dataSources.length === 0 ? (
                    <div className="text-gray-500 text-xs italic p-2 text-center">No data sources available. Add some in the Data Marketplace.</div>
                  ) : (
                    dataSources.map(ds => {
                      const selectedSource = newTask.dataSources?.find(s => s.id === ds.id);
                      return (
                        <div key={ds.id} className={`p-2 rounded-lg border transition-colors ${selectedSource ? 'bg-sky-900/10 border-sky-500/30' : 'bg-gray-900 border-gray-800 hover:bg-gray-800'}`}>
                          <div className="flex items-center gap-3">
                            <input 
                              type="checkbox"
                              checked={!!selectedSource}
                              onChange={(e) => {
                                const updated = e.target.checked 
                                  ? [...(newTask.dataSources || []), { id: ds.id, priority: 50 }]
                                  : (newTask.dataSources || []).filter(s => s.id !== ds.id);
                                setNewTask({...newTask, dataSources: updated});
                              }}
                              className="w-4 h-4 rounded bg-gray-900 border-gray-700 text-sky-500 focus:ring-sky-500"
                            />
                            <div className="flex-1 text-sm font-bold text-white flex justify-between items-center">
                              <span>{ds.name}</span>
                              <span className="text-[10px] text-gray-500 uppercase bg-gray-800 px-1.5 py-0.5 rounded">{ds.type}</span>
                            </div>
                          </div>
                          {selectedSource && (
                            <div className="mt-2 pl-7 pr-2">
                              <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase mb-1">
                                <span>Context Priority</span>
                                <span className="text-sky-400">{selectedSource.priority}</span>
                              </div>
                              <input 
                                type="range"
                                min="1"
                                max="100"
                                value={selectedSource.priority}
                                onChange={(e) => {
                                  const newPriority = parseInt(e.target.value);
                                  const updated = (newTask.dataSources || []).map(s => s.id === ds.id ? { ...s, priority: newPriority } : s);
                                  setNewTask({...newTask, dataSources: updated});
                                }}
                                className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
                              />
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-6 border-t border-gray-800">
                <button 
                  onClick={() => setIsCreating(false)}
                  className="px-6 py-2.5 rounded-xl font-bold text-gray-400 hover:text-white hover:bg-gray-800 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveTask}
                  disabled={!newTask.title || !newTask.deadline}
                  className="px-6 py-2.5 rounded-xl font-bold bg-sky-600 hover:bg-sky-500 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {editingTaskId ? 'Save Changes' : 'Initialize Mission'}
                </button>
              </div>
            </div>
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <ListTodo className="w-16 h-16 mb-4 text-gray-800" />
            <h3 className="text-xl font-bold text-gray-600 mb-2">No active missions</h3>
            <p className="text-sm max-w-md text-center">Create tasks and assign them to your AI Swarm to begin automated execution and analysis.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {sortedTasks.map(task => {
              const assignedAgent = agents.find(a => a.id === task.assignedAgentId);
              const areDependenciesMet = task.dependencies ? task.dependencies.every(depId => tasks.find(t => t.id === depId)?.status === 'completed') : true;
              
              return (
                <div key={task.id} className="bg-gray-900 border border-gray-800 hover:border-gray-700 transition-colors rounded-2xl p-5 flex flex-col group relative overflow-hidden">
                   {/* Background accent based on status */}
                   <div className={`absolute top-0 left-0 w-1 h-full ${
                     task.status === 'completed' ? 'bg-emerald-500' :
                     task.status === 'in_progress' ? 'bg-amber-500' :
                     task.status === 'failed' ? 'bg-rose-500' : 'bg-sky-500'
                   }`} />

                   <div className="flex justify-between items-start mb-4 pl-2">
                      {renderStatusBadge(task.status)}
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(task)} className="p-1.5 text-gray-500 hover:text-white bg-gray-800 rounded-lg">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(task.id)} className="p-1.5 text-gray-500 hover:text-rose-500 bg-gray-800 rounded-lg">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                   </div>

                   <h3 className="text-lg font-bold text-white mb-2 pl-2">{task.title}</h3>
                   <p className="text-sm text-gray-400 mb-6 flex-1 pl-2">{task.description}</p>

                   <div className="bg-gray-950 rounded-xl p-3 mb-4 flex items-center justify-between border border-gray-800">
                      <div className="flex items-center gap-2">
                        {assignedAgent ? (
                          <>
                            <BrainCircuit className="w-5 h-5 text-sky-500" />
                            <div>
                               <div className="text-[10px] font-bold text-sky-500 uppercase">Assigned To</div>
                               <div className="text-xs text-white font-medium">{assignedAgent.name} <span className="text-gray-500 font-normal">({assignedAgent.role})</span></div>
                            </div>
                          </>
                        ) : (
                          <>
                            <BrainCircuit className="w-5 h-5 text-gray-600" />
                            <div className="text-xs text-gray-500 italic">Unassigned (Auto-delegate)</div>
                          </>
                        )}
                      </div>
                      <div className="text-right">
                         <div className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1 justify-end">
                            <Calendar className="w-3 h-3" />
                            Deadline
                         </div>
                         <div className={`text-xs font-medium ${new Date(task.deadline) < new Date() && task.status !== 'completed' ? 'text-rose-400' : 'text-gray-300'}`}>
                           {new Date(task.deadline).toLocaleDateString()}
                         </div>
                      </div>
                   </div>

                   {task.dependencies && task.dependencies.length > 0 && (
                      <div className="mb-4 pl-2">
                        <div className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1 mb-2">
                          <Link className="w-3 h-3" /> Dependencies
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {task.dependencies.map(depId => {
                            const depTask = tasks.find(t => t.id === depId);
                            if (!depTask) return null;
                            const isMet = depTask.status === 'completed';
                            return (
                               <div key={depId} className={`px-2 py-1 flex items-center gap-1.5 rounded-md text-[10px] font-bold border max-w-full ${isMet ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`} title={depTask.title}>
                                 {isMet ? <CheckCircle2 className="w-3 h-3 shrink-0" /> : <Clock className="w-3 h-3 shrink-0" />}
                                 <span className="truncate">{depTask.title}</span>
                               </div>
                            )
                          })}
                        </div>
                      </div>
                   )}

                   {/* Quick Status Actions */}
                   <div className="flex items-center gap-2 border-t border-gray-800 pt-4 mt-auto">
                      {task.status !== 'in_progress' && task.status !== 'completed' && (
                        <button 
                          onClick={() => handleUpdateStatus(task.id, 'in_progress')}
                          disabled={!areDependenciesMet}
                          className={`flex-1 flex justify-center items-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-colors border ${areDependenciesMet ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border-amber-500/20' : 'bg-gray-800/50 text-gray-500 border-gray-800 cursor-not-allowed'}`}
                        >
                          <Play className="w-3 h-3" /> {areDependenciesMet ? 'Start Execution' : 'Waiting on Dependencies'}
                        </button>
                      )}
                      {task.status === 'in_progress' && (
                        <>
                          <button 
                            onClick={() => handleUpdateStatus(task.id, 'completed')}
                            className="flex-[2] flex justify-center items-center gap-1.5 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 text-xs font-bold rounded-lg transition-colors border border-emerald-500/20"
                          >
                            <Check className="w-3 h-3" /> Mark Completed
                          </button>
                           <button 
                            onClick={() => handleUpdateStatus(task.id, 'failed')}
                            className="flex-1 flex justify-center items-center gap-1.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-xs font-bold rounded-lg transition-colors border border-rose-500/20"
                          >
                            <AlertCircle className="w-3 h-3" /> Failed
                          </button>
                        </>
                      )}
                      {task.status === 'completed' && (
                        <div className="flex-1 py-2 text-center text-xs font-bold text-emerald-500 flex justify-center items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" /> Mission Accomplished
                        </div>
                      )}
                   </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
