import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Check, Volume2, Clock, AlertCircle } from 'lucide-react';
import type { QuestionType, DiagnosisReport } from '../types';

interface SafeQuestion {
  id: string;
  type: QuestionType;
  wordId: string;
  word: {
    id: string;
    english: string;
    chinese: string;
    example?: string;
    partOfSpeech: string;
  };
  prompt: string;
  options?: string[];
  points: number;
}

interface TestViewProps {
  testId: string;
  testName: string;
  config: {
    durationMinutes: number;
    questionCount: number;
    pointsPerQuestion: number;
  };
  questions: SafeQuestion[];
  studentName: string;
  onComplete: (answers: Array<{ questionId: string; answer: string; timeSpent: number }>) => void;
  onCancel: () => void;
  report?: DiagnosisReport | null;
}

type AnswerState = {
  answer: string;
  isCorrect?: boolean;
  correctAnswer?: string;
  submitted: boolean;
  flashing: boolean;
};

export default function TestView({
  testId,
  testName,
  config,
  questions,
  studentName,
  onComplete,
  onCancel,
  report,
}: TestViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(config.durationMinutes * 60);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>(() => {
    const init: Record<string, AnswerState> = {};
    questions.forEach((q) => {
      init[q.id] = { answer: '', submitted: false, flashing: false };
    });
    return init;
  });
  const [questionStartTime, setQuestionStartTime] = useState<number>(() => Date.now());
  const [allSubmitted, setAllSubmitted] = useState(false);
  const [currentScore, setCurrentScore] = useState(0);
  const timerRef = useRef<number | null>(null);
  const completedRef = useRef(false);

  const answeredCount = Object.values(answers).filter((a) => a.submitted).length;
  const question = questions[currentIndex];
  const totalAnswered = Object.values(answers).filter((a) => a.answer || a.submitted).length;

  const handleFinish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    if (timerRef.current) window.clearInterval(timerRef.current);
    const payload = questions.map((q) => {
      const a = answers[q.id];
      return {
        questionId: q.id,
        answer: a?.answer || '',
        timeSpent: 0,
      };
    });
    setAllSubmitted(true);
    setTimeout(() => onComplete(payload), 300);
  }, [answers, questions, onComplete]);

  useEffect(() => {
    timerRef.current = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          handleFinish();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [handleFinish]);

  useEffect(() => {
    setQuestionStartTime(Date.now());
  }, [currentIndex]);

  const submitAnswer = (qId: string, answerText: string) => {
    const q = questions.find((x) => x.id === qId);
    if (!q) return;
    const now = Date.now();
    const spent = Math.round((now - questionStartTime) / 1000);
    let correctAnswer = '';
    if (q.type === 'choice') {
      correctAnswer = q.word.chinese;
    } else {
      correctAnswer = q.word.english;
    }
    const isCorrect =
      answerText.trim().toLowerCase().replace(/\s+/g, ' ') ===
      correctAnswer.trim().toLowerCase().replace(/\s+/g, ' ');
    const pointsEarned = isCorrect ? q.points : 0;
    if (isCorrect) setCurrentScore((s) => s + pointsEarned);
    setAnswers((prev) => ({
      ...prev,
      [qId]: {
        answer: answerText,
        isCorrect,
        correctAnswer,
        submitted: true,
        flashing: true,
      },
    }));
    setTimeout(() => {
      setAnswers((prev) => ({ ...prev, [qId]: { ...prev[qId], flashing: false } }));
    }, 450);
    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex((i) => i + 1);
      } else {
        const allDone = Object.values({
          ...answers,
          [qId]: { answer: answerText, submitted: true },
        }).every((a) => a.submitted);
        if (allDone && !allSubmitted) {
          handleFinish();
        }
      }
    }, 700);
    return spent;
  };

  const handleChoiceSelect = (option: string) => {
    if (answers[question.id].submitted) return;
    submitAnswer(question.id, option);
  };

  const handleFillSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const input = form.elements.namedItem('fill') as HTMLInputElement;
    if (!input.value.trim()) return;
    if (answers[question.id].submitted) return;
    submitAnswer(question.id, input.value);
  };

  const handleDictationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const input = form.elements.namedItem('dict') as HTMLInputElement;
    if (!input.value.trim()) return;
    if (answers[question.id].submitted) return;
    submitAnswer(question.id, input.value);
  };

  const playDictation = () => {
    try {
      const utter = new SpeechSynthesisUtterance(question.word.english);
      utter.lang = 'en-US';
      utter.rate = 0.85;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
    } catch {
      // silent
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const maxScore = questions.reduce((s, q) => s + q.points, 0);

  if (report) return null;

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '24px 16px' }}>
      <div style={topBarStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={18} color="#2196F3" />
          <div>
            <div style={{ fontSize: 13, color: '#888' }}>学生姓名</div>
            <div style={{ fontWeight: 600, color: '#333' }}>{studentName}</div>
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: '#888' }}>{testName}</div>
          <div style={{ fontSize: 11, color: '#aaa' }}>共 {questions.length} 题</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Clock size={18} color={timeLeft < 60 ? '#F44336' : '#FF5722'} />
          <span
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: timeLeft < 60 ? '#F44336' : '#333',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {formatTime(timeLeft)}
          </span>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#666', marginBottom: 6 }}>
          <span>答题进度</span>
          <span>{answeredCount} / {questions.length}</span>
        </div>
        <div style={progressWrap}>
          <div
            style={{
              ...progressFill,
              width: `${(answeredCount / questions.length) * 100}%`,
              background: 'linear-gradient(90deg, #2196F3, #4CAF50)',
            }}
          />
        </div>
      </div>

      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: 32,
          marginTop: 20,
          boxShadow: '0 6px 24px rgba(0,0,0,0.08)',
          minHeight: 320,
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 13, color: '#888' }}>
            第 <span style={{ color: '#2196F3', fontWeight: 700, fontSize: 18 }}>{currentIndex + 1}</span> / {questions.length} 题
            <span style={{ marginLeft: 12, padding: '2px 8px', borderRadius: 10, fontSize: 11, background: getTypeBg(question.type), color: getTypeColor(question.type) }}>
              {getTypeLabel(question.type)}
            </span>
          </div>
          <div style={{ fontSize: 13, color: '#4CAF50', fontWeight: 600 }}>
            分值：{question.points}分
          </div>
        </div>

        <div style={questionState(answers[question.id])}>
          <div style={{ fontSize: 20, fontWeight: 600, color: '#333', marginBottom: 24, lineHeight: 1.6 }}>
            {question.prompt}
          </div>

          {question.type === 'choice' && question.options && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {question.options.map((opt, idx) => {
                const isSelected = answers[question.id].answer === opt && answers[question.id].submitted;
                const isRight = answers[question.id].submitted && opt === question.word.chinese;
                return (
                  <button
                    key={idx}
                    onClick={() => handleChoiceSelect(opt)}
                    disabled={answers[question.id].submitted}
                    style={{
                      padding: '16px 20px',
                      borderRadius: 12,
                      border: isRight
                        ? '2px solid #4CAF50'
                        : isSelected
                        ? '2px solid #2196F3'
                        : '2px solid #e0e0e0',
                      background: isRight
                        ? '#E8F5E9'
                        : isSelected
                        ? '#2196F3'
                        : '#fff',
                      color: isSelected && !isRight ? '#fff' : isRight ? '#2E7D32' : '#333',
                      fontSize: 15,
                      fontWeight: isSelected || isRight ? 600 : 400,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: answers[question.id].submitted ? 'default' : 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!answers[question.id].submitted) {
                        e.currentTarget.style.transform = 'scale(1.03)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 6,
                          background: isSelected || isRight ? 'rgba(255,255,255,0.3)' : '#f0f0f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        {String.fromCharCode(65 + idx)}
                      </span>
                      {opt}
                    </span>
                    {isRight && <Check size={20} color="#2E7D32" />}
                    {isSelected && !isRight && !answers[question.id].isCorrect && (
                      <span style={{ color: '#fff', fontSize: 12 }}>✕</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {question.type === 'fill' && (
            <form onSubmit={handleFillSubmit}>
              <div style={{ position: 'relative', display: 'inline-block', minWidth: 280 }}>
                <input
                  name="fill"
                  disabled={answers[question.id].submitted}
                  defaultValue={answers[question.id].answer}
                  placeholder="请输入单词..."
                  style={{
                    width: '100%',
                    padding: '10px 4px',
                    border: 'none',
                    borderBottom: answers[question.id].submitted
                      ? answers[question.id].isCorrect
                        ? '2px solid #4CAF50'
                        : '2px solid #F44336'
                      : '2px solid #ccc',
                    fontSize: 18,
                    background: 'transparent',
                    outline: 'none',
                    transition: 'all 0.2s ease',
                  }}
                  onFocus={(e) => {
                    if (!answers[question.id].submitted) {
                      e.target.style.borderBottom = '2px solid #FF5722';
                      e.target.style.transform = 'scale(1.01)';
                      e.target.style.transformOrigin = 'left';
                    }
                  }}
                  onBlur={(e) => {
                    e.target.style.transform = 'scale(1)';
                  }}
                />
              </div>
              {!answers[question.id].submitted && (
                <button
                  type="submit"
                  style={{
                    marginLeft: 16,
                    padding: '10px 24px',
                    background: '#2196F3',
                    color: '#fff',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  提交答案
                </button>
              )}
            </form>
          )}

          {question.type === 'dictation' && (
            <form onSubmit={handleDictationSubmit}>
              <div style={{ marginBottom: 20 }}>
                <button
                  type="button"
                  onClick={playDictation}
                  style={{
                    padding: '12px 28px',
                    background: 'linear-gradient(135deg, #FF5722, #FF9800)',
                    color: '#fff',
                    borderRadius: 30,
                    fontSize: 14,
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    boxShadow: '0 4px 12px rgba(255,87,34,0.3)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.03)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(255,87,34,0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(255,87,34,0.3)';
                  }}
                >
                  <Volume2 size={18} />
                  播放录音
                </button>
              </div>
              <div style={{ position: 'relative', display: 'inline-block', minWidth: 280 }}>
                <input
                  name="dict"
                  disabled={answers[question.id].submitted}
                  defaultValue={answers[question.id].answer}
                  placeholder="请输入听到的单词..."
                  style={{
                    width: '100%',
                    padding: '10px 4px',
                    border: 'none',
                    borderBottom: answers[question.id].submitted
                      ? answers[question.id].isCorrect
                        ? '2px solid #4CAF50'
                        : '2px solid #F44336'
                      : '2px solid #ccc',
                    fontSize: 18,
                    background: 'transparent',
                    outline: 'none',
                  }}
                  onFocus={(e) => {
                    if (!answers[question.id].submitted) {
                      e.target.style.borderBottom = '2px solid #FF5722';
                    }
                  }}
                />
              </div>
              {!answers[question.id].submitted && (
                <button
                  type="submit"
                  style={{
                    marginLeft: 16,
                    padding: '10px 24px',
                    background: '#2196F3',
                    color: '#fff',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  提交答案
                </button>
              )}
            </form>
          )}

          {answers[question.id].submitted && (
            <div
              style={{
                marginTop: 24,
                padding: 16,
                borderRadius: 12,
                background: answers[question.id].isCorrect ? '#E8F5E9' : '#FFEBEE',
                borderLeft: `4px solid ${answers[question.id].isCorrect ? '#4CAF50' : '#F44336'}`,
              }}
            >
              <div style={{ fontWeight: 700, color: answers[question.id].isCorrect ? '#2E7D32' : '#C62828', marginBottom: 6 }}>
                {answers[question.id].isCorrect ? '✓ 回答正确！' : '✗ 回答错误'}
              </div>
              {!answers[question.id].isCorrect && (
                <div style={{ fontSize: 14, color: '#555' }}>
                  正确答案：<span style={{ color: '#2196F3', fontWeight: 600 }}>{answers[question.id].correctAnswer}</span>
                </div>
              )}
              {question.word.example && (
                <div style={{ fontSize: 13, color: '#777', marginTop: 8, fontStyle: 'italic' }}>
                  例句：{question.word.example}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 20,
          padding: '16px 24px',
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
        }}
      >
        <div>
          <div style={{ fontSize: 12, color: '#888' }}>当前得分</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#4CAF50' }}>
            {currentScore} <span style={{ fontSize: 13, color: '#aaa', fontWeight: 400 }}> / {maxScore}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {questions.map((_, i) => {
            const a = Object.values(answers)[i];
            let bg = '#e0e0e0';
            if (i === currentIndex) bg = '#2196F3';
            else if (a?.submitted) bg = a.isCorrect ? '#4CAF50' : '#F44336';
            else if (a?.answer) bg = '#FFC107';
            return (
              <div
                key={i}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  background: bg,
                  color: i === currentIndex ? '#fff' : '#333',
                  fontSize: 11,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onClick={() => !answers[_.id].submitted && setCurrentIndex(i)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                {i + 1}
              </div>
            );
          })}
        </div>
        <button
          onClick={() => {
            if (window.confirm('确定要提前交卷吗？')) {
              handleFinish();
            }
          }}
          style={{
            padding: '10px 24px',
            background: '#FF5722',
            color: '#fff',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.03)';
            e.currentTarget.style.boxShadow = '0 4px 10px rgba(255,87,34,0.35)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          交卷
        </button>
      </div>
    </div>
  );
}

function getTypeLabel(t: QuestionType) {
  if (t === 'choice') return '单选题';
  if (t === 'fill') return '填空题';
  return '听写题';
}
function getTypeBg(t: QuestionType) {
  if (t === 'choice') return '#E3F2FD';
  if (t === 'fill') return '#FFF3E0';
  return '#FCE4EC';
}
function getTypeColor(t: QuestionType) {
  if (t === 'choice') return '#1976D2';
  if (t === 'fill') return '#E65100';
  return '#C2185B';
}
function questionState(a: AnswerState): React.CSSProperties {
  return { position: 'relative' };
}

const topBarStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  background: '#fff',
  padding: '14px 24px',
  borderRadius: 12,
  boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
};
const progressWrap: React.CSSProperties = {
  height: 8,
  background: '#e0e0e0',
  borderRadius: 4,
  overflow: 'hidden',
};
const progressFill: React.CSSProperties = {
  height: '100%',
  transition: 'width 0.3s ease',
};
