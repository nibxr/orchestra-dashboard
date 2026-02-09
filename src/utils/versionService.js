import { supabase } from '../supabaseClient';

// Detect embed type - reusing logic from EmbedContent.jsx
export const detectEmbedType = (url) => {
  if (!url) return null;

  if (url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)) {
    return 'youtube';
  }
  if (url.match(/vimeo\.com\/(\d+)/)) {
    return 'vimeo';
  }
  if (url.match(/loom\.com\/(share|embed)\/([a-zA-Z0-9]+)/)) {
    return 'loom';
  }
  if (url.match(/figma\.com\/(file|design|proto)\/([^/]+)/)) {
    return 'figma';
  }
  if (url.match(/drive\.google\.com|docs\.google\.com|sheets\.google\.com|slides\.google\.com/)) {
    return 'google-drive';
  }
  if (url.match(/miro\.com\/app\/board\/([^/]+)/)) {
    return 'miro';
  }
  if (url.match(/fillout\.com\/t\/([a-zA-Z0-9]+)/)) {
    return 'fillout';
  }
  if (url.match(/typeform\.com\/to\/([a-zA-Z0-9]+)/)) {
    return 'typeform';
  }
  if (url.match(/^https?:\/\//)) {
    return 'website';
  }

  return 'link';
};

/**
 * Get all versions for a task
 */
export const getTaskVersions = async (taskId) => {
  const { data, error } = await supabase
    .from('task_versions')
    .select('*')
    .eq('task_id', taskId)
    .order('version_number', { ascending: true });

  if (error) {
    console.error('Error fetching task versions:', error);
    return { data: null, error };
  }

  return { data, error: null };
};

/**
 * Get the current version for a task
 */
export const getCurrentVersion = async (taskId) => {
  const { data, error } = await supabase
    .from('task_versions')
    .select('*')
    .eq('task_id', taskId)
    .eq('is_current', true)
    .single();

  if (error) {
    // If no current version found, just return null (not an error)
    if (error.code === 'PGRST116') {
      return { data: null, error: null };
    }
    console.error('Error fetching current version:', error);
    return { data: null, error };
  }

  return { data, error: null };
};

/**
 * Get next version number for a task
 */
const getNextVersionNumber = async (taskId) => {
  const { data, error } = await supabase
    .from('task_versions')
    .select('version_number')
    .eq('task_id', taskId)
    .order('version_number', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error getting next version number:', error);
    return 1;
  }

  return data && data.length > 0 ? data[0].version_number + 1 : 1;
};

/**
 * Create a new version for a task
 */
export const createVersion = async (taskId, embedUrl, versionName = null, createdById = null) => {
  const embedType = detectEmbedType(embedUrl);
  const versionNumber = await getNextVersionNumber(taskId);

  // Unset current version for this task first
  await supabase
    .from('task_versions')
    .update({ is_current: false })
    .eq('task_id', taskId);

  const { data, error } = await supabase
    .from('task_versions')
    .insert({
      task_id: taskId,
      version_number: versionNumber,
      version_name: versionName || `Version ${versionNumber}`,
      embed_url: embedUrl,
      embed_type: embedType,
      created_by_id: createdById,
      is_current: true,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating version:', error);
    return { data: null, error };
  }

  return { data, error: null };
};

/**
 * Update a version's name or embed URL
 */
export const updateVersion = async (versionId, updates) => {
  const updateData = { ...updates };

  // If embed_url is being updated, also update embed_type
  if (updates.embed_url) {
    updateData.embed_type = detectEmbedType(updates.embed_url);
  }

  const { data, error } = await supabase
    .from('task_versions')
    .update(updateData)
    .eq('id', versionId)
    .select()
    .single();

  if (error) {
    console.error('Error updating version:', error);
    return { data: null, error };
  }

  return { data, error: null };
};

/**
 * Set a version as the current version
 */
export const setCurrentVersion = async (versionId) => {
  // First, get the task_id for this version
  const { data: version, error: versionError } = await supabase
    .from('task_versions')
    .select('task_id')
    .eq('id', versionId)
    .single();

  if (versionError) {
    console.error('Error fetching version:', versionError);
    return { error: versionError };
  }

  // Unset all current versions for this task
  await supabase
    .from('task_versions')
    .update({ is_current: false })
    .eq('task_id', version.task_id);

  // Set this version as current
  const { data, error } = await supabase
    .from('task_versions')
    .update({ is_current: true })
    .eq('id', versionId)
    .select()
    .single();

  if (error) {
    console.error('Error setting current version:', error);
    return { data: null, error };
  }

  return { data, error: null };
};

/**
 * Delete a version (soft delete by setting archived_at)
 */
export const deleteVersion = async (versionId) => {
  const { data, error } = await supabase
    .from('task_versions')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', versionId)
    .select()
    .single();

  if (error) {
    console.error('Error deleting version:', error);
    return { error };
  }

  return { data, error: null };
};

/**
 * Migrate a task to versioned format by extracting URL from description
 */
export const migrateTaskToVersioned = async (taskId, description, content) => {
  // Check if task already has versions
  const { data: existingVersions } = await getTaskVersions(taskId);
  if (existingVersions && existingVersions.length > 0) {
    return {
      data: existingVersions[0],
      error: { message: 'Task already has versions' }
    };
  }

  // Extract URL from description or content
  const text = `${description || ''} ${content || ''}`;
  const urlMatch = text.match(/(https?:\/\/[^\s]+)/);

  if (!urlMatch) {
    return {
      data: null,
      error: { message: 'No URL found in task description or content' }
    };
  }

  const embedUrl = urlMatch[1];

  // Create initial version
  return await createVersion(taskId, embedUrl, 'Initial Version');
};

/**
 * Get comments for a specific version
 */
export const getVersionComments = async (versionId) => {
  const { data, error } = await supabase
    .from('comments')
    .select(`
      *,
      reactions:comment_reactions(*),
      attachments:comment_attachments(*)
    `)
    .eq('version_id', versionId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching version comments:', error);
    return { data: null, error };
  }

  return { data, error: null };
};
