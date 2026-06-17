import React, { useState, useEffect, useRef } from 'react';
import { GameState, PlayerAnswer } from '../types';

interface GameBoardProps {
  state: GameState;
  myId: string;
  isDescriber: boolean;
  isHost: boolean;
  onSubmitAnswer: (answer: string) => void;
  onJudgeAnswer: (answerIndex: number, correct: boolean) => void;
  onSkipCountdown: () => void;
}

function CountdownCircle({ timeRemaining, total }: { timeRemaining: number; total: number }) {
  const progress = timeRemaining / total;
  const circumference = 2 * Math.PI * 40;
  const offset = circumference * (1 - progress);
  const color = timeRemaining > 20 ? '#4ECDC4' : timeRemaining > 10 ? '#FFEAA7' : '#FF6B6B';

  return (
    <div style={{ position: 'relative', width: 100, height: 100, margin: '0 auto 16px' }}>
      <svg width="100" height="100" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="50" cy="50" r="40" fill="none" stroke="#eee" strokeWidth="6" />
        <circle
          cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.1s linear, stroke 0.3s ease' }}
        />
      </svg>
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        fontSize: 28, fontWeight: 800, color,
        animation: timeRemaining <= 10 && timeRemaining > 0 ? 'countdown-pulse 1s ease-in-out infinite' : 'none',
      }}>
        {Math.ceil(timeRemaining)}
      </div>
    </div>
  );
}

export default function GameBoard({ state, myId, isDescriber, isHost, onSubmitAnswer, onJudgeAnswer, onSkipCountdown }: GameBoardProps) {
  const [answerInput, setAnswerInput] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [currentRevealIndex, setCurrentRevealIndex] = useState(0);
  const prevPhaseRef = useRef(state.phase);

  useEffect(() => {
    if (state.phase === 'answering' && prevPhaseRef.current !== 'answering') {
      setHasSubmitted(false);
      setAnswerInput('');
      setCurrentRevealIndex(0);
    }
    prevPhaseRef.current = state.phase;
  }, [state.phase]);

  useEffect(() => {
    if (state.phase === 'revealing' && currentRevealIndex < state.answers.length) {
      setCurrentRevealIndex(state.answers.findIndex(a => a.correct === null));
      if (currentRevealIndex === -1 || state.answers.every(a => a.correct !== null)) {
        setCurrentRevealIndex(state.answers.length);
      }
    }
  }, [state.answers, state.phase, currentRevealIndex]);

  const handleSubmit = () => {
    if (answerInput.trim() && !hasSubmitted) {
      onSubmitAnswer(answerInput.trim());
      setHasSubmitted(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
  };

  const myAnswer = state.answers.find(a => a.playerId === myId);

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <div style={{
        textAlign: 'center', marginBottom: 16,
        fontSize: 15, fontWeight: 700, color: '#888',
      }}>
        第 {state.currentRound} / {state.totalRounds} 轮
      </div>

      <div style={{
        textAlign: 'center', marginBottom: 20,
        padding: '8px 20px', borderRadius: 10, display: 'inline-block',
        background: 'rgba(78,205,196,0.1)', color: '#4ECDC4', fontWeight: 700, fontSize: 15,
        marginLeft: '50%', transform: 'translateX(-50%)',
      }}>
        🎤 出题者：{state.currentDescriberNickname}
      </div>

      {(state.phase === 'answering' || state.phase === 'describing') && (
        <div className="card" style={{ padding: 24, marginBottom: 20, textAlign: 'center' }}>
          <CountdownCircle timeRemaining={state.timeRemaining} total={60} />

          {isDescriber ? (
            <div>
              <div style={{ fontSize: 14, color: '#888', marginBottom: 8 }}>你需描述的关键词：</div>
              <div style={{
                fontSize: 32, fontWeight: 800, color: '#2D3436', marginBottom: 16,
                padding: '12px 24px', background: 'rgba(78,205,196,0.1)', borderRadius: 12, display: 'inline-block',
              }}>
                {state.keyword}
              </div>
              <div style={{ fontSize: 14, color: '#888', marginBottom: 8 }}>🚫 禁说词：</div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                {state.forbiddenWords.map((w, i) => (
                  <span key={i} style={{
                    padding: '6px 14px', borderRadius: 8, background: '#FF6B6B', color: '#fff',
                    fontSize: 15, fontWeight: 700,
                  }}>
                    {w}
                  </span>
                ))}
              </div>
              <button
                className="btn-hover"
                onClick={onSkipCountdown}
                style={{
                  marginTop: 20, padding: '10px 24px', borderRadius: 10, border: 'none',
                  background: 'linear-gradient(135deg, #FF8C42, #FF6B6B)', color: '#fff',
                  fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                ⏭ 提前结束倒计时
              </button>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 15, color: '#888', marginBottom: 16 }}>
                {state.currentDescriberNickname} 正在描述... 请在倒计时内输入你的猜测！
              </div>

              {state.phase === 'answering' && !hasSubmitted && state.timeRemaining > 0 && (
                <div style={{ display: 'flex', gap: 10, maxWidth: 400, margin: '0 auto' }}>
                  <input
                    value={answerInput}
                    onChange={e => setAnswerInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="输入你的猜测..."
                    maxLength={30}
                    style={{
                      flex: 1, padding: '12px 16px', borderRadius: 10, border: '2px solid #eee',
                      fontSize: 15, outline: 'none', fontFamily: 'inherit',
                    }}
                  />
                  <button
                    className="btn-hover"
                    onClick={handleSubmit}
                    disabled={!answerInput.trim()}
                    style={{
                      padding: '12px 20px', borderRadius: 10, border: 'none',
                      background: answerInput.trim() ? 'linear-gradient(135deg, #4ECDC4, #44A08D)' : '#ccc',
                      color: '#fff', fontSize: 15, fontWeight: 700, cursor: answerInput.trim() ? 'pointer' : 'not-allowed',
                      fontFamily: 'inherit',
                    }}
                  >
                    提交
                  </button>
                </div>
              )}

              {hasSubmitted && (
                <div style={{
                  padding: '12px 20px', background: 'rgba(78,205,196,0.1)', borderRadius: 10,
                  color: '#4ECDC4', fontWeight: 600, fontSize: 15,
                }}>
                  ✅ 已提交答案，等待结果...
                </div>
              )}

              {state.timeRemaining <= 0 && !hasSubmitted && (
                <div style={{
                  padding: '12px 20px', background: 'rgba(255,107,107,0.1)', borderRadius: 10,
                  color: '#FF6B6B', fontWeight: 600, fontSize: 15,
                }}>
                  ⏰ 时间到！未提交答案
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {state.phase === 'revealing' && (
        <div className="card" style={{ padding: 24, marginBottom: 20 }}>
          <div style={{ textAlign: 'center', fontSize: 16, fontWeight: 700, color: '#2D3436', marginBottom: 16 }}>
            🔍 揭示答案 — 关键词：{state.keyword}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {state.answers.map((ans, i) => (
              <div
                key={i}
                className="fade-in-up"
                style={{
                  padding: '14px 18px', borderRadius: 10,
                  background: ans.correct === true ? 'rgba(78,205,196,0.1)'
                    : ans.correct === false ? 'rgba(255,107,107,0.1)'
                    : 'rgba(0,0,0,0.03)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  animationDelay: `${i * 0.1}s`,
                }}
              >
                <div>
                  <span style={{ fontWeight: 600, color: '#2D3436' }}>{ans.nickname}</span>
                  <span style={{ margin: '0 8px', color: '#ccc' }}>→</span>
                  <span style={{ fontWeight: 700, color: '#555' }}>{ans.answer}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {ans.correct === true && <span style={{ color: '#4ECDC4', fontWeight: 700 }}>✓ 正确</span>}
                  {ans.correct === false && <span style={{ color: '#FF6B6B', fontWeight: 700 }}>✗ 错误</span>}
                  {ans.correct === null && isDescriber && (
                    <>
                      <button
                        className="btn-hover"
                        onClick={() => onJudgeAnswer(i, true)}
                        style={{
                          padding: '6px 14px', borderRadius: 8, border: 'none',
                          background: '#4ECDC4', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                          fontFamily: 'inherit',
                        }}
                      >
                        ✓ 正确
                      </button>
                      <button
                        className="btn-hover"
                        onClick={() => onJudgeAnswer(i, false)}
                        style={{
                          padding: '6px 14px', borderRadius: 8, border: 'none',
                          background: '#FF6B6B', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                          fontFamily: 'inherit',
                        }}
                      >
                        ✗ 错误
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {state.phase === 'roundEnd' && (
        <div className="card fade-in-up" style={{ padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#2D3436', marginBottom: 8 }}>
            第 {state.currentRound} 轮结束
          </div>
          <div style={{ fontSize: 15, color: '#888' }}>
            正确答案：<span style={{ color: '#4ECDC4', fontWeight: 700 }}>{state.keyword}</span>
          </div>
          <div style={{ fontSize: 14, color: '#888', marginTop: 8 }}>
            {state.answers.filter(a => a.correct).length} 人猜对
          </div>
        </div>
      )}
    </div>
  );
}
