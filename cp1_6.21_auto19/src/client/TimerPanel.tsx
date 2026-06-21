import { useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import type { RecipeStep } from './types';
import './TimerPanel.css';

interface TimerPanelProps {
  recipeId: string;
  recipeTitle: string;
  steps: RecipeStep[];
  socket: any;
  activeSession?: any;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default function TimerPanel({
  recipeId,
  recipeTitle,
  steps,
  socket,
  activeSession,
}: TimerPanelProps) {
  const { user } = useAuth();
  const [activeStepIndex, setActiveStepIndex] = useState<number | null>(null);
  const [remainingTime, setRemainingTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (activeSession && activeSession.recipeId === recipeId) {
      const stepIndex = steps.findIndex((s) => s.id === activeSession.stepId);
      if (stepIndex !== -1) {
        setActiveStepIndex(stepIndex);
        setRemainingTime(activeSession.remainingTime);
        setIsRunning(activeSession.isActive);
        setSessionId(activeSession.id);
      }
    }
  }, [activeSession, recipeId, steps]);

  useEffect(() => {
    if (!socket) return;

    const handleTimerTick = (data: any) => {
      if (data.sessionId === sessionId) {
        setRemainingTime(data.remainingTime);
      }
    };

    const handleTimerFinished = (data: any) => {
      if (data.sessionId === sessionId) {
        setIsRunning(false);
        setIsFinished(true);
        playFinishSound();
        showNotification(data);
      }
    };

    socket.on('timer_tick', handleTimerTick);
    socket.on('timer_finished', handleTimerFinished);

    return () => {
      socket.off('timer_tick', handleTimerTick);
      socket.off('timer_finished', handleTimerFinished);
    };
  }, [socket, sessionId]);

  const playFinishSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
      // ignore
    }
  };

  const showNotification = (data: any) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('计时器完成!', {
        body: `${data.recipeTitle} - ${data.stepName} 已完成`,
        icon: '/vite.svg',
      });
    }
  };

  const startTimer = (stepIndex: number) => {
    const step = steps[stepIndex];
    if (!step || step.duration <= 0) return;

    if (!user) {
      alert('请先登录');
      return;
    }

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    setActiveStepIndex(stepIndex);
    setRemainingTime(step.duration);
    setIsRunning(true);
    setIsFinished(false);

    if (socket) {
      const token = localStorage.getItem('token') || '';
      socket.emit('start_cooking', {
        recipeId,
        recipeTitle,
        stepId: step.id,
        stepName: step.title,
        duration: step.duration,
        token,
      });

      socket.once('session_started', (session: any) => {
        setSessionId(session.id);
      });
    }
  };

  const resetTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRunning(false);
    setIsFinished(false);
    if (activeStepIndex !== null) {
      setRemainingTime(steps[activeStepIndex].duration);
    }
    setSessionId(null);
  };

  const currentStep = activeStepIndex !== null ? steps[activeStepIndex] : null;
  const progress = currentStep
    ? ((currentStep.duration - remainingTime) / currentStep.duration) * 100
    : 0;

  return (
    <div className="timer-panel">
      <h3 className="timer-panel-title">🍳 烹饪计时器</h3>

      {currentStep && (
        <div className={`timer-display ${isFinished ? 'finished' : ''} ${isRunning ? 'running' : ''}`}>
          <div className="timer-step-name">{currentStep.title}</div>
          <div className="timer-time">{formatTime(remainingTime)}</div>
          <div className="timer-progress-container">
            <div
              className="timer-progress-bar"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="timer-actions">
            {isRunning ? (
              <button className="btn btn-secondary" onClick={resetTimer}>
                重置
              </button>
            ) : (
              <>
                <button
                  className="btn btn-primary"
                  onClick={() => startTimer(activeStepIndex!)}
                >
                  {isFinished ? '重新开始' : '开始'}
                </button>
                <button className="btn btn-secondary" onClick={resetTimer}>
                  重置
                </button>
              </>
            )}
          </div>
          {sessionId && (
            <div className="timer-session-info">
              🔗 其他人可以通过社区动态加入观看此计时
            </div>
          )}
        </div>
      )}

      <div className="timer-steps-list">
        <h4 className="timer-steps-title">步骤列表</h4>
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={`timer-step-item ${activeStepIndex === index ? 'active' : ''}`}
          >
            <div className="step-number">{index + 1}</div>
            <div className="step-info">
              <div className="step-title">{step.title}</div>
              <div className="step-duration">
                ⏱ {step.duration > 0 ? formatTime(step.duration) : '无计时'}
              </div>
            </div>
            {step.duration > 0 && (
              <button
                className={`btn btn-small ${activeStepIndex === index && isRunning ? 'btn-secondary' : 'btn-primary'}`}
                onClick={() => startTimer(index)}
                disabled={isRunning && activeStepIndex === index}
              >
                {activeStepIndex === index && isRunning ? '进行中' : '开始计时'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
