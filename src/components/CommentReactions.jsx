import React, { useState } from 'react';
import EmojiPicker from 'emoji-picker-react';
import { Smile, Plus } from 'lucide-react';

/**
 * CommentReactions - Display and add emoji reactions to comments
 */
const CommentReactions = ({ commentId, reactions = [], currentUserId, onAddReaction, onRemoveReaction }) => {
  const [showPicker, setShowPicker] = useState(false);

  // Group reactions by emoji
  const groupedReactions = reactions.reduce((acc, reaction) => {
    const emoji = reaction.emoji;
    if (!acc[emoji]) {
      acc[emoji] = {
        emoji,
        count: 0,
        users: [],
        userReacted: false
      };
    }
    acc[emoji].count++;
    acc[emoji].users.push(reaction.user_id);
    if (reaction.user_id === currentUserId) {
      acc[emoji].userReacted = true;
    }
    return acc;
  }, {});

  const reactionList = Object.values(groupedReactions);

  const handleEmojiClick = (emojiData) => {
    onAddReaction && onAddReaction(commentId, emojiData.emoji);
    setShowPicker(false);
  };

  const handleReactionClick = (emoji, userReacted) => {
    if (userReacted) {
      onRemoveReaction && onRemoveReaction(commentId, emoji);
    } else {
      onAddReaction && onAddReaction(commentId, emoji);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1 mt-2">
      {/* Existing Reactions */}
      {reactionList.map(({ emoji, count, userReacted, users }) => (
        <button
          key={emoji}
          onClick={() => handleReactionClick(emoji, userReacted)}
          className={`
            inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm transition-all
            ${userReacted
              ? 'bg-blue-100 dark:bg-blue-900 border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
              : 'bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
            }
          `}
          title={`${users.length} ${users.length === 1 ? 'person' : 'people'} reacted`}
        >
          <span>{emoji}</span>
          <span className="text-xs">{count}</span>
        </button>
      ))}

      {/* Add Reaction Button */}
      <div className="relative">
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
          title="Add reaction"
        >
          {showPicker ? <Plus className="w-3 h-3 rotate-45 transition-transform" /> : <Smile className="w-3 h-3" />}
        </button>

        {/* Emoji Picker */}
        {showPicker && (
          <>
            {/* Backdrop to close picker */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowPicker(false)}
            />

            {/* Picker Popup */}
            <div className="absolute bottom-full left-0 mb-2 z-50">
              <EmojiPicker
                onEmojiClick={handleEmojiClick}
                width={300}
                height={400}
                searchDisabled
                skinTonesDisabled
                previewConfig={{ showPreview: false }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CommentReactions;
