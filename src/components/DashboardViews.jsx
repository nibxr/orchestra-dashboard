import React, { useState } from 'react';
import { Search, Filter, MoreHorizontal, Wallet, TrendingUp, X, Calendar, CreditCard, Database, CheckCircle2, AlertCircle, Upload, Building2, DollarSign, Plus, ExternalLink } from 'lucide-react';
import { supabase } from '../supabaseClient';

// --- Analytics View (Placeholder) ---
export const AnalyticsView = () => (
  <div className="p-10 flex flex-col items-center justify-center h-full text-neutral-500 animate-fade-in">
    <div className="w-20 h-20 bg-neutral-900 rounded-2xl flex items-center justify-center mb-6 border border-neutral-800">
      <TrendingUp size={32} className="text-neutral-700" />
    </div>
    <h3 className="text-xl font-medium text-white mb-3">Analytics Dashboard</h3>
    <p className="max-w-md text-center text-neutral-500 leading-relaxed">
      Visualize your agency's performance, track revenue growth, and monitor team utilization rates over time.
    </p>
  </div>
);

// --- Payments View (Placeholder) ---
export const PaymentsView = () => (
  <div className="p-10 flex flex-col items-center justify-center h-full text-neutral-500 animate-fade-in">
    <div className="w-20 h-20 bg-neutral-900 rounded-2xl flex items-center justify-center mb-6 border border-neutral-800">
      <Wallet size={32} className="text-neutral-700" />
    </div>
    <h3 className="text-xl font-medium text-white mb-3">Payments & Invoices</h3>
    <p className="max-w-md text-center text-neutral-500 leading-relaxed">
      Manage client subscriptions, view invoice history, and handle payment methods securely.
    </p>
  </div>
);

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
            alert("Failed to add client: " + error.message);
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

  const sortedClients = [...clients].sort((a, b) => {
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
                    className="bg-transparent border-none outline-none text-sm text-white w-full placeholder-neutral-600"
                />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] border border-neutral-800 rounded-lg text-sm text-neutral-300 hover:text-white hover:border-neutral-600 transition-colors">
                <Filter size={14} /> Filter
            </button>
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
            {sortedClients.map((client) => (
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
            ))}
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