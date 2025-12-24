import React, { useState } from 'react';
import { Plus, MessageSquare, ArrowUpRight, Calendar, Hash } from 'lucide-react';
import { STATUS_CONFIG } from '../utils/constants';
import { ContextMenu } from './CustomUI';

export const KanbanBoard = ({ tasks, setActiveTask, onOpenNewTask, onDeleteTask, onUpdateTask, displaySettings }) => {
  const [contextMenu, setContextMenu] = useState(null);
  const [draggedTask, setDraggedTask] = useState(null);
  const [dragOverStatus, setDragOverStatus] = useState(null);

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

  const handleContextAction = (action) => {
    if (!contextMenu) return;
    const { task } = contextMenu;
    if (action === 'open') setActiveTask(task);
    if (action === 'delete') onDeleteTask(task.id);
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

  const handleDrop = (e, newStatus) => {
    e.preventDefault();
    if (draggedTask && draggedTask.status !== newStatus && onUpdateTask) {
      onUpdateTask(draggedTask.id, { status: newStatus });
    }
    setDraggedTask(null);
    setDragOverStatus(null);
  };

  return (
    <div className="flex-1 overflow-x-auto h-full p-6">
      <div className="flex gap-6 h-full min-w-max">
        {Object.keys(STATUS_CONFIG).map(status => (
          <div
            key={status}
            className="w-80 flex flex-col h-full"
            onDragOver={(e) => handleDragOver(e, status)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, status)}
          >
            <div className="flex items-center justify-between mb-4 px-1 group">
              <div className="flex items-center gap-2">
                {React.createElement(STATUS_CONFIG[status].icon, { size: 14, className: STATUS_CONFIG[status].color.replace('text-', 'stroke-') })}
                <h3 className="text-neutral-300 text-sm font-medium">{status}</h3>
                <span className="bg-neutral-800 text-neutral-500 px-1.5 py-0.5 rounded text-[10px]">{tasks.filter(t => t.status === status).length}</span>
              </div>
              <button onClick={() => onOpenNewTask(status)} className="text-neutral-600 hover:text-white transition-colors opacity-0 group-hover:opacity-100 p-1 hover:bg-neutral-800 rounded">
                  <Plus size={14}/>
              </button>
            </div>

            <div className={`flex-1 overflow-y-auto space-y-3 pr-1 pb-20 custom-scrollbar transition-all duration-300 ${dragOverStatus === status ? 'bg-white/5 border-2 border-white rounded-lg shadow-lg shadow-white/30' : 'border-2 border-transparent'}`}>
              {tasks.filter(t => t.status === status).map(task => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, task)}
                  onDragEnd={handleDragEnd}
                  onClick={() => setActiveTask(task)}
                  onContextMenu={(e) => handleContextMenu(e, task)}
                  className={`group bg-[#1a1a1a] border border-neutral-800 hover:border-neutral-600 rounded-lg p-4 cursor-move shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 relative select-none ${draggedTask?.id === task.id ? 'opacity-50' : ''}`}
                >
                  <div className="flex justify-between items-start mb-2">
                     {/* CLIENT NAME: Only show if 'client' or 'project' is toggled in Display menu */}
                     {showClient && (
                         <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider truncate max-w-[120px]">
                             {task.clientName || 'Internal'}
                         </span>
                     )}
                     
                     {/* Spacer if client name is hidden but we need layout stability, or just flex gap */}
                     {!showClient && <div />}

                     {/* ASSIGNEE: Only show if 'assignee' is toggled in Display menu */}
                     {showAssignee && (
                        <div className="flex gap-2 items-center">
                            {task.assigneeAvatar ? (
                                <img src={task.assigneeAvatar} alt={task.assigneeName} className="w-5 h-5 rounded-full border border-neutral-700 object-cover" />
                            ) : (
                                task.assigneeName && <div className="text-[10px] bg-neutral-800 text-neutral-400 w-5 h-5 rounded-full flex items-center justify-center border border-neutral-700">{task.assigneeName[0]}</div>
                            )}
                        </div>
                     )}
                  </div>
                  
                  <h4 className="text-sm text-neutral-200 font-medium mb-2 leading-snug line-clamp-2">{task.title}</h4>
                  
                  {task.description && (
                      <p className="text-xs text-neutral-500 mb-3 line-clamp-2 break-words leading-relaxed">
                          {task.description}
                      </p>
                  )}

                  <div className="flex items-center gap-3 mt-3 pt-2 border-t border-neutral-800/50 text-neutral-600">
                    <div className="flex items-center gap-1 text-[10px]">
                        <MessageSquare size={10} /> 
                        {task.commentCount || 0}
                    </div>

                    {/* DUE DATE: Show if toggled */}
                    {showDueDate && task.due_date && (
                        <div className="flex items-center gap-1 text-[10px] text-neutral-500">
                            <Calendar size={10} />
                            {new Date(task.due_date).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                        </div>
                    )}

                    {/* REFERENCE ID: Show if toggled */}
                    {showReference && task.orchestra_task_id && (
                        <div className="flex items-center gap-1 text-[10px] text-neutral-500">
                            <Hash size={10} />
                            {task.orchestra_task_id.slice(-4)}
                        </div>
                    )}
                  </div>
                </div>
              ))}
              {tasks.filter(t => t.status === status).length === 0 && (
                  <div className="border border-dashed border-neutral-800 rounded-lg h-24 flex flex-col items-center justify-center text-neutral-600 gap-2 opacity-50 hover:opacity-100 transition-opacity cursor-default">
                      <div className="p-2 bg-neutral-900 rounded-full"><ArrowUpRight size={12}/></div>
                      <span className="text-xs font-medium">{status} empty</span>
                  </div>
              )}
            </div>
          </div>
        ))}
      </div>
      {contextMenu && <ContextMenu x={contextMenu.x} y={contextMenu.y} onClose={() => setContextMenu(null)} onAction={handleContextAction} />}
    </div>
  );
};