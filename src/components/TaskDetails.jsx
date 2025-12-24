import React, { useState } from 'react';
import {
  X, Circle, User, Calendar, Plus, MoreHorizontal,
  Paperclip, Smile, Mic, Briefcase,
  Clock, CheckCircle2, Link as LinkIcon, ArrowUpRight, ToggleLeft,
  Trash2, Archive, Copy, Edit3
} from 'lucide-react';
import { Avatar } from './Shared';
import { CustomSelect } from './CustomUI';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';

export const TaskDetails = ({ task, onClose, onUpdate, team }) => {
    const { user } = useAuth();
    const [comment, setComment] = useState('');
    const [moreMenuOpen, setMoreMenuOpen] = useState(false);

    // Find creator from team
    const creator = team?.find(t => t.id === task.created_by_id);
    const creatorName = creator?.full_name || 'Unknown';
    const creatorAvatar = creator?.avatar_url;

    // Prepare team options for created_by and assigned_to selectors
    const teamOptions = team?.map(member => ({
        value: member.id,
        label: member.full_name || member.email || 'Unknown',
        avatar: member.avatar_url
    })) || [];

    console.log('[TaskDetails] Team options:', teamOptions);
    console.log('[TaskDetails] Current created_by_id:', task.created_by_id);
    console.log('[TaskDetails] Current assigned_to_id:', task.assigned_to_id);

    const handleUpdateCreatedBy = async (newCreatedById) => {
        try {
            const { error } = await supabase
                .from('tasks')
                .update({ created_by_id: newCreatedById })
                .eq('id', task.id);

            if (error) throw error;

            const newCreator = team?.find(t => t.id === newCreatedById);
            onUpdate(task.id, {
                created_by_id: newCreatedById,
                creatorName: newCreator?.full_name,
                creatorAvatar: newCreator?.avatar_url
            });
        } catch (e) {
            console.error("Error updating created_by:", e);
            alert(`Failed to update creator: ${e.message}`);
        }
    };

    const handleUpdateAssignee = async (newAssigneeId) => {
        try {
            const { error } = await supabase
                .from('tasks')
                .update({ assigned_to_id: newAssigneeId })
                .eq('id', task.id);

            if (error) throw error;

            const newAssignee = team?.find(t => t.id === newAssigneeId);
            onUpdate(task.id, {
                assigned_to_id: newAssigneeId,
                assigneeName: newAssignee?.full_name,
                assigneeAvatar: newAssignee?.avatar_url
            });
        } catch (e) {
            console.error("Error updating assignee:", e);
            alert(`Failed to update assignee: ${e.message}`);
        }
    };

    const handleSendComment = async () => {
        if (!comment.trim()) return;

        try {
            const newCommentPayload = {
                content: comment,
                task_id: task.id,
                author_designer_id: user.id,
                orchestra_comment_id: `COM-${Date.now()}`,
                created_at: new Date().toISOString(),
            };

            const { data, error } = await supabase
                .from('comments')
                .insert([newCommentPayload])
                .select();

            if (error) throw error;

            // Optimistic update: add to local state for immediate feedback
            const createdComment = {
                ...data[0],
                authorName: user.user_metadata?.full_name || user.email,
                authorAvatar: user.user_metadata?.avatar_url || null
            };

            const updatedComments = [...(task.comments || []), createdComment];
            onUpdate(task.id, { comments: updatedComments });
            setComment('');
        } catch (e) {
            console.error("Error posting comment:", e);
            alert("Failed to post comment");
        }
    };

    const handleDeleteTask = async () => {
        if (!confirm('Are you sure you want to delete this task? This action cannot be undone.')) return;

        try {
            const { error } = await supabase
                .from('tasks')
                .delete()
                .eq('id', task.id);

            if (error) throw error;

            alert('Task deleted successfully');
            onClose();
            window.location.reload(); // Refresh to update task list
        } catch (e) {
            console.error("Error deleting task:", e);
            alert(`Failed to delete task: ${e.message}`);
        }
    };

    const handleArchiveTask = async () => {
        try {
            const { error } = await supabase
                .from('tasks')
                .update({ archived_at: new Date().toISOString() })
                .eq('id', task.id);

            if (error) throw error;

            alert('Task archived successfully');
            onClose();
            window.location.reload();
        } catch (e) {
            console.error("Error archiving task:", e);
            alert(`Failed to archive task: ${e.message}`);
        }
    };

    const handleDuplicateTask = async () => {
        try {
            const duplicatePayload = {
                title: `${task.title} (Copy)`,
                description: task.description,
                content: task.content,
                status: 'Backlog',
                assigned_to_id: task.assigned_to_id,
                membership_id: task.membership_id,
                created_by_id: user?.id,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                orchestra_task_id: `TASK-${Date.now()}`,
            };

            const { error } = await supabase
                .from('tasks')
                .insert([duplicatePayload]);

            if (error) throw error;

            alert('Task duplicated successfully');
            window.location.reload();
        } catch (e) {
            console.error("Error duplicating task:", e);
            alert(`Failed to duplicate task: ${e.message}`);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div 
                className="w-full max-w-4xl h-full bg-[#0f0f0f] shadow-2xl border-l border-neutral-800 flex flex-col animate-slide-in-right"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="h-14 border-b border-neutral-800 flex items-center justify-between px-6 bg-[#0f0f0f] shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-6 h-6 bg-lime-400 rounded-full flex items-center justify-center text-black font-bold text-xs">t</div>
                        <div className="text-sm text-neutral-400 flex items-center gap-2">
                            <span className="px-2 py-1 bg-neutral-900 rounded text-xs border border-neutral-800">Tasks</span>
                            <span>/</span>
                            <span className="text-white truncate max-w-[300px]">{task.title}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <button
                                onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                                className="text-neutral-400 hover:text-white transition-colors"
                            >
                                <MoreHorizontal size={18}/>
                            </button>
                            {moreMenuOpen && (
                                <>
                                    <div
                                        className="fixed inset-0 z-40"
                                        onClick={() => setMoreMenuOpen(false)}
                                    />
                                    <div className="absolute right-0 top-full mt-2 w-48 bg-[#1a1a1a] border border-neutral-800 rounded-lg shadow-xl z-50 overflow-hidden">
                                        <button
                                            onClick={() => {handleDuplicateTask(); setMoreMenuOpen(false);}}
                                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-neutral-300 hover:bg-neutral-800 transition-colors"
                                        >
                                            <Copy size={16} />
                                            <span>Duplicate</span>
                                        </button>
                                        <button
                                            onClick={() => {handleArchiveTask(); setMoreMenuOpen(false);}}
                                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-neutral-300 hover:bg-neutral-800 transition-colors"
                                        >
                                            <Archive size={16} />
                                            <span>Archive</span>
                                        </button>
                                        <div className="h-px bg-neutral-800" />
                                        <button
                                            onClick={() => {handleDeleteTask(); setMoreMenuOpen(false);}}
                                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-neutral-800 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                            <span>Delete</span>
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                        <button onClick={onClose} className="text-neutral-400 hover:text-white transition-colors"><X size={18}/></button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#0f0f0f]">
                    <div className="max-w-3xl mx-auto w-full p-12 pb-32">
                        <h1 className="text-4xl font-bold text-white mb-8 leading-tight">{task.title}</h1>

                        {/* Properties */}
                        <div className="grid grid-cols-1 gap-1 mb-12 border-b border-neutral-800 pb-8">
                            {/* Client */}
                            <div className="flex items-center py-1.5 group">
                                <div className="w-32 text-neutral-500 flex items-center gap-2 text-sm">
                                    <Briefcase size={14} /> Customer
                                </div>
                                <div className="flex-1 text-neutral-300 text-sm">
                                    <span className="text-neutral-500">{task.clientName || 'Internal'}</span>
                                </div>
                            </div>

                            {/* Status */}
                            <div className="flex items-center py-1.5 group">
                                <div className="w-32 text-neutral-500 flex items-center gap-2 text-sm">
                                    <Circle size={14} /> Status
                                </div>
                                <div className="flex-1 text-neutral-300 text-sm">
                                    <div className="flex items-center gap-2">
                                        <Circle size={12} className="text-neutral-500 stroke-dashed" /> {task.status}
                                    </div>
                                </div>
                            </div>

                            {/* Created By - Interactive */}
                            <CustomSelect
                                label="Created By"
                                icon={User}
                                value={task.created_by_id}
                                options={teamOptions}
                                onChange={handleUpdateCreatedBy}
                                type="user"
                                placeholder="Unknown"
                            />

                            {/* Assigned To - Interactive */}
                            <CustomSelect
                                label="Assignee"
                                icon={User}
                                value={task.assigned_to_id}
                                options={teamOptions}
                                onChange={handleUpdateAssignee}
                                type="user"
                                placeholder="Unassigned"
                            />

                            {/* Due Date */}
                            <div className="flex items-center py-1.5 group">
                                <div className="w-32 text-neutral-500 flex items-center gap-2 text-sm">
                                    <Calendar size={14} /> Due Date
                                </div>
                                <div className="flex-1 text-neutral-300 text-sm">
                                    <span className="text-neutral-500">{task.dueDate || 'Empty'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="prose prose-invert max-w-none text-neutral-300 space-y-6 min-h-[100px]">
                            {task.description ? (
                                <div className="whitespace-pre-wrap">{task.description}</div>
                            ) : (
                                <p className="text-neutral-600 italic text-sm">No description provided.</p>
                            )}
                        </div>

                        {/* Feed / Activity */}
                        <div className="mt-16 pt-8 border-t border-neutral-800">
                            <div className="flex items-center justify-between mb-8">
                                <span className="text-white font-bold">Feed</span>
                                <div className="flex bg-neutral-900 rounded p-1 gap-1">
                                    {/* Show assignee avatar */}
                                    <Avatar name={task.assigneeName || "S"} url={task.assigneeAvatar} size="xs" />
                                </div>
                            </div>

                            <div className="space-y-6 relative before:absolute before:left-3 before:top-2 before:bottom-0 before:w-px before:bg-neutral-800">
                                <div className="flex gap-4 relative">
                                    <div className="absolute left-0 z-10"><Avatar name={task.assigneeName || "System"} url={task.assigneeAvatar} size="sm" /></div>
                                    <div className="pl-10 pt-1">
                                        <div className="text-sm text-neutral-400"><span className="text-white font-medium">{task.assigneeName || "System"}</span> created the task <span className="text-neutral-600">• {task.created_at ? new Date(task.created_at).toLocaleDateString() : 'Just now'}</span></div>
                                    </div>
                                </div>

                                {task.comments && task.comments.map((c) => (
                                    <div key={c.id} className="flex gap-4 relative animate-fade-in group">
                                        <div className="absolute left-0 z-10">
                                            <Avatar name={c.authorName || "User"} url={c.authorAvatar} size="sm" />
                                        </div>
                                        <div className="pl-10 w-full">
                                            <div className="flex items-baseline gap-2 mb-1">
                                                <span className="text-sm font-bold text-white">{c.authorName || "User"}</span>
                                                <span className="text-xs text-neutral-600">{new Date(c.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                            </div>
                                            <div className="text-neutral-300 text-sm leading-relaxed bg-[#1a1a1a] p-3 rounded-lg rounded-tl-none border border-neutral-800">{c.content || c.text}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Input */}
                <div className="border-t border-neutral-800 bg-[#0f0f0f] p-6 pb-8 shrink-0">
                    <div className="max-w-3xl mx-auto bg-[#1a1a1a] border border-neutral-700 rounded-xl focus-within:border-neutral-500 transition-colors shadow-lg overflow-hidden">
                         <div className="flex items-center gap-4 px-4 py-2 border-b border-neutral-800/50">
                             <button className="text-white text-xs font-medium border-b-2 border-white pb-2 -mb-2.5">Comment</button>
                             <button className="text-neutral-500 text-xs font-medium hover:text-neutral-300 pb-0.5">Note</button>
                        </div>
                        <textarea 
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendComment(); }}}
                            placeholder="Leave a comment..."
                            className="w-full bg-transparent text-white text-sm p-4 focus:outline-none resize-none h-20 placeholder-neutral-600"
                        />
                        <div className="flex items-center justify-between px-4 py-2 bg-[#141414]">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 text-neutral-400 text-xs cursor-pointer hover:text-white">
                                    Request approval <ToggleLeft size={24} className="text-neutral-600" />
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button className="text-neutral-500 hover:text-white"><Paperclip size={16}/></button>
                                <button 
                                onClick={handleSendComment}
                                disabled={!comment.trim()}
                                className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${comment.trim() ? 'bg-white text-black' : 'bg-neutral-800 text-neutral-600 cursor-not-allowed'}`}
                                >
                                    Send
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};