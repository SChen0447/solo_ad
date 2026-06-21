import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PlayerPanel from './components/PlayerPanel';
import EventDeck from './components/EventDeck';
import {
  createPlayer,
  addBaseScore,
  applyEventEffect,
  generateEvent,
  startNewRound,
  rankPlayers,
  getHighestSingleRound,
  shuffleColors,
  type Player,
  type GameEvent,
} from './utils/gameLogic';

type GamePhase = 'setup' | 'playing' | 'result';

interface StardustParticle {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
}

const TOTAL_ROUNDS = 3;

const App: React.FC = () => {
  const [phase, setPhase] = useState<GamePhase>('setup');
  const [playerNames, setPlayerNames] = useState<string[]>(['', '']);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentRound, setCurrentRound] = useState(1);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [activeEvent, setActiveEvent] = useState<GameEvent | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [stardustParticles] = useState<StardustParticle[]>(() =>
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      delay: Math.random() * 2,
    }))
  );

  const chartCanvasRef = useRef<HTMLCanvasElement>(null);
  const chartRafRef = useRef<number | null>(null);
  const chartLastDrawRef = useRef<number>(0);

  const handleAddPlayer = () => {
    if (playerNames.length < 4) {
      setPlayerNames([...playerNames, '']);
    }
  };

  const handleRemovePlayer = (index: number) => {
    if (playerNames.length > 2) {
      setPlayerNames(playerNames.filter((_, i) => i !== index));
    }
  };

  const handleNameChange = (index: number, value: string) => {
    const newNames = [...playerNames];
    newNames[index] = value;
    setPlayerNames(newNames);
  };

  const canStartGame = playerNames.every((name) => name.trim().length > 0) && playerNames.length >= 2 && playerNames.length <= 4;

  const handleStartGame = () => {
    if (!canStartGame) return;
    const colors = shuffleColors(playerNames.length);
    const newPlayers = playerNames.map((name, i) => {
      const player = createPlayer(name.trim(), i);
      player.color = colors[i];
      player.roundScores = [0];
      return player;
    });
    setPlayers(newPlayers);
    setCurrentRound(1);
    setCurrentPlayerIndex(0);
    setPhase('playing');
  };

  const handleAddScore = useCallback((playerId: string, score: number) => {
    if (isAnimating) return;
    setPlayers((prev) =>
      prev.map((p) => (p.id === playerId ? addBaseScore(p, score) : p))
    );
  }, [isAnimating]);

  const handleEndTurn = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);
    const event = generateEvent();
    setActiveEvent(event);

    setPlayers((prev) =>
      prev.map((p, i) =>
        i === currentPlayerIndex ? applyEventEffect(p, event) : p
      )
    );
  }, [currentPlayerIndex, isAnimating]);

  const handleEventComplete = useCallback(() => {
    setActiveEvent(null);
    setIsAnimating(false);

    setPlayers((currentPlayers) => {
      const nextIndex = currentPlayerIndex + 1;
      if (nextIndex >= currentPlayers.length) {
        if (currentRound >= TOTAL_ROUNDS) {
          setTimeout(() => setPhase('result'), 300);
          return currentPlayers;
        }
        setCurrentRound((r) => r + 1);
        setCurrentPlayerIndex(0);
        return currentPlayers.map((p) => startNewRound(p));
      } else {
        setCurrentPlayerIndex(nextIndex);
        return currentPlayers;
      }
    });
  }, [currentPlayerIndex, currentRound]);

  const handleRestart = () => {
    setPhase('setup');
    setPlayerNames(['', '']);
    setPlayers([]);
    setCurrentRound(1);
    setCurrentPlayerIndex(0);
    setActiveEvent(null);
    setIsAnimating(false);
  };

  useEffect(() => {
    if (phase !== 'result' || !chartCanvasRef.current) return;

    const drawChart = (timestamp: number) => {
      if (timestamp - chartLastDrawRef.current < 200) {
        chartRafRef.current = requestAnimationFrame(drawChart);
        return;
      }
      chartLastDrawRef.current = timestamp;

      const canvas = chartCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      const width = rect.width;
      const height = rect.height;
      const padding = { top: 30, right: 20, bottom: 40, left: 40 };
      const chartWidth = width - padding.left - padding.right;
      const chartHeight = height - padding.top - padding.bottom;

      ctx.clearRect(0, 0, width, height);

      let maxScore = 10;
      players.forEach((p) => {
        const roundMax = Math.max(...p.roundScores, 0);
        if (roundMax > maxScore) maxScore = roundMax;
      });
      maxScore = Math.ceil(maxScore / 5) * 5;

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.font = '11px sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';

      const gridLines = 5;
      for (let i = 0; i <= gridLines; i++) {
        const y = padding.top + (chartHeight / gridLines) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(padding.left + chartWidth, y);
        ctx.stroke();
        const label = Math.round(maxScore - (maxScore / gridLines) * i);
        ctx.textAlign = 'right';
        ctx.fillText(label.toString(), padding.left - 8, y + 4);
      }

      for (let i = 0; i < TOTAL_ROUNDS; i++) {
        const x = padding.left + (chartWidth / (TOTAL_ROUNDS - 1)) * i;
        ctx.textAlign = 'center';
        ctx.fillText(`第${i + 1}轮`, x, height - padding.bottom + 20);
      }

      players.forEach((player) => {
        const points: { x: number; y: number }[] = [];
        for (let i = 0; i < TOTAL_ROUNDS; i++) {
          const score = player.roundScores[i] || 0;
          const x = padding.left + (chartWidth / (TOTAL_ROUNDS - 1)) * i;
          const y = padding.top + chartHeight - (score / maxScore) * chartHeight;
          points.push({ x, y });
        }

        if (points.length >= 2) {
          ctx.beginPath();
          ctx.moveTo(points[0].x, padding.top + chartHeight);
          points.forEach((p, idx) => {
            if (idx === 0) {
              ctx.lineTo(p.x, p.y);
            } else {
              const prev = points[idx - 1];
              const cpx = (prev.x + p.x) / 2;
              ctx.bezierCurveTo(cpx, prev.y, cpx, p.y, p.x, p.y);
            }
          });
          ctx.lineTo(points[points.length - 1].x, padding.top + chartHeight);
          ctx.closePath();
          const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight);
          gradient.addColorStop(0, player.color + '66');
          gradient.addColorStop(1, player.color + '05');
          ctx.fillStyle = gradient;
          ctx.fill();
        }

        ctx.beginPath();
        ctx.strokeStyle = player.color;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        points.forEach((p, idx) => {
          if (idx === 0) {
            ctx.moveTo(p.x, p.y);
          } else {
            const prev = points[idx - 1];
            const cpx = (prev.x + p.x) / 2;
            ctx.bezierCurveTo(cpx, prev.y, cpx, p.y, p.x, p.y);
          }
        });
        ctx.stroke();

        points.forEach((p) => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
          ctx.fillStyle = player.color;
          ctx.fill();
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.stroke();
        });
      });

      const legendX = padding.left;
      const legendY = height - 10;
      let legendOffset = 0;
      players.forEach((player) => {
        ctx.fillStyle = player.color;
        ctx.fillRect(legendX + legendOffset, legendY - 8, 12, 12);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(player.name, legendX + legendOffset + 16, legendY);
        legendOffset += ctx.measureText(player.name).width + 40;
      });

      chartRafRef.current = requestAnimationFrame(drawChart);
    };

    chartRafRef.current = requestAnimationFrame(drawChart);

    return () => {
      if (chartRafRef.current) {
        cancelAnimationFrame(chartRafRef.current);
      }
    };
  }, [phase, players]);

  const rankings = phase === 'result' ? rankPlayers(players) : [];

  const renderSetup = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      style={{
        maxWidth: '480px',
        width: '90%',
        margin: '0 auto',
        padding: '40px 30px',
        background: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderRadius: '20px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
      }}
    >
      <motion.h1
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        style={{
          textAlign: 'center',
          fontSize: '32px',
          fontWeight: 'bold',
          marginBottom: '8px',
          background: 'linear-gradient(135deg, #8E2DE2, #4A00E0)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        🎲 桌面游戏积分追踪
      </motion.h1>
      <motion.p
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        style={{
          textAlign: 'center',
          color: 'rgba(255, 255, 255, 0.6)',
          marginBottom: '30px',
          fontSize: '14px',
        }}
      >
        支持 2-4 人参与 · 共进行 {TOTAL_ROUNDS} 轮 · 随机事件增加趣味
      </motion.p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        <AnimatePresence>
          {playerNames.map((name, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: 0.1 + index * 0.05 }}
              style={{ display: 'flex', gap: '10px', alignItems: 'center' }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: shuffleColors(playerNames.length)[index],
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontSize: '16px',
                  color: '#fff',
                  flexShrink: 0,
                }}
              >
                {index + 1}
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => handleNameChange(index, e.target.value)}
                placeholder={`玩家 ${index + 1} 昵称`}
                maxLength={12}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: '#fff',
                  fontSize: '15px',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#8E2DE2')}
                onBlur={(e) => (e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)')}
              />
              {playerNames.length > 2 && (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleRemovePlayer(index)}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    border: 'none',
                    background: 'rgba(245, 101, 101, 0.2)',
                    color: '#f56565',
                    fontSize: '18px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  ×
                </motion.button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        {playerNames.length < 4 && (
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleAddPlayer}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '10px',
              border: '2px dashed rgba(255, 255, 255, 0.2)',
              background: 'transparent',
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            + 添加玩家
          </motion.button>
        )}
      </div>

      <motion.button
        whileHover={{ scale: canStartGame ? 1.03 : 1 }}
        whileTap={{ scale: canStartGame ? 0.97 : 1 }}
        onClick={handleStartGame}
        disabled={!canStartGame}
        style={{
          width: '100%',
          padding: '14px 24px',
          borderRadius: '12px',
          border: 'none',
          fontSize: '17px',
          fontWeight: 'bold',
          cursor: canStartGame ? 'pointer' : 'not-allowed',
          background: canStartGame
            ? 'linear-gradient(135deg, #8E2DE2 0%, #4A00E0 100%)'
            : 'rgba(255, 255, 255, 0.1)',
          color: canStartGame ? '#fff' : 'rgba(255, 255, 255, 0.4)',
          boxShadow: canStartGame ? '0 8px 30px rgba(138, 43, 226, 0.4)' : 'none',
          transition: 'all 0.2s ease',
        }}
      >
        🚀 开始游戏
      </motion.button>
    </motion.div>
  );

  const renderPlaying = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ width: '100%', maxWidth: '1100px', margin: '0 auto', padding: '20px' }}
    >
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          padding: '16px 24px',
          background: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderRadius: '14px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
          🎯 第 <span style={{ color: '#8E2DE2' }}>{currentRound}</span> / {TOTAL_ROUNDS} 轮
        </div>
        <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px' }}>
          当前: <span style={{ color: players[currentPlayerIndex]?.color, fontWeight: 'bold' }}>{players[currentPlayerIndex]?.name}</span> 的回合
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {Array.from({ length: TOTAL_ROUNDS }, (_, i) => (
            <div
              key={i}
              style={{
                width: '24px',
                height: '8px',
                borderRadius: '4px',
                background: i < currentRound ? 'linear-gradient(90deg, #8E2DE2, #4A00E0)' : 'rgba(255,255,255,0.15)',
              }}
            />
          ))}
        </div>
      </motion.div>

      <motion.div
        layout
        style={{
          display: 'flex',
          gap: '16px',
          flexWrap: 'wrap',
          marginBottom: '24px',
        }}
      >
        {players.map((player, index) => (
          <PlayerPanel
            key={player.id}
            player={player}
            isActive={!isAnimating}
            isCurrentTurn={index === currentPlayerIndex && !isAnimating}
            onEndTurn={handleEndTurn}
            onAddScore={(score) => handleAddScore(player.id, score)}
          />
        ))}
      </motion.div>

      <div style={{ textAlign: 'center', color: 'rgba(255, 255, 255, 0.5)', fontSize: '13px' }}>
        💡 提示：点击"+1/+2/+3"为当前玩家添加基础积分，完成后点击"回合结束"触发随机事件
      </div>

      <EventDeck event={activeEvent} onAnimationComplete={handleEventComplete} />
    </motion.div>
  );

  const renderResult = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ width: '100%', maxWidth: '900px', margin: '0 auto', padding: '20px' }}
    >
      <motion.h1
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        style={{
          textAlign: 'center',
          fontSize: '36px',
          fontWeight: 'bold',
          marginBottom: '30px',
          background: 'linear-gradient(135deg, #FFE66D, #FF6B6B)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        🏆 游戏结束 · 最终排名
      </motion.h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
        <AnimatePresence>
          {rankings.map((ranking, idx) => (
            <motion.div
              key={ranking.player.id}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              style={{
                position: 'relative',
                padding: '20px 24px',
                background: 'rgba(255, 255, 255, 0.08)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                borderRadius: '14px',
                border: ranking.rank === 1 ? '2px solid #FFE66D' : '2px solid transparent',
                boxShadow: ranking.rank === 1 ? '0 0 30px rgba(255, 230, 109, 0.3)' : 'none',
                overflow: 'hidden',
              }}
            >
              {ranking.rank === 1 &&
                stardustParticles.map((p) => (
                  <motion.div
                    key={p.id}
                    animate={{
                      opacity: [0, 1, 0],
                      scale: [0.5, 1, 0.5],
                    }}
                    transition={{
                      duration: 2,
                      delay: p.delay,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                    style={{
                      position: 'absolute',
                      left: `${p.x}%`,
                      top: `${p.y}%`,
                      width: `${p.size}px`,
                      height: `${p.size}px`,
                      borderRadius: '50%',
                      background: '#FFE66D',
                      boxShadow: '0 0 6px #FFE66D',
                      pointerEvents: 'none',
                    }}
                  />
                ))}

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: ranking.rank === 1
                      ? 'linear-gradient(135deg, #FFE66D, #FFA500)'
                      : ranking.rank === 2
                      ? 'linear-gradient(135deg, #C0C0C0, #808080)'
                      : ranking.rank === 3
                      ? 'linear-gradient(135deg, #CD7F32, #8B4513)'
                      : 'rgba(255,255,255,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    fontWeight: 'bold',
                    color: ranking.rank <= 3 ? '#fff' : 'rgba(255,255,255,0.7)',
                    flexShrink: 0,
                  }}
                >
                  {ranking.rank === 1 ? '🥇' : ranking.rank === 2 ? '🥈' : ranking.rank === 3 ? '🥉' : ranking.rank}
                </div>

                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: `radial-gradient(circle at 30% 30%, ${ranking.player.color}, ${ranking.player.color}88)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: '18px',
                    color: '#fff',
                    flexShrink: 0,
                  }}
                >
                  {ranking.player.name.charAt(0).toUpperCase()}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '4px' }}>
                    {ranking.player.name}
                  </div>
                  <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <span>最高单轮: {getHighestSingleRound(ranking.player)}</span>
                    <span>触发事件: {ranking.player.eventCounts}次</span>
                  </div>
                </div>

                <div
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '36px',
                    fontWeight: 'bold',
                    color: ranking.rank === 1 ? '#FFE66D' : '#fff',
                    textShadow: ranking.rank === 1 ? '0 0 15px rgba(255, 230, 109, 0.6)' : '0 0 8px rgba(255,255,255,0.3)',
                    textAlign: 'right',
                    flexShrink: 0,
                  }}
                >
                  {ranking.player.score}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        style={{
          padding: '24px',
          background: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderRadius: '14px',
          marginBottom: '24px',
        }}
      >
        <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>
          📊 各轮积分趋势
        </div>
        <canvas
          ref={chartCanvasRef}
          style={{ width: '100%', height: '280px', display: 'block' }}
        />
      </motion.div>

      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleRestart}
          style={{
            padding: '14px 40px',
            borderRadius: '12px',
            border: 'none',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            background: 'linear-gradient(135deg, #8E2DE2 0%, #4A00E0 100%)',
            color: '#fff',
            boxShadow: '0 8px 30px rgba(138, 43, 226, 0.4)',
          }}
        >
          🔄 再来一局
        </motion.button>
      </div>
    </motion.div>
  );

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: phase === 'setup' ? 'center' : 'flex-start',
        justifyContent: 'center',
        padding: phase === 'setup' ? '20px' : '0',
      }}
    >
      <AnimatePresence mode="wait">
        {phase === 'setup' && (
          <div key="setup" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {renderSetup()}
          </div>
        )}
        {phase === 'playing' && (
          <div key="playing" style={{ width: '100%', paddingTop: '20px' }}>
            {renderPlaying()}
          </div>
        )}
        {phase === 'result' && (
          <div key="result" style={{ width: '100%', paddingTop: '30px', paddingBottom: '40px' }}>
            {renderResult()}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
