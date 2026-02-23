import React, { useState, useRef, useEffect } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { Loader2 } from 'lucide-react';
import CanvasControls from './CanvasControls';
import CommentPinsOverlay from './CommentPinsOverlay';
import { formatEmbedUrl, DEVICE_SIZES } from '../utils/canvasTransforms';

/**
 * DesignCanvas - Main canvas area with pan/zoom and embedded content
 * Displays Figma/website embeds with comment pins overlay
 */
const DesignCanvas = ({
  version,
  comments = [],
  canvasMode,
  onCanvasModeChange,
  devicePreview,
  onDeviceChange,
  activeCommentId,
  highlightedPinId,
  onCanvasClick,
  onPinClick,
  onPinResolve,
  canvasRef
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [currentZoom, setCurrentZoom] = useState(1);
  const transformRef = useRef(null);

  useEffect(() => {
    setIsLoading(true);
  }, [version?.id]);

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleZoomIn = () => {
    if (transformRef.current) {
      transformRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (transformRef.current) {
      transformRef.current.zoomOut();
    }
  };

  const handleFitToScreen = () => {
    if (transformRef.current) {
      transformRef.current.resetTransform();
    }
  };

  const handleTransform = (ref) => {
    setCurrentZoom(ref.state.scale);
  };

  // Handle canvas click for pin placement
  const handleClick = (e) => {
    if (canvasMode === 'comment') {
      onCanvasClick && onCanvasClick(e);
    }
  };

  if (!version) {
    return (
      <div className="flex-1 flex flex-col">
        <CanvasControls
          canvasMode={canvasMode}
          onCanvasModeChange={onCanvasModeChange}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onFitToScreen={handleFitToScreen}
          devicePreview={devicePreview}
          onDeviceChange={onDeviceChange}
          embedType=""
          currentZoom={currentZoom}
        />
        <div className="flex-1 flex items-center justify-center bg-neutral-50 dark:bg-neutral-900">
          <div className="text-center">
            <p className="text-neutral-500 dark:text-neutral-400 mb-2">No version selected</p>
            <p className="text-sm text-neutral-400 dark:text-neutral-500">
              Add a version to start collaborating
            </p>
          </div>
        </div>
      </div>
    );
  }

  const embedUrl = formatEmbedUrl(version.embed_url, version.embed_type);
  const deviceSize = DEVICE_SIZES[devicePreview] || DEVICE_SIZES.desktop;

  // Cursor style based on canvas mode
  const getCursorClass = () => {
    switch (canvasMode) {
      case 'comment':
        return 'cursor-crosshair';
      case 'move':
        return 'cursor-move';
      default:
        return 'cursor-default';
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Canvas Controls */}
      <CanvasControls
        canvasMode={canvasMode}
        onCanvasModeChange={onCanvasModeChange}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFitToScreen={handleFitToScreen}
        devicePreview={devicePreview}
        onDeviceChange={onDeviceChange}
        embedType={version.embed_type}
        currentZoom={currentZoom}
      />

      {/* Canvas Area */}
      <div className="flex-1 relative bg-neutral-50 dark:bg-neutral-900 overflow-hidden">
        <TransformWrapper
          ref={transformRef}
          initialScale={1}
          minScale={0.5}
          maxScale={2}
          disabled={canvasMode === 'comment'}
          onTransformed={handleTransform}
          doubleClick={{ disabled: true }}
          wheel={{ step: 0.1 }}
        >
          <TransformComponent
            wrapperClass="w-full h-full"
            contentClass={`w-full h-full flex items-center justify-center ${getCursorClass()}`}
          >
            <div
              ref={canvasRef}
              className="relative bg-white dark:bg-neutral-800 shadow-xl"
              style={{
                width: deviceSize.width,
                height: deviceSize.height,
                maxWidth: '100%',
                maxHeight: '100%'
              }}
              onClick={handleClick}
            >
              {/* Loading Indicator */}
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-neutral-800 z-20">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-neutral-400 mx-auto mb-2" />
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      Loading embed...
                    </p>
                  </div>
                </div>
              )}

              {/* Embed Iframe */}
              <iframe
                src={embedUrl}
                className="w-full h-full border-0"
                title={`${version.version_name || 'Version'} - ${version.embed_type}`}
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                onLoad={handleIframeLoad}
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation"
              />

              {/* Comment Pins Overlay */}
              {!isLoading && (
                <CommentPinsOverlay
                  comments={comments}
                  activeCommentId={activeCommentId}
                  highlightedPinId={highlightedPinId}
                  onPinClick={onPinClick}
                  onPinResolve={onPinResolve}
                />
              )}
            </div>
          </TransformComponent>
        </TransformWrapper>
      </div>
    </div>
  );
};

export default DesignCanvas;
