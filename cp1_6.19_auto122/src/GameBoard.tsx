import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Illustration, IllustrationStyle, GameState, DailyRecord } from './types';
import { generateDailyIllustrations } from './data';
import CardDeck from './CardDeck';
import StyleZonesContainer from './StyleZone';
import ScoreBoard from './ScoreBoard';

const BASE_TIME = 15000;
const CORRECT_SCORE = 10;
const WRONG_SCORE = -5;
const TIMEOUT_SCORE = -3;
const COMBO_BONUS = 5;
const MAX_COMBO_BONUS = 5;
const DIFFICULTY_UP_STREAK = 5;
const DIFFICULTY_DOWN_STREAK = 3;

const getTodayStr = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const GameBoard: React.FC = () => {
  const cards = useMemo(() => generateDailyIllustrations(15), []);
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    combo: 0,
    streak: 0,
    bestScore: 0,
    currentCardIndex: 0,
    timeLeft: BASE_TIME,
    totalTime: BASE_TIME,
    isPlaying: false,
    difficulty: 'normal'
  });

  const [draggedCard, setDraggedCard] = useState<Illustration | null>(null);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [hoveredStyle, setHoveredStyle] = useState<IllustrationStyle | null>(null);
  const [feedbacks, setFeedbacks] = useState<Record<IllustrationStyle, 'correct' | 'wrong' | null>>({
    'ukiyo-e': null,
    'american-retro': null,
    'cyberpunk': null,
    'ink-wash': null,
    'pixel-art': null
  });
  const [gameOver, setGameOver] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const gameAreaRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number>();
  const startTimeRef = useRef<number>(0);
  const initialTimeRef = useRef<number>(BASE_TIME);

  useEffect(() => {
    const savedBest = localStorage.getItem('illust-game-best');
    if (savedBest) {
      setGameState(prev => ({ ...prev, bestScore: parseInt(savedBest, 10) }));
    }
  }, []);

  const getTimeByDifficulty = useCallback((difficulty: GameState['difficulty']) => {
    switch (difficulty) {
      case 'easy': return 20000;
      case 'normal': return 15000;
      case 'hard': return 10000;
    }
  }, []);

  const saveDailyRecord = useCallback((score: number, cardsCompleted: number) => {
    const today = getTodayStr();
    const recordsStr = localStorage.getItem('illust-game-records');
    const records: DailyRecord[] = recordsStr ? JSON.parse(recordsStr) : [];

    const todayRecord = records.find(r => r.date === today);
    if (todayRecord) {
      todayRecord.score = Math.max(todayRecord.score, score);
      todayRecord.bestScore = Math.max(todayRecord.bestScore, score);
      todayRecord.averageScore = Math.round(
        (todayRecord.averageScore * 0.7 + score * 0.3)
      );
      todayRecord.cardsCompleted = Math.max(todayRecord.cardsCompleted, cardsCompleted);
    } else {
      records.push({
        date: today,
        score,
        averageScore: score,
        bestScore: score,
        cardsCompleted
      });
    }

    const last7Days = records
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 7);

    localStorage.setItem('illust-game-records', JSON.stringify(last7Days));
  }, []);

  const startGame = useCallback(() => {
    setGameState({
      score: 0,
      combo: 0,
      streak: 0,
      bestScore: parseInt(localStorage.getItem('illust-game-best') || '0', 10),
      currentCardIndex: 0,
      timeLeft: BASE_TIME,
      totalTime: BASE_TIME,
      isPlaying: true,
      difficulty: 'normal'
    });
    setGameOver(false);
    initialTimeRef.current = BASE_TIME;
    startTimeRef.current = Date.now();
  }, []);

  const nextCard = useCallback(() => {
    setGameState(prev => {
      const nextIndex = prev.currentCardIndex + 1;
      if (nextIndex >= cards.length) {
        const finalScore = prev.score;
        if (finalScore > prev.bestScore) {
          localStorage.setItem('illust-game-best', String(finalScore));
        }
        saveDailyRecord(finalScore, nextIndex);
        setGameOver(true);
        return { ...prev, isPlaying: false };
      }
      const time = getTimeByDifficulty(prev.difficulty);
      initialTimeRef.current = time;
      startTimeRef.current = Date.now();
      return {
        ...prev,
        currentCardIndex: nextIndex,
        timeLeft: time,
        totalTime: time
      };
    });
  }, [cards.length, getTimeByDifficulty, saveDailyRecord]);

  const handleCorrect = useCallback((style: IllustrationStyle) => {
    setFeedbacks(prev => ({ ...prev, [style]: 'correct' }));

    setGameState(prev => {
      const newCombo = prev.combo + 1;
      const bonus = Math.min(newCombo - 1, MAX_COMBO_BONUS) * COMBO_BONUS;
      const newScore = prev.score + CORRECT_SCORE + (newCombo > 1 ? bonus : 0);
      const newStreak = prev.streak + 1;

      let newDifficulty = prev.difficulty;
      if (newStreak >= DIFFICULTY_UP_STREAK && prev.difficulty !== 'hard') {
        newDifficulty = prev.difficulty === 'easy' ? 'normal' : 'hard';
      }

      const newBest = Math.max(prev.bestScore, newScore);
      if (newBest > prev.bestScore) {
        localStorage.setItem('illust-game-best', String(newBest));
      }

      return {
        ...prev,
        score: newScore,
        combo: newCombo,
        streak: newStreak,
        bestScore: newBest,
        difficulty: newDifficulty
      };
    });

    setTimeout(() => {
      nextCard();
    }, 500);
  }, [nextCard]);

  const handleWrong = useCallback((style: IllustrationStyle) => {
    setFeedbacks(prev => ({ ...prev, [style]: 'wrong' }));

    setGameState(prev => {
      const newStreak = prev.streak - 1;
      let newDifficulty = prev.difficulty;
      if (Math.abs(newStreak) >= DIFFICULTY_DOWN_STREAK && prev.difficulty !== 'easy') {
        newDifficulty = prev.difficulty === 'hard' ? 'normal' : 'easy';
      }

      return {
        ...prev,
        score: Math.max(0, prev.score + WRONG_SCORE),
        combo: 0,
        streak: Math.min(0, newStreak),
        difficulty: newDifficulty
      };
    });
  }, []);

  const handleTimeout = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      score: Math.max(0, prev.score + TIMEOUT_SCORE),
      combo: 0,
      streak: Math.min(0, prev.streak - 1)
    }));
    nextCard();
  }, [nextCard]);

  useEffect(() => {
    if (!gameState.isPlaying) {
      if (timerRef.current) {
        cancelAnimationFrame(timerRef.current);
      }
      return;
    }

    const updateTimer = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = initialTimeRef.current - elapsed;

      if (remaining <= 0) {
        handleTimeout();
        return;
      }

      setGameState(prev => ({ ...prev, timeLeft: remaining }));
      timerRef.current = requestAnimationFrame(updateTimer);
    };

    timerRef.current = requestAnimationFrame(updateTimer);

    return () => {
      if (timerRef.current) {
        cancelAnimationFrame(timerRef.current);
      }
    };
  }, [gameState.isPlaying, gameState.currentCardIndex, handleTimeout]);

  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent, card: Illustration) => {
    if (!gameState.isPlaying) return;
    if (card.id !== cards[gameState.currentCardIndex].id) return;

    e.preventDefault();
    setDraggedCard(card);

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragPos({ x: clientX, y: clientY });
  }, [gameState.isPlaying, gameState.currentCardIndex, cards]);

  const handleDragMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!draggedCard) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragPos({ x: clientX, y: clientY });

    if (gameAreaRef.current) {
      const zones = gameAreaRef.current.querySelectorAll('.style-zone');
      let foundStyle: IllustrationStyle | null = null;

      zones.forEach((zoneEl) => {
        const zoneRect = zoneEl.getBoundingClientRect();
        if (
          clientX >= zoneRect.left &&
          clientX <= zoneRect.right &&
          clientY >= zoneRect.top &&
          clientY <= zoneRect.bottom
        ) {
          const styleNames: Record<string, IllustrationStyle> = {
            '浮世绘': 'ukiyo-e',
            '美式复古': 'american-retro',
            '赛博朋克': 'cyberpunk',
            '水墨风': 'ink-wash',
            '像素风': 'pixel-art'
          };
          const nameEl = zoneEl.querySelector('.zone-name');
          if (nameEl && nameEl.textContent) {
            foundStyle = styleNames[nameEl.textContent] || null;
          }
        }
      });

      setHoveredStyle(foundStyle);
    }
  }, [draggedCard]);

  const handleDragEnd = useCallback(() => {
    if (!draggedCard || !gameState.isPlaying) {
      setDraggedCard(null);
      setHoveredStyle(null);
      return;
    }

    if (hoveredStyle) {
      if (draggedCard.style === hoveredStyle) {
        handleCorrect(hoveredStyle);
      } else {
        handleWrong(hoveredStyle);
      }
    }

    setDraggedCard(null);
    setHoveredStyle(null);
  }, [draggedCard, hoveredStyle, gameState.isPlaying, handleCorrect, handleWrong]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => handleDragMove(e);
    const handleMouseUp = () => handleDragEnd();
    const handleTouchMove = (e: TouchEvent) => handleDragMove(e);
    const handleTouchEnd = () => handleDragEnd();

    if (draggedCard) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [draggedCard, handleDragMove, handleDragEnd]);

  const handleFeedbackEnd = useCallback((style: IllustrationStyle) => {
    setFeedbacks(prev => ({ ...prev, [style]: null }));
  }, []);

  return (
    <div className="game-container" ref={gameAreaRef}>
      <div className="game-header">
        <h1 className="game-title">插画风格识别训练</h1>
        <div className="header-actions">
          <button className="btn-history" onClick={() => setShowHistory(!showHistory)}>
            📊 历史记录
          </button>
        </div>
      </div>

      <ScoreBoard
        score={gameState.score}
        combo={gameState.combo}
        bestScore={gameState.bestScore}
        timeLeft={gameState.timeLeft}
        totalTime={gameState.totalTime}
      />

      {!gameState.isPlaying && !gameOver && (
        <div className="start-screen">
          <h2>欢迎来到插画风格训练</h2>
          <p>将左侧插画卡片拖放到右侧对应的风格区域</p>
          <p className="difficulty-hint">
            难度: {gameState.difficulty === 'easy' ? '简单' : gameState.difficulty === 'normal' ? '普通' : '困难'}
          </p>
          <button className="btn-start" onClick={startGame}>
            开始游戏
          </button>
        </div>
      )}

      {gameOver && (
        <div className="start-screen">
          <h2>🎉 挑战完成！</h2>
          <p className="final-score">最终得分: {gameState.score}</p>
          <p>最佳记录: {gameState.bestScore}</p>
          <button className="btn-start" onClick={startGame}>
            再来一局
          </button>
        </div>
      )}

      {showHistory && <HistoryPanel onClose={() => setShowHistory(false)} />}

      {gameState.isPlaying && (
        <div className="game-main">
          <div className="game-left">
            <CardDeck
              cards={cards}
              currentIndex={gameState.currentCardIndex}
              onDragStart={handleDragStart}
              draggedCardId={draggedCard?.id || null}
            />
          </div>
          <div className="game-right">
            <StyleZonesContainer
              onZoneHover={setHoveredStyle}
              feedbacks={feedbacks}
              onFeedbackEnd={handleFeedbackEnd}
            />
          </div>
        </div>
      )}

      {draggedCard && (
        <div
          className="dragged-card"
          style={{
            left: dragPos.x - 50,
            top: dragPos.y - 40,
            background: draggedCard.imageUrl
          }}
        >
          <div className="card-title">{draggedCard.title}</div>
        </div>
      )}
    </div>
  );
};

const HistoryPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [records, setRecords] = useState<DailyRecord[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('illust-game-records');
    if (saved) {
      setRecords(JSON.parse(saved).reverse());
    }
  }, []);

  const maxScore = Math.max(...records.map(r => r.bestScore), 100);

  return (
    <div className="history-overlay" onClick={onClose}>
      <div className="history-panel" onClick={e => e.stopPropagation()}>
        <div className="history-header">
          <h3>近7天记录</h3>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>
        <div className="chart-container">
          <svg className="chart-svg" viewBox="0 0 400 200" preserveAspectRatio="none">
            {records.length > 1 && (
              <>
                <polyline
                  fill="none"
                  stroke="#2ecc71"
                  strokeWidth="2"
                  points={records.map((r, i) => {
                    const x = 30 + (i / (records.length - 1)) * 340;
                    const y = 180 - (r.bestScore / maxScore) * 150;
                    return `${x},${y}`;
                  }).join(' ')}
                />
                <polyline
                  fill="none"
                  stroke="#f1c40f"
                  strokeWidth="2"
                  strokeDasharray="4,4"
                  points={records.map((r, i) => {
                    const x = 30 + (i / (records.length - 1)) * 340;
                    const y = 180 - (r.averageScore / maxScore) * 150;
                    return `${x},${y}`;
                  }).join(' ')}
                />
              </>
            )}
            {records.map((r, i) => {
              const x = 30 + (i / Math.max(records.length - 1, 1)) * 340;
              const y = 180 - (r.bestScore / maxScore) * 150;
              return (
                <circle key={r.date} cx={x} cy={y} r="4" fill="#2ecc71" />
              );
            })}
          </svg>
          <div className="chart-legend">
            <span><i style={{ background: '#2ecc71' }} /> 最佳分</span>
            <span><i style={{ background: '#f1c40f' }} /> 平均分</span>
          </div>
        </div>
        <div className="history-list">
          {records.length === 0 ? (
            <p className="no-record">暂无记录</p>
          ) : (
            records.map(record => (
              <div key={record.date} className="history-item">
                <span className="record-date">{record.date}</span>
                <span className="record-score">最佳: {record.bestScore}</span>
                <span className="record-score avg">平均: {record.averageScore}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default GameBoard;
