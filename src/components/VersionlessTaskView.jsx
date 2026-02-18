import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Globe, Tag, User, Calendar, Building2, Check, X,
  Bold, Italic, Strikethrough, Underline, List, ListOrdered,
  CheckSquare, Paperclip, Type, Smile, MoreHorizontal, Copy,
  Trash2, ChevronRight, Code2, Loader2
} from 'lucide-react';
import { CustomSelect } from './CustomUI';
import { createVersion } from '../utils/versionService';
import FigmaImportModal from './FigmaImportModal';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';
import { supabase } from '../supabaseClient';
import { STATUS_CONFIG } from '../utils/constants';

// Import helper components from ImprovedDesignReview
import {
  SmartEmojiPickerWrapper,
  QuickReactionPicker
} from './ImprovedDesignReview';

export const VersionlessTaskView = ({ task, team, onUpdateTask, onVersionCreated }) => {
  const { user } = useAuth();
  const toast = useToast();
  const goBack = useNavigate();

  // Task field state
  const [isEditingDueDate, setIsEditingDueDate] = useState(false);
  const [editedDueDate, setEditedDueDate] = useState(task.dueDate || task.properties?.dueDate || '');

  // Description editing state
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState(task.content || task.description || '');
  const [showDescFormattingToolbar, setShowDescFormattingToolbar] = useState(false);
  const [showDescLinkInput, setShowDescLinkInput] = useState(false);
  const [showDescEmojiPicker, setShowDescEmojiPicker] = useState(false);
  const [descLinkText, setDescLinkText] = useState('');
  const [descLinkUrl, setDescLinkUrl] = useState('');
  const [activeDescFormats, setActiveDescFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikeThrough: false
  });

  // Add asset state
  const [isAddingWebsite, setIsAddingWebsite] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [isAddingEmbed, setIsAddingEmbed] = useState(false);
  const [embedUrl, setEmbedUrl] = useState('');
  const [isCreatingVersion, setIsCreatingVersion] = useState(false);
  const [showFigmaImport, setShowFigmaImport] = useState(false);

  // Comments state
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [showFormattingToolbar, setShowFormattingToolbar] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [showNewCommentEmojiPicker, setShowNewCommentEmojiPicker] = useState(false);
  const [linkText, setLinkText] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikeThrough: false
  });

  // Client contacts state (for "Created By" field)
  const [clientContacts, setClientContacts] = useState([]);

  // Comment editing state
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editedContent, setEditedContent] = useState('');
  const [showEditFormattingToolbar, setShowEditFormattingToolbar] = useState(false);
  const [showEditLinkInput, setShowEditLinkInput] = useState(false);
  const [showEditEmojiPicker, setShowEditEmojiPicker] = useState(false);
  const [editLinkText, setEditLinkText] = useState('');
  const [editLinkUrl, setEditLinkUrl] = useState('');
  const [activeEditFormats, setActiveEditFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikeThrough: false
  });

  // Comment UI state
  const [hoveredCommentId, setHoveredCommentId] = useState(null);
  const [showReactionPickerForComment, setShowReactionPickerForComment] = useState(null);
  const [showFullEmojiPickerForComment, setShowFullEmojiPickerForComment] = useState(null);
  const [showCommentMenuForComment, setShowCommentMenuForComment] = useState(null);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState(null);

  // Refs
  const descEditorRef = useRef(null);
  const newCommentEditorRef = useRef(null);
  const editCommentEditorRef = useRef(null);
  const descEmojiButtonRef = useRef(null);
  const newCommentEmojiButtonRef = useRef(null);
  const editEmojiButtonRef = useRef(null);

  // Status options - Use STATUS_CONFIG from constants for consistency
  const statusOptions = Object.keys(STATUS_CONFIG).map(status => ({
    value: status,
    label: status
  }));

  // Team options
  const teamOptions = team.map(member => ({
    value: member.id,
    label: member.full_name || member.email,
    avatar: member.avatar_url
  }));

  // Fetch comments and client contacts
  useEffect(() => {
    fetchComments();
    fetchClientContacts();
  }, [task.id]);

  const fetchComments = async () => {
    const { data } = await supabase
      .from('comments')
      .select(`
        *,
        reactions:comment_reactions(*)
      `)
      .eq('task_id', task.id)
      .is('version_id', null)
      .order('created_at', { ascending: true });

    if (data) {
      setComments(data);
    }
  };

  const fetchClientContacts = async () => {
    const { data } = await supabase
      .from('client_contacts')
      .select('*');

    if (data) {
      setClientContacts(data);
    }
  };

  // Get display names
  const assigneeName = team.find(t => t.id === task.assigned_to_id)?.full_name || 'Unassigned';

  // Handle "Created By" - could be team member OR client contact
  let creatorName = 'Unknown';
  let createdById = null;

  if (task.created_by_team_id) {
    // Created by team member
    createdById = task.created_by_team_id;
    creatorName = team.find(t => t.id === task.created_by_team_id)?.full_name || 'Unknown';
  } else if (task.created_by_id) {
    // Created by client contact
    createdById = task.created_by_id;
    const contact = clientContacts.find(c => c.id === task.created_by_id);
    creatorName = contact?.full_name || contact?.email || 'Client';
  } else if (task.properties?.createdById) {
    // Backwards compatibility
    createdById = task.properties.createdById;
    creatorName = team.find(t => t.id === task.properties.createdById)?.full_name || 'Unknown';
  }

  console.log('Creator lookup:', {
    created_by_team_id: task.created_by_team_id,
    created_by_id: task.created_by_id,
    creatorName,
    teamCount: team.length,
    contactsCount: clientContacts.length
  });

  // Log task data for debugging
  console.log('VersionlessTaskView - task:', {
    id: task.id,
    title: task.title,
    status: task.status,
    assigned_to_id: task.assigned_to_id,
    created_by_team_id: task.created_by_team_id,
    dueDate: task.dueDate,
    properties: task.properties
  });

  // Update handlers
  const handleUpdateDueDate = async () => {
    if (editedDueDate !== (task.dueDate || task.properties?.dueDate || '')) {
      console.log('Updating due date to:', editedDueDate);
      // Update both delivered_at and properties.dueDate for backwards compatibility
      const result = await onUpdateTask(task.id, {
        delivered_at: editedDueDate,
        properties: { ...(task.properties || {}), dueDate: editedDueDate }
      });
      if (!result?.error) {
        toast.success('Due date updated');
      } else {
        toast.error('Failed to update due date');
        console.error('Due date update error:', result.error);
      }
    }
    setIsEditingDueDate(false);
  };

  const handleStatusChange = async (newStatus) => {
    console.log('Updating status to:', newStatus);
    const result = await onUpdateTask(task.id, { status: newStatus });
    if (!result?.error) {
      toast.success('Status updated');
    } else {
      toast.error('Failed to update status');
      console.error('Status update error:', result.error);
    }
  };

  const handleAssigneeChange = async (newAssigneeId) => {
    console.log('Updating assignee to:', newAssigneeId);
    const result = await onUpdateTask(task.id, { assigned_to_id: newAssigneeId });
    if (!result?.error) {
      toast.success('Assignee updated');
    } else {
      toast.error('Failed to update assignee');
      console.error('Assignee update error:', result.error);
    }
  };

  const handleCreatorChange = async (newCreatorId) => {
    console.log('Updating creator to:', newCreatorId);
    const result = await onUpdateTask(task.id, { created_by_team_id: newCreatorId });
    if (!result?.error) {
      toast.success('Creator updated');
    } else {
      toast.error('Failed to update creator');
      console.error('Creator update error:', result.error);
    }
  };

  // Description formatting functions
  const insertDescBold = () => {
    document.execCommand('bold', false, null);
    checkActiveDescFormats();
  };

  const insertDescItalic = () => {
    document.execCommand('italic', false, null);
    checkActiveDescFormats();
  };

  const insertDescStrikethrough = () => {
    document.execCommand('strikeThrough', false, null);
    checkActiveDescFormats();
  };

  const insertDescUnderline = () => {
    document.execCommand('underline', false, null);
    checkActiveDescFormats();
  };

  const insertDescBulletList = () => {
    document.execCommand('insertUnorderedList', false, null);
  };

  const insertDescNumberedList = () => {
    document.execCommand('insertOrderedList', false, null);
  };

  const insertDescChecklist = () => {
    const selection = window.getSelection();
    const text = selection.toString() || 'New item';
    const checkboxHTML = `<div><input type="checkbox" disabled /> ${text}</div>`;
    document.execCommand('insertHTML', false, checkboxHTML);
  };

  const handleDescInsertLink = () => {
    if (descLinkUrl) {
      const linkHTML = `<a href="${descLinkUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:underline">${descLinkText || descLinkUrl}</a>`;
      document.execCommand('insertHTML', false, linkHTML);
      setDescLinkUrl('');
      setDescLinkText('');
      setShowDescLinkInput(false);
    }
  };

  const insertDescEmoji = (emoji) => {
    document.execCommand('insertHTML', false, emoji);
    setShowDescEmojiPicker(false);
  };

  const checkActiveDescFormats = () => {
    setActiveDescFormats({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      strikeThrough: document.queryCommandState('strikeThrough')
    });
  };

  const handleCancelDescription = () => {
    setEditedDescription(task.description || task.content || '');
    if (descEditorRef.current) {
      descEditorRef.current.innerHTML = task.description || task.content || '';
    }
    setIsEditingDescription(false);
    setShowDescFormattingToolbar(false);
    setShowDescLinkInput(false);
    setShowDescEmojiPicker(false);
  };

  const handleSaveDescription = async () => {
    await onUpdateTask(task.id, { description: editedDescription, content: editedDescription });
    toast.success('Description updated');
    setIsEditingDescription(false);
    setShowDescFormattingToolbar(false);
    setShowDescLinkInput(false);
    setShowDescEmojiPicker(false);
  };

  // Comment formatting functions (for new comments)
  const insertBold = (isNewComment) => {
    const editor = isNewComment ? newCommentEditorRef.current : editCommentEditorRef.current;
    if (editor) {
      editor.focus();
      document.execCommand('bold', false, null);
      if (isNewComment) {
        checkActiveFormats();
      } else {
        checkActiveEditFormats();
      }
    }
  };

  const insertItalic = (isNewComment) => {
    const editor = isNewComment ? newCommentEditorRef.current : editCommentEditorRef.current;
    if (editor) {
      editor.focus();
      document.execCommand('italic', false, null);
      if (isNewComment) {
        checkActiveFormats();
      } else {
        checkActiveEditFormats();
      }
    }
  };

  const insertStrikethrough = (isNewComment) => {
    const editor = isNewComment ? newCommentEditorRef.current : editCommentEditorRef.current;
    if (editor) {
      editor.focus();
      document.execCommand('strikeThrough', false, null);
      if (isNewComment) {
        checkActiveFormats();
      } else {
        checkActiveEditFormats();
      }
    }
  };

  const insertUnderline = (isNewComment) => {
    const editor = isNewComment ? newCommentEditorRef.current : editCommentEditorRef.current;
    if (editor) {
      editor.focus();
      document.execCommand('underline', false, null);
      if (isNewComment) {
        checkActiveFormats();
      } else {
        checkActiveEditFormats();
      }
    }
  };

  const insertBulletList = (isNewComment) => {
    const editor = isNewComment ? newCommentEditorRef.current : editCommentEditorRef.current;
    if (editor) {
      editor.focus();
      document.execCommand('insertUnorderedList', false, null);
    }
  };

  const insertNumberedList = (isNewComment) => {
    const editor = isNewComment ? newCommentEditorRef.current : editCommentEditorRef.current;
    if (editor) {
      editor.focus();
      document.execCommand('insertOrderedList', false, null);
    }
  };

  const insertChecklist = (isNewComment) => {
    const editor = isNewComment ? newCommentEditorRef.current : editCommentEditorRef.current;
    if (editor) {
      editor.focus();
      const selection = window.getSelection();
      const text = selection.toString() || 'New item';
      const checkboxHTML = `<div><input type="checkbox" disabled /> ${text}</div>`;
      document.execCommand('insertHTML', false, checkboxHTML);
    }
  };

  const handleInsertLink = (isNewComment) => {
    const url = isNewComment ? linkUrl : editLinkUrl;
    const text = isNewComment ? linkText : editLinkText;

    if (url) {
      const linkHTML = `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:underline">${text || url}</a>`;
      const editor = isNewComment ? newCommentEditorRef.current : editCommentEditorRef.current;

      if (editor) {
        editor.focus();
        document.execCommand('insertHTML', false, linkHTML);
      }

      if (isNewComment) {
        setLinkUrl('');
        setLinkText('');
        setShowLinkInput(false);
      } else {
        setEditLinkUrl('');
        setEditLinkText('');
        setShowEditLinkInput(false);
      }
    }
  };

  const insertEmoji = (emoji, isNewComment) => {
    const editor = isNewComment ? newCommentEditorRef.current : editCommentEditorRef.current;
    if (editor) {
      editor.focus();
      document.execCommand('insertHTML', false, emoji);
    }
    if (isNewComment) {
      setShowNewCommentEmojiPicker(false);
    } else {
      setShowEditEmojiPicker(false);
    }
  };

  const checkActiveFormats = () => {
    setActiveFormats({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      strikeThrough: document.queryCommandState('strikeThrough')
    });
  };

  const checkActiveEditFormats = () => {
    setActiveEditFormats({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      strikeThrough: document.queryCommandState('strikeThrough')
    });
  };

  // Send comment
  const handleSendCommentWrapper = async () => {
    if (!newComment.trim() || newComment === '<br>') return;

    const currentTeamMember = team.find(t => t.email === user?.email);

    const { data, error } = await supabase
      .from('comments')
      .insert([{
        task_id: task.id,
        author_designer_id: currentTeamMember?.id,
        content: newComment,
        created_at: new Date().toISOString()
      }])
      .select();

    if (!error && data) {
      await fetchComments();
      if (newCommentEditorRef.current) {
        newCommentEditorRef.current.innerHTML = '';
      }
      setNewComment('');
      toast.success('Comment added');
    } else {
      toast.error('Failed to add comment');
    }
  };

  // Edit comment
  const startEdit = (comment) => {
    setEditingCommentId(comment.id);
    setEditedContent(comment.content);
    setTimeout(() => {
      if (editCommentEditorRef.current) {
        editCommentEditorRef.current.innerHTML = comment.content;
        editCommentEditorRef.current.focus();
      }
    }, 0);
  };

  const cancelEdit = () => {
    setEditingCommentId(null);
    setEditedContent('');
    setShowEditFormattingToolbar(false);
    setShowEditLinkInput(false);
    setShowEditEmojiPicker(false);
  };

  const saveEdit = async (commentId) => {
    const { error } = await supabase
      .from('comments')
      .update({ content: editedContent })
      .eq('id', commentId);

    if (!error) {
      await fetchComments();
      cancelEdit();
      toast.success('Comment updated');
    } else {
      toast.error('Failed to update comment');
    }
  };

  // Delete comment
  const handleDeleteCommentClick = (commentId) => {
    setCommentToDelete(commentId);
    setShowDeleteConfirmModal(true);
    closeAllHoverMenus();
  };

  const cancelDeleteComment = () => {
    setShowDeleteConfirmModal(false);
    setCommentToDelete(null);
  };

  const confirmDeleteComment = async () => {
    if (!commentToDelete) return;

    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentToDelete);

    if (!error) {
      await fetchComments();
      toast.success('Comment deleted');
    } else {
      toast.error('Failed to delete comment');
    }

    setShowDeleteConfirmModal(false);
    setCommentToDelete(null);
  };

  // Copy comment link
  const handleCopyCommentLink = (commentId) => {
    const url = `${window.location.origin}/task/${task.id}#comment-${commentId}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
    closeAllHoverMenus();
  };

  // Reactions
  const handleAddReactionLocal = async (commentId, emoji) => {
    const currentTeamMember = team.find(t => t.email === user?.email);

    const { error } = await supabase
      .from('comment_reactions')
      .insert([{
        comment_id: commentId,
        user_id: currentTeamMember?.id,
        emoji: emoji
      }]);

    if (!error) {
      await fetchComments();
    }

    closeAllHoverMenus();
  };

  const handleReactionClick = async (commentId, emoji) => {
    const comment = comments.find(c => c.id === commentId);
    if (!comment) return;

    const currentTeamMember = team.find(t => t.email === user?.email);
    const existingReaction = comment.reactions?.find(
      r => r.emoji === emoji && r.user_id === currentTeamMember?.id
    );

    if (existingReaction) {
      // Remove reaction
      await supabase
        .from('comment_reactions')
        .delete()
        .eq('id', existingReaction.id);
    } else {
      // Add reaction
      await supabase
        .from('comment_reactions')
        .insert([{
          comment_id: commentId,
          user_id: currentTeamMember?.id,
          emoji: emoji
        }]);
    }

    await fetchComments();
  };

  const getGroupedReactions = (reactions) => {
    const grouped = {};
    const currentTeamMember = team.find(t => t.email === user?.email);

    reactions.forEach(reaction => {
      if (!grouped[reaction.emoji]) {
        grouped[reaction.emoji] = {
          emoji: reaction.emoji,
          count: 0,
          hasCurrentUser: false
        };
      }
      grouped[reaction.emoji].count++;
      if (reaction.user_id === currentTeamMember?.id) {
        grouped[reaction.emoji].hasCurrentUser = true;
      }
    });

    return Object.values(grouped);
  };

  // Close all hover menus
  const closeAllHoverMenus = () => {
    setShowReactionPickerForComment(null);
    setShowFullEmojiPickerForComment(null);
    setShowCommentMenuForComment(null);
  };

  // Add website asset
  const handleAddWebsite = async () => {
    if (!websiteUrl.trim()) {
      toast.error('Please enter a URL');
      return;
    }

    setIsCreatingVersion(true);
    try {
      const { data, error } = await createVersion(
        task.id,
        websiteUrl,
        'Version 1',
        user?.id
      );

      if (error) throw error;

      toast.success('Website added successfully');
      setWebsiteUrl('');
      setIsAddingWebsite(false);
      onVersionCreated();
    } catch (error) {
      console.error('Error creating version:', error);
      toast.error('Failed to add website');
    } finally {
      setIsCreatingVersion(false);
    }
  };

  // Add embed asset
  const handleAddEmbed = async () => {
    if (!embedUrl.trim()) {
      toast.error('Please enter a URL');
      return;
    }

    setIsCreatingVersion(true);
    try {
      const { data, error } = await createVersion(
        task.id,
        embedUrl,
        'Version 1',
        user?.id
      );

      if (error) throw error;

      toast.success('Embed added successfully');
      setEmbedUrl('');
      setIsAddingEmbed(false);
      onVersionCreated();
    } catch (error) {
      console.error('Error creating embed:', error);
      toast.error('Failed to add embed');
    } finally {
      setIsCreatingVersion(false);
    }
  };

  // Format date for comments
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Group comments by date
  const groupedComments = comments.reduce((groups, comment) => {
    const date = new Date(comment.created_at).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(comment);
    return groups;
  }, {});

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-[#0f0f0f] animate-fade-in">
      {/* Header */}
      <div className="h-14 border-b border-neutral-200 dark:border-neutral-800 flex items-center px-6 bg-white dark:bg-[#0f0f0f] shrink-0">
        <button
          onClick={() => goBack('/')}
          className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="ml-4 text-lg font-medium text-neutral-900 dark:text-white truncate">{task.title}</h1>
      </div>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-[350px] border-r border-neutral-800 overflow-y-auto custom-scrollbar bg-[#0f0f0f] theme-bg-primary">
          <div className="p-4 space-y-1">
            {/* Status */}
            <CustomSelect
              label="Status"
              icon={Tag}
              value={task.status || null}
              options={statusOptions}
              onChange={handleStatusChange}
              placeholder="No status"
            />

            {/* Assignee */}
            <CustomSelect
              label="Assignee"
              icon={User}
              value={task.assigned_to_id}
              options={teamOptions}
              onChange={handleAssigneeChange}
              type="user"
              placeholder="Unassigned"
              displayName={assigneeName !== 'Unassigned' ? assigneeName : null}
            />

            {/* Created By */}
            <CustomSelect
              label="Created By"
              icon={User}
              value={createdById}
              options={teamOptions}
              onChange={handleCreatorChange}
              type="user"
              placeholder="Unknown"
              displayName={creatorName !== 'Unknown' ? creatorName : null}
            />

            {/* Due Date */}
            <div className="flex items-center py-1.5 px-2 hover:bg-neutral-800/50 rounded cursor-pointer group">
              <div className="w-32 text-neutral-500 flex items-center gap-2 text-sm">
                <Calendar size={14} /> Due Date
              </div>
              {isEditingDueDate ? (
                <input
                  type="date"
                  value={editedDueDate}
                  onChange={(e) => setEditedDueDate(e.target.value)}
                  onBlur={handleUpdateDueDate}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleUpdateDueDate();
                    if (e.key === 'Escape') {
                      setEditedDueDate(task.dueDate || task.properties?.dueDate || '');
                      setIsEditingDueDate(false);
                    }
                  }}
                  autoFocus
                  className="flex-1 bg-transparent text-neutral-300 text-sm text-right focus:outline-none"
                />
              ) : (
                <div
                  className="flex-1 text-neutral-300 text-sm text-right"
                  onClick={() => setIsEditingDueDate(true)}
                >
                  {task.dueDate || task.properties?.dueDate ? (
                    new Date(task.dueDate || task.properties.dueDate).toLocaleDateString(undefined, {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })
                  ) : (
                    <span className="text-neutral-600">Empty</span>
                  )}
                </div>
              )}
            </div>

            {/* Client */}
            <div className="flex items-center py-1.5 px-2">
              <div className="w-32 text-neutral-500 flex items-center gap-2 text-sm">
                <Building2 size={14} /> Client
              </div>
              <div className="flex-1 text-neutral-300 text-sm text-right">
                {task.clientName || <span className="text-neutral-600">Internal</span>}
              </div>
            </div>

            {/* Add Asset Section */}
            <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 mt-4">
              <h3 className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider mb-3 px-2">Add asset</h3>

              {/* Figma Button */}
              <button
                onClick={() => setShowFigmaImport(true)}
                className="w-full flex items-center gap-3 px-3 py-2.5 border border-dashed border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600 rounded-lg transition-colors text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white mb-2"
              >
                <svg width="14" height="14" viewBox="0 0 38 57" fill="currentColor" className="opacity-60">
                  <path d="M19 28.5C19 23.2533 23.2533 19 28.5 19C33.7467 19 38 23.2533 38 28.5C38 33.7467 33.7467 38 28.5 38C23.2533 38 19 33.7467 19 28.5Z"/>
                  <path d="M0 47.5C0 42.2533 4.25329 38 9.5 38H19V47.5C19 52.7467 14.7467 57 9.5 57C4.25329 57 0 52.7467 0 47.5Z"/>
                  <path d="M19 0V19H28.5C33.7467 19 38 14.7467 38 9.5C38 4.25329 33.7467 0 28.5 0H19Z"/>
                  <path d="M0 9.5C0 14.7467 4.25329 19 9.5 19H19V0H9.5C4.25329 0 0 4.25329 0 9.5Z"/>
                  <path d="M0 28.5C0 33.7467 4.25329 38 9.5 38H19V19H9.5C4.25329 19 0 23.2533 0 28.5Z"/>
                </svg>
                <span className="text-sm">Figma</span>
              </button>

              {/* Embed Button */}
              <button
                onClick={() => setIsAddingEmbed(true)}
                className="w-full flex items-center gap-3 px-3 py-2.5 border border-dashed border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600 rounded-lg transition-colors text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white mb-2"
              >
                <Code2 size={14} className="opacity-60" />
                <span className="text-sm">Embed</span>
              </button>

              {/* Website Button */}
              <button
                onClick={() => setIsAddingWebsite(true)}
                className="w-full flex items-center gap-3 px-3 py-2.5 border border-dashed border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600 rounded-lg transition-colors text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white mb-2"
              >
                <Globe size={14} className="opacity-60" />
                <span className="text-sm">Website</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content - Comments Section */}
        <div className="flex-1 overflow-hidden flex flex-col bg-black theme-bg-secondary items-center py-6">
          {/* Centered Content Box - 50% width */}
          <div className="w-full max-w-[50%] flex flex-col overflow-hidden rounded-lg border border-neutral-800 bg-[#0f0f0f]">
            {/* Description Section */}
            <div className="border-b border-neutral-800 p-6">
            <h2 className="text-lg font-semibold text-white mb-3">{task.title}</h2>
            {isEditingDescription ? (
              <div className="space-y-2">
                {/* Formatting toolbar */}
                {showDescFormattingToolbar && (
                  <div className="flex items-center gap-1 pb-2">
                    <button
                      onClick={insertDescBold}
                      className={`p-1 rounded transition-colors ${activeDescFormats.bold ? 'text-white bg-neutral-700' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}`}
                      title="Bold"
                    >
                      <Bold size={14} />
                    </button>
                    <button
                      onClick={insertDescItalic}
                      className={`p-1 rounded transition-colors ${activeDescFormats.italic ? 'text-white bg-neutral-700' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}`}
                      title="Italic"
                    >
                      <Italic size={14} />
                    </button>
                    <button
                      onClick={insertDescStrikethrough}
                      className={`p-1 rounded transition-colors ${activeDescFormats.strikeThrough ? 'text-white bg-neutral-700' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}`}
                      title="Strikethrough"
                    >
                      <Strikethrough size={14} />
                    </button>
                    <button
                      onClick={insertDescUnderline}
                      className={`p-1 rounded transition-colors ${activeDescFormats.underline ? 'text-white bg-neutral-700' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}`}
                      title="Underline"
                    >
                      <Underline size={14} />
                    </button>
                    <div className="w-px h-3 bg-neutral-700 mx-0.5" />
                    <button onClick={insertDescBulletList} className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800" title="Bullet list">
                      <List size={14} />
                    </button>
                    <button onClick={insertDescNumberedList} className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800" title="Numbered list">
                      <ListOrdered size={14} />
                    </button>
                    <button onClick={insertDescChecklist} className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800" title="Checklist">
                      <CheckSquare size={14} />
                    </button>
                  </div>
                )}

                {/* Link input */}
                {showDescLinkInput && (
                  <div className="flex items-center gap-2 p-2 bg-neutral-900 rounded-lg">
                    <input
                      type="text"
                      value={descLinkText}
                      onChange={(e) => setDescLinkText(e.target.value)}
                      placeholder="Link text"
                      className="flex-1 bg-transparent text-neutral-300 text-xs placeholder-neutral-600 focus:outline-none"
                    />
                    <input
                      type="text"
                      value={descLinkUrl}
                      onChange={(e) => setDescLinkUrl(e.target.value)}
                      placeholder="URL"
                      className="flex-1 bg-transparent text-neutral-300 text-xs placeholder-neutral-600 focus:outline-none"
                      onKeyDown={(e) => { if (e.key === 'Enter') handleDescInsertLink(); }}
                    />
                    <button onClick={handleDescInsertLink} className="p-1 text-blue-500 hover:text-blue-400">
                      <CheckSquare size={14} />
                    </button>
                    <button onClick={() => { setShowDescLinkInput(false); setDescLinkUrl(''); setDescLinkText(''); }} className="p-1 text-neutral-500 hover:text-white">
                      <X size={14} />
                    </button>
                  </div>
                )}

                {/* Content editor */}
                <div
                  ref={descEditorRef}
                  contentEditable
                  data-placeholder="Add a description..."
                  className="w-full bg-neutral-900 text-neutral-300 text-sm p-3 rounded border border-neutral-800 focus:outline-none focus:border-neutral-600 min-h-[100px] max-h-[200px] overflow-y-auto empty:before:content-[attr(data-placeholder)] empty:before:text-neutral-600"
                  onInput={(e) => setEditedDescription(e.currentTarget.innerHTML)}
                  onKeyDown={(e) => { if (e.key === 'Escape') handleCancelDescription(); }}
                />

                {/* Toolbar below editor */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => { setShowDescLinkInput(!showDescLinkInput); setShowDescFormattingToolbar(false); setShowDescEmojiPicker(false); }}
                      className={`p-1 rounded transition-colors ${showDescLinkInput ? 'text-white bg-neutral-800' : 'text-neutral-500 hover:text-white hover:bg-neutral-800'}`}
                      title="Add link"
                    >
                      <Paperclip size={14} />
                    </button>
                    <button
                      onClick={() => { setShowDescFormattingToolbar(!showDescFormattingToolbar); setShowDescLinkInput(false); setShowDescEmojiPicker(false); }}
                      className={`p-1 rounded transition-colors ${showDescFormattingToolbar ? 'text-white bg-neutral-800' : 'text-neutral-500 hover:text-white hover:bg-neutral-800'}`}
                      title="Text formatting"
                    >
                      <Type size={14} />
                    </button>
                    <div className="relative">
                      <button
                        ref={descEmojiButtonRef}
                        onClick={() => { setShowDescEmojiPicker(!showDescEmojiPicker); setShowDescFormattingToolbar(false); setShowDescLinkInput(false); }}
                        className={`p-1 rounded transition-colors ${showDescEmojiPicker ? 'text-white bg-neutral-800' : 'text-neutral-500 hover:text-white hover:bg-neutral-800'}`}
                        title="Add emoji"
                      >
                        <Smile size={14} />
                      </button>
                      {showDescEmojiPicker && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowDescEmojiPicker(false)} />
                          <SmartEmojiPickerWrapper
                            triggerRef={descEmojiButtonRef}
                            onSelect={(emoji) => insertDescEmoji(emoji)}
                            onClose={() => setShowDescEmojiPicker(false)}
                          />
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleCancelDescription} className="px-3 py-1.5 text-sm text-neutral-400 hover:text-white">
                      Cancel
                    </button>
                    <button onClick={handleSaveDescription} className="px-3 py-1.5 text-sm text-white hover:text-neutral-300">
                      Save
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                onClick={() => setIsEditingDescription(true)}
                className="text-neutral-300 text-sm cursor-pointer hover:bg-neutral-800/30 p-3 rounded min-h-[60px]"
                dangerouslySetInnerHTML={{ __html: task.description || task.content || '<span class="text-neutral-600 italic">Click to add description...</span>' }}
              />
            )}
          </div>

          {/* Comments list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
            {comments.length === 0 ? (
              <div className="text-center text-neutral-500 py-12">
                <p>No comments yet</p>
                <p className="text-sm mt-1">Add a comment to get started</p>
              </div>
            ) : (
              Object.keys(groupedComments).map((dateKey) => {
                const dateComments = groupedComments[dateKey];
                const dateLabel = formatDate(dateComments[0].created_at);

                return (
                  <div key={dateKey}>
                    {/* Date separator */}
                    <div className="flex items-center justify-center mb-4">
                      <div className="text-xs text-neutral-600 bg-neutral-900 px-3 py-1 rounded-full">
                        {dateLabel}
                      </div>
                    </div>

                    {/* Comments for this date */}
                    <div className="space-y-0">
                      {dateComments.map((comment) => {
                        const author = team.find(t => t.id === comment.author_designer_id);
                        const authorName = author?.full_name || 'Unknown';
                        const authorAvatar = author?.avatar_url;
                        const currentTeamMember = team.find(t => t.email === user?.email);
                        const isOwnComment = comment.author_designer_id === currentTeamMember?.id;
                        const isHovered = hoveredCommentId === comment.id;
                        const isEditing = editingCommentId === comment.id;

                        return (
                          <div
                            key={comment.id}
                            id={`comment-${comment.id}`}
                            className="flex gap-3 p-2 -mx-2 rounded-lg"
                            onMouseEnter={() => setHoveredCommentId(comment.id)}
                            onMouseLeave={() => setHoveredCommentId(null)}
                          >
                            {/* Avatar */}
                            <div className="flex-shrink-0">
                              {authorAvatar ? (
                                <img src={authorAvatar} alt={authorName} className="w-8 h-8 rounded-full" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center text-white text-sm">
                                  {authorName[0]}
                                </div>
                              )}
                            </div>

                            {/* Comment content */}
                            <div className="flex-1 min-w-0">
                              {/* Header */}
                              <div className="flex items-center justify-between h-6">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-white">{authorName}</span>
                                  <span className="text-xs text-neutral-600">{formatTime(comment.created_at)}</span>
                                </div>

                                {/* Hover actions */}
                                <div className={`flex items-center gap-1 transition-opacity ${isHovered && !isEditing ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                                  {/* Edit button */}
                                  {isOwnComment && (
                                    <button
                                      onClick={() => startEdit(comment)}
                                      className="px-2 py-0.5 rounded text-xs text-neutral-500 hover:text-white hover:bg-neutral-800"
                                    >
                                      Edit
                                    </button>
                                  )}

                                  {/* Reaction button */}
                                  <div className="relative">
                                    <button
                                      onClick={() => {
                                        setShowReactionPickerForComment(showReactionPickerForComment === comment.id ? null : comment.id);
                                        setShowCommentMenuForComment(null);
                                        setShowFullEmojiPickerForComment(null);
                                      }}
                                      className="p-1 rounded text-neutral-500 hover:text-white hover:bg-neutral-800"
                                    >
                                      <Smile size={14} />
                                    </button>

                                    {/* Quick Reaction Picker */}
                                    {showReactionPickerForComment === comment.id && (
                                      <>
                                        <div className="fixed inset-0 z-40" onClick={closeAllHoverMenus} />
                                        <div className="absolute right-0 top-full mt-1 z-50">
                                          <QuickReactionPicker
                                            onSelect={(emoji) => handleAddReactionLocal(comment.id, emoji)}
                                            onOpenFull={() => {
                                              setShowReactionPickerForComment(null);
                                              setShowFullEmojiPickerForComment(comment.id);
                                            }}
                                          />
                                        </div>
                                      </>
                                    )}

                                    {/* Full Emoji Picker */}
                                    {showFullEmojiPickerForComment === comment.id && (
                                      <>
                                        <div className="fixed inset-0 z-40" onClick={closeAllHoverMenus} />
                                        <div className="absolute right-0 top-full mt-1 z-50">
                                          <SmartEmojiPickerWrapper
                                            triggerRef={{ current: null }}
                                            onSelect={(emoji) => handleAddReactionLocal(comment.id, emoji)}
                                            onClose={closeAllHoverMenus}
                                          />
                                        </div>
                                      </>
                                    )}
                                  </div>

                                  {/* More options button */}
                                  <div className="relative">
                                    <button
                                      onClick={() => {
                                        setShowCommentMenuForComment(showCommentMenuForComment === comment.id ? null : comment.id);
                                        setShowReactionPickerForComment(null);
                                        setShowFullEmojiPickerForComment(null);
                                      }}
                                      className="p-1 rounded text-neutral-500 hover:text-white hover:bg-neutral-800"
                                    >
                                      <MoreHorizontal size={14} />
                                    </button>

                                    {/* Dropdown menu */}
                                    {showCommentMenuForComment === comment.id && (
                                      <>
                                        <div className="fixed inset-0 z-40" onClick={closeAllHoverMenus} />
                                        <div className="absolute right-0 top-full mt-1 w-44 bg-[#1a1a1a] border border-neutral-800 rounded-lg shadow-xl z-50 overflow-hidden">
                                          <button
                                            onClick={() => handleCopyCommentLink(comment.id)}
                                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800"
                                          >
                                            <Copy size={14} />
                                            Copy link
                                          </button>
                                          {isOwnComment && (
                                            <button
                                              onClick={() => handleDeleteCommentClick(comment.id)}
                                              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-neutral-800"
                                            >
                                              <Trash2 size={14} />
                                              Delete comment
                                            </button>
                                          )}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Body */}
                              {isEditing ? (
                                // EDIT MODE
                                <div className="space-y-2">
                                  {/* Formatting toolbar */}
                                  {showEditFormattingToolbar && (
                                    <div className="flex items-center gap-1 pb-2">
                                      <button onClick={() => insertBold(false)} className={`p-1 rounded transition-colors ${activeEditFormats.bold ? 'text-white bg-neutral-700' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}`} title="Bold">
                                        <Bold size={14} />
                                      </button>
                                      <button onClick={() => insertItalic(false)} className={`p-1 rounded transition-colors ${activeEditFormats.italic ? 'text-white bg-neutral-700' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}`} title="Italic">
                                        <Italic size={14} />
                                      </button>
                                      <button onClick={() => insertStrikethrough(false)} className={`p-1 rounded transition-colors ${activeEditFormats.strikeThrough ? 'text-white bg-neutral-700' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}`} title="Strikethrough">
                                        <Strikethrough size={14} />
                                      </button>
                                      <button onClick={() => insertUnderline(false)} className={`p-1 rounded transition-colors ${activeEditFormats.underline ? 'text-white bg-neutral-700' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}`} title="Underline">
                                        <Underline size={14} />
                                      </button>
                                      <div className="w-px h-3 bg-neutral-700 mx-0.5" />
                                      <button onClick={() => insertBulletList(false)} className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800" title="Bullet list">
                                        <List size={14} />
                                      </button>
                                      <button onClick={() => insertNumberedList(false)} className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800" title="Numbered list">
                                        <ListOrdered size={14} />
                                      </button>
                                      <button onClick={() => insertChecklist(false)} className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800" title="Checklist">
                                        <CheckSquare size={14} />
                                      </button>
                                    </div>
                                  )}

                                  {/* Link input */}
                                  {showEditLinkInput && (
                                    <div className="flex items-center gap-2 p-2 bg-neutral-900 rounded-lg">
                                      <input
                                        type="text"
                                        value={editLinkText}
                                        onChange={(e) => setEditLinkText(e.target.value)}
                                        placeholder="Link text"
                                        className="flex-1 bg-transparent text-neutral-300 text-xs placeholder-neutral-600 focus:outline-none"
                                      />
                                      <input
                                        type="text"
                                        value={editLinkUrl}
                                        onChange={(e) => setEditLinkUrl(e.target.value)}
                                        placeholder="URL"
                                        className="flex-1 bg-transparent text-neutral-300 text-xs placeholder-neutral-600 focus:outline-none"
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleInsertLink(false); }}
                                      />
                                      <button onClick={() => handleInsertLink(false)} className="p-1 text-blue-500 hover:text-blue-400">
                                        <CheckSquare size={14} />
                                      </button>
                                      <button onClick={() => { setShowEditLinkInput(false); setEditLinkUrl(''); setEditLinkText(''); }} className="p-1 text-neutral-500 hover:text-white">
                                        <X size={14} />
                                      </button>
                                    </div>
                                  )}

                                  {/* Content editor */}
                                  <div
                                    ref={editCommentEditorRef}
                                    contentEditable
                                    className="w-full bg-transparent text-neutral-300 text-sm focus:outline-none min-h-[40px] max-h-[100px] overflow-y-auto"
                                    onKeyDown={(e) => { if (e.key === 'Escape') cancelEdit(); }}
                                    onInput={(e) => setEditedContent(e.currentTarget.innerHTML)}
                                  />

                                  {/* Toolbar */}
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => { setShowEditLinkInput(!showEditLinkInput); setShowEditFormattingToolbar(false); setShowEditEmojiPicker(false); }}
                                        className={`p-1 rounded transition-colors ${showEditLinkInput ? 'text-white bg-neutral-800' : 'text-neutral-500 hover:text-white hover:bg-neutral-800'}`}
                                        title="Add link"
                                      >
                                        <Paperclip size={14} />
                                      </button>
                                      <button
                                        onClick={() => { setShowEditFormattingToolbar(!showEditFormattingToolbar); setShowEditLinkInput(false); setShowEditEmojiPicker(false); }}
                                        className={`p-1 rounded transition-colors ${showEditFormattingToolbar ? 'text-white bg-neutral-800' : 'text-neutral-500 hover:text-white hover:bg-neutral-800'}`}
                                        title="Text formatting"
                                      >
                                        <Type size={14} />
                                      </button>
                                      <div className="relative">
                                        <button
                                          ref={editEmojiButtonRef}
                                          onClick={() => { setShowEditEmojiPicker(!showEditEmojiPicker); setShowEditFormattingToolbar(false); setShowEditLinkInput(false); }}
                                          className={`p-1 rounded transition-colors ${showEditEmojiPicker ? 'text-white bg-neutral-800' : 'text-neutral-500 hover:text-white hover:bg-neutral-800'}`}
                                          title="Add emoji"
                                        >
                                          <Smile size={14} />
                                        </button>
                                        {showEditEmojiPicker && (
                                          <>
                                            <div className="fixed inset-0 z-40" onClick={() => setShowEditEmojiPicker(false)} />
                                            <SmartEmojiPickerWrapper
                                              triggerRef={editEmojiButtonRef}
                                              onSelect={(emoji) => insertEmoji(emoji, false)}
                                              onClose={() => setShowEditEmojiPicker(false)}
                                            />
                                          </>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex gap-2">
                                      <button onClick={cancelEdit} className="text-xs text-neutral-400 hover:text-white">
                                        Cancel
                                      </button>
                                      <button onClick={() => saveEdit(comment.id)} className="text-xs text-white hover:text-neutral-300">
                                        Save
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                // VIEW MODE
                                <>
                                  <div
                                    className="text-sm text-neutral-300"
                                    dangerouslySetInnerHTML={{ __html: comment.content }}
                                  />

                                  {/* Reactions display */}
                                  {comment.reactions && comment.reactions.length > 0 && (
                                    <div className="flex flex-wrap items-center gap-1 mt-2">
                                      {getGroupedReactions(comment.reactions).map((reaction) => (
                                        <button
                                          key={reaction.emoji}
                                          onClick={() => handleReactionClick(comment.id, reaction.emoji)}
                                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors ${
                                            reaction.hasCurrentUser
                                              ? 'bg-transparent border border-white/60 text-white'
                                              : 'bg-transparent border border-neutral-600 text-neutral-400 hover:border-neutral-500'
                                          }`}
                                          title={`${reaction.count} reaction${reaction.count > 1 ? 's' : ''}`}
                                        >
                                          <span>{reaction.emoji}</span>
                                          <span>{reaction.count}</span>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* New comment input */}
          <div className="p-4">
            <div className="space-y-3">
              {/* Formatting toolbar */}
              {showFormattingToolbar && (
                <div className="flex items-center gap-1 pb-2">
                  <button
                    onClick={() => insertBold(true)}
                    className={`p-1.5 rounded transition-colors ${activeFormats.bold ? 'text-white bg-neutral-700' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}`}
                    title="Bold"
                  >
                    <Bold size={16} />
                  </button>
                  <button
                    onClick={() => insertItalic(true)}
                    className={`p-1.5 rounded transition-colors ${activeFormats.italic ? 'text-white bg-neutral-700' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}`}
                    title="Italic"
                  >
                    <Italic size={16} />
                  </button>
                  <button
                    onClick={() => insertStrikethrough(true)}
                    className={`p-1.5 rounded transition-colors ${activeFormats.strikeThrough ? 'text-white bg-neutral-700' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}`}
                    title="Strikethrough"
                  >
                    <Strikethrough size={16} />
                  </button>
                  <button
                    onClick={() => insertUnderline(true)}
                    className={`p-1.5 rounded transition-colors ${activeFormats.underline ? 'text-white bg-neutral-700' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}`}
                    title="Underline"
                  >
                    <Underline size={16} />
                  </button>
                  <div className="w-px h-4 bg-neutral-700 mx-1" />
                  <button onClick={() => insertBulletList(true)} className="p-1.5 rounded text-neutral-400 hover:text-white hover:bg-neutral-800" title="Bullet list">
                    <List size={16} />
                  </button>
                  <button onClick={() => insertNumberedList(true)} className="p-1.5 rounded text-neutral-400 hover:text-white hover:bg-neutral-800" title="Numbered list">
                    <ListOrdered size={16} />
                  </button>
                  <button onClick={() => insertChecklist(true)} className="p-1.5 rounded text-neutral-400 hover:text-white hover:bg-neutral-800" title="Checklist">
                    <CheckSquare size={16} />
                  </button>
                </div>
              )}

              {/* Link input */}
              {showLinkInput && (
                <div className="flex items-center gap-2 p-2 bg-neutral-900 rounded-lg">
                  <input
                    type="text"
                    value={linkText}
                    onChange={(e) => setLinkText(e.target.value)}
                    placeholder="Link text (optional)"
                    className="flex-1 bg-transparent text-neutral-300 text-sm placeholder-neutral-600 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="URL"
                    className="flex-1 bg-transparent text-neutral-300 text-sm placeholder-neutral-600 focus:outline-none"
                    onKeyDown={(e) => { if (e.key === 'Enter') handleInsertLink(true); }}
                  />
                  <button onClick={() => handleInsertLink(true)} className="p-1 text-blue-500 hover:text-blue-400">
                    <CheckSquare size={16} />
                  </button>
                  <button onClick={() => { setShowLinkInput(false); setLinkUrl(''); setLinkText(''); }} className="p-1 text-neutral-500 hover:text-white">
                    <X size={16} />
                  </button>
                </div>
              )}

              {/* Message editor */}
              <div
                ref={newCommentEditorRef}
                contentEditable
                data-placeholder="Leave a message..."
                className="w-full bg-transparent text-neutral-300 text-sm focus:outline-none min-h-[20px] max-h-[120px] overflow-y-auto empty:before:content-[attr(data-placeholder)] empty:before:text-neutral-600"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendCommentWrapper();
                  }
                }}
                onInput={(e) => setNewComment(e.currentTarget.innerHTML)}
              />

              {/* Bottom toolbar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { setShowLinkInput(!showLinkInput); setShowFormattingToolbar(false); setShowNewCommentEmojiPicker(false); }}
                    className={`p-1.5 rounded transition-colors ${showLinkInput ? 'text-white bg-neutral-800' : 'text-neutral-500 hover:text-white hover:bg-neutral-800'}`}
                    title="Add link"
                  >
                    <Paperclip size={16} />
                  </button>
                  <button
                    onClick={() => { setShowFormattingToolbar(!showFormattingToolbar); setShowLinkInput(false); setShowNewCommentEmojiPicker(false); }}
                    className={`p-1.5 rounded transition-colors ${showFormattingToolbar ? 'text-white bg-neutral-800' : 'text-neutral-500 hover:text-white hover:bg-neutral-800'}`}
                    title="Text formatting"
                  >
                    <Type size={16} />
                  </button>
                  <div className="relative">
                    <button
                      ref={newCommentEmojiButtonRef}
                      onClick={() => { setShowNewCommentEmojiPicker(!showNewCommentEmojiPicker); setShowFormattingToolbar(false); setShowLinkInput(false); }}
                      className={`p-1.5 rounded transition-colors ${showNewCommentEmojiPicker ? 'text-white bg-neutral-800' : 'text-neutral-500 hover:text-white hover:bg-neutral-800'}`}
                      title="Add emoji"
                    >
                      <Smile size={16} />
                    </button>
                    {showNewCommentEmojiPicker && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowNewCommentEmojiPicker(false)} />
                        <SmartEmojiPickerWrapper
                          triggerRef={newCommentEmojiButtonRef}
                          onSelect={(emoji) => insertEmoji(emoji, true)}
                          onClose={() => setShowNewCommentEmojiPicker(false)}
                        />
                      </>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleSendCommentWrapper}
                  disabled={!newComment.trim() || newComment === '<br>'}
                  className={`transition-colors ${newComment.trim() && newComment !== '<br>' ? 'text-neutral-400 hover:text-white' : 'text-neutral-700 cursor-not-allowed'}`}
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2 10l16-8-8 16-2-6-6-2z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          </div>
          {/* End of Centered Content Box */}
        </div>
      </div>

      {/* Website Modal */}
      {isAddingWebsite && (
        <div
          className="fixed inset-0 bg-black/30 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => { setIsAddingWebsite(false); setWebsiteUrl(''); }}
        >
          <div
            className="bg-white dark:bg-[#161616] w-full max-w-md rounded-2xl shadow-lg dark:shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden animate-scale-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                  <Globe size={18} className="text-neutral-500 dark:text-neutral-400" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">Add Website</h2>
                  <p className="text-xs text-neutral-500">Display any website in the canvas</p>
                </div>
              </div>
              <button
                onClick={() => { setIsAddingWebsite(false); setWebsiteUrl(''); }}
                className="p-1.5 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5 block">Website URL</label>
                <input
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2.5 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-600 transition-colors"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && websiteUrl.trim()) handleAddWebsite();
                  }}
                />
              </div>
              <button
                onClick={handleAddWebsite}
                disabled={!websiteUrl.trim() || isCreatingVersion}
                className={`w-full py-2.5 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${
                  !websiteUrl.trim() || isCreatingVersion
                    ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 cursor-not-allowed'
                    : 'bg-neutral-900 dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200'
                }`}
              >
                {isCreatingVersion ? <><Loader2 size={14} className="animate-spin" /> Adding...</> : 'Add Website'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Embed Modal */}
      {isAddingEmbed && (
        <div
          className="fixed inset-0 bg-black/30 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => { setIsAddingEmbed(false); setEmbedUrl(''); }}
        >
          <div
            className="bg-white dark:bg-[#161616] w-full max-w-md rounded-2xl shadow-lg dark:shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden animate-scale-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                  <Code2 size={18} className="text-neutral-500 dark:text-neutral-400" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">Add Embed</h2>
                  <p className="text-xs text-neutral-500">YouTube, Loom, Vimeo, Miro, and more</p>
                </div>
              </div>
              <button
                onClick={() => { setIsAddingEmbed(false); setEmbedUrl(''); }}
                className="p-1.5 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5 block">Embed URL</label>
                <input
                  type="url"
                  value={embedUrl}
                  onChange={(e) => setEmbedUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2.5 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-600 transition-colors"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && embedUrl.trim()) handleAddEmbed();
                  }}
                />
              </div>
              <button
                onClick={handleAddEmbed}
                disabled={!embedUrl.trim() || isCreatingVersion}
                className={`w-full py-2.5 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${
                  !embedUrl.trim() || isCreatingVersion
                    ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 cursor-not-allowed'
                    : 'bg-neutral-900 dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200'
                }`}
              >
                {isCreatingVersion ? <><Loader2 size={14} className="animate-spin" /> Adding...</> : 'Add Embed'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Figma Import Modal */}
      {showFigmaImport && (
        <FigmaImportModal
          isOpen={showFigmaImport}
          taskId={task.id}
          onClose={() => setShowFigmaImport(false)}
          onImportComplete={onVersionCreated}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={cancelDeleteComment} />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-[#1a1a1a] border border-neutral-800 rounded-xl shadow-2xl z-50 w-80 overflow-hidden">
            <div className="p-4">
              <h3 className="text-lg font-semibold text-white mb-2">Delete Comment</h3>
              <p className="text-sm text-neutral-400 mb-4">
                Are you sure you want to delete this comment? This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={cancelDeleteComment}
                  className="px-4 py-2 text-sm text-neutral-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteComment}
                  className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
