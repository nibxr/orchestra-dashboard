import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { Filter, Settings, Plus } from 'lucide-react';

import { APP_ID, APP_MODES, DASHBOARD_VIEWS, SETTINGS_VIEWS } from './utils/constants';
import { DashboardSidebar, SettingsSidebar } from './components/Sidebars';
import { KanbanBoard } from './components/KanbanBoard';
import { ListView } from './components/ListView';
import { ClientPortal } from './components/ClientPortal'; // IMPORT PORTAL
import { AnalyticsView, PaymentsView, CustomersView } from './components/DashboardViews';
import { AgencySettingsView, TeamSettingsView, WorkflowSettingsView, TemplatesView, ClientPortalSettingsView, PlansSettingsView } from './components/SettingsViews';
import { NewTaskModal } from './components/NewTaskModal';
import { TaskDetails } from './components/TaskDetails';
import { DisplayMenu, FilterMenu } from './components/Menus';

export default function App() {
  const [mode, setMode] = useState(APP_MODES.DASHBOARD);
  const [dashboardView, setDashboardView] = useState(DASHBOARD_VIEWS.BOARD);
  const [settingsView, setSettingsView] = useState(SETTINGS_VIEWS.AGENCY);
  
  const [tasks, setTasks] = useState([]);
  const [clients, setClients] = useState([]);
  const [team, setTeam] = useState([]);
  const [contacts, setContacts] = useState([]); 
  
  const [activeTask, setActiveTask] = useState(null); 
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [newTaskStatus, setNewTaskStatus] = useState('Backlog');
  const [loading, setLoading] = useState(true);
  
  // Portal State
  const [portalClient, setPortalClient] = useState(null);

  const [displayMenuOpen, setDisplayMenuOpen] = useState(false);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  
  const [displaySettings, setDisplaySettings] = useState({ view: 'kanban', orderBy: 'last_updated', showArchived: false, showInactive: false, visibleProperties: ['client', 'assignee', 'dueDate', 'id'] });
  const [taskFilter, setTaskFilter] = useState('all'); 
  const [advancedFilters, setAdvancedFilters] = useState({ assignee: [], client: [] }); 

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: teamData } = await supabase.from('team').select('*');
        setTeam(teamData || []);
        const { data: clientsData } = await supabase.from('client_memberships').select('*');
        setClients(clientsData || []);
        const { data: contactsData } = await supabase.from('client_contacts').select('*');
        setContacts(contactsData || []);
        const { data: tasksData } = await supabase.from('tasks').select('*');
        const { data: commentsData } = await supabase.from('comments').select('id, task_id');
        
        if (tasksData) {
            const enrichedTasks = tasksData.map(t => {
                const assignee = teamData?.find(m => m.id === t.assigned_to_id);
                const client = clientsData?.find(c => c.id === t.membership_id);
                const taskCommentCount = commentsData ? commentsData.filter(c => c.task_id === t.id).length : 0;
                return {
                    ...t,
                    assigneeName: assignee ? assignee.full_name : null,
                    assigneeAvatar: assignee ? assignee.avatar_url : null,
                    clientName: client ? client.client_name : 'Internal', 
                    clientStatus: client ? client.status : 'Active', 
                    status: t.status === "Active Task" || t.status === "🔥 Active Task" ? "Active Task" : t.status,
                    commentCount: taskCommentCount,
                    dueDate: t.delivered_at || t.due_date
                };
            });
            setTasks(enrichedTasks);
        }
      } catch (error) { console.error('Data Fetch Error:', error.message); } finally { setLoading(false); }
    };

    fetchData();
    const taskListener = supabase.channel('public:tasks').on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => fetchData()).subscribe();
    return () => { supabase.removeChannel(taskListener); };
  }, []);

  const processedTasks = useMemo(() => {
      let result = [...tasks];
      if (taskFilter === 'mine') result = result.filter(t => t.assigned_to_id); 
      else if (taskFilter === 'internal') result = result.filter(t => !t.membership_id);

      if (advancedFilters.assignee?.length > 0) result = result.filter(t => advancedFilters.assignee.includes(t.assigned_to_id));
      if (advancedFilters.client?.length > 0) result = result.filter(t => advancedFilters.client.includes(t.membership_id));

      if (!displaySettings.showArchived) result = result.filter(t => !t.archived_at);
      if (!displaySettings.showInactive) result = result.filter(t => {
         if (!t.membership_id) return true;
         const status = (t.clientStatus || '').toLowerCase();
         return status.includes('en cours') || status.includes('start') || status.includes('active');
      });

      result.sort((a, b) => {
          const dateA = new Date(a.updated_at || 0).getTime();
          const dateB = new Date(b.updated_at || 0).getTime();
          return displaySettings.orderBy === 'oldest' ? dateA - dateB : dateB - dateA;
      });
      return result;
  }, [tasks, taskFilter, displaySettings, advancedFilters]);

  const updateLocalTask = (taskId, payload) => {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...payload } : t));
      if (activeTask && activeTask.id === taskId) setActiveTask(prev => ({ ...prev, ...payload }));
  };

  const handleAddTask = async (formData) => {
      const newTaskPayload = { ...formData, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), orchestra_task_id: `TASK-${Date.now()}` };
      const { data, error } = await supabase.from('tasks').insert([newTaskPayload]).select();
      if (!error && data) setIsNewTaskModalOpen(false);
  };

  const handleUpdateTask = async (taskId, updates) => {
      const payload = { ...updates, updated_at: new Date().toISOString() };
      const { error } = await supabase.from('tasks').update(payload).eq('id', taskId);
      if (!error) updateLocalTask(taskId, payload);
  };

  const handleDeleteTask = async (taskId) => {
      if (!confirm("Are you sure?")) return;
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (!error) {
          setTasks(prev => prev.filter(t => t.id !== taskId));
          if (activeTask?.id === taskId) setActiveTask(null);
      }
  };

  const openTaskDetails = async (task) => {
      setActiveTask(task);
      const { data: commentsData } = await supabase.from('comments').select('*').eq('task_id', task.id).order('created_at', { ascending: true });
      if (commentsData) {
          const enrichedComments = commentsData.map(c => {
              let authorName = 'Unknown', authorAvatar = null;
              if (c.author_designer_id) {
                  const designer = team.find(t => t.id === c.author_designer_id);
                  if (designer) { authorName = designer.full_name; authorAvatar = designer.avatar_url; }
              } else if (c.author_contact_id) {
                  const contact = contacts.find(ct => ct.id === c.author_contact_id);
                  if (contact) authorName = contact.full_name;
              }
              return { ...c, authorName, authorAvatar };
          });
          setActiveTask(prev => ({ ...prev, comments: enrichedComments }));
      }
  };

  // --- HANDLER TO OPEN PORTAL ---
  const handleOpenPortal = (client) => {
      setPortalClient(client);
      setMode(APP_MODES.PORTAL);
  };

  if (loading) return <div className="h-screen w-screen bg-[#0f0f0f] flex items-center justify-center text-neutral-500">Loading Orchestra...</div>;

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
    <div className="flex h-screen w-full bg-[#0f0f0f] font-sans text-neutral-200 overflow-hidden" onClick={() => { setDisplayMenuOpen(false); setFilterMenuOpen(false); }}>
      {mode === APP_MODES.DASHBOARD ? <DashboardSidebar currentView={dashboardView} setView={setDashboardView} setMode={setMode} clients={clients} /> : <SettingsSidebar currentView={settingsView} setView={setSettingsView} setMode={setMode} />}
      <div className="flex-1 flex flex-col min-w-0 bg-black relative">
        {mode === APP_MODES.DASHBOARD && (
            <div className="h-14 border-b border-neutral-800 flex items-center justify-between px-6 bg-[#0f0f0f] shrink-0">
              <div className="flex items-center gap-4">
                  {dashboardView === DASHBOARD_VIEWS.BOARD ? (
                      <div className="flex bg-neutral-900 rounded-lg p-1 text-xs font-medium">
                          <button onClick={() => setTaskFilter('all')} className={`px-3 py-1 rounded-md transition-all ${taskFilter === 'all' ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-white'}`}>All tasks</button>
                          <button onClick={() => setTaskFilter('mine')} className={`px-3 py-1 rounded-md transition-all ${taskFilter === 'mine' ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-white'}`}>For me</button>
                          <button onClick={() => setTaskFilter('internal')} className={`px-3 py-1 rounded-md transition-all ${taskFilter === 'internal' ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-white'}`}>Internal</button>
                      </div>
                  ) : <h1 className="text-lg font-medium text-white capitalize">{dashboardView}</h1>}
              </div>
              <div className="flex items-center gap-4">
                  <div className="relative" onClick={e => e.stopPropagation()}>
                      <button onClick={() => { setFilterMenuOpen(!filterMenuOpen); setDisplayMenuOpen(false); }} className={`flex items-center gap-2 text-xs border px-3 py-1.5 rounded-lg transition-colors ${filterMenuOpen ? 'bg-neutral-800 border-neutral-600 text-white' : 'border-neutral-800 text-neutral-400 hover:text-white'}`}>
                        <Filter size={12} /> Filters {activeFilterCount > 0 && <span className="bg-blue-600 text-white w-4 h-4 rounded-full flex items-center justify-center text-[9px]">{activeFilterCount}</span>}
                      </button>
                      {filterMenuOpen && <FilterMenu filters={advancedFilters} onUpdate={setAdvancedFilters} team={team} clients={clients} onClose={() => setFilterMenuOpen(false)} />}
                  </div>
                  <div className="relative" onClick={e => e.stopPropagation()}>
                    <button onClick={() => { setDisplayMenuOpen(!displayMenuOpen); setFilterMenuOpen(false); }} className={`flex items-center gap-2 text-xs border px-3 py-1.5 rounded-lg transition-colors ${displayMenuOpen ? 'bg-neutral-800 border-neutral-600 text-white' : 'border-neutral-800 text-neutral-400 hover:text-white'}`}>
                        <Settings size={12} /> Display
                    </button>
                    {displayMenuOpen && <DisplayMenu settings={displaySettings} onUpdate={setDisplaySettings} onClose={() => setDisplayMenuOpen(false)} />}
                  </div>
                  <div className="w-px h-6 bg-neutral-800 mx-2"></div>
                  <button onClick={() => { setNewTaskStatus('Backlog'); setIsNewTaskModalOpen(true); }} className="bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-all active:scale-95"><Plus size={16} /></button>
              </div>
            </div>
        )}

        <div className="flex-1 overflow-hidden relative flex flex-col">
          {mode === APP_MODES.DASHBOARD && (
              <>
                {dashboardView === DASHBOARD_VIEWS.BOARD && (
                  <>
                      {displaySettings.view === 'kanban' ? (
                          <KanbanBoard tasks={processedTasks} displaySettings={displaySettings} setActiveTask={openTaskDetails} onOpenNewTask={(status) => { setNewTaskStatus(status); setIsNewTaskModalOpen(true); }} onDeleteTask={handleDeleteTask} />
                      ) : (
                          <ListView tasks={processedTasks} displaySettings={displaySettings} setActiveTask={openTaskDetails} />
                      )}
                  </>
                )}
                {dashboardView === DASHBOARD_VIEWS.CUSTOMERS && (
                    <CustomersView 
                        clients={clients} 
                        onOpenPortal={handleOpenPortal} // Pass the handler
                    />
                )}
                {dashboardView === DASHBOARD_VIEWS.ANALYTICS && <AnalyticsView />}
                {dashboardView === DASHBOARD_VIEWS.PAYMENTS && <PaymentsView />}
              </>
          )}
          {mode === APP_MODES.SETTINGS && (
              <div className="h-full overflow-y-auto custom-scrollbar">
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
      <NewTaskModal isOpen={isNewTaskModalOpen} onClose={() => setIsNewTaskModalOpen(false)} onAddTask={handleAddTask} clients={clients} team={team} initialStatus={newTaskStatus} />
      {activeTask && <TaskDetails task={activeTask} onClose={() => setActiveTask(null)} onUpdate={handleUpdateTask} team={team} />}
    </div>
  );
}