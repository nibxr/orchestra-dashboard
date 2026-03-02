import React from 'react';
import { Icon } from './Icon';
import { STATUS_CONFIG } from '../utils/constants';
import { Avatar } from './Shared';

export const ListView = ({ tasks, setActiveTask, displaySettings }) => {
    
    const visibleProps = displaySettings?.visibleProperties || [];
    const showClient = visibleProps.includes('client');
    const showAssignee = visibleProps.includes('assignee');
    const showDueDate = visibleProps.includes('dueDate');
    const showId = visibleProps.includes('id');

    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
            <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-[#0f0f0f] overflow-hidden">
                <table className="w-full text-left text-body-md border-collapse">
                    <thead className="bg-neutral-50 dark:bg-[#141414] text-neutral-500 font-medium text-body-sm uppercase tracking-wider border-b border-neutral-200 dark:border-neutral-800 sticky top-0 z-10">
                        <tr>
                            <th className="px-6 py-3 font-medium w-[40%]">Title</th>
                            <th className="px-6 py-3 font-medium">Status</th>
                            {showClient && <th className="px-6 py-3 font-medium">Client</th>}
                            {showAssignee && <th className="px-6 py-3 font-medium">Assignee</th>}
                            {showDueDate && <th className="px-6 py-3 font-medium">Due Date</th>}
                            {showId && <th className="px-6 py-3 font-medium text-right">ID</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800/50">
                        {tasks.map((task) => (
                            <tr 
                                key={task.id} 
                                onClick={() => setActiveTask(task)}
                                className="group hover:bg-neutral-100 dark:hover:bg-white dark:bg-[#1a1a1a] transition-colors cursor-pointer"
                            >
                                <td className="px-6 py-3">
                                    <div className="flex items-center gap-3">
                                        {/* Status Indicator Dot */}
                                        <div className={`w-2 h-2 rounded-full ${STATUS_CONFIG[task.status]?.color?.replace('text-', 'bg-') || 'bg-neutral-500'}`}></div>
                                        <span className="font-medium text-neutral-700 dark:text-neutral-200 group-hover:text-neutral-900 dark:hover:text-white transition-colors line-clamp-1">
                                            {task.title}
                                        </span>
                                        {task.commentCount > 0 && (
                                            <div className="flex items-center gap-1 text-neutral-600 text-xs">
                                                <Icon name="message-square" size={10} /> {task.commentCount}
                                            </div>
                                        )}
                                    </div>
                                </td>

                                <td className="px-6 py-3">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-medium border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 text-neutral-400 whitespace-nowrap">
                                        {task.status}
                                    </span>
                                </td>

                                {showClient && (
                                    <td className="px-6 py-3">
                                        <div className="flex items-center gap-2 text-neutral-400">
                                            <Icon name="bag-01" size={12} />
                                            <span className="truncate max-w-[150px]">{task.clientName || 'Internal'}</span>
                                        </div>
                                    </td>
                                )}

                                {showAssignee && (
                                    <td className="px-6 py-3">
                                        <div className="flex items-center gap-2">
                                            <Avatar name={task.assigneeName || "?"} url={task.assigneeAvatar} size="xs" />
                                            <span className="text-neutral-400 truncate max-w-[120px]">{task.assigneeName || 'Unassigned'}</span>
                                        </div>
                                    </td>
                                )}

                                {showDueDate && (
                                    <td className="px-6 py-3 text-neutral-500 font-mono text-xs">
                                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-'}
                                    </td>
                                )}

                                {showId && (
                                    <td className="px-6 py-3 text-right text-neutral-600 font-mono text-xs">
                                        {task.orchestra_task_id ? task.orchestra_task_id.slice(-4) : ''}
                                    </td>
                                )}
                            </tr>
                        ))}
                        {tasks.length === 0 && (
                            <tr>
                                <td colSpan="10" className="px-6 py-12 text-center text-neutral-600 italic">
                                    No tasks found for current filters.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};