import React, { useState, useEffect } from 'react';
import { Plus, MessageSquare, ArrowUpRight, Calendar, Hash, AlertTriangle } from 'lucide-react';
import { STATUS_CONFIG } from '../utils/constants';
import { ContextMenu } from './CustomUI';
import { TaskLimitBadge } from './TaskLimitIndicator';
import { formatDueDate, getDueDateStatus } from '../utils/dateUtils';
import { supabase } from '../supabaseClient';
import { useToast } from './Toast';

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
          // First try the RPC check
          const { data: limitCheck, error } = await supabase.rpc('check_task_limit', {
            p_membership_id: draggedTask.membership_id
          });

          console.log('[KanbanBoard] check_task_limit result:', limitCheck, 'error:', error);

          if (!error && limitCheck && !limitCheck.can_activate) {
            toast.error(`Task limit reached: ${limitCheck.current_active}/${limitCheck.max_tasks} active tasks`);
            setDraggedTask(null);
            setDragOverStatus(null);
            return;
          }

          // Fallback: client-side count check against plan limit
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
    <div className="flex-1 overflow-x-auto h-full py-6 pr-6 pl-6">
      <div className="flex gap-3 h-full min-w-max">
        {Object.keys(STATUS_CONFIG).map(status => (
          <div
            key={status}
            className="w-80 flex flex-col h-full"
            onDragOver={(e) => handleDragOver(e, status)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, status)}
          >
            <div className="flex items-center justify-between mb-4 px-1 group">
              <div className="flex items-center gap-2.5">
                {React.createElement(STATUS_CONFIG[status].icon, { size: 14, className: STATUS_CONFIG[status].color.replace('text-', 'stroke-') })}
                <h3 className="text-neutral-900 dark:text-white text-sm font-medium tracking-tight">{status}</h3>
                {/* Show X/Y format for Active Task when single client is filtered */}
                {status === 'Active Task' && singleClientFilter && clientTaskLimit ? (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
                    tasks.filter(t => t.status === status).length >= clientTaskLimit
                      ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                      : 'bg-neutral-200/80 dark:bg-neutral-800/80 text-neutral-600 dark:text-neutral-500 border border-neutral-300/50 dark:border-neutral-700/50'
                  }`}>
                    {tasks.filter(t => t.status === status).length}/{clientTaskLimit}
                  </span>
                ) : (
                  <span className="bg-neutral-200/80 dark:bg-neutral-800/80 text-neutral-600 dark:text-neutral-500 border border-neutral-300/50 dark:border-neutral-700/50 px-2 py-0.5 rounded-full text-[10px] font-medium">
                    {tasks.filter(t => t.status === status).length}
                  </span>
                )}
              </div>
              <button onClick={() => onOpenNewTask(status)} className="text-neutral-400 dark:text-neutral-600 hover:text-neutral-900 dark:hover:text-white transition-all duration-200 opacity-0 group-hover:opacity-100 p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-800/80 rounded-md">
                  <Plus size={14}/>
              </button>
            </div>

            <div className={`flex-1 overflow-y-auto space-y-2.5 pt-2 pr-3 pb-20 custom-scrollbar transition-all duration-300 ${dragOverStatus === status ? 'bg-neutral-100 dark:bg-white/5 border-2 border-neutral-900 dark:border-white/30 rounded-xl shadow-lg shadow-neutral-300/30 dark:shadow-white/10' : 'border-2 border-transparent'}`}>
              {tasks.filter(t => t.status === status).map(task => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, task)}
                  onDragEnd={handleDragEnd}
                  onClick={() => setActiveTask(task)}
                  onContextMenu={(e) => handleContextMenu(e, task)}
                  className={`group bg-white dark:bg-[#141414] border-[1.5px] border-neutral-200/60 dark:border-neutral-800/80 hover:border-neutral-300 dark:hover:border-neutral-700 rounded-xl p-3.5 cursor-pointer shadow-sm hover:shadow-md hover:shadow-neutral-200/50 dark:hover:shadow-lg dark:hover:shadow-black/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-neutral-50 dark:hover:bg-[#1a1a1a] relative select-none ${draggedTask?.id === task.id ? 'opacity-40 scale-95' : ''}`}
                >
                  <div className="flex justify-between items-start mb-2.5">
                     {/* CLIENT NAME: Only show if 'client' or 'project' is toggled in Display menu */}
                     {showClient && (
                         <span className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wide truncate max-w-[120px]">
                             {task.clientName || 'Internal'}
                         </span>
                     )}

                     {/* Spacer if client name is hidden but we need layout stability, or just flex gap */}
                     {!showClient && <div />}

                     {/* ASSIGNEE: Only show if 'assignee' is toggled in Display menu */}
                     {showAssignee && (
                        <div className="flex gap-2 items-center">
                            {task.assigneeAvatar ? (
                                <img src={task.assigneeAvatar} alt={task.assigneeName} className="w-5 h-5 rounded-full border border-neutral-300 dark:border-neutral-700/70 object-cover ring-1 ring-neutral-200 dark:ring-neutral-800" />
                            ) : (
                                task.assigneeName && <div className="text-[10px] bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 w-5 h-5 rounded-full flex items-center justify-center border border-neutral-300 dark:border-neutral-700/70 font-medium">{task.assigneeName[0]}</div>
                            )}
                        </div>
                     )}
                  </div>

                  <h4 className="text-sm text-neutral-900 dark:text-white font-medium mb-2 leading-tight line-clamp-2 tracking-tight">{task.title}</h4>

                  {task.description && (
                      <p className="text-xs text-neutral-500 mb-3 line-clamp-2 break-words leading-relaxed">
                          {task.description}
                      </p>
                  )}

                  <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-neutral-200/60 dark:border-neutral-800/60 text-neutral-400 dark:text-neutral-600">
                    <div className="flex items-center gap-1 text-[10px] font-medium">
                        <MessageSquare size={11} className="opacity-70" />
                        <span>{task.commentCount || 0}</span>
                    </div>

                    {/* DUE DATE: Show if toggled with overdue/due-soon styling */}
                    {showDueDate && task.due_date && (() => {
                        const dueDateInfo = formatDueDate(task.due_date, task.status);
                        const dueDateStatus = getDueDateStatus(task.due_date);
                        const isOverdue = dueDateStatus === 'overdue' && task.status === 'Active Task';
                        const isDueSoon = dueDateStatus === 'due-soon' && task.status === 'Active Task';

                        return (
                            <div className={`flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full transition-colors ${
                                isOverdue ? 'text-red-400 bg-red-500/10 border border-red-500/20' :
                                isDueSoon ? 'text-orange-400 bg-orange-500/10 border border-orange-500/20' :
                                'text-neutral-500 bg-neutral-100 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/50'
                            }`}>
                                {isOverdue && <AlertTriangle size={11} />}
                                {!isOverdue && <Calendar size={11} className="opacity-70" />}
                                <span>{dueDateInfo.text || new Date(task.due_date).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</span>
                            </div>
                        );
                    })()}

                    {/* REFERENCE ID: Show if toggled */}
                    {showReference && task.orchestra_task_id && (
                        <div className="flex items-center gap-1 text-[10px] font-medium text-neutral-500">
                            <Hash size={11} className="opacity-70" />
                            <span>{task.orchestra_task_id.slice(-4)}</span>
                        </div>
                    )}
                  </div>
                </div>
              ))}
              {tasks.filter(t => t.status === status).length === 0 && (
                  <div className="border border-dashed border-neutral-300/60 dark:border-neutral-800/60 rounded-xl h-24 flex flex-col items-center justify-center text-neutral-400 dark:text-neutral-600 gap-2 opacity-40 hover:opacity-70 transition-all duration-200 cursor-default">
                      <div className="p-2 bg-neutral-100 dark:bg-neutral-900/50 rounded-full"><ArrowUpRight size={12}/></div>
                      <span className="text-xs font-medium tracking-tight">{status} empty</span>
                  </div>
              )}

              {/* Add task button at bottom of column */}
              <button
                  onClick={() => onOpenNewTask(status)}
                  className="w-full py-2.5 rounded-xl border border-neutral-300/60 dark:border-neutral-800/80 bg-neutral-100 dark:bg-[#161616] hover:bg-neutral-200 dark:hover:bg-[#1f1f1f] text-neutral-500 dark:text-neutral-600 hover:text-neutral-600 dark:hover:text-neutral-400 hover:border-neutral-400 dark:hover:border-neutral-700 transition-all duration-200 flex items-center justify-center"
              >
                  <Plus size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>
      {contextMenu && <ContextMenu x={contextMenu.x} y={contextMenu.y} onClose={() => setContextMenu(null)} onAction={handleContextAction} />}
    </div>
  );
};