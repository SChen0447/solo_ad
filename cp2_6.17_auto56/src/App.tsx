import { useState, useEffect, useRef, useCallback } from 'react';
import { StrokeCanvas } from './components/StrokeCanvas';
import { ControlPanel } from './components/ControlPanel';
import { hanziDataList, getHanziData } from './data/hanziData';

const STROKE_DRAW_DURATION = 1000;
const BASE_INTERVAL = 1500;

export default function App() {
  const [currentChar, setCurrentChar] = useState<string>('永');
  const [currentStrokeIndex, setCurrentStrokeIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playSpeed, setPlaySpeed] = useState<number>(1);
  const [strokeProgress, setStrokeProgress] = useState<number>(0);

  const hanziData = getHanziData(currentChar);
  const totalStrokes = hanziData?.strokeCount ?? 0;
  const hanziList = hanziDataList.map((h) => h.character);

  const animFrameRef = useRef<number>(0);
  const strokeStartTimeRef = useRef<number>(0);
  const waitingRef = useRef<boolean>(false);
  const waitStartTimeRef = useRef<number>(0);

  const animate = useCallback((timestamp: number) => {
    if (!hanziData) return;

    if (waitingRef.current) {
      const waitDuration = (BASE_INTERVAL - STROKE_DRAW_DURATION) / playSpeed;
      if (timestamp - waitStartTimeRef.current >= waitDuration) {
        waitingRef.current = false;
        if (currentStrokeIndex >= hanziData.strokeCount - 1) {
          setCurrentStrokeIndex(0);
          setStrokeProgress(0);
          setIsPlaying(false);
          return;
        } else {
          setCurrentStrokeIndex((prev) => prev + 1);
          strokeStartTimeRef.current = timestamp;
        }
      }
    } else {
      const elapsed = timestamp - strokeStartTimeRef.current;
      const progress = Math.min(1, elapsed / STROKE_DRAW_DURATION);
      setStrokeProgress(progress);

      if (progress >= 1) {
        waitingRef.current = true;
        waitStartTimeRef.current = timestamp;
      }
    }

    animFrameRef.current = requestAnimationFrame(animate);
  }, [hanziData, currentStrokeIndex, playSpeed]);

  useEffect(() => {
    if (isPlaying && hanziData) {
      strokeStartTimeRef.current = performance.now();
      waitingRef.current = false;
      setStrokeProgress(0);
      animFrameRef.current = requestAnimationFrame(animate);
    } else {
      cancelAnimationFrame(animFrameRef.current);
    }

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, hanziData, animate]);

  useEffect(() => {
    if (!isPlaying) {
      setStrokeProgress(0);
    }
  }, [isPlaying, currentStrokeIndex]);

  const handleCharChange = (char: string) => {
    setCurrentChar(char);
    setCurrentStrokeIndex(0);
    setStrokeProgress(0);
    setIsPlaying(false);
  };

  const handleTogglePlay = () => {
    setIsPlaying((prev) => !prev);
  };

  const handleProgressChange = (index: number) => {
    setIsPlaying(false);
    setCurrentStrokeIndex(index);
    setStrokeProgress(0);
  };

  const handleSpeedChange = (speed: number) => {
    setPlaySpeed(speed);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '20px',
        gap: '24px',
        backgroundColor: '#faf0dc',
        boxSizing: 'border-box',
      }}
    >
      <h1
        style={{
          fontFamily: "'KaiTi', 'STKaiti', serif",
          fontSize: '32px',
          color: '#2c1810',
          margin: 0,
          textAlign: 'center',
        }}
      >
        书法笔顺演示
      </h1>

      <StrokeCanvas
        strokes={hanziData?.strokes ?? []}
        currentStrokeIndex={currentStrokeIndex}
        strokeProgress={strokeProgress}
      />

      <ControlPanel
        hanziList={hanziList}
        currentChar={currentChar}
        currentStrokeIndex={currentStrokeIndex}
        totalStrokes={totalStrokes}
        isPlaying={isPlaying}
        playSpeed={playSpeed}
        onCharChange={handleCharChange}
        onTogglePlay={handleTogglePlay}
        onProgressChange={handleProgressChange}
        onSpeedChange={handleSpeedChange}
      />
    </div>
  );
}
