import { useState, useEffect, useRef, useCallback } from 'react';
import { Capsule, useStore } from '../store';
import { getRemainingTime, formatDate, formatTimeRemaining, type TimeRemaining } from '../modules/timeManager';

interface CapsuleCardProps {
  capsule: Capsule;
}

export default function CapsuleCard({ capsule }: CapsuleCardProps) {
  const [remainingTime, setRemainingTime] = useState<TimeRemaining>(() =>
    getRemainingTime(new Date(capsule.targetDate))
  );
  const [isCelebrating, setIsCelebrating] = useState(false);
  const [decryptedContent, setDecryptedContent] = useState<string | null>(null);
  const [showContent, setShowContent] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const celebratingCapsuleId = useStore(state => state.celebratingCapsuleId);
  const unlockCapsule = useStore(state => state.unlockCapsule);
  const setCurrentCapsule = useStore(state => state.setCurrentCapsule);
  const setPreviewOpen = useStore(state => state.setPreviewOpen);

  useEffect(() => {
    const update = () => {
      setRemainingTime(getRemainingTime(new Date(capsule.targetDate)));
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [capsule.targetDate]);

  useEffect(() => {
    if (celebratingCapsuleId === capsule.id && !isCelebrating) {
      setIsCelebrating(true);
      startParticleRain();
      setTimeout(() => {
        setIsCelebrating(false);
      }, 3000);
    }
  }, [celebratingCapsuleId, capsule.id, isCelebrating]);

  const startParticleRain = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const particles: { x: number; y: number; vy: number; size: number; opacity: number }[] = [];
    for (let i = 0; i < 50; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: -Math.random() * canvas.height,
        vy: 2 + Math.random() * 3,
        size: 2 + Math.random() * 4,
        opacity: 0.5 + Math.random() * 0.5,
      });
    }

    let frame = 0;
    const maxFrames = 180;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach(p => {
        p.y += p.vy;
        if (p.y > canvas.height) {
          p.y = -10;
          p.x = Math.random() * canvas.width;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(240, 230, 140, ${p.opacity * (1 - frame / maxFrames)})`;
        ctx.fill();
      });

      frame++;
      if (frame < maxFrames) {
        requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    animate();
  }, []);

  const handleClick = async () => {
    if (remainingTime.total <= 0 && !capsule.isUnlocked) {
      const content = await unlockCapsule(capsule.id);
      if (content) {
        setDecryptedContent(content);
        setShowContent(true);
      }
    } else if (capsule.isUnlocked && decryptedContent) {
      setShowContent(true);
    } else if (capsule.isUnlocked && !decryptedContent) {
      const content = await unlockCapsule(capsule.id);
      if (content) {
        setDecryptedContent(content);
        setShowContent(true);
      }
    } else {
      setCurrentCapsule(capsule);
      setPreviewOpen(true);
    }
  };

  const renderMarkdown = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/\n/g, '<br />');
  };

  return (
    <>
      <div
        className={`capsule-card ${isCelebrating ? 'celebrating' : ''} ${capsule.isUnlocked ? 'unlocked' : ''}`}
        onClick={handleClick}
      >
        <canvas ref={canvasRef} className="particle-canvas" />
        <div className="capsule-icon">
          <svg viewBox="0 0 24 24" className="hourglass-icon">
            <path d="M6 2h12v3c0 2.5-2 4.5-4.5 4.5v5C16 14.5 18 16.5 18 19v3H6v-3c0-2.5 2-4.5 4.5-4.5v-5C8 9.5 6 7.5 6 5V2z" fill="none" stroke="#f0e68c" strokeWidth="1.5" />
            <path d="M8 5c0 1.5 1.5 3 4 3s4-1.5 4-3" fill="#f0e68c" opacity="0.6" />
          </svg>
        </div>
        <h3 className={`capsule-title ${!capsule.isUnlocked ? 'blurred' : ''}`}>
          {capsule.title}
        </h3>
        <div className="capsule-info">
          <span className="capsule-recipient">致: {capsule.recipient}</span>
          <span className="capsule-date">发送: {formatDate(new Date(capsule.createdAt))}</span>
        </div>
        <div className="capsule-countdown">
          {remainingTime.total > 0 ? (
            <span className="countdown-text">{formatTimeRemaining(remainingTime)}</span>
          ) : (
            <span className="unlocked-text">✓ 已解锁</span>
          )}
        </div>
      </div>

      {showContent && decryptedContent && (
        <div className="content-modal-overlay" onClick={() => setShowContent(false)}>
          <div className="content-modal" onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setShowContent(false)}>×</button>
            <h2 className="content-title">{capsule.title}</h2>
            <div className="content-meta">
              <span>致: {capsule.recipient}</span>
              <span>发送于: {formatDate(new Date(capsule.createdAt))}</span>
            </div>
            <div
              className="letter-content"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(decryptedContent) }}
            />
          </div>
        </div>
      )}
    </>
  );
}
