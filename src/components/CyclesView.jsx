import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import {
  Calendar, Search, X, RefreshCw, ChevronRight
} from 'lucide-react';
import { useToast } from './Toast';

// ─── Operational Status Helpers ───────────────────────────────────────────────
const OPERATIONAL_STATUSES = {
  ONGOING: 'Ongoing cycle',
  PREVIOUS: 'Previous cycle',
  PLANNED: 'Planned cycle',
};

const getOpStatusStyle = (status) => {
  const s = (status || '').toLowerCase();
  if (s.includes('ongoing')) return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
  if (s.includes('previous')) return 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 border-neutral-200 dark:border-neutral-700';
  if (s.includes('planned')) return 'bg-sky-500/10 text-sky-500 border-sky-500/20';
  return 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 border-neutral-200 dark:border-neutral-700';
};

const getOpStatusDot = (status) => {
  const s = (status || '').toLowerCase();
  if (s.includes('ongoing')) return 'bg-emerald-500';
  if (s.includes('previous')) return 'bg-neutral-400';
  if (s.includes('planned')) return 'bg-sky-500';
  return 'bg-neutral-400';
};

const getOpStatusLabel = (status) => {
  const s = (status || '').toLowerCase();
  if (s.includes('ongoing')) return 'Ongoing';
  if (s.includes('previous')) return 'Previous';
  if (s.includes('planned')) return 'Planned';
  return status || '-';
};

// ─── Date-based progress calculation ──────────────────────────────────────────
const calculateCycleProgress = (cycle) => {
  const opStatus = (cycle.operational_status_new || '').toLowerCase();

  // Previous cycle → always 100%
  if (opStatus.includes('previous')) return 100;

  // Planned cycle → always 0%
  if (opStatus.includes('planned')) return 0;

  // Ongoing cycle → calculate from planned_start_date to actual_end_date based on today
  const startStr = cycle.planned_start_date;
  const endStr = cycle.actual_end_date || cycle.schedule_ending_date_txt;

  if (!startStr || !endStr) return 0;

  const start = new Date(startStr);
  const end = new Date(endStr);
  const today = new Date();

  // Zero out time portions for clean date comparison
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const totalDuration = end.getTime() - start.getTime();
  if (totalDuration <= 0) return 100;

  const elapsed = today.getTime() - start.getTime();
  if (elapsed <= 0) return 0;

  return Math.min(Math.round((elapsed / totalDuration) * 100), 100);
};

const getProgressColor = (pct, opStatus) => {
  const s = (opStatus || '').toLowerCase();
  if (s.includes('previous')) return 'bg-neutral-300 dark:bg-neutral-600';
  if (s.includes('planned')) return 'bg-sky-400';
  // Ongoing — color based on how far along
  if (pct >= 90) return 'bg-red-500';
  if (pct >= 70) return 'bg-amber-500';
  return 'bg-emerald-500';
};

// ─── Cycle Detail Slide-over ──────────────────────────────────────────────────
const CycleDetails = ({ cycle, onClose }) => {
  if (!cycle) return null;

  const formatDate = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatArray = (arr) => {
    if (!arr) return '-';
    if (Array.isArray(arr)) return arr.join(', ') || '-';
    return arr || '-';
  };

  const formatPrice = (v) => {
    if (v == null) return '-';
    return `€${Math.round(v).toLocaleString()}`;
  };

  const progress = calculateCycleProgress(cycle);

  const details = [
    { label: 'Plan', value: cycle.plan_name || '-' },
    { label: 'Custom Price (HT)', value: formatPrice(cycle.custom_price_ht_from_agreement) },
    { label: 'Planned Start', value: formatDate(cycle.planned_start_date) },
    { label: 'Actual End Date', value: formatDate(cycle.actual_end_date || cycle.schedule_ending_date_txt) },
    { label: 'Scheduled End', value: formatDate(cycle.schedule_ending_date_txt) },
    { label: 'Extension Days', value: cycle.extension_days != null ? `${cycle.extension_days} days` : '-' },
    { label: 'Scheduled Days', value: cycle.scheduled_business_days || '-' },
    { label: 'Actual Days', value: cycle.actual_business_days != null ? cycle.actual_business_days : '-' },
    { label: 'Pause Policy', value: formatArray(cycle.pause_policy_from_agreement) },
    { label: 'Renewal Type', value: formatArray(cycle.renewal_type_from_agreement) },
    { label: 'Periodicity', value: formatArray(cycle.invoice_cycle_periodicity_from_agreement) },
    { label: 'Payment Terms', value: formatArray(cycle.payment_terms_from_agreement) },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 dark:bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-[420px] bg-white dark:bg-[#0f0f0f] border-l border-neutral-200 dark:border-neutral-800 z-50 flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-900 dark:text-white font-semibold text-xs shrink-0">
              {cycle.client_name?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                {cycle.cycleid || 'Cycle'}
              </div>
              <div className="text-xs text-neutral-400 truncate">{cycle.client_name}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors p-1"
          >
            <X size={16} />
          </button>
        </div>

        {/* Status + Progress summary */}
        <div className="px-6 py-5 border-b border-neutral-200 dark:border-neutral-800">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <div className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider mb-1.5">Status</div>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${getOpStatusStyle(cycle.operational_status_new)}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${getOpStatusDot(cycle.operational_status_new)}`}></span>
                {getOpStatusLabel(cycle.operational_status_new)}
              </span>
            </div>
            <div>
              <div className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider mb-1.5">Price</div>
              <div className="text-lg font-semibold text-neutral-900 dark:text-white font-mono">
                {formatPrice(cycle.custom_price_ht_from_agreement)}
              </div>
            </div>
          </div>
          {/* Progress bar */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider">Cycle Progress</div>
              <span className="text-xs font-mono text-neutral-500">{progress}%</span>
            </div>
            <div className="w-full h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${getProgressColor(progress, cycle.operational_status_new)}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Details list */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-5">
          <div className="space-y-0">
            {details.map(({ label, value }, i) => (
              <div
                key={label}
                className={`flex items-center justify-between py-3 ${i !== details.length - 1 ? 'border-b border-neutral-100 dark:border-neutral-800/50' : ''}`}
              >
                <span className="text-xs text-neutral-400">{label}</span>
                <span className="text-xs text-neutral-900 dark:text-white font-medium text-right max-w-[200px] truncate">
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

// ─── Main CyclesView ──────────────────────────────────────────────────────────
export const CyclesView = () => {
  const toast = useToast();
  const [cycles, setCycles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCycle, setSelectedCycle] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch cycles from Supabase Cycles table
      const { data: cyclesData, error: cyclesErr } = await supabase
        .from('Cycles')
        .select('*')
        .order('planned_start_date', { ascending: false });

      if (cyclesErr) throw cyclesErr;

      // Fetch related data for enrichment
      const { data: agreementsData } = await supabase.from('Agreements').select('whalesync_postgres_id, client_memberships, status');
      const { data: clientsData } = await supabase.from('client_memberships').select('id, client_name, status');
      const { data: plansData } = await supabase.from('Plans').select('whalesync_postgres_id, plan_name');

      // Enrich cycles
      const enriched = (cyclesData || []).map(cycle => {
        // Find agreement
        const agreement = (agreementsData || []).find(a => a.whalesync_postgres_id === cycle.agreement);
        // Find client via agreement -> client_memberships FK
        const client = agreement
          ? (clientsData || []).find(c => c.id === agreement.client_memberships)
          : (clientsData || []).find(c => c.id === cycle.client_memberships_from_agreement);
        // Find plan
        const plan = (plansData || []).find(p => p.whalesync_postgres_id === cycle.plans_from_agreement);

        return {
          ...cycle,
          client_name: client?.client_name || 'Unknown',
          client_id: client?.id || cycle.client_memberships_from_agreement,
          plan_name: plan?.plan_name || null,
        };
      });

      setCycles(enriched);
    } catch (error) {
      console.error('Error fetching cycles:', error);
      toast.error(`Failed to load cycles: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Unique clients for filter
  const uniqueClients = useMemo(() => {
    const map = new Map();
    cycles.forEach(c => {
      if (c.client_id && !map.has(c.client_id)) {
        map.set(c.client_id, c.client_name);
      }
    });
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [cycles]);

  // Filtered & sorted cycles
  const filteredCycles = useMemo(() => {
    let result = [...cycles];

    if (selectedClient !== 'all') {
      result = result.filter(c => c.client_id === selectedClient);
    }

    if (statusFilter !== 'all') {
      result = result.filter(c => {
        const s = (c.operational_status_new || '').toLowerCase();
        if (statusFilter === 'ongoing') return s.includes('ongoing');
        if (statusFilter === 'previous') return s.includes('previous');
        if (statusFilter === 'planned') return s.includes('planned');
        return true;
      });
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c =>
        (c.client_name || '').toLowerCase().includes(q) ||
        (c.cycleid || '').toLowerCase().includes(q) ||
        (c.plan_name || '').toLowerCase().includes(q)
      );
    }

    return result;
  }, [cycles, selectedClient, statusFilter, searchQuery]);

  // Group by client
  const grouped = useMemo(() => {
    const map = {};
    filteredCycles.forEach(c => {
      const key = c.client_id || 'unknown';
      if (!map[key]) {
        map[key] = { client_name: c.client_name, cycles: [] };
      }
      map[key].cycles.push(c);
    });
    // Sort groups by client name
    return Object.entries(map).sort(([, a], [, b]) => a.client_name.localeCompare(b.client_name));
  }, [filteredCycles]);

  // Stats
  const totalCycles = cycles.length;
  const ongoingCycles = cycles.filter(c => (c.operational_status_new || '').toLowerCase().includes('ongoing')).length;
  const plannedCycles = cycles.filter(c => (c.operational_status_new || '').toLowerCase().includes('planned')).length;

  const formatDate = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' });
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex items-center gap-3 text-neutral-400">
          <RefreshCw size={16} className="animate-spin" />
          <span className="text-sm">Loading cycles...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto custom-scrollbar animate-fade-in">
      <div className="p-6 max-w-[1400px] mx-auto">

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-[#0f0f0f] border border-neutral-200 dark:border-neutral-800 rounded-xl px-5 py-4">
            <div className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider mb-1">Total Cycles</div>
            <div className="text-2xl font-semibold text-neutral-900 dark:text-white">{totalCycles}</div>
          </div>
          <div className="bg-white dark:bg-[#0f0f0f] border border-neutral-200 dark:border-neutral-800 rounded-xl px-5 py-4">
            <div className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider mb-1">Ongoing</div>
            <div className="text-2xl font-semibold text-emerald-500">{ongoingCycles}</div>
          </div>
          <div className="bg-white dark:bg-[#0f0f0f] border border-neutral-200 dark:border-neutral-800 rounded-xl px-5 py-4">
            <div className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider mb-1">Planned</div>
            <div className="text-2xl font-semibold text-sky-500">{plannedCycles}</div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* Status pills */}
            <div className="flex bg-neutral-100 dark:bg-neutral-900 rounded-lg p-1 text-xs font-medium">
              {['all', 'ongoing', 'planned', 'previous'].map(f => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-3 py-1 rounded-md transition-all capitalize ${statusFilter === f ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'}`}
                >
                  {f === 'all' ? 'All' : f}
                </button>
              ))}
            </div>

            {/* Client filter */}
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="bg-neutral-100 dark:bg-neutral-900 border-none rounded-lg px-3 py-1.5 text-xs text-neutral-600 dark:text-neutral-300 focus:outline-none cursor-pointer"
            >
              <option value="all">All clients</option>
              {uniqueClients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            {/* Search */}
            <div className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-900 rounded-lg px-3 py-1.5 w-48 focus-within:ring-1 focus-within:ring-neutral-300 dark:focus-within:ring-neutral-700 transition-all">
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
          <span className="text-xs text-neutral-400">{filteredCycles.length} cycle{filteredCycles.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Content */}
        {grouped.length === 0 ? (
          <div className="py-20 text-center">
            <RefreshCw size={32} className="mx-auto mb-3 text-neutral-300 dark:text-neutral-700" />
            <p className="text-sm text-neutral-400">No cycles found</p>
          </div>
        ) : (
          <div className="space-y-8">
            {grouped.map(([clientId, group]) => (
              <div key={clientId}>
                {/* Client header */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-900 dark:text-white font-semibold text-xs">
                    {group.client_name[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <span className="text-sm font-medium text-neutral-900 dark:text-white">{group.client_name}</span>
                    <span className="text-xs text-neutral-400 ml-2">{group.cycles.length} cycle{group.cycles.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>

                {/* Cycles table for this client */}
                <div className="bg-white dark:bg-[#0f0f0f] border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
                  {/* Header */}
                  <div className="grid grid-cols-[120px_90px_1fr_140px_100px_24px] gap-4 px-5 py-2.5 border-b border-neutral-200 dark:border-neutral-800 text-[10px] font-medium text-neutral-400 uppercase tracking-wider">
                    <div>Cycle</div>
                    <div>Status</div>
                    <div>Period</div>
                    <div>Progress</div>
                    <div>Price</div>
                    <div></div>
                  </div>

                  {/* Rows */}
                  {group.cycles.map((cycle, idx) => {
                    const progress = calculateCycleProgress(cycle);
                    return (
                      <div
                        key={cycle.whalesync_postgres_id}
                        onClick={() => setSelectedCycle(cycle)}
                        className={`grid grid-cols-[120px_90px_1fr_140px_100px_24px] gap-4 px-5 py-3 items-center transition-colors hover:bg-neutral-50 dark:hover:bg-white/[0.02] cursor-pointer ${idx !== group.cycles.length - 1 ? 'border-b border-neutral-100 dark:border-neutral-800/50' : ''}`}
                      >
                        {/* Cycle ID */}
                        <div className="text-xs font-mono text-neutral-500 truncate">
                          {cycle.cycleid || `#${cycle.id || '-'}`}
                        </div>

                        {/* Operational Status */}
                        <div>
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border ${getOpStatusStyle(cycle.operational_status_new)}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${getOpStatusDot(cycle.operational_status_new)}`}></span>
                            {getOpStatusLabel(cycle.operational_status_new)}
                          </span>
                        </div>

                        {/* Period */}
                        <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                          <Calendar size={12} className="text-neutral-400 shrink-0" />
                          <span>{formatDate(cycle.planned_start_date)}</span>
                          <span className="text-neutral-300 dark:text-neutral-700">→</span>
                          <span>{formatDate(cycle.actual_end_date || cycle.schedule_ending_date_txt)}</span>
                          {cycle.extension_days > 0 && (
                            <span className="text-amber-500 text-[10px] font-medium ml-1">+{cycle.extension_days}d</span>
                          )}
                        </div>

                        {/* Progress */}
                        <div className="flex items-center gap-2">
                          <div className="w-full h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${getProgressColor(progress, cycle.operational_status_new)}`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-neutral-400 font-mono w-8 text-right shrink-0">
                            {progress}%
                          </span>
                        </div>

                        {/* Price */}
                        <div className="text-xs text-neutral-900 dark:text-white font-mono">
                          {cycle.custom_price_ht_from_agreement ? `€${Math.round(cycle.custom_price_ht_from_agreement).toLocaleString()}` : '-'}
                        </div>

                        {/* Arrow indicator */}
                        <div className="flex items-center justify-center">
                          <ChevronRight size={14} className="text-neutral-300 dark:text-neutral-700" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cycle Detail Panel */}
      {selectedCycle && (
        <CycleDetails
          cycle={selectedCycle}
          onClose={() => setSelectedCycle(null)}
        />
      )}
    </div>
  );
};
