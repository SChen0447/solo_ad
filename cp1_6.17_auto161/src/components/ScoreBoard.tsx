import React, { useEffect, useState, useRef } from 'react';
import { PlayerInfo, RoundResult } from '../socket';

interface ScoreBoardProps {
  result: RoundResult;
  countdown: number;
}

function Avatar({ nickname }: { nickname: string }) {
  const initial = nickname.charAt(0).toUpperCase();
  const colors = ['#E74C3C', '#3498DB', '#2ECC71', '#F39C12', '#9B59B6', '#1ABC9C', '#E67E22', '#2C3E50'];
  const colorIdx = nickname.charCodeAt(0) % colors.length;
  return (
    <div style={{
      width: '40px',
      height: '40px',
      borderRadius: '50%',
      background: colors[colorIdx],
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#FFFFFF',
      fontSize: '18px',
      fontWeight: 700,
      flexShrink: 0,
    }}>
      {initial}
    </div>
  );
}

function AnimatedScore({ score, prevScore }: { score: number; prevScore: number }) {
  const [displayScore, setDisplayScore] = useState(prevScore);
  const [animClass, setAnimClass] = useState('');
  const diff = score - prevScore;

  useEffect(() => {
    if (diff === 0) return;
    setAnimClass(diff > 0 ? 'score-up' : 'score-down');
    const start = prevScore;
    const end = score;
    const duration = 1500;
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(start + (end - start) * eased));
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setAnimClass('');
      }
    };
    requestAnimationFrame(animate);
  }, [score, prevScore, diff]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
      <span className={animClass} style={{
        color: '#FFFFFF',
        fontSize: '18px',
        fontWeight: 700,
      }}>
        {displayScore}
      </span>
      {diff !== 0 && (
        <span style={{
          color: diff > 0 ? '#2ECC71' : '#E74C3C',
          fontSize: '12px',
          fontWeight: 600,
          animation: diff > 0 ? 'scoreUp 1.5s ease forwards' : 'scoreDown 1.5s ease forwards',
        }}>
          {diff > 0 ? `+${diff}` : `${diff}`}
        </span>
      )}
    </div>
  );
}

function ParticleExplosion() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const particles: { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number }[] = [];
    const colors = ['#FFD700', '#FFA500', '#FF6347', '#FFD700', '#FFEC8B', '#F0E68C'];

    for (let i = 0; i < 60; i++) {
      const angle = (Math.PI * 2 * i) / 60 + Math.random() * 0.5;
      const speed = 2 + Math.random() * 4;
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 2 + Math.random() * 3,
      });
    }

    let animId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      particles.forEach(p => {
        if (p.life <= 0) return;
        alive = true;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05;
        p.life -= 0.015;
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      if (alive) {
        animId = requestAnimationFrame(animate);
      }
    };
    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={200}
      style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', pointerEvents: 'none' }}
    />
  );
}

export default function ScoreBoard({ result, countdown }: ScoreBoardProps) {
  const [showWord, setShowWord] = useState(false);
  const sorted = [...result.players].sort((a, b) => b.score - a.score);

  useEffect(() => {
    setShowWord(false);
    const t = setTimeout(() => setShowWord(true), 300);
    return () => clearTimeout(t);
  }, [result.word]);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(26,37,44,0.92)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      gap: '24px',
    }}>
      <div style={{ position: 'relative', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ParticleExplosion />
        <div className={showWord ? 'word-reveal' : ''} style={{
          color: '#FFD700',
          fontSize: showWord ? '48px' : '0px',
          fontWeight: 900,
          textShadow: '0 0 20px rgba(255,215,0,0.6)',
          transition: 'font-size 0.5s cubic-bezier(0.68, -0.55, 0.27, 1.55)',
        }}>
          {result.word}
        </div>
      </div>

      <div style={{
        background: 'rgba(255,255,255,0.1)',
        border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: '16px',
        padding: '20px',
        minWidth: '320px',
        maxWidth: '420px',
        width: '90%',
        backdropFilter: 'blur(8px)',
      }}>
        <h3 style={{ color: '#FFFFFF', textAlign: 'center', margin: '0 0 16px 0', fontSize: '18px' }}>
          本轮积分
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {sorted.map((p, i) => (
            <div key={p.id} className="slide-in-item" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '8px 12px',
              borderRadius: '10px',
              background: i === 0 ? 'rgba(255,215,0,0.12)' : 'rgba(255,255,255,0.04)',
              animationDelay: `${i * 0.1}s`,
            }}>
              <span style={{ color: '#FFD700', fontSize: '16px', fontWeight: 700, minWidth: '24px' }}>
                {i + 1}
              </span>
              <Avatar nickname={p.nickname} />
              <span style={{ color: '#FFFFFF', fontSize: '15px', fontWeight: 600, flex: 1 }}>
                {p.nickname}
              </span>
              <AnimatedScore score={p.score} prevScore={p.score - p.roundScore} />
            </div>
          ))}
        </div>
      </div>

      <div style={{
        color: '#BDC3C7',
        fontSize: '14px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        下一轮开始倒计时
        <span style={{ color: '#E67E22', fontSize: '24px', fontWeight: 700 }}>{countdown}</span>
        秒
      </div>
    </div>
  );
}
