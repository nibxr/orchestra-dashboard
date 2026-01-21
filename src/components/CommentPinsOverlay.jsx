import React from 'react';
import CommentPin from './CommentPin';

/**
 * CommentPinsOverlay - Container for all comment pins on the canvas
 * Renders pins at their percentage-based positions
 */
const CommentPinsOverlay = ({
  comments = [],
  activeCommentId = null,
  highlightedPinId = null,
  onPinClick
}) => {
  // Filter comments that have position data
  const positionedComments = comments.filter(
    comment => comment.position_x != null && comment.position_y != null
  );

  // Sort comments by creation date to maintain consistent numbering
  const sortedComments = [...positionedComments].sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at)
  );

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {/* Container that allows pointer events only on pins */}
      <div className="relative w-full h-full">
        {sortedComments.map((comment, index) => (
          <div
            key={comment.id}
            className="pointer-events-auto absolute"
            style={{
              left: `${comment.position_x}%`,
              top: `${comment.position_y}%`,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <CommentPin
              comment={comment}
              pinNumber={index + 1}
              isActive={comment.id === activeCommentId}
              isHighlighted={comment.id === highlightedPinId}
              onClick={onPinClick}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default CommentPinsOverlay;
