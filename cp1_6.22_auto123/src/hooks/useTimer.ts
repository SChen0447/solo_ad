import { useEffect, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { FOCUS_DURATION } from '@/types';

export const useTimer = () => {
  const { timer, tick, completeFocusSession, setShowRestModal, setCurrentAction, startRestPhase } =
    useAppStore();
  const intervalRef = useRef<number | null>(null);
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    if (timer.isRunning) {
      intervalRef.current = window.setInterval(() => {
        tick();
      }, 100);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [timer.isRunning, tick]);

  useEffect(() => {
    if (timer.timeRemaining <= 0 && !hasTriggeredRef.current) {
      hasTriggeredRef.current = true;

      if (timer.phase === 'focus') {
        completeFocusSession();
        setCurrentAction('headTurn');
        setShowRestModal(true);
      } else if (timer.phase === 'rest') {
        useAppStore.setState({
          timer: {
            phase: 'focus',
            isRunning: false,
            timeRemaining: FOCUS_DURATION,
            duration: FOCUS_DURATION,
          },
        });
      }
    }

    if (timer.timeRemaining > 0) {
      hasTriggeredRef.current = false;
    }
  }, [timer.timeRemaining, timer.phase, completeFocusSession, setCurrentAction, setShowRestModal]);

  const progress = timer.duration > 0 ? (1 - timer.timeRemaining / timer.duration) * 100 : 0;

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    timer,
    progress,
    formattedTime: formatTime(timer.timeRemaining),
    startTimer: useAppStore.getState().startTimer,
    pauseTimer: useAppStore.getState().pauseTimer,
    resetTimer: useAppStore.getState().resetTimer,
    startRestPhase,
  };
};
