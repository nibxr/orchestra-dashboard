import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X, Circle, User, Calendar, Plus, MoreHorizontal,
  Paperclip, Smile, Mic, Briefcase,
  Clock, CheckCircle2, Link as LinkIcon, ArrowUpRight, ToggleLeft,
  Trash2, Archive, Copy, Edit3, Maximize2, Star, FileText, AlertTriangle,
  Cat, UtensilsCrossed, Car, PartyPopper, Music, Flag
} from 'lucide-react';

// Emoji data organized by category
const emojiCategories = {
  recent: { icon: Clock, label: 'Recent', emojis: ['😀', '👍', '❤️', '🎉', '✅', '🔥', '💯', '🚀'] },
  smileys: {
    icon: Smile,
    label: 'Smileys & People',
    emojis: [
      '😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂',
      '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋',
      '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐',
      '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '😮', '🥱',
      '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞',
      '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤝', '🙏', '💪'
    ]
  },
  animals: {
    icon: Cat,
    label: 'Animals & Nature',
    emojis: [
      '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
      '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆',
      '🌸', '💐', '🌷', '🌹', '🌺', '🌻', '🌼', '🍀', '🌿', '🍃'
    ]
  },
  food: {
    icon: UtensilsCrossed,
    label: 'Food & Drink',
    emojis: [
      '🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍒', '🍑',
      '🍕', '🍔', '🍟', '🌭', '🥪', '🍿', '☕', '🍺', '🍷', '🧃'
    ]
  },
  activities: {
    icon: PartyPopper,
    label: 'Activities',
    emojis: [
      '⚽', '🏀', '🏈', '⚾', '🎾', '🎮', '🎯', '🎲', '🎨', '🎭',
      '🎉', '🎊', '🎁', '🏆', '🥇', '🥈', '🥉', '🎪', '🎡', '🎢'
    ]
  },
  symbols: {
    icon: Flag,
    label: 'Symbols',
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔', '❣️',
      '✅', '❌', '⭐', '🌟', '💫', '⚡', '🔥', '💯', '✨', '💥',
      '📌', '📍', '🚩', '🏁', '🔴', '🟡', '🟢', '🔵', '⬛', '⬜'
    ]
  }
};
import { Avatar } from './Shared';
import { CustomSelect, MultiSelectUsers } from './CustomUI';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';
import { useConfirm } from './ConfirmModal';
import { ContentWithEmbeds, EmbedLinkButton } from './EmbedContent';
import { TextFormattingToolbar, applyFormatting } from './TextFormattingToolbar';
import { DeliverablesForm } from './DeliverablesForm';
import { formatDueDate, getDueDateStatus } from '../utils/dateUtils';
import { createVersion } from '../utils/versionService';
import FigmaImportModal from './FigmaImportModal';
import { extractFigmaFileKey } from '../utils/figmaService';

export const TaskDetails = ({ task, onClose, onUpdate, team, isFullPage = false, isModal = false }) => {
    const taskNavigate = useNavigate();
    const { user, teamMemberId, clientContactId } = useAuth();
    const isCustomer = !teamMemberId && !!clientContactId;
    const toast = useToast();
    const { confirm } = useConfirm();
    const [comment, setComment] = useState('');
    const [commentType, setCommentType] = useState('comment'); // 'comment' or 'note'
    const [activeTab, setActiveTab] = useState('comments'); // 'comments' or 'notes'
    const [moreMenuOpen, setMoreMenuOpen] = useState(false);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editedTitle, setEditedTitle] = useState(task.title);
    const [isEditingDescription, setIsEditingDescription] = useState(false);
    const [editedDescription, setEditedDescription] = useState(task.description || '');
    const [editingCommentId, setEditingCommentId] = useState(null);
    const [editedCommentContent, setEditedCommentContent] = useState('');
    const commentTextareaRef = useRef(null);
    const emojiButtonRef = useRef(null);
    const [isDeliverablesFormOpen, setIsDeliverablesFormOpen] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [activeEmojiCategory, setActiveEmojiCategory] = useState('recent');
    const [hasDeliverable, setHasDeliverable] = useState(false);
    const [isAddingDesignLink, setIsAddingDesignLink] = useState(false);
    const [designLinkInput, setDesignLinkInput] = useState('');
    const [hasVersions, setHasVersions] = useState(false);
    const [isFigmaImportOpen, setIsFigmaImportOpen] = useState(false);

    // Sync local state with task prop updates
    useEffect(() => {
        setEditedTitle(task.title);
        setEditedDescription(task.description || '');
        console.log('[TaskDetails] Task prop updated, comments count:', task.comments?.length);
    }, [task.title, task.description, task.comments]);

    // Check if task has a deliverable record
    useEffect(() => {
        const checkDeliverable = async () => {
            if (!task?.id) return;
            const { data } = await supabase
                .from('deliverables')
                .select('id')
                .eq('task_id', task.id)
                .maybeSingle();
            setHasDeliverable(!!data);
        };
        checkDeliverable();
    }, [task?.id]);

    // Check if task has any versions
    useEffect(() => {
        const checkVersions = async () => {
            if (!task?.id) return;
            const { data } = await supabase
                .from('versions')
                .select('id')
                .eq('task_id', task.id)
                .limit(1);
            setHasVersions(data && data.length > 0);
        };
        checkVersions();
    }, [task?.id]);

    const handleAddDesignLink = async () => {
        if (!designLinkInput.trim()) return;

        const url = designLinkInput.trim();

        // Check if it's a Figma URL - if so, open the Figma import modal
        const figmaFileKey = extractFigmaFileKey(url);
        if (figmaFileKey) {
            // It's a Figma URL, open the import modal
            setIsFigmaImportOpen(true);
            return;
        }

        // For non-Figma URLs, just create a simple version
        try {
            const { error } = await createVersion(
                task.id,
                url,
                'Version 1',
                user?.id
            );

            if (error) throw error;

            setHasVersions(true);
            setIsAddingDesignLink(false);
            setDesignLinkInput('');
            toast.success('Design link added - Version 1 created');
        } catch (e) {
            console.error('Error creating version:', e);
            toast.error(`Failed to add design link: ${e.message}`);
        }
    };

    const handleFigmaImportComplete = (version, importedFrames) => {
        setHasVersions(true);
        setIsAddingDesignLink(false);
        setDesignLinkInput('');
        toast.success(`Imported ${importedFrames?.length || 0} frames from Figma`);
        // Navigate to the design review page
        taskNavigate(`/task/${task.id}`);
    };

    // Find creator from team
    // Prioritize created_by_team_id, then fall back to created_by_id or properties.createdById
    const createdById = task.created_by_team_id || task.properties?.createdById;
    const creator = team?.find(t => t.id === createdById);
    const creatorName = task.creatorName || creator?.full_name || 'Unknown';
    const creatorAvatar = task.creatorAvatar || creator?.avatar_url;

    // Co-creator lookup
    const coCreatorId = task.co_creator_team_id;
    const coCreator = team?.find(t => t.id === coCreatorId);

    // Helper lookup
    const helperMember = team?.find(t => t.id === task.helper_id);
    const helperName = helperMember?.full_name || null;

    // Prepare team options for created_by and assigned_to selectors
    const teamOptions = team?.map(member => ({
        value: member.id,
        label: member.full_name || member.email || 'Unknown',
        avatar: member.avatar_url
    })) || [];

    console.log('[TaskDetails] Team prop:', team);
    console.log('[TaskDetails] Team options:', teamOptions);
    console.log('[TaskDetails] Current created_by_id:', createdById);
    console.log('[TaskDetails] Current assigned_to_id:', task.assigned_to_id);
    console.log('[TaskDetails] Task assigneeName:', task.assigneeName);
    console.log('[TaskDetails] Task creatorName:', task.creatorName);

    const handleUpdateCreatedBy = async (newCreatedById) => {
        try {
            // Update created_by_team_id since we're selecting from team members
            const { error } = await supabase
                .from('tasks')
                .update({
                    created_by_team_id: newCreatedById
                })
                .eq('id', task.id);

            if (error) throw error;

            const newCreator = team?.find(t => t.id === newCreatedById);
            onUpdate(task.id, {
                created_by_team_id: newCreatedById,
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

    const handleUpdateHelper = async (newHelperId) => {
        try {
            const { error } = await supabase
                .from('tasks')
                .update({ helper_id: newHelperId })
                .eq('id', task.id);

            if (error) throw error;

            const newHelper = team?.find(t => t.id === newHelperId);
            onUpdate(task.id, {
                helper_id: newHelperId,
                helperName: newHelper?.full_name,
                helperAvatar: newHelper?.avatar_url
            });
        } catch (e) {
            console.error("Error updating helper:", e);
            toast.error(`Failed to update helper: ${e.message}`);
        }
    };

    const handleUpdateCreatedByMulti = async (newValues) => {
        try {
            const primaryId = newValues[0] || null;
            const coId = newValues[1] || null;
            const { error } = await supabase
                .from('tasks')
                .update({
                    created_by_team_id: primaryId,
                    co_creator_team_id: coId
                })
                .eq('id', task.id);

            if (error) throw error;

            const primary = team?.find(t => t.id === primaryId);
            const co = team?.find(t => t.id === coId);
            onUpdate(task.id, {
                created_by_team_id: primaryId,
                co_creator_team_id: coId,
                creatorName: primary?.full_name,
                creatorAvatar: primary?.avatar_url,
                coCreatorName: co?.full_name || null,
                coCreatorAvatar: co?.avatar_url || null
            });
        } catch (e) {
            console.error("Error updating creators:", e);
            toast.error(`Failed to update creators: ${e.message}`);
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

    const handleInsertEmoji = (emoji) => {
        const textarea = commentTextareaRef.current;
        if (!textarea) {
            setComment(prev => prev + emoji);
            return;
        }

        const cursorPosition = textarea.selectionStart;
        const before = comment.slice(0, cursorPosition);
        const after = comment.slice(cursorPosition);
        const newText = before + emoji + after;
        const newCursor = cursorPosition + emoji.length;

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
                version_id: null, // Task-level comment (no version)
                author_designer_id: teamMemberId || null,
                author_contact_id: clientContactId || null,
                orchestra_comment_id: optimisticComment.orchestra_comment_id,
                created_at: optimisticComment.created_at,
                is_note: commentType === 'note'
            };

            console.log('[TaskDetails] Inserting comment:', newCommentPayload);

            const { data, error } = await supabase
                .from('comments')
                .insert([newCommentPayload])
                .select();

            console.log('[TaskDetails] Insert result - data:', data, 'error:', error);

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
                helper_id: task.helper_id,
                membership_id: task.membership_id,
                created_by_id: user?.id,
                created_by_team_id: task.created_by_team_id,
                co_creator_team_id: task.co_creator_team_id,
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

    // Determine container classes based on mode
    const getContainerClasses = () => {
        if (isModal) {
            // Modal mode - fill parent container with proper overflow control
            return "w-full h-full bg-[#0f0f0f] theme-bg-primary overflow-hidden";
        }
        if (isFullPage) {
            return "w-full h-screen bg-[#0f0f0f] overflow-hidden";
        }
        // Slide-in panel mode
        return "fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in";
    };

    const getInnerClasses = () => {
        if (isModal) {
            return "w-full h-full bg-[#0f0f0f] theme-bg-primary flex flex-col overflow-hidden";
        }
        if (isFullPage) {
            return "w-full h-full bg-[#0f0f0f] flex flex-col overflow-hidden";
        }
        return "w-full max-w-4xl h-full bg-[#0f0f0f] shadow-2xl border-l border-neutral-800 flex flex-col animate-slide-in-right";
    };

    return (
        <div
            className={getContainerClasses()}
            onClick={isFullPage || isModal ? undefined : onClose}
        >
            <div
                className={getInnerClasses()}
                onClick={isFullPage || isModal ? undefined : e => e.stopPropagation()}
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
                        {!isCustomer && (
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
                        )}
                        <button onClick={onClose} className="text-neutral-400 hover:text-white transition-colors"><X size={18}/></button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar bg-[#0f0f0f]">
                    <div className="max-w-3xl mx-auto w-full p-12 pb-32">
                        {/* Open Full Task Button - Show in modal mode to allow opening in new tab */}
                        {isModal && (
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

                            {/* Created By - Multi-select */}
                            {!isCustomer && (
                            <MultiSelectUsers
                                label="Created By"
                                icon={User}
                                values={[createdById, coCreatorId].filter(Boolean)}
                                options={teamOptions}
                                onChange={handleUpdateCreatedByMulti}
                                placeholder="Unknown"
                                maxSelections={2}
                                searchable
                            />
                            )}

                            {/* Assigned To / Lead Designer - Interactive */}
                            {isCustomer ? (
                                <div className="flex items-center py-1.5 px-2 group">
                                    <div className="flex items-center gap-2 text-neutral-500 w-32"><Star size={14} /><span className="text-sm">Designer</span></div>
                                    <span className="text-sm text-neutral-600 dark:text-neutral-300">{task.assigneeName || 'Unassigned'}</span>
                                </div>
                            ) : (
                            <CustomSelect
                                label="Designer"
                                icon={Star}
                                value={task.assigned_to_id}
                                options={teamOptions}
                                onChange={handleUpdateAssignee}
                                type="user"
                                placeholder="Unassigned"
                                displayName={task.assigneeName}
                            />
                            )}

                            {/* Helper - Interactive */}
                            {!isCustomer && (
                            <CustomSelect
                                label="Helper"
                                icon={User}
                                value={task.helper_id}
                                options={teamOptions}
                                onChange={handleUpdateHelper}
                                type="user"
                                placeholder="No helper"
                                displayName={helperName}
                            />
                            )}

                            {/* Due Date - shows manual due date or auto-calculated */}
                            <div className="flex items-center py-1.5 group">
                                <div className="w-32 text-neutral-500 flex items-center gap-2 text-sm">
                                    <Calendar size={14} /> Due Date
                                </div>
                                <div className="flex-1 text-neutral-300 text-sm">
                                    {(() => {
                                        // Check for auto-calculated due_date first, then manual dueDate
                                        const effectiveDueDate = task.due_date || task.dueDate || task.properties?.dueDate || task.delivered_at;

                                        if (effectiveDueDate) {
                                            const dueDateInfo = formatDueDate(effectiveDueDate, task.status);
                                            const dueDateStatus = getDueDateStatus(effectiveDueDate);
                                            const isOverdue = dueDateStatus === 'overdue' && task.status === 'Active Task';
                                            const isDueSoon = dueDateStatus === 'due-soon' && task.status === 'Active Task';

                                            return (
                                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded ${
                                                    isOverdue ? 'text-red-400 bg-red-500/10' :
                                                    isDueSoon ? 'text-orange-400 bg-orange-500/10' :
                                                    'text-neutral-400'
                                                }`}>
                                                    {isOverdue && <AlertTriangle size={12} />}
                                                    {dueDateInfo.text || new Date(effectiveDueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </span>
                                            );
                                        }

                                        return <span className="text-neutral-500">Empty</span>;
                                    })()}
                                </div>
                            </div>

                            {/* Add Design Link - only show if task has no versions and user is not a customer */}
                            {!isCustomer && !hasVersions && (
                                <div className="flex items-center py-1.5 group">
                                    <div className="w-32 text-neutral-500 flex items-center gap-2 text-sm">
                                        <LinkIcon size={14} /> Design Link
                                    </div>
                                    <div className="flex-1">
                                        {isAddingDesignLink ? (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="url"
                                                    value={designLinkInput}
                                                    onChange={(e) => setDesignLinkInput(e.target.value)}
                                                    placeholder="Paste Figma, Loom, or other link..."
                                                    className="flex-1 bg-neutral-900 border border-neutral-700 rounded px-3 py-1.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-500"
                                                    autoFocus
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            handleAddDesignLink();
                                                        }
                                                        if (e.key === 'Escape') {
                                                            setIsAddingDesignLink(false);
                                                            setDesignLinkInput('');
                                                        }
                                                    }}
                                                />
                                                <button
                                                    onClick={handleAddDesignLink}
                                                    disabled={!designLinkInput.trim()}
                                                    className="px-3 py-1.5 bg-lime-500 text-black text-xs font-bold rounded hover:bg-lime-400 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    Add
                                                </button>
                                                <button
                                                    onClick={() => { setIsAddingDesignLink(false); setDesignLinkInput(''); }}
                                                    className="px-2 py-1.5 text-neutral-500 hover:text-white text-xs"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setIsAddingDesignLink(true)}
                                                className="text-sm text-neutral-500 hover:text-lime-400 flex items-center gap-1 transition-colors"
                                            >
                                                <Plus size={14} /> Add design link
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
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
                            <div className="flex items-center gap-6 mb-8">
                                <button
                                    onClick={() => { setActiveTab('comments'); setCommentType('comment'); }}
                                    className={`text-sm font-bold pb-1 border-b-2 transition-colors ${
                                        activeTab === 'comments'
                                            ? 'text-white border-white'
                                            : 'text-neutral-500 border-transparent hover:text-neutral-300'
                                    }`}
                                >
                                    Comments
                                </button>
                                {teamMemberId && (
                                    <button
                                        onClick={() => { setActiveTab('notes'); setCommentType('note'); }}
                                        className={`text-sm font-bold pb-1 border-b-2 transition-colors ${
                                            activeTab === 'notes'
                                                ? 'text-white border-white'
                                                : 'text-neutral-500 border-transparent hover:text-neutral-300'
                                        }`}
                                    >
                                        Notes
                                    </button>
                                )}
                            </div>

                            <div className="space-y-6 relative before:absolute before:left-3 before:top-2 before:bottom-0 before:w-px before:bg-neutral-800">
                                {activeTab === 'comments' && (
                                    <div className="flex gap-4 relative">
                                        <div className="absolute left-0 z-10"><Avatar name={task.assigneeName || "System"} url={task.assigneeAvatar} size="sm" /></div>
                                        <div className="pl-10 pt-1">
                                            <div className="text-sm text-neutral-400"><span className="text-white font-medium">{task.assigneeName || "System"}</span> created the task <span className="text-neutral-600">• {task.created_at ? new Date(task.created_at).toLocaleDateString() : 'Just now'}</span></div>
                                        </div>
                                    </div>
                                )}

                                {(() => {
                                    const filteredComments = (task.comments || []).filter(c =>
                                        activeTab === 'notes' ? c.is_note === true : c.is_note !== true
                                    );
                                    if (filteredComments.length === 0 && activeTab === 'notes') {
                                        return (
                                            <div className="text-center py-12">
                                                <div className="text-neutral-600 text-sm">No notes yet</div>
                                                <div className="text-neutral-700 text-xs mt-1">Add internal notes visible only to team members</div>
                                            </div>
                                        );
                                    }
                                    if (filteredComments.length === 0 && activeTab === 'comments') {
                                        return (
                                            <div className="text-center py-8">
                                                <div className="text-neutral-600 text-sm">No comments yet</div>
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}

                                {(task.comments || []).filter(c => activeTab === 'notes' ? c.is_note === true : c.is_note !== true).map((c) => {
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

                        {/* Deliverables Button - For team members */}
                        {teamMemberId && (
                            <div className="mt-12 pt-8 border-t border-neutral-800">
                                <button
                                    onClick={() => setIsDeliverablesFormOpen(true)}
                                    className={`w-full flex items-center justify-between p-4 rounded-lg border transition-all ${
                                        hasDeliverable
                                            ? 'bg-lime-500/5 border-lime-500/20 hover:border-lime-500/40'
                                            : 'bg-neutral-900/50 border-neutral-800 hover:border-neutral-600'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                            hasDeliverable ? 'bg-lime-500/10' : 'bg-neutral-800'
                                        }`}>
                                            <FileText size={20} className={hasDeliverable ? 'text-lime-400' : 'text-neutral-400'} />
                                        </div>
                                        <div className="text-left">
                                            <span className="text-sm font-medium text-white">Deliverables Form</span>
                                            <p className="text-xs text-neutral-500 mt-0.5">
                                                {hasDeliverable ? 'Form completed - Click to edit' : 'Fill out when completing the task'}
                                            </p>
                                        </div>
                                    </div>
                                    {hasDeliverable ? (
                                        <span className="text-xs text-lime-400 bg-lime-500/10 px-2 py-1 rounded">Completed</span>
                                    ) : (
                                        <span className="text-xs text-neutral-500">→</span>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Input */}
                <div className="border-t border-neutral-800 bg-[#0f0f0f] p-6 pb-8 shrink-0">
                    <div className="max-w-3xl mx-auto bg-[#1a1a1a] border border-neutral-700 rounded-xl focus-within:border-neutral-500 transition-colors shadow-lg overflow-hidden">
                         {activeTab === 'notes' && (
                             <div className="flex items-center gap-2 px-4 py-2 border-b border-neutral-800/50">
                                 <span className="text-xs text-neutral-500">🔒 Only visible to team members</span>
                             </div>
                         )}
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
                            </div>
                            <div className="flex items-center gap-3">
                                <TextFormattingToolbar onFormat={handleFormatText} />
                                <EmbedLinkButton onInsert={(url) => setComment(prev => prev + (prev ? '\n' : '') + url)} />

                                {/* Emoji Picker */}
                                <div className="relative">
                                    <button
                                        ref={emojiButtonRef}
                                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                        className={`p-1.5 rounded transition-colors ${showEmojiPicker ? 'text-white bg-neutral-700' : 'text-neutral-500 hover:text-white hover:bg-neutral-800'}`}
                                        title="Add emoji"
                                    >
                                        <Smile size={16} />
                                    </button>
                                    {showEmojiPicker && (
                                        <>
                                            <div
                                                className="fixed inset-0 z-40"
                                                onClick={() => setShowEmojiPicker(false)}
                                            />
                                            <div className="absolute bottom-full right-0 mb-2 w-72 bg-[#1a1a1a] border border-neutral-700 rounded-lg shadow-2xl z-50 overflow-hidden">
                                                {/* Category tabs */}
                                                <div className="flex items-center gap-1 p-2 border-b border-neutral-800 overflow-x-auto">
                                                    {Object.entries(emojiCategories).map(([key, category]) => (
                                                        <button
                                                            key={key}
                                                            onClick={() => setActiveEmojiCategory(key)}
                                                            className={`p-1.5 rounded transition-colors flex-shrink-0 ${
                                                                activeEmojiCategory === key
                                                                    ? 'bg-neutral-700 text-white'
                                                                    : 'text-neutral-500 hover:text-white hover:bg-neutral-800'
                                                            }`}
                                                            title={category.label}
                                                        >
                                                            <category.icon size={16} />
                                                        </button>
                                                    ))}
                                                </div>
                                                {/* Emoji grid */}
                                                <div className="p-2 max-h-48 overflow-y-auto custom-scrollbar">
                                                    <div className="grid grid-cols-8 gap-1">
                                                        {emojiCategories[activeEmojiCategory]?.emojis.map((emoji, idx) => (
                                                            <button
                                                                key={`${emoji}-${idx}`}
                                                                onClick={() => {
                                                                    handleInsertEmoji(emoji);
                                                                    setShowEmojiPicker(false);
                                                                }}
                                                                className="w-8 h-8 flex items-center justify-center rounded hover:bg-neutral-700 transition-colors text-lg"
                                                            >
                                                                {emoji}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>

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

            {/* Deliverables Form Modal */}
            <DeliverablesForm
                isOpen={isDeliverablesFormOpen}
                onClose={() => setIsDeliverablesFormOpen(false)}
                task={task}
                onSave={() => setHasDeliverable(true)}
            />

            {/* Figma Import Modal */}
            <FigmaImportModal
                isOpen={isFigmaImportOpen}
                onClose={() => {
                    setIsFigmaImportOpen(false);
                    setDesignLinkInput('');
                    setIsAddingDesignLink(false);
                }}
                taskId={task.id}
                onImportComplete={handleFigmaImportComplete}
                initialUrl={designLinkInput}
            />
        </div>
    );
};