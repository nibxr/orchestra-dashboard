import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from './Icon';

// Icon wrapper components for dynamic rendering (e.g. emoji category tabs, CustomSelect props)
const ClockIcon = (props) => <Icon name="clock-01" {...props} />;
const SmileIcon = (props) => <Icon name="smiley-happy" {...props} />;
const CatIcon = (props) => <Icon name="smiley-happy" {...props} />;
const UtensilsCrossedIcon = (props) => <Icon name="dash" {...props} />;
const CarIcon = (props) => <Icon name="car" {...props} />;
const PartyPopperIcon = (props) => <Icon name="star-02" {...props} />;
const MusicIcon = (props) => <Icon name="volume-01" {...props} />;
const FlagIcon = (props) => <Icon name="favourite" {...props} />;
const TagIcon = (props) => <Icon name="tag" {...props} />;
const UserIcon = (props) => <Icon name="user-profile-01" {...props} />;
const CalendarIcon = (props) => <Icon name="calendar-01" {...props} />;
const Building2Icon = (props) => <Icon name="bank" {...props} />;
import { CustomSelect } from './CustomUI';
import { STATUS_CONFIG } from '../utils/constants';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';
import { useConfirm } from './ConfirmModal';
import CommentPinsOverlay from './CommentPinsOverlay';
import CommentPin from './CommentPin';
import FigmaImportModal from './FigmaImportModal';
import { getVersionFrames } from '../utils/figmaService';
import { createVersion, deleteVersion } from '../utils/versionService';
import { DeliverablesForm } from './DeliverablesForm';

// Emoji data organized by category
const emojiCategories = {
  recent: { icon: ClockIcon, label: 'Recent', emojis: ['😀', '👍', '❤️', '🎉', '✅', '🔥', '💯', '🚀'] },
  smileys: {
    icon: SmileIcon,
    label: 'Smileys & People',
    emojis: [
      '😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂',
      '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋',
      '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐',
      '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '😮', '🥱',
      '😴', '🤤', '😪', '😵', '🤯', '🤠', '🥳', '🥸', '😎', '🤓',
      '🧐', '😕', '😟', '🙁', '😯', '😲', '😳', '🥺', '😦', '😧',
      '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓',
      '😩', '😫', '😤', '😡', '😠', '🤬', '😈', '👿', '👋', '🤚',
      '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘',
      '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊',
      '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '💪'
    ]
  },
  animals: {
    icon: CatIcon,
    label: 'Animals & Nature',
    emojis: [
      '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
      '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆',
      '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋',
      '🐌', '🐞', '🐜', '🦟', '🦗', '🌸', '💐', '🌷', '🌹', '🌺'
    ]
  },
  food: {
    icon: UtensilsCrossedIcon,
    label: 'Food & Drink',
    emojis: [
      '🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒',
      '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🥑', '🍆', '🥔', '🥕',
      '🌽', '🌶️', '🥒', '🥬', '🥦', '🧄', '🧅', '🍄', '🥜', '🌰',
      '🍞', '🥐', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇'
    ]
  },
  travel: {
    icon: CarIcon,
    label: 'Travel & Places',
    emojis: [
      '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐',
      '🛻', '🚚', '🚛', '🚜', '🏍️', '🛵', '🚲', '🛴', '✈️', '🚀',
      '🛸', '🚁', '⛵', '🚤', '🛥️', '🛳️', '⛴️', '🚢', '🏠', '🏡',
      '🏢', '🏣', '🏥', '🏦', '🏨', '🏩', '🏪', '🏫', '🏬', '🏭'
    ]
  },
  activities: {
    icon: PartyPopperIcon,
    label: 'Activities',
    emojis: [
      '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱',
      '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳',
      '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛼', '🛷',
      '⛸️', '🥌', '🎿', '⛷️', '🏂', '🎯', '🎮', '🎰', '🎲', '🧩'
    ]
  },
  objects: {
    icon: MusicIcon,
    label: 'Objects',
    emojis: [
      '⌚', '📱', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '💽', '💾',
      '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽️', '🎞️', '📞',
      '☎️', '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '🧭', '⏱️',
      '⏲️', '⏰', '🕰️', '⌛', '⏳', '📡', '🔋', '🔌', '💡', '🔦'
    ]
  },
  symbols: {
    icon: FlagIcon,
    label: 'Symbols',
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
      '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '✅', '❌',
      '⭕', '❗', '❓', '❕', '❔', '⁉️', '‼️', '💯', '🔴', '🟠',
      '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🟤', '🔺', '🔻', '🔸'
    ]
  }
};

// EmojiPicker Component with smart positioning
const EmojiPicker = ({ onSelect, onClose, position = 'auto', triggerRef }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('smileys');
  const [selectedColor, setSelectedColor] = useState('#FFCC00');
  const pickerRef = useRef(null);
  const [adjustedPosition, setAdjustedPosition] = useState({ top: false, left: false });

  // Calculate position to avoid overflow
  useEffect(() => {
    if (pickerRef.current) {
      const rect = pickerRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      setAdjustedPosition({
        top: rect.bottom > viewportHeight - 20,
        left: rect.right > viewportWidth - 20
      });
    }
  }, []);

  const filteredEmojis = searchQuery
    ? Object.values(emojiCategories).flatMap(cat => cat.emojis).filter(emoji => emoji.includes(searchQuery))
    : emojiCategories[activeCategory]?.emojis || [];

  const categoryKeys = Object.keys(emojiCategories);

  return (
    <div
      ref={pickerRef}
      className="bg-white rounded-xl shadow-2xl w-80 overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Search bar and color picker */}
      <div className="p-3 border-b border-neutral-200">
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-neutral-100 rounded-lg">
            <Icon name="search-01" size={16} className="text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search"
              className="flex-1 bg-transparent text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none"
            />
          </div>
          <div
            className="w-8 h-8 rounded-lg cursor-pointer"
            style={{ backgroundColor: selectedColor }}
            title="Skin tone"
          />
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-neutral-200 overflow-x-auto">
        {categoryKeys.map((key) => {
          const category = emojiCategories[key];
          const IconComponent = category.icon;
          return (
            <button
              key={key}
              onClick={() => { setActiveCategory(key); setSearchQuery(''); }}
              className={`p-2 rounded-lg transition-colors ${
                activeCategory === key && !searchQuery
                  ? 'bg-neutral-200 text-neutral-900'
                  : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700'
              }`}
              title={category.label}
            >
              <IconComponent size={18} />
            </button>
          );
        })}
      </div>

      {/* Category label */}
      {!searchQuery && (
        <div className="px-3 py-2">
          <span className="text-sm font-medium text-neutral-700">
            {emojiCategories[activeCategory]?.label}
          </span>
        </div>
      )}

      {/* Emoji grid */}
      <div className="px-3 pb-3 max-h-64 overflow-y-auto">
        <div className="grid grid-cols-8 gap-1">
          {filteredEmojis.map((emoji, idx) => (
            <button
              key={idx}
              onClick={() => onSelect(emoji)}
              className="w-8 h-8 flex items-center justify-center text-xl hover:bg-neutral-100 rounded-lg transition-colors"
            >
              {emoji}
            </button>
          ))}
        </div>
        {searchQuery && filteredEmojis.length === 0 && (
          <div className="text-center py-8 text-neutral-500 text-sm">
            No emojis found
          </div>
        )}
      </div>
    </div>
  );
};

// Quick Reaction Picker - compact version for comment hover
export const QuickReactionPicker = ({ onSelect, onOpenFull }) => {
  const quickEmojis = ['🔥', '✅', '👀', '🙌', '👍', '👎'];

  return (
    <div className="flex items-center gap-0.5 bg-white rounded-full shadow-lg px-1.5 py-1 border border-neutral-200" onClick={(e) => e.stopPropagation()}>
      {quickEmojis.map((emoji, idx) => (
        <button
          key={idx}
          onClick={() => onSelect(emoji)}
          className="w-7 h-7 flex items-center justify-center text-base hover:bg-neutral-100 rounded-full transition-colors"
        >
          {emoji}
        </button>
      ))}
      <button
        onClick={onOpenFull}
        className="w-7 h-7 flex items-center justify-center text-neutral-400 hover:bg-neutral-100 rounded-full transition-colors"
        title="More emojis"
      >
        <Icon name="dot-horizontal" size={16} />
      </button>
    </div>
  );
};

// Smart positioned emoji picker wrapper that prevents overflow
export const SmartEmojiPickerWrapper = ({ triggerRef, onSelect, onClose, children }) => {
  const [position, setPosition] = useState({ top: 0, left: 0, openUpward: false, openLeftward: false });
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (triggerRef?.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const pickerWidth = 320; // w-80 = 320px
      const pickerHeight = 400; // approximate height
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const sidebarWidth = 375; // sidebar width

      // Calculate if we need to open upward or downward
      const spaceBelow = viewportHeight - triggerRect.bottom;
      const spaceAbove = triggerRect.top;
      const openUpward = spaceBelow < pickerHeight && spaceAbove > spaceBelow;

      // Calculate if we need to open leftward or rightward
      const spaceRight = viewportWidth - triggerRect.left;
      const openLeftward = spaceRight < pickerWidth;

      // Calculate position
      let top = openUpward ? triggerRect.top - pickerHeight - 8 : triggerRect.bottom + 8;
      let left = openLeftward ? Math.max(8, triggerRect.right - pickerWidth) : triggerRect.left;

      // Make sure it doesn't go off screen
      if (left + pickerWidth > viewportWidth - 8) {
        left = viewportWidth - pickerWidth - 8;
      }
      if (left < sidebarWidth + 8) {
        left = Math.min(triggerRect.left, sidebarWidth + 8);
      }
      if (top < 8) top = 8;
      if (top + pickerHeight > viewportHeight - 8) {
        top = viewportHeight - pickerHeight - 8;
      }

      setPosition({ top, left, openUpward, openLeftward });
    }
  }, [triggerRef]);

  return (
    <div
      ref={wrapperRef}
      className="fixed z-50"
      style={{ top: position.top, left: position.left }}
    >
      <EmojiPicker onSelect={onSelect} onClose={onClose} />
    </div>
  );
};

// Reaction emoji picker with smart positioning (used from comment hover)
const ReactionEmojiPickerPositioned = ({ onSelect, onClose }) => {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const wrapperRef = useRef(null);

  useEffect(() => {
    // Position in the center-ish of the sidebar, avoiding edges
    const pickerWidth = 320;
    const pickerHeight = 400;
    const viewportHeight = window.innerHeight;
    const sidebarWidth = 375;

    // Position it centered horizontally within the sidebar and vertically centered
    let left = Math.max(8, (sidebarWidth - pickerWidth) / 2);
    let top = Math.max(80, (viewportHeight - pickerHeight) / 2);

    // Make sure it doesn't go off screen
    if (top + pickerHeight > viewportHeight - 8) {
      top = viewportHeight - pickerHeight - 8;
    }

    setPosition({ top, left });
  }, []);

  return (
    <div
      ref={wrapperRef}
      className="fixed z-50"
      style={{ top: position.top, left: position.left }}
    >
      <EmojiPicker onSelect={onSelect} onClose={onClose} />
    </div>
  );
};

/**
 * ImprovedDesignReview - Figma-style design review interface matching reference images exactly
 */
export const ImprovedDesignReview = ({
  task,
  versions,
  currentVersion,
  onVersionChange,
  onVersionDeleted,
  comments,
  team,
  onUpdateTask,
  onAddComment,
  onDeleteComment,
  onUpdateComment,
  onAddReaction,
  onRemoveReaction,
  currentUserId
}) => {
  const { user, userRole, clientContactId } = useAuth();
  const isCustomer = userRole === 'customer';
  const navigate = useNavigate();
  const toast = useToast();
  const { confirm } = useConfirm();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // --- Draggable sidebar resize ---
  const REVIEW_SIDEBAR_MIN = 300;
  const REVIEW_SIDEBAR_MAX = 960;
  const REVIEW_SIDEBAR_DEFAULT = 375;
  const [reviewSidebarWidth, setReviewSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('review-sidebar-width');
    return saved ? Math.min(REVIEW_SIDEBAR_MAX, Math.max(REVIEW_SIDEBAR_MIN, Number(saved))) : REVIEW_SIDEBAR_DEFAULT;
  });
  const isDraggingSidebarRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartWidthRef = useRef(REVIEW_SIDEBAR_DEFAULT);
  const [isDraggingSidebar, setIsDraggingSidebar] = useState(false);

  const handleSidebarResizeStart = useCallback((e) => {
    e.preventDefault();
    isDraggingSidebarRef.current = true;
    setIsDraggingSidebar(true);
    dragStartXRef.current = e.clientX;
    dragStartWidthRef.current = reviewSidebarWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [reviewSidebarWidth]);

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!isDraggingSidebarRef.current) return;
      const delta = e.clientX - dragStartXRef.current;
      const newW = Math.min(REVIEW_SIDEBAR_MAX, Math.max(REVIEW_SIDEBAR_MIN, dragStartWidthRef.current + delta));
      setReviewSidebarWidth(newW);
    };
    const onMouseUp = () => {
      if (!isDraggingSidebarRef.current) return;
      isDraggingSidebarRef.current = false;
      setIsDraggingSidebar(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      setReviewSidebarWidth(w => { localStorage.setItem('review-sidebar-width', w); return w; });
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp); };
  }, []);

  const [activeTab, setActiveTab] = useState('details');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task.title);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState(task.description || '');
  const [newComment, setNewComment] = useState('');
  const [newNote, setNewNote] = useState('');
  const [canvasMode, setCanvasMode] = useState('view');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [versionMenuOpen, setVersionMenuOpen] = useState(false);
  const [taskMenuOpen, setTaskMenuOpen] = useState(false);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [hideOtherVersions, setHideOtherVersions] = useState(false);
  const [hideCommentBubbles, setHideCommentBubbles] = useState(false);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [commentBoxPosition, setCommentBoxPosition] = useState({ x: 0, y: 0 });
  const [positionedCommentText, setPositionedCommentText] = useState('');
  const [activeCommentId, setActiveCommentId] = useState(null);
  const [highlightedPinId, setHighlightedPinId] = useState(null);
  const iframeRef = useRef(null);
  const canvasContainerRef = useRef(null);
  const framesContainerRef = useRef(null);

  // Figma import state
  const [showFigmaImport, setShowFigmaImport] = useState(false);
  const [versionFrames, setVersionFrames] = useState([]);
  const [loadingFrames, setLoadingFrames] = useState(false);

  // Embed/Website URL modal state
  const [showEmbedModal, setShowEmbedModal] = useState(false);
  const [showWebsiteModal, setShowWebsiteModal] = useState(false);
  const [embedUrlInput, setEmbedUrlInput] = useState('');
  const [websiteUrlInput, setWebsiteUrlInput] = useState('');
  const [isCreatingVersion, setIsCreatingVersion] = useState(false);

  // Delete version state
  const [showDeleteVersionModal, setShowDeleteVersionModal] = useState(false);
  const [versionToDelete, setVersionToDelete] = useState(null);
  const [isDeletingVersion, setIsDeletingVersion] = useState(false);

  // Deliverables state
  const [showDeliverablesForm, setShowDeliverablesForm] = useState(false);

  // Fetch frames when version changes
  useEffect(() => {
    const fetchFrames = async () => {
      if (currentVersion?.id) {
        setLoadingFrames(true);
        const { data: frames } = await getVersionFrames(currentVersion.id);
        setVersionFrames(frames || []);
        setLoadingFrames(false);
        // Auto-enable version filter when switching versions
        setHideOtherVersions(true);
      } else {
        setVersionFrames([]);
      }
    };
    fetchFrames();
  }, [currentVersion?.id]);

  // Determine display mode: 'frames' for imported frames, 'embed' for URL embeds
  const displayMode = versionFrames.length > 0 ? 'frames' : 'embed';

  // Status options
  const statusOptions = Object.keys(STATUS_CONFIG).map(s => ({ value: s, label: s }));

  // Team options for assignee
  const teamOptions = team?.map(member => ({
    value: member.id,
    label: member.full_name || member.email || 'Unknown',
    avatar: member.avatar_url
  })) || [];

  // Find assignee and creator
  const assignee = team?.find(t => t.id === task.assigned_to_id);
  const assigneeName = task.assigneeName || assignee?.full_name || 'Unassigned';
  const assigneeAvatar = task.assigneeAvatar || assignee?.avatar_url;

  const createdById = task.created_by_team_id || task.properties?.createdById;
  const creator = team?.find(t => t.id === createdById);
  const creatorName = task.creatorName || creator?.full_name || 'Unknown';
  const creatorAvatar = task.creatorAvatar || creator?.avatar_url;

  const helper = team?.find(t => t.id === task.helper_id);
  const helperName = task.helperName || helper?.full_name || null;
  const helperAvatar = task.helperAvatar || helper?.avatar_url;

  const handleUpdateTitle = async () => {
    if (editedTitle.trim() && editedTitle !== task.title) {
      await onUpdateTask(task.id, { title: editedTitle });
    }
    setIsEditingTitle(false);
  };

  const handleUpdateDescription = async () => {
    if (editedDescription !== task.description) {
      await onUpdateTask(task.id, { description: editedDescription });
    }
    setIsEditingDescription(false);
  };

  const handleStatusChange = async (newStatus) => {
    await onUpdateTask(task.id, { status: newStatus });
  };

  const handleAssigneeChange = async (newAssigneeId) => {
    await onUpdateTask(task.id, { assigned_to_id: newAssigneeId });
  };

  const handleCreatorChange = async (newCreatorId) => {
    await onUpdateTask(task.id, { created_by_team_id: newCreatorId });
  };

  const handleSendComment = async () => {
    if (!newComment.trim()) return;

    const currentTeamMember = team?.find(t => t.email === user?.email);

    await onAddComment({
      content: newComment,
      task_id: task.id,
      version_id: currentVersion?.id,
      author_designer_id: isCustomer ? null : (currentTeamMember?.id || null),
      author_contact_id: isCustomer ? clientContactId : null
    });

    setNewComment('');
  };

  const handleSendNote = async () => {
    if (!newNote.trim()) return;

    const currentTeamMember = team?.find(t => t.email === user?.email);

    await onAddComment({
      content: newNote,
      task_id: task.id,
      version_id: currentVersion?.id || null,
      author_designer_id: isCustomer ? null : (currentTeamMember?.id || null),
      author_contact_id: isCustomer ? clientContactId : null,
      is_note: true
    });

    setNewNote('');
  };

  const handleSendPositionedComment = async () => {
    if (!positionedCommentText.trim()) return;

    const currentTeamMember = team?.find(t => t.email === user?.email);

    let relativeX = 0;
    let relativeY = 0;

    if (displayMode === 'frames' && framesContainerRef.current) {
      // For frames mode, calculate position relative to the frames container
      const framesRect = framesContainerRef.current.getBoundingClientRect();
      const containerRect = canvasContainerRef.current?.getBoundingClientRect();

      // The click position is in viewport coordinates relative to canvasContainer
      // We need to convert it to be relative to the framesContainer (which is transformed)
      // Account for the transform (pan + zoom)
      const clickX = commentBoxPosition.x;
      const clickY = commentBoxPosition.y;

      // Get the frames container position relative to canvas container
      const framesOffsetX = framesRect.left - (containerRect?.left || 0);
      const framesOffsetY = framesRect.top - (containerRect?.top || 0);

      // Calculate position as percentage of frames container
      relativeX = ((clickX - framesOffsetX) / framesRect.width) * 100;
      relativeY = ((clickY - framesOffsetY) / framesRect.height) * 100;
    } else {
      // For embed mode, use canvas container
      const containerRect = canvasContainerRef.current?.getBoundingClientRect();
      relativeX = containerRect ? (commentBoxPosition.x / containerRect.width) * 100 : 0;
      relativeY = containerRect ? (commentBoxPosition.y / containerRect.height) * 100 : 0;
    }

    await onAddComment({
      content: positionedCommentText,
      task_id: task.id,
      version_id: currentVersion?.id,
      author_designer_id: isCustomer ? null : (currentTeamMember?.id || null),
      author_contact_id: isCustomer ? clientContactId : null,
      position_x: relativeX,
      position_y: relativeY
    });

    setPositionedCommentText('');
    setShowCommentBox(false);
  };

  const handleZoom = (delta) => {
    setZoomLevel(prev => Math.max(0.25, Math.min(3, prev + delta)));
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    handleZoom(delta);
  };

  const handleCanvasMouseDown = (e) => {
    if (canvasMode === 'view') {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panPosition.x, y: e.clientY - panPosition.y });
    } else if (canvasMode === 'comment') {
      // If comment box is already open, close it instead of opening a new one
      if (showCommentBox) {
        setShowCommentBox(false);
        setPositionedCommentText('');
      } else {
        // Open new comment box at click position
        const rect = canvasContainerRef.current.getBoundingClientRect();
        setCommentBoxPosition({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        });
        setPositionedCommentText(''); // Reset text for new comment
        setShowCommentBox(true);
      }
    }
  };

  const handleCanvasMouseMove = (e) => {
    if (isPanning && canvasMode === 'view') {
      setPanPosition({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
    }
  };

  const handleCanvasMouseUp = () => {
    setIsPanning(false);
  };

  // Comment cursor SVG - matches the MessageCircle icon from the toolbar
  const commentCursorSvg = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M7.9 20A9 9 0 1 0 4 16.1L2 22Z'/%3E%3C/svg%3E`;

  const getCursorStyle = () => {
    if (canvasMode === 'view') {
      return isPanning ? 'grabbing' : 'grab';
    } else if (canvasMode === 'comment') {
      return `url("${commentCursorSvg}") 4 4, crosshair`;
    }
    return 'default';
  };

  const handleDeleteTask = async () => {
    const confirmed = await confirm({
      title: 'Delete task',
      message: 'Are you sure you want to delete this task? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'danger'
    });
    if (confirmed) {
      const { error } = await supabase.from('tasks').delete().eq('id', task.id);
      if (!error) {
        window.close();
      }
    }
  };

  const handleViewInNewPage = () => {
    if (currentVersion?.embed_url) {
      window.open(currentVersion.embed_url, '_blank');
    }
  };

  // Add embed URL as a new version
  const handleAddEmbed = async () => {
    if (!embedUrlInput.trim()) return;
    setIsCreatingVersion(true);
    try {
      const { data, error } = await createVersion(task.id, embedUrlInput.trim(), null, user?.id);
      if (error) throw error;
      toast.success('Embed added successfully');
      setEmbedUrlInput('');
      setShowEmbedModal(false);
      if (onVersionChange) onVersionChange(data);
    } catch (error) {
      console.error('Error creating embed version:', error);
      toast.error('Failed to add embed');
    } finally {
      setIsCreatingVersion(false);
    }
  };

  // Add website URL as a new version
  const handleAddWebsite = async () => {
    if (!websiteUrlInput.trim()) return;
    setIsCreatingVersion(true);
    try {
      const { data, error } = await createVersion(task.id, websiteUrlInput.trim(), null, user?.id);
      if (error) throw error;
      toast.success('Website added successfully');
      setWebsiteUrlInput('');
      setShowWebsiteModal(false);
      if (onVersionChange) onVersionChange(data);
    } catch (error) {
      console.error('Error creating website version:', error);
      toast.error('Failed to add website');
    } finally {
      setIsCreatingVersion(false);
    }
  };

  // Delete a version
  const handleDeleteVersion = async () => {
    if (!versionToDelete) return;
    setIsDeletingVersion(true);
    try {
      const { error } = await deleteVersion(versionToDelete.id);
      if (error) throw error;

      toast.success(`Version ${versionToDelete.version_number} deleted`);

      setShowDeleteVersionModal(false);
      setVersionToDelete(null);

      // Let the parent refetch versions and handle state
      // If no versions remain, parent will render VersionlessTaskView
      if (onVersionDeleted) {
        await onVersionDeleted();
      } else {
        // Fallback: refresh via onVersionChange
        const remaining = versions.filter(v => v.id !== versionToDelete.id);
        if (remaining.length > 0) {
          onVersionChange(remaining[remaining.length - 1]);
        }
      }
    } catch (error) {
      console.error('Error deleting version:', error);
      toast.error('Failed to delete version');
    } finally {
      setIsDeletingVersion(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-[#0f0f0f]">
      {/* Header */}
      <div className="h-14 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between px-6 bg-white dark:bg-[#0f0f0f] shrink-0 relative">
        <div className="flex items-center gap-4">
          {/* Back button */}
          <button
            onClick={() => navigate('/')}
            className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            <Icon name="arrow-left" size={20} />
          </button>
          {/* Task Title - Editable */}
          {isEditingTitle ? (
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onBlur={handleUpdateTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleUpdateTitle();
                if (e.key === 'Escape') {
                  setEditedTitle(task.title);
                  setIsEditingTitle(false);
                }
              }}
              autoFocus
              className="bg-transparent text-neutral-900 dark:text-white font-lastik text-base px-2 py-1 border border-neutral-300 dark:border-neutral-700 rounded focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-500"
            />
          ) : (
            <h1
              className="text-neutral-900 dark:text-white font-lastik cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800/50 px-2 py-1 rounded"
              onClick={() => setIsEditingTitle(true)}
            >
              {task.title}
            </h1>
          )}

          {/* Version Selector with Dropdown */}
          {versions.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setVersionMenuOpen(!versionMenuOpen)}
                className="flex items-center gap-1.5 bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-600 transition-colors"
              >
                <span>Version {currentVersion?.version_number || 1}</span>
                <Icon name="chevron-down" size={12} className={`transition-transform ${versionMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Version dropdown menu */}
              {versionMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setVersionMenuOpen(false)} />
                  <div className="absolute top-full left-0 mt-1.5 w-52 bg-white dark:bg-[#161616] border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-lg dark:shadow-2xl z-50 overflow-hidden animate-scale-up">
                    {/* Version list */}
                    <div className="p-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                      <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider px-2.5 py-1.5">Versions</p>
                      {versions.map((v) => (
                        <div
                          key={v.id}
                          className={`group w-full flex items-center gap-2.5 px-2.5 py-2 text-sm rounded-lg transition-colors ${
                            currentVersion?.id === v.id
                              ? 'text-neutral-900 dark:text-white bg-neutral-100 dark:bg-neutral-800/80'
                              : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                          }`}
                        >
                          <button
                            onClick={() => {
                              onVersionChange(v);
                              setVersionMenuOpen(false);
                            }}
                            className="flex-1 flex items-center gap-2.5 text-left"
                          >
                            <span className="font-medium">v{v.version_number}</span>
                            {v.embed_type && (
                              <span className="text-[10px] text-neutral-400 dark:text-neutral-500 capitalize">{v.embed_type}</span>
                            )}
                            {currentVersion?.id === v.id && (
                              <span className="ml-auto text-[10px] text-neutral-400 dark:text-neutral-500">Current</span>
                            )}
                          </button>
                          {!isCustomer && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setVersionToDelete(v);
                              setShowDeleteVersionModal(true);
                              setVersionMenuOpen(false);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded text-neutral-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all"
                            title="Delete version"
                          >
                            <Icon name="trash-01" size={12} />
                          </button>
                          )}
                        </div>
                      ))}
                    </div>
                    {/* Add new version options */}
                    {!isCustomer && (
                    <div className="border-t border-neutral-100 dark:border-neutral-800 p-1.5">
                      <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider px-2.5 py-1.5">Add new</p>
                      <button
                        onClick={() => {
                          setShowFigmaImport(true);
                          setVersionMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 text-sm text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 rounded-lg transition-colors"
                      >
                        <svg width="14" height="14" viewBox="0 0 38 57" fill="currentColor" className="opacity-60">
                          <path d="M19 28.5C19 23.2533 23.2533 19 28.5 19C33.7467 19 38 23.2533 38 28.5C38 33.7467 33.7467 38 28.5 38C23.2533 38 19 33.7467 19 28.5Z"/>
                          <path d="M0 47.5C0 42.2533 4.25329 38 9.5 38H19V47.5C19 52.7467 14.7467 57 9.5 57C4.25329 57 0 52.7467 0 47.5Z"/>
                          <path d="M19 0V19H28.5C33.7467 19 38 14.7467 38 9.5C38 4.25329 33.7467 0 28.5 0H19Z"/>
                          <path d="M0 9.5C0 14.7467 4.25329 19 9.5 19H19V0H9.5C4.25329 0 0 4.25329 0 9.5Z"/>
                          <path d="M0 28.5C0 33.7467 4.25329 38 9.5 38H19V19H9.5C4.25329 19 0 23.2533 0 28.5Z"/>
                        </svg>
                        Figma
                      </button>
                      <button
                        onClick={() => {
                          setShowEmbedModal(true);
                          setVersionMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 text-sm text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 rounded-lg transition-colors"
                      >
                        <Icon name="code-01" size={14} className="opacity-60" />
                        Embed
                      </button>
                      <button
                        onClick={() => {
                          setShowWebsiteModal(true);
                          setVersionMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 text-sm text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 rounded-lg transition-colors"
                      >
                        <Icon name="globe" size={14} className="opacity-60" />
                        Website
                      </button>
                    </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Task Menu - Far right (hidden for clients) */}
        {!isCustomer && (
        <div className="relative">
          <button
            onClick={() => setTaskMenuOpen(!taskMenuOpen)}
            className="p-2 rounded text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title="Task options"
          >
            <Icon name="dot-horizontal" size={18} />
          </button>

          {taskMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setTaskMenuOpen(false)} />
              <div className="absolute top-full right-0 mt-1 w-48 bg-white dark:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-xl z-50 overflow-hidden">
                <button
                  onClick={() => {
                    // Copy share link
                    navigator.clipboard.writeText(window.location.href);
                    setTaskMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <Icon name="share" size={16} />
                  Copy share link
                </button>
                <button
                  onClick={() => {
                    handleViewInNewPage();
                    setTaskMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <Icon name="link-external" size={16} />
                  View in new tab
                </button>
                <div className="border-t border-neutral-200 dark:border-neutral-800">
                  <button
                    onClick={() => {
                      handleDeleteTask();
                      setTaskMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 dark:text-red-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  >
                    <Icon name="trash-01" size={16} />
                    Delete task
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
        )}

        {/* Canvas Controls - Centered relative to canvas area (offset by sidebar width) */}
        <div
          className="flex items-center justify-center gap-3 transition-all duration-300 ease-in-out"
          style={{
            position: 'absolute',
            left: sidebarOpen ? 'calc(375px + (100% - 375px) / 2)' : '50%',
            transform: 'translateX(-50%)'
          }}
        >
          {/* Canvas mode controls */}
          <div className="flex items-center gap-1 border border-neutral-200 dark:border-neutral-800 rounded-lg p-0.5">
            <button
              onClick={() => setCanvasMode('comment')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded transition-colors ${
                canvasMode === 'comment'
                  ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-white'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              <Icon name="message-circle" size={16} />
              <span className="text-sm">Comment</span>
            </button>
            <button
              onClick={() => setCanvasMode('view')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded transition-colors ${
                canvasMode === 'view'
                  ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-white'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              <Icon name="pointer-01" size={16} />
              <span className="text-sm">Move</span>
            </button>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-1 border border-neutral-200 dark:border-neutral-800 rounded-lg p-0.5">
            <button
              onClick={() => handleZoom(-0.1)}
              className="p-1.5 rounded text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800"
              title="Zoom out"
            >
              <Icon name="zoom-out" size={16} />
            </button>
            <span className="px-2 text-xs text-neutral-400 dark:text-neutral-500 min-w-[45px] text-center">{Math.round(zoomLevel * 100)}%</span>
            <button
              onClick={() => handleZoom(0.1)}
              className="p-1.5 rounded text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800"
              title="Zoom in"
            >
              <Icon name="zoom-in" size={16} />
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              className="p-1.5 rounded text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800"
              title="Fit to screen"
            >
              <Icon name="maximise-01" size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar - slides in/out with animation */}
        <div
          className={`flex-shrink-0 flex flex-col bg-white dark:bg-[#0f0f0f] overflow-hidden ${isDraggingSidebar ? '' : 'transition-all duration-300 ease-in-out'}`}
          style={{ width: sidebarOpen ? reviewSidebarWidth : 0 }}
        >
          {/* Sidebar inner content - fixed width to prevent content reflow during animation */}
          <div className="h-full flex flex-col" style={{ minWidth: reviewSidebarWidth }}>
            {/* Tabs with filter button */}
            <div className="flex items-center border-b border-neutral-200 dark:border-neutral-800">
              <div className="flex gap-6 px-4">
                <button
                  onClick={() => setActiveTab('details')}
                  className={`py-3 text-sm font-medium transition-colors ${
                    activeTab === 'details'
                      ? 'text-neutral-900 dark:text-white'
                      : 'text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300'
                  }`}
                >
                  Details
                </button>
                <button
                  onClick={() => setActiveTab('comments')}
                  className={`py-3 text-sm font-medium transition-colors ${
                    activeTab === 'comments'
                      ? 'text-neutral-900 dark:text-white'
                      : 'text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300'
                  }`}
                >
                  Comments
                </button>
                {currentUserId && !isCustomer && (
                  <button
                    onClick={() => setActiveTab('notes')}
                    className={`py-3 text-sm font-medium transition-colors ${
                      activeTab === 'notes'
                        ? 'text-neutral-900 dark:text-white'
                        : 'text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300'
                    }`}
                  >
                    Notes
                  </button>
                )}
              </div>
              <div className="flex-1"></div>

              {/* Filter button (only on comments tab) and toggle button */}
              <div className="flex items-center gap-1 pr-2">
                {activeTab === 'comments' && (
                  <div className="relative">
                    <button
                      onClick={() => setFilterMenuOpen(!filterMenuOpen)}
                      className="p-1.5 rounded text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      title="Filter"
                    >
                      <Icon name="filter" size={16} />
                    </button>

                    {filterMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setFilterMenuOpen(false)} />
                        <div className="absolute top-full right-0 mt-1 w-56 bg-white dark:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-xl z-50 p-2">
                          <label className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded">
                            <input
                              type="checkbox"
                              checked={hideOtherVersions}
                              onChange={(e) => setHideOtherVersions(e.target.checked)}
                              className="w-4 h-4"
                            />
                            <span className="text-sm text-neutral-700 dark:text-neutral-300">Hide comments on other versions</span>
                          </label>
                          <label className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded">
                            <input
                              type="checkbox"
                              checked={hideCommentBubbles}
                              onChange={(e) => setHideCommentBubbles(e.target.checked)}
                              className="w-4 h-4"
                            />
                            <span className="text-sm text-neutral-700 dark:text-neutral-300">Hide comment bubbles</span>
                          </label>
                        </div>
                      </>
                    )}
                  </div>
                )}
                {/* Sidebar toggle button - inside the header */}
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="p-1.5 rounded text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
                >
                  <Icon
                    name="chevron-left"
                    size={16}
                    className={`transition-transform duration-300 ${sidebarOpen ? '' : 'rotate-180'}`}
                  />
                </button>
              </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {activeTab === 'details' ? (
                <DetailsTab
                  task={task}
                  team={team}
                  teamOptions={teamOptions}
                  statusOptions={statusOptions}
                  assigneeName={assigneeName}
                  creatorName={creatorName}
                  createdById={createdById}
                  helperName={helperName}
                  onUpdateTask={onUpdateTask}
                  onStatusChange={handleStatusChange}
                  onAssigneeChange={handleAssigneeChange}
                  onCreatorChange={handleCreatorChange}
                  onHelperChange={async (helperId) => {
                    await onUpdateTask(task.id, { helper_id: helperId });
                  }}
                  isEditingDescription={isEditingDescription}
                  setIsEditingDescription={setIsEditingDescription}
                  editedDescription={editedDescription}
                  setEditedDescription={setEditedDescription}
                  handleUpdateDescription={handleUpdateDescription}
                  onOpenDeliverables={() => setShowDeliverablesForm(true)}
                  isCustomer={isCustomer}
                />
              ) : activeTab === 'notes' ? (
                <CommentsTab
                  comments={comments}
                  currentUserId={currentUserId}
                  team={team}
                  newComment={newNote}
                  setNewComment={setNewNote}
                  handleSendComment={handleSendNote}
                  onUpdateComment={onUpdateComment}
                  onDeleteComment={onDeleteComment}
                  onAddReaction={onAddReaction}
                  onRemoveReaction={onRemoveReaction}
                  user={user}
                  hideOtherVersions={false}
                  currentVersionId={currentVersion?.id}
                  activeCommentId={null}
                  isNotesMode={true}
                />
              ) : (
                <CommentsTab
                  comments={comments}
                  currentUserId={currentUserId}
                  team={team}
                  newComment={newComment}
                  setNewComment={setNewComment}
                  handleSendComment={handleSendComment}
                  onUpdateComment={onUpdateComment}
                  onDeleteComment={onDeleteComment}
                  onAddReaction={onAddReaction}
                  onRemoveReaction={onRemoveReaction}
                  user={user}
                  hideOtherVersions={hideOtherVersions}
                  currentVersionId={currentVersion?.id}
                  activeCommentId={activeCommentId}
                />
              )}
            </div>
          </div>
        </div>

        {/* Draggable resize handle - only when sidebar is open */}
        {sidebarOpen && (
          <div
            onMouseDown={handleSidebarResizeStart}
            className="w-1 cursor-col-resize shrink-0 group relative z-10 flex items-center justify-center"
          >
            <div className="absolute inset-y-0 -left-1.5 -right-1.5" />
            <div className={`w-px h-full transition-colors ${isDraggingSidebar ? 'bg-neutral-500' : 'bg-neutral-200 dark:bg-neutral-800 group-hover:bg-neutral-400 dark:group-hover:bg-neutral-600'}`} />
          </div>
        )}

        {/* Sidebar toggle button - only visible when sidebar is closed */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="absolute top-3 left-2 z-20 p-1.5 rounded text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800"
            title="Open sidebar"
          >
            <Icon name="chevron-right" size={16} />
          </button>
        )}

        {/* Canvas/Preview Area */}
        <div className="flex-1 flex flex-col bg-neutral-100 dark:bg-neutral-900 overflow-hidden">
          {/* Canvas Container */}
          <div
            ref={canvasContainerRef}
            className="flex-1 flex items-center justify-center bg-neutral-100 dark:bg-neutral-900 overflow-hidden relative"
            style={{ cursor: getCursorStyle() }}
            onWheel={handleWheel}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
          >
            {currentVersion ? (
              <>
                {/* Display imported frames in a grid */}
                {displayMode === 'frames' && versionFrames.length > 0 && (
                  <div
                    ref={framesContainerRef}
                    className="relative p-8"
                    style={{
                      transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${zoomLevel})`,
                      transformOrigin: 'center center',
                      transition: isPanning ? 'none' : 'transform 0.1s ease-out'
                    }}
                  >
                    {/* Grid layout for frames */}
                    <div
                      className="grid gap-8"
                      style={{
                        gridTemplateColumns: versionFrames.length === 1
                          ? '1fr'
                          : versionFrames.length === 2
                            ? 'repeat(2, 1fr)'
                            : 'repeat(auto-fit, minmax(400px, 1fr))',
                        alignItems: 'start' // Prevent boxes from stretching to match tallest
                      }}
                    >
                      {versionFrames.map((frame, index) => (
                        <div
                          key={frame.id || index}
                          className="relative bg-neutral-200 dark:bg-neutral-800 rounded-xl overflow-hidden shadow-2xl"
                          data-frame-id={frame.id}
                          data-frame-index={index}
                          style={{
                            width: 'fit-content',
                            pointerEvents: canvasMode === 'view' ? 'none' : 'auto' // Disable image interaction in move mode
                          }}
                        >
                          {/* Frame name label - scales inversely with zoom */}
                          <div
                            className="absolute top-2 left-2 z-10 bg-black/70 backdrop-blur-sm rounded px-2 py-1"
                            style={{
                              transform: `scale(${1 / zoomLevel})`,
                              transformOrigin: 'top left'
                            }}
                          >
                            <span className="text-white text-xs font-medium whitespace-nowrap">{frame.frame_name}</span>
                          </div>
                          {/* Frame image - prevent dragging */}
                          <img
                            src={frame.image_url}
                            alt={frame.frame_name}
                            className="w-full h-auto block select-none"
                            draggable={false}
                            style={{ pointerEvents: 'none' }}
                          />
                        </div>
                      ))}
                    </div>

                    {/* Comment Pins - inside transformed container so they move with frames */}
                    {!hideCommentBubbles && (
                      <div className="absolute inset-0 pointer-events-none">
                        {comments
                          .filter(comment => comment.version_id === currentVersion?.id && comment.position_x != null && comment.position_y != null)
                          .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
                          .map((comment, index) => {
                            const author = comment.author_designer_id ? team?.find(t => t.id === comment.author_designer_id) : null;
                            const enrichedComment = {
                              ...comment,
                              authorName: comment.authorName || author?.full_name || null,
                              authorAvatar: comment.authorAvatar || author?.avatar_url || null
                            };
                            return (
                              <div
                                key={comment.id}
                                className="pointer-events-auto absolute"
                                style={{
                                  left: `${comment.position_x}%`,
                                  top: `${comment.position_y}%`,
                                  transform: `translate(-50%, -50%) scale(${1 / zoomLevel})`,
                                  transformOrigin: 'center center'
                                }}
                              >
                                <CommentPin
                                  comment={enrichedComment}
                                  pinNumber={index + 1}
                                  isActive={comment.id === activeCommentId}
                                  isHighlighted={comment.id === highlightedPinId}
                                  onClick={() => {
                                    setActiveCommentId(comment.id);
                                    setHighlightedPinId(null);
                                    setActiveTab('comments');
                                    if (!sidebarOpen) setSidebarOpen(true);
                                    setTimeout(() => {
                                      const el = document.getElementById(`comment-${comment.id}`);
                                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    }, 100);
                                  }}
                                />
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                )}

                {/* Display embed iframe (existing behavior) */}
                {displayMode === 'embed' && currentVersion.embed_url && (
                  <div
                    style={{
                      transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${zoomLevel})`,
                      transformOrigin: 'center center',
                      transition: isPanning ? 'none' : 'transform 0.1s ease-out',
                      width: '80%',
                      height: '80%',
                      pointerEvents: canvasMode === 'comment' ? 'none' : 'auto'
                    }}
                  >
                    <iframe
                      ref={iframeRef}
                      src={currentVersion.embed_url}
                      className="w-full h-full rounded-lg shadow-2xl"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}

                {/* Loading state for frames */}
                {loadingFrames && (
                  <div className="text-center text-neutral-400 dark:text-neutral-500">
                    <div className="w-8 h-8 border-2 border-neutral-300 dark:border-neutral-600 border-t-neutral-600 dark:border-t-white rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-sm">Loading frames...</p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center text-neutral-400 dark:text-neutral-500">
                <p>No version selected</p>
                <button
                  onClick={() => setShowFigmaImport(true)}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Import from Figma
                </button>
              </div>
            )}

            {/* Comment Pins Overlay - only for embed mode (frames mode has pins inside transformed container) */}
            {!hideCommentBubbles && displayMode === 'embed' && (
              <CommentPinsOverlay
                comments={comments
                  .filter(comment => comment.version_id === currentVersion?.id)
                  .map(comment => {
                    const author = comment.author_designer_id ? team?.find(t => t.id === comment.author_designer_id) : null;
                    return {
                      ...comment,
                      authorName: comment.authorName || author?.full_name || null,
                      authorAvatar: comment.authorAvatar || author?.avatar_url || null
                    };
                  })}
                activeCommentId={activeCommentId}
                highlightedPinId={highlightedPinId}
                onPinClick={(comment) => {
                  setActiveCommentId(comment.id);
                  setHighlightedPinId(null);
                  // Switch to comments tab and ensure sidebar is open
                  setActiveTab('comments');
                  if (!sidebarOpen) {
                    setSidebarOpen(true);
                  }
                  // Scroll to the comment in the sidebar after a short delay
                  setTimeout(() => {
                    const commentElement = document.getElementById(`comment-${comment.id}`);
                    if (commentElement) {
                      commentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                  }, 100);
                }}
              />
            )}

            {/* Comment Box */}
            {showCommentBox && canvasMode === 'comment' && (
              <div
                className="absolute z-50"
                style={{
                  left: commentBoxPosition.x,
                  top: commentBoxPosition.y
                }}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                {/* Comment input box - compact design */}
                <div className="bg-white dark:bg-[#1c1c1c] rounded-lg shadow-2xl overflow-hidden border border-neutral-200 dark:border-transparent">
                  <div className="flex items-center gap-2 p-2">
                    {/* User avatar - show image if available */}
                    {(() => {
                      const currentTeamMember = team?.find(t => t.email === user?.email);
                      const avatarUrl = currentTeamMember?.avatar_url;
                      return avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-xs font-medium">
                            {user?.email?.substring(0, 2).toUpperCase() || 'U'}
                          </span>
                        </div>
                      );
                    })()}

                    {/* Input field */}
                    <input
                      autoFocus
                      type="text"
                      value={positionedCommentText}
                      onChange={(e) => setPositionedCommentText(e.target.value)}
                      placeholder="Leave a comment..."
                      className="flex-1 bg-transparent text-neutral-700 dark:text-neutral-300 text-sm focus:outline-none placeholder-neutral-400 dark:placeholder-neutral-500 min-w-[200px]"
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setPositionedCommentText('');
                          setShowCommentBox(false);
                        }
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendPositionedComment();
                        }
                      }}
                    />

                    {/* Send button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSendPositionedComment();
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="p-1.5 text-neutral-500 hover:text-blue-400 transition-colors"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Figma Import Modal */}
      <FigmaImportModal
        isOpen={showFigmaImport}
        onClose={() => setShowFigmaImport(false)}
        taskId={task.id}
        onImportComplete={(newVersion, importedFrames) => {
          // Refresh versions list - this will trigger re-fetch in parent
          if (onVersionChange) {
            onVersionChange(newVersion);
          }
          // Update local frames state immediately
          setVersionFrames(importedFrames.map((frame, index) => ({
            ...frame,
            image_url: frame.url,
            frame_name: frame.frameName,
            order_index: index
          })));
        }}
      />

      {/* Embed URL Modal */}
      {showEmbedModal && (
        <div
          className="fixed inset-0 bg-black/30 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => { setShowEmbedModal(false); setEmbedUrlInput(''); }}
        >
          <div
            className="bg-white dark:bg-[#161616] w-full max-w-md rounded-2xl shadow-lg dark:shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden animate-scale-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                  <Icon name="code-01" size={18} className="text-neutral-500 dark:text-neutral-400" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">Add Embed</h2>
                  <p className="text-xs text-neutral-500">YouTube, Loom, Vimeo, Miro, and more</p>
                </div>
              </div>
              <button
                onClick={() => { setShowEmbedModal(false); setEmbedUrlInput(''); }}
                className="p-1.5 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <Icon name="x-01" size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5 block">Embed URL</label>
                <input
                  type="url"
                  value={embedUrlInput}
                  onChange={(e) => setEmbedUrlInput(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2.5 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-600 transition-colors"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && embedUrlInput.trim()) handleAddEmbed();
                  }}
                />
              </div>
              <button
                onClick={handleAddEmbed}
                disabled={!embedUrlInput.trim() || isCreatingVersion}
                className={`w-full py-2.5 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${
                  !embedUrlInput.trim() || isCreatingVersion
                    ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 cursor-not-allowed'
                    : 'bg-neutral-900 dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200'
                }`}
              >
                {isCreatingVersion ? <><Icon name="loader-01" size={14} className="animate-spin" /> Adding...</> : 'Add Embed'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Website URL Modal */}
      {showWebsiteModal && (
        <div
          className="fixed inset-0 bg-black/30 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => { setShowWebsiteModal(false); setWebsiteUrlInput(''); }}
        >
          <div
            className="bg-white dark:bg-[#161616] w-full max-w-md rounded-2xl shadow-lg dark:shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden animate-scale-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                  <Icon name="globe" size={18} className="text-neutral-500 dark:text-neutral-400" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">Add Website</h2>
                  <p className="text-xs text-neutral-500">Display any website in the canvas</p>
                </div>
              </div>
              <button
                onClick={() => { setShowWebsiteModal(false); setWebsiteUrlInput(''); }}
                className="p-1.5 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <Icon name="x-01" size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5 block">Website URL</label>
                <input
                  type="url"
                  value={websiteUrlInput}
                  onChange={(e) => setWebsiteUrlInput(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2.5 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-600 transition-colors"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && websiteUrlInput.trim()) handleAddWebsite();
                  }}
                />
              </div>
              <button
                onClick={handleAddWebsite}
                disabled={!websiteUrlInput.trim() || isCreatingVersion}
                className={`w-full py-2.5 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${
                  !websiteUrlInput.trim() || isCreatingVersion
                    ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 cursor-not-allowed'
                    : 'bg-neutral-900 dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200'
                }`}
              >
                {isCreatingVersion ? <><Icon name="loader-01" size={14} className="animate-spin" /> Adding...</> : 'Add Website'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Version Confirmation Modal */}
      {showDeleteVersionModal && versionToDelete && (
        <div
          className="fixed inset-0 bg-black/30 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => { setShowDeleteVersionModal(false); setVersionToDelete(null); }}
        >
          <div
            className="bg-white dark:bg-[#161616] w-full max-w-sm rounded-2xl shadow-lg dark:shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden animate-scale-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5">
              <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-4">
                <Icon name="trash-01" size={18} className="text-red-500 dark:text-red-400" />
              </div>
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-1">Delete version {versionToDelete.version_number}?</h3>
              <p className="text-xs text-neutral-500 mb-5">
                This will remove this version and its associated data. This action cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowDeleteVersionModal(false); setVersionToDelete(null); }}
                  className="flex-1 py-2 text-sm font-medium rounded-lg transition-colors bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteVersion}
                  disabled={isDeletingVersion}
                  className="flex-1 py-2 text-sm font-medium rounded-lg transition-colors bg-red-500 text-white hover:bg-red-600 flex items-center justify-center gap-2"
                >
                  {isDeletingVersion ? <><Icon name="loader-01" size={14} className="animate-spin" /> Deleting...</> : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deliverables Form Modal */}
      <DeliverablesForm
        isOpen={showDeliverablesForm}
        onClose={() => setShowDeliverablesForm(false)}
        task={task}
        onSave={() => setShowDeliverablesForm(false)}
      />
    </div>
  );
};

// Details Tab Component
const DetailsTab = ({
  task,
  team,
  teamOptions,
  statusOptions,
  assigneeName,
  creatorName,
  createdById,
  helperName,
  onUpdateTask,
  onStatusChange,
  onAssigneeChange,
  onCreatorChange,
  onHelperChange,
  isEditingDescription,
  setIsEditingDescription,
  editedDescription,
  setEditedDescription,
  handleUpdateDescription,
  onOpenDeliverables,
  isCustomer
}) => {
  const [isEditingDueDate, setIsEditingDueDate] = useState(false);
  const [editedDueDate, setEditedDueDate] = useState(task.dueDate || '');
  const [showDescFormattingToolbar, setShowDescFormattingToolbar] = useState(false);
  const [showDescLinkInput, setShowDescLinkInput] = useState(false);
  const [showDescEmojiPicker, setShowDescEmojiPicker] = useState(false);
  const [descLinkUrl, setDescLinkUrl] = useState('');
  const [descLinkText, setDescLinkText] = useState('');
  // Active formatting state for description
  const [activeDescFormats, setActiveDescFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikeThrough: false
  });
  const descEditorRef = useRef(null);
  const descEmojiButtonRef = useRef(null);

  // Check active formats for description editor
  const checkDescActiveFormats = () => {
    setActiveDescFormats({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      strikeThrough: document.queryCommandState('strikeThrough')
    });
  };

  // Listen for selection changes to update active formats
  useEffect(() => {
    if (isEditingDescription) {
      const handleSelectionChange = () => {
        checkDescActiveFormats();
      };
      document.addEventListener('selectionchange', handleSelectionChange);
      return () => {
        document.removeEventListener('selectionchange', handleSelectionChange);
      };
    }
  }, [isEditingDescription]);

  // Initialize description editor content when editing starts
  useEffect(() => {
    if (isEditingDescription && descEditorRef.current) {
      descEditorRef.current.innerHTML = editedDescription;
      // Move cursor to end
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(descEditorRef.current);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
      descEditorRef.current.focus();
    }
  }, [isEditingDescription]);

  const handleUpdateDueDate = async () => {
    if (editedDueDate !== task.dueDate) {
      await onUpdateTask(task.id, { delivered_at: editedDueDate });
    }
    setIsEditingDueDate(false);
  };

  // Description formatting functions
  const applyDescFormat = (command, value = null) => {
    document.execCommand(command, false, value);
    checkDescActiveFormats();
  };

  const insertDescBold = () => { if (descEditorRef.current) descEditorRef.current.focus(); applyDescFormat('bold'); };
  const insertDescItalic = () => { if (descEditorRef.current) descEditorRef.current.focus(); applyDescFormat('italic'); };
  const insertDescStrikethrough = () => { if (descEditorRef.current) descEditorRef.current.focus(); applyDescFormat('strikeThrough'); };
  const insertDescUnderline = () => { if (descEditorRef.current) descEditorRef.current.focus(); applyDescFormat('underline'); };
  const insertDescBulletList = () => { if (descEditorRef.current) descEditorRef.current.focus(); applyDescFormat('insertUnorderedList'); };
  const insertDescNumberedList = () => { if (descEditorRef.current) descEditorRef.current.focus(); applyDescFormat('insertOrderedList'); };
  const insertDescChecklist = () => { if (descEditorRef.current) { descEditorRef.current.focus(); applyDescFormat('insertHTML', '<div>☐ </div>'); } };

  const handleDescInsertLink = () => {
    if (!descLinkUrl) return;
    if (descEditorRef.current) {
      descEditorRef.current.focus();
      const displayText = descLinkText || descLinkUrl;
      applyDescFormat('insertHTML', `<a href="${descLinkUrl}" target="_blank" class="text-blue-400 hover:underline">${displayText}</a>`);
    }
    setDescLinkUrl('');
    setDescLinkText('');
    setShowDescLinkInput(false);
  };

  const insertDescEmoji = (emoji) => {
    if (descEditorRef.current) {
      descEditorRef.current.focus();
      applyDescFormat('insertText', emoji);
    }
    setShowDescEmojiPicker(false);
  };

  const handleSaveDescription = () => {
    const content = descEditorRef.current?.innerHTML || editedDescription;
    setEditedDescription(content);
    handleUpdateDescription();
    setShowDescFormattingToolbar(false);
    setShowDescLinkInput(false);
    setShowDescEmojiPicker(false);
  };

  const handleCancelDescription = () => {
    setEditedDescription(task.description || '');
    setIsEditingDescription(false);
    setShowDescFormattingToolbar(false);
    setShowDescLinkInput(false);
    setShowDescEmojiPicker(false);
  };

  // Emoji list for description
  const descEmojis = [
    '😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊',
    '👍', '👎', '👏', '🙌', '🤝', '🙏', '💪', '🎉',
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '💯',
    '✅', '❌', '⭐', '🔥', '💡', '📌', '🎯', '🚀'
  ];

  return (
    <div className="p-4 space-y-1">
      {/* Status */}
      <CustomSelect
        label="Status"
        icon={TagIcon}
        value={task.status}
        options={statusOptions}
        onChange={onStatusChange}
        placeholder="No status"
      />

      {/* Assignee (read-only for clients) */}
      <CustomSelect
        label="Assignee"
        icon={UserIcon}
        value={task.assigned_to_id}
        options={teamOptions}
        onChange={onAssigneeChange}
        type="user"
        placeholder="Unassigned"
        displayName={assigneeName !== 'Unassigned' ? assigneeName : null}
        disabled={isCustomer}
      />

      {/* Helper (hidden for clients) */}
      {!isCustomer && (
      <CustomSelect
        label="Helper"
        icon={UserIcon}
        value={task.helper_id}
        options={teamOptions}
        onChange={onHelperChange}
        type="user"
        placeholder="No helper"
        displayName={helperName}
      />
      )}

      {/* Created By (hidden for clients) */}
      {!isCustomer && (
      <CustomSelect
        label="Created By"
        icon={UserIcon}
        value={createdById}
        options={teamOptions}
        onChange={onCreatorChange}
        type="user"
        placeholder="Unknown"
        displayName={creatorName !== 'Unknown' ? creatorName : null}
      />
      )}

      {/* Due Date - Editable */}
      <div className="flex items-center py-1.5 px-2 hover:bg-neutral-100 dark:hover:bg-neutral-800/50 rounded cursor-pointer group">
        <div className="w-32 text-neutral-400 dark:text-neutral-500 flex items-center gap-2 text-sm">
          <Icon name="calendar-01" size={14} /> Due Date
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
                setEditedDueDate(task.dueDate || '');
                setIsEditingDueDate(false);
              }
            }}
            autoFocus
            className="flex-1 bg-transparent text-neutral-700 dark:text-neutral-300 text-sm text-right focus:outline-none"
          />
        ) : (
          <div
            className="flex-1 text-neutral-700 dark:text-neutral-300 text-sm text-right"
            onClick={() => setIsEditingDueDate(true)}
          >
            {task.dueDate ? (
              new Date(task.dueDate).toLocaleString(undefined, {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })
            ) : (
              <span className="text-neutral-400 dark:text-neutral-600">Empty</span>
            )}
          </div>
        )}
      </div>

      {/* Client */}
      <div className="flex items-center py-1.5 px-2">
        <div className="w-32 text-neutral-400 dark:text-neutral-500 flex items-center gap-2 text-sm">
          <Icon name="bank" size={14} /> Client
        </div>
        <div className="flex-1 text-neutral-700 dark:text-neutral-300 text-sm text-right">
          {task.clientName || <span className="text-neutral-400 dark:text-neutral-600">Internal</span>}
        </div>
      </div>

      {/* Description Section */}
      <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 mt-4">
        <h3 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-3 px-2">Description</h3>
        {isEditingDescription ? (
          <div className="space-y-2">
            {/* Description formatting toolbar */}
            {showDescFormattingToolbar && (
              <div className="flex items-center gap-1 px-2 pb-2">
                <button
                  onClick={insertDescBold}
                  className={`p-1 rounded transition-colors ${activeDescFormats.bold ? 'text-neutral-900 dark:text-white bg-neutral-200 dark:bg-neutral-700' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
                  title="Bold"
                >
                  <Icon name="bold-01" size={14} />
                </button>
                <button
                  onClick={insertDescItalic}
                  className={`p-1 rounded transition-colors ${activeDescFormats.italic ? 'text-neutral-900 dark:text-white bg-neutral-200 dark:bg-neutral-700' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
                  title="Italic"
                >
                  <Icon name="italics-01" size={14} />
                </button>
                <button
                  onClick={insertDescStrikethrough}
                  className={`p-1 rounded transition-colors ${activeDescFormats.strikeThrough ? 'text-neutral-900 dark:text-white bg-neutral-200 dark:bg-neutral-700' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
                  title="Strikethrough"
                >
                  <Icon name="type-strike-01" size={14} />
                </button>
                <button
                  onClick={insertDescUnderline}
                  className={`p-1 rounded transition-colors ${activeDescFormats.underline ? 'text-neutral-900 dark:text-white bg-neutral-200 dark:bg-neutral-700' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
                  title="Underline"
                >
                  <Icon name="underline-01" size={14} />
                </button>
                <div className="w-px h-3 bg-neutral-300 dark:bg-neutral-700 mx-0.5" />
                <button onClick={insertDescBulletList} className="p-1 rounded text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800" title="Bullet list">
                  <Icon name="list" size={14} />
                </button>
                <button onClick={insertDescNumberedList} className="p-1 rounded text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800" title="Numbered list">
                  <Icon name="list-numbers" size={14} />
                </button>
                <button onClick={insertDescChecklist} className="p-1 rounded text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800" title="Checklist">
                  <Icon name="check-square-contained" size={14} />
                </button>
              </div>
            )}

            {/* Description link input */}
            {showDescLinkInput && (
              <div className="flex items-center gap-2 p-2 mx-2 bg-neutral-100 dark:bg-neutral-900 rounded-lg">
                <input
                  type="text"
                  value={descLinkText}
                  onChange={(e) => setDescLinkText(e.target.value)}
                  placeholder="Link text"
                  className="flex-1 bg-transparent text-neutral-700 dark:text-neutral-300 text-xs placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none"
                />
                <input
                  type="text"
                  value={descLinkUrl}
                  onChange={(e) => setDescLinkUrl(e.target.value)}
                  placeholder="URL"
                  className="flex-1 bg-transparent text-neutral-700 dark:text-neutral-300 text-xs placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleDescInsertLink(); }}
                />
                <button onClick={handleDescInsertLink} className="p-1 text-blue-500 hover:text-blue-400">
                  <Icon name="check-square-contained" size={14} />
                </button>
                <button onClick={() => { setShowDescLinkInput(false); setDescLinkUrl(''); setDescLinkText(''); }} className="p-1 text-neutral-400 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-white">
                  <Icon name="x-01" size={14} />
                </button>
              </div>
            )}

            {/* Description editor */}
            <div
              ref={descEditorRef}
              contentEditable
              data-placeholder="Add a description..."
              className="w-full bg-neutral-50 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 text-sm p-3 rounded border border-neutral-200 dark:border-neutral-800 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-600 min-h-[120px] max-h-[200px] overflow-y-auto empty:before:content-[attr(data-placeholder)] empty:before:text-neutral-400 dark:empty:before:text-neutral-600"
              onInput={(e) => setEditedDescription(e.currentTarget.innerHTML)}
              onKeyDown={(e) => { if (e.key === 'Escape') handleCancelDescription(); }}
            />

            {/* Description toolbar */}
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => { setShowDescLinkInput(!showDescLinkInput); setShowDescFormattingToolbar(false); setShowDescEmojiPicker(false); }}
                  className={`p-1 rounded transition-colors ${showDescLinkInput ? 'text-neutral-900 dark:text-white bg-neutral-200 dark:bg-neutral-800' : 'text-neutral-400 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
                  title="Add link"
                >
                  <Icon name="paperclip" size={14} />
                </button>
                <button
                  onClick={() => { setShowDescFormattingToolbar(!showDescFormattingToolbar); setShowDescLinkInput(false); setShowDescEmojiPicker(false); }}
                  className={`p-1 rounded transition-colors ${showDescFormattingToolbar ? 'text-neutral-900 dark:text-white bg-neutral-200 dark:bg-neutral-800' : 'text-neutral-400 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
                  title="Text formatting"
                >
                  <Icon name="type-01" size={14} />
                </button>
                <div className="relative">
                  <button
                    ref={descEmojiButtonRef}
                    onClick={() => { setShowDescEmojiPicker(!showDescEmojiPicker); setShowDescFormattingToolbar(false); setShowDescLinkInput(false); }}
                    className={`p-1 rounded transition-colors ${showDescEmojiPicker ? 'text-neutral-900 dark:text-white bg-neutral-200 dark:bg-neutral-800' : 'text-neutral-400 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
                    title="Add emoji"
                  >
                    <Icon name="smiley-happy" size={14} />
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
                <button onClick={handleCancelDescription} className="px-3 py-1.5 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white">
                  Cancel
                </button>
                <button onClick={handleSaveDescription} className="px-3 py-1.5 text-sm text-neutral-900 dark:text-white hover:text-neutral-600 dark:hover:text-neutral-300">
                  Save
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div
            onClick={() => setIsEditingDescription(true)}
            className="text-neutral-700 dark:text-neutral-300 text-sm cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800/50 p-3 rounded min-h-[60px]"
            dangerouslySetInnerHTML={{ __html: task.description || '<span class="text-neutral-600 italic">Click to add description...</span>' }}
          />
        )}
      </div>

      {/* AI-Generated Concept Images — visible to designers */}
      {task.properties?.ai_images && task.properties.ai_images.length > 0 && (
        <div className="mx-4 mt-2 mb-2 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden flex flex-col">
          <div className="px-4 py-2.5 bg-neutral-100 dark:bg-neutral-800/40 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-2 shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#D08B00]"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
            <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">AI Concept Images</span>
          </div>
          <div className="p-4 grid grid-cols-2 gap-3 overflow-y-auto custom-scrollbar" style={{ maxHeight: task.properties.ai_images.length > 4 ? '420px' : undefined }}>
            {task.properties.ai_images.map((img, i) => {
              const imgUrl = typeof img === 'string' ? img : img.url;
              const imgRating = typeof img === 'object' ? img.rating : 0;
              if (!imgUrl) return null;
              return (
                <div key={i}>
                  <img
                    src={imgUrl}
                    alt={`AI concept ${i + 1}`}
                    className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => window.open(imgUrl, '_blank')}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  {imgRating > 0 && (
                    <div className="flex items-center gap-0.5 mt-1.5">
                      <span className="text-[10px] text-neutral-400 dark:text-neutral-500 mr-1">Client rating:</span>
                      {[1, 2, 3, 4, 5].map(s => (
                        <svg key={s} width="12" height="12" viewBox="0 0 24 24" fill={s <= imgRating ? '#D08B00' : 'none'} stroke={s <= imgRating ? '#D08B00' : '#525252'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                      ))}
                      <span className="text-[10px] text-neutral-400 dark:text-neutral-500 ml-1">{imgRating}/5</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AI Brief Conversation — visible to designers */}
      {task.properties?.ai_conversation && task.properties.ai_conversation.length > 0 && (
        <div className="mx-4 mt-2 mb-2 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden flex flex-col" style={{ maxHeight: '350px' }}>
          <div className="px-4 py-2.5 bg-neutral-100 dark:bg-neutral-800/40 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-2 shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#D08B00]"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
            <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">AI Brief Assistant — Q&A</span>
          </div>
          <div className="px-4 py-3 space-y-2.5 overflow-y-auto custom-scrollbar flex-1 min-h-0">
            {task.properties.ai_conversation.map((msg, i) => {
              const hasImages = msg.images && msg.images.length > 0;
              const isImgMsg = msg.content?.startsWith('[IMG] ') || msg.content?.startsWith('🖼');
              return (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`${hasImages || isImgMsg ? 'max-w-[55%]' : 'max-w-[85%]'} px-3 py-1.5 text-xs leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 rounded-xl rounded-br-sm'
                    : 'bg-neutral-50 dark:bg-neutral-800/50 text-neutral-600 dark:text-neutral-400 rounded-xl rounded-bl-sm'
                }`}>
                  {msg.role === 'assistant' && <span className="text-[9px] text-[#D08B00] font-semibold block mb-0.5">AI</span>}
                  {msg.role === 'user' && <span className="text-[9px] text-neutral-400 dark:text-neutral-500 font-semibold block mb-0.5">Client</span>}
                  {isImgMsg
                    ? <span className="italic text-neutral-400 dark:text-neutral-500">{msg.content.replace(/^\[IMG\] |^🖼 ?/, '')}</span>
                    : msg.content
                  }
                  {hasImages && (
                    <div className="mt-2 space-y-1.5">
                      {msg.images.map((img, j) => (
                        <img key={j} src={img} alt={`AI concept ${j + 1}`} className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700" onError={(e) => { e.target.style.display = 'none'; }} />
                      ))}
                      {msg.imageRating > 0 && (
                        <div className="flex items-center gap-0.5">
                          {[1,2,3,4,5].map(s => (
                            <span key={s} className={`text-[10px] ${s <= msg.imageRating ? 'text-[#D08B00]' : 'text-neutral-700'}`}>★</span>
                          ))}
                          <span className="text-[9px] text-neutral-400 dark:text-neutral-500 ml-1">{msg.imageRating}/5</span>
                        </div>
                      )}
                    </div>
                  )}
                  {msg.feedback && (
                    <span className={`inline-flex items-center gap-0.5 ml-1.5 text-[9px] font-medium ${msg.feedback === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                      {msg.feedback === 'up' ? '👍' : '👎'}
                    </span>
                  )}
                </div>
              </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Deliverables Section */}
      <div className="px-4 py-4 border-t border-neutral-200 dark:border-neutral-800">
        <h3 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-3 px-2">Deliverables</h3>
        <button
          onClick={onOpenDeliverables}
          className="w-full text-left p-3 rounded-lg bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800/50 transition-colors group"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-500 dark:text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-300">
              Click to open deliverables form...
            </span>
            <Icon name="chevron-right" size={16} className="text-neutral-400 dark:text-neutral-600 group-hover:text-neutral-500 dark:group-hover:text-neutral-400" />
          </div>
        </button>
      </div>

    </div>
  );
};

// Comments Tab Component
const CommentsTab = ({
  comments,
  currentUserId,
  team,
  newComment,
  setNewComment,
  handleSendComment,
  onUpdateComment,
  onDeleteComment,
  onAddReaction,
  onRemoveReaction,
  user,
  hideOtherVersions,
  currentVersionId,
  activeCommentId,
  isNotesMode = false
}) => {
  const [highlightedCommentId, setHighlightedCommentId] = useState(null);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editedContent, setEditedContent] = useState('');
  const [hoveredCommentId, setHoveredCommentId] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showNewCommentEmojiPicker, setShowNewCommentEmojiPicker] = useState(false);
  const [showFormattingToolbar, setShowFormattingToolbar] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  // Edit comment state
  const [showEditEmojiPicker, setShowEditEmojiPicker] = useState(false);
  const [showEditFormattingToolbar, setShowEditFormattingToolbar] = useState(false);
  const [showEditLinkInput, setShowEditLinkInput] = useState(false);
  const [editLinkUrl, setEditLinkUrl] = useState('');
  const [editLinkText, setEditLinkText] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  // Hover reaction and menu state
  const [showReactionPickerForComment, setShowReactionPickerForComment] = useState(null);
  const [showFullEmojiPickerForComment, setShowFullEmojiPickerForComment] = useState(null);
  const [showCommentMenuForComment, setShowCommentMenuForComment] = useState(null);
  // Delete confirmation modal state
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState(null);
  // Active formatting state for new comment
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikeThrough: false
  });
  // Active formatting state for edit comment
  const [activeEditFormats, setActiveEditFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikeThrough: false
  });
  const textareaRef = useRef(null);
  const newCommentTextareaRef = useRef(null);
  const newCommentEditorRef = useRef(null);
  const editCommentEditorRef = useRef(null);
  const editEmojiButtonRef = useRef(null);
  const newCommentEmojiButtonRef = useRef(null);
  const reactionEmojiButtonRef = useRef(null);

  // Highlight comment temporarily when activeCommentId changes (from pin click)
  useEffect(() => {
    if (activeCommentId) {
      setHighlightedCommentId(activeCommentId);
      // Clear highlight after 1.5 seconds
      const timer = setTimeout(() => {
        setHighlightedCommentId(null);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [activeCommentId]);

  // Check active formatting state
  const checkActiveFormats = (isNewComment = true) => {
    const formats = {
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      strikeThrough: document.queryCommandState('strikeThrough')
    };
    if (isNewComment) {
      setActiveFormats(formats);
    } else {
      setActiveEditFormats(formats);
    }
  };

  // Add selection change listener
  useEffect(() => {
    const handleSelectionChange = () => {
      // Check which editor is focused
      if (document.activeElement === newCommentEditorRef.current) {
        checkActiveFormats(true);
      } else if (document.activeElement === editCommentEditorRef.current) {
        checkActiveFormats(false);
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  // Filter comments based on mode
  const modeFilteredComments = isNotesMode
    ? comments.filter(c => c.is_note === true)
    : comments.filter(c => c.is_note !== true);
  const filteredComments = hideOtherVersions && !isNotesMode
    ? modeFilteredComments.filter(c => c.version_id === currentVersionId)
    : modeFilteredComments;

  // Initialize edit comment editor content when editing starts
  useEffect(() => {
    if (editingCommentId && editCommentEditorRef.current && editedContent) {
      editCommentEditorRef.current.innerHTML = editedContent;
      // Move cursor to end
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(editCommentEditorRef.current);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
      editCommentEditorRef.current.focus();
    }
  }, [editingCommentId]);

  const startEdit = (comment) => {
    setEditingCommentId(comment.id);
    setEditedContent(comment.content);
    setShowEditFormattingToolbar(false);
    setShowEditLinkInput(false);
    setShowEditEmojiPicker(false);
  };

  const saveEdit = async (commentId) => {
    const content = editCommentEditorRef.current?.innerHTML || editedContent;
    await onUpdateComment(commentId, { content });
    setEditingCommentId(null);
    setEditedContent('');
    setShowEditFormattingToolbar(false);
    setShowEditLinkInput(false);
    setShowEditEmojiPicker(false);
  };

  const cancelEdit = () => {
    setEditingCommentId(null);
    setEditedContent('');
    setShowEditFormattingToolbar(false);
    setShowEditLinkInput(false);
    setShowEditEmojiPicker(false);
  };

  // Get current user's team member ID for comment authorship tracking
  const currentTeamMember = team?.find(t => t.email === user?.email);
  const currentUserTeamId = currentTeamMember?.id;

  // Handle adding/toggling reaction to comment
  // Note: currentUserId is the auth user.id from the users table (for reactions FK)
  const handleAddReactionLocal = async (commentId, emoji) => {
    if (!currentUserId) {
      console.error('No user ID available for reaction');
      return;
    }

    // Find the comment to check if user already reacted with this emoji
    const comment = comments.find(c => c.id === commentId);
    const existingReaction = comment?.reactions?.find(
      r => r.emoji === emoji && r.user_id === currentUserId
    );

    if (existingReaction) {
      // Remove reaction if it already exists (toggle off)
      await onRemoveReaction?.(commentId, emoji);
    } else {
      // Add new reaction
      await onAddReaction?.(commentId, emoji);
    }

    setShowReactionPickerForComment(null);
    setShowFullEmojiPickerForComment(null);
  };

  // Handle clicking on an existing reaction to toggle it
  const handleReactionClick = async (commentId, emoji) => {
    await handleAddReactionLocal(commentId, emoji);
  };

  // Group reactions by emoji and count them
  const getGroupedReactions = (reactions) => {
    if (!reactions || reactions.length === 0) return [];

    const grouped = {};
    reactions.forEach(reaction => {
      if (!grouped[reaction.emoji]) {
        grouped[reaction.emoji] = {
          emoji: reaction.emoji,
          count: 0,
          users: [],
          hasCurrentUser: false
        };
      }
      grouped[reaction.emoji].count++;
      grouped[reaction.emoji].users.push(reaction.user_id);
      if (reaction.user_id === currentUserId) {
        grouped[reaction.emoji].hasCurrentUser = true;
      }
    });

    return Object.values(grouped);
  };

  // Copy comment link to clipboard
  const handleCopyCommentLink = (commentId) => {
    const url = `${window.location.origin}${window.location.pathname}?comment=${commentId}`;
    navigator.clipboard.writeText(url);
    setShowCommentMenuForComment(null);
  };

  // Delete comment - show confirmation modal
  const handleDeleteCommentClick = (commentId) => {
    setCommentToDelete(commentId);
    setShowDeleteConfirmModal(true);
    setShowCommentMenuForComment(null);
  };

  // Confirm delete comment
  const confirmDeleteComment = () => {
    if (commentToDelete) {
      onDeleteComment(commentToDelete);
    }
    setShowDeleteConfirmModal(false);
    setCommentToDelete(null);
  };

  // Cancel delete comment
  const cancelDeleteComment = () => {
    setShowDeleteConfirmModal(false);
    setCommentToDelete(null);
  };

  // Close all hover menus
  const closeAllHoverMenus = () => {
    setShowReactionPickerForComment(null);
    setShowFullEmojiPickerForComment(null);
    setShowCommentMenuForComment(null);
  };

  // Wrapper for sending comment that gets HTML content and clears editor
  const handleSendCommentWrapper = async () => {
    const content = newCommentEditorRef.current?.innerHTML?.trim();
    if (!content || content === '<br>') return;

    // Update the newComment state with HTML content before sending
    setNewComment(content);

    // Call the parent handler
    await handleSendComment();

    // Clear the editor
    if (newCommentEditorRef.current) {
      newCommentEditorRef.current.innerHTML = '';
    }
    setNewComment('');
    setShowFormattingToolbar(false);
    setShowLinkInput(false);
    setShowNewCommentEmojiPicker(false);
  };

  // Text formatting functions using execCommand for rich text
  const applyFormat = (command, value = null) => {
    document.execCommand(command, false, value);
  };

  const insertBold = (isNewComment = false) => {
    const editor = isNewComment ? newCommentEditorRef.current : editCommentEditorRef.current;
    if (editor) editor.focus();
    applyFormat('bold');
    // Update active state after applying format
    setTimeout(() => checkActiveFormats(isNewComment), 0);
  };

  const insertItalic = (isNewComment = false) => {
    const editor = isNewComment ? newCommentEditorRef.current : editCommentEditorRef.current;
    if (editor) editor.focus();
    applyFormat('italic');
    setTimeout(() => checkActiveFormats(isNewComment), 0);
  };

  const insertStrikethrough = (isNewComment = false) => {
    const editor = isNewComment ? newCommentEditorRef.current : editCommentEditorRef.current;
    if (editor) editor.focus();
    applyFormat('strikeThrough');
    setTimeout(() => checkActiveFormats(isNewComment), 0);
  };

  const insertUnderline = (isNewComment = false) => {
    const editor = isNewComment ? newCommentEditorRef.current : editCommentEditorRef.current;
    if (editor) editor.focus();
    applyFormat('underline');
    setTimeout(() => checkActiveFormats(isNewComment), 0);
  };

  const insertBulletList = (isNewComment = false) => {
    const editor = isNewComment ? newCommentEditorRef.current : editCommentEditorRef.current;
    if (editor) editor.focus();
    applyFormat('insertUnorderedList');
  };

  const insertNumberedList = (isNewComment = false) => {
    const editor = isNewComment ? newCommentEditorRef.current : editCommentEditorRef.current;
    if (editor) editor.focus();
    applyFormat('insertOrderedList');
  };

  const insertChecklist = (isNewComment = false) => {
    const editor = isNewComment ? newCommentEditorRef.current : editCommentEditorRef.current;
    if (editor) {
      editor.focus();
      // Insert a checkbox-style item
      applyFormat('insertHTML', '<div>☐ </div>');
    }
  };

  const handleInsertLink = (isNewComment = false) => {
    const url = isNewComment ? linkUrl : editLinkUrl;
    const text = isNewComment ? linkText : editLinkText;
    if (!url) return;

    const editor = isNewComment ? newCommentEditorRef.current : editCommentEditorRef.current;
    if (editor) {
      editor.focus();
      const displayText = text || url;
      applyFormat('insertHTML', `<a href="${url}" target="_blank" class="text-blue-400 hover:underline">${displayText}</a>`);
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
  };

  const insertEmoji = (emoji, isNewComment = false) => {
    const editor = isNewComment ? newCommentEditorRef.current : editCommentEditorRef.current;
    if (editor) {
      editor.focus();
      applyFormat('insertText', emoji);
    }
    setShowEmojiPicker(false);
    setShowNewCommentEmojiPicker(false);
    setShowEditEmojiPicker(false);
  };

  // Expanded emoji list
  const commonEmojis = [
    '😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊',
    '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘',
    '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭',
    '🤔', '🤐', '😐', '😑', '😶', '😏', '😒', '🙄',
    '👍', '👎', '👏', '🙌', '🤝', '🙏', '💪', '🎉',
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '💯',
    '✅', '❌', '⭐', '🔥', '💡', '📌', '🎯', '🚀'
  ];

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const month = date.toLocaleString('en-US', { month: 'long' });
    const day = date.getDate();
    const year = date.getFullYear();
    const suffix = ['th', 'st', 'nd', 'rd'][day % 10 > 3 ? 0 : (day % 100 - day % 10 != 10) * day % 10];
    return `${month} ${day}${suffix}, ${year}`;
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const groupCommentsByDate = () => {
    const groups = {};
    filteredComments.forEach(comment => {
      const dateKey = new Date(comment.created_at).toDateString();
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(comment);
    });
    return groups;
  };

  const groupedComments = groupCommentsByDate();

  return (
    <div className="flex flex-col h-full">
      {/* Comments List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {filteredComments.length === 0 ? (
          <div className="text-center text-neutral-400 dark:text-neutral-500 py-12">
            <p>{isNotesMode ? 'No notes yet' : 'No comments yet'}</p>
            <p className="text-sm mt-1">{isNotesMode ? 'Add internal notes visible only to team members' : 'Add a comment to get started'}</p>
          </div>
        ) : (
          Object.keys(groupedComments).map((dateKey) => {
            const dateComments = groupedComments[dateKey];
            const dateLabel = formatDate(dateComments[0].created_at);

            return (
              <div key={dateKey}>
                {/* Date separator */}
                <div className="flex items-center justify-center mb-4">
                  <div className="text-xs text-neutral-400 dark:text-neutral-600 bg-neutral-100 dark:bg-neutral-900 px-3 py-1 rounded-full">
                    {dateLabel}
                  </div>
                </div>

                {/* Comments */}
                <div className="space-y-0">
                  {dateComments.map((comment) => {
                    const author = comment.author_designer_id ? team?.find(t => t.id === comment.author_designer_id) : null;
                    const authorName = comment.authorName || author?.full_name || 'Unknown';
                    const authorAvatar = comment.authorAvatar || author?.avatar_url || null;

                    const currentTeamMember = team?.find(t => t.email === user?.email);
                    const isOwnComment = (currentTeamMember && comment.author_designer_id === currentTeamMember?.id) ||
                                        (clientContactId && comment.author_contact_id === clientContactId);
                    const isEditing = editingCommentId === comment.id;
                    const isHovered = hoveredCommentId === comment.id;

                    const isHighlighted = highlightedCommentId === comment.id;

                    return (
                      <div
                        key={comment.id}
                        id={`comment-${comment.id}`}
                        className={`flex gap-3 p-2 -mx-2 rounded-lg transition-all duration-500 ${isHighlighted ? 'ring-2 ring-neutral-900/80 dark:ring-white/80' : ''}`}
                        onMouseEnter={() => setHoveredCommentId(comment.id)}
                        onMouseLeave={() => setHoveredCommentId(null)}
                      >
                        {/* Avatar */}
                        <div className="flex-shrink-0">
                          {authorAvatar ? (
                            <img src={authorAvatar} alt={authorName} className="w-8 h-8 rounded-full" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-neutral-600 dark:text-white text-sm">
                              {authorName[0]}
                            </div>
                          )}
                        </div>

                        {/* Comment content */}
                        <div className="flex-1 min-w-0">
                          {/* Header - fixed height to prevent layout shift */}
                          <div className="flex items-center justify-between h-6">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-neutral-900 dark:text-white">{authorName}</span>
                              <span className="text-xs text-neutral-400 dark:text-neutral-600">{formatTime(comment.created_at)}</span>
                            </div>

                            {/* Hover actions - always reserve space, show/hide with opacity */}
                            <div className={`flex items-center gap-1 transition-opacity ${isHovered && !isEditing ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                              {/* Edit button - only for own comments */}
                              {isOwnComment && (
                                <button
                                  onClick={() => startEdit(comment)}
                                  className="px-2 py-0.5 rounded text-xs text-neutral-400 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800"
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
                                  className="p-1 rounded text-neutral-400 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800"
                                >
                                  <Icon name="smiley-happy" size={14} />
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

                                {/* Full Emoji Picker - positioned smartly */}
                                {showFullEmojiPickerForComment === comment.id && (
                                  <>
                                    <div className="fixed inset-0 z-40" onClick={closeAllHoverMenus} />
                                    <ReactionEmojiPickerPositioned
                                      onSelect={(emoji) => handleAddReactionLocal(comment.id, emoji)}
                                      onClose={closeAllHoverMenus}
                                    />
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
                                  className="p-1 rounded text-neutral-400 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800"
                                >
                                  <Icon name="dot-horizontal" size={14} />
                                </button>

                                {/* Dropdown menu */}
                                {showCommentMenuForComment === comment.id && (
                                  <>
                                    <div className="fixed inset-0 z-40" onClick={closeAllHoverMenus} />
                                    <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-xl z-50 overflow-hidden">
                                      <button
                                        onClick={() => handleCopyCommentLink(comment.id)}
                                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                                      >
                                        <Icon name="copy-right" size={14} />
                                        Copy link
                                      </button>
                                      {isOwnComment && (
                                        <button
                                          onClick={() => handleDeleteCommentClick(comment.id)}
                                          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-500 dark:text-red-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                                        >
                                          <Icon name="trash-01" size={14} />
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
                            <div className="space-y-2">
                              {/* Edit formatting toolbar */}
                              {showEditFormattingToolbar && (
                                <div className="flex items-center gap-1 pb-2">
                                  <button onClick={() => insertBold(false)} className={`p-1 rounded transition-colors ${activeEditFormats.bold ? 'text-neutral-900 dark:text-white bg-neutral-200 dark:bg-neutral-700' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800'}`} title="Bold">
                                    <Icon name="bold-01" size={14} />
                                  </button>
                                  <button onClick={() => insertItalic(false)} className={`p-1 rounded transition-colors ${activeEditFormats.italic ? 'text-neutral-900 dark:text-white bg-neutral-200 dark:bg-neutral-700' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800'}`} title="Italic">
                                    <Icon name="italics-01" size={14} />
                                  </button>
                                  <button onClick={() => insertStrikethrough(false)} className={`p-1 rounded transition-colors ${activeEditFormats.strikeThrough ? 'text-neutral-900 dark:text-white bg-neutral-200 dark:bg-neutral-700' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800'}`} title="Strikethrough">
                                    <Icon name="type-strike-01" size={14} />
                                  </button>
                                  <button onClick={() => insertUnderline(false)} className={`p-1 rounded transition-colors ${activeEditFormats.underline ? 'text-neutral-900 dark:text-white bg-neutral-200 dark:bg-neutral-700' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800'}`} title="Underline">
                                    <Icon name="underline-01" size={14} />
                                  </button>
                                  <div className="w-px h-3 bg-neutral-300 dark:bg-neutral-700 mx-0.5" />
                                  <button onClick={() => insertBulletList(false)} className="p-1 rounded text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800" title="Bullet list">
                                    <Icon name="list" size={14} />
                                  </button>
                                  <button onClick={() => insertNumberedList(false)} className="p-1 rounded text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800" title="Numbered list">
                                    <Icon name="list-numbers" size={14} />
                                  </button>
                                  <button onClick={() => insertChecklist(false)} className="p-1 rounded text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800" title="Checklist">
                                    <Icon name="check-square-contained" size={14} />
                                  </button>
                                </div>
                              )}

                              {/* Edit link input */}
                              {showEditLinkInput && (
                                <div className="flex items-center gap-2 p-2 bg-neutral-100 dark:bg-neutral-900 rounded-lg">
                                  <input
                                    type="text"
                                    value={editLinkText}
                                    onChange={(e) => setEditLinkText(e.target.value)}
                                    placeholder="Link text"
                                    className="flex-1 bg-transparent text-neutral-700 dark:text-neutral-300 text-xs placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none"
                                  />
                                  <input
                                    type="text"
                                    value={editLinkUrl}
                                    onChange={(e) => setEditLinkUrl(e.target.value)}
                                    placeholder="URL"
                                    className="flex-1 bg-transparent text-neutral-700 dark:text-neutral-300 text-xs placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none"
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleInsertLink(false); }}
                                  />
                                  <button onClick={() => handleInsertLink(false)} className="p-1 text-blue-500 hover:text-blue-400">
                                    <Icon name="check-square-contained" size={14} />
                                  </button>
                                  <button onClick={() => { setShowEditLinkInput(false); setEditLinkUrl(''); setEditLinkText(''); }} className="p-1 text-neutral-400 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-white">
                                    <Icon name="x-01" size={14} />
                                  </button>
                                </div>
                              )}

                              {/* Edit content editor */}
                              <div
                                ref={editCommentEditorRef}
                                contentEditable
                                className="w-full bg-transparent text-neutral-700 dark:text-neutral-300 text-sm focus:outline-none min-h-[40px] max-h-[100px] overflow-y-auto"
                                onKeyDown={(e) => { if (e.key === 'Escape') cancelEdit(); }}
                                onInput={(e) => setEditedContent(e.currentTarget.innerHTML)}
                              />

                              {/* Edit toolbar */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => { setShowEditLinkInput(!showEditLinkInput); setShowEditFormattingToolbar(false); setShowEditEmojiPicker(false); }}
                                    className={`p-1 rounded transition-colors ${showEditLinkInput ? 'text-neutral-900 dark:text-white bg-neutral-200 dark:bg-neutral-800' : 'text-neutral-400 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
                                    title="Add link"
                                  >
                                    <Icon name="paperclip" size={14} />
                                  </button>
                                  <button
                                    onClick={() => { setShowEditFormattingToolbar(!showEditFormattingToolbar); setShowEditLinkInput(false); setShowEditEmojiPicker(false); }}
                                    className={`p-1 rounded transition-colors ${showEditFormattingToolbar ? 'text-neutral-900 dark:text-white bg-neutral-200 dark:bg-neutral-800' : 'text-neutral-400 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
                                    title="Text formatting"
                                  >
                                    <Icon name="type-01" size={14} />
                                  </button>
                                  <div className="relative">
                                    <button
                                      ref={editEmojiButtonRef}
                                      onClick={() => { setShowEditEmojiPicker(!showEditEmojiPicker); setShowEditFormattingToolbar(false); setShowEditLinkInput(false); }}
                                      className={`p-1 rounded transition-colors ${showEditEmojiPicker ? 'text-neutral-900 dark:text-white bg-neutral-200 dark:bg-neutral-800' : 'text-neutral-400 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
                                      title="Add emoji"
                                    >
                                      <Icon name="smiley-happy" size={14} />
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
                                  <button onClick={cancelEdit} className="text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white">
                                    Cancel
                                  </button>
                                  <button onClick={() => saveEdit(comment.id)} className="text-xs text-neutral-900 dark:text-white hover:text-neutral-600 dark:hover:text-neutral-300">
                                    Save
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div
                                className="text-sm text-neutral-700 dark:text-neutral-300"
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
                                          ? 'bg-transparent border border-neutral-900/60 dark:border-white/60 text-neutral-900 dark:text-white'
                                          : 'bg-transparent border border-neutral-300 dark:border-neutral-600 text-neutral-500 dark:text-neutral-400 hover:border-neutral-400 dark:hover:border-neutral-500'
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

      {/* New Comment Input */}
      <div className="p-4">
        <div className="space-y-3">
          {/* Formatting toolbar - shown above textarea */}
          {showFormattingToolbar && (
            <div className="flex items-center gap-1 pb-2">
              <button
                onClick={() => insertBold(true)}
                className={`p-1.5 rounded transition-colors ${
                  activeFormats.bold
                    ? 'text-neutral-900 dark:text-white bg-neutral-200 dark:bg-neutral-700'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
                title="Bold"
              >
                <Icon name="bold-01" size={16} />
              </button>
              <button
                onClick={() => insertItalic(true)}
                className={`p-1.5 rounded transition-colors ${
                  activeFormats.italic
                    ? 'text-neutral-900 dark:text-white bg-neutral-200 dark:bg-neutral-700'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
                title="Italic"
              >
                <Icon name="italics-01" size={16} />
              </button>
              <button
                onClick={() => insertStrikethrough(true)}
                className={`p-1.5 rounded transition-colors ${
                  activeFormats.strikeThrough
                    ? 'text-neutral-900 dark:text-white bg-neutral-200 dark:bg-neutral-700'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
                title="Strikethrough"
              >
                <Icon name="type-strike-01" size={16} />
              </button>
              <button
                onClick={() => insertUnderline(true)}
                className={`p-1.5 rounded transition-colors ${
                  activeFormats.underline
                    ? 'text-neutral-900 dark:text-white bg-neutral-200 dark:bg-neutral-700'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
                title="Underline"
              >
                <Icon name="underline-01" size={16} />
              </button>
              <div className="w-px h-4 bg-neutral-300 dark:bg-neutral-700 mx-1" />
              <button
                onClick={() => insertBulletList(true)}
                className="p-1.5 rounded text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800"
                title="Bullet list"
              >
                <Icon name="list" size={16} />
              </button>
              <button
                onClick={() => insertNumberedList(true)}
                className="p-1.5 rounded text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800"
                title="Numbered list"
              >
                <Icon name="list-numbers" size={16} />
              </button>
              <button
                onClick={() => insertChecklist(true)}
                className="p-1.5 rounded text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800"
                title="Checklist"
              >
                <Icon name="check-square-contained" size={16} />
              </button>
            </div>
          )}

          {/* Link input - shown inline */}
          {showLinkInput && (
            <div className="flex items-center gap-2 p-2 bg-neutral-100 dark:bg-neutral-900 rounded-lg">
              <input
                type="text"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                placeholder="Link text (optional)"
                className="flex-1 bg-transparent text-neutral-700 dark:text-neutral-300 text-sm placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none"
              />
              <input
                type="text"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="URL"
                className="flex-1 bg-transparent text-neutral-700 dark:text-neutral-300 text-sm placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleInsertLink(true);
                  }
                }}
              />
              <button
                onClick={() => handleInsertLink(true)}
                className="p-1 text-blue-500 hover:text-blue-400"
              >
                <Icon name="check-square-contained" size={16} />
              </button>
              <button
                onClick={() => {
                  setShowLinkInput(false);
                  setLinkUrl('');
                  setLinkText('');
                }}
                className="p-1 text-neutral-400 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
              >
                <Icon name="x-01" size={16} />
              </button>
            </div>
          )}

          {/* Notes mode label */}
          {isNotesMode && (
            <div className="text-xs text-neutral-400 dark:text-neutral-500 mb-1">Only visible to team members</div>
          )}

          {/* Message editor */}
          <div
            ref={newCommentEditorRef}
            contentEditable
            data-placeholder={isNotesMode ? "Add a private note..." : "Leave a message..."}
            className="w-full bg-transparent text-neutral-700 dark:text-neutral-300 text-sm focus:outline-none min-h-[20px] max-h-[120px] overflow-y-auto empty:before:content-[attr(data-placeholder)] empty:before:text-neutral-400 dark:empty:before:text-neutral-600"
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
                onClick={() => {
                  setShowLinkInput(!showLinkInput);
                  setShowFormattingToolbar(false);
                  setShowNewCommentEmojiPicker(false);
                }}
                className={`p-1.5 rounded transition-colors ${
                  showLinkInput
                    ? 'text-neutral-900 dark:text-white bg-neutral-200 dark:bg-neutral-800'
                    : 'text-neutral-400 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
                title="Add link"
              >
                <Icon name="paperclip" size={16} />
              </button>
              <button
                onClick={() => {
                  setShowFormattingToolbar(!showFormattingToolbar);
                  setShowLinkInput(false);
                  setShowNewCommentEmojiPicker(false);
                }}
                className={`p-1.5 rounded transition-colors ${
                  showFormattingToolbar
                    ? 'text-neutral-900 dark:text-white bg-neutral-200 dark:bg-neutral-800'
                    : 'text-neutral-400 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
                title="Text formatting"
              >
                <Icon name="type-01" size={16} />
              </button>
              <div className="relative">
                <button
                  ref={newCommentEmojiButtonRef}
                  onClick={() => {
                    setShowNewCommentEmojiPicker(!showNewCommentEmojiPicker);
                    setShowFormattingToolbar(false);
                    setShowLinkInput(false);
                  }}
                  className={`p-1.5 rounded transition-colors ${
                    showNewCommentEmojiPicker
                      ? 'text-neutral-900 dark:text-white bg-neutral-200 dark:bg-neutral-800'
                      : 'text-neutral-400 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800'
                  }`}
                  title="Add emoji"
                >
                  <Icon name="smiley-happy" size={16} />
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
              className={`transition-colors ${
                newComment.trim() && newComment !== '<br>'
                  ? 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  : 'text-neutral-300 dark:text-neutral-700 cursor-not-allowed'
              }`}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 10l16-8-8 16-2-6-6-2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={cancelDeleteComment} />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-2xl z-50 w-80 overflow-hidden">
            <div className="p-4">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">Delete Comment</h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
                Are you sure you want to delete this comment? This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={cancelDeleteComment}
                  className="px-4 py-2 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
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
