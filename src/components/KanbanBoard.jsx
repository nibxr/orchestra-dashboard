import React, { useState } from 'react';
import { Plus, MessageSquare, ArrowUpRight } from 'lucide-react';
import { STATUS_CONFIG } from '../utils/constants';
import { ContextMenu } from './CustomUI';
import { Avatar } from './Shared'; // Ensure Avatar is imported

export const KanbanBoard = ({ tasks, setActiveTask, onOpenNewTask, onDeleteTask }) => {
  const [contextMenu, setContextMenu] = useState(null);

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

  return (
    <div className="flex-1 overflow-x-auto h-full p-6">
      <div className="flex gap-6 h-full min-w-max">
        {Object.keys(STATUS_CONFIG).map(status => (
          <div key={status} className="w-80 flex flex-col h-full">
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

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 pb-20 custom-scrollbar">
              {tasks.filter(t => t.status === status).map(task => (
                <div 
                  key={task.id} 
                  onClick={() => setActiveTask(task)}
                  onContextMenu={(e) => handleContextMenu(e, task)}
                  className="group bg-[#1a1a1a] border border-neutral-800 hover:border-neutral-600 rounded-lg p-4 cursor-pointer shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 relative select-none"
                >
                  <div className="flex justify-between items-start mb-2">
                     {/* Display Mapped Client Name */}
                     <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider truncate max-w-[120px]">
                         {task.clientName || 'Internal'}
                     </span>
                     <div className="flex gap-2 items-center">
                        {/* Display Mapped Assignee Avatar */}
                        {task.assigneeAvatar ? (
                            <img src={task.assigneeAvatar} alt={task.assigneeName} className="w-5 h-5 rounded-full border border-neutral-700 object-cover" />
                        ) : (
                            task.assigneeName && <div className="text-[10px] bg-neutral-800 text-neutral-400 w-5 h-5 rounded-full flex items-center justify-center border border-neutral-700">{task.assigneeName[0]}</div>
                        )}
                     </div>
                  </div>
                  <h4 className="text-sm text-neutral-200 font-medium mb-3 leading-snug line-clamp-2">{task.title}</h4>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-neutral-800/50">
                    <div className="flex items-center gap-3 text-neutral-600">
                      <div className="flex items-center gap-1 text-[10px]"><MessageSquare size={10} /> {task.comments?.length || 0}</div>
                    </div>
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