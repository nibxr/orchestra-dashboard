import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { Filter, Settings, Plus, X, Bell } from 'lucide-react';

import { APP_ID, APP_MODES, DASHBOARD_VIEWS, SETTINGS_VIEWS } from './utils/constants';
import { DashboardSidebar, SettingsSidebar } from './components/Sidebars';
import { KanbanBoard } from './components/KanbanBoard';
import { ListView } from './components/ListView';
import { ClientPortal } from './components/ClientPortal'; // IMPORT PORTAL
import { AnalyticsView, PaymentsView, CustomersView } from './components/DashboardViews';
import { CyclesView } from './components/CyclesView';
import { ProfileSettingsView, AgencySettingsView, TeamSettingsView, WorkflowSettingsView, TemplatesView, ClientPortalSettingsView, PlansSettingsView } from './components/SettingsViews';
import { NewTaskModal } from './components/NewTaskModal';
import { NewClientModal } from './components/NewClientModal';
import { DisplayMenu, FilterMenu } from './components/Menus';
import { SearchModal } from './components/SearchModal';
import { TaskDetails } from './components/TaskDetails';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuth } from './contexts/AuthContext';
import { useConfirm } from './components/ConfirmModal';
import { useToast } from './components/Toast';
import { createVersion } from './utils/versionService';

export default function App() {
  const { user, userRole, userMembership } = useAuth();
  const { confirm } = useConfirm();
  const toast = useToast();
  const navigate = useNavigate();
  const [mode, setMode] = useState(APP_MODES.DASHBOARD);
  const [dashboardView, setDashboardView] = useState(DASHBOARD_VIEWS.BOARD);
  const [settingsView, setSettingsView] = useState(SETTINGS_VIEWS.AGENCY);
  
  const [tasks, setTasks] = useState([]);
  const [clients, setClients] = useState([]);
  const [agreements, setAgreements] = useState([]);
  const [team, setTeam] = useState([]);
  const [contacts, setContacts] = useState([]);

  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [newTaskStatus, setNewTaskStatus] = useState('Backlog');
  const [loading, setLoading] = useState(true);
  
  // Portal State
  const [portalClient, setPortalClient] = useState(null);

  const [displayMenuOpen, setDisplayMenuOpen] = useState(false);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const [displaySettings, setDisplaySettings] = useState({ view: 'kanban', orderBy: 'last_updated', showArchived: false, showInactive: false, visibleProperties: ['client', 'assignee', 'dueDate', 'id'] });
  const [taskFilter, setTaskFilter] = useState('all');
  const [advancedFilters, setAdvancedFilters] = useState({ assignee: [], client: [] });

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: teamData } = await supabase.from('team').select('*');
      setTeam(teamData || []);
      const { data: clientsData } = await supabase.from('client_memberships').select('*');
      setClients(clientsData || []);

      // Fetch agreements and plans for the Customers view
      const { data: agreementsData } = await supabase.from('Agreements').select('*');
      const { data: plansData } = await supabase.from('Plans').select('whalesync_postgres_id, plan_name');

      // Build agreements list with client name from client_memberships and plan name from plans
      const enrichedAgreements = (agreementsData || []).map(a => {
        const membership = (clientsData || []).find(c => c.id === a.client_memberships);
        const plan = a.plans ? (plansData || []).find(p => p.whalesync_postgres_id === a.plans) : null;
        return {
          ...a,
          client_name: membership?.client_name || 'Unknown',
          membership_id: a.client_memberships,
          plan_name: plan?.plan_name || null,
        };
      });
      setAgreements(enrichedAgreements);
      const { data: contactsData } = await supabase.from('client_contacts').select('*');
      setContacts(contactsData || []);
      const { data: tasksData } = await supabase.from('tasks').select('*');
      // Fetch only task-level comments (where version_id is null) for the normal task view
      const { data: commentsData } = await supabase.from('comments').select('*').is('version_id', null);

      if (tasksData) {
          const enrichedTasks = tasksData.map(t => {
              const assignee = teamData?.find(m => m.id === t.assigned_to_id);
              const client = clientsData?.find(c => c.id === t.membership_id);
              // Filter task-level comments for this specific task
              const taskComments = commentsData ? commentsData.filter(c => c.task_id === t.id) : [];

              // Enrich comments with author info
              const enrichedComments = taskComments.map(comment => {
                  let authorName = 'Unknown';
                  let authorAvatar = null;

                  if (comment.author_designer_id) {
                      const designer = teamData?.find(m => m.id === comment.author_designer_id);
                      if (designer) {
                          authorName = designer.full_name || designer.email;
                          authorAvatar = designer.avatar_url;
                      }
                  } else if (comment.author_contact_id) {
                      const contact = contactsData?.find(c => c.id === comment.author_contact_id);
                      if (contact) {
                          authorName = contact.full_name || contact.email;
                      }
                  }

                  return { ...comment, authorName, authorAvatar };
              });

              // Get creator - prioritize created_by_team_id, then fall back to created_by_id (client contact) or properties
              let creatorName = null;
              let creatorAvatar = null;

              if (t.created_by_team_id) {
                  // Team member created the task
                  const teamCreator = teamData?.find(m => m.id === t.created_by_team_id);
                  if (teamCreator) {
                      creatorName = teamCreator.full_name;
                      creatorAvatar = teamCreator.avatar_url;
                  }
              } else if (t.created_by_id) {
                  // Client contact created the task
                  const contactCreator = contactsData?.find(c => c.id === t.created_by_id);
                  if (contactCreator) {
                      creatorName = contactCreator.full_name;
                  }
              } else if (t.properties?.createdById) {
                  // Backwards compatibility with old property-based storage
                  const legacyCreator = teamData?.find(m => m.id === t.properties.createdById);
                  if (legacyCreator) {
                      creatorName = legacyCreator.full_name;
                      creatorAvatar = legacyCreator.avatar_url;
                  }
              }

              // Normalize status: Remove emojis and extra spaces
              let normalizedStatus = t.status || 'Backlog';
              if (normalizedStatus) {
                // Remove all emojis and trim
                normalizedStatus = normalizedStatus.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim();
              }

              return {
                  ...t,
                  creatorName,
                  creatorAvatar,
                  assigneeName: assignee ? assignee.full_name : null,
                  assigneeAvatar: assignee ? assignee.avatar_url : null,
                  clientName: client ? client.client_name : 'Internal',
                  clientStatus: client ? client.status : 'Active',
                  status: normalizedStatus,
                  comments: enrichedComments, // Use comments from comments table
                  commentCount: enrichedComments.length,
                  dueDate: t.delivered_at || t.properties?.dueDate
              };
          });
          setTasks(enrichedTasks);
      }
    } catch (error) { console.error('Data Fetch Error:', error.message); } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchData();
    const taskListener = supabase.channel('public:tasks').on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => fetchData()).subscribe();
    return () => { supabase.removeChannel(taskListener); };
  }, []);

  // ESC key handler for closing modals and returning to dashboard
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        if (isSearchOpen) {
          setIsSearchOpen(false);
        } else if (isNotificationsOpen) {
          setIsNotificationsOpen(false);
        } else if (isNewTaskModalOpen) {
          setIsNewTaskModalOpen(false);
        } else if (isNewClientModalOpen) {
          setIsNewClientModalOpen(false);
        } else if (mode === APP_MODES.SETTINGS) {
          setMode(APP_MODES.DASHBOARD);
        } else if (displayMenuOpen || filterMenuOpen) {
          setDisplayMenuOpen(false);
          setFilterMenuOpen(false);
        }
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isNewTaskModalOpen, isNewClientModalOpen, mode, displayMenuOpen, filterMenuOpen, isSearchOpen, isNotificationsOpen]);

  const processedTasks = useMemo(() => {
      let result = [...tasks];

      // Find the team member ID for the current user based on email
      const currentTeamMember = team.find(t => t.email === user?.email);
      const teamMemberId = currentTeamMember?.id;


      // CUSTOMER ROLE: Only show tasks for their client
      if (userRole === 'customer' && userMembership) {
        result = result.filter(t => t.membership_id === userMembership);
      }
      // TEAM ROLE: Apply filters as normal
      else if (userRole === 'team') {
        if (taskFilter === 'mine') {
          result = result.filter(t => t.assigned_to_id === teamMemberId);
        }
        else if (taskFilter === 'internal') result = result.filter(t => !t.membership_id);

        if (advancedFilters.assignee?.length > 0) result = result.filter(t => advancedFilters.assignee.includes(t.assigned_to_id));
        if (advancedFilters.client?.length > 0) result = result.filter(t => advancedFilters.client.includes(t.membership_id));
      }

      if (!displaySettings.showArchived) result = result.filter(t => !t.archived_at);
      if (!displaySettings.showInactive) result = result.filter(t => {
         if (!t.membership_id) return true;
         const status = (t.clientStatus || '').toLowerCase();
         return status.includes('en cours') || status.includes('start') || status.includes('active') ||
                status.includes('grow') || status.includes('boost') || status.includes('lite') ||
                status.includes('support');
      });

      result.sort((a, b) => {
          const dateA = new Date(a.updated_at || 0).getTime();
          const dateB = new Date(b.updated_at || 0).getTime();
          return displaySettings.orderBy === 'oldest' ? dateA - dateB : dateB - dateA;
      });
      return result;
  }, [tasks, taskFilter, displaySettings, advancedFilters, userRole, userMembership, user?.id, user?.email, team]);

  const updateLocalTask = (taskId, payload) => {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...payload } : t));
  };

  const handleAddTask = async (formData) => {
      console.log('[handleAddTask] formData received:', formData);
      console.log('[handleAddTask] formData.clientId:', formData.clientId);

      // Check task limit when creating as Active Task for a client
      if (formData.status === 'Active Task' && formData.clientId) {
          try {
              // First try the RPC check
              const { data: limitCheck, error } = await supabase.rpc('check_task_limit', {
                  p_membership_id: formData.clientId
              });

              console.log('[handleAddTask] check_task_limit result:', limitCheck, 'error:', error);

              if (!error && limitCheck && !limitCheck.can_activate) {
                  toast.error(`Task limit reached: ${limitCheck.current_active}/${limitCheck.max_tasks} active tasks for this client`);
                  return;
              }

              // Fallback: also check client-side count against plan limit
              const currentActiveCount = tasks.filter(t =>
                  t.membership_id === formData.clientId &&
                  t.status === 'Active Task' &&
                  !t.archived_at
              ).length;

              // Get the plan limit for this client
              const client = clients.find(c => c.id === formData.clientId);
              if (client?.plan_from_agreements) {
                  const { data: planData } = await supabase
                      .from('Plans')
                      .select('tasks_at_once')
                      .eq('whalesync_postgres_id', client.plan_from_agreements)
                      .single();

                  const maxTasks = planData?.tasks_at_once ? parseInt(planData.tasks_at_once) : null;
                  console.log('[handleAddTask] Client-side check: active=', currentActiveCount, 'max=', maxTasks);

                  if (maxTasks && currentActiveCount >= maxTasks) {
                      toast.error(`Task limit reached: ${currentActiveCount}/${maxTasks} active tasks for this client`);
                      return;
                  }
              }
          } catch (err) {
              console.error('Error checking task limit:', err);
              toast.error('Could not verify task limit. Please try again.');
              return;
          }
      }

      // Find the team member ID for the current user
      const currentTeamMember = team.find(t => t.email === user?.email);
      const teamMemberId = currentTeamMember?.id;

      const newTaskPayload = {
          title: formData.title,
          description: formData.description,
          content: formData.description,
          status: formData.status,
          assigned_to_id: formData.assigneeId || teamMemberId,
          created_by_team_id: formData.createdById || teamMemberId, // New field for team creators
          membership_id: formData.clientId,
          private: formData.isPrivate || false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          orchestra_task_id: `TASK-${Date.now()}`,
          properties: formData.type ? { type: formData.type, dueDate: formData.dueDate } : { dueDate: formData.dueDate }
      };
      console.log('[handleAddTask] newTaskPayload:', newTaskPayload);
      const { data, error } = await supabase.from('tasks').insert([newTaskPayload]).select();
      if (error) {
          console.error('Error creating task:', error);
          toast.error(`Error creating task: ${error.message}`);
      } else if (data) {
          const newTask = data[0];

          // If a design URL was provided, create version 1
          if (formData.designUrl && formData.designUrl.trim()) {
              const { error: versionError } = await createVersion(
                  newTask.id,
                  formData.designUrl.trim(),
                  'Version 1',
                  user?.id
              );

              if (versionError) {
                  console.error('Error creating version:', versionError);
                  toast.error('Task created but failed to create version');
              } else {
                  toast.success('Task created with version 1');
              }
          } else {
              toast.success('Task created successfully');
          }

          setIsNewTaskModalOpen(false);
          // Reload tasks to show the new task
          await fetchData();
      }
  };

  const handleUpdateTask = async (taskId, updates) => {
      // If only updating comments, skip database update (comments are in separate table)
      if (Object.keys(updates).length === 1 && updates.comments) {
          updateLocalTask(taskId, updates);
          return;
      }

      const payload = { ...updates, updated_at: new Date().toISOString() };
      const { error } = await supabase.from('tasks').update(payload).eq('id', taskId);
      if (!error) updateLocalTask(taskId, payload);
  };

  const handleDeleteTask = async (taskId) => {
      const confirmed = await confirm({
          title: 'Delete Task',
          message: 'Are you sure you want to delete this task?',
          confirmText: 'Delete',
          cancelText: 'Cancel',
          variant: 'danger'
      });

      if (!confirmed) return;

      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (!error) {
          setTasks(prev => prev.filter(t => t.id !== taskId));
      }
  };

  const openTaskDetails = (task) => {
      navigate(`/task/${task.id}`);
  };

  // --- HANDLER TO OPEN PORTAL ---
  const handleOpenPortal = (client) => {
      setPortalClient(client);
      setMode(APP_MODES.PORTAL);
  };

  // --- HANDLER FOR CLIENT INVITATION ---
  const handleInviteClient = (invitationData) => {
      console.log('Client invitation created:', invitationData);
      // TODO: Save to database when backend is ready
      toast.success(`Invitation sent to ${invitationData.clientEmail}`);
  };

  if (loading && user) return (
    <div className="h-screen w-screen bg-white dark:bg-[#0f0f0f] flex items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        {/* Minimalist spinner */}
        <div className="relative">
          <div className="w-12 h-12 border-2 border-neutral-200 dark:border-neutral-800 rounded-full"></div>
          <div className="w-12 h-12 border-2 border-neutral-900 dark:border-white border-t-transparent dark:border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
        </div>

        {/* Loading text and branding */}
        <div className="text-center flex flex-col items-center gap-3">
          
          <div className="flex flex-col items-center" style={{ gap: '10px' }}>
            <p
              className="text-neutral-300 dark:text-white tracking-[0.3em] uppercase leading-none"
              style={{
                fontWeight: 200,
                fontSize: '33px',
                letterSpacing: '0.3em'
              }}
            >
              Dafolle
            </p>
            <p
              className="text-neutral-300 dark:text-white tracking-[0.3em] uppercase leading-none"
              style={{
                fontWeight: 200,
                fontSize: '16px',
                letterSpacing: '0.3em'
              }}
            >
              Studio
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  // --- RENDER PORTAL MODE ---
  if (mode === APP_MODES.PORTAL) {
      return (
          <ClientPortal 
            client={portalClient} 
            onExit={() => { setMode(APP_MODES.DASHBOARD); setPortalClient(null); }} 
          />
      );
  }

  const activeFilterCount = (advancedFilters.assignee?.length || 0) + (advancedFilters.client?.length || 0);

  return (
    <ProtectedRoute>
    <div className="flex h-screen w-full bg-neutral-50 dark:bg-[#0f0f0f] font-sans text-neutral-800 dark:text-neutral-200 overflow-hidden theme-bg-primary" onClick={() => { setDisplayMenuOpen(false); setFilterMenuOpen(false); }}>
      {mode === APP_MODES.DASHBOARD ? (
        <DashboardSidebar
          currentView={dashboardView}
          setView={setDashboardView}
          setMode={setMode}
          clients={clients}
          activeClientId={advancedFilters.client?.[0] || null}
          onOpenSearch={() => setIsSearchOpen(true)}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          onClientClick={(clientId) => {
            setDashboardView(DASHBOARD_VIEWS.BOARD);
            // Toggle: if already selected, deselect
            if (advancedFilters.client?.[0] === clientId) {
              setAdvancedFilters({ ...advancedFilters, client: [] });
            } else {
              setAdvancedFilters({ ...advancedFilters, client: [clientId] });
            }
          }}
          onClearFilters={() => {
            setAdvancedFilters({ assignee: [], client: [] });
          }}
        />
      ) : (
        <SettingsSidebar currentView={settingsView} setView={setSettingsView} setMode={setMode} />
      )}
      <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#0f0f0f] theme-bg-secondary relative">
        {mode === APP_MODES.DASHBOARD && (
            <div className="h-14 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between px-6 bg-white dark:bg-[#0f0f0f] theme-bg-primary shrink-0">
              <div className="flex items-center gap-4">
                  {dashboardView === DASHBOARD_VIEWS.BOARD ? (
                      <>
                        {userRole === 'team' && (
                          <div className="flex bg-neutral-100 dark:bg-neutral-900 rounded-lg p-1 text-xs font-medium">
                            <button onClick={() => setTaskFilter('all')} className={`px-3 py-1 rounded-md transition-all ${taskFilter === 'all' ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'}`}>All tasks</button>
                            <button onClick={() => setTaskFilter('mine')} className={`px-3 py-1 rounded-md transition-all ${taskFilter === 'mine' ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'}`}>For me</button>
                            <button onClick={() => setTaskFilter('internal')} className={`px-3 py-1 rounded-md transition-all ${taskFilter === 'internal' ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'}`}>Internal</button>
                          </div>
                        )}
                        {userRole === 'customer' && (
                          <h1 className="text-lg font-medium text-neutral-900 dark:text-white">Your Tasks</h1>
                        )}
                      </>
                  ) : <h1 className="text-lg font-medium text-neutral-900 dark:text-white capitalize">{dashboardView}</h1>}
              </div>
              <div className="flex items-center gap-4">
                  {userRole === 'team' && dashboardView === DASHBOARD_VIEWS.CUSTOMERS && (
                    <button
                      onClick={() => setIsNewClientModalOpen(true)}
                      className="flex items-center gap-2 text-xs font-medium bg-neutral-200 dark:bg-white/10 hover:bg-neutral-300 dark:hover:bg-white/20 text-neutral-700 dark:text-white px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Plus size={12} /> Invite Client
                    </button>
                  )}
                  <div className="flex bg-neutral-100 dark:bg-neutral-900 rounded-lg p-1 text-xs font-medium">
                    <div className="relative" onClick={e => e.stopPropagation()}>
                      <button onClick={() => { setFilterMenuOpen(!filterMenuOpen); setDisplayMenuOpen(false); }} className={`flex items-center gap-2 px-3 py-1 rounded-md transition-all ${filterMenuOpen ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'}`}>
                        <Filter size={12} /> Filters {activeFilterCount > 0 && <span className="bg-neutral-900 dark:bg-white/20 text-white w-4 h-4 rounded-full flex items-center justify-center text-[9px]">{activeFilterCount}</span>}
                      </button>
                      {filterMenuOpen && <FilterMenu filters={advancedFilters} onUpdate={setAdvancedFilters} team={team} clients={clients} onClose={() => setFilterMenuOpen(false)} />}
                    </div>
                    <div className="relative" onClick={e => e.stopPropagation()}>
                      <button onClick={() => { setDisplayMenuOpen(!displayMenuOpen); setFilterMenuOpen(false); }} className={`flex items-center gap-2 px-3 py-1 rounded-md transition-all ${displayMenuOpen ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'}`}>
                        <Settings size={12} /> Display
                      </button>
                      {displayMenuOpen && <DisplayMenu settings={displaySettings} onUpdate={setDisplaySettings} onClose={() => setDisplayMenuOpen(false)} />}
                    </div>
                  </div>
                  <div className="w-px h-6 bg-neutral-200 dark:bg-neutral-800 mx-2"></div>
                  <button onClick={() => { setNewTaskStatus('Backlog'); setIsNewTaskModalOpen(true); }} className="bg-neutral-200 dark:bg-white/10 hover:bg-neutral-300 dark:hover:bg-white/20 text-neutral-700 dark:text-white rounded-full p-2 transition-all active:scale-95"><Plus size={16} /></button>
              </div>
            </div>
        )}

        <div className="flex-1 overflow-hidden relative flex flex-col">
          {mode === APP_MODES.DASHBOARD && (
              <div key={dashboardView} className="flex-1 flex flex-col overflow-hidden animate-view-enter">
                {dashboardView === DASHBOARD_VIEWS.BOARD && (
                  <>
                      {displaySettings.view === 'kanban' ? (
                          <KanbanBoard tasks={processedTasks} displaySettings={displaySettings} setActiveTask={openTaskDetails} onOpenNewTask={(status) => { setNewTaskStatus(status); setIsNewTaskModalOpen(true); }} onDeleteTask={handleDeleteTask} onUpdateTask={handleUpdateTask} advancedFilters={advancedFilters} clients={clients} />
                      ) : (
                          <ListView tasks={processedTasks} displaySettings={displaySettings} setActiveTask={openTaskDetails} />
                      )}
                  </>
                )}
                {dashboardView === DASHBOARD_VIEWS.CUSTOMERS && (
                    <CustomersView
                        agreements={agreements}
                        onOpenPortal={handleOpenPortal}
                    />
                )}
                {dashboardView === DASHBOARD_VIEWS.CYCLES && <CyclesView />}
                {dashboardView === DASHBOARD_VIEWS.ANALYTICS && <AnalyticsView tasks={processedTasks} clients={clients} team={team} />}
                {dashboardView === DASHBOARD_VIEWS.PAYMENTS && <PaymentsView />}
              </div>
          )}
          {mode === APP_MODES.SETTINGS && (
              <div key={settingsView} className="h-full overflow-y-auto custom-scrollbar animate-view-enter">
                  {settingsView === SETTINGS_VIEWS.PROFILE && <ProfileSettingsView />}
                  {settingsView === SETTINGS_VIEWS.AGENCY && <AgencySettingsView />}
                  {settingsView === SETTINGS_VIEWS.TEAM && <TeamSettingsView team={team} />}
                  {settingsView === SETTINGS_VIEWS.WORKFLOW && <WorkflowSettingsView />}
                  {settingsView === SETTINGS_VIEWS.PLANS && <PlansSettingsView />}
                  {settingsView === SETTINGS_VIEWS.PORTAL && <ClientPortalSettingsView />}
                  {settingsView === SETTINGS_VIEWS.TEMPLATES && <TemplatesView />}
              </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <NewTaskModal isOpen={isNewTaskModalOpen} onClose={() => setIsNewTaskModalOpen(false)} onAddTask={handleAddTask} clients={clients} team={team} initialStatus={newTaskStatus} currentUser={user} />
      <NewClientModal isOpen={isNewClientModalOpen} onClose={() => setIsNewClientModalOpen(false)} onInvite={handleInviteClient} />
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} tasks={tasks} onSelectTask={openTaskDetails} />

      {/* Notifications Dropdown */}
      {isNotificationsOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsNotificationsOpen(false)} />
          <div className="fixed top-4 right-4 w-96 bg-white dark:bg-[#0f0f0f] border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-2xl z-50 animate-scale-in">
            <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <h3 className="text-neutral-900 dark:text-white font-bold text-sm">Notifications</h3>
              <button onClick={() => setIsNotificationsOpen(false)} className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white">
                <X size={16} />
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto custom-scrollbar">
              <div className="p-6 text-center text-neutral-600">
                <Bell size={48} className="mx-auto mb-4 opacity-20" />
                <p className="text-sm">No new notifications</p>
                <p className="text-xs mt-2 text-neutral-700">You're all caught up!</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
    </ProtectedRoute>
  );
}