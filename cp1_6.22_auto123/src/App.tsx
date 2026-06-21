import { useEffect } from 'react';
import { useTimer } from '@/hooks/useTimer';
import { useAppStore } from '@/store/useAppStore';
import Scene3D from '@/components/Scene3D';
import Timer from '@/components/Timer';
import Toolbar from '@/components/Toolbar';
import HistoryPanel from '@/components/HistoryPanel';
import RestModal from '@/components/RestModal';
import ActionLabel from '@/components/ActionLabel';
import { POSTURE_TIPS } from '@/types';
import styles from './App.module.css';

export default function App() {
  const { timer, postureMode, currentTip, cyclePostureTip } = useAppStore();
  const { startTimer, pauseTimer } = useTimer();

  useEffect(() => {
    let interval: number | null = null;

    if (postureMode && timer.isRunning) {
      interval = window.setInterval(() => {
        cyclePostureTip();
      }, 5000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [postureMode, timer.isRunning, cyclePostureTip]);

  return (
    <div className={styles.app}>
      <Scene3D />
      <Toolbar />
      <Timer />
      <ActionLabel />
      <HistoryPanel />
      <RestModal />

      {postureMode && (
        <div className={styles.postureIndicator}>
          <div className={styles.postureIndicatorDot} />
          <span>坐姿检查模式已开启</span>
        </div>
      )}

      <div className={styles.welcomeOverlay}>
        <h1 className={styles.welcomeTitle}>3D虚拟工位健康助手</h1>
        <p className={styles.welcomeSubtitle}>
          点击左侧绿色按钮开始25分钟专注计时
        </p>
      </div>
    </div>
  );
}
