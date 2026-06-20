import { useState, useEffect, useRef, useCallback } from 'react';
import { useRecipeContext } from '../App';
import { formatTime, playDingSound } from '../utils';
import './CookingMode.css';

interface CookingModeProps {
  onStepComplete?: (stepId: string) => void;
}

function CookingMode({ onStepComplete }: CookingModeProps) {
  const { currentRecipe, currentStepIndex, setCurrentStepIndex, setViewMode } = useRecipeContext();
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const initialDurationRef = useRef<number>(0);
  const stepCompletedRef = useRef<Set<string>>(new Set());

  const currentStep = currentRecipe?.steps[currentStepIndex];
  const nextStep = currentRecipe?.steps[currentStepIndex + 1];
  const isLastStep = currentStepIndex === (currentRecipe?.steps.length || 0) - 1;

  const totalDurationSeconds = currentStep ? currentStep.duration * 60 : 0;
  const progress = totalDurationSeconds > 0 ? (1 - timeLeft / totalDurationSeconds) * 100 : 0;

  const updateTimer = useCallback(() => {
    const elapsed = (performance.now() - startTimeRef.current) / 1000;
    const remaining = Math.max(0, initialDurationRef.current - elapsed);

    setTimeLeft(remaining);

    if (remaining <= 0) {
      setIsRunning(false);

      if (currentStep && !stepCompletedRef.current.has(currentStep.id)) {
        stepCompletedRef.current.add(currentStep.id);
        playDingSound();
        onStepComplete?.(currentStep.id);
      }

      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      return;
    }

    animFrameRef.current = requestAnimationFrame(updateTimer);
  }, [currentStep, onStepComplete]);

  useEffect(() => {
    if (currentStep) {
      const durationSec = currentStep.duration * 60;
      setTimeLeft(durationSec);
      initialDurationRef.current = durationSec;
      setIsRunning(false);
      setIsCompleted(false);

      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    }
  }, [currentStepIndex, currentStep]);

  useEffect(() => {
    if (isRunning) {
      startTimeRef.current = performance.now() - (initialDurationRef.current - timeLeft) * 1000;
      animFrameRef.current = requestAnimationFrame(updateTimer);
    } else {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    }

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isRunning, updateTimer]);

  const handleStart = () => {
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(initialDurationRef.current);
    if (currentStep) {
      stepCompletedRef.current.delete(currentStep.id);
    }
  };

  const handleNextStep = () => {
    if (!currentRecipe || isLastStep) {
      setIsCompleted(true);
      return;
    }
    setCurrentStepIndex(currentStepIndex + 1);
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleExit = () => {
    setIsRunning(false);
    setViewMode('detail');
  };

  const handleRestart = () => {
    setCurrentStepIndex(0);
    setIsCompleted(false);
    stepCompletedRef.current.clear();
  };

  const radius = 80;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  if (!currentRecipe || !currentStep) return null;

  if (isCompleted) {
    return (
      <div className="cooking-mode cooking-completed">
        <div className="completed-content">
          <div className="completed-icon">🎉</div>
          <h2 className="completed-title">恭喜完成！</h2>
          <p className="completed-text">你已经完成了"{currentRecipe.name}"的所有步骤</p>
          <div className="completed-actions">
            <button className="btn btn-primary" onClick={handleRestart}>
              重新开始
            </button>
            <button className="btn" onClick={handleExit}>
              返回食谱
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cooking-mode">
      <div className="cooking-header">
        <button className="btn btn-sm back-btn" onClick={handleExit}>
          ← 返回
        </button>
        <h2 className="cooking-recipe-title">{currentRecipe.name}</h2>
        <div className="step-indicator">
          步骤 {currentStepIndex + 1} / {currentRecipe.steps.length}
        </div>
      </div>

      <div className="cooking-current-step">
        <h3 className="current-step-name">{currentStep.name}</h3>
        {currentStep.description && (
          <p className="current-step-description">{currentStep.description}</p>
        )}
      </div>

      <div className="timer-section">
        <div className="timer-ring-container">
          <svg className="timer-ring" width={radius * 2 + strokeWidth} height={radius * 2 + strokeWidth}>
            <circle
              className="timer-ring-bg"
              cx={radius + strokeWidth / 2}
              cy={radius + strokeWidth / 2}
              r={radius}
              strokeWidth={strokeWidth}
              fill="none"
            />
            <circle
              className="timer-ring-progress"
              cx={radius + strokeWidth / 2}
              cy={radius + strokeWidth / 2}
              r={radius}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
            />
          </svg>
          <div className="timer-display">
            <span className="timer-time">{formatTime(timeLeft)}</span>
            <span className="timer-status">
              {timeLeft <= 0 ? '完成！' : isRunning ? '进行中' : '已暂停'}
            </span>
          </div>
        </div>

        <div className="timer-controls">
          {!isRunning ? (
            <button className="btn btn-primary timer-btn" onClick={handleStart}>
              {timeLeft <= 0 ? '重新开始' : timeLeft === totalDurationSeconds ? '开始' : '继续'}
            </button>
          ) : (
            <button className="btn timer-btn" onClick={handlePause}>
              暂停
            </button>
          )}
          <button className="btn timer-btn" onClick={handleReset} disabled={timeLeft === totalDurationSeconds && !isRunning}>
            重置
          </button>
        </div>

        {currentStep.hasTimer && timeLeft <= 0 && (
          <p className="timer-done-hint">⏰ 定时时间到！</p>
        )}
      </div>

      <div className="step-navigation">
        <button
          className="btn nav-btn"
          onClick={handlePrevStep}
          disabled={currentStepIndex === 0}
        >
          ← 上一步
        </button>
        <button className="btn btn-primary nav-btn" onClick={handleNextStep}>
          {isLastStep ? '完成烹饪 →' : '下一步 →'}
        </button>
      </div>

      {nextStep && (
        <div className="next-step-preview">
          <h4 className="next-step-label">下一步</h4>
          <div className="next-step-card">
            <div className="next-step-number">{currentStepIndex + 2}</div>
            <div className="next-step-info">
              <p className="next-step-name">{nextStep.name}</p>
              {nextStep.description && (
                <p className="next-step-desc">{nextStep.description}</p>
              )}
            </div>
            {nextStep.hasTimer && (
              <div className="next-step-duration">
                ⏱ {formatTime(nextStep.duration * 60)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default CookingMode;
