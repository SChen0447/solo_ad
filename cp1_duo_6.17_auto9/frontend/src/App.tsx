import React, { useReducer, useEffect, useCallback, useRef } from 'react';
import { getSocket } from './socket';
import {
  GameState, GameAction, PlayerInfo, RoundStartData, RoundResult,
  PlayerAnswer, GameFinalResult, THEME_OPTIONS, THEME_PALETTES, PLAYER_COLORS,
} from './types';
import GameBoard from './components/GameBoard';
import ScorePanel from './components/ScorePanel';
import ResultPoster from './components/ResultPoster';
import './styles.css';

const initialState: GameState = {
  roomId: '',
  theme: '',
  players: [],
  currentRound: 0,
  totalRounds: 8,
  currentDescriberId: '',
  currentDescriberNickname: '',
  keyword: '',
  forbiddenWords: [],
  phase: 'waiting',
  timeRemaining: 60,
  roundDuration: 60,
  serverTimestamp: 0,
  answers: [],
  roundLogs: [],
  funniestAnswer: null,
  finalResult: null,
  palette: THEME_PALETTES.fantasy,
  lastScoreChangeId: null,
};

type PageView = 'home' | 'room' | 'game' | 'result';

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_ROOM':
      return {
        ...state,
        roomId: action.roomId,
        theme: action.theme,
        players: action.players,
        palette: THEME_PALETTES[action.theme] || THEME_PALETTES.fantasy,
      };
    case 'PLAYER_JOINED':
    case 'PLAYER_LEFT':
      return { ...state, players: action.players };
    case 'GAME_STARTED':
      return { ...state, players: action.players, phase: 'describing' };
    case 'ROUND_START': {
      const d = action.data;
      const localStartTime = performance.now();
      return {
        ...state,
        currentRound: d.round,
        totalRounds: d.totalRounds,
        currentDescriberId: d.describerId,
        currentDescriberNickname: d.describerNickname,
        keyword: d.keyword,
        forbiddenWords: d.forbiddenWords,
        phase: 'answering',
        timeRemaining: d.duration,
        roundDuration: d.duration,
        serverTimestamp: d.serverTimestamp,
        answers: [],
        palette: d.palette || state.palette,
      };
    }
    case 'COUNTDOWN_SYNC':
      return { ...state, timeRemaining: Math.max(0, action.timeRemaining) };
    case 'ANSWER_SUBMITTED':
      return {
        ...state,
        answers: [...state.answers, {
          playerId: action.playerId,
          nickname: action.playerId,
          answer: action.answer,
          correct: null,
        }],
      };
    case 'ROUND_ENDED':
      return { ...state, phase: 'revealing', timeRemaining: 0, answers: action.answers };
    case 'ANSWER_REVEALED': {
      const newAnswers = [...state.answers];
      if (newAnswers[action.answerIndex]) {
        newAnswers[action.answerIndex] = {
          ...newAnswers[action.answerIndex],
          correct: action.correct,
        };
      }
      return { ...state, answers: newAnswers };
    }
    case 'ROUND_RESULT': {
      const log = {
        round: action.result.round,
        keyword: action.result.keyword,
        describerNickname: action.result.describerNickname,
        correctGuessers: action.result.correctGuessers,
      };
      return {
        ...state,
        roundLogs: [...state.roundLogs, log],
        phase: 'roundEnd',
        answers: action.result.answers,
      };
    }
    case 'SCORE_UPDATE':
      return { ...state, players: action.players, lastScoreChangeId: action.changedPlayerId || null };
    case 'GAME_ENDED':
      return {
        ...state,
        phase: 'gameEnd',
        timeRemaining: 0,
        finalResult: action.finalResult,
        funniestAnswer: action.finalResult.funniestAnswer,
      };
    case 'RESET':
      return { ...initialState };
    default:
      return state;
  }
}

function BouncingBalls() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', padding: '24px 0' }}>
      <div className="bounce-ball-1" style={{ width: 16, height: 16, borderRadius: '50%', background: '#FF6B6B' }} />
      <div className="bounce-ball-2" style={{ width: 16, height: 16, borderRadius: '50%', background: '#4ECDC4' }} />
      <div className="bounce-ball-3" style={{ width: 16, height: 16, borderRadius: '50%', background: '#45B7D1' }} />
    </div>
  );
}

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const [page, setPage] = React.useState<PageView>('home');
  const [nickname, setNickname] = React.useState('');
  const [selectedTheme, setSelectedTheme] = React.useState('fantasy');
  const [customWords, setCustomWords] = React.useState('');
  const [joinRoomId, setJoinRoomId] = React.useState('');
  const [myId, setMyId] = React.useState('');
  const [isHost, setIsHost] = React.useState(false);
  const [error, setError] = React.useState('');

  const rafRef = useRef<number | null>(null);
  const roundStartLocalRef = useRef<number>(0);
  const roundDurationRef = useRef<number>(60);
  const logEndRef = useRef<HTMLDivElement>(null);

  const socket = getSocket();

  const stopCountdown = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const tickCountdown = useCallback(() => {
    const elapsed = (performance.now() - roundStartLocalRef.current) / 1000;
    const remaining = Math.max(0, roundDurationRef.current - elapsed);
    dispatch({ type: 'COUNTDOWN_SYNC', timeRemaining: remaining });
    if (remaining > 0 && rafRef.current !== null) {
      rafRef.current = requestAnimationFrame(tickCountdown);
    }
  }, []);

  const startCountdown = useCallback((duration: number) => {
    stopCountdown();
    roundDurationRef.current = duration;
    roundStartLocalRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tickCountdown);
  }, [stopCountdown, tickCountdown]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && state.phase === 'answering') {
        stopCountdown();
        roundStartLocalRef.current = performance.now() - (state.roundDuration - state.timeRemaining) * 1000;
        rafRef.current = requestAnimationFrame(tickCountdown);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      stopCountdown();
    };
  }, [state.phase, state.roundDuration, state.timeRemaining, stopCountdown, tickCountdown]);

  useEffect(() => {
    socket.on('connect', () => {
      setMyId(socket.id || '');
    });

    socket.on('room:created', (data: { roomId: string; player: PlayerInfo; players: PlayerInfo[] }) => {
      dispatch({ type: 'SET_ROOM', roomId: data.roomId, theme: selectedTheme, players: data.players, isHost: true, myId: socket.id || '' });
      setIsHost(true);
      setPage('room');
    });

    socket.on('room:joined', (data: { roomId: string; player: PlayerInfo; players: PlayerInfo[]; theme: string }) => {
      dispatch({ type: 'SET_ROOM', roomId: data.roomId, theme: data.theme, players: data.players, isHost: false, myId: socket.id || '' });
      setPage('room');
    });

    socket.on('room:error', (data: { message: string }) => {
      setError(data.message);
    });

    socket.on('player:joined', (players: PlayerInfo[]) => {
      dispatch({ type: 'PLAYER_JOINED', players });
    });

    socket.on('player:left', (players: PlayerInfo[]) => {
      dispatch({ type: 'PLAYER_LEFT', players });
    });

    socket.on('game:started', (data: { players: PlayerInfo[] }) => {
      dispatch({ type: 'GAME_STARTED', players: data.players });
      setPage('game');
    });

    socket.on('round:start', (data: RoundStartData) => {
      dispatch({ type: 'ROUND_START', data });
      startCountdown(data.duration);
    });

    socket.on('round:ended', (answers: PlayerAnswer[]) => {
      stopCountdown();
      dispatch({ type: 'ROUND_ENDED', answers });
    });

    socket.on('answer:revealed', (data: { answerIndex: number; correct: boolean }) => {
      dispatch({ type: 'ANSWER_REVEALED', answerIndex: data.answerIndex, correct: data.correct });
    });

    socket.on('round:result', (result: RoundResult) => {
      dispatch({ type: 'ROUND_RESULT', result });
    });

    socket.on('score:update', (data: { players: PlayerInfo[]; changedPlayerId?: string }) => {
      dispatch({ type: 'SCORE_UPDATE', players: data.players, changedPlayerId: data.changedPlayerId });
    });

    socket.on('game:ended', (finalResult: GameFinalResult) => {
      stopCountdown();
      dispatch({ type: 'GAME_ENDED', finalResult });
      setPage('result');
    });

    return () => {
      stopCountdown();
      socket.off('connect');
      socket.off('room:created');
      socket.off('room:joined');
      socket.off('room:error');
      socket.off('player:joined');
      socket.off('player:left');
      socket.off('game:started');
      socket.off('round:start');
      socket.off('round:ended');
      socket.off('answer:revealed');
      socket.off('round:result');
      socket.off('score:update');
      socket.off('game:ended');
    };
  }, [socket, selectedTheme, startCountdown, stopCountdown]);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [state.roundLogs]);

  const handleCreateRoom = useCallback(() => {
    if (!nickname.trim()) { setError('请输入昵称'); return; }
    setError('');
    socket.emit('room:create', {
      nickname: nickname.trim(),
      theme: selectedTheme,
      customThemeWords: selectedTheme === 'custom' ? customWords.split(/[,，\n]/).map(s => s.trim()).filter(Boolean) : undefined,
    });
  }, [nickname, selectedTheme, customWords, socket]);

  const handleJoinRoom = useCallback(() => {
    if (!nickname.trim()) { setError('请输入昵称'); return; }
    if (!joinRoomId.trim()) { setError('请输入房间号'); return; }
    setError('');
    socket.emit('room:join', { roomId: joinRoomId.trim(), nickname: nickname.trim() });
  }, [nickname, joinRoomId, socket]);

  const handleStartGame = useCallback(() => {
    socket.emit('game:start', { roomId: state.roomId });
  }, [state.roomId, socket]);

  const handleSkipCountdown = useCallback(() => {
    socket.emit('countdown:skip', { roomId: state.roomId });
  }, [state.roomId, socket]);

  const handleSubmitAnswer = useCallback((answer: string) => {
    socket.emit('answer:submit', { roomId: state.roomId, answer });
  }, [state.roomId, socket]);

  const handleJudgeAnswer = useCallback((answerIndex: number, correct: boolean) => {
    socket.emit('answer:judge', { roomId: state.roomId, answerIndex, correct });
  }, [state.roomId, socket]);

  const bgColor = state.palette && state.palette.length > 0
    ? state.palette[state.currentRound % state.palette.length] || '#FFF8E7'
    : '#FFF8E7';

  if (page === 'result' && state.finalResult) {
    return (
      <div style={{ backgroundColor: bgColor, minHeight: '100vh', transition: 'background-color 0.8s ease-in-out' }}>
        <ResultPoster
          finalResult={state.finalResult}
          funniestAnswer={state.funniestAnswer}
          roomId={state.roomId}
        />
      </div>
    );
  }

  if (page === 'game') {
    return (
      <div style={{
        backgroundColor: bgColor,
        minHeight: '100vh',
        transition: 'background-color 0.8s ease-in-out',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{ display: 'flex', flex: 1, minHeight: 'calc(100vh - 160px)' }}>
          <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
            <GameBoard
              state={state}
              myId={myId}
              isDescriber={myId === state.currentDescriberId}
              isHost={isHost}
              onSubmitAnswer={handleSubmitAnswer}
              onJudgeAnswer={handleJudgeAnswer}
              onSkipCountdown={handleSkipCountdown}
            />
          </div>
          <div style={{ width: 300, flexShrink: 0 }}>
            <ScorePanel players={state.players} roundLogs={state.roundLogs} lastScoreChangeId={state.lastScoreChangeId} />
          </div>
        </div>
        <div style={{
          height: 160,
          borderTop: '1px solid rgba(0,0,0,0.06)',
          overflowY: 'auto',
          padding: '12px 24px',
          background: 'rgba(255,255,255,0.5)',
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#888', marginBottom: 8 }}>📝 回合日志</div>
          {state.roundLogs.length === 0 && (
            <div style={{ color: '#aaa', fontSize: 12, fontStyle: 'italic' }}>游戏还没有进行任何回合...</div>
          )}
          {state.roundLogs.map((log, i) => {
            const hasCorrect = log.correctGuessers.length > 0;
            const staggerOffset = (i % 3) * 4;
            return (
            <div
              key={i}
              className={`log-slide-in ${hasCorrect ? 'log-correct' : 'log-wrong'}`}
              style={{
                padding: '8px 14px',
                marginBottom: 5,
                borderRadius: 10,
                background: hasCorrect
                  ? 'linear-gradient(90deg, rgba(78,205,196,0.16) 0%, rgba(78,205,196,0.06) 100%)'
                  : 'linear-gradient(90deg, rgba(255,107,107,0.13) 0%, rgba(255,107,107,0.04) 100%)',
                fontSize: 13,
                color: '#555',
                opacity: 0,
                animationDelay: `${i * 0.08}s`,
                borderLeft: `4px solid ${hasCorrect ? '#4ECDC4' : '#FF6B6B'}`,
                transform: `translateX(-${staggerOffset}px)`,
                boxShadow: hasCorrect
                  ? '0 2px 8px rgba(78,205,196,0.12)'
                  : '0 2px 8px rgba(255,107,107,0.1)',
              }}
            >
              <span style={{ fontWeight: 600, color: '#2D3436' }}>第{log.round}轮</span>
              {' · '}
              <span>{log.describerNickname}出题</span>
              {' · '}
              <span style={{ color: '#4ECDC4', fontWeight: 600 }}>{log.keyword}</span>
              {' · '}
              <span>
                {log.correctGuessers.length > 0
                  ? <>
                      <span style={{ color: '#4ECDC4', fontWeight: 600 }}>✓</span>
                      {' '}
                      {log.correctGuessers.join('、')}
                      {' '}
                      {log.correctGuessers.length}人猜对
                    </>
                  : <>
                      <span style={{ color: '#FF6B6B', fontWeight: 600 }}>✗</span>
                      {' '}
                      无人猜对
                    </>
                }
              </span>
            </div>
          );
          })}
          <div ref={logEndRef} />
        </div>
      </div>
    );
  }

  if (page === 'room') {
    return (
      <div style={{
        backgroundColor: '#FFF8E7',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
      }}>
        <div className="card" style={{ padding: 40, maxWidth: 520, width: '100%', textAlign: 'center' }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8, color: '#2D3436' }}>🎮 等待玩家加入</h1>
          <div style={{
            fontSize: 18, fontWeight: 700, color: '#4ECDC4', marginBottom: 16,
            padding: '10px 20px', background: 'rgba(78,205,196,0.1)', borderRadius: 10, display: 'inline-block',
          }}>
            房间号：{state.roomId}
          </div>
          <div style={{ fontSize: 14, color: '#888', marginBottom: 20 }}>
            主题：{THEME_OPTIONS.find(t => t.id === state.theme)?.name || state.theme}
          </div>
          <BouncingBalls />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginBottom: 24 }}>
            {state.players.map(p => (
              <div key={p.id} className="fade-in-up" style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: 12,
              }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%', background: p.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, fontWeight: 700, color: '#fff',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                }}>
                  {p.nickname.charAt(0).toUpperCase()}
                </div>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#555' }}>{p.nickname}</span>
                {p.isHost && <span style={{ fontSize: 11, color: '#FFD700', fontWeight: 700 }}>房主</span>}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>
            已加入 {state.players.length} 人（最少3人开始）
          </div>
          {isHost && (
            <button
              className="btn-hover"
              onClick={handleStartGame}
              disabled={state.players.length < 3}
              style={{
                padding: '14px 40px', borderRadius: 12, border: 'none',
                background: state.players.length >= 3
                  ? 'linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%)'
                  : '#ccc',
                color: '#fff', fontSize: 16, fontWeight: 700, cursor: state.players.length >= 3 ? 'pointer' : 'not-allowed',
              }}
            >
              {state.players.length >= 3 ? '🚀 开始游戏' : `还需${3 - state.players.length}人`}
            </button>
          )}
          {!isHost && <div style={{ fontSize: 14, color: '#888' }}>等待房主开始游戏...</div>}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: '#FFF8E7',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
    }}>
      <div style={{ maxWidth: 900, width: '100%', display: 'flex', gap: 32, flexWrap: 'wrap', justifyContent: 'center' }}>
        <div className="card fade-in-up" style={{ padding: 36, flex: 1, minWidth: 340, maxWidth: 420 }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6, color: '#2D3436' }}>🏰 创建房间</h2>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>选择主题，创建专属猜词房间</p>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>你的昵称</label>
          <input
            value={nickname} onChange={e => setNickname(e.target.value)}
            placeholder="输入昵称..."
            maxLength={12}
            style={{
              width: '100%', padding: '12px 16px', borderRadius: 10, border: '2px solid #eee',
              fontSize: 15, marginBottom: 16, outline: 'none', fontFamily: 'inherit',
            }}
          />
          <label style={{ fontSize: 13, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>选择主题</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
            {THEME_OPTIONS.map(t => (
              <button
                key={t.id}
                onClick={() => setSelectedTheme(t.id)}
                style={{
                  padding: '10px 8px', borderRadius: 10, border: selectedTheme === t.id ? '2px solid #4ECDC4' : '2px solid #eee',
                  background: selectedTheme === t.id ? 'rgba(78,205,196,0.1)' : '#fff',
                  cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
                  color: selectedTheme === t.id ? '#4ECDC4' : '#555',
                  transition: 'all 0.2s ease',
                }}
              >
                {t.icon} {t.name}
              </button>
            ))}
          </div>
          {selectedTheme === 'custom' && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>自定义词汇（用逗号分隔）</label>
              <textarea
                value={customWords} onChange={e => setCustomWords(e.target.value)}
                placeholder="独角兽, 恐龙, 蛋糕..."
                rows={3}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 10, border: '2px solid #eee',
                  fontSize: 14, resize: 'vertical', outline: 'none', fontFamily: 'inherit',
                }}
              />
            </div>
          )}
          {error && <div style={{ color: '#FF6B6B', fontSize: 13, marginBottom: 10 }}>{error}</div>}
          <button
            className="btn-hover"
            onClick={handleCreateRoom}
            style={{
              width: '100%', padding: '14px', borderRadius: 12, border: 'none',
              background: 'linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%)',
              color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            创建房间
          </button>
        </div>

        <div className="card fade-in-up" style={{ padding: 36, flex: 1, minWidth: 340, maxWidth: 420 }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6, color: '#2D3436' }}>🚪 加入房间</h2>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>输入房间号，加入好友的房间</p>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>你的昵称</label>
          <input
            value={nickname} onChange={e => setNickname(e.target.value)}
            placeholder="输入昵称..."
            maxLength={12}
            style={{
              width: '100%', padding: '12px 16px', borderRadius: 10, border: '2px solid #eee',
              fontSize: 15, marginBottom: 16, outline: 'none', fontFamily: 'inherit',
            }}
          />
          <label style={{ fontSize: 13, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>房间号</label>
          <input
            value={joinRoomId} onChange={e => setJoinRoomId(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="输入6位房间号"
            maxLength={6}
            style={{
              width: '100%', padding: '12px 16px', borderRadius: 10, border: '2px solid #eee',
              fontSize: 20, marginBottom: 20, outline: 'none', fontFamily: 'inherit',
              letterSpacing: 4, textAlign: 'center', fontWeight: 700,
            }}
          />
          {error && page === 'home' && <div style={{ color: '#FF6B6B', fontSize: 13, marginBottom: 10 }}>{error}</div>}
          <button
            className="btn-hover"
            onClick={handleJoinRoom}
            style={{
              width: '100%', padding: '14px', borderRadius: 12, border: 'none',
              background: 'linear-gradient(135deg, #FF6B6B 0%, #EE5A24 100%)',
              color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            加入房间
          </button>
        </div>
      </div>
    </div>
  );
}
