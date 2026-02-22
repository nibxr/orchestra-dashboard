import React, { useState, useEffect, useMemo } from 'react';
import { FileText, ExternalLink, Package, Check, ChevronUp, ChevronDown, Calendar, ArrowUpRight, Plus, X, Loader2, Link as LinkIcon, Trash2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { createCheckoutSession } from '../utils/stripeService';

// ============================================================
// CLIENT PLANS VIEW
// ============================================================
// Plans that should not be displayed to clients
const HIDDEN_PLAN_NAMES = ['👿 Custom plan', '🟦 Lite - 1 tâche / 5 jours'];

export const ClientPlansView = ({ availablePlans, planLimits, clientMembership }) => {
  const { isDark } = useTheme();
  const [billingPeriod, setBillingPeriod] = useState('monthly');
  const [showIncluded, setShowIncluded] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(null);

  const currentPlan = availablePlans?.find(p => p.whalesync_postgres_id === clientMembership?.plan_from_agreements);

  const planFeatures = [

    'Retours illimités',
    'Fichiers sources',
    'Branding, illustrations, Réseaux sociaux',
    'Graphisme, Créations print',
    'Webdesign Figma',
    'Product Design',
    'Développement Web Framer',
    'Motion Design et montage Vidéo',
    'Optimisation du taux de conversion',
    'AI generated visuals',
    'Accès aux banques d\'image',
  ];

  const getPriceForPeriod = (plan) => {
    switch (billingPeriod) {
      case 'weekly': return plan.monthly_price_ht ? (plan.monthly_price_ht / 4).toFixed(2) : '—';
      case 'monthly': return plan.monthly_price_ht ? plan.monthly_price_ht.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : '—';
      case 'quarterly': return plan.quarterly_price_ht ? plan.quarterly_price_ht.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : '—';
      case 'yearly': return plan.yearly_price_ht ? plan.yearly_price_ht.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : '—';
      default: return '—';
    }
  };

  const periodLabel = { weekly: 'week', monthly: 'month', quarterly: 'quarter', yearly: 'year' };

  const handleManageBilling = async () => {
    if (!clientMembership?.stripe_customer_id) return;
    try {
      const { data, error } = await supabase.functions.invoke('create-portal-session', {
        body: { customerId: clientMembership.stripe_customer_id }
      });
      if (data?.url) window.open(data.url, '_blank');
    } catch (err) {
      console.error('Error opening billing portal:', err);
    }
  };

  const handleSelectPlan = async (plan) => {
    setCheckoutLoading(plan.id);
    try {
      const { url, error } = await createCheckoutSession(
        clientMembership?.id,
        plan.id,
        `${window.location.origin}?checkout=success`,
        `${window.location.origin}?checkout=cancel`
      );
      if (error) throw error;
      if (url) window.location.href = url;
    } catch (err) {
      console.error('Checkout error:', err);
    } finally {
      setCheckoutLoading(null);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      <div className="max-w-5xl mx-auto px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Plans</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={handleManageBilling}
              className="flex items-center gap-2 px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Manage Billing
            </button>
          </div>
        </div>
        <p className="text-sm text-neutral-500 mb-8">Change your plan, update your billing info, and download your invoices</p>

        {/* Current Plan Card */}
        {currentPlan && (
          <div className="border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 mb-12">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">{currentPlan.plan_name}</h2>
                <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-medium">Active</span>
              </div>
              <button onClick={() => setShowIncluded(!showIncluded)} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors">
                {showIncluded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
            </div>

            {showIncluded && (
              <div className="mt-6 grid grid-cols-2 gap-x-12">
                <div />
                <div>
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-4">Included in plan</h3>
                  <div className="space-y-3">
                    {planFeatures.map((feature, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm text-neutral-600 dark:text-neutral-400">
                        <Check size={16} className="text-neutral-400 dark:text-neutral-500 shrink-0" />
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {clientMembership?.created_at && (
              <div className="mt-6 flex items-center gap-2 text-xs text-neutral-400">
                <Calendar size={14} />
                Member since {new Date(clientMembership.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
            )}
          </div>
        )}

        {/* Available Plans */}
        <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-6">Our available plans</h2>

        {/* Billing Period Toggle */}
        <div className="flex bg-neutral-100 dark:bg-neutral-900 rounded-full p-1 w-fit mb-8">
          {['weekly', 'monthly', 'quarterly', 'yearly'].map(period => (
            <button
              key={period}
              onClick={() => setBillingPeriod(period)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all capitalize ${billingPeriod === period ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </button>
          ))}
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {availablePlans?.filter(p => p.active !== false && p.plan_name && !HIDDEN_PLAN_NAMES.includes(p.plan_name)).sort((a, b) => (a.monthly_price_ht || 0) - (b.monthly_price_ht || 0)).map(plan => {
            const isCurrent = plan.whalesync_postgres_id === currentPlan?.whalesync_postgres_id;
            const tasksAtOnce = plan.tasks_at_once ? parseInt(plan.tasks_at_once) : 1;
            const sla = plan.delivery_sla_business_days || '48h';

            return (
              <div key={plan.whalesync_postgres_id} className={`border rounded-2xl p-6 transition-all flex flex-col ${isCurrent ? 'border-neutral-900 dark:border-white' : 'border-neutral-200 dark:border-neutral-800'}`}>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">{plan.plan_name}</h3>
                <p className="text-sm text-neutral-500 mb-6 min-h-[60px]">{plan.description || `${tasksAtOnce} tâche${tasksAtOnce > 1 ? 's' : ''} à la fois, ${sla} par tâche.`}</p>

                <div className="mb-6">
                  <span className="text-3xl font-bold text-neutral-900 dark:text-white">{getPriceForPeriod(plan)} €</span>
                  <span className="text-sm text-neutral-500 ml-1">{periodLabel[billingPeriod]}</span>
                </div>

                <div className="space-y-3 flex-1">
                  {[
                    `${tasksAtOnce} tâche${tasksAtOnce > 1 ? 's' : ''} à la fois`,
                    `${sla} par tâche`,
                    'Retours illimités',
                    'Fichiers sources',
                    'Branding, illustrations, Réseaux sociaux',
                    'Graphisme, Créations print',
                    'Webdesign Figma',
                    'Product Design',
                  ].map((feature, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm text-neutral-600 dark:text-neutral-400">
                      <Check size={16} className="text-neutral-400 dark:text-neutral-500 shrink-0" />
                      {feature}
                    </div>
                  ))}
                </div>

                {/* Plan Action Button */}
                <div className="mt-6">
                  {isCurrent ? (
                    <div className="w-full py-2.5 text-center text-sm font-medium rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
                      Current Plan
                    </div>
                  ) : plan.stripe_price_id ? (
                    <button
                      onClick={() => handleSelectPlan(plan)}
                      disabled={checkoutLoading === plan.id}
                      className="w-full py-2.5 text-sm font-medium rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {checkoutLoading === plan.id ? (
                        <Loader2 size={16} className="animate-spin mx-auto" />
                      ) : (
                        'Select Plan'
                      )}
                    </button>
                  ) : (
                    <div className="w-full py-2.5 text-center text-sm font-medium rounded-xl border border-neutral-200 dark:border-neutral-800 text-neutral-400">
                      Contact us
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// CLIENT DOCUMENTS VIEW
// ============================================================
const DOCUMENT_TYPES = ['Brand Guidelines', 'Asset', 'Brief', 'Contract', 'Invoice', 'Other'];

export const ClientDocumentsView = ({ membershipId }) => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newDoc, setNewDoc] = useState({
    title: '',
    document_type: '',
    file_url: '',
    notes: ''
  });

  const fetchDocuments = async () => {
    if (!membershipId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('client_documents')
      .select('*')
      .eq('membership_id', membershipId)
      .order('created_at', { ascending: false });
    if (!error) setDocuments(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchDocuments();
  }, [membershipId]);

  const handleAddDocument = async () => {
    if (!newDoc.title.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from('client_documents')
      .insert({
        title: newDoc.title.trim(),
        document_type: newDoc.document_type || null,
        file_url: newDoc.file_url || null,
        notes: newDoc.notes || null,
        membership_id: membershipId,
        created_by: user?.id
      });
    if (!error) {
      setNewDoc({ title: '', document_type: '', file_url: '', notes: '' });
      setShowAddForm(false);
      await fetchDocuments();
    }
    setSaving(false);
  };

  const handleDeleteDocument = async (docId) => {
    const { error } = await supabase
      .from('client_documents')
      .delete()
      .eq('id', docId);
    if (!error) {
      setDocuments(prev => prev.filter(d => d.id !== docId));
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-neutral-200 dark:border-neutral-800 border-t-neutral-900 dark:border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      <div className="max-w-3xl mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Documents</h1>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus size={16} />
            Add Document
          </button>
        </div>
        <p className="text-sm text-neutral-500 mb-8">Resources and files shared with your team</p>

        {/* Add Document Form */}
        {showAddForm && (
          <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">New Document</h3>
              <button onClick={() => { setShowAddForm(false); setNewDoc({ title: '', document_type: '', file_url: '', notes: '' }); }} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1.5">Title *</label>
                <input
                  type="text"
                  value={newDoc.title}
                  onChange={e => setNewDoc(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Document title"
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1.5">Type</label>
                <select
                  value={newDoc.document_type}
                  onChange={e => setNewDoc(prev => ({ ...prev, document_type: e.target.value }))}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-400"
                >
                  <option value="">Select type...</option>
                  {DOCUMENT_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1.5">URL / Link</label>
                <div className="relative">
                  <LinkIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="url"
                    value={newDoc.file_url}
                    onChange={e => setNewDoc(prev => ({ ...prev, file_url: e.target.value }))}
                    placeholder="https://..."
                    className="w-full pl-9 pr-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1.5">Notes</label>
                <textarea
                  value={newDoc.notes}
                  onChange={e => setNewDoc(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Optional notes..."
                  rows={2}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 resize-none"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => { setShowAddForm(false); setNewDoc({ title: '', document_type: '', file_url: '', notes: '' }); }}
                  className="px-4 py-2 text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddDocument}
                  disabled={!newDoc.title.trim() || saving}
                  className="px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : 'Add Document'}
                </button>
              </div>
            </div>
          </div>
        )}

        {documents.length === 0 && !showAddForm ? (
          <div className="text-center py-16">
            <FileText size={48} className="mx-auto mb-4 text-neutral-300 dark:text-neutral-700" />
            <p className="text-neutral-500 text-sm">No documents yet</p>
            <p className="text-neutral-400 text-xs mt-1">Add documents and resources for your team</p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map(doc => (
              <div
                key={doc.id}
                className="flex items-center gap-4 p-4 border border-neutral-200 dark:border-neutral-800 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors group"
              >
                <div className="w-10 h-10 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                  <FileText size={18} className="text-neutral-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-neutral-900 dark:text-white truncate">{doc.title}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    {doc.document_type && <span className="text-xs text-neutral-400">{doc.document_type}</span>}
                    {doc.created_at && <span className="text-xs text-neutral-400">· {new Date(doc.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</span>}
                  </div>
                  {doc.notes && (
                    <p className="text-xs text-neutral-500 mt-1 line-clamp-1">{doc.notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  {doc.file_url && (
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
                    >
                      <ExternalLink size={16} />
                    </a>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteDocument(doc.id); }}
                    className="text-neutral-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================
// CLIENT DELIVERABLES VIEW
// ============================================================
export const ClientDeliverablesView = ({ tasks, onSelectTask }) => {
  const [filter, setFilter] = useState('all');

  const deliverableTasks = useMemo(() => {
    const filtered = tasks.filter(t => t.status === 'Done' || t.status === 'To Review');
    if (filter === 'all') return filtered;
    return filtered.filter(t => t.status === filter);
  }, [tasks, filter]);

  const doneCount = tasks.filter(t => t.status === 'Done').length;
  const reviewCount = tasks.filter(t => t.status === 'To Review').length;

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      <div className="max-w-3xl mx-auto px-8 py-8">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">Deliverables</h1>
        <p className="text-sm text-neutral-500 mb-6">{doneCount + reviewCount} delivered tasks</p>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { key: 'all', label: 'All', count: doneCount + reviewCount },
            { key: 'To Review', label: 'To Review', count: reviewCount },
            { key: 'Done', label: 'Done', count: doneCount },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${filter === tab.key ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white'}`}
            >
              {tab.label} <span className="ml-1 opacity-60">{tab.count}</span>
            </button>
          ))}
        </div>

        {deliverableTasks.length === 0 ? (
          <div className="text-center py-16">
            <Package size={48} className="mx-auto mb-4 text-neutral-300 dark:text-neutral-700" />
            <p className="text-neutral-500 text-sm">No deliverables yet</p>
            <p className="text-neutral-400 text-xs mt-1">Completed tasks will appear here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {deliverableTasks.map(task => (
              <button
                key={task.id}
                onClick={() => onSelectTask(task)}
                className="w-full text-left p-4 border border-neutral-200 dark:border-neutral-800 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-neutral-900 dark:text-white group-hover:text-neutral-700 dark:group-hover:text-neutral-100">{task.title}</h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${task.status === 'Done' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'}`}>
                    {task.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-neutral-400">
                  {task.updated_at && (
                    <span>{new Date(task.updated_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  )}
                  {task.assigneeName && <span>by {task.assigneeName}</span>}
                  {task.orchestra_task_id && <span className="font-mono">{task.orchestra_task_id}</span>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
