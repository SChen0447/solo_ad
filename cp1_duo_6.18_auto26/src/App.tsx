import { useState, useEffect } from 'react';
import { useStore, type Capsule } from './store';
import { getRemainingTime, startCountdown, formatTimeRemaining, formatDate, type TimeRemaining } from './modules/timeManager';
import Hourglass from './components/Hourglass';
import CapsuleCard from './components/CapsuleCard';
import CapsuleModal from './components/CapsuleModal';

function getDefaultTargetDate(): Date {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date;
}

function PreviewModal() {
  const isOpen = useStore(state => state.isPreviewOpen);
  const currentCapsule = useStore(state => state.currentCapsule);
  const setPreviewOpen = useStore(state => state.setPreviewOpen);
  const setCurrentCapsule = useStore(state => state.setCurrentCapsule);
  const [remainingTime, setRemainingTime] = useState<TimeRemaining | null>(null);

  useEffect(() => {
    if (currentCapsule) {
      const cleanup = startCountdown(new Date(currentCapsule.targetDate), setRemainingTime);
      return cleanup;
    }
  }, [currentCapsule]);

  if (!isOpen || !currentCapsule) return null;

  const handleClose = () => {
    setPreviewOpen(false);
    setCurrentCapsule(null);
  };

  return (
    <div className="preview-modal-overlay" onClick={handleClose}>
      <div className="preview-modal" onClick={e => e.stopPropagation()}>
        <button className="close-btn" onClick={handleClose}>×</button>
        <h2>时间胶囊</h2>
        <div className="blurred-title">{currentCapsule.title}</div>
        <div className="preview-info">
          <span>致: <strong>{currentCapsule.recipient}</strong></span>
          <span>发送时间: <strong>{formatDate(new Date(currentCapsule.createdAt))}</strong></span>
          <span>解锁时间: <strong>{formatDate(new Date(currentCapsule.targetDate))}</strong></span>
          {remainingTime && remainingTime.total > 0 && (
            <span>剩余时间: <strong>{formatTimeRemaining(remainingTime)}</strong></span>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">⏳</div>
      <p>还没有时间胶囊</p>
      <p className="empty-state-hint">点击右下角的 + 按钮创建你的第一封信</p>
    </div>
  );
}

export default function App() {
  const capsules = useStore(state => state.capsules);
  const setModalOpen = useStore(state => state.setModalOpen);
  const checkAndUnlockExpired = useStore(state => state.checkAndUnlockExpired);

  const [heroTargetDate] = useState<Date>(() => {
    if (capsules.length > 0) {
      const nearest = capsules
        .map(c => new Date(c.targetDate))
        .sort((a, b) => a.getTime() - b.getTime())[0];
      return nearest;
    }
    return getDefaultTargetDate();
  });

  const [heroRemainingTime, setHeroRemainingTime] = useState<TimeRemaining>(() =>
    getRemainingTime(heroTargetDate)
  );

  const [totalDuration] = useState<number>(() => {
    const now = new Date().getTime();
    return Math.max(1, heroTargetDate.getTime() - now);
  });

  useEffect(() => {
    const cleanup = startCountdown(heroTargetDate, setHeroRemainingTime);
    return cleanup;
  }, [heroTargetDate]);

  useEffect(() => {
    checkAndUnlockExpired();
    const interval = setInterval(checkAndUnlockExpired, 1000);
    return () => clearInterval(interval);
  }, [checkAndUnlockExpired]);

  const sortedCapsules = [...capsules].sort((a, b) =>
    new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime()
  );

  return (
    <div className="app">
      <section className="hero-section">
        <h1 className="hero-title">时间胶囊</h1>
        <p className="hero-subtitle">写一封给未来的信，让时光替你保管，在约定的那天重新开启</p>

        <Hourglass remainingTime={heroRemainingTime} totalDuration={totalDuration} />

        <div className="countdown-display">
          {formatTimeRemaining(heroRemainingTime)}
        </div>
        <p className="countdown-label">
          {capsules.length > 0
            ? `距离最近的胶囊解锁还有 · ${formatDate(heroTargetDate)}`
            : '创建你的第一颗时间胶囊'
          }
        </p>
      </section>

      <section className="capsules-section">
        <h2 className="section-title">我的时间胶囊</h2>
        {sortedCapsules.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="masonry-grid">
            {sortedCapsules.map((capsule: Capsule) => (
              <CapsuleCard key={capsule.id} capsule={capsule} />
            ))}
          </div>
        )}
      </section>

      <button
        className="fab-button"
        onClick={() => setModalOpen(true)}
        aria-label="创建时间胶囊"
      >
        +
      </button>

      <CapsuleModal />
      <PreviewModal />
    </div>
  );
}
