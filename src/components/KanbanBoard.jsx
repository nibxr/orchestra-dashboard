import React, { useState, useEffect } from 'react';
import { Icon } from './Icon';
import { STATUS_CONFIG } from '../utils/constants';
import { ContextMenu } from './CustomUI';
import { TaskLimitBadge } from './TaskLimitIndicator';
import { getDueDateStatus, formatRelativeTime } from '../utils/dateUtils';
import { supabase } from '../supabaseClient';
import { useToast } from './Toast';

// Subscription/plan tag colors
const PLAN_TAG_STYLES = {
  Lite: { bg: 'bg-blue-500/[0.08] dark:bg-blue-400/20', text: 'text-blue-600 dark:text-blue-300' },
  Light: { bg: 'bg-blue-500/[0.08] dark:bg-blue-400/20', text: 'text-blue-600 dark:text-blue-300' },
  Start: { bg: 'bg-green-500/[0.08] dark:bg-green-400/20', text: 'text-green-700 dark:text-green-300' },
  Grow: { bg: 'bg-orange-500/[0.08] dark:bg-orange-400/20', text: 'text-orange-700 dark:text-orange-300' },
  Boost: { bg: 'bg-red-500/[0.08] dark:bg-red-400/20', text: 'text-red-700 dark:text-red-300' },
};

const getPlanTagStyle = (planName) => {
  if (!planName) return PLAN_TAG_STYLES.Start;
  const key = Object.keys(PLAN_TAG_STYLES).find(k => planName.toLowerCase().includes(k.toLowerCase()));
  return PLAN_TAG_STYLES[key] || PLAN_TAG_STYLES.Start;
};

export const KanbanBoard = ({ tasks, setActiveTask, onOpenNewTask, onDeleteTask, onUpdateTask, displaySettings, taskLimits = {}, advancedFilters = {}, clients = [] }) => {
  const toast = useToast();
  const [contextMenu, setContextMenu] = useState(null);
  const [draggedTask, setDraggedTask] = useState(null);
  const [dragOverStatus, setDragOverStatus] = useState(null);
  const [clientTaskLimit, setClientTaskLimit] = useState(null);

  // Check if single client is filtered
  const singleClientFilter = advancedFilters.client?.length === 1 ? advancedFilters.client[0] : null;

  // Fetch task limit for filtered client
  useEffect(() => {
    const fetchClientLimit = async () => {
      if (singleClientFilter) {
        const client = clients.find(c => c.id === singleClientFilter);

        if (!client) {
          setClientTaskLimit(null);
        } else if (client?.plan_from_agreements) {
          const { data, error } = await supabase
            .from('Plans')
            .select('tasks_at_once')
            .eq('whalesync_postgres_id', client.plan_from_agreements)
            .single();

          if (data?.tasks_at_once) {
            setClientTaskLimit(parseInt(data.tasks_at_once));
          } else {
            setClientTaskLimit(null);
          }
        } else {
          setClientTaskLimit(null);
        }
      } else {
        setClientTaskLimit(null);
      }
    };

    fetchClientLimit();
  }, [singleClientFilter, clients]);

  // Get active task count per membership for limit checking
  const getActiveTaskCount = (membershipId) => {
    if (!membershipId) return 0;
    return tasks.filter(t =>
      t.membership_id === membershipId &&
      t.status === 'Active Task' &&
      !t.archived_at
    ).length;
  };

  // Primary statuses fill the viewport; overflow statuses scroll right
  const allStatuses = Object.keys(STATUS_CONFIG);
  const primaryStatuses = allStatuses.slice(0, 4);

  // Check which properties should be visible based on displaySettings
  const visibleProperties = displaySettings?.visibleProperties || [];
  const showClient = visibleProperties.includes('client') || visibleProperties.includes('project');
  const showAssignee = visibleProperties.includes('assignee');
  const showDueDate = visibleProperties.includes('dueDate') || visibleProperties.includes('due_date');
  const showReference = visibleProperties.includes('reference') || visibleProperties.includes('id');

  const handleContextMenu = (e, task) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, task: task });
  };

  const handleContextAction = async (action) => {
    if (!contextMenu) return;
    const { task } = contextMenu;

    if (action === 'open') setActiveTask(task);
    if (action === 'delete') onDeleteTask(task.id);

    // Copy task ID to clipboard
    if (action === 'copy_id') {
      try {
        await navigator.clipboard.writeText(task.orchestra_task_id || task.id);
        // TODO: Show toast notification "Task ID copied!"
        console.log('Task ID copied:', task.orchestra_task_id || task.id);
      } catch (err) {
        console.error('Failed to copy task ID:', err);
      }
    }

    // Copy task link to clipboard
    if (action === 'copy_link') {
      try {
        const taskLink = `${window.location.origin}?task=${task.id}`;
        await navigator.clipboard.writeText(taskLink);
        // TODO: Show toast notification "Link copied!"
        console.log('Task link copied:', taskLink);
      } catch (err) {
        console.error('Failed to copy link:', err);
      }
    }

    setContextMenu(null);
  };

  // Drag and drop handlers
  const handleDragStart = (e, task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';

    // Create a custom drag image that follows the cursor
    const dragElement = e.currentTarget.cloneNode(true);
    dragElement.style.position = 'absolute';
    dragElement.style.top = '-9999px';
    dragElement.style.width = e.currentTarget.offsetWidth + 'px';
    dragElement.style.opacity = '1'; // Full opacity for maximum visibility
    dragElement.style.transform = 'rotate(3deg)';
    dragElement.style.pointerEvents = 'none';
    dragElement.style.border = '2px solid white'; // White border highlight
    dragElement.style.borderRadius = '0.5rem'; // Match the card's border radius
    dragElement.style.boxShadow = '0 0 20px rgba(255, 255, 255, 0.3)'; // White glow
    document.body.appendChild(dragElement);

    // Set the custom drag image
    e.dataTransfer.setDragImage(dragElement, e.nativeEvent.offsetX, e.nativeEvent.offsetY);

    // Clean up the temporary element after drag starts
    setTimeout(() => {
      if (dragElement.parentNode) {
        document.body.removeChild(dragElement);
      }
    }, 0);
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragOverStatus(null);
  };

  const handleDragOver = (e, status) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStatus(status);
  };

  const handleDragLeave = () => {
    setDragOverStatus(null);
  };

  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    if (draggedTask && draggedTask.status !== newStatus && onUpdateTask) {
      // Check task limit when moving to Active Task
      if (newStatus === 'Active Task' && draggedTask.membership_id) {
        try {
          // Client-side count check against plan limit
          const currentActiveCount = tasks.filter(t =>
            t.membership_id === draggedTask.membership_id &&
            t.status === 'Active Task' &&
            !t.archived_at
          ).length;

          const client = clients.find(c => c.id === draggedTask.membership_id);
          if (client?.plan_from_agreements) {
            const { data: planData } = await supabase
              .from('Plans')
              .select('tasks_at_once')
              .eq('whalesync_postgres_id', client.plan_from_agreements)
              .single();

            const maxTasks = planData?.tasks_at_once ? parseInt(planData.tasks_at_once) : null;
            console.log('[KanbanBoard] Client-side check: active=', currentActiveCount, 'max=', maxTasks);

            if (maxTasks && currentActiveCount >= maxTasks) {
              toast.error(`Task limit reached: ${currentActiveCount}/${maxTasks} active tasks`);
              setDraggedTask(null);
              setDragOverStatus(null);
              return;
            }
          }
        } catch (err) {
          console.error('Error checking task limit:', err);
          toast.error('Could not verify task limit. Please try again.');
          setDraggedTask(null);
          setDragOverStatus(null);
          return;
        }
      }

      onUpdateTask(draggedTask.id, { status: newStatus });
    }
    setDraggedTask(null);
    setDragOverStatus(null);
  };

  return (
    <div className="flex-1 h-full pt-5 pb-2 px-10 relative bg-gray-100 dark:bg-[#0d1014]">
      <div className="flex gap-[14px] h-full">
        {/* Primary statuses fill the viewport */}
        {primaryStatuses.map(status => (
          <div
            key={status}
            className="flex-1 min-w-[200px] flex flex-col h-full"
            onDragOver={(e) => handleDragOver(e, status)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, status)}
          >
            <div className="flex items-center justify-between mb-1.5 px-2 group">
              <div className="flex items-center gap-1.5">
                <div className="p-0.5">
                  <Icon name={STATUS_CONFIG[status].iconName} size={12} className={STATUS_CONFIG[status].color} />
                </div>
                <span className="text-[11px] leading-[1.3] tracking-[-0.2px] text-gray-600 dark:text-neutral-400">{status}</span>
              </div>
              {/* Count badge pill — hover to reveal plus icon */}
              {status === 'Active Task' && singleClientFilter && clientTaskLimit ? (
                <button
                  onClick={(e) => { e.stopPropagation(); onOpenNewTask(status); }}
                  className={`h-[22px] min-w-[30px] px-2 rounded-full flex items-center justify-center cursor-pointer group/badge relative ${
                    tasks.filter(t => t.status === status).length >= clientTaskLimit
                      ? 'bg-red-500/10 text-red-400'
                      : 'bg-white dark:bg-black'
                  }`}
                >
                  <span className="text-[11px] leading-none tracking-[-0.2px] text-gray-600 dark:text-neutral-400 transition-opacity duration-200 group-hover/badge:opacity-0">{tasks.filter(t => t.status === status).length}/{clientTaskLimit}</span>
                  <Icon name="plus-01" size={11} className="absolute inset-0 m-auto text-gray-500 dark:text-neutral-400 opacity-0 transition-opacity duration-200 group-hover/badge:opacity-100" />
                </button>
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); onOpenNewTask(status); }}
                  className="h-[22px] min-w-[30px] px-2 rounded-full bg-white dark:bg-black flex items-center justify-center cursor-pointer group/badge relative"
                >
                  <span className="text-[11px] leading-none tracking-[-0.2px] text-gray-600 dark:text-neutral-400 transition-opacity duration-200 group-hover/badge:opacity-0">{tasks.filter(t => t.status === status).length}</span>
                  <Icon name="plus-01" size={11} className="absolute inset-0 m-auto text-gray-500 dark:text-neutral-400 opacity-0 transition-opacity duration-200 group-hover/badge:opacity-100" />
                </button>
              )}
            </div>

            <div className={`flex-1 overflow-y-auto space-y-3 pt-2 pb-20 px-2 custom-scrollbar transition-all duration-300 ${dragOverStatus === status ? 'bg-gray-100 dark:bg-white/5 border-2 border-gray-800 dark:border-white/30 rounded-xl' : 'border-2 border-transparent'}`}>
              {tasks.filter(t => t.status === status).map(task => {
                const planStyle = getPlanTagStyle(task.clientPlanName || task.clientStatus);
                return (
                <div
                  key={task.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, task)}
                  onDragEnd={handleDragEnd}
                  onClick={() => setActiveTask(task)}
                  onContextMenu={(e) => handleContextMenu(e, task)}
                  className={`group bg-white dark:bg-black border border-white dark:border-black hover:border-gray-300 dark:hover:border-gray-700 rounded-[12px] px-4 pt-3 pb-4 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 relative select-none flex flex-col gap-3 ${draggedTask?.id === task.id ? 'opacity-40 scale-95' : ''}`}
                >
                  {/* Row 1: Client name + plan tag + avatar */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      {showClient && (
                        <span className="text-[11px] leading-none text-gray-500 dark:text-neutral-500 truncate">
                          {task.clientName || 'Internal'}
                        </span>
                      )}
                      {task.clientPlanName && (
                        <div className={`${planStyle.bg} h-[18px] px-1.5 rounded-full shrink-0 flex items-center`}>
                          <span className={`text-[11px] leading-none tracking-[-0.2px] ${planStyle.text}`}>{task.clientPlanName}</span>
                        </div>
                      )}
                    </div>
                    {showAssignee && (
                      <div className="shrink-0">
                        {task.assigneeAvatar ? (
                          <img src={task.assigneeAvatar} alt={task.assigneeName} className="w-[22px] h-[22px] rounded-full border-2 border-white dark:border-black object-cover" />
                        ) : (
                          task.assigneeName && <div className="text-[9px] bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 w-[22px] h-[22px] rounded-full flex items-center justify-center font-medium">{task.assigneeName[0]}</div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Row 2: Task title */}
                  <div className="text-[14px] leading-[1.4] tracking-[-0.24px] text-gray-800 dark:text-gray-300 line-clamp-2">
                    {task.title}
                  </div>

                  {/* Row 3: Tags + time */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {/* Type/deliverable tag */}
                      {task.properties?.type && (
                        <div className="border border-gray-300 dark:border-gray-700 h-[18px] px-1.5 rounded-full flex items-center">
                          <span className="text-[10px] leading-none tracking-[-0.2px] text-gray-600 dark:text-white">{task.properties.type}</span>
                        </div>
                      )}
                      {/* Version tag */}
                      {task.latestVersionNumber && (
                        <div className="border border-gray-300 dark:border-gray-700 h-[20px] px-2.5 rounded-full flex items-center">
                          <span className="text-[10px] leading-none tracking-[-0.2px] text-gray-600 dark:text-white">Version {task.latestVersionNumber}</span>
                        </div>
                      )}
                    </div>

                    {/* Due date / time tag */}
                    {showDueDate && task.due_date && (() => {
                        const relativeTime = formatRelativeTime(task.due_date, task.status);
                        const dueDateStatus = getDueDateStatus(task.due_date);
                        const isOverdue = dueDateStatus === 'overdue' && task.status === 'Active Task';
                        const isDueSoon = dueDateStatus === 'due-soon' && task.status === 'Active Task';

                        return (
                            <div className={`flex items-center gap-1 ${
                                isOverdue ? 'text-red-500' :
                                isDueSoon ? 'text-orange-500' :
                                'text-gray-500 dark:text-neutral-500'
                            }`}>
                                <Icon name="clock-01" size={10} />
                                <span className="text-[10px] leading-none tracking-[-0.2px]">{relativeTime}</span>
                            </div>
                        );
                    })()}

                    {/* Reference ID */}
                    {showReference && task.orchestra_task_id && !task.due_date && (
                        <div className="flex items-center gap-1 text-gray-500 dark:text-neutral-500">
                            <Icon name="hash-01" size={10} />
                            <span className="text-[10px] leading-[1.3] tracking-[-0.2px]">{task.orchestra_task_id.slice(-4)}</span>
                        </div>
                    )}
                  </div>
                </div>
                );
              })}
              {tasks.filter(t => t.status === status).length === 0 && (
                  <div className="border border-dashed border-gray-300 dark:border-gray-700 rounded-[12px] h-24 flex flex-col items-center justify-center text-gray-400 dark:text-gray-600 gap-2 opacity-40 hover:opacity-70 transition-all duration-200 cursor-default">
                      <div className="p-2 bg-gray-100 dark:bg-gray-800/50 rounded-full"><Icon name="arrow-up-right" size={12}/></div>
                      <span className="text-[10px] tracking-[-0.2px]">{status} empty</span>
                  </div>
              )}

              {/* Add task CTA - dashed border style from Figma */}
              <button
                  onClick={() => onOpenNewTask(status)}
                  className="w-full h-[32px] rounded-[12px] border border-dashed border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-black/50 hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400 transition-all duration-200 flex items-center justify-center"
              >
                  <Icon name="plus-01" size={10} />
              </button>
            </div>
          </div>
        ))}
      </div>
      {/* Bottom fade gradient — tasks disappear into background */}
      <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none bg-gradient-to-t from-gray-100 dark:from-[#0d1014] to-transparent z-10" />
      {contextMenu && <ContextMenu x={contextMenu.x} y={contextMenu.y} onClose={() => setContextMenu(null)} onAction={handleContextAction} />}
    </div>
  );
};