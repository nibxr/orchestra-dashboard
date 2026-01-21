import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, File, Image, Video, Loader2 } from 'lucide-react';
import { uploadCommentAttachment, validateFile, formatFileSize, isImageFile, isVideoFile } from '../utils/fileUploadService';

/**
 * AttachmentUploader - File upload component with drag-and-drop
 */
const AttachmentUploader = ({ commentId, taskId, uploadedById, onUploadComplete }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState([]);

  const onDrop = useCallback(async (acceptedFiles) => {
    setUploading(true);
    const newProgress = acceptedFiles.map(file => ({
      name: file.name,
      status: 'uploading',
      progress: 0
    }));
    setUploadProgress(newProgress);

    // Upload files sequentially
    for (let i = 0; i < acceptedFiles.length; i++) {
      const file = acceptedFiles[i];

      // Validate file
      const validation = validateFile(file);
      if (!validation.valid) {
        setUploadProgress(prev => prev.map((p, idx) =>
          idx === i ? { ...p, status: 'error', error: validation.error } : p
        ));
        continue;
      }

      try {
        const { data, error } = await uploadCommentAttachment(file, commentId, taskId, uploadedById);

        if (error) {
          setUploadProgress(prev => prev.map((p, idx) =>
            idx === i ? { ...p, status: 'error', error: error.message } : p
          ));
        } else {
          setUploadProgress(prev => prev.map((p, idx) =>
            idx === i ? { ...p, status: 'complete', data } : p
          ));

          // Notify parent component
          if (onUploadComplete) {
            onUploadComplete(data);
          }
        }
      } catch (err) {
        setUploadProgress(prev => prev.map((p, idx) =>
          idx === i ? { ...p, status: 'error', error: err.message } : p
        ));
      }
    }

    setUploading(false);

    // Clear progress after 2 seconds if all successful
    setTimeout(() => {
      setUploadProgress(prev => prev.filter(p => p.status === 'error'));
    }, 2000);
  }, [commentId, taskId, uploadedById, onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: uploading,
    maxSize: 10485760, // 10MB
    multiple: true
  });

  const getFileIcon = (fileName) => {
    const ext = fileName.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) {
      return <Image className="w-4 h-4" />;
    }
    if (['mp4', 'mov', 'avi', 'webm'].includes(ext)) {
      return <Video className="w-4 h-4" />;
    }
    return <File className="w-4 h-4" />;
  };

  return (
    <div className="space-y-2">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors
          ${isDragActive
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600'
          }
          ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        <Upload className="w-6 h-6 mx-auto mb-2 text-neutral-400" />
        {isDragActive ? (
          <p className="text-sm text-blue-600 dark:text-blue-400">Drop files here...</p>
        ) : (
          <div className="text-sm text-neutral-600 dark:text-neutral-400">
            <p className="font-medium">Click to upload or drag and drop</p>
            <p className="text-xs mt-1">Max file size: 10MB</p>
          </div>
        )}
      </div>

      {/* Upload Progress */}
      {uploadProgress.length > 0 && (
        <div className="space-y-2">
          {uploadProgress.map((progress, index) => (
            <div
              key={index}
              className="flex items-center gap-2 p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800"
            >
              {/* File Icon */}
              <div className="text-neutral-500">
                {progress.status === 'uploading' && <Loader2 className="w-4 h-4 animate-spin" />}
                {progress.status === 'complete' && getFileIcon(progress.name)}
                {progress.status === 'error' && <X className="w-4 h-4 text-red-500" />}
              </div>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-neutral-900 dark:text-white truncate">
                  {progress.name}
                </p>
                {progress.status === 'error' && (
                  <p className="text-xs text-red-500 mt-0.5">{progress.error}</p>
                )}
                {progress.status === 'complete' && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">Uploaded</p>
                )}
              </div>

              {/* Status */}
              {progress.status === 'complete' && (
                <div className="text-green-500">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * AttachmentList - Display list of uploaded attachments
 */
export const AttachmentList = ({ attachments = [], onDelete, canDelete = false }) => {
  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="mt-2 space-y-2">
      {attachments.map((attachment) => {
        const isImage = isImageFile(attachment.file_type);
        const isVideo = isVideoFile(attachment.file_type);

        return (
          <div
            key={attachment.id}
            className="flex items-start gap-2 p-2 rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700"
          >
            {/* Preview or Icon */}
            <div className="flex-shrink-0 w-12 h-12 rounded overflow-hidden bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center">
              {isImage ? (
                <img
                  src={attachment.file_url}
                  alt={attachment.file_name}
                  className="w-full h-full object-cover"
                />
              ) : isVideo ? (
                <Video className="w-6 h-6 text-neutral-400" />
              ) : (
                <File className="w-6 h-6 text-neutral-400" />
              )}
            </div>

            {/* File Info */}
            <div className="flex-1 min-w-0">
              <a
                href={attachment.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline truncate block"
              >
                {attachment.file_name}
              </a>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                {formatFileSize(attachment.file_size)}
              </p>
            </div>

            {/* Delete Button */}
            {canDelete && onDelete && (
              <button
                onClick={() => onDelete(attachment.id, attachment.file_url)}
                className="flex-shrink-0 p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-500 hover:text-red-600 transition-colors"
                title="Delete attachment"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default AttachmentUploader;
