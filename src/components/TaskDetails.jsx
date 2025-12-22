import React, { useState } from 'react';
import { 
  X, Circle, User, Calendar, Plus, MoreHorizontal, 
  Paperclip, Smile, Mic, Briefcase,
  Clock, CheckCircle2, Link as LinkIcon, ArrowUpRight, ToggleLeft 
} from 'lucide-react';
import { Avatar } from './Shared';
import { supabase } from '../supabaseClient'; 

export const TaskDetails = ({ task, onClose, onUpdate, team }) => {
    const [comment, setComment] = useState('');

    const properties = [
        // Added Client Field
        { label: 'Client', value: task.clientName || 'Internal', icon: Briefcase, type: 'text' },
        { label: 'Status', value: task.status, icon: Circle, type: 'badge' },
        { label: 'Assignee', value: task.assigneeName || 'Unassigned', icon: User, type: 'user', avatar: task.assigneeAvatar },
        { label: 'Due Date', value: task.dueDate || 'Empty', icon: Calendar, type: 'text' },
    ];

    const handleSendComment = async () => {
        if (!comment.trim()) return;
        
        try {
            const newCommentPayload = {
                content: comment,
                task_id: task.id,
                // author_designer_id: ... (Current user ID from Auth)
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
                authorName: 'You', // Placeholder until we have auth
                authorAvatar: null
            };

            const updatedComments = [...(task.comments || []), createdComment];
            onUpdate(task.id, { comments: updatedComments }); 
            setComment('');
        } catch (e) {
            console.error("Error posting comment:", e);
            alert("Failed to post comment");
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
                        <button className="text-neutral-400 hover:text-white transition-colors"><MoreHorizontal size={18}/></button>
                        <button onClick={onClose} className="text-neutral-400 hover:text-white transition-colors"><X size={18}/></button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#0f0f0f]">
                    <div className="max-w-3xl mx-auto w-full p-12 pb-32">
                        <h1 className="text-4xl font-bold text-white mb-8 leading-tight">{task.title}</h1>

                        {/* Properties */}
                        <div className="grid grid-cols-1 gap-1 mb-12 border-b border-neutral-800 pb-8">
                            {properties.map((prop, i) => (
                                <div key={i} className="flex items-center py-1.5 group">
                                    <div className="w-32 text-neutral-500 flex items-center gap-2 text-sm">
                                        <prop.icon size={14} /> {prop.label}
                                    </div>
                                    <div className="flex-1 text-neutral-300 text-sm hover:bg-neutral-900/50 p-1 rounded -ml-1 cursor-pointer transition-colors">
                                        {prop.type === 'user' && (
                                            <div className="flex items-center gap-2">
                                                <Avatar name={prop.value} url={prop.avatar} size="xs" /> {prop.value}
                                            </div>
                                        )}
                                        {prop.type === 'badge' && (
                                            <div className="flex items-center gap-2">
                                                <Circle size={12} className="text-neutral-500 stroke-dashed" /> {prop.value}
                                            </div>
                                        )}
                                        {prop.type === 'text' && <span className="text-neutral-500">{prop.value}</span>}
                                    </div>
                                </div>
                            ))}
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