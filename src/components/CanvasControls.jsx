import React from 'react';
import { MousePointer, MessageSquare, Hand, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import DevicePreviewToggle from './DevicePreviewToggle';

/**
 * CanvasControls - Top toolbar for canvas interactions
 * Includes mode toggle, zoom controls, and device preview
 */
const CanvasControls = ({
  canvasMode,
  onCanvasModeChange,
  onZoomIn,
  onZoomOut,
  onFitToScreen,
  devicePreview,
  onDeviceChange,
  embedType,
  currentZoom = 1
}) => {
  const canvasModes = [
    { key: 'view', icon: MousePointer, label: 'View', tooltip: 'Navigate and select' },
    { key: 'comment', icon: MessageSquare, label: 'Comment', tooltip: 'Click to add comment' },
    { key: 'move', icon: Hand, label: 'Pan', tooltip: 'Pan canvas' }
  ];

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700">
      {/* Left: Canvas Mode Toggle */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1">
          {canvasModes.map(({ key, icon: Icon, label, tooltip }) => (
            <button
              key={key}
              onClick={() => onCanvasModeChange(key)}
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded-md transition-all text-sm
                ${canvasMode === key
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }
              `}
              title={tooltip}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {canvasMode === 'comment' && (
          <span className="text-xs text-neutral-500 dark:text-neutral-400 ml-2">
            Click on canvas to place comment pin
          </span>
        )}
      </div>

      {/* Right: Zoom Controls & Device Preview */}
      <div className="flex items-center gap-3">
        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={onZoomOut}
            className="p-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 transition-colors"
            title="Zoom out"
            disabled={currentZoom <= 0.5}
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <span className="text-sm text-neutral-600 dark:text-neutral-400 min-w-[3rem] text-center">
            {Math.round(currentZoom * 100)}%
          </span>

          <button
            onClick={onZoomIn}
            className="p-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 transition-colors"
            title="Zoom in"
            disabled={currentZoom >= 2}
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <button
            onClick={onFitToScreen}
            className="p-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 transition-colors"
            title="Fit to screen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {/* Device Preview Toggle */}
        <DevicePreviewToggle
          currentDevice={devicePreview}
          onDeviceChange={onDeviceChange}
          embedType={embedType}
        />
      </div>
    </div>
  );
};

export default CanvasControls;
