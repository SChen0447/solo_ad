import React, { useState, useEffect, useRef, useCallback } from 'react';
import StrokeCanvas from './components/StrokeCanvas';
import ControlPanel from './components/ControlPanel';
import { hanziDatabase, getAllChars, getHanziByChar } from './data/hanziData';
import type { HanziData } from './data/hanziData';

const DEFAULT_CHAR = '永';
const DEFAULT_SPEED = 1;
const STROKE_DRAW_DURATION = 1000;
const BASE_INTERVAL = 1500;

type PlayPhase = 'drawing' | 'waiting';

const App: React.FC = () => {
  const allChars = getAllChars();
  const defaultHanzi = getHanziByChar(DEFAULT_CHAR) || hanziDatabase[0];

  const [currentChar, setCurrentChar] = useState<string>(DEFAULT_CHAR);
  const [hanziData, setHanziData] = useState<HanziData>(defaultHanzi);
  const [currentStrokeIndex, setCurrentStrokeIndex] = useState<number>(0);
  const [strokeProgress, setStrokeProgress] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(DEFAULT_SPEED);

  const rafRef = useRef<number | null>(null);
  const phaseRef = useRef<PlayPhase>('drawing');
  const phaseStartRef = useRef<number>(0);

  const totalStrokes = hanziData.strokeCount;

  const resetAnimation = useCallback(() => {
    phaseRef.current = 'drawing';
    phaseStartRef.current = performance.now();
  }, []);

  const stopAnimation = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const advanceToNextStroke = useCallback(() => {
    setCurrentStrokeIndex((prevIndex) => {
      const nextIndex = prevIndex + 1;
      if (nextIndex >= totalStrokes) {
        setIsPlaying(false);
        setStrokeProgress(0);
        return 0;
      }
      phaseRef.current = 'drawing';
      phaseStartRef.current = performance.now();
      setStrokeProgress(0);
      return nextIndex;
    });
  }, [totalStrokes]);

  const tick = useCallback(() => {
    const now = performance.now();
    const elapsed = now - phaseStartRef.current;
    const waitTime = Math.max(0, BASE_INTERVAL / speed - STROKE_DRAW_DURATION);

    if (phaseRef.current === 'drawing') {
      const progress = Math.min(1, elapsed / STROKE_DRAW_DURATION);
      setStrokeProgress(progress);

      if (elapsed >= STROKE_DRAW_DURATION) {
        if (waitTime <= 0) {
          advanceToNextStroke();
        } else {
          phaseRef.current = 'waiting';
          phaseStartRef.current = now;
        }
      }
    } else if (phaseRef.current === 'waiting') {
      if (elapsed >= waitTime) {
        advanceToNextStroke();
      }
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [speed, advanceToNextStroke]);

  useEffect(() => {
    if (isPlaying) {
      if (rafRef.current === null) {
        phaseStartRef.current = performance.now();
        rafRef.current = requestAnimationFrame(tick);
      }
    } else {
      stopAnimation();
    }

    return () => {
      stopAnimation();
    };
  }, [isPlaying, tick, stopAnimation]);

  const handleCharChange = useCallback((char: string) => {
    const data = getHanziByChar(char);
    if (!data) return;

    const wasPlaying = isPlaying;
    setIsPlaying(false);
    stopAnimation();

    setCurrentChar(char);
    setHanziData(data);
    setCurrentStrokeIndex(0);
    setStrokeProgress(0);
    resetAnimation();

    if (wasPlaying) {
      setTimeout(() => setIsPlaying(true), 50);
    }
  }, [isPlaying, stopAnimation, resetAnimation]);

  const handleTogglePlay = useCallback(() => {
    setIsPlaying((prev) => {
      if (!prev) {
        resetAnimation();
      }
      return !prev;
    });
  }, [resetAnimation]);

  const handleProgressChange = useCallback((index: number) => {
    setIsPlaying(false);
    stopAnimation();
    setCurrentStrokeIndex(index);
    setStrokeProgress(0);
    phaseRef.current = 'drawing';
  }, [stopAnimation]);

  const handleSpeedChange = useCallback((newSpeed: number) => {
    setSpeed(newSpeed);
  }, []);

  return (
    <div className="app-container">
      <h1 className="app-title">书法笔顺演示</h1>
      <StrokeCanvas
        hanziData={hanziData}
        currentStrokeIndex={currentStrokeIndex}
        strokeProgress={strokeProgress}
      />
      <ControlPanel
        chars={allChars}
        currentChar={currentChar}
        onCharChange={handleCharChange}
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
        currentStrokeIndex={currentStrokeIndex}
        totalStrokes={totalStrokes}
        onProgressChange={handleProgressChange}
        speed={speed}
        onSpeedChange={handleSpeedChange}
      />
    </div>
  );
};

export default App;
