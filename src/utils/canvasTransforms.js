/**
 * Canvas coordinate transformation utilities
 * Handles percentage-based positioning that scales with zoom/pan
 */

/**
 * Convert canvas click coordinates to percentage-based position
 * @param {number} clickX - X coordinate of click relative to canvas
 * @param {number} clickY - Y coordinate of click relative to canvas
 * @param {number} canvasWidth - Current width of canvas container
 * @param {number} canvasHeight - Current height of canvas container
 * @returns {{x: number, y: number}} - Position as percentage (0-100)
 */
export const clickToPercentage = (clickX, clickY, canvasWidth, canvasHeight) => {
  if (!canvasWidth || !canvasHeight) {
    return { x: 50, y: 50 }; // Default to center if dimensions not available
  }

  const x = (clickX / canvasWidth) * 100;
  const y = (clickY / canvasHeight) * 100;

  // Clamp to 0-100 range
  return {
    x: Math.max(0, Math.min(100, x)),
    y: Math.max(0, Math.min(100, y))
  };
};

/**
 * Convert percentage-based position to pixel coordinates
 * @param {number} percentX - X position as percentage (0-100)
 * @param {number} percentY - Y position as percentage (0-100)
 * @param {number} canvasWidth - Current width of canvas container
 * @param {number} canvasHeight - Current height of canvas container
 * @returns {{x: number, y: number}} - Position in pixels
 */
export const percentageToPixels = (percentX, percentY, canvasWidth, canvasHeight) => {
  if (!canvasWidth || !canvasHeight) {
    return { x: 0, y: 0 };
  }

  return {
    x: (percentX / 100) * canvasWidth,
    y: (percentY / 100) * canvasHeight
  };
};

/**
 * Get relative click position within a container element
 * Accounts for container offset and scroll position
 * @param {MouseEvent} event - Click event
 * @param {HTMLElement} container - Container element
 * @returns {{x: number, y: number}} - Relative position in pixels
 */
export const getRelativePosition = (event, container) => {
  if (!container) {
    return { x: 0, y: 0 };
  }

  const rect = container.getBoundingClientRect();

  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
};

/**
 * Adjust pin position for zoom and pan transformations
 * @param {number} percentX - X position as percentage
 * @param {number} percentY - Y position as percentage
 * @param {number} canvasWidth - Current width of canvas
 * @param {number} canvasHeight - Current height of canvas
 * @param {number} scale - Current zoom scale (1 = 100%)
 * @param {{x: number, y: number}} pan - Current pan offset
 * @returns {{x: number, y: number}} - Adjusted pixel position
 */
export const adjustForTransform = (percentX, percentY, canvasWidth, canvasHeight, scale = 1, pan = { x: 0, y: 0 }) => {
  const basePosition = percentageToPixels(percentX, percentY, canvasWidth, canvasHeight);

  return {
    x: (basePosition.x * scale) + pan.x,
    y: (basePosition.y * scale) + pan.y
  };
};

/**
 * Device preview dimensions
 */
export const DEVICE_SIZES = {
  desktop: { width: '100%', height: '100%', label: 'Desktop' },
  tablet: { width: '768px', height: '1024px', label: 'Tablet' },
  mobile: { width: '375px', height: '667px', label: 'Mobile' }
};

/**
 * Check if an embed type supports device preview
 * @param {string} embedType - Type of embed (figma, website, etc.)
 * @returns {boolean}
 */
export const supportsDevicePreview = (embedType) => {
  return embedType === 'website' || embedType === 'link';
};

/**
 * Get appropriate iframe sandbox attributes
 * @param {string} embedType - Type of embed
 * @returns {string} - Space-separated sandbox attributes
 */
export const getIframeSandbox = (embedType) => {
  const basePermissions = 'allow-scripts allow-same-origin allow-popups allow-forms';

  switch (embedType) {
    case 'figma':
      return `${basePermissions} allow-presentation`;
    case 'youtube':
    case 'vimeo':
    case 'loom':
      return `${basePermissions} allow-presentation allow-fullscreen`;
    case 'website':
    case 'link':
      return `${basePermissions} allow-downloads allow-modals`;
    default:
      return basePermissions;
  }
};

/**
 * Format embed URL for iframe src
 * @param {string} url - Original embed URL
 * @param {string} embedType - Type of embed
 * @returns {string} - Formatted URL for iframe
 */
export const formatEmbedUrl = (url, embedType) => {
  if (!url) return '';

  switch (embedType) {
    case 'figma':
      // Ensure Figma URLs are in embed format
      if (url.includes('/file/')) {
        return url.replace('/file/', '/embed?embed_host=orchestra&url=');
      }
      return url;

    case 'youtube':
      const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
      if (youtubeMatch) {
        return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
      }
      return url;

    case 'vimeo':
      const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
      if (vimeoMatch) {
        return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
      }
      return url;

    case 'loom':
      const loomMatch = url.match(/loom\.com\/(share|embed)\/([a-zA-Z0-9]+)/);
      if (loomMatch) {
        return `https://www.loom.com/embed/${loomMatch[2]}`;
      }
      return url;

    default:
      return url;
  }
};

/**
 * Calculate canvas dimensions based on device preview mode
 * @param {string} device - Device mode (desktop, tablet, mobile)
 * @param {HTMLElement} container - Container element
 * @returns {{width: string|number, height: string|number}}
 */
export const getCanvasDimensions = (device, container) => {
  const deviceSize = DEVICE_SIZES[device] || DEVICE_SIZES.desktop;

  if (device === 'desktop') {
    // Use full container dimensions
    return {
      width: container?.clientWidth || '100%',
      height: container?.clientHeight || '100%'
    };
  }

  // Use fixed device dimensions
  return {
    width: parseInt(deviceSize.width),
    height: parseInt(deviceSize.height)
  };
};

/**
 * Debounce function for performance optimization
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} - Debounced function
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Clamp a value between min and max
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} - Clamped value
 */
export const clamp = (value, min, max) => {
  return Math.max(min, Math.min(max, value));
};

/**
 * Calculate zoom level that fits content to container
 * @param {number} contentWidth - Width of content
 * @param {number} contentHeight - Height of content
 * @param {number} containerWidth - Width of container
 * @param {number} containerHeight - Height of container
 * @param {number} padding - Padding in pixels (default: 20)
 * @returns {number} - Zoom scale to fit content
 */
export const calculateFitZoom = (contentWidth, contentHeight, containerWidth, containerHeight, padding = 20) => {
  const availableWidth = containerWidth - (padding * 2);
  const availableHeight = containerHeight - (padding * 2);

  const scaleX = availableWidth / contentWidth;
  const scaleY = availableHeight / contentHeight;

  // Use the smaller scale to ensure content fits both dimensions
  return Math.min(scaleX, scaleY, 1); // Max zoom is 1 (100%)
};
