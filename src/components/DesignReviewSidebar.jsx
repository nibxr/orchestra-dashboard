import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus, X, Send, Briefcase, User, Calendar, Circle } from 'lucide-react';
import { Avatar } from './Shared';
import CommentThread from './CommentThread';
import AttachmentUploader from './AttachmentUploader';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '../supabaseClient';

/**
 * DesignReviewSidebar - Left sidebar with tabs, version selector, and content
 */
const DesignReviewSidebar = ({
  task,
  versions = [],
  currentVersion,
  onVersionChange,
  comments = [],
  currentUserId,
  activeCommentId,
  onCommentClick,
  onAddComment,
  onEditComment,
  onDeleteComment,
  onResolveComment,
  onAddReaction,
  onRemoveReaction,
  team = []
}) => {
  const [activeTab, setActiveTab] = useState('comments');
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showVersionMenu, setShowVersionMenu] = useState(false);
  const commentInputRef = useRef(null);
  const activeCommentRef = useRef(null);

  // Scroll to active comment when it changes
  useEffect(() => {
    if (activeCommentId && activeCommentRef.current) {
      activeCommentRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeCommentId]);

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !currentVersion) return;

    setIsSubmitting(true);
    try {
      await onAddComment({
        content: newComment,
        task_id: task.id,
        version_id: currentVersion.id,
        is_note: false
      });
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter comments for current version and get top-level comments
  const versionComments = comments.filter(c => c.version_id === currentVersion?.id);
  const topLevelComments = versionComments.filter(c => !c.parent_comment_id);

  return (
    <div className="w-96 flex flex-col bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800">
      {/* Header with Tabs */}
      <div className="border-b border-neutral-200 dark:border-neutral-800">
        {/* Tab Buttons */}
        <div className="flex">
          <button
            onClick={() => setActiveTab('details')}
            className={`
              flex-1 px-4 py-3 text-sm font-medium transition-colors border-b-2
              ${activeTab === 'details'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }
            `}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab('comments')}
            className={`
              flex-1 px-4 py-3 text-sm font-medium transition-colors border-b-2
              ${activeTab === 'comments'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }
            `}
          >
            Comments {versionComments.length > 0 && `(${versionComments.length})`}
          </button>
        </div>

        {/* Version Selector */}
        <div className="p-3 border-t border-neutral-200 dark:border-neutral-800">
          <div className="relative">
            <button
              onClick={() => setShowVersionMenu(!showVersionMenu)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors text-sm"
            >
              <span className="text-neutral-900 dark:text-white font-medium truncate">
                {currentVersion?.version_name || 'Select version'}
              </span>
              <ChevronDown className="w-4 h-4 text-neutral-500 flex-shrink-0" />
            </button>

            {showVersionMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowVersionMenu(false)}
                />
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
                  {versions.map(version => (
                    <button
                      key={version.id}
                      onClick={() => {
                        onVersionChange(version);
                        setShowVersionMenu(false);
                      }}
                      className={`
                        w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors
                        ${version.id === currentVersion?.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                      `}
                    >
                      <span className="text-neutral-900 dark:text-white truncate">
                        {version.version_name}
                      </span>
                      <span className="text-xs text-neutral-500 ml-2">
                        v{version.version_number}
                      </span>
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      setShowVersionMenu(false);
                      // TODO: Open add version modal
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors border-t border-neutral-200 dark:border-neutral-700"
                  >
                    <Plus className="w-4 h-4" />
                    Add version
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'details' ? (
          /* Details Tab */
          <div className="p-4 space-y-4">
            {/* Task Title */}
            <div>
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">
                {task.title}
              </h2>
            </div>

            {/* Properties */}
            <div className="space-y-3 border-t border-neutral-200 dark:border-neutral-800 pt-4">
              {/* Customer */}
              <div className="flex items-center gap-3">
                <div className="w-24 text-sm text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  Customer
                </div>
                <div className="flex-1 text-sm text-neutral-900 dark:text-white">
                  {task.clientName || 'Internal'}
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-3">
                <div className="w-24 text-sm text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
                  <Circle className="w-4 h-4" />
                  Status
                </div>
                <div className="flex-1 text-sm text-neutral-900 dark:text-white">
                  {task.status}
                </div>
              </div>

              {/* Assignee */}
              <div className="flex items-center gap-3">
                <div className="w-24 text-sm text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Assignee
                </div>
                <div className="flex-1">
                  {task.assigneeName ? (
                    <div className="flex items-center gap-2">
                      <Avatar name={task.assigneeName} url={task.assigneeAvatar} size="sm" />
                      <span className="text-sm text-neutral-900 dark:text-white">
                        {task.assigneeName}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-neutral-500 dark:text-neutral-400">Unassigned</span>
                  )}
                </div>
              </div>

              {/* Created By */}
              <div className="flex items-center gap-3">
                <div className="w-24 text-sm text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Created By
                </div>
                <div className="flex-1">
                  {task.creatorName ? (
                    <div className="flex items-center gap-2">
                      <Avatar name={task.creatorName} url={task.creatorAvatar} size="sm" />
                      <span className="text-sm text-neutral-900 dark:text-white">
                        {task.creatorName}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-neutral-500 dark:text-neutral-400">Unknown</span>
                  )}
                </div>
              </div>

              {/* Due Date */}
              {task.delivered_at && (
                <div className="flex items-center gap-3">
                  <div className="w-24 text-sm text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Due Date
                  </div>
                  <div className="flex-1 text-sm text-neutral-900 dark:text-white">
                    {new Date(task.delivered_at).toLocaleDateString()}
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            {task.description && (
              <div className="border-t border-neutral-200 dark:border-neutral-800 pt-4">
                <h3 className="text-sm font-medium text-neutral-900 dark:text-white mb-2">
                  Description
                </h3>
                <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                  {task.description}
                </p>
              </div>
            )}
          </div>
        ) : (
          /* Comments Tab */
          <div className="flex flex-col h-full">
            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-4">
              {topLevelComments.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-neutral-500 dark:text-neutral-400 text-sm">
                    No comments yet
                  </p>
                  <p className="text-neutral-400 dark:text-neutral-500 text-xs mt-1">
                    Add a comment or click the canvas to place a pin
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {topLevelComments.map(comment => (
                    <div
                      key={comment.id}
                      ref={comment.id === activeCommentId ? activeCommentRef : null}
                    >
                      <CommentThread
                        comment={comment}
                        allComments={versionComments}
                        depth={0}
                        currentUserId={currentUserId}
                        isActive={comment.id === activeCommentId}
                        onReply={(parentId) => console.log('Reply to:', parentId)}
                        onEdit={(commentId) => console.log('Edit:', commentId)}
                        onDelete={onDeleteComment}
                        onResolve={onResolveComment}
                        onAddReaction={onAddReaction}
                        onRemoveReaction={onRemoveReaction}
                        onClick={onCommentClick}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Comment Input */}
            <div className="border-t border-neutral-200 dark:border-neutral-800 p-4 bg-neutral-50 dark:bg-neutral-900">
              <div className="space-y-2">
                <textarea
                  ref={commentInputRef}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      handleSubmitComment();
                    }
                  }}
                  placeholder="Add a comment..."
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
                  rows={3}
                  disabled={isSubmitting || !currentVersion}
                />
                <div className="flex justify-between items-center">
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {currentVersion ? 'Press Cmd+Enter to send' : 'Select a version to comment'}
                  </p>
                  <button
                    onClick={handleSubmitComment}
                    disabled={!newComment.trim() || isSubmitting || !currentVersion}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="w-4 h-4" />
                    {isSubmitting ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DesignReviewSidebar;
