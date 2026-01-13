import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import airtableBase from '../airtableClient';
import {
  Calendar, User, DollarSign, Clock, TrendingUp, Filter,
  ChevronRight, AlertCircle, CheckCircle2, XCircle
} from 'lucide-react';
import { Avatar } from './Shared';
import { useToast } from './Toast';

export const CyclesView = () => {
  const toast = useToast();
  const [cycles, setCycles] = useState([]);
  const [clients, setClients] = useState([]);
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch cycles from Airtable
      console.log('Fetching cycles from Airtable...');
      const cyclesData = [];
      const agreementIds = new Set();

      // Fetch records from Airtable "Clara's V2 of 🔄 Cycles" table
      await airtableBase("Clara's V2 of 🔄 Cycles")
        .select({
          sort: [{ field: 'Planned start date', direction: 'desc' }]
        })
        .eachPage((records, fetchNextPage) => {
          records.forEach(record => {
            const agreementId = record.get('🔄 Agreement')?.[0];
            if (agreementId) {
              agreementIds.add(agreementId);
            }

            // Transform Airtable record to match your data structure
            cyclesData.push({
              id: record.id,
              whalesync_postgres_id: record.id,
              cycleid: record.get('CycleID'),
              planned_start_date: record.get('Planned start date'),
              schedule_ending_date_txt: record.get('Schedule ending date - txt'),
              actual_business_days: record.get('Actual business days'),
              scheduled_business_days: record.get('Scheduled business days'),
              extension_days: record.get('Extension days') || 0,
              value: record.get('Value'),
              status_from_agreement: record.get('Status (from 🔄 Agreement)'),
              agreement_id: agreementId,
              team_project_owner_from_team: record.get('👥 Team - Project owner (From 👥 Team)')?.[0],
            });
          });
          fetchNextPage();
        });

      console.log('Cycles fetched from Airtable:', cyclesData.length);

      // Fetch agreements from Airtable to get client membership links
      console.log('Fetching agreements from Airtable...');
      const agreementsData = [];
      const clientMembershipIds = new Set();

      await airtableBase('🔄 Agreements')
        .select({
          filterByFormula: `OR(${Array.from(agreementIds).map(id => `RECORD_ID()='${id}'`).join(',')})`
        })
        .eachPage((records, fetchNextPage) => {
          records.forEach(record => {
            const clientMembershipId = record.get('🔄 Client memberships')?.[0];
            if (clientMembershipId) {
              clientMembershipIds.add(clientMembershipId);
            }

            agreementsData.push({
              id: record.id,
              client_membership_id: clientMembershipId,
              status: record.get('Status'),
            });
          });
          fetchNextPage();
        });

      console.log('Agreements fetched:', agreementsData.length);

      // Fetch client memberships from Airtable
      console.log('Fetching client memberships from Airtable...');
      const clientMembershipsData = [];

      await airtableBase('🔄 Client Memberships')
        .select({
          filterByFormula: `OR(${Array.from(clientMembershipIds).map(id => `RECORD_ID()='${id}'`).join(',')})`
        })
        .eachPage((records, fetchNextPage) => {
          records.forEach(record => {
            clientMembershipsData.push({
              id: record.id,
              client_name: record.get('Client name'),
              status: record.get('Statut opérationnel'),
              orchestra_id: record.get('Orchestra ID'),
            });
          });
          fetchNextPage();
        });

      console.log('Client memberships fetched:', clientMembershipsData.length);

      // Fetch team from Supabase (for project owner enrichment)
      const { data: teamData, error: teamError } = await supabase
        .from('team')
        .select('*');

      if (teamError) throw teamError;

      // Enrich cycles with client and team info from Airtable
      const enrichedCycles = cyclesData.map(cycle => {
        // Find agreement for this cycle
        const agreement = agreementsData.find(a => a.id === cycle.agreement_id);

        // Find client membership from Airtable data
        const clientMembership = clientMembershipsData.find(c => c.id === agreement?.client_membership_id);

        // Find project owner from Supabase team table
        const projectOwner = teamData?.find(t => t.id === cycle.team_project_owner_from_team);

        return {
          ...cycle,
          client_memberships_from_agreement: agreement?.client_membership_id,
          clientName: clientMembership?.client_name || 'Unknown Client',
          clientStatus: agreement?.status || clientMembership?.status || 'Unknown',
          projectOwnerName: projectOwner?.full_name || 'Unassigned',
          projectOwnerAvatar: projectOwner?.avatar_url || null,
          status_from_agreement: cycle.status_from_agreement || [agreement?.status],
        };
      });

      console.log('Enriched cycles:', enrichedCycles);
      console.log('Total cycles found:', enrichedCycles.length);

      setCycles(enrichedCycles);
      setClients(clientMembershipsData || []);
      setTeam(teamData || []);
    } catch (error) {
      console.error('Error fetching cycles:', error);
      toast.error(`Error fetching cycles: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Filter cycles
  const filteredCycles = useMemo(() => {
    let result = [...cycles];

    // Filter by client
    if (selectedClient !== 'all') {
      result = result.filter(c => c.client_memberships_from_agreement === selectedClient);
    }

    // Filter by status
    if (selectedStatus !== 'all') {
      result = result.filter(c => {
        const status = c.status_from_agreement?.[0] || 'unknown';
        return status.toLowerCase().includes(selectedStatus.toLowerCase());
      });
    }

    return result;
  }, [cycles, selectedClient, selectedStatus]);

  // Group cycles by client
  const cyclesByClient = useMemo(() => {
    const grouped = {};

    filteredCycles.forEach(cycle => {
      const clientId = cycle.client_memberships_from_agreement;
      if (!grouped[clientId]) {
        grouped[clientId] = {
          clientName: cycle.clientName,
          clientStatus: cycle.clientStatus,
          cycles: []
        };
      }
      grouped[clientId].cycles.push(cycle);
    });

    // Sort cycles within each client by start date
    Object.values(grouped).forEach(group => {
      group.cycles.sort((a, b) => {
        const dateA = new Date(a.planned_start_date || 0);
        const dateB = new Date(b.planned_start_date || 0);
        return dateB - dateA;
      });
    });

    return grouped;
  }, [filteredCycles]);

  // Get unique clients for filter
  const uniqueClients = useMemo(() => {
    const clientMap = new Map();
    cycles.forEach(cycle => {
      if (cycle.client_memberships_from_agreement && !clientMap.has(cycle.client_memberships_from_agreement)) {
        clientMap.set(cycle.client_memberships_from_agreement, {
          id: cycle.client_memberships_from_agreement,
          name: cycle.clientName
        });
      }
    });
    return Array.from(clientMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [cycles]);

  const getStatusColor = (status) => {
    const statusLower = (status?.[0] || '').toLowerCase();
    if (statusLower.includes('active') || statusLower.includes('en cours')) return 'text-green-500 bg-green-500/10 border-green-500/30';
    if (statusLower.includes('completed') || statusLower.includes('done')) return 'text-blue-500 bg-blue-500/10 border-blue-500/30';
    if (statusLower.includes('upcoming') || statusLower.includes('planned')) return 'text-amber-500 bg-amber-500/10 border-amber-500/30';
    if (statusLower.includes('paused')) return 'text-neutral-500 bg-neutral-500/10 border-neutral-500/30';
    return 'text-neutral-400 bg-neutral-800 border-neutral-700';
  };

  const getStatusIcon = (status) => {
    const statusLower = (status?.[0] || '').toLowerCase();
    if (statusLower.includes('active') || statusLower.includes('en cours')) return <CheckCircle2 size={14} />;
    if (statusLower.includes('completed') || statusLower.includes('done')) return <CheckCircle2 size={14} />;
    if (statusLower.includes('upcoming') || statusLower.includes('planned')) return <Clock size={14} />;
    if (statusLower.includes('paused')) return <AlertCircle size={14} />;
    return <Clock size={14} />;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const calculateProgress = (actual, scheduled) => {
    if (!scheduled || scheduled === 0) return 0;
    return Math.min(Math.round((actual / scheduled) * 100), 100);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-neutral-500">Loading cycles...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-black">
      {/* Header with Filters */}
      <div className="border-b border-neutral-800 bg-[#0f0f0f] p-6 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Cycles</h1>
            <p className="text-sm text-neutral-500 mt-1">
              {filteredCycles.length} cycle{filteredCycles.length !== 1 ? 's' : ''} across {Object.keys(cyclesByClient).length} client{Object.keys(cyclesByClient).length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          {/* Client Filter */}
          <select
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            className="bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-neutral-600 transition-colors"
          >
            <option value="all">All Clients ({cycles.length})</option>
            {uniqueClients.map(client => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-neutral-600 transition-colors"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="upcoming">Upcoming</option>
            <option value="completed">Completed</option>
            <option value="paused">Paused</option>
          </select>
        </div>
      </div>

      {/* Cycles Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        {Object.keys(cyclesByClient).length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-neutral-500">
            <Filter size={48} className="mb-4 opacity-50" />
            <p>No cycles found</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(cyclesByClient).map(([clientId, group]) => (
              <div key={clientId} className="space-y-4">
                {/* Client Header */}
                <div className="flex items-center gap-3 pb-3 border-b border-neutral-800">
                  <div className="w-8 h-8 rounded-lg bg-lime-400 flex items-center justify-center text-black font-bold text-sm">
                    {group.clientName[0]}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-bold text-white">{group.clientName}</h2>
                    <p className="text-xs text-neutral-500">{group.cycles.length} cycle{group.cycles.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>

                {/* Cycles Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {group.cycles.map((cycle) => {
                    const progress = calculateProgress(
                      cycle.actual_business_days || 0,
                      cycle.scheduled_business_days || 0
                    );
                    const statusColor = getStatusColor(cycle.status_from_agreement);
                    const statusIcon = getStatusIcon(cycle.status_from_agreement);

                    return (
                      <div
                        key={cycle.whalesync_postgres_id}
                        className="bg-[#141414] border border-neutral-800 rounded-xl p-5 hover:border-neutral-700 transition-all cursor-pointer group"
                      >
                        {/* Cycle Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-mono text-neutral-500">
                                {cycle.cycleid || `Cycle ${cycle.id}`}
                              </span>
                              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border ${statusColor}`}>
                                {statusIcon}
                                {cycle.status_from_agreement?.[0] || 'Unknown'}
                              </div>
                            </div>
                          </div>
                          <ChevronRight size={16} className="text-neutral-600 group-hover:text-neutral-400 transition-colors" />
                        </div>

                        {/* Date Range */}
                        <div className="flex items-center gap-2 mb-4 text-sm">
                          <Calendar size={14} className="text-neutral-500" />
                          <span className="text-neutral-400">
                            {formatDate(cycle.planned_start_date)}
                          </span>
                          <span className="text-neutral-600">→</span>
                          <span className="text-neutral-400">
                            {formatDate(cycle.schedule_ending_date_txt)}
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-4">
                          <div className="flex items-center justify-between text-xs mb-2">
                            <span className="text-neutral-500">Business Days</span>
                            <span className="text-white font-medium">
                              {cycle.actual_business_days || 0} / {cycle.scheduled_business_days || 0}
                            </span>
                          </div>
                          <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                progress >= 90
                                  ? 'bg-red-500'
                                  : progress >= 70
                                  ? 'bg-amber-500'
                                  : 'bg-lime-400'
                              }`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-neutral-800">
                          {/* Project Owner */}
                          <div className="flex items-center gap-2">
                            <Avatar
                              name={cycle.projectOwnerName}
                              url={cycle.projectOwnerAvatar}
                              size="xs"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-neutral-500">Owner</p>
                              <p className="text-xs text-white truncate">{cycle.projectOwnerName}</p>
                            </div>
                          </div>

                          {/* Value */}
                          {cycle.value && (
                            <div>
                              <p className="text-xs text-neutral-500">Value</p>
                              <p className="text-xs text-white font-medium">
                                €{cycle.value.toLocaleString()}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Extensions */}
                        {cycle.extension_days > 0 && (
                          <div className="mt-3 pt-3 border-t border-neutral-800">
                            <div className="flex items-center gap-2 text-xs">
                              <TrendingUp size={12} className="text-amber-500" />
                              <span className="text-amber-500">+{cycle.extension_days} extension days</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
