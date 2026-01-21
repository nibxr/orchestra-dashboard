import { useState, useCallback, useRef } from 'react';
import { clickToPercentage, getRelativePosition } from '../utils/canvasTransforms';
import { supabase } from '../supabaseClient';

/**
 * Custom hook for managing canvas comment placement and interactions
 */
export const useCanvasComments = (versionId, onCommentAdded) => {
  const [isPlacingPin, setIsPlacingPin] = useState(false);
  const [pendingPinPosition, setPendingPinPosition] = useState(null);
  const canvasRef = useRef(null);

  /**
   * Handle canvas click to place comment pin
   */
  const handleCanvasClick = useCallback((event) => {
    if (!isPlacingPin || !canvasRef.current) return;

    // Get click position relative to canvas
    const relativePos = getRelativePosition(event, canvasRef.current);
    const rect = canvasRef.current.getBoundingClientRect();

    // Convert to percentage
    const position = clickToPercentage(
      relativePos.x,
      relativePos.y,
      rect.width,
      rect.height
    );

    // Set pending position and open comment composer
    setPendingPinPosition(position);

    // Exit pin placement mode
    setIsPlacingPin(false);

    return position;
  }, [isPlacingPin]);

  /**
   * Create a positioned comment
   */
  const createPositionedComment = useCallback(async (commentData) => {
    if (!pendingPinPosition || !versionId) {
      console.error('Missing position or version ID');
      return { data: null, error: { message: 'Missing required data' } };
    }

    const { data, error } = await supabase
      .from('comments')
      .insert({
        ...commentData,
        version_id: versionId,
        position_x: pendingPinPosition.x,
        position_y: pendingPinPosition.y
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating positioned comment:', error);
      return { data: null, error };
    }

    // Clear pending position
    setPendingPinPosition(null);

    // Notify parent
    if (onCommentAdded) {
      onCommentAdded(data);
    }

    return { data, error: null };
  }, [pendingPinPosition, versionId, onCommentAdded]);

  /**
   * Start pin placement mode
   */
  const startPinPlacement = useCallback(() => {
    setIsPlacingPin(true);
    setPendingPinPosition(null);
  }, []);

  /**
   * Cancel pin placement
   */
  const cancelPinPlacement = useCallback(() => {
    setIsPlacingPin(false);
    setPendingPinPosition(null);
  }, []);

  /**
   * Resolve a comment
   */
  const resolveComment = useCallback(async (commentId) => {
    const { data, error } = await supabase
      .from('comments')
      .update({
        is_resolved: true,
        resolved_at: new Date().toISOString()
      })
      .eq('id', commentId)
      .select()
      .single();

    if (error) {
      console.error('Error resolving comment:', error);
      return { data: null, error };
    }

    return { data, error: null };
  }, []);

  /**
   * Unresolve a comment
   */
  const unresolveComment = useCallback(async (commentId) => {
    const { data, error } = await supabase
      .from('comments')
      .update({
        is_resolved: false,
        resolved_at: null,
        resolved_by_id: null
      })
      .eq('id', commentId)
      .select()
      .single();

    if (error) {
      console.error('Error unresolving comment:', error);
      return { data: null, error };
    }

    return { data, error: null };
  }, []);

  return {
    canvasRef,
    isPlacingPin,
    pendingPinPosition,
    handleCanvasClick,
    startPinPlacement,
    cancelPinPlacement,
    createPositionedComment,
    resolveComment,
    unresolveComment
  };
};

export default useCanvasComments;
