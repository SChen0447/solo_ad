import React, { useState, useEffect, useRef } from 'react';
import { useTaskStore, Task } from '../store/taskStore';

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

const TimerPanel: React.FC = () => {
  const tasks = useTaskStore(state => state.tasks);
  const startTimer = useTaskStore(state => state.startTimer);
  const pauseTimer = useTaskStore(state => state.pauseTimer);
  const setSelectedTask = useTaskStore(state => state.setSelectedTask);

  const [displayTime, setDisplayTime] = useState(0);
  const intervalRef = useRef<number | null>(null);

  const runningTask = tasks.find(t => t.isRunning);

  useEffect(() => {
    if (runningTask && runningTask.currentStartTime) {
      const updateDisplay = () => {
        const now = Date.now();
        const elapsed = now - runningTask.currentStartTime!;
        setDisplayTime(runningTask.totalTime + elapsed);
      };

      updateDisplay();
      intervalRef.current = window.setInterval(updateDisplay, 100);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    } else if (runningTask) {
      setDisplayTime(runningTask.totalTime);
    } else {
      setDisplayTime(0);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
  }, [runningTask]);

  if (!runningTask) {
    return null;
  }

  const handleToggle = () => {
    if (runningTask.isRunning) {
      pauseTimer(runningTask.id);
    } else {
      startTimer(runningTask.id);
    }
  };

  const handleTaskClick = () => {
    const task = tasks.find(t => t.id === runningTask.id);
    if (task) {
      setSelectedTask(task);
    }
  };

  return (
    <>
      <div className="timer-panel">
        <div className="timer-info" onClick={handleTaskClick}>
          <div className="timer-indicator">
            <span className="pulse-dot"></span>
            <span className="timer-label">正在计时</span>
          </div>
          <div className="timer-task-title">{runningTask.title}</div>
        </div>
        <div className="timer-display">{formatTime(displayTime)}</div>
        <button className="timer-control-btn" onClick={handleToggle}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" />
            <rect x="14" y="4" width="4" height="16" />
          </svg>
        </button>
      </div>

      <style>{`
        .timer-panel {
          position: fixed;
          bottom: 24px;
          right: 24px;
          background: white;
          border-radius: 16px;
          padding: 16px 20px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
          display: flex;
          align-items: center;
          gap: 16px;
          z-index: 50;
          animation: slideUp 0.3s ease-out;
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .timer-info {
          cursor: pointer;
        }
        .timer-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 4px;
        }
        .pulse-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #ef4444;
          animation: pulse-dot 1.5s ease-in-out infinite;
        }
        @keyframes pulse-dot {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(1.2);
          }
        }
        .timer-label {
          font-size: 0.75rem;
          color: #6b7280;
        }
        .timer-task-title {
          font-size: 0.9rem;
          font-weight: 600;
          color: #1f2937;
          max-width: 200px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .timer-display {
          font-size: 1.8rem;
          font-weight: 700;
          font-family: 'SF Mono', Monaco, monospace;
          color: #4f46e5;
          min-width: 120px;
          text-align: center;
        }
        .timer-control-btn {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: none;
          background: #4f46e5;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .timer-control-btn:hover {
          background: #4338ca;
          transform: scale(1.05);
        }
        .timer-control-btn:active {
          transform: scale(0.95);
        }
        @media (max-width: 768px) {
          .timer-panel {
            bottom: 16px;
            right: 16px;
            left: 16px;
            justify-content: space-between;
          }
          .timer-task-title {
            max-width: 150px;
          }
        }
      `}</style>
    </>
  );
};

export default TimerPanel;
