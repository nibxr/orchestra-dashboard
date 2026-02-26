import React, { useState, useEffect } from 'react';
import {
    LayoutGrid,
    Users,
    CheckCircle2,
    Clock,
    AlertCircle,
    ArrowUpRight,
    TrendingUp,
    Calendar as CalendarIcon,
    Search,
    Filter,
    MoreVertical,
    Plus,
    CreditCard,
    DollarSign,
    Download,
    Building2,
    Database,
    ExternalLink,
    X,
    Wallet,
    Calendar, // Added missing import
    Pause,
    Play,
    XCircle,
    RefreshCw,
    Loader2,
    Shield,
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useToast } from './Toast';
import { manageSubscription, redirectToCustomerPortal } from '../utils/stripeService';
import { useConfirm } from './ConfirmModal';

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
    <div className="h-full overflow-y-auto custom-scrollbar bg-neutral-50 dark:bg-black p-8 animate-fade-in">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-8">Analytics</h1>

        {/* Stats Grid - Row 1 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-neutral-50 dark:bg-[#141414] border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 hover:border-lime-400/50 hover:shadow-lg hover:shadow-lime-400/10 transition-all duration-300 cursor-pointer group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-neutral-500 text-sm group-hover:text-neutral-500 dark:hover:text-neutral-400 transition-colors">Active subscribers</span>
              <Building2 size={16} className="text-lime-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-3xl font-bold text-neutral-900 dark:text-white">{activeClients}</div>
            <p className="text-xs text-neutral-600 mt-1">Currently active clients</p>
          </div>

          <div className="bg-neutral-50 dark:bg-[#141414] border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/10 transition-all duration-300 cursor-pointer group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-neutral-500 text-sm group-hover:text-neutral-500 dark:hover:text-neutral-400 transition-colors">Paused subscribers</span>
              <AlertCircle size={16} className="text-amber-500 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-3xl font-bold text-neutral-900 dark:text-white">{pausedClients}</div>
            <p className="text-xs text-neutral-600 mt-1">On hold or paused</p>
          </div>

          <div className="bg-neutral-50 dark:bg-[#141414] border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300 cursor-pointer group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-neutral-500 text-sm group-hover:text-neutral-500 dark:hover:text-neutral-400 transition-colors">Tasks worked on</span>
              <Database size={16} className="text-blue-500 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-3xl font-bold text-neutral-900 dark:text-white">{tasksWorkedOn}</div>
            <p className="text-xs text-neutral-600 mt-1">Updated in last 7 days</p>
          </div>

          <div className="bg-neutral-50 dark:bg-[#141414] border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 hover:border-green-500/50 hover:shadow-lg hover:shadow-green-500/10 transition-all duration-300 cursor-pointer group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-neutral-500 text-sm group-hover:text-neutral-500 dark:hover:text-neutral-400 transition-colors">Median task completion time</span>
              <CheckCircle2 size={16} className="text-green-500 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-3xl font-bold text-neutral-900 dark:text-white">{medianCompletionTime}<span className="text-lg text-neutral-500">d</span></div>
            <p className="text-xs text-neutral-600 mt-1">Average completion days</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tasks by Status */}
          <div className="bg-neutral-50 dark:bg-[#141414] border border-neutral-200 dark:border-neutral-800 rounded-xl p-6">
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-4">Tasks by Status</h2>
            <div className="space-y-3">
              {Object.entries(tasksByStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <span className="text-neutral-400 text-sm">{status}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-2 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-lime-400 rounded-full"
                        style={{ width: `${(count / totalTasks) * 100}%` }}
                      />
                    </div>
                    <span className="text-neutral-900 dark:text-white font-medium w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Team Workload */}
          <div className="bg-neutral-50 dark:bg-[#141414] border border-neutral-200 dark:border-neutral-800 rounded-xl p-6">
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-4">Team Workload</h2>
            <div className="space-y-3">
              {teamWorkload.slice(0, 8).map((member, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-neutral-400 text-sm truncate">{member.name}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-2 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${Math.min((member.tasks / 10) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-neutral-900 dark:text-white font-medium w-8 text-right">{member.tasks}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-neutral-50 dark:bg-[#141414] border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 lg:col-span-2">
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-4">Recent Activity</h2>
            <div className="space-y-2">
              {recentActivity.map((task) => (
                <div key={task.id} className="flex items-center justify-between py-2 border-b border-neutral-200 dark:border-neutral-800 last:border-0">
                  <div className="flex-1">
                    <p className="text-neutral-900 dark:text-white text-sm">{task.title}</p>
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

// --- Payments View (Revamped) ---
export const PaymentsView = () => {
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [financials, setFinancials] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingFinancials, setLoadingFinancials] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [subAction, setSubAction] = useState(null);
  const toast = useToast();
  const { confirm } = useConfirm();

  // Currency formatter — cents to display
  const fmtCents = (amount, currency = 'eur') => {
      if (!amount && amount !== 0) return '—';
      const code = currency ? currency.toUpperCase() : 'EUR';
      try {
        return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: code }).format(amount / 100);
      } catch {
        return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount / 100);
      }
  };

  // Currency formatter — euros (not cents)
  const fmtEuros = (amount) => {
      if (!amount && amount !== 0) return '—';
      return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
  };

  const getStatusConfig = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'en cours' || s === 'active') return { label: 'Active', dot: 'bg-emerald-500', bg: 'bg-emerald-500/10 text-emerald-500' };
    if (s === 'paused') return { label: 'Paused', dot: 'bg-amber-500', bg: 'bg-amber-500/10 text-amber-500' };
    if (s === 'cancelling') return { label: 'Cancelling', dot: 'bg-orange-500', bg: 'bg-orange-500/10 text-orange-500' };
    if (s === 'canceled') return { label: 'Canceled', dot: 'bg-red-500', bg: 'bg-red-500/10 text-red-500' };
    if (s === 'payment failed') return { label: 'Failed', dot: 'bg-red-500', bg: 'bg-red-500/10 text-red-500' };
    if (s === 'pending') return { label: 'Pending', dot: 'bg-neutral-400', bg: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500' };
    return { label: status || '—', dot: 'bg-neutral-400', bg: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500' };
  };

  // 1. Fetch all clients with plan names + MRR
  useEffect(() => {
      const fetchClients = async () => {
          setLoading(true);
          const { data } = await supabase
              .from('client_memberships')
              .select(`
                  id, client_name, stripe_customer_id, offer_type, status,
                  monthly_amount_cents,
                  plan_from_agreements,
                  "Plans" ( plan_name, monthly_price_ht )
              `)
              .order('client_name');

          const enriched = (data || []).map(c => ({
              ...c,
              plan_name: c['Plans']?.plan_name || c.offer_type || null,
              // MRR: prefer plan's euro price; only fall back to monthly_amount_cents (which is in cents) if no plan linked
              mrr: c['Plans']?.monthly_price_ht || (c.monthly_amount_cents ? c.monthly_amount_cents / 100 : null),
          }));

          setClients(enriched);
          setLoading(false);
      };
      fetchClients();
  }, []);

  // 2. Fetch financials when a client is selected
  useEffect(() => {
      if (!selectedClient) { setFinancials(null); return; }

      const fetchFinancials = async () => {
          setLoadingFinancials(true);
          setFinancials(null);
          try {
              const { data, error } = await supabase.functions.invoke('get-client-financials', {
                  body: { membershipId: selectedClient.id }
              });
              if (error) throw error;
              if (!data) throw new Error('No data returned');
              // supabase.functions.invoke may return a string or parsed object depending on version
              const parsed = typeof data === 'string' ? JSON.parse(data) : data;
              setFinancials(parsed);
          } catch (err) {
              console.error('Error fetching financials:', err);
          } finally {
              setLoadingFinancials(false);
          }
      };
      fetchFinancials();
  }, [selectedClient]);

  // Subscription management actions
  const handleSubAction = async (action, label) => {
      if (!selectedClient) return;
      const confirmed = await confirm({
          title: `${label} Subscription`,
          message: `Are you sure you want to ${label.toLowerCase()} the subscription for ${selectedClient.client_name}?`,
          confirmText: label,
          variant: action.includes('cancel') ? 'danger' : 'default'
      });
      if (!confirmed) return;

      setSubAction(action);
      try {
          const result = await manageSubscription(action, { membershipId: selectedClient.id });
          if (result.error) throw new Error(result.error.message || result.error);
          toast.success(`Subscription ${label.toLowerCase()}d successfully`);
          // Refresh the client list to reflect new status
          const { data } = await supabase
              .from('client_memberships')
              .select(`id, client_name, stripe_customer_id, offer_type, status, monthly_amount_cents, plan_from_agreements, "Plans" ( plan_name, monthly_price_ht )`)
              .order('client_name');
          const enriched = (data || []).map(c => ({
              ...c,
              plan_name: c['Plans']?.plan_name || c.offer_type || null,
              mrr: c['Plans']?.monthly_price_ht || (c.monthly_amount_cents ? c.monthly_amount_cents / 100 : null),
          }));
          setClients(enriched);
          // Update selectedClient with new status
          const updated = enriched.find(c => c.id === selectedClient.id);
          if (updated) setSelectedClient(updated);
          // Re-fetch financials
          const { data: freshData } = await supabase.functions.invoke('get-client-financials', {
              body: { membershipId: selectedClient.id }
          });
          if (freshData) {
              const parsedFresh = typeof freshData === 'string' ? JSON.parse(freshData) : freshData;
              setFinancials(parsedFresh);
          }
      } catch (error) {
          toast.error(error.message || `Failed to ${label.toLowerCase()} subscription`);
      } finally {
          setSubAction(null);
      }
  };

  const handleOpenPortal = async () => {
      if (!selectedClient?.stripe_customer_id) {
          toast.error('No Stripe customer linked');
          return;
      }
      try {
          await redirectToCustomerPortal(selectedClient.stripe_customer_id);
      } catch {
          toast.error('Failed to open billing portal');
      }
  };

  // Computed stats
  const activeClients = clients.filter(c => { const s = (c.status || '').toLowerCase(); return s === 'en cours' || s === 'active'; });
  const pausedClients = clients.filter(c => (c.status || '').toLowerCase() === 'paused');
  const totalMRR = activeClients.reduce((sum, c) => sum + (Number(c.mrr) || 0), 0);
  const filteredClients = clients
      .filter(c => {
          const s = (c.status || '').toLowerCase();
          if (statusFilter === 'active') return s === 'en cours' || s === 'active';
          if (statusFilter === 'paused') return s === 'paused';
          if (statusFilter === 'inactive') return s === 'canceled' || s === 'cancelling' || s === 'payment failed';
          return true;
      })
      .filter(c => !searchQuery ||
          (c.client_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (c.plan_name || '').toLowerCase().includes(searchQuery.toLowerCase())
      );

  // Subscription status helpers — prefer Stripe data, fall back to local DB status
  const hasStripeSub = !!financials?.subscription;
  const localClientStatus = (selectedClient?.status || '').toLowerCase();
  const subStatus = hasStripeSub ? financials.subscription.status : localClientStatus;
  const isPaused = hasStripeSub ? financials.subscription.pauseCollection != null : localClientStatus === 'paused';
  const isCancelling = hasStripeSub ? financials.subscription.cancelAtPeriodEnd : localClientStatus === 'cancelling';
  const isCanceled = hasStripeSub ? subStatus === 'canceled' : (localClientStatus === 'canceled' || localClientStatus === 'cancelled');
  const isActiveClient = hasStripeSub ? (subStatus === 'active' && !isPaused && !isCancelling) : (localClientStatus === 'active' || localClientStatus === 'en cours');

  return (
      <div className="h-full overflow-y-auto custom-scrollbar animate-fade-in">
          <div className="p-6 max-w-[1400px] mx-auto">

              {/* Summary Stats Row */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="bg-white dark:bg-[#0f0f0f] border border-neutral-200 dark:border-neutral-800 rounded-xl px-5 py-4">
                      <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider">Total MRR</span>
                          <TrendingUp size={14} className="text-emerald-500" />
                      </div>
                      <div className="text-2xl font-semibold text-neutral-900 dark:text-white font-mono">{fmtEuros(totalMRR)}</div>
                  </div>
                  <div className="bg-white dark:bg-[#0f0f0f] border border-neutral-200 dark:border-neutral-800 rounded-xl px-5 py-4">
                      <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider">Active</span>
                          <Users size={14} className="text-emerald-500" />
                      </div>
                      <div className="text-2xl font-semibold text-neutral-900 dark:text-white">{activeClients.length}</div>
                  </div>
                  <div className="bg-white dark:bg-[#0f0f0f] border border-neutral-200 dark:border-neutral-800 rounded-xl px-5 py-4">
                      <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider">Paused</span>
                          <Pause size={14} className="text-amber-500" />
                      </div>
                      <div className="text-2xl font-semibold text-neutral-900 dark:text-white">{pausedClients.length}</div>
                  </div>
                  <div className="bg-white dark:bg-[#0f0f0f] border border-neutral-200 dark:border-neutral-800 rounded-xl px-5 py-4">
                      <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider">Total Clients</span>
                          <Building2 size={14} className="text-neutral-400" />
                      </div>
                      <div className="text-2xl font-semibold text-neutral-900 dark:text-white">{clients.length}</div>
                  </div>
              </div>

              <div className="flex gap-4" style={{ height: 'calc(100vh - 260px)' }}>
                  {/* Client List Sidebar */}
                  <div className="w-72 bg-white dark:bg-[#0f0f0f] border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden flex flex-col shrink-0">
                      {/* Search + Filter */}
                      <div className="p-3 border-b border-neutral-200 dark:border-neutral-800 space-y-2">
                          <div className="relative">
                              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                              <input
                                  type="text"
                                  placeholder="Search..."
                                  value={searchQuery}
                                  onChange={(e) => setSearchQuery(e.target.value)}
                                  className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-300 dark:focus:border-neutral-700"
                              />
                              {searchQuery && (
                                  <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300">
                                      <X size={12} />
                                  </button>
                              )}
                          </div>
                          <div className="flex bg-neutral-100 dark:bg-neutral-900 rounded-lg p-0.5 text-[10px] font-medium">
                              {['all', 'active', 'paused', 'inactive'].map(f => (
                                  <button
                                      key={f}
                                      onClick={() => setStatusFilter(f)}
                                      className={`flex-1 px-2 py-1 rounded-md transition-all capitalize ${statusFilter === f ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
                                  >
                                      {f}
                                  </button>
                              ))}
                          </div>
                      </div>
                      {/* Client List */}
                      <div className="flex-1 overflow-y-auto custom-scrollbar">
                          {loading ? (
                              <div className="p-8 flex justify-center"><Loader2 size={20} className="animate-spin text-neutral-400" /></div>
                          ) : filteredClients.length === 0 ? (
                              <div className="p-6 text-center text-neutral-500 text-xs">
                                  {searchQuery || statusFilter !== 'all' ? 'No clients match filters' : 'No clients yet'}
                              </div>
                          ) : (
                              filteredClients.map(client => {
                                  const sc = getStatusConfig(client.status);
                                  return (
                                      <button
                                          key={client.id}
                                          onClick={() => setSelectedClient(client)}
                                          className={`w-full text-left px-4 py-3 border-b border-neutral-100 dark:border-neutral-800/50 hover:bg-neutral-50 dark:hover:bg-white/[0.02] transition-colors ${selectedClient?.id === client.id ? 'bg-neutral-100 dark:bg-neutral-800/60 border-l-2 border-l-neutral-900 dark:border-l-white' : ''}`}
                                      >
                                          <div className="flex items-center gap-3">
                                              <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-900 dark:text-white font-semibold text-xs shrink-0">
                                                  {client.client_name ? client.client_name[0].toUpperCase() : '?'}
                                              </div>
                                              <div className="min-w-0 flex-1">
                                                  <div className="text-sm font-medium text-neutral-900 dark:text-white truncate">{client.client_name}</div>
                                                  <div className="flex items-center gap-2 mt-0.5">
                                                      <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${sc.bg} px-1.5 py-0.5 rounded`}>
                                                          <span className={`w-1 h-1 rounded-full ${sc.dot}`}></span>
                                                          {sc.label}
                                                      </span>
                                                      {client.mrr ? (
                                                          <span className="text-[10px] text-neutral-400 font-mono">{fmtEuros(client.mrr)}</span>
                                                      ) : null}
                                                  </div>
                                              </div>
                                          </div>
                                      </button>
                                  );
                              })
                          )}
                      </div>
                      <div className="px-3 py-2 border-t border-neutral-200 dark:border-neutral-800 text-[10px] text-neutral-400 text-center">
                          {filteredClients.length} client{filteredClients.length !== 1 ? 's' : ''}
                      </div>
                  </div>

                  {/* Main Content Area */}
                  <div className="flex-1 bg-white dark:bg-[#0f0f0f] border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden flex flex-col min-w-0">
                      {!selectedClient ? (
                          <div className="flex-1 flex flex-col items-center justify-center text-neutral-500">
                              <Wallet size={48} className="mb-4 opacity-10" />
                              <p className="text-sm">Select a client to view billing details</p>
                              <p className="text-xs text-neutral-400 mt-1">View subscriptions, invoices, and manage billing</p>
                          </div>
                      ) : (
                          <div className="flex-1 overflow-y-auto custom-scrollbar">
                              {/* Client Header */}
                              <div className="px-6 py-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                                  <div className="flex items-center gap-4">
                                      <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-900 dark:text-white font-semibold text-lg">
                                          {selectedClient.client_name?.[0]?.toUpperCase() || '?'}
                                      </div>
                                      <div>
                                          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">{selectedClient.client_name}</h2>
                                          <div className="flex items-center gap-2 mt-0.5">
                                              {selectedClient.plan_name && <span className="text-xs text-neutral-500">{selectedClient.plan_name}</span>}
                                              {selectedClient.stripe_customer_id && (
                                                  <span className="text-[10px] text-neutral-400 font-mono">{selectedClient.stripe_customer_id}</span>
                                              )}
                                          </div>
                                      </div>
                                  </div>
                                  <button
                                      onClick={handleOpenPortal}
                                      className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                                  >
                                      <ExternalLink size={12} /> Stripe Portal
                                  </button>
                              </div>

                              {loadingFinancials ? (
                                  <div className="p-6 space-y-4 animate-pulse">
                                      <div className="grid grid-cols-2 gap-4">
                                          <div className="h-24 bg-neutral-100 dark:bg-neutral-900 rounded-xl"></div>
                                          <div className="h-24 bg-neutral-100 dark:bg-neutral-900 rounded-xl"></div>
                                      </div>
                                      <div className="h-64 bg-neutral-100 dark:bg-neutral-900 rounded-xl"></div>
                                  </div>
                              ) : financials ? (
                                  <div className="p-6 space-y-6">
                                      {/* Quick Stats */}
                                      <div className="grid grid-cols-2 gap-4">
                                          {/* Next Payment */}
                                          <div className="bg-neutral-50 dark:bg-[#141414] border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
                                              <div className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider mb-1">Next Payment</div>
                                              <div className="text-xl font-bold text-neutral-900 dark:text-white font-mono">
                                                  {financials.upcomingInvoice ? fmtCents(financials.upcomingInvoice.amountDue, financials.upcomingInvoice.currency) : '—'}
                                              </div>
                                              <div className="text-[10px] text-neutral-400 mt-2">
                                                  {financials.upcomingInvoice?.periodEnd
                                                      ? new Date(financials.upcomingInvoice.periodEnd * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                                      : 'No upcoming invoice'}
                                              </div>
                                          </div>

                                          {/* Plan & MRR */}
                                          <div className="bg-neutral-50 dark:bg-[#141414] border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
                                              <div className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider mb-1">Plan</div>
                                              <div className="text-lg font-bold text-neutral-900 dark:text-white truncate">
                                                  {financials.plan?.name || selectedClient.plan_name || 'Custom'}
                                              </div>
                                              {financials.plan?.price && (
                                                  <div className="text-[10px] text-neutral-400 mt-2 font-mono">
                                                      {fmtEuros(financials.plan.price)}/mo
                                                  </div>
                                              )}
                                          </div>
                                      </div>

                                      {/* Subscription Management Actions */}
                                      <div className="bg-neutral-50 dark:bg-[#141414] border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
                                          <div className="flex items-center gap-2 mb-3">
                                              <Shield size={12} className="text-neutral-400" />
                                              <span className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider">Manage Subscription</span>
                                              {!hasStripeSub && (
                                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-400 ml-auto">Local only</span>
                                              )}
                                          </div>
                                          <div className="flex flex-wrap gap-2">
                                              {isActiveClient && (
                                                  <button
                                                      onClick={() => handleSubAction('pause', 'Pause')}
                                                      disabled={!!subAction}
                                                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 hover:border-amber-500/40 hover:bg-amber-500/5 transition-colors disabled:opacity-50"
                                                  >
                                                      {subAction === 'pause' ? <Loader2 size={12} className="animate-spin text-amber-500" /> : <Pause size={12} className="text-amber-500" />}
                                                      Pause Billing
                                                  </button>
                                              )}
                                              {isPaused && (
                                                  <button
                                                      onClick={() => handleSubAction('resume', 'Resume')}
                                                      disabled={!!subAction}
                                                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-colors disabled:opacity-50"
                                                  >
                                                      {subAction === 'resume' ? <Loader2 size={12} className="animate-spin text-emerald-500" /> : <Play size={12} className="text-emerald-500" />}
                                                      Resume Billing
                                                  </button>
                                              )}
                                              {!isCancelling && !isCanceled && (
                                                  <button
                                                      onClick={() => handleSubAction('cancel', 'Cancel')}
                                                      disabled={!!subAction}
                                                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 hover:border-red-500/40 hover:bg-red-500/5 transition-colors disabled:opacity-50"
                                                  >
                                                      {subAction === 'cancel' ? <Loader2 size={12} className="animate-spin text-red-500" /> : <XCircle size={12} className="text-red-500" />}
                                                      Cancel at Period End
                                                  </button>
                                              )}
                                              {(isCancelling || isCanceled) && (
                                                  <button
                                                      onClick={() => handleSubAction('reactivate', 'Reactivate')}
                                                      disabled={!!subAction}
                                                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 hover:border-blue-500/40 hover:bg-blue-500/5 transition-colors disabled:opacity-50"
                                                  >
                                                      {subAction === 'reactivate' ? <Loader2 size={12} className="animate-spin text-blue-500" /> : <RefreshCw size={12} className="text-blue-500" />}
                                                      Reactivate
                                                  </button>
                                              )}
                                          </div>
                                      </div>

                                      {/* Invoice History */}
                                      <div>
                                          <div className="flex items-center justify-between mb-3">
                                              <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">Invoices</h3>
                                              <span className="text-[10px] text-neutral-400">{(financials.invoices || []).length} invoice{(financials.invoices || []).length !== 1 ? 's' : ''}</span>
                                          </div>
                                          <div className="bg-white dark:bg-[#0f0f0f] border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
                                              <table className="w-full text-xs text-left">
                                                  <thead className="bg-neutral-50 dark:bg-[#141414] text-neutral-400 font-medium border-b border-neutral-200 dark:border-neutral-800">
                                                      <tr>
                                                          <th className="px-4 py-2.5">Invoice</th>
                                                          <th className="px-4 py-2.5">Date</th>
                                                          <th className="px-4 py-2.5">Amount</th>
                                                          <th className="px-4 py-2.5">Status</th>
                                                          <th className="px-4 py-2.5 text-right">Actions</th>
                                                      </tr>
                                                  </thead>
                                                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
                                                      {(financials.invoices || []).map(invoice => (
                                                          <tr key={invoice.id} className="hover:bg-neutral-50 dark:hover:bg-white/[0.02] transition-colors">
                                                              <td className="px-4 py-3 text-neutral-900 dark:text-white font-mono text-[11px]">
                                                                  {invoice.number || invoice.id?.slice(-8)}
                                                              </td>
                                                              <td className="px-4 py-3 text-neutral-500">
                                                                  {new Date(invoice.created * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                              </td>
                                                              <td className="px-4 py-3 text-neutral-900 dark:text-white font-mono font-medium">
                                                                  {fmtCents(invoice.amountPaid, invoice.currency)}
                                                              </td>
                                                              <td className="px-4 py-3">
                                                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                                                                      invoice.status === 'paid' ? 'bg-emerald-500/10 text-emerald-500' :
                                                                      invoice.status === 'open' ? 'bg-blue-500/10 text-blue-500' :
                                                                      invoice.status === 'void' ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400' :
                                                                      'bg-amber-500/10 text-amber-500'
                                                                  }`}>
                                                                      <span className={`w-1 h-1 rounded-full ${
                                                                          invoice.status === 'paid' ? 'bg-emerald-500' :
                                                                          invoice.status === 'open' ? 'bg-blue-500' :
                                                                          invoice.status === 'void' ? 'bg-neutral-400' :
                                                                          'bg-amber-500'
                                                                      }`}></span>
                                                                      {(invoice.status || 'unknown').toUpperCase()}
                                                                  </span>
                                                              </td>
                                                              <td className="px-4 py-3 text-right">
                                                                  <div className="flex items-center justify-end gap-1">
                                                                      {invoice.hostedInvoiceUrl && (
                                                                          <a
                                                                              href={invoice.hostedInvoiceUrl}
                                                                              target="_blank"
                                                                              rel="noopener noreferrer"
                                                                              className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                                                                              title="View invoice"
                                                                          >
                                                                              <ExternalLink size={12} />
                                                                          </a>
                                                                      )}
                                                                      {invoice.pdfUrl && (
                                                                          <a
                                                                              href={invoice.pdfUrl}
                                                                              target="_blank"
                                                                              rel="noopener noreferrer"
                                                                              className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                                                                              title="Download PDF"
                                                                          >
                                                                              <Download size={12} />
                                                                          </a>
                                                                      )}
                                                                  </div>
                                                              </td>
                                                          </tr>
                                                      ))}
                                                      {(!financials.invoices || financials.invoices.length === 0) && (
                                                          <tr>
                                                              <td colSpan="5" className="px-4 py-10 text-center text-neutral-400 text-xs">
                                                                  No invoices yet
                                                              </td>
                                                          </tr>
                                                      )}
                                                  </tbody>
                                              </table>
                                          </div>
                                      </div>
                                  </div>
                              ) : (
                                  <div className="flex-1 flex flex-col items-center justify-center text-neutral-500 py-20">
                                      <AlertCircle size={32} className="mb-3 opacity-20" />
                                      <p className="text-sm">Unable to load financial data</p>
                                      <p className="text-xs text-neutral-400 mt-1">
                                          {selectedClient.stripe_customer_id ? 'There may be an issue with the Stripe connection' : 'No Stripe customer ID linked'}
                                      </p>
                                  </div>
                              )}
                          </div>
                      )}
                  </div>
              </div>
          </div>
      </div>
  );
};

// --- Client Details Slide-over ---
const ClientDetails = ({ client, onClose, onOpenPortal, isAdmin }) => {
    const toast = useToast();
    const confirm = useConfirm();
    const [financials, setFinancials] = useState(null);
    const [loadingFinancials, setLoadingFinancials] = useState(false);
    const [subAction, setSubAction] = useState(null);

    // Fetch financials when client changes
    useEffect(() => {
        if (!client?.membership_id) { setFinancials(null); return; }
        const fetchFinancials = async () => {
            setLoadingFinancials(true);
            try {
                const { data, error } = await supabase.functions.invoke('get-client-financials', {
                    body: { membershipId: client.membership_id }
                });
                if (error) throw error;
                if (data) {
                    const parsed = typeof data === 'string' ? JSON.parse(data) : data;
                    setFinancials(parsed);
                }
            } catch (err) {
                console.error('ClientDetails: Error fetching financials:', err);
            } finally {
                setLoadingFinancials(false);
            }
        };
        fetchFinancials();
    }, [client?.membership_id]);

    const handleSubAction = async (action, label) => {
        if (!client?.membership_id) return;
        const confirmed = await confirm({
            title: `${label} Subscription`,
            message: `Are you sure you want to ${label.toLowerCase()} the subscription for ${client.client_name}?`,
            confirmText: label,
            variant: action.includes('cancel') ? 'danger' : 'default'
        });
        if (!confirmed) return;
        setSubAction(action);
        try {
            const result = await manageSubscription(action, { membershipId: client.membership_id });
            if (result.error) throw new Error(result.error.message || result.error);
            toast.success(`Subscription ${label.toLowerCase()}d successfully`);
            // Re-fetch financials to reflect the change
            const { data } = await supabase.functions.invoke('get-client-financials', {
                body: { membershipId: client.membership_id }
            });
            if (data) {
                const parsed = typeof data === 'string' ? JSON.parse(data) : data;
                setFinancials(parsed);
            }
        } catch (error) {
            toast.error(error.message || `Failed to ${label.toLowerCase()} subscription`);
        } finally {
            setSubAction(null);
        }
    };

    if (!client) return null;

    // Determine subscription state: prefer Stripe data, fall back to local DB status
    const localStatus = (client.status || '').toLowerCase();
    const hasStripeSub = !!financials?.subscription;
    const subStatus = hasStripeSub ? financials.subscription.status : localStatus;
    const isPaused = hasStripeSub ? !!financials.subscription.pauseCollection : localStatus === 'paused';
    const isCancelling = hasStripeSub ? financials.subscription.cancelAtPeriodEnd : (localStatus === 'cancelling');
    const isCanceled = hasStripeSub ? subStatus === 'canceled' : (localStatus === 'canceled' || localStatus === 'cancelled');
    const isActive = hasStripeSub ? (subStatus === 'active' && !isPaused && !isCancelling) : (localStatus === 'active' || localStatus === 'en cours');

    const formatCurrency = (amount) => {
        if (!amount) return '-';
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const formatDate = (d) => {
        if (!d) return '-';
        return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    };

    const formatArray = (arr) => {
        if (!arr) return '-';
        if (Array.isArray(arr)) return arr.filter(Boolean).join(', ') || '-';
        return String(arr) || '-';
    };

    const getStatusStyle = (status) => {
        const s = (status || '').toLowerCase();
        if (s === 'active') return 'bg-emerald-500/10 text-emerald-500';
        if (s === 'finishiiiiiing') return 'bg-amber-500/10 text-amber-500';
        if (s === 'paused') return 'bg-orange-500/10 text-orange-500';
        if (s === 'cancelled') return 'bg-red-500/10 text-red-500';
        return 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500';
    };

    const getStatusDot = (status) => {
        const s = (status || '').toLowerCase();
        if (s === 'active') return 'bg-emerald-500';
        if (s === 'finishiiiiiing') return 'bg-amber-500';
        if (s === 'paused') return 'bg-orange-500';
        if (s === 'cancelled') return 'bg-red-500';
        return 'bg-neutral-400';
    };

    // Build sections of detail rows
    const contractDetails = [
        { label: 'Start date', value: formatDate(client.start_date) },
        { label: 'End date', value: formatDate(client.end_date_from_cycles) },
        { label: 'Commitment cycles', value: client.commitment_cycles != null ? `${client.commitment_cycles}` : '-' },
        { label: 'Renewal type', value: formatArray(client.renewal_type) },
        { label: 'Pause policy', value: formatArray(client.pause_policy) },
    ];

    const billingDetails = [
        { label: 'Custom price (HT)', value: formatCurrency(client.custom_price_ht) },
        { label: 'Payment terms', value: formatArray(client.payment_terms) },
        { label: 'Invoice periodicity', value: formatArray(client.invoice_cycle_periodicity) },
        { label: 'Client weight', value: client.client_weight != null ? `${client.client_weight}` : '-' },
    ];

    const otherDetails = [
        { label: 'Agreement file', value: client.agreement_file || null, isLink: !!client.agreement_file },
        { label: 'Notes', value: client.notes || '-', isLong: true },
        { label: 'Agreement ID', value: client.agreement_id || client.whalesync_postgres_id || '-', isMono: true },
        { label: 'Record ID', value: client.airtable_record_id || '-', isMono: true },
    ];

    const DetailRow = ({ label, value, isLong, isMono, isLink }) => (
        <div className={`flex ${isLong ? 'flex-col gap-1.5' : 'items-center justify-between'} py-3`}>
            <span className="text-xs text-neutral-400">{label}</span>
            {isLink && value ? (
                <a
                    href={value}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-neutral-900 dark:text-white font-medium hover:underline flex items-center gap-1.5 max-w-[220px] truncate"
                >
                    View file <ExternalLink size={10} className="shrink-0" />
                </a>
            ) : (
                <span className={`text-xs text-neutral-900 dark:text-white font-medium ${isLong ? '' : 'text-right max-w-[220px] truncate'} ${isMono ? 'font-mono text-neutral-400' : ''}`}>
                    {value || '-'}
                </span>
            )}
        </div>
    );

    const DetailSection = ({ title, rows }) => (
        <div className="px-6 py-4">
            <div className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider mb-2">{title}</div>
            <div className="space-y-0">
                {rows.map((row, i) => (
                    <React.Fragment key={row.label}>
                        <DetailRow {...row} />
                        {i !== rows.length - 1 && <div className="h-px bg-neutral-100 dark:bg-neutral-800/40" />}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 dark:bg-black/60 backdrop-blur-[2px] animate-fade-in" onClick={onClose}>
            <div
                className="w-full max-w-[440px] h-full bg-white dark:bg-[#0f0f0f] shadow-2xl border-l border-neutral-200 dark:border-neutral-800 flex flex-col animate-slide-in-right"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="h-14 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between px-6 shrink-0">
                    <span className="text-sm font-medium text-neutral-500">Client Details</span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => onOpenPortal(client)}
                            className="text-[10px] font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-white uppercase tracking-wider flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                        >
                            Portal <ExternalLink size={10} />
                        </button>
                        <button onClick={onClose} className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800">
                            <X size={16}/>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {/* Client Identity */}
                    <div className="px-6 pt-6 pb-5">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-900 dark:text-white font-semibold text-lg shrink-0">
                                {client.client_name ? client.client_name[0].toUpperCase() : '?'}
                            </div>
                            <div className="min-w-0 flex-1">
                                <h1 className="text-lg font-semibold text-neutral-900 dark:text-white truncate">{client.client_name}</h1>
                                <div className="flex items-center gap-2 mt-1.5">
                                    {client.status && (
                                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium ${getStatusStyle(client.status)}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(client.status)}`}></span>
                                            {client.status}
                                        </span>
                                    )}
                                    {client.plan_name && (
                                        <span className="text-[11px] text-neutral-400 font-medium">{client.plan_name}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-neutral-100 dark:bg-neutral-800/60 mx-6" />

                    {/* Key Metrics */}
                    <div className="px-6 py-5">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-neutral-50 dark:bg-[#141414] rounded-lg p-3.5">
                                <div className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider mb-1">MRR</div>
                                <div className="text-base font-semibold text-neutral-900 dark:text-white font-mono">{formatCurrency(client.custom_price_ht)}</div>
                            </div>
                            <div className="bg-neutral-50 dark:bg-[#141414] rounded-lg p-3.5">
                                <div className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider mb-1">Plan</div>
                                <div className="text-base font-semibold text-neutral-900 dark:text-white">{client.plan_name || 'Custom'}</div>
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-neutral-100 dark:bg-neutral-800/60 mx-6" />

                    {/* Contract Details */}
                    <DetailSection title="Contract" rows={contractDetails} />

                    <div className="h-px bg-neutral-100 dark:bg-neutral-800/60 mx-6" />

                    {/* Billing Details */}
                    <DetailSection title="Billing" rows={billingDetails} />

                    <div className="h-px bg-neutral-100 dark:bg-neutral-800/60 mx-6" />

                    {/* Subscription Management */}
                    {isAdmin && (
                        <div className="px-6 py-4">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider">Manage</div>
                                {!hasStripeSub && !loadingFinancials && (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-400">Local only</span>
                                )}
                            </div>
                            {loadingFinancials ? (
                                <div className="h-12 bg-neutral-100 dark:bg-neutral-900 rounded-lg animate-pulse" />
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                                        <span className={`w-1.5 h-1.5 rounded-full ${
                                            isPaused ? 'bg-amber-500' :
                                            isCancelling ? 'bg-orange-500' :
                                            isActive ? 'bg-emerald-500' :
                                            isCanceled ? 'bg-red-500' :
                                            'bg-neutral-400'
                                        }`} />
                                        <span className="font-medium text-neutral-900 dark:text-white">
                                            {isPaused ? 'Paused' : isCancelling ? 'Cancelling' : isCanceled ? 'Canceled' : isActive ? 'Active' : (client.status || 'Unknown')}
                                        </span>
                                        {hasStripeSub && financials.subscription.currentPeriodEnd && (
                                            <span className="text-neutral-400 ml-auto">
                                                ends {new Date(financials.subscription.currentPeriodEnd * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {isActive && (
                                            <button
                                                onClick={() => handleSubAction('pause', 'Pause')}
                                                disabled={!!subAction}
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-amber-500/40 hover:bg-amber-500/5 transition-colors disabled:opacity-50"
                                            >
                                                {subAction === 'pause' ? <Loader2 size={11} className="animate-spin text-amber-500" /> : <Pause size={11} className="text-amber-500" />}
                                                Pause
                                            </button>
                                        )}
                                        {isPaused && (
                                            <button
                                                onClick={() => handleSubAction('resume', 'Resume')}
                                                disabled={!!subAction}
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-colors disabled:opacity-50"
                                            >
                                                {subAction === 'resume' ? <Loader2 size={11} className="animate-spin text-emerald-500" /> : <Play size={11} className="text-emerald-500" />}
                                                Resume
                                            </button>
                                        )}
                                        {!isCancelling && !isCanceled && (
                                            <button
                                                onClick={() => handleSubAction('cancel', 'Cancel')}
                                                disabled={!!subAction}
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-red-500/40 hover:bg-red-500/5 transition-colors disabled:opacity-50"
                                            >
                                                {subAction === 'cancel' ? <Loader2 size={11} className="animate-spin text-red-500" /> : <XCircle size={11} className="text-red-500" />}
                                                Cancel
                                            </button>
                                        )}
                                        {(isCancelling || isCanceled) && (
                                            <button
                                                onClick={() => handleSubAction('reactivate', 'Reactivate')}
                                                disabled={!!subAction}
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-blue-500/40 hover:bg-blue-500/5 transition-colors disabled:opacity-50"
                                            >
                                                {subAction === 'reactivate' ? <Loader2 size={11} className="animate-spin text-blue-500" /> : <RefreshCw size={11} className="text-blue-500" />}
                                                Reactivate
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {isAdmin && <div className="h-px bg-neutral-100 dark:bg-neutral-800/60 mx-6" />}

                    {/* Other Details */}
                    <DetailSection title="Other" rows={otherDetails} />

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
            <div className="bg-white dark:bg-[#0f0f0f] border border-neutral-200 dark:border-neutral-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-scale-up">
                <div className="px-6 py-5 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center bg-neutral-50 dark:bg-[#141414]">
                    <div>
                        <h2 className="text-lg font-bold text-neutral-900 dark:text-white">New Client</h2>
                        <p className="text-neutral-500 text-xs mt-0.5">Add a new company to your agency.</p>
                    </div>
                    <button onClick={onClose} className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"><X size={20}/></button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Name Input */}
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-neutral-400 uppercase tracking-wide ml-1">Company Name</label>
                        <div className="relative group">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within:text-neutral-900 dark:group-focus-within:text-neutral-900 dark:text-white transition-colors" size={18} />
                            <input 
                                type="text" 
                                required
                                placeholder="e.g. Acme Corp"
                                className="w-full bg-white dark:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-800 rounded-xl py-3 pl-10 pr-4 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-600 focus:ring-1 focus:ring-neutral-400 dark:focus:ring-neutral-600 transition-all"
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
                                className="w-full bg-white dark:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-800 rounded-xl py-3 px-4 text-sm text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-600 transition-all appearance-none cursor-pointer"
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
                                className="w-full bg-white dark:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-800 rounded-xl py-3 px-4 text-sm text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-600 transition-all appearance-none cursor-pointer"
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
                                    className="w-full bg-white dark:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-800 rounded-xl py-3 pl-10 pr-4 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none focus:border-emerald-600/50 dark:focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-600/50 dark:focus:ring-emerald-500/50 transition-all font-mono"
                                    value={formData.monthly_amount}
                                    onChange={e => setFormData({...formData, monthly_amount: e.target.value})}
                                />
                            </div>
                        </div>

                         {/* Start Date */}
                         <div className="space-y-2">
                            <label className="text-xs font-medium text-neutral-400 uppercase tracking-wide ml-1">Start Date</label>
                            <div className="relative group">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within:text-neutral-900 dark:group-focus-within:text-neutral-900 dark:text-white transition-colors" size={16} />
                                <input 
                                    type="date" 
                                    required
                                    className="w-full bg-white dark:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-800 rounded-xl py-3 pl-10 pr-4 text-sm text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-600 transition-all dark:[color-scheme:dark]"
                                    value={formData.start_date}
                                    onChange={e => setFormData({...formData, start_date: e.target.value})}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Stripe ID (Optional) */}
                    <div className="space-y-2 pt-2 border-t border-neutral-200 dark:border-neutral-800/50">
                        <label className="text-xs font-medium text-neutral-500 uppercase tracking-wide ml-1">Stripe Customer ID (Optional)</label>
                        <div className="relative group">
                            <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within:text-neutral-500 dark:group-focus-within:text-neutral-400 transition-colors" size={16} />
                            <input 
                                type="text" 
                                placeholder="cus_..."
                                className="w-full bg-white dark:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-800 rounded-xl py-3 pl-10 pr-4 text-sm text-neutral-600 dark:text-neutral-300 placeholder-neutral-400 dark:placeholder-neutral-700 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-600 transition-all font-mono text-xs"
                                value={formData.stripe_customer_id}
                                onChange={e => setFormData({...formData, stripe_customer_id: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button 
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 text-neutral-400 text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-900 hover:text-neutral-900 dark:hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            disabled={loading}
                            className="flex-[2] py-3 rounded-xl bg-white text-black text-sm font-bold hover:bg-neutral-200 dark:hover:bg-neutral-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
export const CustomersView = ({ agreements: initialAgreements, onOpenPortal, isAdmin }) => {
  const [items, setItems] = useState(initialAgreements);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  React.useEffect(() => {
      if(initialAgreements) setItems(initialAgreements);
  }, [initialAgreements]);

  const handleClientAdded = (newClient) => {
      setItems(prev => [...prev, newClient]);
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
    if (s === 'active') return 'bg-emerald-500/10 text-emerald-500';
    if (s === 'finishiiiiiing') return 'bg-amber-500/10 text-amber-500';
    if (s === 'paused') return 'bg-orange-500/10 text-orange-500';
    if (s === 'finished' || s === 'finished fts') return 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400';
    if (s === 'cancelled') return 'bg-red-500/10 text-red-500';
    return 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400';
  };

  const getStatusDotColor = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'active') return 'bg-emerald-500';
    if (s === 'finishiiiiiing') return 'bg-amber-500';
    if (s === 'paused') return 'bg-orange-500';
    if (s === 'cancelled') return 'bg-red-500';
    return 'bg-neutral-400';
  };

  const getStatusOrder = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'active') return 0;
    if (s === 'finishiiiiiing') return 1;
    if (s === 'paused') return 2;
    if (s === 'finished') return 3;
    if (s === 'finished fts') return 4;
    if (s === 'cancelled') return 5;
    return 6;
  };

  const filteredAndSorted = [...items]
    .filter(item => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery ||
        (item.client_name || '').toLowerCase().includes(searchLower) ||
        (item.plan_name || '').toLowerCase().includes(searchLower);

      const status = (item.status || '').toLowerCase();
      let matchesStatus = true;
      if (statusFilter === 'active') {
        matchesStatus = status === 'active';
      } else if (statusFilter === 'paused') {
        matchesStatus = status === 'paused';
      } else if (statusFilter === 'inactive') {
        matchesStatus = status === 'finished' || status === 'finished fts' || status === 'cancelled';
      }

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => getStatusOrder(a.status) - getStatusOrder(b.status));

  // Stats
  const totalMRR = items.reduce((sum, item) => {
    const s = (item.status || '').toLowerCase();
    return (s === 'active' || s === 'finishiiiiiing') ? sum + (Number(item.custom_price_ht) || 0) : sum;
  }, 0);
  const activeCount = items.filter(i => (i.status || '').toLowerCase() === 'active').length;
  const pausedCount = items.filter(i => (i.status || '').toLowerCase() === 'paused').length;

  return (
    <div className="h-full overflow-y-auto custom-scrollbar animate-fade-in">
      <div className="p-6 max-w-[1400px] mx-auto">

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-[#0f0f0f] border border-neutral-200 dark:border-neutral-800 rounded-xl px-5 py-4">
            <div className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider mb-1">Total MRR</div>
            <div className="text-2xl font-semibold text-neutral-900 dark:text-white font-mono">{formatCurrency(totalMRR)}</div>
          </div>
          <div className="bg-white dark:bg-[#0f0f0f] border border-neutral-200 dark:border-neutral-800 rounded-xl px-5 py-4">
            <div className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider mb-1">Active</div>
            <div className="text-2xl font-semibold text-neutral-900 dark:text-white">{activeCount}</div>
          </div>
          <div className="bg-white dark:bg-[#0f0f0f] border border-neutral-200 dark:border-neutral-800 rounded-xl px-5 py-4">
            <div className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider mb-1">Paused</div>
            <div className="text-2xl font-semibold text-neutral-900 dark:text-white">{pausedCount}</div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* Pill-style status filter matching the Kanban top bar */}
            <div className="flex bg-neutral-100 dark:bg-neutral-900 rounded-lg p-1 text-xs font-medium">
              {['all', 'active', 'paused', 'inactive'].map(f => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-3 py-1 rounded-md transition-all capitalize ${statusFilter === f ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'}`}
                >
                  {f === 'all' ? 'All' : f}
                </button>
              ))}
            </div>
            {/* Search */}
            <div className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-900 rounded-lg px-3 py-1.5 w-56 focus-within:ring-1 focus-within:ring-neutral-300 dark:focus-within:ring-neutral-700 transition-all">
              <Search size={13} className="text-neutral-400 shrink-0" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-xs text-neutral-900 dark:text-white w-full placeholder-neutral-400 dark:placeholder-neutral-600"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300">
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-400">{filteredAndSorted.length} client{filteredAndSorted.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-[#0f0f0f] border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[1fr_100px_100px_120px_120px] gap-4 px-5 py-3 border-b border-neutral-200 dark:border-neutral-800 text-[10px] font-medium text-neutral-400 uppercase tracking-wider">
            <div>Company</div>
            <div>Status</div>
            <div>MRR</div>
            <div>Start</div>
            <div className="text-right">End</div>
          </div>

          {/* Rows */}
          <div>
            {filteredAndSorted.length === 0 ? (
              <div className="px-5 py-16 text-center">
                <Users size={32} className="mx-auto mb-3 text-neutral-300 dark:text-neutral-700" />
                <p className="text-sm text-neutral-400">
                  {searchQuery || statusFilter !== 'all' ? 'No clients match your filters' : 'No clients yet'}
                </p>
              </div>
            ) : (
              filteredAndSorted.map((item, index) => (
                <div
                  key={item.whalesync_postgres_id}
                  onClick={() => setSelectedItem(item)}
                  className={`grid grid-cols-[1fr_100px_100px_120px_120px] gap-4 px-5 py-3 items-center cursor-pointer transition-colors hover:bg-neutral-50 dark:hover:bg-white/[0.02] group ${index !== filteredAndSorted.length - 1 ? 'border-b border-neutral-100 dark:border-neutral-800/50' : ''}`}
                >
                  {/* Company */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-900 dark:text-white font-semibold text-sm shrink-0">
                      {item.client_name ? item.client_name[0].toUpperCase() : '?'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-neutral-900 dark:text-white truncate">{item.client_name || 'Unnamed'}</span>
                        {item.plan_name && (
                          <span className="text-[10px] text-neutral-400 font-medium shrink-0">{item.plan_name}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status */}
                  <div>
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium ${getStatusStyle(item.status)}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${getStatusDotColor(item.status)}`}></span>
                      {item.status || '-'}
                    </span>
                  </div>

                  {/* MRR */}
                  <div className="text-sm text-neutral-900 dark:text-white font-mono">
                    {formatCurrency(item.custom_price_ht)}
                  </div>

                  {/* Start Date */}
                  <div className="text-xs text-neutral-500">
                    {item.start_date ? new Date(item.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' }) : '-'}
                  </div>

                  {/* End Date */}
                  <div className="text-xs text-neutral-500 text-right">
                    {item.end_date_from_cycles ? new Date(item.end_date_from_cycles).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' }) : '-'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <ClientDetails
        client={selectedItem}
        onClose={() => setSelectedItem(null)}
        onOpenPortal={onOpenPortal}
        isAdmin={isAdmin}
      />

      <NewClientModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onClientAdded={handleClientAdded}
      />
    </div>
  );
};