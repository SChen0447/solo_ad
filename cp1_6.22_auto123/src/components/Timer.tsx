import { useTimer } from '@/hooks/useTimer';
import styles from './Timer.module.css';

const Timer = () => {
  const { progress, formattedTime, timer } = useTimer();

  const circumference = 2 * Math.PI * 28;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <>
      <div className={styles.progressBarContainer}>
        <div
          className={styles.progressBar}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className={styles.timerCircle}>
        <svg width="64" height="64" viewBox="0 0 64 64">
          <circle
            cx="32"
            cy="32"
            r="28"
            fill="none"
            stroke="#374151"
            strokeWidth="4"
          />
          <circle
            cx="32"
            cy="32"
            r="28"
            fill="none"
            stroke="#10b981"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 32 32)"
            className={styles.progressCircle}
          />
        </svg>
        <div className={styles.timerText}>
          {timer.isRunning ? formattedTime : '00:00'}
        </div>
        <div className={styles.phaseLabel}>
          {timer.phase === 'focus' ? '专注' : timer.phase === 'rest' ? '休息' : '准备'}
        </div>
      </div>
    </>
  );
};

export default Timer;
