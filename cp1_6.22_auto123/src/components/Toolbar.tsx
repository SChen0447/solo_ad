import { Play, Pause, Calendar } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import styles from './Toolbar.module.css';

const Toolbar = () => {
  const { timer, postureMode, startTimer, pauseTimer, togglePostureMode, setShowHistoryPanel } =
    useAppStore();

  const handlePlayPause = () => {
    if (timer.isRunning) {
      pauseTimer();
    } else {
      startTimer();
    }
  };

  return (
    <div className={styles.toolbar}>
      <button
        className={`${styles.playButton} ${timer.isRunning ? styles.paused : styles.playing}`}
        onClick={handlePlayPause}
        aria-label={timer.isRunning ? '暂停' : '开始'}
      >
        {timer.isRunning ? <Pause size={20} /> : <Play size={20} />}
      </button>

      <button
        className={`${styles.postureButton} ${postureMode ? styles.active : ''}`}
        onClick={togglePostureMode}
        aria-label="坐姿检查模式"
      >
        <div className={styles.slider}>
          <div className={styles.sliderTrack}>
            <div className={styles.sliderThumb} />
          </div>
        </div>
        <span className={styles.buttonLabel}>坐姿</span>
      </button>

      <button
        className={styles.historyButton}
        onClick={() => setShowHistoryPanel(true)}
        aria-label="历史记录"
      >
        <Calendar size={24} />
      </button>
    </div>
  );
};

export default Toolbar;
