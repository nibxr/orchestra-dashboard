import { supabase } from '../supabaseClient';

const FIGMA_API_BASE = 'https://api.figma.com/v1';

/**
 * Sleep for a given number of milliseconds
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - The async function to retry
 * @param {number} maxRetries - Maximum number of retries (default: 2)
 * @param {number} baseDelay - Base delay in ms (default: 3000)
 * @returns {Promise} - The result of the function
 */
const retryWithBackoff = async (fn, maxRetries = 2, baseDelay = 3000) => {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry on non-rate-limit errors
      if (!error.message?.includes('429') && !error.message?.includes('rate limit')) {
        throw error;
      }

      // Don't retry if we've exhausted attempts
      if (attempt === maxRetries) {
        throw error;
      }

      // Calculate delay with exponential backoff: 3s, 6s
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`Rate limited. Retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`);
      await sleep(delay);
    }
  }

  throw lastError;
};

/**
 * Extract file key from a Figma URL
 * Supports formats:
 * - https://www.figma.com/file/ABC123/filename
 * - https://www.figma.com/design/ABC123/filename
 * - https://figma.com/file/ABC123/filename
 */
export const extractFigmaFileKey = (url) => {
  if (!url) return null;

  const match = url.match(/figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
};

/**
 * Fetch Figma file data (frames, pages, etc.)
 */
export const getFigmaFile = async (fileKey, accessToken) => {
  return retryWithBackoff(async () => {
    const response = await fetch(`${FIGMA_API_BASE}/files/${fileKey}`, {
      headers: {
        'X-Figma-Token': accessToken
      }
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));

      // Check if we're rate limited with a long retry-after
      if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after');
        const rateLimitType = response.headers.get('x-figma-rate-limit-type');
        const planTier = response.headers.get('x-figma-plan-tier');

        if (retryAfter && parseInt(retryAfter) > 3600) { // More than 1 hour
          const hours = Math.floor(parseInt(retryAfter) / 3600);
          throw new Error(
            `⏰ Figma API rate limit exceeded. Your ${planTier || 'current'} plan has reached its limit. ` +
            `You need to wait ${hours} hours, upgrade your Figma plan, or use a different Figma access token. ` +
            `Rate limit: ${rateLimitType || 'unknown'}`
          );
        }
      }

      throw new Error(error.message || `Figma API error: ${response.status}`);
    }

    return await response.json();
  });
};

/**
 * Extract all frames from Figma file data
 * Returns flat list of frames with their page context
 */
export const extractFramesFromFile = (fileData) => {
  const frames = [];

  if (!fileData?.document?.children) return frames;

  // Iterate through pages (CANVAS nodes)
  for (const page of fileData.document.children) {
    if (page.type !== 'CANVAS') continue;

    // Find all frames in this page
    const pageFrames = findFramesInNode(page, page.name);
    frames.push(...pageFrames);
  }

  return frames;
};

/**
 * Recursively find all FRAME nodes in a Figma node tree
 */
const findFramesInNode = (node, pageName, depth = 0) => {
  const frames = [];

  // Only look at top-level frames (direct children of page)
  // This avoids nested frames which are usually components within a design
  if (depth === 1 && (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'COMPONENT_SET')) {
    frames.push({
      id: node.id,
      name: node.name,
      type: node.type,
      pageName,
      width: node.absoluteBoundingBox?.width,
      height: node.absoluteBoundingBox?.height,
    });
  }

  // Recurse into children (but only for pages, not into frames)
  if (node.children && depth === 0) {
    for (const child of node.children) {
      frames.push(...findFramesInNode(child, pageName, depth + 1));
    }
  }

  return frames;
};

/**
 * Export specific frames as images from Figma
 * @param {string} fileKey - Figma file key
 * @param {string[]} nodeIds - Array of node IDs to export
 * @param {string} accessToken - Figma access token
 * @param {object} options - Export options (format, scale)
 */
export const exportFigmaFrames = async (fileKey, nodeIds, accessToken, options = {}) => {
  const { format = 'png', scale = 2 } = options;

  return retryWithBackoff(async () => {
    const idsParam = nodeIds.join(',');
    const response = await fetch(
      `${FIGMA_API_BASE}/images/${fileKey}?ids=${idsParam}&format=${format}&scale=${scale}`,
      {
        headers: {
          'X-Figma-Token': accessToken
        }
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));

      // Check if we're rate limited with a long retry-after
      if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after');
        const rateLimitType = response.headers.get('x-figma-rate-limit-type');
        const planTier = response.headers.get('x-figma-plan-tier');

        if (retryAfter && parseInt(retryAfter) > 3600) { // More than 1 hour
          const hours = Math.floor(parseInt(retryAfter) / 3600);
          throw new Error(
            `⏰ Figma API rate limit exceeded. Your ${planTier || 'current'} plan has reached its limit. ` +
            `You need to wait ${hours} hours, upgrade your Figma plan, or use a different Figma access token. ` +
            `Rate limit: ${rateLimitType || 'unknown'}`
          );
        }
      }

      throw new Error(error.message || `Figma API error: ${response.status}`);
    }

    const data = await response.json();
    return data.images; // Returns { nodeId: imageUrl, ... }
  });
};

/**
 * Download image from URL and convert to base64
 */
export const downloadImageAsBase64 = async (imageUrl) => {
  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error downloading image:', error);
    throw error;
  }
};

/**
 * Upload a Figma frame image to Supabase storage
 */
export const uploadFigmaFrame = async (taskId, versionId, frameData, imageBlob) => {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(7);
  const fileName = `${timestamp}-${randomStr}.png`;
  const filePath = `figma-frames/${taskId}/${versionId}/${fileName}`;

  // Upload to Supabase storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('task-assets')
    .upload(filePath, imageBlob, {
      contentType: 'image/png',
      upsert: false
    });

  if (uploadError) {
    console.error('Error uploading frame:', uploadError);
    throw uploadError;
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('task-assets')
    .getPublicUrl(filePath);

  return {
    url: publicUrl,
    path: filePath,
    frameId: frameData.id,
    frameName: frameData.name,
    width: frameData.width,
    height: frameData.height
  };
};

/**
 * Save Figma frame metadata to database
 */
export const saveFigmaFrames = async (versionId, frames) => {
  const { data, error } = await supabase
    .from('version_frames')
    .insert(
      frames.map((frame, index) => ({
        version_id: versionId,
        figma_node_id: frame.frameId,
        frame_name: frame.frameName,
        image_url: frame.url,
        storage_path: frame.path,
        width: frame.width,
        height: frame.height,
        order_index: index
      }))
    )
    .select();

  if (error) {
    console.error('Error saving frame metadata:', error);
    throw error;
  }

  return data;
};

/**
 * Get frames for a version
 */
export const getVersionFrames = async (versionId) => {
  const { data, error } = await supabase
    .from('version_frames')
    .select('*')
    .eq('version_id', versionId)
    .order('order_index', { ascending: true });

  if (error) {
    console.error('Error fetching version frames:', error);
    return { data: null, error };
  }

  return { data, error: null };
};

/**
 * Get Figma access token for the current user from database
 * Falls back to localStorage for backward compatibility
 * @param {string} teamMemberId - The team member's ID
 */
export const getFigmaAccessToken = async (teamMemberId = null) => {
  // First try to get from database if we have a team member ID
  if (teamMemberId) {
    try {
      const { data, error } = await supabase
        .from('team')
        .select('figma_access_token')
        .eq('id', teamMemberId)
        .single();

      if (!error && data?.figma_access_token) {
        // Also sync to localStorage for offline access
        localStorage.setItem('figma_access_token', data.figma_access_token);
        return data.figma_access_token;
      }
    } catch (e) {
      console.error('Error fetching Figma token from DB:', e);
    }
  }

  // Fallback to localStorage
  return localStorage.getItem('figma_access_token');
};

/**
 * Save Figma access token to database and localStorage
 * @param {string} token - The Figma access token
 * @param {string} teamMemberId - The team member's ID
 */
export const setFigmaAccessToken = async (token, teamMemberId = null) => {
  // Always save to localStorage for immediate use
  localStorage.setItem('figma_access_token', token);

  // Also save to database if we have a team member ID
  if (teamMemberId) {
    try {
      const { error } = await supabase
        .from('team')
        .update({ figma_access_token: token })
        .eq('id', teamMemberId);

      if (error) {
        console.error('Error saving Figma token to DB:', error);
      }
    } catch (e) {
      console.error('Error saving Figma token:', e);
    }
  }
};

/**
 * Clear Figma access token from database and localStorage
 * @param {string} teamMemberId - The team member's ID
 */
export const clearFigmaAccessToken = async (teamMemberId = null) => {
  localStorage.removeItem('figma_access_token');

  if (teamMemberId) {
    try {
      const { error } = await supabase
        .from('team')
        .update({ figma_access_token: null })
        .eq('id', teamMemberId);

      if (error) {
        console.error('Error clearing Figma token from DB:', error);
      }
    } catch (e) {
      console.error('Error clearing Figma token:', e);
    }
  }
};

/**
 * Complete import flow: fetch file, export selected frames, upload to storage
 */
export const importFigmaFrames = async (
  figmaUrl,
  selectedFrameIds,
  taskId,
  versionId,
  accessToken,
  onProgress
) => {
  try {
    const fileKey = extractFigmaFileKey(figmaUrl);
    if (!fileKey) {
      throw new Error('Invalid Figma URL');
    }

    onProgress?.({ stage: 'fetching', message: 'Fetching file metadata...' });

    // Get file data first to get frame metadata
    const fileData = await getFigmaFile(fileKey, accessToken);
    const allFrames = extractFramesFromFile(fileData);
    const selectedFrames = allFrames.filter(f => selectedFrameIds.includes(f.id));

    // Wait before making next API call to avoid rate limiting
    await sleep(1000);

    onProgress?.({ stage: 'exporting', message: 'Exporting frames from Figma...' });

    // Export frames as images (batch into groups of 10 to avoid rate limits)
    const imageUrls = {};
    const BATCH_SIZE = 10;

    for (let i = 0; i < selectedFrameIds.length; i += BATCH_SIZE) {
      const batchIds = selectedFrameIds.slice(i, i + BATCH_SIZE);
      const batchUrls = await exportFigmaFrames(fileKey, batchIds, accessToken);
      Object.assign(imageUrls, batchUrls);

      // Wait between batches if there are more batches to process
      if (i + BATCH_SIZE < selectedFrameIds.length) {
        await sleep(2000); // 2 second delay between batches
        onProgress?.({
          stage: 'exporting',
          message: `Exporting frames ${Math.min(i + BATCH_SIZE, selectedFrameIds.length)}/${selectedFrameIds.length}...`
        });
      }
    }

    onProgress?.({ stage: 'uploading', message: 'Uploading images...', total: selectedFrameIds.length });

    // Download and upload each frame
    const uploadedFrames = [];
    for (let i = 0; i < selectedFrameIds.length; i++) {
      const frameId = selectedFrameIds[i];
      const imageUrl = imageUrls[frameId];
      const frameData = selectedFrames.find(f => f.id === frameId);

      if (!imageUrl) {
        console.warn(`No image URL for frame ${frameId}`);
        continue;
      }

      onProgress?.({
        stage: 'uploading',
        message: `Uploading ${frameData?.name || 'frame'}...`,
        current: i + 1,
        total: selectedFrameIds.length
      });

      // Download image
      const response = await fetch(imageUrl);
      const blob = await response.blob();

      // Upload to storage
      const uploaded = await uploadFigmaFrame(taskId, versionId, frameData || { id: frameId }, blob);
      uploadedFrames.push(uploaded);

      // Small delay between frames to avoid rate limiting (not needed for last frame)
      if (i < selectedFrameIds.length - 1) {
        await sleep(300); // 300ms delay between frames
      }
    }

    onProgress?.({ stage: 'saving', message: 'Saving frame data...' });

    // Save frame metadata to database
    await saveFigmaFrames(versionId, uploadedFrames);

    onProgress?.({ stage: 'complete', message: 'Import complete!' });

    return uploadedFrames;
  } catch (error) {
    console.error('Error importing Figma frames:', error);
    throw error;
  }
};
