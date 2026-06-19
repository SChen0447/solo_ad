import { useState, useEffect, useCallback, useRef } from 'react';
import GameBoard from './components/GameBoard';
import ScorePanel from './components/ScorePanel';
import type { WordData, GameResult } from './types';
import { getRandomWords, ROUND_SIZE, POINTS_PER_WORD } from './data/words';

function App() {
  const [roundWords, setRoundWords] = useState<WordData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [roundProgress, setRoundProgress] = useState<boolean[]>([]);
  const [gamePhase, setGamePhase] = useState<'playing' | 'finished'>('playing');
  const [showResult, setShowResult] = useState(false);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [scoreAnimating, setScoreAnimating] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);
  const [loadingNext, setLoadingNext] = useState(false);

  const nextQuestionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const initGame = useCallback(() => {
    const words = getRandomWords(ROUND_SIZE);
    setRoundWords(words);
    setCurrentIndex(0);
    setScore(0);
    setCorrectCount(0);
    setRoundProgress(new Array(ROUND_SIZE).fill(false));
    setGamePhase('playing');
    setShowResult(false);
    setGameResult(null);
    setStartTime(Date.now());
    setLoadingNext(false);
  }, []);

  useEffect(() => {
    initGame();
    return () => {
      if (nextQuestionTimer.current) {
        clearTimeout(nextQuestionTimer.current);
      }
    };
  }, [initGame]);

  const handleCorrect = useCallback(() => {
    setScoreAnimating(true);
    setTimeout(() => setScoreAnimating(false), 200);

    setScore((prev) => prev + POINTS_PER_WORD);
    setCorrectCount((prev) => prev + 1);

    setRoundProgress((prev) => {
      const newProgress = [...prev];
      newProgress[currentIndex] = true;
      return newProgress;
    });

    setLoadingNext(true);
    nextQuestionTimer.current = setTimeout(() => {
      if (currentIndex < ROUND_SIZE - 1) {
        setCurrentIndex((prev) => prev + 1);
        setLoadingNext(false);
      } else {
        const timeSpent = Math.floor((Date.now() - startTime) / 1000);
        const total = ROUND_SIZE;
        const correct = correctCount + 1;
        setGameResult({
          totalScore: score + POINTS_PER_WORD,
          correctCount: correct,
          totalCount: total,
          accuracy: Math.round((correct / total) * 100),
          timeSpent
        });
        setGamePhase('finished');
        setShowResult(true);
      }
    }, 1000);
  }, [currentIndex, correctCount, score, startTime]);

  const handleRestart = useCallback(() => {
    initGame();
  }, [initGame]);

  const currentWord = roundWords[currentIndex];

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#FFF8E7'
      }}
    >
      <header
        style={{
          height: '60px',
          minHeight: '60px',
          backgroundColor: '#F5A623',
          boxShadow: '0 2px 8px rgba(245, 166, 35, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}
      >
        <h1
          style={{
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#fff',
            letterSpacing: '2px'
          }}
        >
          汉字拼拼乐
        </h1>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '20px'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#fff',
              fontSize: '14px'
            }}
          >
            <span>第</span>
            <span style={{ fontWeight: 'bold', fontSize: '18px' }}>
              {currentIndex + 1}
            </span>
            <span>/ {ROUND_SIZE}</span>
          </div>
          <div
            className={scoreAnimating ? 'score-bounce' : ''}
            style={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              padding: '6px 16px',
              borderRadius: '20px',
              color: '#fff',
              fontWeight: 'bold',
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>⭐</span>
            <span>{score}</span>
          </div>
        </div>
      </header>

      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          width: '100%',
          maxWidth: '1000px',
          margin: '0 auto',
          boxSizing: 'border-box'
        }}
      >
        {currentWord && gamePhase === 'playing' && (
          <GameBoard
            key={currentWord.id}
            wordData={currentWord}
            onCorrect={handleCorrect}
            disabled={loadingNext}
          />
        )}
      </main>

      <ScorePanel
        score={score}
        correctCount={correctCount}
        roundProgress={roundProgress}
        scoreAnimating={scoreAnimating}
      />

      {showResult && gameResult && (
        <ResultModal result={gameResult} onRestart={handleRestart} />
      )}
    </div>
  );
}

function ResultModal({
  result,
  onRestart
}: {
  result: GameResult;
  onRestart: () => void;
}) {
  const [displayAccuracy, setDisplayAccuracy] = useState(0);
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (displayAccuracy / 100) * circumference;

  useEffect(() => {
    let startTime: number;
    const duration = 1500;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      setDisplayAccuracy(Math.round(easeProgress * result.accuracy));
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [result.accuracy]);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}
    >
      <div
        className="modal-enter"
        style={{
          backgroundColor: '#fff',
          borderRadius: '16px',
          padding: '40px 32px',
          maxWidth: '420px',
          width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          textAlign: 'center'
        }}
      >
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '48px', marginBottom: '8px' }}>🎉</div>
          <h2
            style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#F5A623',
              marginBottom: '4px'
            }}
          >
            游戏结束！
          </h2>
          <p style={{ color: '#888', fontSize: '14px' }}>真棒！你完成了本轮挑战</p>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: '28px'
          }}
        >
          <div style={{ position: 'relative', width: '120px', height: '120px' }}>
            <svg width="120" height="120" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke="#FFE4B5"
                strokeWidth="10"
              />
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke="#F5A623"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                transform="rotate(-90 60 60)"
                style={{ transition: 'stroke-dashoffset 0.1s linear' }}
              />
            </svg>
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <span style={{ fontSize: '28px', fontWeight: 'bold', color: '#F5A623' }}>
                {displayAccuracy}%
              </span>
              <span style={{ fontSize: '12px', color: '#888' }}>正确率</span>
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
            marginBottom: '28px'
          }}
        >
          <div
            style={{
              backgroundColor: '#FFF8E7',
              borderRadius: '12px',
              padding: '16px 12px'
            }}
          >
            <div style={{ fontSize: '24px', marginBottom: '4px' }}>🏆</div>
            <div
              style={{
                fontSize: '22px',
                fontWeight: 'bold',
                color: '#F5A623',
                marginBottom: '2px'
              }}
            >
              {result.totalScore}
            </div>
            <div style={{ fontSize: '12px', color: '#888' }}>总得分</div>
          </div>
          <div
            style={{
              backgroundColor: '#FFF8E7',
              borderRadius: '12px',
              padding: '16px 12px'
            }}
          >
            <div style={{ fontSize: '24px', marginBottom: '4px' }}>⏱️</div>
            <div
              style={{
                fontSize: '22px',
                fontWeight: 'bold',
                color: '#F5A623',
                marginBottom: '2px'
              }}
            >
              {result.timeSpent}s
            </div>
            <div style={{ fontSize: '12px', color: '#888' }}>用时</div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#E8F5E9',
            borderRadius: '12px',
            padding: '12px',
            marginBottom: '24px',
            display: 'flex',
            justifyContent: 'center',
            gap: '24px'
          }}
        >
          <div>
            <span style={{ fontSize: '14px', color: '#666' }}>答对数：</span>
            <span style={{ fontWeight: 'bold', color: '#4CAF50', fontSize: '18px' }}>
              {result.correctCount}
            </span>
          </div>
          <div>
            <span style={{ fontSize: '14px', color: '#666' }}>总题数：</span>
            <span style={{ fontWeight: 'bold', color: '#333', fontSize: '18px' }}>
              {result.totalCount}
            </span>
          </div>
        </div>

        <button
          onClick={onRestart}
          style={{
            width: '100%',
            padding: '14px',
            backgroundColor: '#F5A623',
            color: '#fff',
            border: 'none',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(245, 166, 35, 0.4)',
            transition: 'transform 0.1s, box-shadow 0.1s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(245, 166, 35, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(245, 166, 35, 0.4)';
          }}
        >
          再来一轮 🚀
        </button>
      </div>
    </div>
  );
}

export default App;
