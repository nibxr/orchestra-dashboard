import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { Filter, Settings, Plus, Columns, AlignJustify, ToggleRight } from 'lucide-react';

import { APP_ID, APP_MODES, DASHBOARD_VIEWS, SETTINGS_VIEWS, STATUS_CONFIG } from './utils/constants';
import { DashboardSidebar, SettingsSidebar } from './components/Sidebars';
import { KanbanBoard } from './components/KanbanBoard';
import { AnalyticsView, PaymentsView, CustomersView } from './components/DashboardViews';
import { AgencySettingsView, TeamSettingsView, WorkflowSettingsView, TemplatesView } from './components/SettingsViews';
import { NewTaskModal } from './components/NewTaskModal';
import { TaskDetails } from './components/TaskDetails';
import { DisplayMenu, FilterMenu } from './components/Menus';

export default function App() {
  const [user, setUser] = useState(null); 
  const [mode, setMode] = useState(APP_MODES.DASHBOARD);
  const [dashboardView, setDashboardView] = useState(DASHBOARD_VIEWS.BOARD);
  const [settingsView, setSettingsView] = useState(SETTINGS_VIEWS.AGENCY);
  
  const [tasks, setTasks] = useState([]);
  const [clients, setClients] = useState([]);
  const [team, setTeam] = useState([]);
  
  const [activeTask, setActiveTask] = useState(null); 
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [newTaskStatus, setNewTaskStatus] = useState('Backlog');
  const [loading, setLoading] = useState(true);
  
  const [displayMenuOpen, setDisplayMenuOpen] = useState(false);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [displaySettings, setDisplaySettings] = useState({
      view: 'kanban',
      orderBy: 'oldest',
      showArchived: false,
      showInactive: false,
      showSubtasks: false,
      visibleProperties: [] 
  });
  const [taskFilter, setTaskFilter] = useState('all');

  // --- Robust Data Fetching ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Fetch Team
        const { data: teamData, error: teamError } = await supabase.from('team').select('*');
        if (teamError) throw teamError;
        setTeam(teamData || []);

        // 2. Fetch Clients (client_memberships)
        const { data: clientsData, error: clientError } = await supabase.from('client_memberships').select('*');
        if (clientError) throw clientError;
        setClients(clientsData || []);

        // 3. Fetch Tasks
        const { data: tasksData, error: taskError } = await supabase.from('tasks').select('*');
        if (taskError) throw taskError;
        
        if (tasksData) {
            // JOIN LOGIC: Using exact column names from your CSVs
            const enrichedTasks = tasksData.map(t => {
                // Find assignee by ID (assigned_to_id -> team.id)
                const assignee = teamData?.find(m => m.id === t.assigned_to_id);
                
                // Find client by ID (membership_id -> client_memberships.id)
                const client = clientsData?.find(c => c.id === t.membership_id);

                // Normalize status: Check for the emoji prefix or exact string
                let normalizedStatus = t.status;
                if (t.status === "Active Task" || t.status === "🔥 Active Task") normalizedStatus = "Active Task";
                if (t.status === "To Review") normalizedStatus = "To Review";

                return {
                    ...t,
                    // Enriched fields for UI
                    assigneeName: assignee ? assignee.full_name : null,
                    assigneeAvatar: assignee ? assignee.avatar_url : null,
                    clientName: client ? client.client_name : 'Internal', // Fallback to Internal if no client match
                    status: normalizedStatus
                };
            });
            setTasks(enrichedTasks);
        }

      } catch (error) {
        console.error('Data Fetch Error:', error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const taskListener = supabase
      .channel('public:tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(taskListener);
    };
  }, []);

  const processedTasks = useMemo(() => {
      let result = [...tasks];

      if (taskFilter === 'mine') {
          result = result.filter(t => t.assigned_to_id); 
      } else if (taskFilter === 'internal') {
          // Filter logic: tasks without a membership_id are Internal
          result = result.filter(t => !t.membership_id);
      }

      result.sort((a, b) => {
          const dateA = new Date(a.created_at || 0).getTime();
          const dateB = new Date(b.created_at || 0).getTime();
          return displaySettings.orderBy === 'newest' ? dateB - dateA : dateA - dateB;
      });

      return result;
  }, [tasks, taskFilter, displaySettings.orderBy]);

  const handleAddTask = async (formData) => {
    try {
        const newTaskPayload = {
            title: formData.title,
            description: formData.description, 
            status: formData.status || 'Backlog',
            membership_id: formData.clientId || null, 
            assigned_to_id: formData.assigneeId || null,
            created_at: new Date().toISOString(),
            orchestra_task_id: `TASK-${Date.now()}`, 
        };

        const { error } = await supabase.from('tasks').insert([newTaskPayload]);
        if (error) throw error;
        setIsNewTaskModalOpen(false);
    } catch (error) {
        console.error("Failed to create task:", error.message);
    }
  };

  const handleUpdateTask = async (taskId, updates) => {
      try {
          const { error } = await supabase.from('tasks').update(updates).eq('id', taskId);
          if (error) throw error;
          setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
          if (activeTask && activeTask.id === taskId) setActiveTask(prev => ({ ...prev, ...updates }));
      } catch (error) {
          console.error("Update failed:", error);
      }
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
      
      // Fetch Comments
      const { data: commentsData, error } = await supabase
        .from('comments')
        .select('*')
        .eq('task_id', task.id)
        .order('created_at', { ascending: true });

      if (!error && commentsData) {
          const enrichedComments = commentsData.map(c => {
              let authorName = 'Unknown';
              let authorAvatar = null;

              if (c.author_designer_id) {
                  const designer = team.find(t => t.id === c.author_designer_id);
                  if (designer) {
                      authorName = designer.full_name;
                      authorAvatar = designer.avatar_url;
                  }
              } 
              
              return { ...c, authorName, authorAvatar };
          });
          
          setActiveTask(prev => ({ ...prev, comments: enrichedComments }));
      }
  };

  const handleOpenNewTask = (status = 'Backlog') => {
      setNewTaskStatus(status);
      setIsNewTaskModalOpen(true);
  };

  if (loading) return <div className="h-screen w-screen bg-[#0f0f0f] flex items-center justify-center text-neutral-500">Loading Orchestra...</div>;

  return (
    <div className="flex h-screen w-full bg-[#0f0f0f] font-sans text-neutral-200 overflow-hidden selection:bg-neutral-700 selection:text-white" 
         onClick={() => { setDisplayMenuOpen(false); setFilterMenuOpen(false); }}>
      
      {mode === APP_MODES.DASHBOARD 
        ? <DashboardSidebar currentView={dashboardView} setView={setDashboardView} setMode={setMode} clients={clients} />
        : <SettingsSidebar currentView={settingsView} setView={setSettingsView} setMode={setMode} />
      }
      
      <div className="flex-1 flex flex-col min-w-0 bg-black relative">
        {/* Header */}
        {mode === APP_MODES.DASHBOARD && (
            <div className="h-14 border-b border-neutral-800 flex items-center justify-between px-6 bg-[#0f0f0f] shrink-0">
              <div className="flex items-center gap-4">
                  {dashboardView === DASHBOARD_VIEWS.BOARD ? (
                      <div className="flex bg-neutral-900 rounded-lg p-1 text-xs font-medium">
                          <button onClick={() => setTaskFilter('all')} className={`px-3 py-1 rounded-md transition-all ${taskFilter === 'all' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-500 hover:text-white'}`}>All tasks</button>
                          <button onClick={() => setTaskFilter('mine')} className={`px-3 py-1 rounded-md transition-all ${taskFilter === 'mine' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-500 hover:text-white'}`}>For me</button>
                          <button onClick={() => setTaskFilter('internal')} className={`px-3 py-1 rounded-md transition-all ${taskFilter === 'internal' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-500 hover:text-white'}`}>Internal</button>
                      </div>
                  ) : <h1 className="text-lg font-medium text-white capitalize">{dashboardView}</h1>}
              </div>
              
              <div className="flex items-center gap-4">
                  <div className="relative" onClick={e => e.stopPropagation()}>
                      <button onClick={() => { setFilterMenuOpen(!filterMenuOpen); setDisplayMenuOpen(false); }} className="flex items-center gap-2 text-xs border border-neutral-800 px-3 py-1.5 rounded-lg text-neutral-400 hover:text-white"><Filter size={12} /> Filters</button>
                      {filterMenuOpen && <FilterMenu onUpdate={() => {}} onClose={() => setFilterMenuOpen(false)} />}
                  </div>
                  <div className="relative" onClick={e => e.stopPropagation()}>
                    <button onClick={() => { setDisplayMenuOpen(!displayMenuOpen); setFilterMenuOpen(false); }} className="flex items-center gap-2 text-xs border border-neutral-800 px-3 py-1.5 rounded-lg text-neutral-400 hover:text-white"><Settings size={12} /> Display</button>
                    {displayMenuOpen && <DisplayMenu settings={displaySettings} onUpdate={setDisplaySettings} onClose={() => setDisplayMenuOpen(false)} />}
                  </div>
                  <div className="w-px h-6 bg-neutral-800 mx-2"></div>
                  <button onClick={() => { setNewTaskStatus('Backlog'); setIsNewTaskModalOpen(true); }} className="bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-all active:scale-95"><Plus size={16} /></button>
              </div>
            </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-hidden relative">
          {mode === APP_MODES.DASHBOARD && (
              <>
                {dashboardView === DASHBOARD_VIEWS.BOARD && (
                  <KanbanBoard 
                    tasks={processedTasks} 
                    setActiveTask={openTaskDetails} 
                    onOpenNewTask={(status) => { setNewTaskStatus(status); setIsNewTaskModalOpen(true); }} 
                    onDeleteTask={handleDeleteTask} 
                  />
                )}
                {dashboardView === DASHBOARD_VIEWS.CUSTOMERS && <CustomersView clients={clients} />}
                {dashboardView === DASHBOARD_VIEWS.ANALYTICS && <AnalyticsView />}
                {dashboardView === DASHBOARD_VIEWS.PAYMENTS && <PaymentsView />}
              </>
          )}
          {mode === APP_MODES.SETTINGS && (
              <div className="h-full overflow-y-auto custom-scrollbar">
                  {settingsView === SETTINGS_VIEWS.AGENCY && <AgencySettingsView />}
                  {settingsView === SETTINGS_VIEWS.TEAM && <TeamSettingsView />}
                  {settingsView === SETTINGS_VIEWS.WORKFLOW && <WorkflowSettingsView />}
                  {settingsView === SETTINGS_VIEWS.TEMPLATES && <TemplatesView />}
              </div>
          )}
        </div>
      </div>

      <NewTaskModal 
        isOpen={isNewTaskModalOpen} 
        onClose={() => setIsNewTaskModalOpen(false)} 
        onAddTask={handleAddTask} 
        clients={clients}
        team={team}
        initialStatus={newTaskStatus}
      />

      {activeTask && (
        <TaskDetails 
          task={activeTask} 
          onClose={() => setActiveTask(null)} 
          onUpdate={handleUpdateTask}
          team={team} 
        />
      )}
    </div>
  );
}