import React, { useState, useEffect } from 'react';

/**
 * CommentPin - Visual pin marker on canvas for positioned comments
 * Shows comment number and preview on hover with author info
 */
const CommentPin = ({
  comment,
  pinNumber,
  isActive = false,
  isHighlighted = false,
  onClick
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showHighlight, setShowHighlight] = useState(false);

  // Temporary highlight effect when isActive changes to true
  useEffect(() => {
    if (isActive) {
      setShowHighlight(true);
      const timer = setTimeout(() => {
        setShowHighlight(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isActive]);

  const handleClick = (e) => {
    e.stopPropagation();
    onClick && onClick(comment);
  };

  // Pin style - positioning is handled by parent container
  const pinStyle = {
    position: 'relative',
    zIndex: isHovered ? 50 : (isActive || isHighlighted ? 40 : 10),
  };

  // Pin marker color - white ring when highlighted, otherwise neutral dark
  const getPinClasses = () => {
    const base = 'w-7 h-7 rounded-full flex items-center justify-center border-2 shadow-lg transition-all duration-300 hover:scale-110';
    if (showHighlight) {
      return `${base} bg-neutral-800 border-white ring-2 ring-white scale-110`;
    }
    if (isHovered) {
      return `${base} bg-neutral-700 border-neutral-600 scale-110`;
    }
    return `${base} bg-neutral-800 border-neutral-700 scale-100`;
  };

  // Get author initials for fallback avatar
  const getInitials = () => {
    const name = comment.authorName || '';
    if (!name || name === 'Team Member' || name === 'Client') {
      return '?';
    }
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div
      style={pinStyle}
      className="cursor-pointer"
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Pin Marker */}
      <div className={getPinClasses()}>
        <span className="text-white text-xs font-bold">{pinNumber}</span>
      </div>

      {/* Hover Preview Card */}
      {isHovered && (
        <div
          className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 w-72 bg-[#1c1c1c] rounded-lg shadow-2xl border border-neutral-700 p-3 z-50"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Arrow pointer */}
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-b-8 border-transparent border-b-[#1c1c1c]"></div>

          {/* Comment preview content */}
          <div className="space-y-2">
            {/* Author row with avatar and name */}
            <div className="flex items-center gap-2">
              {/* Author avatar */}
              {comment.authorAvatar ? (
                <img
                  src={comment.authorAvatar}
                  alt=""
                  className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-neutral-600 to-neutral-700 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-[10px] font-medium">
                    {getInitials()}
                  </span>
                </div>
              )}

              {/* Author name */}
              <span className="text-sm font-medium text-white">
                {comment.authorName && comment.authorName !== 'Team Member' && comment.authorName !== 'Client'
                  ? comment.authorName
                  : 'Unknown User'}
              </span>
            </div>

            {/* Comment content preview */}
            <div className="text-sm text-neutral-300 line-clamp-3">
              {comment.content || 'No content'}
            </div>

            {/* Reply count */}
            {comment.replyCount > 0 && (
              <div className="text-xs text-neutral-500">
                {comment.replyCount} {comment.replyCount === 1 ? 'reply' : 'replies'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CommentPin;
