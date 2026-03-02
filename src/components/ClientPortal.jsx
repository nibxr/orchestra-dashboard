import React, { useState, useEffect } from 'react';
import { Icon } from './Icon';
// Correct relative paths based on standard src/ structure
import { supabase } from '../supabaseClient';
import { STATUS_CONFIG } from '../utils/constants';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';
import { TaskLimitIndicator } from './TaskLimitIndicator';
import { redirectToCustomerPortal } from '../utils/stripeService';

export const ClientPortal = ({ client, onExit }) => {
    const toast = useToast();
    const [view, setView] = useState('home');
    const [taskViewMode, setTaskViewMode] = useState('kanban'); // 'list' or 'kanban'
    const [tasks, setTasks] = useState([]);
    const [portalSettings, setPortalSettings] = useState({});
    const [agencySettings, setAgencySettings] = useState({});
    const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
    const [newRequestTitle, setNewRequestTitle] = useState('');
    const [newRequestDescription, setNewRequestDescription] = useState('');
    const [activeTask, setActiveTask] = useState(null);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [draggedTask, setDraggedTask] = useState(null);
    const [dragOverStatus, setDragOverStatus] = useState(null);
    const { user, planLimits } = useAuth();

    // Calculate active task count for limits
    const activeTaskCount = tasks.filter(t =>
        (t.status === 'Active Task' || t.status === '🔥 Active Task') && !t.archived_at
    ).length;
    const maxActiveTasks = planLimits?.maxActiveTasks || 1;

    // Financial State
    const [financials, setFinancials] = useState(null);
    const [loadingFinancials, setLoadingFinancials] = useState(false);
    const [financialError, setFinancialError] = useState(null);

    const fetchTasks = async () => {
        if(!client?.id) return;
        const { data } = await supabase
            .from('tasks')
            .select('*')
            .eq('membership_id', client.id)
            .order('updated_at', { ascending: false });
        setTasks(data || []);
    };

    const fetchComments = async (taskId) => {
        const { data } = await supabase
            .from('comments')
            .select('*')
            .eq('task_id', taskId)
            .eq('is_note', false)
            .order('created_at', { ascending: true });
        setComments(data || []);
    };

    const handlePostComment = async () => {
        if (!newComment.trim() || !activeTask) return;

        try {
            // Get the client contact ID for this user
            const { data: contactData } = await supabase
                .from('client_contacts')
                .select('id')
                .eq('email', user.email)
                .single();

            const newCommentData = {
                task_id: activeTask.id,
                content: newComment,
                author_contact_id: contactData?.id,
                created_at: new Date().toISOString(),
                orchestra_comment_id: `COM-${Date.now()}`
            };

            const { error } = await supabase
                .from('comments')
                .insert([newCommentData]);

            if (error) {
                console.error('Error posting comment:', error);
                toast.error('Failed to post comment');
            } else {
                setNewComment('');
                await fetchComments(activeTask.id);
                toast.success('Comment posted successfully');
            }
        } catch (err) {
            console.error('Error:', err);
        }
    };

    const openTaskDetails = (task) => {
        setActiveTask(task);
        fetchComments(task.id);
    };

    // Drag and drop handlers for status updates
    const handleDragStart = (e, task) => {
        setDraggedTask(task);
        e.dataTransfer.effectAllowed = 'move';

        // Create custom drag image
        const dragElement = e.currentTarget.cloneNode(true);
        dragElement.style.position = 'absolute';
        dragElement.style.top = '-9999px';
        dragElement.style.width = e.currentTarget.offsetWidth + 'px';
        dragElement.style.opacity = '1';
        dragElement.style.transform = 'rotate(3deg)';
        dragElement.style.border = '2px solid white';
        dragElement.style.borderRadius = '0.5rem';
        dragElement.style.boxShadow = '0 0 20px rgba(255, 255, 255, 0.3)';
        document.body.appendChild(dragElement);

        e.dataTransfer.setDragImage(dragElement, e.nativeEvent.offsetX, e.nativeEvent.offsetY);

        setTimeout(() => {
            if (dragElement.parentNode) {
                document.body.removeChild(dragElement);
            }
        }, 0);
    };

    const handleDragEnd = () => {
        setDraggedTask(null);
        setDragOverStatus(null);
    };

    const handleDragOver = (e, status) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverStatus(status);
    };

    const handleDrop = async (e, newStatus) => {
        e.preventDefault();
        if (draggedTask && draggedTask.status !== newStatus) {
            try {
                // Update task status
                const { error } = await supabase
                    .from('tasks')
                    .update({ status: newStatus, updated_at: new Date().toISOString() })
                    .eq('id', draggedTask.id);

                if (error) {
                    console.error('Error updating task status:', error);
                    toast.error('Failed to update task status');
                } else {
                    await fetchTasks(); // Reload tasks
                    toast.success('Task status updated');
                }
            } catch (err) {
                console.error('Error:', err);
            }
        }
        setDraggedTask(null);
        setDragOverStatus(null);
    };

    useEffect(() => {
        const savedPortal = localStorage.getItem('orchestra_portal_settings');
        if(savedPortal) setPortalSettings(JSON.parse(savedPortal));

        const savedAgency = localStorage.getItem('orchestra_agency_settings');
        if(savedAgency) setAgencySettings(JSON.parse(savedAgency));

        fetchTasks();
    }, [client]);

    // Fetch Financials when view changes to 'invoices'
    useEffect(() => {
        const fetchFinancials = async () => {
            if (!client?.stripe_customer_id) {
                setFinancialError("No billing account connected.");
                return;
            }

            setLoadingFinancials(true);
            setFinancialError(null);

            try {
                // Invoke the Supabase Edge Function
                const { data, error } = await supabase.functions.invoke('get-client-financials', {
                    body: { customerId: client.stripe_customer_id }
                });

                if (error) throw error;
                setFinancials(data);
            } catch (err) {
                console.error('Billing Error:', err);
                setFinancialError("Unable to load billing information.");
            } finally {
                setLoadingFinancials(false);
            }
        };

        if (view === 'invoices' && !financials) {
            fetchFinancials();
        }
    }, [view, client?.stripe_customer_id, financials]);

    const handleCreateRequest = async (e) => {
        e.preventDefault();
        if (!newRequestTitle.trim()) return;

        try {
            const newTask = {
                title: newRequestTitle,
                description: newRequestDescription,
                content: newRequestDescription,
                status: 'Backlog',
                membership_id: client.id,
                private: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                orchestra_task_id: `REQ-${Date.now()}`,
                properties: {
                    type: 'Request',
                    source: 'client_portal'
                }
            };

            const { data, error } = await supabase
                .from('tasks')
                .insert([newTask])
                .select();

            if (error) {
                console.error('Error creating request:', error);
                toast.error(`Error creating request: ${error.message}`);
            } else {
                console.log('Request created successfully:', data);
                setNewRequestTitle('');
                setNewRequestDescription('');
                setIsNewRequestOpen(false);
                await fetchTasks(); // Reload tasks
                toast.success('Request created successfully');
            }
        } catch (err) {
            console.error('Unexpected error:', err);
            toast.error('Failed to create request');
        }
    };

    const brandColor = agencySettings.brandColor || '#a3e635';
    const logo = agencySettings.logoUrl;

    // Helper to map raw status to our strict 4 statuses
    const normalizeStatus = (rawStatus) => {
        if (rawStatus === "Active Task" || rawStatus === "🔥 Active Task") return "Active Task";
        if (rawStatus === "Done") return "Done"; // Allow Done for historical view even if not in strict 4 config
        if (STATUS_CONFIG[rawStatus]) return rawStatus;
        return 'Backlog'; // Fallback
    };

    const formatCurrency = (amount, currency) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(amount / 100);
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
                        <Icon name="layout-grid-01" size={18} /> Home
                    </button>
                    <button onClick={() => setView('tasks')} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'tasks' ? 'bg-white/10 text-white' : 'text-neutral-400 hover:text-white'}`}>
                        <Icon name="file-01" size={18} /> Requests
                    </button>
                    <button onClick={() => setView('invoices')} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'invoices' ? 'bg-white/10 text-white' : 'text-neutral-400 hover:text-white'}`}>
                        <Icon name="card-01" size={18} /> Billing
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
                        <Icon name="logout-01" size={14} /> Exit Portal View
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
                                <div className="bg-[#141414] border border-neutral-800 rounded-xl p-6 group hover:border-neutral-700 transition-all">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-neutral-900 flex items-center justify-center text-white">
                                                <Icon name="folder" size={24} style={{color: brandColor}} />
                                            </div>
                                            <div>
                                                <h3 className="text-white font-bold text-lg">{planLimits?.planName || client.offer_type || 'Design Retainer'}</h3>
                                                <div className="flex items-center gap-2 text-sm text-neutral-500">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Active • Renews on {client.next_cycle_end_date || 'Dec 31'}
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                if (client.stripe_customer_id) {
                                                    redirectToCustomerPortal(client.stripe_customer_id).catch(err => {
                                                        toast.error('Unable to open billing portal');
                                                        console.error(err);
                                                    });
                                                } else {
                                                    setView('invoices');
                                                }
                                            }}
                                            className="px-4 py-2 bg-white text-black text-sm font-bold rounded-lg hover:bg-neutral-200 transition-colors flex items-center gap-2"
                                        >
                                            <Icon name="settings" size={14} />
                                            Manage Billing
                                        </button>
                                    </div>

                                    {/* Plan Limits Display */}
                                    {planLimits && (
                                        <div className="pt-4 mt-4 border-t border-neutral-800 grid grid-cols-2 gap-4">
                                            <div className="flex items-center gap-3 p-3 bg-neutral-900/50 rounded-lg">
                                                <Icon name="lightning-01" size={18} className="text-lime-400" />
                                                <div>
                                                    <div className="text-xs text-neutral-500">Active Tasks</div>
                                                    <div className="text-sm font-medium text-white">
                                                        {activeTaskCount}/{maxActiveTasks} at a time
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 p-3 bg-neutral-900/50 rounded-lg">
                                                <Icon name="clock-01" size={18} className="text-blue-400" />
                                                <div>
                                                    <div className="text-xs text-neutral-500">Turnaround</div>
                                                    <div className="text-sm font-medium text-white">
                                                        {planLimits.turnaroundHours}h per task
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* Recent Tasks */}
                            <section>
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-bold text-white">Recent Requests</h2>
                                    <button onClick={() => setView('tasks')} className="text-sm text-neutral-500 hover:text-white flex items-center gap-1">
                                        View all <Icon name="arrow-right" size={14} />
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {tasks.slice(0, 3).map(task => (
                                        <div key={task.id} className="flex items-center justify-between p-4 bg-[#141414] border border-neutral-800 rounded-xl hover:bg-[#1a1a1a] transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-2 rounded-lg ${normalizeStatus(task.status) === 'Done' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-neutral-800 text-neutral-400'}`}>
                                                    {normalizeStatus(task.status) === 'Done' ? <Icon name="check-contained" size={18}/> : <Icon name="clock-01" size={18}/>}
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
                                 <h1 className="font-lastik text-h6-brand text-white">Requests</h1>
                                 <div className="flex gap-3">
                                     <button
                                         onClick={() => setIsNewRequestOpen(true)}
                                         className="flex items-center gap-2 bg-lime-400 hover:bg-lime-500 text-black px-4 py-2 rounded-lg font-medium transition-colors"
                                     >
                                         <Icon name="plus-01" size={18} />
                                         New Request
                                     </button>
                                     <div className="flex bg-[#141414] p-1 rounded-lg border border-neutral-800">
                                        <button onClick={() => setTaskViewMode('kanban')} className={`p-2 rounded transition-colors ${taskViewMode === 'kanban' ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-white'}`}>
                                            <Icon name="layout-grid-01" size={16} />
                                        </button>
                                        <button onClick={() => setTaskViewMode('list')} className={`p-2 rounded transition-colors ${taskViewMode === 'list' ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-white'}`}>
                                            <Icon name="list" size={16} />
                                        </button>
                                     </div>
                                 </div>
                             </div>

                             {taskViewMode === 'list' ? (
                                 <div className="space-y-3">
                                    {tasks.map(task => (
                                        <div
                                            key={task.id}
                                            onClick={() => openTaskDetails(task)}
                                            className="flex items-center justify-between p-4 bg-[#141414] border border-neutral-800 hover:border-neutral-600 rounded-xl cursor-pointer transition-colors"
                                        >
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
                                             <div
                                                 key={status}
                                                 className="w-72 flex flex-col h-full"
                                                 onDragOver={(e) => handleDragOver(e, status)}
                                                 onDrop={(e) => handleDrop(e, status)}
                                             >
                                                 <div className="flex items-center gap-2 mb-4 px-1">
                                                     <Icon name={STATUS_CONFIG[status].iconName} size={14} className={STATUS_CONFIG[status].color} />
                                                     <h3 className="text-neutral-300 text-sm font-medium">{status}</h3>
                                                     <span className="bg-neutral-800 text-neutral-500 px-1.5 py-0.5 rounded text-[10px]">
                                                         {tasks.filter(t => normalizeStatus(t.status) === status).length}
                                                     </span>
                                                 </div>
                                                 
                                                 <div className={`flex-1 overflow-y-auto space-y-3 pr-2 pb-10 custom-scrollbar transition-all duration-300 ${dragOverStatus === status ? 'bg-white/5 border-2 border-white rounded-lg shadow-lg shadow-white/30' : 'border-2 border-transparent'}`}>
                                                     {tasks.filter(t => normalizeStatus(t.status) === status).map(task => (
                                                         <div
                                                             key={task.id}
                                                             draggable
                                                             onDragStart={(e) => handleDragStart(e, task)}
                                                             onDragEnd={handleDragEnd}
                                                             onClick={() => openTaskDetails(task)}
                                                             className={`bg-[#141414] border border-neutral-800 hover:border-neutral-600 rounded-lg p-4 cursor-move shadow-sm transition-colors ${draggedTask?.id === task.id ? 'opacity-50' : ''}`}
                                                         >
                                                             <h4 className="text-sm text-neutral-200 font-medium mb-2 leading-snug">{task.title}</h4>
                                                             {task.description && <p className="text-xs text-neutral-500 line-clamp-2 mb-3">{task.description}</p>}
                                                             <div className="flex items-center justify-between pt-2 border-t border-neutral-800/50">
                                                                 <div className="text-[10px] text-neutral-600 flex items-center gap-1">
                                                                     <Icon name="clock-01" size={10} /> {new Date(task.updated_at).toLocaleDateString()}
                                                                 </div>
                                                             </div>
                                                         </div>
                                                     ))}
                                                     {tasks.filter(t => normalizeStatus(t.status) === status).length === 0 && (
                                                        <div className="border border-dashed border-neutral-800 rounded-lg h-24 flex flex-col items-center justify-center text-neutral-600 gap-2 opacity-50">
                                                            <div className="p-2 bg-neutral-900 rounded-full"><Icon name="arrow-up-right" size={12}/></div>
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
                        <div className="animate-fade-in max-w-4xl mx-auto w-full">
                            <h1 className="font-lastik text-h6-brand text-white mb-6">Billing & Invoices</h1>
                            
                            {loadingFinancials ? (
                                <div className="space-y-4">
                                    <div className="h-32 bg-[#141414] border border-neutral-800 rounded-xl animate-pulse"></div>
                                    <div className="h-20 bg-[#141414] border border-neutral-800 rounded-xl animate-pulse"></div>
                                    <div className="h-20 bg-[#141414] border border-neutral-800 rounded-xl animate-pulse"></div>
                                </div>
                            ) : financialError ? (
                                <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-lg flex items-center gap-3 text-red-400">
                                    <Icon name="alert-circle" size={20} />
                                    <span>{financialError}</span>
                                </div>
                            ) : !financials ? (
                                <div className="text-neutral-500">No data available.</div>
                            ) : (
                                <div className="space-y-8">
                                    {/* 1. Subscription & Upcoming Payment Overview */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Status Card */}
                                        <div className="bg-[#141414] border border-neutral-800 rounded-xl p-6 relative overflow-hidden">
                                            <div className="relative z-10">
                                                <div className="flex items-center gap-2 mb-4">
                                                    <div className={`w-2 h-2 rounded-full ${financials.subscription.active ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                                                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Current Plan</span>
                                                </div>
                                                <div className="font-lastik text-h6-brand text-white mb-1">
                                                    {financials.subscription.plans[0]?.product_name || 'No Active Plan'}
                                                </div>
                                                <div className="text-sm text-neutral-500">
                                                    {financials.subscription.plans[0] ? 
                                                        `${formatCurrency(financials.subscription.plans[0].amount, financials.client.currency)} / ${financials.subscription.plans[0].interval}` 
                                                        : 'Contact support to activate'}
                                                </div>
                                            </div>
                                            <div className="absolute right-[-20px] top-[-20px] w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl"></div>
                                        </div>

                                        {/* Next Invoice Card */}
                                        {financials.upcoming_payment && (
                                            <div className="bg-[#141414] border border-neutral-800 rounded-xl p-6 relative overflow-hidden">
                                                 <div className="relative z-10">
                                                    <div className="flex items-center gap-2 mb-4">
                                                        <Icon name="calendar-01" size={14} className="text-neutral-400"/>
                                                        <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Next Invoice</span>
                                                    </div>
                                                    <div className="font-lastik text-h6-brand text-white mb-1">
                                                        {formatCurrency(financials.upcoming_payment.amount_due, financials.upcoming_payment.currency)}
                                                    </div>
                                                    <div className="text-sm text-neutral-500">
                                                        Scheduled for {new Date(financials.upcoming_payment.date * 1000).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* 2. Invoice History */}
                                    <div>
                                        <h2 className="text-lg font-bold text-white mb-4">Invoice History</h2>
                                        <div className="bg-[#141414] border border-neutral-800 rounded-xl overflow-hidden divide-y divide-neutral-800">
                                            {financials.history.length > 0 ? financials.history.map(invoice => (
                                                <div key={invoice.id} className="p-4 flex items-center justify-between group hover:bg-[#1a1a1a] transition-colors">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`p-2 rounded-lg ${invoice.status === 'paid' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                                            {invoice.status === 'paid' ? <Icon name="check-contained" size={18} /> : <Icon name="clock-01" size={18} />}
                                                        </div>
                                                        <div>
                                                            <div className="text-white font-medium text-sm flex items-center gap-2">
                                                                {new Date(invoice.date * 1000).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                                                                <span className="text-neutral-600 font-normal text-xs">• {invoice.number}</span>
                                                            </div>
                                                            <div className="text-xs text-neutral-500">
                                                                {invoice.status === 'paid' ? `Paid on ${new Date(invoice.paid_at * 1000).toLocaleDateString()}` : 'Payment Pending'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <span className="text-white font-mono text-sm font-medium">
                                                            {formatCurrency(invoice.amount_paid, invoice.currency)}
                                                        </span>
                                                        {invoice.pdf_url && (
                                                            <a 
                                                                href={invoice.pdf_url} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer" 
                                                                className="p-2 text-neutral-500 hover:text-white hover:bg-neutral-800 rounded-lg transition-all"
                                                                title="Download Invoice PDF"
                                                            >
                                                                <Icon name="download" size={16} />
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            )) : (
                                                <div className="p-8 text-center text-neutral-500 text-sm">No invoices found.</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* NEW REQUEST MODAL */}
            {isNewRequestOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-[#1a1a1a] border border-neutral-800 rounded-2xl w-full max-w-2xl animate-scale-in">
                        <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
                            <h2 className="font-lastik text-h6-brand text-white">Create New Request</h2>
                            <button
                                onClick={() => setIsNewRequestOpen(false)}
                                className="text-neutral-500 hover:text-white transition-colors"
                            >
                                <Icon name="x-01" size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateRequest} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-neutral-400 mb-2">
                                    Request Title *
                                </label>
                                <input
                                    type="text"
                                    value={newRequestTitle}
                                    onChange={(e) => setNewRequestTitle(e.target.value)}
                                    placeholder="What do you need help with?"
                                    className="w-full bg-[#0f0f0f] border border-neutral-800 rounded-lg px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-lime-400 transition-colors"
                                    autoFocus
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-neutral-400 mb-2">
                                    Description
                                </label>
                                <textarea
                                    value={newRequestDescription}
                                    onChange={(e) => setNewRequestDescription(e.target.value)}
                                    placeholder="Provide details about your request..."
                                    rows={6}
                                    className="w-full bg-[#0f0f0f] border border-neutral-800 rounded-lg px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-lime-400 transition-colors resize-none"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsNewRequestOpen(false)}
                                    className="px-4 py-2 text-neutral-400 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!newRequestTitle.trim()}
                                    className="px-6 py-2 bg-lime-400 hover:bg-lime-500 text-black font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Create Request
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* TASK DETAILS SLIDE-OVER */}
            {activeTask && (
                <div className="fixed inset-y-0 right-0 w-full md:w-[600px] bg-[#0f0f0f] border-l border-neutral-800 z-50 animate-slide-in-right flex flex-col">
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between shrink-0">
                        <h2 className="text-lg font-bold text-white">Request Details</h2>
                        <button
                            onClick={() => setActiveTask(null)}
                            className="text-neutral-500 hover:text-white transition-colors"
                        >
                            <Icon name="x-01" size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {/* Task Info */}
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_CONFIG[normalizeStatus(activeTask.status)]?.color || 'text-neutral-500'} bg-neutral-800`}>
                                    {activeTask.status}
                                </span>
                            </div>
                            <h3 className="font-lastik text-h6-brand text-white mb-2">{activeTask.title}</h3>
                            {activeTask.description && (
                                <div className="text-neutral-400 text-sm whitespace-pre-wrap">{activeTask.description}</div>
                            )}
                        </div>

                        {/* Comments Section */}
                        <div>
                            <h4 className="text-sm font-bold text-white mb-3">Activity</h4>
                            <div className="space-y-4">
                                {comments.map(comment => (
                                    <div key={comment.id} className="flex gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
                                            {client.client_name?.[0] || '?'}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-sm font-medium text-white">You</span>
                                                <span className="text-xs text-neutral-600">
                                                    {new Date(comment.created_at).toLocaleString()}
                                                </span>
                                            </div>
                                            <div
                                                className="text-sm text-neutral-300"
                                                dangerouslySetInnerHTML={{ __html: (comment.content || '').replace(/<br>/gi, '<br />') }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Comment Input */}
                    <div className="p-6 border-t border-neutral-800 shrink-0">
                        <div className="flex gap-2">
                            <textarea
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Add a comment..."
                                rows={2}
                                className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2 text-white placeholder-neutral-600 focus:outline-none focus:border-lime-400 transition-colors resize-none text-sm"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handlePostComment();
                                    }
                                }}
                            />
                            <button
                                onClick={handlePostComment}
                                disabled={!newComment.trim()}
                                className="px-4 py-2 bg-lime-400 hover:bg-lime-500 text-black font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed self-end"
                            >
                                Send
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};