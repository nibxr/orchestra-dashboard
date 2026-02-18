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
    Calendar // Added missing import
} from 'lucide-react';
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

// --- Payments View (Real Implementation) ---
export const PaymentsView = () => {
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [financials, setFinancials] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingFinancials, setLoadingFinancials] = useState(false);

  // Helper for currency formatting - FIXED to handle null currency
  const formatCurrency = (amount, currency = 'eur') => {
      if (!amount && amount !== 0) return '-';
      // Default to EUR if currency is null/undefined
      const currencyCode = currency ? currency.toUpperCase() : 'EUR';
      try {
        return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: currencyCode }).format(amount / 100);
      } catch (e) {
        // Fallback if currency code is invalid
        return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount / 100);
      }
  };

  // 1. Fetch all clients with Stripe IDs
  useEffect(() => {
      const fetchClients = async () => {
          setLoading(true);
          const { data } = await supabase
              .from('client_memberships')
              .select('id, client_name, stripe_customer_id, offer_type')
              .not('stripe_customer_id', 'is', null);
          
          setClients(data || []);
          setLoading(false);
      };
      fetchClients();
  }, []);

  // 2. Fetch financials when a client is selected
  useEffect(() => {
      const fetchFinancials = async () => {
          if (!selectedClient?.stripe_customer_id) return;
          
          setLoadingFinancials(true);
          setFinancials(null); // Clear previous data while loading
          try {
              const { data, error } = await supabase.functions.invoke('get-client-financials', {
                  body: { customerId: selectedClient.stripe_customer_id }
              });
              
              if (error) throw error;
              setFinancials(data);
          } catch (err) {
              console.error('Error fetching financials:', err);
          } finally {
              setLoadingFinancials(false);
          }
      };

      if (selectedClient) {
          fetchFinancials();
      } else {
          setFinancials(null);
      }
  }, [selectedClient]);

  return (
      <div className="p-8 max-w-7xl mx-auto h-full flex flex-col">
          <header className="mb-8 flex items-center justify-between">
              <div>
                  <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">Payments & Billing</h1>
                  <p className="text-neutral-400">Manage client subscriptions and view invoice history.</p>
              </div>
          </header>

          <div className="flex gap-6 h-full overflow-hidden">
              {/* Client List Sidebar */}
              <div className="w-80 bg-neutral-50 dark:bg-[#141414] border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden flex flex-col shrink-0">
                  <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
                      <div className="relative">
                          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                          <input 
                              type="text" 
                              placeholder="Search clients..." 
                              className="w-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg pl-9 pr-4 py-2 text-sm text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-300 dark:border-neutral-700"
                          />
                      </div>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar">
                      {loading ? (
                          <div className="p-4 text-neutral-500 text-sm text-center">Loading clients...</div>
                      ) : (
                          clients.map(client => (
                              <button
                                  key={client.id}
                                  onClick={() => setSelectedClient(client)}
                                  className={`w-full text-left p-4 border-b border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800/50 transition-colors ${selectedClient?.id === client.id ? 'bg-neutral-200 dark:bg-neutral-800 border-l-2 border-l-lime-400' : ''}`}
                              >
                                  <div className="font-medium text-neutral-900 dark:text-white mb-1">{client.client_name}</div>
                                  <div className="text-xs text-neutral-500">{client.offer_type || 'No Active Plan'}</div>
                              </button>
                          ))
                      )}
                      {!loading && clients.length === 0 && (
                           <div className="p-4 text-neutral-500 text-sm text-center">No clients with billing connected.</div>
                      )}
                  </div>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 bg-neutral-50 dark:bg-[#141414] border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden flex flex-col relative min-w-[600px] w-full">
                  {!selectedClient ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-500">
                          <CreditCard size={48} className="mb-4 opacity-20" />
                          <p>Select a client to view billing details</p>
                      </div>
                  ) : (
                      <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                          <div className="flex items-center justify-between mb-8">
                              <div>
                                  <h2 className="text-xl font-bold text-neutral-900 dark:text-white">{selectedClient.client_name}</h2>
                                  <p className="text-sm text-neutral-500">Customer ID: {selectedClient.stripe_customer_id}</p>
                              </div>
                              <div className="px-3 py-1 bg-lime-400/10 text-lime-400 rounded-full text-xs font-bold border border-lime-400/20">
                                  STRIPE CONNECTED
                              </div>
                          </div>

                          {loadingFinancials ? (
                              <div className="space-y-4 animate-pulse">
                                  <div className="h-32 bg-neutral-100 dark:bg-neutral-900 rounded-xl"></div>
                                  <div className="h-64 bg-neutral-100 dark:bg-neutral-900 rounded-xl"></div>
                              </div>
                          ) : financials ? (
                              <div className="space-y-8 animate-fade-in">
                                  {/* Overview Cards */}
                                  <div className="grid grid-cols-3 gap-4">
                                      <div className="bg-neutral-100 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 p-4 rounded-xl">
                                          <div className="text-neutral-500 text-xs font-bold uppercase mb-2">Total Due</div>
                                          <div className="text-2xl font-bold text-neutral-900 dark:text-white">
                                              {formatCurrency(financials.client.balance, financials.client.currency)}
                                          </div>
                                      </div>
                                      <div className="bg-neutral-100 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 p-4 rounded-xl">
                                          <div className="text-neutral-500 text-xs font-bold uppercase mb-2">Next Payment</div>
                                          <div className="text-2xl font-bold text-neutral-900 dark:text-white">
                                              {financials.upcoming_payment 
                                                  ? formatCurrency(financials.upcoming_payment.amount_due, financials.upcoming_payment.currency) 
                                                  : '—'}
                                          </div>
                                          <div className="text-xs text-neutral-500 mt-1">
                                              {financials.upcoming_payment 
                                                  ? new Date(financials.upcoming_payment.date * 1000).toLocaleDateString() 
                                                  : 'No upcoming invoice'}
                                          </div>
                                      </div>
                                      <div className="bg-neutral-100 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 p-4 rounded-xl">
                                          <div className="text-neutral-500 text-xs font-bold uppercase mb-2">Active Plan</div>
                                          <div className="text-lg font-bold text-neutral-900 dark:text-white truncate">
                                              {financials.subscription.plans[0]?.product_name || 'None'}
                                          </div>
                                          <div className="text-xs text-neutral-500 mt-1">
                                              {financials.subscription.active ? 'Auto-renewing' : 'Inactive'}
                                          </div>
                                      </div>
                                  </div>

                                  {/* Invoice History Table */}
                                  <div>
                                      <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-4">Invoice History</h3>
                                      <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
                                          <table className="w-full text-sm text-left">
                                              <thead className="bg-neutral-100 dark:bg-neutral-900 text-neutral-400 font-medium border-b border-neutral-200 dark:border-neutral-800">
                                                  <tr>
                                                      <th className="px-6 py-3">Date</th>
                                                      <th className="px-6 py-3">Amount</th>
                                                      <th className="px-6 py-3">Status</th>
                                                      <th className="px-6 py-3 text-right">Invoice</th>
                                                  </tr>
                                              </thead>
                                              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 bg-neutral-50 dark:bg-[#141414]">
                                                  {financials.history.map(invoice => (
                                                      <tr key={invoice.id} className="hover:bg-neutral-100 dark:hover:bg-neutral-900/50 transition-colors">
                                                          <td className="px-6 py-4 text-neutral-900 dark:text-white">
                                                              {new Date(invoice.date * 1000).toLocaleDateString()}
                                                          </td>
                                                          <td className="px-6 py-4 text-neutral-900 dark:text-white font-mono">
                                                              {formatCurrency(invoice.amount_paid, invoice.currency)}
                                                          </td>
                                                          <td className="px-6 py-4">
                                                              <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                                  invoice.status === 'paid' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                                                              }`}>
                                                                  {invoice.status ? invoice.status.toUpperCase() : 'UNKNOWN'}
                                                              </span>
                                                          </td>
                                                          <td className="px-6 py-4 text-right">
                                                              {invoice.pdf_url && (
                                                                  <a 
                                                                      href={invoice.pdf_url} 
                                                                      target="_blank" 
                                                                      rel="noopener noreferrer"
                                                                      className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white inline-flex items-center gap-1 hover:underline"
                                                                  >
                                                                      <Download size={14} /> PDF
                                                                  </a>
                                                              )}
                                                          </td>
                                                      </tr>
                                                  ))}
                                                  {financials.history.length === 0 && (
                                                      <tr>
                                                          <td colSpan="4" className="px-6 py-8 text-center text-neutral-500">
                                                              No invoice history found.
                                                          </td>
                                                      </tr>
                                                  )}
                                              </tbody>
                                          </table>
                                      </div>
                                  </div>
                              </div>
                          ) : (
                              <div className="text-center py-12 text-neutral-500">
                                  Unable to load financial data.
                              </div>
                          )}
                      </div>
                  )}
              </div>
          </div>
      </div>
  );
};

// --- Client Details Slide-over ---
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
export const CustomersView = ({ agreements: initialAgreements, onOpenPortal }) => {
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
      />

      <NewClientModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onClientAdded={handleClientAdded}
      />
    </div>
  );
};