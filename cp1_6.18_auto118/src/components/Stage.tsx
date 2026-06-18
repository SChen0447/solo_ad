import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../store';
import { Line } from '../types';

const CONFETTI_COUNT = 120;

interface ConfettiParticle {
  id: number;
  x: number;
  color: string;
  delay: number;
  rotation: number;
  size: number;
  duration: number;
}

function ConfettiOverlay() {
  const [particles] = useState<ConfettiParticle[]>(() =>
    Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#F9CA24', '#FF9FF3', '#54A0FF'][i % 7],
      delay: Math.random() * 0.8,
      rotation: Math.random() * 360,
      size: 6 + Math.random() * 8,
      duration: 1.5 + Math.random() * 1,
    }))
  );

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: 1000,
      overflow: 'hidden',
    }}>
      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            top: -20,
            left: `${p.x}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: p.id % 3 === 0 ? '50%' : p.id % 3 === 1 ? '2px' : '0',
            animation: `confettiFall ${p.duration}s ease-out ${p.delay}s forwards`,
            transform: `rotate(${p.rotation}deg)`,
          }}
        />
      ))}
      <style>{`
        @keyframes confettiFall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function TypewriterBanner({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState('');

  useEffect(() => {
    setDisplayed('');
    if (!text) return;
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(timer);
    }, 80);
    return () => clearInterval(timer);
  }, [text]);

  return (
    <div style={{
      background: 'rgba(0,0,0,0.4)',
      backdropFilter: 'blur(15px)',
      WebkitBackdropFilter: 'blur(15px)',
      borderRadius: 16,
      padding: '16px 32px',
      margin: '0 auto',
      maxWidth: 700,
      textAlign: 'center',
      border: '1px solid rgba(255,215,0,0.2)',
    }}>
      <span style={{
        background: 'linear-gradient(90deg, #FFD700, #FFA500, #FFD700)',
        backgroundSize: '200% auto',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        fontSize: 'clamp(18px, 3vw, 28px)',
        fontWeight: 700,
        filter: 'drop-shadow(0 0 8px rgba(255,215,0,0.3))',
        animation: 'shimmer 3s linear infinite',
      }}>
        🎭 {displayed}
        {displayed.length < text.length && <span style={{ opacity: 0.7 }}>|</span>}
      </span>
      <style>{`
        @keyframes shimmer {
          0% { background-position: 0% center; }
          100% { background-position: 200% center; }
        }
      `}</style>
    </div>
  );
}

function AvatarRing({ userId, nickname, emoji, isCurrentTurn, avatarColor }: {
  userId: string;
  nickname: string;
  emoji: string;
  isCurrentTurn: boolean;
  avatarColor: string;
}) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 6,
      transition: 'all 0.5s ease',
    }}>
      <div style={{
        width: isCurrentTurn ? 60 : 48,
        height: isCurrentTurn ? 60 : 48,
        borderRadius: '50%',
        background: isCurrentTurn
          ? `radial-gradient(circle, ${avatarColor}, ${avatarColor}88)`
          : `radial-gradient(circle, ${avatarColor}88, ${avatarColor}44)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: isCurrentTurn ? 28 : 22,
        transition: 'all 0.5s ease',
        boxShadow: isCurrentTurn ? `0 0 20px ${avatarColor}66, 0 0 40px ${avatarColor}33` : 'none',
        animation: isCurrentTurn ? 'breathe 2s ease-in-out infinite' : 'none',
        border: isCurrentTurn ? `2px solid ${avatarColor}` : '2px solid rgba(255,255,255,0.15)',
      }}>
        {emoji}
      </div>
      <span style={{
        color: isCurrentTurn ? '#fff' : 'rgba(255,255,255,0.5)',
        fontSize: 12,
        fontWeight: isCurrentTurn ? 700 : 400,
        transition: 'all 0.5s ease',
        maxWidth: 64,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {nickname}
      </span>
      <style>{`
        @keyframes breathe {
          0%, 100% { transform: scale(1); box-shadow: 0 0 20px ${avatarColor}66; }
          50% { transform: scale(1.1); box-shadow: 0 0 35px ${avatarColor}88, 0 0 60px ${avatarColor}44; }
        }
      `}</style>
    </div>
  );
}

function LineBubble({ line, index }: { line: Line; index: number }) {
  return (
    <div
      style={{
        animation: `fadeInUp 0.5s ease ${index * 0.05}s both`,
        background: 'rgba(255,255,255,0.08)',
        backdropFilter: 'blur(15px)',
        WebkitBackdropFilter: 'blur(15px)',
        borderRadius: 12,
        padding: '12px 18px',
        borderLeft: '3px solid rgba(255,215,0,0.4)',
        transition: 'opacity 0.5s ease',
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
      }}>
        <span style={{ fontSize: 16 }}>{line.emoji}</span>
        <span style={{
          color: 'rgba(255,215,0,0.9)',
          fontSize: 13,
          fontWeight: 600,
        }}>
          {line.nickname}
        </span>
        <span style={{
          color: 'rgba(255,255,255,0.3)',
          fontSize: 11,
          marginLeft: 'auto',
        }}>
          R{line.roundIndex + 1} · T{line.turnIndex + 1}
        </span>
      </div>
      <div style={{
        color: 'rgba(255,255,255,0.9)',
        fontSize: 'clamp(14px, 1.8vw, 17px)',
        lineHeight: 1.6,
      }}>
        {line.content}
      </div>
    </div>
  );
}

function CountdownBar({ countdown, maxTime }: { countdown: number; maxTime: number }) {
  const ratio = countdown / maxTime;
  const r = Math.round(255 * (1 - ratio));
  const g = Math.round(200 * ratio);
  const color = `rgb(${r},${g},50)`;

  return (
    <div style={{
      width: '100%',
      height: 4,
      borderRadius: 2,
      background: 'rgba(255,255,255,0.1)',
      marginTop: 8,
      overflow: 'hidden',
    }}>
      <div style={{
        width: `${ratio * 100}%`,
        height: '100%',
        background: color,
        borderRadius: 2,
        transition: 'width 0.1s linear, background-color 0.1s linear',
      }} />
    </div>
  );
}

function ScriptView() {
  const room = useAppStore((s) => s.room);
  const [buttonShake, setButtonShake] = useState(false);

  if (!room) return null;

  const handleDownload = () => {
    setButtonShake(true);
    setTimeout(() => setButtonShake(false), 400);

    let text = `🎭 可觅即兴戏剧 — ${room.scenePrompt}\n`;
    text += `${'═'.repeat(40)}\n\n`;
    text += `场景: ${room.scenePrompt}\n`;
    text += `参与者: ${room.users.map((u) => u.nickname).join('、')}\n\n`;
    text += `${'─'.repeat(40)}\n\n`;
    room.lines.forEach((line) => {
      text += `${line.emoji} ${line.nickname}：${line.content}\n\n`;
    });
    text += `${'─'.repeat(40)}\n`;
    text += `🎬 全剧终\n`;

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `可觅-${room.scenePrompt}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{
      background: 'rgba(0,0,0,0.4)',
      backdropFilter: 'blur(15px)',
      WebkitBackdropFilter: 'blur(15px)',
      borderRadius: 20,
      padding: '32px',
      maxWidth: 720,
      margin: '0 auto',
      border: '1px solid rgba(255,255,255,0.1)',
    }}>
      <h2 style={{
        textAlign: 'center',
        background: 'linear-gradient(90deg, #FFD700, #FFA500)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        fontSize: 'clamp(20px, 3vw, 28px)',
        marginBottom: 8,
      }}>
        🎬 剧本完成
      </h2>
      <p style={{
        textAlign: 'center',
        color: 'rgba(255,255,255,0.5)',
        fontSize: 14,
        marginBottom: 24,
      }}>
        {room.scenePrompt}
      </p>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        maxHeight: '45vh',
        overflowY: 'auto',
        paddingRight: 8,
      }}>
        {room.lines.map((line, i) => (
          <LineBubble key={line.id} line={line} index={i} />
        ))}
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 16,
        marginTop: 24,
        flexWrap: 'wrap',
      }}>
        <button
          onClick={handleDownload}
          style={{
            padding: '12px 28px',
            borderRadius: 12,
            border: 'none',
            background: 'linear-gradient(135deg, #FFD700, #FFA500)',
            color: '#1a1a2e',
            fontWeight: 700,
            fontSize: 15,
            cursor: 'pointer',
            animation: buttonShake ? 'shake 0.4s ease' : 'none',
          }}
        >
          📥 下载剧本
        </button>
        <button
          onClick={() => useAppStore.getState().setPhase('playing')}
          style={{
            padding: '12px 28px',
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.2)',
            background: 'rgba(255,255,255,0.08)',
            color: '#fff',
            fontWeight: 600,
            fontSize: 15,
            cursor: 'pointer',
            backdropFilter: 'blur(10px)',
          }}
        >
          ✏️ 返回编辑
        </button>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-4px); }
          40% { transform: translateX(4px); }
          60% { transform: translateX(-3px); }
          80% { transform: translateX(3px); }
        }
      `}</style>
    </div>
  );
}

function InputArea() {
  const [input, setInput] = useState('');
  const room = useAppStore((s) => s.room);
  const currentUser = useAppStore((s) => s.currentUser);
  const ws = useAppStore((s) => s.ws);

  const isMyTurn = room?.currentTurnUserId === currentUser?.id;
  const countdown = room?.countdown ?? 0;

  const handleSubmit = useCallback(() => {
    if (!input.trim() || !isMyTurn || !ws || !room) return;
    ws.send({
      type: 'submit_line',
      payload: {
        roomId: room.id,
        userId: currentUser?.id,
        content: input.trim(),
      },
    });
    setInput('');
  }, [input, isMyTurn, ws, room, currentUser]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  if (!isMyTurn) {
    return (
      <div style={{
        textAlign: 'center',
        color: 'rgba(255,255,255,0.4)',
        fontSize: 14,
        padding: 16,
      }}>
        等待其他表演者发言...
      </div>
    );
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.06)',
      backdropFilter: 'blur(15px)',
      WebkitBackdropFilter: 'blur(15px)',
      borderRadius: 14,
      padding: 16,
      border: '1px solid rgba(255,215,0,0.2)',
    }}>
      <div style={{
        display: 'flex',
        gap: 10,
        alignItems: 'flex-end',
      }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入你的台词或动作描述..."
          maxLength={200}
          rows={2}
          style={{
            flex: 1,
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10,
            padding: '10px 14px',
            color: '#fff',
            fontSize: 15,
            resize: 'none',
            outline: 'none',
            fontFamily: 'inherit',
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={!input.trim()}
          style={{
            padding: '10px 24px',
            borderRadius: 10,
            border: 'none',
            background: input.trim()
              ? 'linear-gradient(135deg, #FFD700, #FFA500)'
              : 'rgba(255,255,255,0.1)',
            color: input.trim() ? '#1a1a2e' : 'rgba(255,255,255,0.3)',
            fontWeight: 700,
            fontSize: 15,
            cursor: input.trim() ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s ease',
          }}
        >
          发送
        </button>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
          ⏱ {Math.ceil(countdown)}秒
        </span>
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
          {input.length}/200
        </span>
      </div>
      <CountdownBar countdown={countdown} maxTime={60} />
    </div>
  );
}

export default function Stage() {
  const room = useAppStore((s) => s.room);
  const currentUser = useAppStore((s) => s.currentUser);
  const displayedScenePrompt = useAppStore((s) => s.displayedScenePrompt);
  const linesEndRef = useRef<HTMLDivElement>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const prevPhaseRef = useRef<string>('');

  useEffect(() => {
    if (linesEndRef.current) {
      linesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [room?.lines.length]);

  useEffect(() => {
    if (room?.phase === 'finished' && prevPhaseRef.current === 'playing') {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2000);
    }
    prevPhaseRef.current = room?.phase ?? '';
  }, [room?.phase]);

  if (!room) return null;

  const isMyTurn = room.currentTurnUserId === currentUser?.id;
  const currentPerformer = room.users.find((u) => u.id === room.currentTurnUserId);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      padding: 16,
      gap: 16,
      overflow: 'hidden',
    }}>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {showConfetti && <ConfettiOverlay />}

      <TypewriterBanner text={displayedScenePrompt} />

      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 16,
        flexWrap: 'wrap',
        padding: '8px 0',
      }}>
        {room.users.map((user) => (
          <AvatarRing
            key={user.id}
            userId={user.id}
            nickname={user.nickname}
            emoji={user.emoji}
            isCurrentTurn={room.currentTurnUserId === user.id}
            avatarColor={user.avatarColor}
          />
        ))}
      </div>

      {room.phase === 'playing' && (
        <div style={{
          textAlign: 'center',
          padding: '8px 0',
          color: isMyTurn ? '#FFD700' : 'rgba(255,255,255,0.6)',
          fontSize: isMyTurn ? 16 : 14,
          fontWeight: isMyTurn ? 700 : 400,
          animation: isMyTurn ? 'breatheText 2s ease-in-out infinite' : 'none',
        }}>
          {isMyTurn
            ? '🎤 轮到你了！请输入台词或动作'
            : currentPerformer
              ? `🎤 ${currentPerformer.emoji} ${currentPerformer.nickname} 正在表演...`
              : ''}
        </div>
      )}

      <style>{`
        @keyframes breatheText {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>

      {room.phase === 'finished' ? (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <ScriptView />
        </div>
      ) : (
        <>
          <div style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            padding: '8px 4px',
            paddingRight: 8,
          }}>
            {room.lines.map((line, i) => (
              <LineBubble key={line.id} line={line} index={i} />
            ))}
            <div ref={linesEndRef} />
          </div>

          {room.phase === 'playing' && <InputArea />}
        </>
      )}
    </div>
  );
}
