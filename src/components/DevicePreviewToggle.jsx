import React from 'react';
import { Icon } from './Icon';
import { DEVICE_SIZES } from '../utils/canvasTransforms';

/**
 * DevicePreviewToggle - Toggle between device preview modes
 * Only visible for website embeds
 */
const DevicePreviewToggle = ({ currentDevice, onDeviceChange, embedType }) => {
  // Only show for website/link embeds
  if (embedType !== 'website' && embedType !== 'link') {
    return null;
  }

  const devices = [
    { key: 'desktop', iconName: 'computer', label: DEVICE_SIZES.desktop.label },
    { key: 'tablet', iconName: 'iphone-02', label: DEVICE_SIZES.tablet.label },
    { key: 'mobile', iconName: 'phone', label: DEVICE_SIZES.mobile.label }
  ];

  return (
    <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1">
      {devices.map(({ key, iconName, label }) => (
        <button
          key={key}
          onClick={() => onDeviceChange(key)}
          className={`
            flex items-center gap-2 px-3 py-1.5 rounded-md transition-all text-sm
            ${currentDevice === key
              ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }
          `}
          title={label}
        >
          <Icon name={iconName} size={16} />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
};

export default DevicePreviewToggle;
