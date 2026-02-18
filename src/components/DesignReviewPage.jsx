import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { getTaskVersions, getCurrentVersion } from '../utils/versionService';
import { useCanvasComments } from '../hooks/useCanvasComments';
import { useAuth } from '../contexts/AuthContext';
import DesignReviewSidebar from './DesignReviewSidebar';
import DesignCanvas from './DesignCanvas';
import { TaskDetails } from './TaskDetails';
import { ImprovedDesignReview } from './ImprovedDesignReview';
import { VersionlessTaskView } from './VersionlessTaskView';

/**
 * DesignReviewPage - Main orchestrator for the design review interface
 * Manages state, real-time subscriptions, and coordinates all subcomponents
 */
const DesignReviewPage = () => {
  const { taskId } = useParams();
  const { user } = useAuth();

  // Core data state
  const [task, setTask] = useState(null);
  const [versions, setVersions] = useState([]);
  const [currentVersion, setCurrentVersion] = useState(null);
  const [comments, setComments] = useState([]);
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Canvas state
  const [canvasMode, setCanvasMode] = useState('view');
  const [devicePreview, setDevicePreview] = useState('desktop');

  // UI state
  const [activeCommentId, setActiveCommentId] = useState(null);
  const [highlightedPinId, setHighlightedPinId] = useState(null);

  // Canvas comments hook
  const {
    canvasRef,
    isPlacingPin,
    pendingPinPosition,
    handleCanvasClick,
    startPinPlacement,
    cancelPinPlacement,
    createPositionedComment,
    resolveComment: resolveCommentHook,
    unresolveComment
  } = useCanvasComments(currentVersion?.id);

  // Fetch initial data
  useEffect(() => {
    if (taskId) {
      fetchTaskData();
      fetchTeam();
    }
  }, [taskId]);

  // Re-enrich comments when team data loads (to get proper author names/avatars)
  useEffect(() => {
    if (team.length > 0 && comments.length > 0) {
      setComments(prevComments => prevComments.map(comment => {
        // Look up author from team data
        let authorName = 'Unknown User';
        let authorAvatar = null;

        if (comment.author_designer_id) {
          const author = team.find(t => t.id === comment.author_designer_id);
          if (author) {
            authorName = author.full_name || author.email || 'Team Member';
            authorAvatar = author.avatar_url;
          }
        } else if (comment.author_contact_id) {
          authorName = 'Client';
        }

        return {
          ...comment,
          authorName,
          authorAvatar
        };
      }));
    }
  }, [team]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!taskId) return;

    const channel = supabase
      .channel(`task:${taskId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comments', filter: `task_id=eq.${taskId}` },
        (payload) => {
          console.log('New comment:', payload.new);
          setComments(prev => [...prev, enrichComment(payload.new)]);
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'comments', filter: `task_id=eq.${taskId}` },
        (payload) => {
          console.log('Updated comment:', payload.new);
          setComments(prev => prev.map(c =>
            c.id === payload.new.id ? enrichComment(payload.new) : c
          ));
        }
      )
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'comments', filter: `task_id=eq.${taskId}` },
        (payload) => {
          console.log('Deleted comment:', payload.old);
          setComments(prev => prev.filter(c => c.id !== payload.old.id));
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'task_versions', filter: `task_id=eq.${taskId}` },
        (payload) => {
          console.log('Version changed:', payload);
          fetchVersions();
        }
      )
      .subscribe();

    // Separate channel for reaction changes (can't filter by task_id directly)
    const reactionChannel = supabase
      .channel(`reactions:${taskId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comment_reactions' },
        (payload) => {
          const newReaction = payload.new;
          // Update the reaction in the comment if it belongs to one of our comments
          setComments(prev => prev.map(comment => {
            if (comment.id === newReaction.comment_id) {
              // Only add if not already present (avoid duplicates from local state update)
              const exists = comment.reactions?.some(r => r.id === newReaction.id);
              if (!exists) {
                return {
                  ...comment,
                  reactions: [...(comment.reactions || []), newReaction]
                };
              }
            }
            return comment;
          }));
        }
      )
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'comment_reactions' },
        (payload) => {
          const deletedReaction = payload.old;
          setComments(prev => prev.map(comment => {
            if (comment.id === deletedReaction.comment_id) {
              return {
                ...comment,
                reactions: (comment.reactions || []).filter(r => r.id !== deletedReaction.id)
              };
            }
            return comment;
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(reactionChannel);
    };
  }, [taskId]);

  // Start pin placement when canvas mode changes to comment
  useEffect(() => {
    if (canvasMode === 'comment') {
      startPinPlacement();
    } else {
      cancelPinPlacement();
    }
  }, [canvasMode]);

  const fetchTaskData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch all data in parallel for better performance
      const [
        { data: taskData, error: taskError },
        { data: versionsData, error: versionsError },
        { data: currentVer }
      ] = await Promise.all([
        supabase.from('tasks').select('*').eq('id', taskId).single(),
        getTaskVersions(taskId),
        getCurrentVersion(taskId)
      ]);

      if (taskError) throw taskError;
      if (versionsError) throw versionsError;

      console.log('Fetched task data:', taskData); // Debug log

      // Fetch client name if needed (parallel with comments)
      const fetchClientPromise = taskData.membership_id
        ? supabase.from('client_memberships').select('client_name').eq('id', taskData.membership_id).single()
        : Promise.resolve({ data: null });

      const [{ data: clientData }, commentsResult] = await Promise.all([
        fetchClientPromise,
        fetchComments()
      ]);

      const clientName = clientData?.client_name || 'Internal';

      // Normalize status: Remove emojis and extra spaces
      let normalizedStatus = taskData.status || 'Backlog';
      if (normalizedStatus) {
        normalizedStatus = normalizedStatus.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim();
      }

      console.log('Status normalization:', {
        original: taskData.status,
        normalized: normalizedStatus
      });

      // Enrich task with clientName and dueDate
      const enrichedTask = {
        ...taskData,
        clientName,
        dueDate: taskData.due_date || taskData.delivered_at || taskData.properties?.dueDate || null,
        status: normalizedStatus
      };

      console.log('Enriched task:', enrichedTask); // Debug log

      // Set all state at once
      setTask(enrichedTask);
      setVersions(versionsData || []);
      setCurrentVersion(currentVer || (versionsData && versionsData.length > 0 ? versionsData[0] : null));

    } catch (err) {
      console.error('Error fetching task data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchVersions = async () => {
    const { data, error } = await getTaskVersions(taskId);
    if (!error) {
      setVersions(data || []);
    }
  };

  const fetchComments = async () => {
    // Fetch only version-specific comments (comments that have a version_id)
    // Task-level comments (version_id is null) are shown only in the normal task view
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        reactions:comment_reactions(*),
        attachments:comment_attachments(*)
      `)
      .eq('task_id', taskId)
      .not('version_id', 'is', null) // Only version comments, not task-level comments
      .order('created_at', { ascending: true });

    if (!error) {
      setComments((data || []).map(enrichComment));
    }
  };

  const fetchTeam = async () => {
    const { data, error } = await supabase
      .from('team')
      .select('*')
      .order('full_name', { ascending: true });

    if (!error) {
      setTeam(data || []);
    }
  };

  const enrichComment = (comment) => {
    // Look up author from team data
    let authorName = 'Unknown User';
    let authorAvatar = null;

    if (comment.author_designer_id) {
      const author = team?.find(t => t.id === comment.author_designer_id);
      if (author) {
        authorName = author.full_name || author.email || 'Team Member';
        authorAvatar = author.avatar_url;
      }
    } else if (comment.author_contact_id) {
      // Client contact - would need to look up from client_contacts if available
      authorName = 'Client';
    }

    return {
      ...comment,
      authorName,
      authorAvatar,
      replyCount: comments.filter(c => c.parent_comment_id === comment.id).length
    };
  };

  const handleVersionChange = async (version) => {
    setCurrentVersion(version);
    // Refresh versions list to pick up any new versions
    await fetchVersions();
  };

  const handleAddComment = async (commentData) => {
    // If we have a pending pin position, create positioned comment
    if (pendingPinPosition) {
      const newComment = await createPositionedComment(commentData);
      if (newComment) {
        setComments(prev => [...prev, enrichComment(newComment)]);
      }
    } else {
      // Regular comment
      const { data, error } = await supabase
        .from('comments')
        .insert(commentData)
        .select(`
          *,
          reactions:comment_reactions(*),
          attachments:comment_attachments(*)
        `)
        .single();

      if (error) {
        console.error('Error adding comment:', error);
        throw error;
      }

      // Immediately add the new comment to the local state
      if (data) {
        setComments(prev => [...prev, enrichComment(data)]);
      }
    }
  };

  const handleDeleteComment = async (commentId) => {
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      console.error('Error deleting comment:', error);
    } else {
      // Immediately remove the comment from local state
      setComments(prev => prev.filter(c => c.id !== commentId));
    }
  };

  const handleResolveComment = async (commentId, resolved) => {
    if (resolved) {
      await resolveCommentHook(commentId);
    } else {
      await unresolveComment(commentId);
    }
  };

  // Get current team member ID based on user email (for display purposes)
  const getCurrentTeamMemberId = () => {
    const currentTeamMember = team?.find(t => t.email === user?.email);
    return currentTeamMember?.id;
  };

  const handleAddReaction = async (commentId, emoji) => {
    // Use auth user.id for reactions (foreign key references users table)
    const userId = user?.id;
    if (!userId) {
      console.error('No user ID available for reaction');
      return;
    }

    const { data, error } = await supabase
      .from('comment_reactions')
      .insert({
        comment_id: commentId,
        user_id: userId,
        emoji
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding reaction:', error);
    } else if (data) {
      // Update local state to add the reaction immediately
      setComments(prev => prev.map(comment => {
        if (comment.id === commentId) {
          const updatedReactions = [...(comment.reactions || []), data];
          return { ...comment, reactions: updatedReactions };
        }
        return comment;
      }));
    }
  };

  const handleRemoveReaction = async (commentId, emoji) => {
    // Use auth user.id for reactions (foreign key references users table)
    const userId = user?.id;
    if (!userId) {
      console.error('No user ID available for reaction removal');
      return;
    }

    const { error } = await supabase
      .from('comment_reactions')
      .delete()
      .eq('comment_id', commentId)
      .eq('user_id', userId)
      .eq('emoji', emoji);

    if (error) {
      console.error('Error removing reaction:', error);
    } else {
      // Update local state to remove the reaction immediately
      setComments(prev => prev.map(comment => {
        if (comment.id === commentId) {
          const updatedReactions = (comment.reactions || []).filter(
            r => !(r.user_id === userId && r.emoji === emoji)
          );
          return { ...comment, reactions: updatedReactions };
        }
        return comment;
      }));
    }
  };

  const handlePinClick = (comment) => {
    setActiveCommentId(comment.id);
    setHighlightedPinId(null);
  };

  const handleCommentClick = (comment) => {
    setHighlightedPinId(comment.id);
    setActiveCommentId(comment.id);
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-[#0f0f0f] animate-fade-in">
        <div className="flex flex-col items-center gap-4">
          {/* Minimalist spinner */}
          <div className="relative">
            <div className="w-12 h-12 border-2 border-neutral-200 dark:border-neutral-800 rounded-full"></div>
            <div className="w-12 h-12 border-2 border-neutral-900 dark:border-white border-t-transparent dark:border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
          </div>
          {/* Clean text */}
          <div className="text-center space-y-1">
            <p className="text-sm font-medium text-neutral-900 dark:text-white">Loading</p>
            <p className="text-xs text-neutral-400 dark:text-neutral-600">Please wait...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-neutral-50 dark:bg-neutral-900">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
            Error Loading Task
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">{error}</p>
          <button
            onClick={fetchTaskData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // No task found
  if (!task) {
    return (
      <div className="flex items-center justify-center h-screen bg-neutral-50 dark:bg-neutral-900">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
            Task Not Found
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            The task you're looking for doesn't exist or you don't have access to it.
          </p>
        </div>
      </div>
    );
  }

  // Handle task updates
  const handleUpdateTask = async (taskId, updates) => {
    // If only updating comments, skip database update (comments are in separate table)
    // The comment was already inserted directly into the comments table
    if (Object.keys(updates).length === 1 && updates.comments) {
      setTask(prev => ({ ...prev, ...updates }));
      return { error: null };
    }

    const { error } = await supabase
      .from('tasks')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', taskId);

    if (!error) {
      // Update local state
      setTask(prev => ({ ...prev, ...updates }));
    }

    return { error };
  };

  // Versionless task → New sidebar layout
  if (versions.length === 0) {
    return (
      <VersionlessTaskView
        task={task}
        team={team}
        onUpdateTask={handleUpdateTask}
        onVersionCreated={async () => {
          // Refetch to trigger UI transition
          await fetchVersions();
          await fetchTaskData();
        }}
      />
    );
  }

  // Versioned task → Existing UI
  return (
    <ImprovedDesignReview
      task={task}
      versions={versions}
      currentVersion={currentVersion}
      onVersionChange={handleVersionChange}
      comments={comments}
      team={team}
      onUpdateTask={handleUpdateTask}
      onAddComment={handleAddComment}
      onDeleteComment={handleDeleteComment}
      onUpdateComment={async (commentId, updates) => {
        const { error } = await supabase
          .from('comments')
          .update(updates)
          .eq('id', commentId);

        if (!error) {
          setComments(prev => prev.map(c =>
            c.id === commentId ? { ...c, ...updates } : c
          ));
        }
      }}
      onAddReaction={handleAddReaction}
      onRemoveReaction={handleRemoveReaction}
      currentUserId={user?.id}
    />
  );
};

export default DesignReviewPage;
