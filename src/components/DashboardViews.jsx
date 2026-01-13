import React, { useState } from 'react';
import { Search, Filter, MoreHorizontal, Wallet, TrendingUp, X, Calendar, CreditCard, Database, CheckCircle2, AlertCircle, Upload, Building2, DollarSign, Plus, ExternalLink } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useToast } from './Toast';

// --- Analytics View (Real Implementation) ---
// Now receives filtered tasks, clients, and team as props from App.jsx
export const AnalyticsView = ({ tasks = [], clients = [], team = [] }) => {
  // Data is passed as props (already filtered by App.jsx based on user role and filters)
  if (!tasks || tasks.length === 0) {
    return <div className="h-full flex items-center justify-center text-neutral-500">No tasks to analyze</div>;
  }

  const totalTasks = tasks.length;
  const activeTasks = tasks.filter(t => t.status === 'Active Task').length;
  const completedTasks = tasks.filter(t => t.status === 'Done').length;
  const activeClients = clients.filter(c => c.status === 'En cours' || c.status === 'Start' || c.status === 'Active').length;

  // Calculate median task completion time
  const completedTasksWithDates = tasks.filter(t => t.status === 'Done' && t.created_at && t.updated_at);
  const completionTimes = completedTasksWithDates.map(t => {
    const created = new Date(t.created_at);
    const completed = new Date(t.updated_at);
    return (completed - created) / (1000 * 60 * 60 * 24); // days
  }).sort((a, b) => a - b);
  const medianCompletionTime = completionTimes.length > 0
    ? completionTimes[Math.floor(completionTimes.length / 2)].toFixed(2)
    : 0;

  // Tasks worked on (recently updated in last 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const tasksWorkedOn = tasks.filter(t => new Date(t.updated_at) > sevenDaysAgo).length;

  // Paused clients
  const pausedClients = clients.filter(c => (c.status || '').toLowerCase().includes('pause')).length;

  const tasksByStatus = {
    'Backlog': tasks.filter(t => t.status === 'Backlog').length,
    'Active Task': activeTasks,
    'To Review': tasks.filter(t => t.status === 'To Review').length,
    'Done': completedTasks,
    'Cancelled': tasks.filter(t => t.status === 'Cancelled').length,
  };

  const teamWorkload = team.map(member => ({
    name: member.full_name || member.email,
    tasks: tasks.filter(t => t.assigned_to_id === member.id).length
  })).sort((a, b) => b.tasks - a.tasks);

  const recentActivity = tasks
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    .slice(0, 10);

  return (
    <div className="h-full overflow-y-auto custom-scrollbar bg-black p-8 animate-fade-in">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Analytics</h1>

        {/* Stats Grid - Row 1 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-[#141414] border border-neutral-800 rounded-xl p-6 hover:border-lime-400/50 hover:shadow-lg hover:shadow-lime-400/10 transition-all duration-300 cursor-pointer group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-neutral-500 text-sm group-hover:text-neutral-400 transition-colors">Active subscribers</span>
              <Building2 size={16} className="text-lime-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-3xl font-bold text-white">{activeClients}</div>
            <p className="text-xs text-neutral-600 mt-1">Currently active clients</p>
          </div>

          <div className="bg-[#141414] border border-neutral-800 rounded-xl p-6 hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/10 transition-all duration-300 cursor-pointer group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-neutral-500 text-sm group-hover:text-neutral-400 transition-colors">Paused subscribers</span>
              <AlertCircle size={16} className="text-amber-500 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-3xl font-bold text-white">{pausedClients}</div>
            <p className="text-xs text-neutral-600 mt-1">On hold or paused</p>
          </div>

          <div className="bg-[#141414] border border-neutral-800 rounded-xl p-6 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300 cursor-pointer group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-neutral-500 text-sm group-hover:text-neutral-400 transition-colors">Tasks worked on</span>
              <Database size={16} className="text-blue-500 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-3xl font-bold text-white">{tasksWorkedOn}</div>
            <p className="text-xs text-neutral-600 mt-1">Updated in last 7 days</p>
          </div>

          <div className="bg-[#141414] border border-neutral-800 rounded-xl p-6 hover:border-green-500/50 hover:shadow-lg hover:shadow-green-500/10 transition-all duration-300 cursor-pointer group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-neutral-500 text-sm group-hover:text-neutral-400 transition-colors">Median task completion time</span>
              <CheckCircle2 size={16} className="text-green-500 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-3xl font-bold text-white">{medianCompletionTime}<span className="text-lg text-neutral-500">d</span></div>
            <p className="text-xs text-neutral-600 mt-1">Average completion days</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tasks by Status */}
          <div className="bg-[#141414] border border-neutral-800 rounded-xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">Tasks by Status</h2>
            <div className="space-y-3">
              {Object.entries(tasksByStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <span className="text-neutral-400 text-sm">{status}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-2 bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-lime-400 rounded-full"
                        style={{ width: `${(count / totalTasks) * 100}%` }}
                      />
                    </div>
                    <span className="text-white font-medium w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Team Workload */}
          <div className="bg-[#141414] border border-neutral-800 rounded-xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">Team Workload</h2>
            <div className="space-y-3">
              {teamWorkload.slice(0, 8).map((member, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-neutral-400 text-sm truncate">{member.name}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-2 bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${Math.min((member.tasks / 10) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-white font-medium w-8 text-right">{member.tasks}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-[#141414] border border-neutral-800 rounded-xl p-6 lg:col-span-2">
            <h2 className="text-lg font-bold text-white mb-4">Recent Activity</h2>
            <div className="space-y-2">
              {recentActivity.map((task) => (
                <div key={task.id} className="flex items-center justify-between py-2 border-b border-neutral-800 last:border-0">
                  <div className="flex-1">
                    <p className="text-white text-sm">{task.title}</p>
                    <p className="text-neutral-500 text-xs">
                      {task.status} • {new Date(task.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Payments View (Real Implementation) ---
export const PaymentsView = () => {
  const [clients, setClients] = React.useState([]);
  const [cycles, setCycles] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [clientsData, cyclesData] = await Promise.all([
          supabase.from('client_memberships').select('*'),
          supabase.from("Clara's V2 of 🔄 Cycles").select('*')
        ]);

        setClients(clientsData.data || []);
        setCycles(cyclesData.data || []);
      } catch (error) {
        console.error('Error fetching payments data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div className="h-full flex items-center justify-center text-neutral-500">Loading payments...</div>;

  const activeClients = clients.filter(c => c.status === 'En cours' || c.status === 'Start' || c.status === 'Active');
  const totalMRR = activeClients.reduce((sum, c) => sum + (c.monthly_amount_cents || 0), 0);
  const totalARR = totalMRR * 12;

  const activeCycles = cycles.filter(c => {
    const status = (c.status_from_agreement?.[0] || '').toLowerCase();
    return status.includes('active') || status.includes('en cours');
  });

  const formatCurrency = (cents) => {
    if (!cents && cents !== 0) return '€0';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents);
  };

  const getStatusStyle = (status) => {
    const s = (status || '').toLowerCase();
    if (s.includes('en cours') || s.includes('active') || s.includes('start')) {
      return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    }
    if (s.includes('pause')) {
      return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    }
    return 'bg-neutral-800 text-neutral-400 border-neutral-700';
  };

  // Sort clients by MRR descending
  const sortedClients = [...activeClients].sort((a, b) => (b.monthly_amount_cents || 0) - (a.monthly_amount_cents || 0));

  return (
    <div className="h-full overflow-y-auto custom-scrollbar bg-black p-8 animate-fade-in">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Payments & Revenue</h1>
            <p className="text-sm text-neutral-500 mt-1">Track monthly recurring revenue and client billing</p>
          </div>
        </div>

        {/* Revenue Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-[#141414] border border-neutral-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-neutral-500 text-sm">Monthly Recurring Revenue</span>
              <TrendingUp size={16} className="text-lime-400" />
            </div>
            <div className="text-3xl font-bold text-white">{formatCurrency(totalMRR)}</div>
            <p className="text-xs text-neutral-600 mt-1">MRR from {activeClients.length} active clients</p>
          </div>

          <div className="bg-[#141414] border border-neutral-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-neutral-500 text-sm">Annual Recurring Revenue</span>
              <Calendar size={16} className="text-blue-500" />
            </div>
            <div className="text-3xl font-bold text-white">{formatCurrency(totalARR)}</div>
            <p className="text-xs text-neutral-600 mt-1">Projected annual revenue</p>
          </div>

          <div className="bg-[#141414] border border-neutral-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-neutral-500 text-sm">Active Subscriptions</span>
              <CheckCircle2 size={16} className="text-emerald-500" />
            </div>
            <div className="text-3xl font-bold text-white">{activeClients.length}</div>
            <p className="text-xs text-neutral-600 mt-1">Clients with active billing</p>
          </div>

          <div className="bg-[#141414] border border-neutral-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-neutral-500 text-sm">Active Cycles</span>
              <AlertCircle size={16} className="text-amber-500" />
            </div>
            <div className="text-3xl font-bold text-white">{activeCycles.length}</div>
            <p className="text-xs text-neutral-600 mt-1">Currently running cycles</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Client Revenue Breakdown */}
          <div className="bg-[#141414] border border-neutral-800 rounded-xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">Revenue by Client</h2>
            <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
              {sortedClients.map((client) => {
                const percentage = totalMRR > 0 ? ((client.monthly_amount_cents || 0) / totalMRR) * 100 : 0;
                return (
                  <div key={client.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center text-white font-bold text-xs shrink-0">
                        {client.client_name ? client.client_name[0].toUpperCase() : '?'}
                      </div>
                      <span className="text-neutral-300 text-sm truncate">{client.client_name || 'Unknown'}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="w-24 h-2 bg-neutral-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-lime-400 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-white font-medium font-mono text-sm w-20 text-right">
                        {formatCurrency(client.monthly_amount_cents || 0)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Subscriptions */}
          <div className="bg-[#141414] border border-neutral-800 rounded-xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">Recent Subscriptions</h2>
            <div className="space-y-3">
              {clients
                .sort((a, b) => new Date(b.start_date || 0) - new Date(a.start_date || 0))
                .slice(0, 8)
                .map((client) => (
                  <div key={client.id} className="flex items-center justify-between py-2 border-b border-neutral-800 last:border-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-white text-sm font-medium truncate">{client.client_name || 'Unknown'}</p>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getStatusStyle(client.status)}`}>
                          {client.status || 'Unknown'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-neutral-500 text-xs">
                          {client.start_date ? new Date(client.start_date).toLocaleDateString() : 'N/A'}
                        </p>
                        <span className="text-neutral-700">•</span>
                        <p className="text-neutral-500 text-xs">{client.offer_type || 'Custom'}</p>
                      </div>
                    </div>
                    <div className="text-white font-mono font-medium text-sm shrink-0 ml-4">
                      {formatCurrency(client.monthly_amount_cents || 0)}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Client Details Slide-over (UPDATED) ---
const ClientDetails = ({ client, onClose, onOpenPortal }) => {
    if (!client) return null;

    const formatCurrency = (amount) => {
        if (!amount) return '-';
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div 
                className="w-full max-w-md h-full bg-[#0f0f0f] shadow-2xl border-l border-neutral-800 flex flex-col animate-slide-in-right"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="h-16 border-b border-neutral-800 flex items-center justify-between px-6 bg-[#0f0f0f] shrink-0">
                    <h2 className="text-lg font-bold text-white">Client Details</h2>
                    <div className="flex items-center gap-4">
                         {/* PORTAL BUTTON */}
                        <button 
                            onClick={() => onOpenPortal(client)}
                            className="text-[10px] font-bold text-blue-500 hover:text-blue-400 uppercase tracking-wide flex items-center gap-1 transition-colors"
                        >
                            Open portal as customer <ExternalLink size={10} />
                        </button>
                        <button onClick={onClose} className="text-neutral-400 hover:text-white transition-colors bg-neutral-900 p-1.5 rounded-full">
                            <X size={18}/>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    <div className="flex flex-col items-center mb-8">
                        <div className="w-20 h-20 rounded-2xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-white font-bold text-3xl shadow-inner mb-4">
                            {client.client_name ? client.client_name[0].toUpperCase() : '?'}
                        </div>
                        <h1 className="text-2xl font-bold text-white text-center">{client.client_name}</h1>
                        <div className="flex items-center gap-2 mt-2">
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-neutral-800 text-neutral-400 border border-neutral-700">Member</span>
                            {client.status === 'En cours' && (
                                <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Active
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* General Information Group */}
                        <div>
                            <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-4 px-1">Subscription Information</h3>
                            <div className="bg-[#141414] rounded-xl border border-neutral-800 overflow-hidden">
                                <div className="p-4 border-b border-neutral-800/50 flex justify-between items-center">
                                    <div className="flex items-center gap-3 text-sm text-neutral-400">
                                        <Wallet size={16} /> Monthly Revenue (MRR)
                                    </div>
                                    <span className="text-white font-mono font-medium">{formatCurrency(client.monthly_amount_cents)}</span>
                                </div>
                                <div className="p-4 border-b border-neutral-800/50 flex justify-between items-center">
                                    <div className="flex items-center gap-3 text-sm text-neutral-400">
                                        <CheckCircle2 size={16} /> Offer Type
                                    </div>
                                    <span className="text-white font-medium">{client.offer_type || 'Custom'}</span>
                                </div>
                                <div className="p-4 border-b border-neutral-800/50 flex justify-between items-center">
                                    <div className="flex items-center gap-3 text-sm text-neutral-400">
                                        <Calendar size={16} /> Start Date
                                    </div>
                                    <span className="text-white">{client.start_date ? new Date(client.start_date).toLocaleDateString() : 'N/A'}</span>
                                </div>
                                <div className="p-4 flex justify-between items-center">
                                    <div className="flex items-center gap-3 text-sm text-neutral-400">
                                        <AlertCircle size={16} /> Next Renewal
                                    </div>
                                    <span className="text-white">{client.next_cycle_end_date ? new Date(client.next_cycle_end_date).toLocaleDateString() : 'N/A'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Technical IDs Group */}
                        <div>
                            <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-4 px-1">Technical Details</h3>
                            <div className="bg-[#141414] rounded-xl border border-neutral-800 overflow-hidden">
                                <div className="p-4 border-b border-neutral-800/50 flex flex-col gap-1">
                                    <div className="flex items-center gap-3 text-sm text-neutral-400 mb-1">
                                        <CreditCard size={16} /> Stripe Customer ID
                                    </div>
                                    <span className="text-xs text-neutral-500 font-mono break-all">{client.stripe_customer_id || 'N/A'}</span>
                                </div>
                                <div className="p-4 flex flex-col gap-1">
                                    <div className="flex items-center gap-3 text-sm text-neutral-400 mb-1">
                                        <Database size={16} /> Airtable Record ID
                                    </div>
                                    <span className="text-xs text-neutral-500 font-mono break-all">{client.airtable_record_id || 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- New Client Modal ---
const NewClientModal = ({ isOpen, onClose, onClientAdded }) => {
    const toast = useToast();
    const [formData, setFormData] = useState({
        client_name: '',
        offer_type: 'Scale',
        status: 'En cours',
        monthly_amount: '',
        start_date: new Date().toISOString().split('T')[0],
        stripe_customer_id: ''
    });
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Convert amount to cents for storage
            const amountCents = formData.monthly_amount ? parseInt(formData.monthly_amount) * 100 : 0; 

            const payload = {
                client_name: formData.client_name,
                offer_type: formData.offer_type,
                status: formData.status,
                monthly_amount_cents: amountCents, // Use correct column name from schema
                start_date: formData.start_date,
                stripe_customer_id: formData.stripe_customer_id,
                orchestra_id: `ORCH-${Date.now().toString(36).toUpperCase()}`
            };

            const { data, error } = await supabase.from('client_memberships').insert([payload]).select();

            if (error) throw error;
            
            if (onClientAdded && data) {
                onClientAdded(data[0]);
            }
            onClose();
        } catch (error) {
            console.error("Error adding client:", error);
            toast.error("Failed to add client: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-4">
            <div className="bg-[#0f0f0f] border border-neutral-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-scale-up">
                <div className="px-6 py-5 border-b border-neutral-800 flex justify-between items-center bg-[#141414]">
                    <div>
                        <h2 className="text-lg font-bold text-white">New Client</h2>
                        <p className="text-neutral-500 text-xs mt-0.5">Add a new company to your agency.</p>
                    </div>
                    <button onClick={onClose} className="text-neutral-400 hover:text-white p-1 hover:bg-neutral-800 rounded-lg transition-colors"><X size={20}/></button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Name Input */}
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-neutral-400 uppercase tracking-wide ml-1">Company Name</label>
                        <div className="relative group">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within:text-white transition-colors" size={18} />
                            <input 
                                type="text" 
                                required
                                placeholder="e.g. Acme Corp"
                                className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-600 focus:ring-1 focus:ring-neutral-600 transition-all"
                                value={formData.client_name}
                                onChange={e => setFormData({...formData, client_name: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                        {/* Offer Type */}
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-neutral-400 uppercase tracking-wide ml-1">Offer Plan</label>
                            <select 
                                className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-neutral-600 transition-all appearance-none cursor-pointer"
                                value={formData.offer_type}
                                onChange={e => setFormData({...formData, offer_type: e.target.value})}
                            >
                                <option value="Scale">Scale</option>
                                <option value="Grow">Grow</option>
                                <option value="Enterprise">Enterprise</option>
                                <option value="Custom">Custom</option>
                            </select>
                        </div>

                        {/* Status */}
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-neutral-400 uppercase tracking-wide ml-1">Initial Status</label>
                            <select 
                                className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-neutral-600 transition-all appearance-none cursor-pointer"
                                value={formData.status}
                                onChange={e => setFormData({...formData, status: e.target.value})}
                            >
                                <option value="En cours">Active (En cours)</option>
                                <option value="Start">Onboarding (Start)</option>
                                <option value="Pause">Paused</option>
                                <option value="Finito">Churned</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                        {/* MRR Input */}
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-neutral-400 uppercase tracking-wide ml-1">Monthly Revenue (€)</label>
                            <div className="relative group">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within:text-emerald-500 transition-colors" size={16} />
                                <input 
                                    type="number" 
                                    required
                                    min="0"
                                    placeholder="5000"
                                    className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all font-mono"
                                    value={formData.monthly_amount}
                                    onChange={e => setFormData({...formData, monthly_amount: e.target.value})}
                                />
                            </div>
                        </div>

                         {/* Start Date */}
                         <div className="space-y-2">
                            <label className="text-xs font-medium text-neutral-400 uppercase tracking-wide ml-1">Start Date</label>
                            <div className="relative group">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within:text-white transition-colors" size={16} />
                                <input 
                                    type="date" 
                                    required
                                    className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-neutral-600 transition-all [color-scheme:dark]"
                                    value={formData.start_date}
                                    onChange={e => setFormData({...formData, start_date: e.target.value})}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Stripe ID (Optional) */}
                    <div className="space-y-2 pt-2 border-t border-neutral-800/50">
                        <label className="text-xs font-medium text-neutral-500 uppercase tracking-wide ml-1">Stripe Customer ID (Optional)</label>
                        <div className="relative group">
                            <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within:text-neutral-400 transition-colors" size={16} />
                            <input 
                                type="text" 
                                placeholder="cus_..."
                                className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-xl py-3 pl-10 pr-4 text-sm text-neutral-300 placeholder-neutral-700 focus:outline-none focus:border-neutral-600 transition-all font-mono text-xs"
                                value={formData.stripe_customer_id}
                                onChange={e => setFormData({...formData, stripe_customer_id: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button 
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 rounded-xl border border-neutral-800 text-neutral-400 text-sm font-medium hover:bg-neutral-900 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            disabled={loading}
                            className="flex-[2] py-3 rounded-xl bg-white text-black text-sm font-bold hover:bg-neutral-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? 'Creating...' : 'Create Client'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- Customers View (Main Implementation) ---
export const CustomersView = ({ clients: initialClients, onOpenPortal }) => {
  const [clients, setClients] = useState(initialClients);
  const [selectedClient, setSelectedClient] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'paused', 'inactive'

  React.useEffect(() => {
      if(initialClients) setClients(initialClients);
  }, [initialClients]);

  const handleClientAdded = (newClient) => {
      setClients(prev => [...prev, newClient]);
  };

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '-';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR', 
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusStyle = (status) => {
    const s = (status || '').toLowerCase();
    if (s.includes('en cours') || s.includes('active') || s.includes('start')) {
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    }
    if (s.includes('finito') || s.includes('churn') || s.includes('cancel') || s.includes('inactive')) {
        return 'bg-neutral-800 text-neutral-400 border-neutral-700';
    }
    if (s.includes('pause')) {
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    }
    return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
  };

  // Filter and sort clients
  const filteredAndSortedClients = [...clients]
    .filter(client => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery ||
        (client.client_name || '').toLowerCase().includes(searchLower) ||
        (client.offer_type || '').toLowerCase().includes(searchLower);

      // Status filter
      const status = (client.status || '').toLowerCase();
      let matchesStatus = true;
      if (statusFilter === 'active') {
        matchesStatus = status.includes('en cours') || status.includes('start') || status.includes('active');
      } else if (statusFilter === 'paused') {
        matchesStatus = status.includes('pause');
      } else if (statusFilter === 'inactive') {
        matchesStatus = status.includes('finito') || status.includes('churn') || status.includes('cancel') || status.includes('inactive');
      }

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const isAActive = (a.status || '').toLowerCase().includes('en cours');
      const isBActive = (b.status || '').toLowerCase().includes('en cours');
      if (isAActive && !isBActive) return -1;
      if (!isAActive && isBActive) return 1;
      return 0;
    });

  return (
    <div className="p-8 max-w-[1600px] mx-auto h-full overflow-y-auto custom-scrollbar animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
            <h2 className="text-2xl font-bold text-white mb-1">Clients</h2>
            <p className="text-neutral-500 text-sm">Manage your client relationships and subscriptions.</p>
        </div>
        <div className="flex gap-3">
            <div className="flex items-center gap-3 bg-[#1a1a1a] border border-neutral-800 rounded-lg px-4 py-2 w-64 focus-within:border-neutral-600 transition-colors">
                <Search size={16} className="text-neutral-500" />
                <input
                    type="text"
                    placeholder="Search clients..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent border-none outline-none text-sm text-white w-full placeholder-neutral-600"
                />
            </div>
            <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] border border-neutral-800 rounded-lg text-sm text-neutral-300 hover:text-white hover:border-neutral-600 transition-colors outline-none cursor-pointer"
            >
                <option value="all">All Clients</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="inactive">Inactive</option>
            </select>
            <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg text-sm font-bold hover:bg-neutral-200 transition-colors active:scale-95"
            >
                <Plus size={16} /> Add Client
            </button>
        </div>
      </div>

      <div className="bg-[#0f0f0f] border border-neutral-800 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-[#141414] text-neutral-500 font-medium text-xs uppercase tracking-wider border-b border-neutral-800">
            <tr>
              <th className="px-6 py-4 font-medium w-1/2">Company</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium">MRR</th>
              <th className="px-6 py-4 text-right font-medium">Start Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/50">
            {filteredAndSortedClients.length === 0 ? (
              <tr>
                <td colSpan="4" className="px-6 py-12 text-center">
                  <div className="text-neutral-500">
                    {searchQuery || statusFilter !== 'all' ? 'No clients match your filters' : 'No clients yet'}
                  </div>
                </td>
              </tr>
            ) : (
              filteredAndSortedClients.map((client) => (
              <tr 
                key={client.id} 
                onClick={() => setSelectedClient(client)}
                className="group hover:bg-[#1a1a1a] transition-colors cursor-pointer"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center text-white font-bold text-base shadow-inner">
                      {client.client_name ? client.client_name[0].toUpperCase() : '?'}
                    </div>
                    <div>
                      <div className="flex items-baseline gap-2">
                          <span className="font-medium text-white text-base">{client.client_name || 'Unnamed Client'}</span>
                          {client.offer_type && (
                              <span className="text-neutral-500 text-xs uppercase tracking-wide font-medium border-l border-neutral-700 pl-2">
                                  {client.offer_type}
                              </span>
                          )}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${getStatusStyle(client.status)} capitalize`}>
                    <span className={`w-1.5 h-1.5 rounded-full mr-2 ${client.status === 'En cours' ? 'bg-emerald-500' : 'bg-current opacity-50'}`}></span>
                    {client.status || 'Unknown'}
                  </span>
                </td>
                <td className="px-6 py-4">
                    <div className="text-white font-mono">{formatCurrency(client.monthly_amount_cents)}</div>
                </td>
                <td className="px-6 py-4 text-right text-neutral-500">
                    {client.start_date ? new Date(client.start_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}
                </td>
              </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* PASS THE PORTAL HANDLER HERE */}
      <ClientDetails 
        client={selectedClient} 
        onClose={() => setSelectedClient(null)} 
        onOpenPortal={onOpenPortal} // Wired up
      />
      
      <NewClientModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onClientAdded={handleClientAdded} 
      />
    </div>
  );
};