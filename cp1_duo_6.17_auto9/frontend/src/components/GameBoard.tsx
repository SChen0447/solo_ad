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
  const progress = Math.max(0, Math.min(1, timeRemaining / total));
  const circumference = 2 * Math.PI * 40;
  const offset = circumference * (1 - progress);
  const color = timeRemaining > 20 ? '#4ECDC4' : timeRemaining > 10 ? '#F39C12' : '#FF6B6B';

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
        fontSize: 26, fontWeight: 800, color, fontFamily: 'Poppins, sans-serif',
        animation: timeRemaining <= 10 && timeRemaining > 0 ? 'countdown-pulse 1s ease-in-out infinite' : 'none',
      }}>
        {Math.ceil(timeRemaining)}
      </div>
    </div>
  );
}

export default function GameBoard({ state, myId, isDescriber, onSubmitAnswer, onJudgeAnswer, onSkipCountdown }: GameBoardProps) {
  const [answerInput, setAnswerInput] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const prevPhaseRef = useRef(state.phase);
  const prevRoundRef = useRef(state.currentRound);

  useEffect(() => {
    if (state.phase === 'answering' && (prevPhaseRef.current !== 'answering' || prevRoundRef.current !== state.currentRound)) {
      setHasSubmitted(false);
      setAnswerInput('');
    }
    prevPhaseRef.current = state.phase;
    prevRoundRef.current = state.currentRound;
  }, [state.phase, state.currentRound]);

  const handleSubmit = () => {
    if (answerInput.trim() && !hasSubmitted && state.phase === 'answering') {
      onSubmitAnswer(answerInput.trim());
      setHasSubmitted(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
  };

  const myAnswer = state.answers.find(a => a.playerId === myId);
  const allJudged = state.phase === 'revealing' && state.answers.length > 0 && state.answers.every(a => a.correct !== null);

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <div style={{
        textAlign: 'center', marginBottom: 8,
        fontSize: 13, fontWeight: 700, color: '#888', letterSpacing: 1,
      }}>
        — 第 {state.currentRound} / {state.totalRounds} 轮 —
      </div>

      <div style={{
        textAlign: 'center', marginBottom: 20,
        padding: '8px 24px', borderRadius: 12, display: 'inline-block',
        background: 'rgba(78,205,196,0.1)', color: '#4ECDC4', fontWeight: 700, fontSize: 15,
        marginLeft: '50%', transform: 'translateX(-50%)',
      }}>
        🎤 本轮出题者：{state.currentDescriberNickname}
      </div>

      {(state.phase === 'answering' || state.phase === 'describing') && (
        <div className="card fade-in-up" style={{ padding: 28, marginBottom: 20, textAlign: 'center' }}>
          <CountdownCircle timeRemaining={state.timeRemaining} total={state.roundDuration || 60} />

          {isDescriber ? (
            <div>
              <div style={{ fontSize: 13, color: '#888', marginBottom: 8, fontWeight: 600 }}>🔒 仅你可见：你需要描述的关键词</div>
              <div style={{
                fontSize: 36, fontWeight: 900, color: '#2D3436', marginBottom: 20,
                padding: '16px 32px', background: 'rgba(78,205,196,0.1)', borderRadius: 14, display: 'inline-block',
                letterSpacing: 2,
              }}>
                {state.keyword}
              </div>
              <div style={{ fontSize: 13, color: '#888', marginBottom: 10, fontWeight: 600 }}>🚫 绝对不能说出的禁词：</div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                {state.forbiddenWords.map((w, i) => (
                  <span key={i} style={{
                    padding: '8px 18px', borderRadius: 10, background: '#FF6B6B', color: '#fff',
                    fontSize: 15, fontWeight: 700,
                    boxShadow: '0 2px 8px rgba(255,107,107,0.3)',
                  }}>
                    {w}
                  </span>
                ))}
              </div>
              <button
                className="btn-hover"
                onClick={onSkipCountdown}
                disabled={state.answers.length < 1}
                style={{
                  marginTop: 24, padding: '12px 28px', borderRadius: 12, border: 'none',
                  background: state.answers.length >= 1
                    ? 'linear-gradient(135deg, #FF8C42, #FF6B6B)'
                    : '#ccc',
                  color: '#fff', fontSize: 14, fontWeight: 700,
                  cursor: state.answers.length >= 1 ? 'pointer' : 'not-allowed',
                  fontFamily: 'inherit',
                }}
              >
                ⏭ {state.answers.length >= 1 ? `已收到${state.answers.length}份答案，提前结束` : '等待其他玩家提交...'}
              </button>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 15, color: '#888', marginBottom: 20 }}>
                🎙️ 请仔细听 <b style={{ color: '#2D3436' }}>{state.currentDescriberNickname}</b> 的描述，然后在下方输入你的猜测
              </div>

              {state.phase === 'answering' && !hasSubmitted && state.timeRemaining > 0 && (
                <div style={{ display: 'flex', gap: 10, maxWidth: 480, margin: '0 auto' }}>
                  <input
                    value={answerInput}
                    onChange={e => setAnswerInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="在此输入你猜测的答案..."
                    maxLength={40}
                    style={{
                      flex: 1, padding: '14px 18px', borderRadius: 12, border: '2px solid #eee',
                      fontSize: 16, outline: 'none', fontFamily: 'inherit',
                      transition: 'border-color 0.2s ease',
                      background: '#fff',
                    }}
                    onFocus={(e) => { e.target.style.borderColor = '#4ECDC4'; }}
                    onBlur={(e) => { e.target.style.borderColor = '#eee'; }}
                  />
                  <button
                    className="btn-hover"
                    onClick={handleSubmit}
                    disabled={!answerInput.trim()}
                    style={{
                      padding: '14px 24px', borderRadius: 12, border: 'none',
                      background: answerInput.trim()
                        ? 'linear-gradient(135deg, #4ECDC4, #44A08D)'
                        : '#ccc',
                      color: '#fff', fontSize: 15, fontWeight: 700,
                      cursor: answerInput.trim() ? 'pointer' : 'not-allowed',
                      fontFamily: 'inherit',
                    }}
                  >
                    提交
                  </button>
                </div>
              )}

              {hasSubmitted && myAnswer && (
                <div style={{
                  padding: '14px 24px', background: 'rgba(78,205,196,0.1)', borderRadius: 12,
                  color: '#4ECDC4', fontWeight: 700, fontSize: 15, display: 'inline-block',
                }}>
                  ✅ 已提交答案：<span style={{ color: '#2D3436' }}>{myAnswer.answer}</span>，等待其他玩家...
                </div>
              )}

              {state.timeRemaining <= 0 && !hasSubmitted && (
                <div style={{
                  padding: '14px 24px', background: 'rgba(255,107,107,0.1)', borderRadius: 12,
                  color: '#FF6B6B', fontWeight: 700, fontSize: 15, display: 'inline-block',
                }}>
                  ⏰ 时间到！本轮未提交答案
                </div>
              )}

              {state.answers.length > 0 && (
                <div style={{
                  marginTop: 20, fontSize: 13, color: '#888',
                }}>
                  📬 已有 <b style={{ color: '#4ECDC4' }}>{state.answers.length}</b> 位玩家提交了答案
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {(state.phase === 'revealing' || allJudged) && (
        <div className="card fade-in-up" style={{ padding: 28, marginBottom: 20 }}>
          <div style={{
            textAlign: 'center', fontSize: 18, fontWeight: 800, color: '#2D3436', marginBottom: 8,
          }}>
            🔍 揭示答案
          </div>
          <div style={{
            textAlign: 'center', fontSize: 14, color: '#888', marginBottom: 20,
          }}>
            正确答案是：<span style={{ color: '#4ECDC4', fontWeight: 700, fontSize: 16 }}>{state.keyword}</span>
            {isDescriber && ' — 请为每位玩家的答案判定对错'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {state.answers.map((ans, i) => (
              <div
                key={i}
                className="fade-in-up"
                style={{
                  padding: '14px 18px', borderRadius: 12,
                  background: ans.correct === true ? 'rgba(78,205,196,0.12)'
                    : ans.correct === false ? 'rgba(255,107,107,0.1)'
                    : 'rgba(0,0,0,0.03)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  animationDelay: `${i * 0.08}s`,
                  border: ans.correct === true ? '1px solid rgba(78,205,196,0.3)'
                    : ans.correct === false ? '1px solid rgba(255,107,107,0.2)'
                    : '1px solid rgba(0,0,0,0.05)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 18 }}>
                    {ans.correct === true ? '✅' : ans.correct === false ? '❌' : '⏳'}
                  </span>
                  <span style={{ fontWeight: 700, color: '#2D3436' }}>{ans.nickname}</span>
                  <span style={{ color: '#ccc' }}>→</span>
                  <span style={{ fontWeight: 700, color: ans.correct === true ? '#4ECDC4' : ans.correct === false ? '#FF6B6B' : '#555', fontSize: 16 }}>
                    {ans.answer}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {ans.correct === true && <span style={{ color: '#4ECDC4', fontWeight: 700, fontSize: 13 }}>+1 分</span>}
                  {ans.correct === false && <span style={{ color: '#FF6B6B', fontWeight: 700, fontSize: 13 }}>不得分</span>}
                  {ans.correct === null && isDescriber && (
                    <>
                      <button
                        className="btn-hover"
                        onClick={() => onJudgeAnswer(i, true)}
                        style={{
                          padding: '8px 16px', borderRadius: 10, border: 'none',
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
                          padding: '8px 16px', borderRadius: 10, border: 'none',
                          background: '#FF6B6B', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                          fontFamily: 'inherit',
                        }}
                      >
                        ✗ 错误
                      </button>
                    </>
                  )}
                  {ans.correct === null && !isDescriber && (
                    <span style={{ color: '#aaa', fontSize: 12 }}>等待出题者判定...</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          {allJudged && (
            <div style={{ textAlign: 'center', marginTop: 16, color: '#888', fontSize: 13 }}>
              ⏳ 即将进入下一回合...
            </div>
          )}
        </div>
      )}

      {state.phase === 'roundEnd' && (
        <div className="card fade-in-up" style={{ padding: 28, textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#2D3436', marginBottom: 10 }}>
            第 {state.currentRound} 轮结束 🏁
          </div>
          <div style={{ fontSize: 15, color: '#888', marginBottom: 10 }}>
            正确答案：<span style={{ color: '#4ECDC4', fontWeight: 700, fontSize: 18 }}>{state.keyword}</span>
          </div>
          <div style={{ fontSize: 14, color: '#888' }}>
            {state.answers.filter(a => a.correct).length} 人猜对
            {state.answers.filter(a => a.correct).length > 0 && (
              <>
                ：
                <span style={{ color: '#4ECDC4', fontWeight: 600 }}>
                  {state.answers.filter(a => a.correct).map(a => a.nickname).join('、')}
                </span>
              </>
            )}
          </div>
          <div style={{ marginTop: 12, fontSize: 12, color: '#aaa' }}>
            出题者 {state.currentDescriberNickname} 本轮得分 +{state.answers.filter(a => a.correct).length > 0 ? 1 : 0}
          </div>
        </div>
      )}
    </div>
  );
}
