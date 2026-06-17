import { useMemo } from 'react';
import type { TimerState } from '../types';

interface TimerPanelProps {
  timerState: TimerState;
  onStartTimer: (duration: number) => void;
  onResetTimer: () => void;
  isLoading: boolean;
}

const PRESETS = [
  { label: '5分钟', value: 300 },
  { label: '10分钟', value: 600 },
  { label: '15分钟', value: 900 },
  { label: '20分钟', value: 1200 },
];

function TimerPanel({ timerState, onStartTimer, onResetTimer, isLoading }: TimerPanelProps) {
  const { remaining, duration, isRunning, isLocked } = timerState;

  const formattedTime = useMemo(() => {
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [remaining]);

  const isUrgent = remaining > 0 && remaining <= 60;
  const timerColor = isUrgent ? '#e53935' : '#4A90D9';

  return (
    <div className="timer-panel">
      <div className={`timer-display ${isUrgent ? 'timer-urgent' : ''}`} style={{ color: timerColor }}>
        {formattedTime}
      </div>
      
      <div className="preset-buttons">
        {PRESETS.map((preset) => (
          <button
            key={preset.value}
            className={`preset-btn ${isRunning && duration === preset.value ? 'active' : ''}`}
            onClick={() => onStartTimer(preset.value)}
            disabled={isLoading || isRunning}
          >
            {preset.label}
          </button>
        ))}
      </div>
      
      <div className="control-buttons">
        <button
          className="reset-btn"
          onClick={onResetTimer}
          disabled={isLoading}
        >
          重置
        </button>
      </div>
      
      {isLocked && (
        <div className="locked-message">
          计时已结束，想法提交已锁定
        </div>
      )}
      
      <style>{`
        .timer-panel {
          background: #ffffff;
          border-radius: 12px;
          padding: 30px;
          margin-bottom: 25px;
          text-align: center;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }
        
        .timer-display {
          font-family: 'Courier New', monospace;
          font-size: 48px;
          font-weight: 700;
          margin-bottom: 20px;
        }
        
        .preset-buttons {
          display: flex;
          gap: 12px;
          justify-content: center;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        
        .preset-btn {
          padding: 10px 24px;
          background: #f5f5f5;
          color: #333;
          font-size: 14px;
          font-weight: 500;
        }
        
        .preset-btn:hover:not(:disabled) {
          background: #e0e0e0;
        }
        
        .preset-btn.active {
          background: #4A90D9;
          color: #ffffff;
        }
        
        .preset-btn:disabled {
          background: #ccc;
          color: #666;
        }
        
        .control-buttons {
          display: flex;
          gap: 12px;
          justify-content: center;
        }
        
        .reset-btn {
          padding: 10px 30px;
          background: #e53935;
          color: #ffffff;
          font-size: 14px;
          font-weight: 500;
        }
        
        .reset-btn:hover:not(:disabled) {
          background: #c62828;
        }
        
        .reset-btn:disabled {
          background: #ccc;
        }
        
        .locked-message {
          margin-top: 15px;
          padding: 10px;
          background: #ffebee;
          color: #c62828;
          border-radius: 6px;
          font-size: 14px;
        }
        
        @media (max-width: 768px) {
          .timer-panel {
            padding: 20px;
          }
          
          .timer-display {
            font-size: 36px;
          }
          
          .preset-btn {
            padding: 8px 16px;
            font-size: 13px;
          }
        }
      `}</style>
    </div>
  );
}

export default TimerPanel;
