import React, { useState } from 'react';
import { Reply, Edit2, Trash2, MapPin, Check, MoreHorizontal } from 'lucide-react';
import { Avatar } from './Shared';
import CommentReactions from './CommentReactions';
import { AttachmentList } from './AttachmentUploader';
import { formatDistanceToNow } from 'date-fns';

/**
 * CommentThread - Recursive component for displaying threaded comments
 * Supports up to 3 levels of nesting
 */
const CommentThread = ({
  comment,
  allComments = [],
  depth = 0,
  currentUserId,
  isActive = false,
  onReply,
  onEdit,
  onDelete,
  onResolve,
  onAddReaction,
  onRemoveReaction,
  onClick
}) => {
  const [showActions, setShowActions] = useState(false);
  const [showReplies, setShowReplies] = useState(true);

  // Get replies for this comment
  const replies = allComments.filter(c => c.parent_comment_id === comment.id);

  const isOwner = comment.author_designer_id === currentUserId;
  const canReply = depth < 3;

  const handleReply = () => {
    onReply && onReply(comment.id);
  };

  const handleEdit = () => {
    onEdit && onEdit(comment.id);
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this comment?')) {
      onDelete && onDelete(comment.id);
    }
  };

  const handleResolve = () => {
    onResolve && onResolve(comment.id, !comment.is_resolved);
  };

  const handleClick = () => {
    onClick && onClick(comment);
  };

  // Format timestamp
  const timeAgo = comment.created_at
    ? formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })
    : '';

  return (
    <div
      className={`
        ${depth > 0 ? 'ml-6 mt-3' : 'mt-4'}
        ${isActive ? 'ring-2 ring-blue-500 rounded-lg' : ''}
      `}
    >
      <div
        className={`
          p-3 rounded-lg transition-colors cursor-pointer
          ${isActive
            ? 'bg-blue-50 dark:bg-blue-900/20'
            : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
          }
        `}
        onClick={handleClick}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        {/* Comment Header */}
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <Avatar
            name={comment.authorName || 'Unknown'}
            url={comment.authorAvatar}
            size="sm"
          />

          <div className="flex-1 min-w-0">
            {/* Author & Timestamp */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-neutral-900 dark:text-white">
                {comment.authorName || 'Unknown'}
              </span>

              {comment.is_note && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300">
                  🔒 Note
                </span>
              )}

              {comment.is_resolved && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Resolved
                </span>
              )}

              {comment.position_x != null && comment.position_y != null && (
                <MapPin className="w-3 h-3 text-neutral-400" title="Positioned comment" />
              )}

              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                {timeAgo}
              </span>
            </div>

            {/* Comment Content */}
            <div className="mt-1 text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap break-words">
              {comment.content}
            </div>

            {/* Attachments */}
            {comment.attachments && comment.attachments.length > 0 && (
              <AttachmentList attachments={comment.attachments} />
            )}

            {/* Reactions */}
            <CommentReactions
              commentId={comment.id}
              reactions={comment.reactions || []}
              currentUserId={currentUserId}
              onAddReaction={onAddReaction}
              onRemoveReaction={onRemoveReaction}
            />

            {/* Actions */}
            <div className={`flex items-center gap-2 mt-2 transition-opacity ${showActions ? 'opacity-100' : 'opacity-0'}`}>
              {canReply && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleReply(); }}
                  className="text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white flex items-center gap-1 transition-colors"
                >
                  <Reply className="w-3 h-3" />
                  Reply
                </button>
              )}

              {isOwner && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleEdit(); }}
                    className="text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white flex items-center gap-1 transition-colors"
                  >
                    <Edit2 className="w-3 h-3" />
                    Edit
                  </button>

                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                    className="text-xs text-neutral-600 dark:text-neutral-400 hover:text-red-600 dark:hover:text-red-400 flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </button>
                </>
              )}

              {!comment.is_resolved && onResolve && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleResolve(); }}
                  className="text-xs text-neutral-600 dark:text-neutral-400 hover:text-green-600 dark:hover:text-green-400 flex items-center gap-1 transition-colors"
                >
                  <Check className="w-3 h-3" />
                  Resolve
                </button>
              )}

              {comment.is_resolved && onResolve && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleResolve(); }}
                  className="text-xs text-green-600 dark:text-green-400 hover:text-neutral-600 dark:hover:text-neutral-400 flex items-center gap-1 transition-colors"
                >
                  <Check className="w-3 h-3" />
                  Unresolve
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Replies */}
      {replies.length > 0 && (
        <div className="mt-2">
          {depth < 3 ? (
            <>
              {/* Toggle button */}
              {replies.length > 0 && (
                <button
                  onClick={() => setShowReplies(!showReplies)}
                  className="text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white ml-9 mb-2 flex items-center gap-1"
                >
                  <MoreHorizontal className="w-3 h-3" />
                  {showReplies ? 'Hide' : 'Show'} {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                </button>
              )}

              {showReplies && replies.map(reply => (
                <CommentThread
                  key={reply.id}
                  comment={reply}
                  allComments={allComments}
                  depth={depth + 1}
                  currentUserId={currentUserId}
                  onReply={onReply}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onResolve={onResolve}
                  onAddReaction={onAddReaction}
                  onRemoveReaction={onRemoveReaction}
                  onClick={onClick}
                />
              ))}
            </>
          ) : (
            <button
              onClick={() => alert('View full thread to see all replies')}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline ml-9"
            >
              View {replies.length} more {replies.length === 1 ? 'reply' : 'replies'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default CommentThread;
