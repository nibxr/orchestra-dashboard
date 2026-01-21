import { supabase } from '../supabaseClient';

const STORAGE_BUCKET = 'comment-attachments';

/**
 * Initialize the comment attachments storage bucket
 * This should be called once during app initialization
 */
export const initializeStorage = async () => {
  try {
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      console.error('Error listing buckets:', listError);
      return;
    }

    const bucketExists = buckets.some(bucket => bucket.name === STORAGE_BUCKET);

    if (!bucketExists) {
      const { data, error } = await supabase.storage.createBucket(STORAGE_BUCKET, {
        public: true,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: [
          'image/*',
          'video/*',
          'application/pdf',
          'application/zip',
          'text/*'
        ]
      });

      if (error) {
        console.error('Error creating storage bucket:', error);
      } else {
        console.log('Comment attachments bucket created successfully');
      }
    }
  } catch (error) {
    console.error('Error initializing storage:', error);
  }
};

/**
 * Generate a unique file name
 * @param {string} taskId - Task ID
 * @param {string} commentId - Comment ID
 * @param {string} originalFileName - Original file name
 * @returns {string} - Unique file path
 */
const generateFileName = (taskId, commentId, originalFileName) => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  const extension = originalFileName.split('.').pop();
  return `${taskId}/${commentId}/${timestamp}-${random}.${extension}`;
};

/**
 * Upload a file attachment for a comment
 * @param {File} file - File to upload
 * @param {string} commentId - Comment ID
 * @param {string} taskId - Task ID
 * @param {string} uploadedById - User ID uploading the file
 * @returns {Promise<{data: object | null, error: object | null}>}
 */
export const uploadCommentAttachment = async (file, commentId, taskId, uploadedById) => {
  try {
    // Validate file size (10MB limit)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      return {
        data: null,
        error: { message: 'File size exceeds 10MB limit' }
      };
    }

    // Generate unique file name
    const fileName = generateFileName(taskId, commentId, file.name);

    // Upload file to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      return { data: null, error: uploadError };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(fileName);

    const publicUrl = urlData.publicUrl;

    // Save attachment metadata to database
    const { data: attachmentData, error: dbError } = await supabase
      .from('comment_attachments')
      .insert({
        comment_id: commentId,
        file_url: publicUrl,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        uploaded_by_id: uploadedById
      })
      .select()
      .single();

    if (dbError) {
      console.error('Error saving attachment metadata:', dbError);
      // Try to delete the uploaded file since DB insert failed
      await supabase.storage.from(STORAGE_BUCKET).remove([fileName]);
      return { data: null, error: dbError };
    }

    return {
      data: {
        ...attachmentData,
        storageKey: fileName
      },
      error: null
    };
  } catch (error) {
    console.error('Unexpected error uploading attachment:', error);
    return {
      data: null,
      error: { message: error.message || 'Failed to upload attachment' }
    };
  }
};

/**
 * Upload multiple files
 * @param {File[]} files - Array of files to upload
 * @param {string} commentId - Comment ID
 * @param {string} taskId - Task ID
 * @param {string} uploadedById - User ID
 * @returns {Promise<{successes: Array, failures: Array}>}
 */
export const uploadMultipleAttachments = async (files, commentId, taskId, uploadedById) => {
  const results = {
    successes: [],
    failures: []
  };

  for (const file of files) {
    const { data, error } = await uploadCommentAttachment(file, commentId, taskId, uploadedById);

    if (error) {
      results.failures.push({ file: file.name, error });
    } else {
      results.successes.push(data);
    }
  }

  return results;
};

/**
 * Delete an attachment
 * @param {string} attachmentId - Attachment ID
 * @param {string} fileUrl - File URL to delete from storage
 * @returns {Promise<{error: object | null}>}
 */
export const deleteAttachment = async (attachmentId, fileUrl) => {
  try {
    // Extract file path from URL
    const urlParts = fileUrl.split(`/${STORAGE_BUCKET}/`);
    if (urlParts.length < 2) {
      return { error: { message: 'Invalid file URL' } };
    }
    const filePath = urlParts[1];

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([filePath]);

    if (storageError) {
      console.error('Error deleting file from storage:', storageError);
    }

    // Delete metadata from database
    const { error: dbError } = await supabase
      .from('comment_attachments')
      .delete()
      .eq('id', attachmentId);

    if (dbError) {
      console.error('Error deleting attachment metadata:', dbError);
      return { error: dbError };
    }

    return { error: null };
  } catch (error) {
    console.error('Unexpected error deleting attachment:', error);
    return { error: { message: error.message || 'Failed to delete attachment' } };
  }
};

/**
 * Get attachments for a comment
 * @param {string} commentId - Comment ID
 * @returns {Promise<{data: Array | null, error: object | null}>}
 */
export const getCommentAttachments = async (commentId) => {
  const { data, error } = await supabase
    .from('comment_attachments')
    .select('*')
    .eq('comment_id', commentId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching attachments:', error);
    return { data: null, error };
  }

  return { data, error: null };
};

/**
 * Check if a file type is an image
 * @param {string} fileType - MIME type
 * @returns {boolean}
 */
export const isImageFile = (fileType) => {
  return fileType?.startsWith('image/');
};

/**
 * Check if a file type is a video
 * @param {string} fileType - MIME type
 * @returns {boolean}
 */
export const isVideoFile = (fileType) => {
  return fileType?.startsWith('video/');
};

/**
 * Format file size for display
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted file size
 */
export const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

/**
 * Get file icon based on file type
 * @param {string} fileType - MIME type
 * @returns {string} - Icon name (for lucide-react)
 */
export const getFileIcon = (fileType) => {
  if (!fileType) return 'file';

  if (fileType.startsWith('image/')) return 'image';
  if (fileType.startsWith('video/')) return 'video';
  if (fileType.startsWith('audio/')) return 'music';
  if (fileType.includes('pdf')) return 'file-text';
  if (fileType.includes('zip') || fileType.includes('rar')) return 'archive';
  if (fileType.includes('word') || fileType.includes('document')) return 'file-text';
  if (fileType.includes('sheet') || fileType.includes('excel')) return 'table';
  if (fileType.includes('presentation') || fileType.includes('powerpoint')) return 'presentation';

  return 'file';
};

/**
 * Validate file before upload
 * @param {File} file - File to validate
 * @param {number} maxSize - Maximum file size in bytes (default: 10MB)
 * @param {string[]} allowedTypes - Allowed MIME types (default: all)
 * @returns {{valid: boolean, error: string | null}}
 */
export const validateFile = (file, maxSize = 10485760, allowedTypes = null) => {
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds ${formatFileSize(maxSize)} limit`
    };
  }

  if (allowedTypes && allowedTypes.length > 0) {
    const isAllowed = allowedTypes.some(type => {
      if (type.endsWith('/*')) {
        const prefix = type.split('/')[0];
        return file.type.startsWith(`${prefix}/`);
      }
      return file.type === type;
    });

    if (!isAllowed) {
      return {
        valid: false,
        error: `File type "${file.type}" is not allowed`
      };
    }
  }

  return { valid: true, error: null };
};
