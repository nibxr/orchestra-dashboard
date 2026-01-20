import React, { useState, useEffect } from 'react';
import {
  X, Circle, User, Calendar, Plus, MoreHorizontal,
  Paperclip, Smile, Mic, Briefcase,
  Clock, CheckCircle2, Link as LinkIcon, ArrowUpRight, ToggleLeft,
  Trash2, Archive, Copy, Edit3, Maximize2
} from 'lucide-react';
import { Avatar } from './Shared';
import { CustomSelect } from './CustomUI';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';
import { useConfirm } from './ConfirmModal';
import { ContentWithEmbeds, EmbedLinkButton } from './EmbedContent';
import { TextFormattingToolbar, applyFormatting } from './TextFormattingToolbar';

export const TaskDetails = ({ task, onClose, onUpdate, team, isFullPage = false }) => {
    const { user, teamMemberId, clientContactId } = useAuth();
    const toast = useToast();
    const { confirm } = useConfirm();
    const [comment, setComment] = useState('');
    const [commentType, setCommentType] = useState('comment'); // 'comment' or 'note'
    const [moreMenuOpen, setMoreMenuOpen] = useState(false);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editedTitle, setEditedTitle] = useState(task.title);
    const [isEditingDescription, setIsEditingDescription] = useState(false);
    const [editedDescription, setEditedDescription] = useState(task.description || '');
    const [editingCommentId, setEditingCommentId] = useState(null);
    const [editedCommentContent, setEditedCommentContent] = useState('');
    const commentTextareaRef = React.useRef(null);

    // Sync local state with task prop updates
    useEffect(() => {
        setEditedTitle(task.title);
        setEditedDescription(task.description || '');
        console.log('[TaskDetails] Task prop updated, comments count:', task.comments?.length);
    }, [task.title, task.description, task.comments]);

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
            toast.error(`Failed to update creator: ${e.message}`);
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
            toast.error(`Failed to update assignee: ${e.message}`);
        }
    };

    const handleFormatText = (formatType) => {
        const textarea = commentTextareaRef.current;
        if (!textarea) return;

        const cursorPosition = textarea.selectionStart;
        const { newText, newCursor } = applyFormatting(comment, cursorPosition, formatType);

        setComment(newText);

        // Restore cursor position after React updates
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(newCursor, newCursor);
        }, 0);
    };

    const handleSendComment = async () => {
        if (!comment.trim()) return;

        // Optimistically update UI first
        const tempId = `temp-${Date.now()}`;
        let authorName = 'Unknown';
        let authorAvatar = null;

        if (teamMemberId) {
            const designer = team?.find(t => t.id === teamMemberId);
            if (designer) {
                authorName = designer.full_name || designer.email;
                authorAvatar = designer.avatar_url;
            }
        } else if (clientContactId) {
            authorName = user.user_metadata?.full_name || user.email;
            authorAvatar = user.user_metadata?.avatar_url || null;
        }

        const optimisticComment = {
            id: tempId,
            content: comment,
            task_id: task.id,
            author_designer_id: teamMemberId || null,
            author_contact_id: clientContactId || null,
            orchestra_comment_id: `COM-${Date.now()}`,
            created_at: new Date().toISOString(),
            authorName,
            authorAvatar,
            is_note: commentType === 'note'
        };

        const updatedComments = [...(task.comments || []), optimisticComment];
        onUpdate(task.id, { comments: updatedComments });
        setComment('');

        try {
            const newCommentPayload = {
                content: optimisticComment.content,
                task_id: task.id,
                author_designer_id: teamMemberId || null,
                author_contact_id: clientContactId || null,
                orchestra_comment_id: optimisticComment.orchestra_comment_id,
                created_at: optimisticComment.created_at,
                is_note: commentType === 'note'
            };

            const { data, error } = await supabase
                .from('comments')
                .insert([newCommentPayload])
                .select();

            if (error) throw error;

            // Replace temp comment with real one
            const realComment = {
                ...data[0],
                authorName,
                authorAvatar
            };
            const finalComments = updatedComments.map(c => c.id === tempId ? realComment : c);
            onUpdate(task.id, { comments: finalComments });

            toast.success(commentType === 'note' ? 'Note added' : 'Comment posted');
        } catch (e) {
            console.error("Error posting comment:", e);
            // Remove optimistic comment on error
            const revertedComments = updatedComments.filter(c => c.id !== tempId);
            onUpdate(task.id, { comments: revertedComments });
            toast.error(commentType === 'note' ? 'Failed to add note' : 'Failed to post comment');
        }
    };

    const handleDeleteTask = async () => {
        const confirmed = await confirm({
            title: 'Delete Task',
            message: 'Are you sure you want to delete this task? This action cannot be undone.',
            confirmText: 'Delete',
            cancelText: 'Cancel',
            variant: 'danger'
        });

        if (!confirmed) return;

        try {
            const { error } = await supabase
                .from('tasks')
                .delete()
                .eq('id', task.id);

            if (error) throw error;

            toast.success('Task deleted successfully');
            onClose();
            window.location.reload(); // Refresh to update task list
        } catch (e) {
            console.error("Error deleting task:", e);
            toast.error(`Failed to delete task: ${e.message}`);
        }
    };

    const handleArchiveTask = async () => {
        try {
            const { error } = await supabase
                .from('tasks')
                .update({ archived_at: new Date().toISOString() })
                .eq('id', task.id);

            if (error) throw error;

            toast.success('Task archived successfully');
            onClose();
            window.location.reload();
        } catch (e) {
            console.error("Error archiving task:", e);
            toast.error(`Failed to archive task: ${e.message}`);
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

            toast.success('Task duplicated successfully');
            window.location.reload();
        } catch (e) {
            console.error("Error duplicating task:", e);
            toast.error(`Failed to duplicate task: ${e.message}`);
        }
    };

    const handleUpdateTitle = async () => {
        if (!editedTitle.trim() || editedTitle === task.title) {
            setIsEditingTitle(false);
            setEditedTitle(task.title);
            return;
        }

        try {
            // Let parent handle the database update
            await onUpdate(task.id, { title: editedTitle });
            setIsEditingTitle(false);
            toast.success('Task title updated');
        } catch (e) {
            console.error("Error updating title:", e);
            toast.error(`Failed to update title: ${e.message}`);
        }
    };

    const handleUpdateDescription = async () => {
        if (editedDescription === task.description) {
            setIsEditingDescription(false);
            return;
        }

        try {
            // Let parent handle the database update
            await onUpdate(task.id, { description: editedDescription });
            setIsEditingDescription(false);
            toast.success('Task description updated');
        } catch (e) {
            console.error("Error updating description:", e);
            toast.error(`Failed to update description: ${e.message}`);
        }
    };

    const handleStartEditComment = (commentId, currentContent) => {
        setEditingCommentId(commentId);
        setEditedCommentContent(currentContent);
    };

    const handleCancelEditComment = () => {
        setEditingCommentId(null);
        setEditedCommentContent('');
    };

    const handleUpdateComment = async (commentId) => {
        if (!editedCommentContent.trim()) {
            handleCancelEditComment();
            return;
        }

        // Optimistically update UI first
        const previousComments = [...task.comments];
        const updatedComments = task.comments.map(c =>
            c.id === commentId ? { ...c, content: editedCommentContent, text: editedCommentContent } : c
        );
        onUpdate(task.id, { comments: updatedComments });
        handleCancelEditComment();

        try {
            const { error } = await supabase
                .from('comments')
                .update({ content: editedCommentContent })
                .eq('id', commentId);

            if (error) throw error;

            toast.success('Comment updated');
        } catch (e) {
            console.error("Error updating comment:", e);
            // Revert on error
            onUpdate(task.id, { comments: previousComments });
            toast.error(`Failed to update comment: ${e.message}`);
        }
    };

    const handleDeleteComment = async (commentId) => {
        const confirmed = await confirm({
            title: 'Delete Comment',
            message: 'Are you sure you want to delete this comment?',
            confirmText: 'Delete',
            cancelText: 'Cancel',
            variant: 'danger'
        });

        if (!confirmed) return;

        // Optimistically update UI first
        const previousComments = [...task.comments];
        const updatedComments = task.comments.filter(c => c.id !== commentId);
        onUpdate(task.id, { comments: updatedComments });

        try {
            const { error } = await supabase
                .from('comments')
                .delete()
                .eq('id', commentId);

            if (error) throw error;

            toast.success('Comment deleted');
        } catch (e) {
            console.error("Error deleting comment:", e);
            // Revert on error
            onUpdate(task.id, { comments: previousComments });
            toast.error(`Failed to delete comment: ${e.message}`);
        }
    };

    return (
        <div
            className={isFullPage ? "w-full h-screen bg-[#0f0f0f]" : "fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in"}
            onClick={isFullPage ? undefined : onClose}
        >
            <div
                className={isFullPage ? "w-full h-full bg-[#0f0f0f] flex flex-col" : "w-full max-w-4xl h-full bg-[#0f0f0f] shadow-2xl border-l border-neutral-800 flex flex-col animate-slide-in-right"}
                onClick={isFullPage ? undefined : e => e.stopPropagation()}
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
                        {/* Open Full Task Button - Only show in sidebar mode */}
                        {!isFullPage && (
                            <a
                                href={`/task/${task.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 mb-6 text-sm text-neutral-400 hover:text-white transition-colors group"
                            >
                                <Maximize2 size={16} className="group-hover:scale-110 transition-transform" />
                                <span>Open full task</span>
                                <ArrowUpRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                            </a>
                        )}

                        {isEditingTitle ? (
                            <div className="mb-8">
                                <textarea
                                    value={editedTitle}
                                    onChange={(e) => setEditedTitle(e.target.value)}
                                    onBlur={handleUpdateTitle}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleUpdateTitle();
                                        }
                                        if (e.key === 'Escape') {
                                            setEditedTitle(task.title);
                                            setIsEditingTitle(false);
                                        }
                                    }}
                                    autoFocus
                                    className="w-full text-4xl font-bold text-white bg-transparent border border-neutral-700 rounded-lg p-3 focus:outline-none focus:border-neutral-500 resize-none leading-tight"
                                    rows={2}
                                />
                            </div>
                        ) : (
                            <div className="group mb-8 flex items-start gap-3">
                                <h1 className="text-4xl font-bold text-white leading-tight flex-1">{task.title}</h1>
                                <button
                                    onClick={() => setIsEditingTitle(true)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-neutral-500 hover:text-white p-2 rounded"
                                >
                                    <Edit3 size={18} />
                                </button>
                            </div>
                        )}

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

                        {isEditingDescription ? (
                            <div className="mb-12 space-y-3">
                                <textarea
                                    value={editedDescription}
                                    onChange={(e) => setEditedDescription(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Escape') {
                                            setEditedDescription(task.description || '');
                                            setIsEditingDescription(false);
                                        }
                                    }}
                                    autoFocus
                                    placeholder="Add a description..."
                                    className="w-full text-neutral-300 bg-transparent border border-neutral-700 rounded-lg p-4 focus:outline-none focus:border-neutral-500 resize-none min-h-[100px]"
                                    rows={6}
                                />
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <EmbedLinkButton onInsert={(url) => setEditedDescription(prev => prev + (prev ? '\n\n' : '') + url)} />
                                        <span className="text-xs text-neutral-500">Add YouTube, Figma, Loom, or other links</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleUpdateDescription}
                                            className="px-3 py-1.5 bg-white text-black text-xs font-bold rounded hover:bg-neutral-200"
                                        >
                                            Save
                                        </button>
                                        <button
                                            onClick={() => {
                                                setEditedDescription(task.description || '');
                                                setIsEditingDescription(false);
                                            }}
                                            className="px-3 py-1.5 bg-neutral-800 text-neutral-300 text-xs font-bold rounded hover:bg-neutral-700"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="group mb-12">
                                <div className="prose prose-invert max-w-none text-neutral-300 space-y-6 min-h-[100px] relative">
                                    {task.description ? (
                                        <ContentWithEmbeds content={task.description} />
                                    ) : (
                                        <p className="text-neutral-600 italic text-sm">No description provided.</p>
                                    )}
                                    <button
                                        onClick={() => setIsEditingDescription(true)}
                                        className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity text-neutral-500 hover:text-white p-2 rounded"
                                    >
                                        <Edit3 size={16} />
                                    </button>
                                </div>
                            </div>
                        )}

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

                                {task.comments && task.comments.map((c) => {
                                    const isOwnComment = (teamMemberId && c.author_designer_id === teamMemberId) ||
                                                        (clientContactId && c.author_contact_id === clientContactId);
                                    const isEditingThisComment = editingCommentId === c.id;
                                    const isNote = c.is_note === true;

                                    return (
                                        <div key={c.id} className="flex gap-4 relative animate-fade-in group">
                                            <div className="absolute left-0 z-10">
                                                <Avatar name={c.authorName || "User"} url={c.authorAvatar} size="sm" />
                                            </div>
                                            <div className="pl-10 w-full">
                                                <div className="flex items-baseline gap-2 mb-1">
                                                    <span className="text-sm font-bold text-white">{c.authorName || "User"}</span>
                                                    {isNote && <span className="text-xs text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded">🔒 Note</span>}
                                                    <span className="text-xs text-neutral-600">{new Date(c.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                </div>
                                                {isEditingThisComment ? (
                                                    <div className="space-y-2">
                                                        <textarea
                                                            value={editedCommentContent}
                                                            onChange={(e) => setEditedCommentContent(e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                                    e.preventDefault();
                                                                    handleUpdateComment(c.id);
                                                                }
                                                                if (e.key === 'Escape') {
                                                                    handleCancelEditComment();
                                                                }
                                                            }}
                                                            autoFocus
                                                            className="w-full text-neutral-300 text-sm leading-relaxed bg-[#1a1a1a] p-3 rounded-lg border border-neutral-700 focus:outline-none focus:border-neutral-500 resize-none"
                                                            rows={3}
                                                        />
                                                        <div className="flex items-center justify-between">
                                                            <EmbedLinkButton onInsert={(url) => setEditedCommentContent(prev => prev + (prev ? '\n' : '') + url)} />
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => handleUpdateComment(c.id)}
                                                                    className="px-3 py-1.5 bg-white text-black text-xs font-bold rounded hover:bg-neutral-200"
                                                                >
                                                                    Save
                                                                </button>
                                                                <button
                                                                    onClick={handleCancelEditComment}
                                                                    className="px-3 py-1.5 bg-neutral-800 text-neutral-300 text-xs font-bold rounded hover:bg-neutral-700"
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="relative group/comment">
                                                        <div className="text-neutral-300 text-sm leading-relaxed bg-[#1a1a1a] p-3 rounded-lg rounded-tl-none border border-neutral-800">
                                                            <ContentWithEmbeds content={c.content || c.text || ''} />
                                                        </div>
                                                        {isOwnComment && (
                                                            <div className="absolute top-2 right-2 opacity-0 group-hover/comment:opacity-100 transition-opacity flex gap-1">
                                                                <button
                                                                    onClick={() => handleStartEditComment(c.id, c.content || c.text || '')}
                                                                    className="text-neutral-500 hover:text-white p-1 rounded bg-[#0f0f0f]"
                                                                    title="Edit comment"
                                                                >
                                                                    <Edit3 size={14} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteComment(c.id)}
                                                                    className="text-neutral-500 hover:text-red-400 p-1 rounded bg-[#0f0f0f]"
                                                                    title="Delete comment"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Input */}
                <div className="border-t border-neutral-800 bg-[#0f0f0f] p-6 pb-8 shrink-0">
                    <div className="max-w-3xl mx-auto bg-[#1a1a1a] border border-neutral-700 rounded-xl focus-within:border-neutral-500 transition-colors shadow-lg overflow-hidden">
                         <div className="flex items-center gap-4 px-4 py-2 border-b border-neutral-800/50">
                             <button
                                onClick={() => setCommentType('comment')}
                                className={`text-xs font-medium pb-2 -mb-2.5 transition-colors ${commentType === 'comment' ? 'text-white border-b-2 border-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                             >
                                Comment
                             </button>
                             <button
                                onClick={() => setCommentType('note')}
                                className={`text-xs font-medium pb-2 -mb-2.5 transition-colors ${commentType === 'note' ? 'text-white border-b-2 border-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                             >
                                Note
                             </button>
                        </div>
                        <textarea
                            ref={commentTextareaRef}
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendComment(); }}}
                            placeholder={commentType === 'note' ? 'Add a private note...' : 'Leave a comment...'}
                            className="w-full bg-transparent text-white text-sm p-4 focus:outline-none resize-none h-20 placeholder-neutral-600"
                        />
                        <div className="flex items-center justify-between px-4 py-2 bg-[#141414]">
                            <div className="flex items-center gap-3">
                                {commentType === 'note' && (
                                    <span className="text-xs text-neutral-500">🔒 Only visible to team members</span>
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                <TextFormattingToolbar onFormat={handleFormatText} />
                                <EmbedLinkButton onInsert={(url) => setComment(prev => prev + (prev ? '\n' : '') + url)} />
                                <button
                                onClick={handleSendComment}
                                disabled={!comment.trim()}
                                className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${comment.trim() ? 'bg-white text-black hover:bg-neutral-200' : 'bg-neutral-800 text-neutral-600 cursor-not-allowed'}`}
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