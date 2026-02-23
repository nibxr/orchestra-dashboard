import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { X, ArrowLeft } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { TaskDetails } from './TaskDetails';

export const FullPageTaskView = () => {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const { user, userRole, userMembership } = useAuth();
  const [task, setTask] = useState(null);
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTaskAndTeam();
  }, [taskId]);

  const fetchTaskAndTeam = async () => {
    setLoading(true);
    try {
      // Fetch task
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single();

      if (taskError) throw taskError;

      // Fetch team
      const { data: teamData } = await supabase.from('team').select('*');

      // Fetch clients
      const { data: clientsData } = await supabase.from('client_memberships').select('*');
      console.log('[FullPageTaskView] clientsData fetched:', clientsData?.length, 'clients');

      // Fetch comments
      const { data: commentsData } = await supabase
        .from('comments')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      // Enrich task with related data
      const assignee = teamData?.find(m => m.id === taskData.assigned_to_id);
      const client = clientsData?.find(c => c.id === taskData.membership_id);
      // Fix: Check both created_by_team_id (team members) and created_by_id (legacy/client contacts)
      const creator = teamData?.find(m =>
          m.id === taskData.created_by_team_id || m.id === taskData.created_by_id
      );
      const helper = teamData?.find(m => m.id === taskData.helper_id);
      const coCreator = teamData?.find(m => m.id === taskData.co_creator_team_id);

      // Debug logging
      console.log('[FullPageTaskView] taskData.membership_id:', taskData.membership_id);
      console.log('[FullPageTaskView] client found:', client);
      console.log('[FullPageTaskView] client?.client_name:', client?.client_name);
      console.log('[FullPageTaskView] assignee found:', assignee?.full_name);
      console.log('[FullPageTaskView] creator found:', creator?.full_name);

      // Enrich comments with author names
      const enrichedComments = commentsData?.map(comment => {
        let authorName = 'Unknown';
        let authorAvatar = null;

        if (comment.author_designer_id) {
          const designer = teamData?.find(t => t.id === comment.author_designer_id);
          authorName = designer?.full_name || designer?.email || 'Unknown';
          authorAvatar = designer?.avatar_url;
        } else if (comment.author_contact_id) {
          // Would need to fetch from client_contacts table if needed
          authorName = 'Client User';
        }

        return {
          ...comment,
          authorName,
          authorAvatar
        };
      }) || [];

      const enrichedTask = {
        ...taskData,
        assigneeName: assignee?.full_name,
        assigneeAvatar: assignee?.avatar_url,
        clientName: client?.client_name || 'Internal',
        clientStatus: client?.status || 'Active',
        creatorName: creator?.full_name,
        creatorAvatar: creator?.avatar_url,
        helperName: helper?.full_name || null,
        helperAvatar: helper?.avatar_url || null,
        coCreatorName: coCreator?.full_name || null,
        coCreatorAvatar: coCreator?.avatar_url || null,
        comments: enrichedComments
      };

      console.log('[FullPageTaskView] ENRICHED TASK:', enrichedTask);
      console.log('[FullPageTaskView] enrichedTask.clientName:', enrichedTask.clientName);
      setTask(enrichedTask);
      setTeam(teamData || []);
    } catch (error) {
      console.error('Error fetching task:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTask = async (taskId, payload) => {
    try {
      // If only updating comments, skip database update (comments are in separate table)
      if (Object.keys(payload).length === 1 && payload.comments) {
        // Update local state only
        setTask(prev => {
          const updated = { ...prev, ...payload };
          // Force new array reference for comments
          if (payload.comments) {
            updated.comments = [...payload.comments];
          }
          return updated;
        });
        return;
      }

      const { error } = await supabase
        .from('tasks')
        .update(payload)
        .eq('id', taskId);

      if (error) throw error;

      // Update local state
      setTask(prev => {
        const updated = { ...prev, ...payload };
        // Force new array reference for comments
        if (payload.comments) {
          updated.comments = [...payload.comments];
        }
        return updated;
      });
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleClose = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0f0f0f] flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="w-12 h-12 border-2 border-neutral-200 dark:border-neutral-800 rounded-full"></div>
            <div className="w-12 h-12 border-2 border-neutral-900 dark:border-neutral-500 border-t-transparent dark:border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
          </div>
          <div className="text-center space-y-2">
            <p
              className="text-neutral-400 dark:text-neutral-600 tracking-[0.2em] uppercase"
              style={{ fontWeight: 200, fontSize: '14px', letterSpacing: '0.2em' }}
            >
              Loading
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-500 font-medium">
              {task?.title || 'Opening task...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-center">
          <div className="text-neutral-400 mb-4">Task not found</div>
          <button
            onClick={() => navigate('/')}
            className="text-neutral-900 dark:text-white hover:text-neutral-600 dark:hover:text-neutral-300 flex items-center gap-2 mx-auto"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Full page task view - render TaskDetails without the slide-in animation */}
      <div className="fixed inset-0 bg-[#0a0a0a]">
        <TaskDetails
          task={task}
          onClose={handleClose}
          onUpdate={handleUpdateTask}
          team={team}
          isFullPage={true}
        />
      </div>
    </div>
  );
};
