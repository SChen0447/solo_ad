import React, { useState, useEffect, useRef, useCallback } from 'react';
import StrokeCanvas from './components/StrokeCanvas';
import ControlPanel from './components/ControlPanel';
import { hanziDatabase, getAllChars, getHanziByChar } from './data/hanziData';
import type { HanziData } from './data/hanziData';

const DEFAULT_CHAR = '永';
const DEFAULT_SPEED = 1;
const BASE_DRAW_DURATION = 1000;
const BASE_PAUSE_DURATION = 500;

type PlayPhase = 'drawing' | 'pausing';

const App: React.FC = () => {
  const allChars = getAllChars();
  const defaultHanzi = getHanziByChar(DEFAULT_CHAR) || hanziDatabase[0];

  const [currentChar, setCurrentChar] = useState<string>(DEFAULT_CHAR);
  const [hanziData, setHanziData] = useState<HanziData>(defaultHanzi);
  const [currentStrokeIndex, setCurrentStrokeIndex] = useState<number>(0);
  const [strokeProgress, setStrokeProgress] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(DEFAULT_SPEED);

  const rafRef = useRef<number | null>(null);
  const phaseRef = useRef<PlayPhase>('drawing');
  const phaseStartRef = useRef<number>(0);
  const speedRef = useRef<number>(speed);
  speedRef.current = speed;

  const totalStrokes = hanziData.strokeCount;

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
        setStrokeProgress(1);
        return 0;
      }
      phaseRef.current = 'drawing';
      phaseStartRef.current = performance.now();
      setStrokeProgress(0);
      return nextIndex;
    });
  }, [totalStrokes]);

  const tick = useCallback(() => {
    const currentSpeed = speedRef.current;
    const now = performance.now();
    const elapsed = now - phaseStartRef.current;

    if (phaseRef.current === 'drawing') {
      const drawDuration = BASE_DRAW_DURATION / currentSpeed;
      const progress = Math.min(1, elapsed / drawDuration);
      setStrokeProgress(progress);

      if (progress >= 1) {
        phaseRef.current = 'pausing';
        phaseStartRef.current = now;
      }
    } else if (phaseRef.current === 'pausing') {
      const pauseDuration = BASE_PAUSE_DURATION / currentSpeed;
      if (elapsed >= pauseDuration) {
        advanceToNextStroke();
      }
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [advanceToNextStroke]);

  useEffect(() => {
    if (isPlaying) {
      if (rafRef.current === null) {
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

    setIsPlaying(false);
    stopAnimation();

    setCurrentChar(char);
    setHanziData(data);
    setCurrentStrokeIndex(0);
    setStrokeProgress(1);
  }, [stopAnimation]);

  const handleTogglePlay = useCallback(() => {
    if (!isPlaying) {
      if (strokeProgress >= 1) {
        setStrokeProgress(0);
        phaseRef.current = 'drawing';
        phaseStartRef.current = performance.now();
      } else {
        const drawDuration = BASE_DRAW_DURATION / speed;
        phaseRef.current = 'drawing';
        phaseStartRef.current = performance.now() - strokeProgress * drawDuration;
      }
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }
  }, [isPlaying, strokeProgress, speed]);

  const handleProgressChange = useCallback((index: number) => {
    setIsPlaying(false);
    stopAnimation();
    setCurrentStrokeIndex(index);
    setStrokeProgress(1);
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
