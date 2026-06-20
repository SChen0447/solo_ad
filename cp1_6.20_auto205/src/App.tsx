import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GameBoard, { type GameStats } from './GameBoard';
import Leaderboard from './Leaderboard';
import { audioEngine } from './AudioEngine';

type Screen = 'menu' | 'playing' | 'ended';

function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [stats, setStats] = useState<GameStats | null>(null);
  const [gameKey, setGameKey] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const startGame = () => {
    audioEngine.init();
    setStats(null);
    setGameKey((k) => k + 1);
    setScreen('playing');
  };

  const handleGameOver = (s: GameStats) => {
    setStats(s);
    setTimeout(() => setScreen('ended'), 100);
  };

  const handleRestart = () => {
    setScreen('menu');
  };

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <AnimatePresence mode="wait">
        {screen === 'menu' && (
          <MenuScreen key="menu" isMobile={isMobile} onStart={startGame} />
        )}
        {screen === 'playing' && (
          <GameBoard key={`board-${gameKey}`} onGameOver={handleGameOver} />
        )}
        {screen === 'ended' && stats && (
          <Leaderboard
            key="leaderboard"
            stats={stats}
            onRestart={handleRestart}
            isMobile={isMobile}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuScreen({ isMobile, onStart }: { isMobile: boolean; onStart: () => void }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: 'linear-gradient(160deg, #0a0a2e 0%, #1a1a3e 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? 20 : 40,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <FloatingShapes />

      <motion.div
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        style={{ textAlign: 'center', zIndex: 5, maxWidth: 560 }}
      >
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          style={{ fontSize: isMobile ? 56 : 88, marginBottom: 8 }}
        >
          🏃
        </motion.div>
        <motion.h1
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          style={{
            fontSize: isMobile ? 32 : 52,
            fontWeight: 900,
            color: '#fff',
            marginBottom: 10,
            background: 'linear-gradient(135deg, #6a11cb 0%, #2575fc 50%, #ffd700 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: 2,
          }}
        >
          迷宫逃脱跑酷
        </motion.h1>
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          style={{
            color: '#a0a0c0',
            fontSize: isMobile ? 13 : 15,
            marginBottom: 32,
            lineHeight: 1.6,
          }}
        >
          在随机生成的迷宫中躲避尖刺，收集能量碎片，挑战通关 5 关！
          <br />
          <span style={{ color: '#ffd700' }}>WASD</span> 或 <span style={{ color: '#ffd700' }}>方向键</span> 控制移动
        </motion.p>

        <motion.div
          initial={{ y: 30, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ delay: 0.45, type: 'spring', damping: 20 }}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 12,
            marginBottom: 28,
            maxWidth: 480,
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          <Feature icon="🧩" title="随机迷宫" desc="8x8 递归回溯算法生成" />
          <Feature icon="⚡" title="能量碎片" desc="收集10颗增加积分" />
          <Feature icon="💀" title="动态尖刺" desc="关卡越多速度越快" />
          <Feature icon="🏆" title="排行榜" desc="争夺 Top 10 名次" />
        </motion.div>

        <motion.button
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, type: 'spring', damping: 22 }}
          whileHover={{ scale: 1.08, boxShadow: '0 16px 50px rgba(106,17,203,0.7)' }}
          whileTap={{ scale: 0.95 }}
          onClick={onStart}
          style={{
            background: 'linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)',
            color: '#fff',
            border: 'none',
            padding: isMobile ? '16px 44px' : '18px 60px',
            borderRadius: 12,
            fontSize: isMobile ? 18 : 22,
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 10px 30px rgba(106,17,203,0.45)',
            letterSpacing: 2,
          }}
        >
          🎮 开始游戏
        </motion.button>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          style={{
            marginTop: 24,
            color: '#707090',
            fontSize: 11,
          }}
        >
          共 5 关 · 3 条命 · 努力创造新纪录吧！
        </motion.div>
      </motion.div>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      style={{
        background: 'rgba(255,255,255,0.06)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        padding: 14,
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 28, marginBottom: 6 }}>{icon}</div>
      <div style={{ color: '#fff', fontWeight: 600, fontSize: 13, marginBottom: 3 }}>{title}</div>
      <div style={{ color: '#8888aa', fontSize: 11 }}>{desc}</div>
    </motion.div>
  );
}

function FloatingShapes() {
  const shapes = Array.from({ length: 14 }).map((_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 20 + Math.random() * 40,
    duration: 8 + Math.random() * 12,
    delay: Math.random() * 6,
    color: ['#6a11cb', '#2575fc', '#ffd700', '#ff6b6b', '#4ecdc4'][i % 5],
  }));

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {shapes.map((s) => (
        <motion.div
          key={s.id}
          animate={{
            y: [0, -30, 0],
            x: [0, 15, 0],
            rotate: [0, 180, 360],
            opacity: [0.12, 0.28, 0.12],
          }}
          transition={{
            duration: s.duration,
            repeat: Infinity,
            delay: s.delay,
            ease: 'easeInOut',
          }}
          style={{
            position: 'absolute',
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
            borderRadius: s.id % 2 === 0 ? '50%' : 8,
            background: s.color,
            opacity: 0.15,
            filter: 'blur(4px)',
          }}
        />
      ))}
    </div>
  );
}

export default App;
