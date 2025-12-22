import React, { useState, useEffect } from 'react';
import { LayoutGrid, FileText, CreditCard, LogOut, Clock, CheckCircle2, ArrowRight, Download, Folder, List as ListIcon, ArrowUpRight } from 'lucide-react';
// Correct relative paths based on standard src/ structure
import { supabase } from '../supabaseClient';
import { STATUS_CONFIG } from '../utils/constants';

export const ClientPortal = ({ client, onExit }) => {
    const [view, setView] = useState('home');
    const [taskViewMode, setTaskViewMode] = useState('kanban'); // 'list' or 'kanban'
    const [tasks, setTasks] = useState([]);
    const [portalSettings, setPortalSettings] = useState({});
    const [agencySettings, setAgencySettings] = useState({});

    useEffect(() => {
        const savedPortal = localStorage.getItem('orchestra_portal_settings');
        if(savedPortal) setPortalSettings(JSON.parse(savedPortal));
        
        const savedAgency = localStorage.getItem('orchestra_agency_settings');
        if(savedAgency) setAgencySettings(JSON.parse(savedAgency));

        const fetchTasks = async () => {
            if(!client?.id) return;
            const { data } = await supabase
                .from('tasks')
                .select('*')
                .eq('membership_id', client.id)
                .order('updated_at', { ascending: false });
            setTasks(data || []);
        };
        fetchTasks();
    }, [client]);

    const brandColor = agencySettings.brandColor || '#a3e635';
    const logo = agencySettings.logoUrl;

    // Helper to map raw status to our strict 4 statuses
    const normalizeStatus = (rawStatus) => {
        if (rawStatus === "Active Task" || rawStatus === "🔥 Active Task") return "Active Task";
        if (rawStatus === "Done") return "Done"; // Allow Done for historical view even if not in strict 4 config
        if (STATUS_CONFIG[rawStatus]) return rawStatus;
        return 'Backlog'; // Fallback
    };

    return (
        <div className="flex h-screen w-full bg-[#0f0f0f] font-sans text-neutral-200 overflow-hidden">
            {/* PORTAL SIDEBAR */}
            <div className="w-64 border-r border-neutral-800 flex flex-col bg-[#141414]">
                <div className="h-16 flex items-center px-6 border-b border-neutral-800 gap-3">
                    {logo ? (
                        <img src={logo} alt="Logo" className="w-8 h-8 rounded object-cover"/>
                    ) : (
                        <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center text-xs font-bold">A</div>
                    )}
                    <span className="font-bold text-white tracking-tight">{agencySettings.name || 'Agency'}</span>
                </div>

                <div className="p-4 space-y-1">
                    <button onClick={() => setView('home')} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'home' ? 'bg-white/10 text-white' : 'text-neutral-400 hover:text-white'}`}>
                        <LayoutGrid size={18} /> Home
                    </button>
                    <button onClick={() => setView('tasks')} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'tasks' ? 'bg-white/10 text-white' : 'text-neutral-400 hover:text-white'}`}>
                        <FileText size={18} /> Requests
                    </button>
                    <button onClick={() => setView('invoices')} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'invoices' ? 'bg-white/10 text-white' : 'text-neutral-400 hover:text-white'}`}>
                        <CreditCard size={18} /> Invoices
                    </button>
                </div>

                <div className="mt-auto p-4 border-t border-neutral-800">
                     <div className="flex items-center gap-3 px-3 py-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-xs">
                            {client.client_name ? client.client_name[0] : '?'}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <div className="text-sm text-white font-medium truncate">{client.client_name}</div>
                            <div className="text-xs text-neutral-500 truncate">Client Account</div>
                        </div>
                     </div>
                     <button onClick={onExit} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                        <LogOut size={14} /> Exit Portal View
                     </button>
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="max-w-6xl mx-auto p-8 h-full flex flex-col">
                    {view === 'home' && (
                        <div className="space-y-8 animate-fade-in">
                            <div className="bg-gradient-to-r from-[#1a1a1a] to-[#141414] border border-neutral-800 rounded-2xl p-8 relative overflow-hidden">
                                <div className="relative z-10">
                                    <h1 className="text-3xl font-bold text-white mb-2">{portalSettings.welcomeMessage || 'Welcome back!'}</h1>
                                    <p className="text-neutral-400">Here is what's happening with your projects today.</p>
                                </div>
                                <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                            </div>

                            {/* Active Projects Card */}
                            <section>
                                <h2 className="text-lg font-bold text-white mb-4">Active Subscription</h2>
                                <div className="bg-[#141414] border border-neutral-800 rounded-xl p-6 flex items-center justify-between group hover:border-neutral-700 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-neutral-900 flex items-center justify-center text-white">
                                            <Folder size={24} style={{color: brandColor}} />
                                        </div>
                                        <div>
                                            <h3 className="text-white font-bold text-lg">{client.offer_type || 'Design Retainer'}</h3>
                                            <div className="flex items-center gap-2 text-sm text-neutral-500">
                                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Active • Renews on {client.next_cycle_end_date || 'Dec 31'}
                                            </div>
                                        </div>
                                    </div>
                                    <button className="px-4 py-2 bg-white text-black text-sm font-bold rounded-lg hover:bg-neutral-200 transition-colors">
                                        Manage
                                    </button>
                                </div>
                            </section>

                            {/* Recent Tasks */}
                            <section>
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-bold text-white">Recent Requests</h2>
                                    <button onClick={() => setView('tasks')} className="text-sm text-neutral-500 hover:text-white flex items-center gap-1">
                                        View all <ArrowRight size={14} />
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {tasks.slice(0, 3).map(task => (
                                        <div key={task.id} className="flex items-center justify-between p-4 bg-[#141414] border border-neutral-800 rounded-xl hover:bg-[#1a1a1a] transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-2 rounded-lg ${normalizeStatus(task.status) === 'Done' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-neutral-800 text-neutral-400'}`}>
                                                    {normalizeStatus(task.status) === 'Done' ? <CheckCircle2 size={18}/> : <Clock size={18}/>}
                                                </div>
                                                <div>
                                                    <div className="text-white font-medium text-sm">{task.title}</div>
                                                    <div className="text-xs text-neutral-500">Last updated {new Date(task.updated_at).toLocaleDateString()}</div>
                                                </div>
                                            </div>
                                            <span className="text-xs font-medium px-2 py-1 rounded bg-neutral-900 text-neutral-400 border border-neutral-800">
                                                {task.status}
                                            </span>
                                        </div>
                                    ))}
                                    {tasks.length === 0 && (
                                        <div className="text-center py-8 text-neutral-600 text-sm bg-[#141414] rounded-xl border border-neutral-800 border-dashed">
                                            No active requests.
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div>
                    )}

                    {view === 'tasks' && (
                        <div className="flex flex-col h-full animate-fade-in">
                             <div className="flex items-center justify-between mb-6 shrink-0">
                                 <h1 className="text-2xl font-bold text-white">Requests</h1>
                                 <div className="flex bg-[#141414] p-1 rounded-lg border border-neutral-800">
                                    <button onClick={() => setTaskViewMode('kanban')} className={`p-2 rounded transition-colors ${taskViewMode === 'kanban' ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-white'}`}>
                                        <LayoutGrid size={16} />
                                    </button>
                                    <button onClick={() => setTaskViewMode('list')} className={`p-2 rounded transition-colors ${taskViewMode === 'list' ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-white'}`}>
                                        <ListIcon size={16} />
                                    </button>
                                 </div>
                             </div>

                             {taskViewMode === 'list' ? (
                                 <div className="space-y-3">
                                    {tasks.map(task => (
                                        <div key={task.id} className="flex items-center justify-between p-4 bg-[#141414] border border-neutral-800 rounded-xl">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-2 h-2 rounded-full ${STATUS_CONFIG[normalizeStatus(task.status)]?.color.replace('text-','bg-') || 'bg-neutral-500'}`}></div>
                                                <span className="text-white font-medium">{task.title}</span>
                                            </div>
                                            <span className="text-sm text-neutral-500">{task.status}</span>
                                        </div>
                                    ))}
                                     {tasks.length === 0 && <div className="text-neutral-500 text-sm">No tasks found.</div>}
                                 </div>
                             ) : (
                                 /* CLIENT KANBAN BOARD */
                                 <div className="flex-1 overflow-x-auto pb-4">
                                     <div className="flex gap-6 h-full min-w-max">
                                         {Object.keys(STATUS_CONFIG).map(status => (
                                             <div key={status} className="w-72 flex flex-col h-full">
                                                 <div className="flex items-center gap-2 mb-4 px-1">
                                                     {React.createElement(STATUS_CONFIG[status].icon, { size: 14, className: STATUS_CONFIG[status].color.replace('text-', 'stroke-') })}
                                                     <h3 className="text-neutral-300 text-sm font-medium">{status}</h3>
                                                     <span className="bg-neutral-800 text-neutral-500 px-1.5 py-0.5 rounded text-[10px]">
                                                         {tasks.filter(t => normalizeStatus(t.status) === status).length}
                                                     </span>
                                                 </div>
                                                 
                                                 <div className="flex-1 overflow-y-auto space-y-3 pr-2 pb-10 custom-scrollbar">
                                                     {tasks.filter(t => normalizeStatus(t.status) === status).map(task => (
                                                         <div key={task.id} className="bg-[#141414] border border-neutral-800 hover:border-neutral-600 rounded-lg p-4 cursor-default shadow-sm transition-colors">
                                                             <h4 className="text-sm text-neutral-200 font-medium mb-2 leading-snug">{task.title}</h4>
                                                             {task.description && <p className="text-xs text-neutral-500 line-clamp-2 mb-3">{task.description}</p>}
                                                             <div className="flex items-center justify-between pt-2 border-t border-neutral-800/50">
                                                                 <div className="text-[10px] text-neutral-600 flex items-center gap-1">
                                                                     <Clock size={10} /> {new Date(task.updated_at).toLocaleDateString()}
                                                                 </div>
                                                             </div>
                                                         </div>
                                                     ))}
                                                     {tasks.filter(t => normalizeStatus(t.status) === status).length === 0 && (
                                                        <div className="border border-dashed border-neutral-800 rounded-lg h-24 flex flex-col items-center justify-center text-neutral-600 gap-2 opacity-50">
                                                            <div className="p-2 bg-neutral-900 rounded-full"><ArrowUpRight size={12}/></div>
                                                            <span className="text-xs font-medium">Empty</span>
                                                        </div>
                                                     )}
                                                 </div>
                                             </div>
                                         ))}
                                     </div>
                                 </div>
                             )}
                        </div>
                    )}
                    
                    {view === 'invoices' && (
                        <div className="animate-fade-in">
                            <h1 className="text-2xl font-bold text-white mb-6">Invoices</h1>
                            <div className="bg-[#141414] border border-neutral-800 rounded-xl overflow-hidden">
                                <div className="p-4 border-b border-neutral-800 flex justify-between items-center">
                                    <div>
                                        <div className="text-white font-bold">October 2025</div>
                                        <div className="text-xs text-neutral-500">Paid on Oct 1, 2025</div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="text-white font-mono">€{(client.monthly_amount_cents / 100).toFixed(2)}</span>
                                        <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 text-xs rounded font-bold">PAID</span>
                                        <button className="p-2 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white"><Download size={16}/></button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};