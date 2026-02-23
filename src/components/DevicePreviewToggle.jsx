import React from 'react';
import { Monitor, Tablet, Smartphone } from 'lucide-react';
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
    { key: 'desktop', icon: Monitor, label: DEVICE_SIZES.desktop.label },
    { key: 'tablet', icon: Tablet, label: DEVICE_SIZES.tablet.label },
    { key: 'mobile', icon: Smartphone, label: DEVICE_SIZES.mobile.label }
  ];

  return (
    <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1">
      {devices.map(({ key, icon: Icon, label }) => (
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
          <Icon className="w-4 h-4" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
};

export default DevicePreviewToggle;
