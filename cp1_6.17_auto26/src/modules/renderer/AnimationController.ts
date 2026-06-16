import { useEffect, useRef, useCallback } from 'react';

export interface AnimationState {
  progress: number;
  currentArcIndex: number;
  currentArcProgress: number;
  isPlaying: boolean;
}

export interface AnimationControllerOptions {
  speed?: number;
  totalArcs: number;
  onProgressChange?: (state: AnimationState) => void;
}

export function createAnimationState(): AnimationState {
  return {
    progress: 0,
    currentArcIndex: 0,
    currentArcProgress: 0,
    isPlaying: false,
  };
}

export function useAnimationController(options: {
  totalArcs: number;
  speed?: number;
  onProgressChange?: (state: AnimationState) => void;
}) {
  const { totalArcs, speed = 0.15, onProgressChange } = options;
  const stateRef = useRef<AnimationState>(createAnimationState());
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const manualProgressRef = useRef<boolean>(false);

  const updateStateFromProgress = useCallback((progress: number) => {
    const clamped = Math.max(0, Math.min(1, progress));
    if (totalArcs <= 0) {
      stateRef.current = {
        progress: clamped,
        currentArcIndex: 0,
        currentArcProgress: 0,
        isPlaying: stateRef.current.isPlaying,
      };
      return;
    }
    const totalSteps = totalArcs;
    const scaledProgress = clamped * totalSteps;
    const currentArcIndex = Math.min(Math.floor(scaledProgress), totalArcs - 1);
    const currentArcProgress = scaledProgress - currentArcIndex;
    
    stateRef.current = {
      ...stateRef.current,
      progress: clamped,
      currentArcIndex,
      currentArcProgress,
    };
  }, [totalArcs]);

  const animate = useCallback((timestamp: number) => {
    if (!lastTimeRef.current) {
      lastTimeRef.current = timestamp;
    }
    const delta = (timestamp - lastTimeRef.current) / 1000;
    lastTimeRef.current = timestamp;

    if (stateRef.current.isPlaying && !manualProgressRef.current) {
      const newProgress = stateRef.current.progress + delta * speed;
      if (newProgress >= 1) {
        updateStateFromProgress(1);
        stateRef.current.isPlaying = false;
      } else {
        updateStateFromProgress(newProgress);
      }
      onProgressChange?.(stateRef.current);
    }
    
    if (stateRef.current.isPlaying || manualProgressRef.current) {
      animationFrameRef.current = requestAnimationFrame(animate);
    }
  }, [speed, updateStateFromProgress, onProgressChange]);

  useEffect(() => {
    if (stateRef.current.isPlaying) {
      lastTimeRef.current = 0;
      animationFrameRef.current = requestAnimationFrame(animate);
    }
    return () => {
      if (animationFrameRef.current != null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [animate]);

  useEffect(() => {
    updateStateFromProgress(stateRef.current.progress);
  }, [totalArcs, updateStateFromProgress]);

  const play = useCallback(() => {
    if (stateRef.current.progress >= 1) {
      updateStateFromProgress(0);
    }
    stateRef.current.isPlaying = true;
    lastTimeRef.current = 0;
    if (animationFrameRef.current == null) {
      animationFrameRef.current = requestAnimationFrame(animate);
    }
    onProgressChange?.(stateRef.current);
  }, [updateStateFromProgress, animate, onProgressChange]);

  const pause = useCallback(() => {
    stateRef.current.isPlaying = false;
    onProgressChange?.(stateRef.current);
  }, [onProgressChange]);

  const reset = useCallback(() => {
    stateRef.current.isPlaying = false;
    updateStateFromProgress(0);
    onProgressChange?.(stateRef.current);
  }, [updateStateFromProgress, onProgressChange]);

  const setProgress = useCallback((progress: number) => {
    manualProgressRef.current = true;
    updateStateFromProgress(progress);
    requestAnimationFrame(() => {
      manualProgressRef.current = false;
    });
    onProgressChange?.(stateRef.current);
  }, [updateStateFromProgress, onProgressChange]);

  const getState = useCallback((): AnimationState => {
    return { ...stateRef.current };
  }, []);

  return {
    play,
    pause,
    reset,
    setProgress,
    getState,
  };
}

export type AnimationController = ReturnType<typeof useAnimationController>;
