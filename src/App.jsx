import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { Icon } from './components/Icon';

import { APP_ID, APP_MODES, DASHBOARD_VIEWS, SETTINGS_VIEWS } from './utils/constants';
import { DashboardSidebar, SettingsSidebar } from './components/Sidebars';
import { KanbanBoard } from './components/KanbanBoard';
import { ListView } from './components/ListView';
import { ClientPortal } from './components/ClientPortal'; // IMPORT PORTAL
import { AnalyticsView, PaymentsView, CustomersView } from './components/DashboardViews';
import { CyclesView } from './components/CyclesView';
import { ProfileSettingsView, AgencySettingsView, TeamSettingsView, WorkflowSettingsView, TemplatesView, ClientPortalSettingsView, PlansSettingsView, ClientTeamSettingsView } from './components/SettingsViews';
import { ClientPlansView, ClientDocumentsView, ClientDeliverablesView } from './components/ClientViews';
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
  const { user, userRole, userMembership, clientContactId, teamMemberId, teamMemberRole, planLimits } = useAuth();
  const isAdmin = userRole === 'team' && teamMemberRole === 'admin';
  const { confirm } = useConfirm();
  const toast = useToast();
  const navigate = useNavigate();
  const [mode, setMode] = useState(APP_MODES.DASHBOARD);
  const [dashboardView, setDashboardView] = useState(DASHBOARD_VIEWS.BOARD);
  const [settingsView, setSettingsView] = useState(userRole === 'customer' ? SETTINGS_VIEWS.PROFILE : SETTINGS_VIEWS.AGENCY);
  
  const [tasks, setTasks] = useState([]);
  const [clients, setClients] = useState([]);
  const [agreements, setAgreements] = useState([]);
  const [team, setTeam] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [availablePlans, setAvailablePlans] = useState([]);

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

  // --- Draggable sidebar resize ---
  const SIDEBAR_MIN = 200;
  const SIDEBAR_MAX = 620;
  const SIDEBAR_DEFAULT = 256;
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('sidebar-width');
    return saved ? Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, Number(saved))) : SIDEBAR_DEFAULT;
  });
  const [isDraggingSidebar, setIsDraggingSidebar] = useState(false);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(SIDEBAR_DEFAULT);

  const handleResizeStart = useCallback((e) => {
    e.preventDefault();
    isDraggingRef.current = true;
    setIsDraggingSidebar(true);
    startXRef.current = e.clientX;
    startWidthRef.current = sidebarWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [sidebarWidth]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDraggingRef.current) return;
      const delta = e.clientX - startXRef.current;
      const newWidth = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, startWidthRef.current + delta));
      setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      setIsDraggingSidebar(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      // Persist to localStorage
      setSidebarWidth(w => { localStorage.setItem('sidebar-width', w); return w; });
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: teamData } = await supabase.from('team').select('*');
      setTeam(teamData || []);
      const { data: clientsData } = await supabase.from('client_memberships').select('*');
      setClients(clientsData || []);

      // Fetch agreements and plans for the Customers view
      const { data: agreementsData } = await supabase.from('Agreements').select('*');
      // Fetch plans with price data for MRR
      const { data: plansData } = await supabase.from('Plans').select('whalesync_postgres_id, plan_name, monthly_price_ht');

      const enrichedAgreements = (agreementsData || []).map(a => {
        const membership = (clientsData || []).find(c => c.id === a.client_memberships);
        const plan = a.plans ? (plansData || []).find(p => p.whalesync_postgres_id === a.plans) : null;
        return {
          ...a,
          client_name: membership?.client_name || 'Unknown',
          membership_id: a.client_memberships,
          plan_name: plan?.plan_name || null,
          // Fallback: use plan's monthly_price_ht if custom_price_ht is not set
          custom_price_ht: a.custom_price_ht || plan?.monthly_price_ht || null,
        };
      });

      // Also include memberships that DON'T have an Agreement record (e.g., newly invited clients)
      const agreementMembershipIds = new Set(enrichedAgreements.map(a => a.client_memberships).filter(Boolean));
      const orphanMemberships = (clientsData || [])
        .filter(m => !agreementMembershipIds.has(m.id))
        .map(m => {
          const plan = m.plan_from_agreements ? (plansData || []).find(p => p.whalesync_postgres_id === m.plan_from_agreements) : null;
          return {
            whalesync_postgres_id: m.id,
            client_memberships: m.id,
            client_name: m.client_name || 'Unknown',
            membership_id: m.id,
            plan_name: plan?.plan_name || null,
            status: m.status || 'Pending',
            custom_price_ht: plan?.monthly_price_ht || (m.monthly_amount_cents ? m.monthly_amount_cents / 100 : null),
            start_date: m.start_date || m.created_at,
          };
        });

      setAgreements([...enrichedAgreements, ...orphanMemberships]);
      // Fetch full plans data for client views
      const { data: allPlansData } = await supabase.from('Plans').select('*');
      setAvailablePlans(allPlansData || []);

      const { data: contactsData } = await supabase.from('client_contacts').select('*');
      setContacts(contactsData || []);
      const { data: tasksData } = await supabase.from('tasks').select('*');
      // Fetch only task-level comments (where version_id is null) for the normal task view
      const { data: commentsData } = await supabase.from('comments').select('*').is('version_id', null);
      // Fetch latest version number per task for kanban display
      const { data: versionsData } = await supabase.from('task_versions').select('task_id, version_number').is('archived_at', null).order('version_number', { ascending: false });

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
                      const contact = contactsData?.find(c => c.id === comment.author_contact_id)
                          || contactsData?.find(c => c.whalesync_postgres_id === comment.author_contact_id);
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
                  const contactCreator = contactsData?.find(c => c.id === t.created_by_id)
                      || contactsData?.find(c => c.whalesync_postgres_id === t.created_by_id);
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

              // Get helper
              const helper = teamData?.find(m => m.id === t.helper_id);

              // Get co-creator
              const coCreator = teamData?.find(m => m.id === t.co_creator_team_id);

              // Normalize status: Remove emojis and extra spaces
              let normalizedStatus = t.status || 'Backlog';
              if (normalizedStatus) {
                // Remove all emojis and trim
                normalizedStatus = normalizedStatus.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim();
              }

              // Get latest version number for this task
              const taskVersion = versionsData?.find(v => v.task_id === t.id);
              const latestVersionNumber = taskVersion ? taskVersion.version_number : null;

              // Get client's plan name
              let clientPlanName = null;
              if (client?.plan_from_agreements) {
                const plan = (plansData || []).find(p => p.whalesync_postgres_id === client.plan_from_agreements);
                clientPlanName = plan?.plan_name || null;
              }

              return {
                  ...t,
                  creatorName,
                  creatorAvatar,
                  assigneeName: assignee ? assignee.full_name : null,
                  assigneeAvatar: assignee ? assignee.avatar_url : null,
                  helperName: helper ? helper.full_name : null,
                  helperAvatar: helper ? helper.avatar_url : null,
                  coCreatorName: coCreator ? coCreator.full_name : null,
                  coCreatorAvatar: coCreator ? coCreator.avatar_url : null,
                  clientName: client ? client.client_name : 'Internal',
                  clientStatus: client ? client.status : 'Active',
                  clientPlanName,
                  status: normalizedStatus,
                  comments: enrichedComments,
                  commentCount: enrichedComments.length,
                  dueDate: t.delivered_at || t.properties?.dueDate,
                  latestVersionNumber
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
      if (userRole === 'customer') {
        if (userMembership) {
          result = result.filter(t => t.membership_id === userMembership);
        } else {
          result = []; // No membership linked — show empty state
        }
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
      if (!displaySettings.showInactive && userRole !== 'customer') result = result.filter(t => {
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

      // Check task limit when creating as Active Task for a client
      if (formData.status === 'Active Task' && formData.clientId) {
          try {
              // Client-side count check against plan limit
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

      // Convert plain-text markdown brief to simple HTML for rendering in task views
      const briefToHtml = (text) => {
          if (!text || text.startsWith('<')) return text; // already HTML or empty
          return text
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/^## (.+)$/gm, '<strong>$1</strong>')  // ## headers → bold
              .replace(/^- (.+)$/gm, '• $1')                   // - bullets → bullet char
              .replace(/\n/g, '<br>');                           // newlines → <br>
      };

      const htmlDescription = briefToHtml(formData.description);

      // ── Upload base64 AI images to Supabase Storage ──
      // Base64 data URIs are too large for the `properties` jsonb column
      // (causes Postgres statement timeout). Upload to storage and replace with URLs.
      const STORAGE_BUCKET = 'ai-images';
      const taskSlug = `task-${Date.now()}`;
      let imgCounter = 0;
      let bucketReady = false;

      // Ensure the storage bucket exists (only when we actually have images)
      const hasAnyImages = (formData.aiImages?.length > 0) ||
          formData.aiConversation?.some(m => m.images?.length > 0);
      if (hasAnyImages) {
          try {
              const { data: buckets } = await supabase.storage.listBuckets();
              if (!buckets?.some(b => b.name === STORAGE_BUCKET)) {
                  await supabase.storage.createBucket(STORAGE_BUCKET, { public: true, fileSizeLimit: 10485760 });
              }
              bucketReady = true;
          } catch (e) {
              console.warn('[AI Images] Could not ensure bucket:', e.message);
          }
      }

      // Cache to avoid uploading the same base64 image twice
      const uploadCache = new Map();

      const uploadBase64 = async (base64Data) => {
          if (!base64Data) return null;
          if (!base64Data.startsWith('data:image/')) return base64Data; // already a URL — keep as-is
          if (!bucketReady) return base64Data; // bucket unavailable — keep original data

          // Return cached URL if this exact image was already uploaded
          if (uploadCache.has(base64Data)) return uploadCache.get(base64Data);

          try {
              const match = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
              if (!match) return null;
              const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
              const raw = atob(match[2]);
              const bytes = new Uint8Array(raw.length);
              for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);

              const filePath = `${taskSlug}/${imgCounter++}.${ext}`;
              const { error } = await supabase.storage
                  .from(STORAGE_BUCKET)
                  .upload(filePath, bytes, { contentType: `image/${match[1]}`, upsert: true });
              if (error) {
                  console.warn('[AI Image Upload] Storage error:', error.message);
                  return base64Data; // keep original data so images still render
              }
              const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);
              const publicUrl = urlData.publicUrl;
              uploadCache.set(base64Data, publicUrl);
              return publicUrl;
          } catch (err) {
              console.warn('[AI Image Upload] Failed:', err.message);
              return base64Data; // keep original data so images still render
          }
      };

      // Process AI conversation — upload images, replace base64 with URLs
      let processedConversation = formData.aiConversation || null;
      let processedAiImages = formData.aiImages || null;

      if (processedConversation || processedAiImages) {
          try {
              // Upload images from conversation messages
              if (processedConversation) {
                  processedConversation = await Promise.all(
                      processedConversation.map(async (msg) => {
                          if (!msg.images || msg.images.length === 0) return msg;
                          const uploadedImages = await Promise.all(msg.images.map(uploadBase64));
                          const validImages = uploadedImages.filter(Boolean);
                          return { ...msg, images: validImages.length > 0 ? validImages : undefined, imageRating: validImages.length > 0 ? msg.imageRating : undefined };
                      })
                  );
              }

              // Upload images from ai_images gallery
              if (processedAiImages) {
                  const uploaded = await Promise.all(
                      processedAiImages.map(async (img) => {
                          const url = await uploadBase64(img.url || img);
                          return url ? { url, rating: img.rating || 0 } : null;
                      })
                  );
                  processedAiImages = uploaded.filter(Boolean);
                  if (processedAiImages.length === 0) processedAiImages = null;
              }
          } catch (uploadErr) {
              console.warn('[AI Image Upload] Batch failed, saving without images:', uploadErr);
              // Strip images entirely to prevent timeout
              if (processedConversation) {
                  processedConversation = processedConversation.map(msg => {
                      const { images, imageRating, ...rest } = msg;
                      return rest;
                  });
              }
              processedAiImages = null;
          }
      }

      const isClientCreating = userRole === 'customer';
      const newTaskPayload = {
          title: formData.title,
          description: htmlDescription,
          content: htmlDescription,
          status: formData.status,
          assigned_to_id: isClientCreating ? null : (formData.assigneeId || teamMemberId),
          created_by_team_id: isClientCreating ? null : (formData.createdById || teamMemberId),
          created_by_id: isClientCreating ? clientContactId : null,
          co_creator_team_id: isClientCreating ? null : (formData.coCreatorId || null),
          helper_id: isClientCreating ? null : (formData.helperId || null),
          membership_id: isClientCreating ? userMembership : formData.clientId,
          private: isClientCreating ? false : (formData.isPrivate || false),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          orchestra_task_id: `TASK-${Date.now()}`,
          properties: {
              ...(formData.type ? { type: formData.type } : {}),
              dueDate: formData.dueDate,
              ...(processedConversation ? { ai_conversation: processedConversation } : {}),
              ...(processedAiImages ? { ai_images: processedAiImages } : {})
          }
      };
      try {
          const { data, error } = await supabase.from('tasks').insert([newTaskPayload]).select();
          if (error) {
              console.error('Error creating task:', error);
              toast.error(`Error creating task: ${error.message}`);
              return;
          }
          if (!data || data.length === 0) {
              console.error('Error creating task: no data returned from insert');
              toast.error('Error creating task: no data returned');
              return;
          }

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
          await fetchData();
      } catch (insertErr) {
          console.error('[handleAddTask] Unexpected error during insert:', insertErr);
          toast.error(`Failed to create task: ${insertErr.message || 'Unknown error'}`);
      }
  };

  const handleUpdateTask = async (taskId, updates) => {
      // If only updating comments, skip database update (comments are in separate table)
      if (Object.keys(updates).length === 1 && updates.comments) {
          updateLocalTask(taskId, updates);
          return;
      }

      // Optimistic update — apply immediately for responsive UI
      const previousTask = tasks.find(t => t.id === taskId);
      const payload = { ...updates, updated_at: new Date().toISOString() };
      updateLocalTask(taskId, payload);

      const { error } = await supabase.from('tasks').update(payload).eq('id', taskId);
      if (error) {
          console.error('[handleUpdateTask] Update failed:', error);
          // Revert optimistic update on failure
          if (previousTask) updateLocalTask(taskId, previousTask);
          toast.error('Failed to update task. Check database triggers.');
      }
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
      // DB records are now created inside NewClientModal
      // This callback can be used for additional side effects
  };

  if (loading && user) return (
    <div className="h-screen w-screen bg-white dark:bg-black flex items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <div className="w-12 h-12 border-2 border-gray-200 dark:border-gray-800 rounded-full"></div>
          <div className="w-12 h-12 border-2 border-gray-800 dark:border-white border-t-transparent dark:border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
        </div>
        <div className="text-center flex flex-col items-center" style={{ gap: '10px' }}>
          <p className="font-lastik text-[33px] font-normal text-gray-300 dark:text-white tracking-[0.3em] uppercase leading-none">
            Dafolle
          </p>
          <p className="font-inter-tight text-[16px] font-normal text-gray-300 dark:text-white tracking-[0.3em] uppercase leading-none">
            Studio
          </p>
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
    <div className="flex h-screen w-full bg-white dark:bg-black font-inter-tight text-gray-800 dark:text-neutral-200 overflow-hidden" onClick={() => { setDisplayMenuOpen(false); setFilterMenuOpen(false); }}>
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
          width={sidebarWidth}
          isAdmin={isAdmin}
          tasks={processedTasks}
        />
      ) : (
        <SettingsSidebar currentView={settingsView} setView={setSettingsView} setMode={setMode} width={sidebarWidth} />
      )}

      {/* Draggable resize handle — no visible line, color difference separates sidebar from content */}
      <div
        onMouseDown={handleResizeStart}
        className="w-1 cursor-col-resize shrink-0 group relative z-10 flex items-center justify-center"
      >
        <div className="absolute inset-y-0 -left-1.5 -right-1.5" />
        <div className={`w-px h-full transition-colors ${isDraggingSidebar ? 'bg-gray-400 dark:bg-neutral-500' : 'bg-transparent group-hover:bg-gray-300 dark:group-hover:bg-neutral-700'}`} />
      </div>

      {/* Content area — rounded rectangle encapsulated in the darker sidebar frame */}
      <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#0f0f0f] relative rounded-2xl overflow-hidden my-2 mr-2">
        {mode === APP_MODES.DASHBOARD && (
            <div className="h-14 flex items-center justify-between px-12 shrink-0 bg-gray-100 dark:bg-[#0d1014]">
              <div className="flex items-center gap-4">
                  {dashboardView === DASHBOARD_VIEWS.BOARD ? (
                      <>
                        {userRole === 'team' && (
                          <div className="flex bg-white dark:bg-black border border-white dark:border-black rounded-full p-1">
                            <button onClick={() => setTaskFilter('all')} className={`px-3 py-1.5 rounded-full transition-all text-[12px] leading-[1.3] tracking-[-0.24px] ${taskFilter === 'all' ? 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-white' : 'text-gray-500 dark:text-neutral-500 hover:text-gray-800 dark:hover:text-white'}`}>All tasks</button>
                            <button onClick={() => setTaskFilter('mine')} className={`px-3 py-1.5 rounded-full transition-all text-[12px] leading-[1.3] tracking-[-0.24px] ${taskFilter === 'mine' ? 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-white' : 'text-gray-500 dark:text-neutral-500 hover:text-gray-800 dark:hover:text-white'}`}>For me</button>
                            <button onClick={() => setTaskFilter('internal')} className={`px-3 py-1.5 rounded-full transition-all text-[12px] leading-[1.3] tracking-[-0.24px] ${taskFilter === 'internal' ? 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-white' : 'text-gray-500 dark:text-neutral-500 hover:text-gray-800 dark:hover:text-white'}`}>Internal</button>
                          </div>
                        )}
                        {userRole === 'customer' && (
                          <h1 className="font-lastik text-h6-brand text-gray-800 dark:text-white">Your Tasks</h1>
                        )}
                      </>
                  ) : <h1 className="font-lastik text-h6-brand text-gray-800 dark:text-white capitalize">{dashboardView === 'ai_brief' ? 'AI Brief' : dashboardView}</h1>}
              </div>
              <div className="flex items-center gap-3">
                  {isAdmin && dashboardView === DASHBOARD_VIEWS.CUSTOMERS && (
                    <button
                      onClick={() => setIsNewClientModalOpen(true)}
                      className="flex items-center gap-2 text-[12px] tracking-[-0.24px] bg-white dark:bg-white/10 hover:bg-gray-100 dark:hover:bg-white/20 text-gray-700 dark:text-white px-3 py-1.5 rounded-full transition-colors"
                    >
                      <Icon name="plus-01" size={12} /> Invite Client
                    </button>
                  )}
                  <div className="flex bg-white dark:bg-black border border-white dark:border-black rounded-full p-1">
                    {userRole === 'team' && (
                      <div className="relative" onClick={e => e.stopPropagation()}>
                        <button onClick={() => { setFilterMenuOpen(!filterMenuOpen); setDisplayMenuOpen(false); }} className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all text-[12px] leading-[1.3] tracking-[-0.24px] ${filterMenuOpen ? 'bg-white dark:bg-white/10 text-gray-600 dark:text-white' : 'text-gray-500 dark:text-neutral-500 hover:text-gray-800 dark:hover:text-white'}`}>
                          <Icon name="filter" size={12} /> Filters {activeFilterCount > 0 && <span className="bg-gray-800 dark:bg-white/20 text-white w-4 h-4 rounded-full flex items-center justify-center text-[9px]">{activeFilterCount}</span>}
                        </button>
                        {filterMenuOpen && <FilterMenu filters={advancedFilters} onUpdate={setAdvancedFilters} team={team} clients={clients} onClose={() => setFilterMenuOpen(false)} />}
                      </div>
                    )}
                    <div className="relative" onClick={e => e.stopPropagation()}>
                      <button onClick={() => { setDisplayMenuOpen(!displayMenuOpen); setFilterMenuOpen(false); }} className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all text-[12px] leading-[1.3] tracking-[-0.24px] ${displayMenuOpen ? 'bg-white dark:bg-white/10 text-gray-600 dark:text-white' : 'text-gray-500 dark:text-neutral-500 hover:text-gray-800 dark:hover:text-white'}`}>
                        <Icon name="settings" size={12} /> Display
                      </button>
                      {displayMenuOpen && <DisplayMenu settings={displaySettings} onUpdate={setDisplaySettings} onClose={() => setDisplayMenuOpen(false)} isCustomer={userRole === 'customer'} />}
                    </div>
                  </div>
                  <button onClick={() => { setNewTaskStatus('Backlog'); setIsNewTaskModalOpen(true); }} className="bg-white dark:bg-black hover:bg-gray-100 dark:hover:bg-neutral-900 text-gray-700 dark:text-white rounded-full w-8 h-8 flex items-center justify-center transition-all active:scale-95"><Icon name="plus-01" size={16} /></button>
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
                        isAdmin={isAdmin}
                    />
                )}
                {dashboardView === DASHBOARD_VIEWS.CYCLES && <CyclesView />}
                {dashboardView === DASHBOARD_VIEWS.ANALYTICS && isAdmin && <AnalyticsView tasks={processedTasks} clients={clients} team={team} agreements={agreements} />}
                {dashboardView === DASHBOARD_VIEWS.PAYMENTS && <PaymentsView />}
                {dashboardView === DASHBOARD_VIEWS.PLANS && userRole === 'customer' && (
                  <ClientPlansView
                    availablePlans={availablePlans}
                    planLimits={planLimits}
                    clientMembership={clients.find(c => c.id === userMembership)}
                  />
                )}
                {dashboardView === DASHBOARD_VIEWS.DOCUMENTS && userRole === 'customer' && (
                  <ClientDocumentsView membershipId={userMembership} />
                )}
                {dashboardView === DASHBOARD_VIEWS.DELIVERABLES && userRole === 'customer' && (
                  <ClientDeliverablesView tasks={processedTasks} onSelectTask={openTaskDetails} />
                )}
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
                  {settingsView === SETTINGS_VIEWS.CLIENT_TEAM && <ClientTeamSettingsView />}
              </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <NewTaskModal isOpen={isNewTaskModalOpen} onClose={() => setIsNewTaskModalOpen(false)} onAddTask={handleAddTask} clients={clients} team={team} initialStatus={newTaskStatus} currentUser={user} userRole={userRole} userMembership={userMembership} clientContactId={clientContactId} />
      <NewClientModal isOpen={isNewClientModalOpen} onClose={() => setIsNewClientModalOpen(false)} onInvite={handleInviteClient} availablePlans={availablePlans} teamMemberId={teamMemberId} onDataRefresh={fetchData} />
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} tasks={processedTasks} onSelectTask={openTaskDetails} userRole={userRole} />

      {/* Notifications Dropdown */}
      {isNotificationsOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsNotificationsOpen(false)} />
          <div className="fixed top-4 right-4 w-96 bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl shadow-2xl z-50 animate-scale-in">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <h3 className="text-gray-800 dark:text-white font-bold text-[12px]">Notifications</h3>
              <button onClick={() => setIsNotificationsOpen(false)} className="text-gray-500 hover:text-gray-800 dark:hover:text-white">
                <Icon name="x-01" size={16} />
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto custom-scrollbar">
              <div className="p-6 text-center text-gray-600">
                <Icon name="bell-01" size={48} className="mx-auto mb-4 opacity-20" />
                <p className="text-[12px]">No new notifications</p>
                <p className="text-[10px] mt-2 text-gray-500">You're all caught up!</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
    </ProtectedRoute>
  );
}