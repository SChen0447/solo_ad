import React, { useState, useEffect, useCallback, useRef } from 'react';
import DrawingCanvas from '../components/DrawingCanvas';
import GuessPanel from '../components/GuessPanel';
import ScoreBoard from '../components/ScoreBoard';
import {
  connectSocket,
  onRoundStart,
  onGuessResult,
  onTimerUpdate,
  onRoundEnd,
  onGameEnd,
  onDrawStroke,
  onDrawUndo,
  GuessRecord,
  RoundResult,
  PlayerInfo,
  DrawStroke,
} from '../socket';

interface GamePageProps {
  roomId: string;
  playerId: string;
  onExit: () => void;
}

const ROUND_DURATION = 30;
const INTER_ROUND_DURATION = 10;

export default function GamePage({ roomId, playerId, onExit }: GamePageProps) {
  const [roundNumber, setRoundNumber] = useState(0);
  const [totalRounds] = useState(3);
  const [currentDrawer, setCurrentDrawer] = useState('');
  const [currentWord, setCurrentWord] = useState('');
  const [timeLeft, setTimeLeft] = useState(ROUND_DURATION);
  const [difficulty, setDifficulty] = useState('easy');
  const [guesses, setGuesses] = useState<GuessRecord[]>([]);
  const [showScoreBoard, setShowScoreBoard] = useState(false);
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);
  const [interCountdown, setInterCountdown] = useState(0);
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [phase, setPhase] = useState<'drawing' | 'roundEnd' | 'gameEnd'>('drawing');
  const [flashTimer, setFlashTimer] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);

  const isDrawer = currentDrawer === playerId;
  const drawerNickname = players.find(p => p.id === currentDrawer)?.nickname ?? '画师';

  useEffect(() => {
    connectSocket();

    const unsub1 = onRoundStart((data) => {
      setRoundNumber(data.roundNumber);
      setCurrentDrawer(data.drawer);
      setCurrentWord(data.word);
      setTimeLeft(data.timeLeft);
      setDifficulty(data.difficulty);
      setGuesses([]);
      setShowScoreBoard(false);
      setRoundResult(null);
      setPhase('drawing');
      setFlashTimer(false);
    });

    const unsub2 = onGuessResult((data) => {
      setGuesses(prev => [...prev, data]);
    });

    const unsub3 = onTimerUpdate((t) => {
      setTimeLeft(t);
      if (t <= 5) {
        setFlashTimer(true);
      } else {
        setFlashTimer(false);
      }
    });

    const unsub4 = onRoundEnd((data) => {
      setRoundResult(data);
      setPlayers(data.players);
      setShowScoreBoard(true);
      setPhase('roundEnd');
      setInterCountdown(INTER_ROUND_DURATION);
    });

    const unsub5 = onGameEnd((data) => {
      setPlayers(data.players);
      setPhase('gameEnd');
      setGameEnded(true);
    });

    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
      unsub5();
    };
  }, [playerId]);

  useEffect(() => {
    if (phase !== 'roundEnd' || interCountdown <= 0) return;
    const t = setTimeout(() => {
      setInterCountdown(prev => {
        const next = prev - 1;
        if (next <= 0) {
          setShowScoreBoard(false);
        }
        return next;
      });
    }, 1000);
    return () => clearTimeout(t);
  }, [phase, interCountdown]);

  const progressPercent = (timeLeft / ROUND_DURATION) * 100;
  const progressColor = timeLeft > 20 ? '#2ECC71' : timeLeft > 10 ? '#F39C12' : '#E74C3C';

  const wordDisplay = isDrawer
    ? currentWord
    : currentWord.split('').map(() => '＿').join(' ');

  if (gameEnded) {
    const sorted = [...players].sort((a, b) => b.score - a.score);
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1A252C, #2C3E50)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        fontFamily: "'Noto Sans SC', sans-serif",
      }}>
        <div style={{
          background: 'rgba(255,255,255,0.12)',
          borderRadius: '16px',
          padding: '32px',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.2)',
          maxWidth: '400px',
          width: '90%',
          animation: 'fadeIn 0.6s ease',
        }}>
          <h2 style={{ color: '#FFD700', textAlign: 'center', margin: '0 0 20px 0', fontSize: '24px' }}>
            🏆 游戏结束
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {sorted.map((p, i) => (
              <div key={p.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                borderRadius: '10px',
                background: i === 0 ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.06)',
              }}>
                <span style={{ color: i === 0 ? '#FFD700' : '#BDC3C7', fontSize: '18px', fontWeight: 700 }}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                </span>
                <span style={{ color: '#FFFFFF', flex: 1, fontWeight: 600 }}>{p.nickname}</span>
                <span style={{ color: '#2ECC71', fontSize: '18px', fontWeight: 700 }}>{p.score}</span>
              </div>
            ))}
          </div>
          <button
            onClick={onExit}
            style={{
              ...{ padding: '10px 24px', borderRadius: '10px', border: 'none', fontSize: '15px', fontWeight: 700, cursor: 'pointer', transition: 'transform 0.1s' },
              width: '100%',
              marginTop: '20px',
              background: '#8E44AD',
              color: '#FFFFFF',
            }}
            onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.95)')}
            onMouseUp={e => (e.currentTarget.style.transform = '')}
            onMouseLeave={e => (e.currentTarget.style.transform = '')}
          >
            返回大厅
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1A252C, #2C3E50)',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'Noto Sans SC', sans-serif",
      padding: '12px',
      overflow: 'auto',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 16px',
        marginBottom: '8px',
        background: 'rgba(255,255,255,0.08)',
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.15)',
        backdropFilter: 'blur(8px)',
        flexWrap: 'wrap',
        gap: '8px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: '#BDC3C7', fontSize: '13px' }}>
            回合 {roundNumber}/{totalRounds}
          </span>
          <span style={{ color: '#BDC3C7', fontSize: '13px' }}>
            难度: {{ easy: '简单', medium: '中等', hard: '困难' }[difficulty as keyof typeof { easy: string; medium: string; hard: string }] ?? difficulty}
          </span>
        </div>
        <div style={{ color: '#2C3E50', fontSize: isDrawer ? '24px' : '20px', fontWeight: 900, letterSpacing: '4px' }}>
          {wordDisplay}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            color: timeLeft <= 5 ? '#E74C3C' : '#BDC3C7',
            fontSize: '20px',
            fontWeight: 700,
            animation: flashTimer ? 'timerBlink 0.5s infinite' : 'none',
          }}>
            {timeLeft}s
          </span>
        </div>
      </div>

      <div style={{
        width: '100%',
        maxWidth: '600px',
        height: '6px',
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '3px',
        margin: '0 auto 12px auto',
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${progressPercent}%`,
          height: '100%',
          background: `linear-gradient(90deg, #2ECC71, ${progressColor})`,
          borderRadius: '3px',
          transition: 'width 1s linear, background 1s',
        }} />
      </div>

      <div style={{
        flex: 1,
        display: 'flex',
        gap: '16px',
        justifyContent: 'center',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
      }}>
        <div style={{ flex: '1 1 400px', maxWidth: '660px', display: 'flex', justifyContent: 'center' }}>
          <DrawingCanvas isDrawer={isDrawer} width={640} height={480} />
        </div>

        {!isDrawer && (
          <div style={{ flex: '0 1 340px' }}>
            <GuessPanel
              roundNumber={roundNumber}
              drawerNickname={drawerNickname}
              guesses={guesses}
              disabled={phase !== 'drawing'}
            />
          </div>
        )}

        {isDrawer && phase === 'drawing' && (
          <div style={{
            flex: '0 1 280px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            padding: '12px',
            background: 'rgba(255,255,255,0.08)',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.15)',
            backdropFilter: 'blur(8px)',
          }}>
            <h4 style={{ color: '#FFFFFF', margin: '0', fontSize: '14px' }}>猜测动态</h4>
            <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {guesses.map((g, i) => (
                <div key={i} style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  background: 'rgba(255,255,255,0.04)',
                  fontSize: '13px',
                }}>
                  <span style={{ color: '#2E4053', fontWeight: 600 }}>{g.nickname}</span>
                  <span style={{ color: g.isCorrect ? '#27AE60' : '#7F8C8D', marginLeft: '6px' }}>
                    {g.isCorrect ? '猜对了！' : g.content}
                  </span>
                </div>
              ))}
              {guesses.length === 0 && (
                <span style={{ color: '#7F8C8D', fontSize: '12px' }}>等待猜测中...</span>
              )}
            </div>
          </div>
        )}
      </div>

      {showScoreBoard && roundResult && (
        <ScoreBoard result={roundResult} countdown={interCountdown} />
      )}
    </div>
  );
}
