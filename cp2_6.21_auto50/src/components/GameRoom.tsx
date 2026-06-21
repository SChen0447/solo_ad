import React, { useState, useEffect, useCallback, useRef } from 'react';
import { emit, on } from '../utils/socket';
import { RoomState, AnswerResult, RoundEndData, Player } from '../types';

interface AnswerAnimation {
  show: boolean;
  isCorrect: boolean;
  playerName: string;
  answer: string;
  isFirst: boolean;
}

function CheckIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 6L9 17L4 12" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 6L6 18M6 6L18 18" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

interface GameRoomProps {
  roomState: RoomState;
  playerId: string;
}

const GameRoom: React.FC<GameRoomProps> = ({ roomState, playerId }) => {
  const [answer, setAnswer] = useState('');
  const [countdown, setCountdown] = useState(roomState.countdown);
  const [countdownDuration, setCountdownDuration] = useState(60);
  const [answerAnimations, setAnswerAnimations] = useState<AnswerAnimation[]>([]);
  const [roundEndData, setRoundEndData] = useState<RoundEndData | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const animationKeyRef = useRef(0);

  const isHost = roomState.players.find(p => p.id === playerId)?.isHost ?? false;
  const answeredPlayerIds = new Set(roomState.roundHistory.filter(h => h.roundNumber === roomState.currentRound).map(h => h.playerId));

  useEffect(() => {
    setCountdown(roomState.countdown);
  }, [roomState.countdown]);

  useEffect(() => {
    const offCountdown = on<number>('game:countdown', (time) => {
      setCountdown(time);
    });

    const offAnswerResult = on<AnswerResult>('game:answer-result', (result) => {
      const animation: AnswerAnimation = {
        show: true,
        isCorrect: result.isCorrect,
        playerName: result.playerName,
        answer: result.answer,
        isFirst: result.isFirst,
      };
      setAnswerAnimations(prev => [...prev, animation]);
      animationKeyRef.current += 1;
      const key = animationKeyRef.current;

      setTimeout(() => {
        setAnswerAnimations(prev => prev.filter((_, idx) => idx !== key - 1));
      }, 1500);

      if (result.playerId === playerId) {
        setHasAnswered(true);
      }
    });

    const offRoundEnd = on<RoundEndData>('game:round-end', (data) => {
      setRoundEndData(data);
    });

    return () => {
      offCountdown();
      offAnswerResult();
      offRoundEnd();
    };
  }, [playerId]);

  useEffect(() => {
    if (roomState.gameStatus === 'playing') {
      setHasAnswered(answeredPlayerIds.has(playerId));
      setRoundEndData(null);
    }
  }, [roomState.gameStatus, roomState.currentRound, playerId, answeredPlayerIds]);

  const handleSubmitAnswer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim() || hasAnswered || roomState.gameStatus !== 'playing') return;
    emit('game:answer', { answer: answer.trim() });
    setAnswer('');
  };

  const handleStartGame = () => {
    emit('game:start', { duration: countdownDuration });
  };

  const handleNextRound = () => {
    setRoundEndData(null);
    emit('game:next-round');
  };

  const handleEndGame = () => {
    emit('game:end');
  };

  const getProgressColor = useCallback(() => {
    const progress = countdown / roomState.countdownDuration;
    return interpolateColor('#10B981', '#EF4444', 1 - progress);
  }, [countdown, roomState.countdownDuration]);

  const interpolateColor = (color1: string, color2: string, t: number): string => {
    const c1 = hexToRgb(color1);
    const c2 = hexToRgb(color2);
    const r = Math.round(c1.r + (c2.r - c1.r) * t);
    const g = Math.round(c1.g + (c2.g - c1.g) * t);
    const b = Math.round(c1.b + (c2.b - c1.b) * t);
    return `rgb(${r}, ${g}, ${b})`;
  };

  const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 0, g: 0, b: 0 };
  };

  const renderCircularProgress = () => {
    const size = 120;
    const strokeWidth = 8;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = countdown / roomState.countdownDuration;
    const offset = circumference * (1 - progress);
    const isLast5Seconds = countdown <= 5 && countdown > 0;
    const color = getProgressColor();

    return (
      <div className={`circular-container ${isLast5Seconds ? 'pulse' : ''}`}>
        <svg width={size} height={size} className="circular-svg">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#E5E7EB"
            strokeWidth={strokeWidth}
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease' }}
          />
        </svg>
        <div className="countdown-text" style={{ color }}>
          {countdown}
        </div>
      </div>
    );
  };

  return (
    <div className="game-room">
      <style>{`
        .game-room {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
          padding: 24px;
          max-width: 1400px;
          margin: 0 auto;
          width: 100%;
          box-sizing: border-box;
        }
        @media (min-width: 768px) and (max-width: 1023px) {
          .game-room {
            grid-template-columns: 1fr 1fr;
          }
        }
        @media (min-width: 1024px) {
          .game-room {
            grid-template-columns: 1fr 1fr 320px;
          }
        }
        .card {
          background: #E0F2FE;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          width: 100%;
          box-sizing: border-box;
        }
        .card h2 {
          color: #1E3A5F;
          margin: 0 0 16px 0;
          font-size: 20px;
        }
        .center-area {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 32px;
          width: 100%;
          box-sizing: border-box;
        }
        .circular-container {
          position: relative;
          width: 120px;
          height: 120px;
        }
        .circular-svg {
          transform: rotate(0deg);
        }
        .countdown-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 36px;
          font-weight: bold;
          transition: color 0.5s ease;
        }
        .pulse {
          animation: pulse 0.8s ease-in-out infinite;
          transform-origin: center center;
        }
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            filter: drop-shadow(0 0 0 rgba(239, 68, 68, 0.4));
          }
          50% {
            transform: scale(1.15);
            filter: drop-shadow(0 0 20px rgba(239, 68, 68, 0.8));
          }
        }
        .hint-card {
          background: white;
          padding: 24px 32px;
          border-radius: 16px;
          text-align: center;
        }
        .hint-label {
          font-size: 14px;
          color: #6B7280;
          margin-bottom: 8px;
        }
        .hint-category {
          font-size: 18px;
          color: #1E3A5F;
          font-weight: 600;
          margin-bottom: 12px;
        }
        .hint-length {
          display: flex;
          gap: 8px;
          justify-content: center;
        }
        .hint-char {
          width: 32px;
          height: 40px;
          background: #F3F4F6;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          font-weight: 600;
          color: #9CA3AF;
          border-bottom: 3px solid #D1D5DB;
        }
        .answer-form {
          display: flex;
          gap: 12px;
          width: 100%;
          max-width: 400px;
        }
        .answer-input {
          flex: 1;
          padding: 14px 20px;
          border: 2px solid #D1D5DB;
          border-radius: 12px;
          font-size: 16px;
          transition: border-color 0.2s ease;
          font-family: inherit;
        }
        .answer-input:focus {
          outline: none;
          border-color: #6366F1;
        }
        .answer-input:disabled {
          background: #F3F4F6;
          cursor: not-allowed;
        }
        .btn {
          padding: 12px 24px;
          background: linear-gradient(135deg, #1E3A5F 0%, #2B5A8C 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          font-family: inherit;
        }
        .btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(30, 58, 95, 0.3);
        }
        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .btn-success {
          background: linear-gradient(135deg, #10B981 0%, #059669 100%);
        }
        .btn-success:hover:not(:disabled) {
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }
        .btn-danger {
          background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
        }
        .btn-danger:hover:not(:disabled) {
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
        }
        .settings-group {
          margin-bottom: 20px;
        }
        .settings-group label {
          display: block;
          color: #1E3A5F;
          font-weight: 500;
          margin-bottom: 8px;
        }
        .settings-group input[type="range"] {
          width: 100%;
          cursor: pointer;
        }
        .duration-display {
          text-align: center;
          font-size: 24px;
          font-weight: bold;
          color: #1E3A5F;
          margin: 8px 0;
        }
        .answer-animation-container {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          pointer-events: none;
          z-index: 1000;
          display: flex;
          flex-direction: column;
          gap: 16px;
          align-items: center;
        }
        .answer-animation {
          display: flex;
          flex-direction: column;
          align-items: center;
          animation: answerPop 1.5s ease-out forwards;
        }
        .answer-animation.correct .animation-circle {
          background: #10B981;
          animation: correctRipple 0.6s ease-out;
        }
        .answer-animation.wrong .animation-circle {
          background: #EF4444;
          position: relative;
          overflow: hidden;
        }
        .answer-animation.wrong .animation-circle::after {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: rgba(255, 255, 255, 0.3);
          animation: wrongSweep 0.6s ease-out;
        }
        @keyframes answerPop {
          0% {
            opacity: 0;
            transform: scale(0.5);
          }
          20% {
            opacity: 1;
            transform: scale(1.1);
          }
          40% {
            transform: scale(1);
          }
          80% {
            opacity: 1;
            transform: scale(1);
          }
          100% {
            opacity: 0;
            transform: scale(1.2);
          }
        }
        @keyframes correctRipple {
          0% {
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
          }
          100% {
            box-shadow: 0 0 0 40px rgba(16, 185, 129, 0);
          }
        }
        @keyframes wrongSweep {
          0% {
            left: -100%;
          }
          100% {
            left: 100%;
          }
        }
        .animation-circle {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .animation-player {
          margin-top: 8px;
          color: #1E3A5F;
          font-weight: 600;
        }
        .animation-answer {
          color: #6B7280;
          font-size: 14px;
        }
        .animation-bonus {
          color: #F59E0B;
          font-size: 12px;
          font-weight: 600;
          margin-top: 4px;
        }
        .round-end-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 900;
          animation: fadeIn 0.3s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .round-end-card {
          background: white;
          padding: 32px 48px;
          border-radius: 20px;
          text-align: center;
          animation: slideUp 0.4s ease;
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .round-end-title {
          font-size: 28px;
          color: #1E3A5F;
          margin-bottom: 16px;
        }
        .round-end-word {
          font-size: 36px;
          font-weight: bold;
          color: #6366F1;
          margin-bottom: 24px;
        }
        .round-end-actions {
          display: flex;
          gap: 16px;
          justify-content: center;
        }
        .status-badge {
          display: inline-block;
          padding: 6px 16px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 16px;
        }
        .status-badge.waiting {
          background: #FEF3C7;
          color: #D97706;
        }
        .status-badge.playing {
          background: #D1FAE5;
          color: #059669;
        }
        .status-badge.finished {
          background: #FEE2E2;
          color: #DC2626;
        }
        .round-info {
          text-align: center;
          color: #6B7280;
          font-size: 14px;
          margin-bottom: 16px;
        }
        .players-status {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .player-status-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          background: white;
          border-radius: 10px;
        }
        .player-status-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #FFDAB9;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          color: #1E3A5F;
          font-size: 14px;
        }
        .player-status-name {
          flex: 1;
          font-size: 14px;
          color: #1E3A5F;
        }
        .player-status-badge {
          font-size: 12px;
          padding: 2px 8px;
          border-radius: 10px;
        }
        .player-status-badge.answered {
          background: #D1FAE5;
          color: #059669;
        }
        .player-status-badge.pending {
          background: #FEF3C7;
          color: #D97706;
        }
        .empty-state {
          text-align: center;
          color: #9CA3AF;
          padding: 32px 0;
        }
      `}</style>

      {answerAnimations.map((anim, idx) => (
        <div key={idx} className="answer-animation-container">
          <div className={`answer-animation ${anim.isCorrect ? 'correct' : 'wrong'}`}>
            <div className="animation-circle">
              {anim.isCorrect ? <CheckIcon /> : <XIcon />}
            </div>
            <div className="animation-player">{anim.playerName}</div>
            <div className="animation-answer">
              {anim.isCorrect ? '✓' : '✗'} {anim.answer}
            </div>
            {anim.isCorrect && anim.isFirst && (
              <div className="animation-bonus">🏆 抢答 +50 分!</div>
            )}
          </div>
        </div>
      ))}

      {roundEndData && (
        <div className="round-end-overlay">
          <div className="round-end-card">
            <div className="round-end-title">第 {roundEndData.roundNumber} 轮结束!</div>
            <div className="round-end-word">{roundEndData.correctWord}</div>
            {isHost ? (
              <div className="round-end-actions">
                <button className="btn btn-success" onClick={handleNextRound}>
                  下一轮
                </button>
                <button className="btn btn-danger" onClick={handleEndGame}>
                  结束游戏
                </button>
              </div>
            ) : (
              <div style={{ color: '#6B7280' }}>等待房主开始下一轮...</div>
            )}
          </div>
        </div>
      )}

      <div className="card">
        <div className="status-badge waiting">
          {roomState.gameStatus === 'waiting' ? '等待开始' :
           roomState.gameStatus === 'playing' ? '游戏中' : '已结束'}
        </div>
        <h2>🎯 游戏控制</h2>

        {roomState.gameStatus === 'waiting' && isHost && (
          <>
            <div className="settings-group">
              <label>倒计时时长: {countdownDuration} 秒</label>
              <input
                type="range"
                min="30"
                max="120"
                step="5"
                value={countdownDuration}
                onChange={(e) => setCountdownDuration(Number(e.target.value))}
              />
              <div className="duration-display">{countdownDuration}s</div>
            </div>
            <button
              className="btn btn-success"
              style={{ width: '100%' }}
              onClick={handleStartGame}
              disabled={roomState.players.length < 2}
            >
              {roomState.players.length < 2 ? '至少需要2名玩家' : '开始游戏'}
            </button>
          </>
        )}

        {roomState.gameStatus === 'waiting' && !isHost && (
          <div className="empty-state">等待房主开始游戏...</div>
        )}

        {roomState.gameStatus === 'finished' && isHost && (
          <button
            className="btn btn-success"
            style={{ width: '100%' }}
            onClick={handleNextRound}
          >
            再来一局
          </button>
        )}

        {roomState.gameStatus === 'playing' && (
          <div className="round-info">第 {roomState.currentRound} 轮进行中</div>
        )}
      </div>

      <div className="card">
        <div className="center-area">
          {roomState.gameStatus === 'playing' && (
            <>
              {renderCircularProgress()}

              <div className="hint-card">
                <div className="hint-label">题目类别</div>
                <div className="hint-category">{roomState.currentHint.category}</div>
                <div className="hint-label">字数</div>
                <div className="hint-length">
                  {Array.from({ length: roomState.currentHint.length }).map((_, i) => (
                    <div key={i} className="hint-char">_</div>
                  ))}
                </div>
              </div>

              <form className="answer-form" onSubmit={handleSubmitAnswer}>
                <input
                  type="text"
                  className="answer-input"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder={hasAnswered ? '你已提交答案' : '输入你的答案...'}
                  disabled={hasAnswered || roomState.gameStatus !== 'playing'}
                  autoFocus
                />
                <button
                  type="submit"
                  className="btn btn-success"
                  disabled={!answer.trim() || hasAnswered || roomState.gameStatus !== 'playing'}
                >
                  提交
                </button>
              </form>
            </>
          )}

          {roomState.gameStatus === 'waiting' && (
            <div className="empty-state">
              <div style={{ fontSize: 48, marginBottom: 16 }}>🎮</div>
              <div>等待房主开始游戏</div>
            </div>
          )}

          {roomState.gameStatus === 'finished' && !roundEndData && (
            <div className="empty-state">
              <div style={{ fontSize: 48, marginBottom: 16 }}>🏁</div>
              <div>游戏结束</div>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <h2>👥 答题状态</h2>
        <div className="players-status">
          {roomState.players.map((player: Player) => {
            const hasAnsweredThisRound = answeredPlayerIds.has(player.id);
            return (
              <div key={player.id} className="player-status-item">
                <div className="player-status-avatar">
                  {player.name.charAt(0).toUpperCase()}
                </div>
                <div className="player-status-name">
                  {player.name}
                  {player.isHost && ' 👑'}
                </div>
                <span className={`player-status-badge ${hasAnsweredThisRound ? 'answered' : 'pending'}`}>
                  {hasAnsweredThisRound ? '已答题' : '等待中'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default GameRoom;
