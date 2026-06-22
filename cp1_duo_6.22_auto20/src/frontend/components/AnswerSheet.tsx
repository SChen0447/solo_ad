import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
  LabelList,
} from 'recharts';
import { Question, ScoreResult } from '../types';

interface AnswerSheetProps {
  questions: Question[];
  onSubmit: (
    questions: Question[],
    answers: Record<string, string | string[] | null>,
    scoreResult: ScoreResult
  ) => void;
  initialAnswers?: Record<string, string | string[] | null>;
  initialScoreResult?: ScoreResult;
  readonly?: boolean;
  recordId?: string | null;
}

const AnswerSheet: React.FC<AnswerSheetProps> = ({
  questions,
  onSubmit,
  initialAnswers,
  initialScoreResult,
  readonly = false,
  recordId = null,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[] | null>>({});
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fadeIn, setFadeIn] = useState(true);
  const lastSavedAnswersRef = useRef<string>('');

  const areAnswersEqual = useCallback(
    (
      a: Record<string, string | string[] | null>,
      b: Record<string, string | string[] | null>
    ): boolean => {
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      if (keysA.length !== keysB.length) return false;
      for (const key of keysA) {
        if (!keysB.includes(key)) return false;
        const valA = a[key];
        const valB = b[key];
        if (Array.isArray(valA) && Array.isArray(valB)) {
          if (valA.length !== valB.length) return false;
          const sortedA = [...valA].sort();
          const sortedB = [...valB].sort();
          for (let i = 0; i < sortedA.length; i++) {
            if (sortedA[i] !== sortedB[i]) return false;
          }
        } else if (valA !== valB) {
          return false;
        }
      }
      return true;
    },
    []
  );

  const getStorageKey = () => {
    if (recordId) {
      return `quizforge_answers_record_${recordId}`;
    }
    if (questions.length === 0) return 'quizforge_answers';
    const ids = questions.map((q) => q.id).join('|');
    return `quizforge_answers_${ids.length}_${ids.slice(0, 50)}`;
  };

  const loadSavedAnswers = () => {
    if (readonly) return;
    try {
      const key = getStorageKey();
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        lastSavedAnswersRef.current = JSON.stringify(parsed);
        setAnswers(parsed);
      }
    } catch (e) {
      console.error('Failed to load saved answers:', e);
    }
  };

  const saveAnswersToStorage = (newAnswers: Record<string, string | string[] | null>) => {
    if (readonly) return;
    try {
      const currentSnapshot = JSON.stringify(newAnswers);
      if (currentSnapshot === lastSavedAnswersRef.current) {
        return;
      }
      const key = getStorageKey();
      localStorage.setItem(key, currentSnapshot);
      lastSavedAnswersRef.current = currentSnapshot;
    } catch (e) {
      console.error('Failed to save answers:', e);
    }
  };

  const clearSavedAnswers = () => {
    try {
      const key = getStorageKey();
      localStorage.removeItem(key);
      lastSavedAnswersRef.current = '';
    } catch (e) {
      console.error('Failed to clear saved answers:', e);
    }
  };

  useEffect(() => {
    if (initialAnswers) {
      setAnswers(initialAnswers);
    } else if (!readonly && questions.length > 0) {
      loadSavedAnswers();
    }
    if (initialScoreResult) {
      setScoreResult(initialScoreResult);
    }
  }, [initialAnswers, initialScoreResult, questions]);

  useEffect(() => {
    setCurrentIndex(0);
    if (!initialAnswers && !readonly) {
      loadSavedAnswers();
    }
    setScoreResult(null);
  }, [questions]);

  useEffect(() => {
    if (!readonly && Object.keys(answers).length > 0) {
      saveAnswersToStorage(answers);
    }
  }, [answers]);

  const currentQuestion = questions[currentIndex];

  const handleSingleAnswer = (questionId: string, value: string) => {
    if (readonly) return;
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleMultipleAnswer = (questionId: string, option: string, checked: boolean) => {
    if (readonly) return;
    setAnswers((prev) => {
      const current = (prev[questionId] as string[]) || [];
      const updated = checked
        ? [...current, option]
        : current.filter((o) => o !== option);
      return { ...prev, [questionId]: updated.sort() };
    });
  };

  const handleFillAnswer = (questionId: string, value: string) => {
    if (readonly) return;
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setFadeIn(false);
      setTimeout(() => {
        setCurrentIndex(currentIndex - 1);
        setFadeIn(true);
      }, 150);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setFadeIn(false);
      setTimeout(() => {
        setCurrentIndex(currentIndex + 1);
        setFadeIn(true);
      }, 150);
    }
  };

  const handleSubmit = async () => {
    if (readonly) return;
    if (!confirm('确定要提交答卷吗？提交后无法修改。')) return;

    setSubmitting(true);

    try {
      const res = await fetch('/api/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions, answers }),
      });
      const data = await res.json();
      if (data.success) {
        const result: ScoreResult = {
          totalScore: data.totalScore,
          percentage: data.percentage,
          details: data.details,
          knowledgeStats: data.knowledgeStats,
        };
        setScoreResult(result);
        clearSavedAnswers();
        onSubmit(questions, answers, result);
      } else {
        alert(data.error || '评分失败');
      }
    } catch (e) {
      alert('评分失败，请检查服务器连接');
    } finally {
      setSubmitting(false);
    }
  };

  const isQuestionAnswered = (qid: string) => {
    const answer = answers[qid];
    if (answer === null || answer === undefined) return false;
    if (Array.isArray(answer)) return answer.length > 0;
    return answer !== '';
  };

  const getAnswerStatus = (qid: string) => {
    if (!scoreResult) return 'unanswered';
    const detail = scoreResult.details.find((d) => d.questionId === qid);
    if (!detail) return 'unanswered';
    return detail.isCorrect ? 'correct' : 'wrong';
  };

  const chartData = scoreResult
    ? Object.entries(scoreResult.knowledgeStats).map(([name, stat]) => ({
        name,
        正确率: stat.percentage,
      }))
    : [];

  const wrongQuestions = scoreResult
    ? questions.filter((q) => {
        const detail = scoreResult.details.find((d) => d.questionId === q.id);
        return detail && !detail.isCorrect;
      })
    : [];

  if (questions.length === 0) {
    return (
      <div className="answer-sheet">
        <h2 className="page-title">答题练习</h2>
        <div className="empty-state">
          <p className="empty-icon">📝</p>
          <p>暂无试卷，请先生成试卷或从历史记录中选择</p>
        </div>
      </div>
    );
  }

  if (scoreResult) {
    return (
      <div className="answer-sheet">
        <h2 className="page-title">
          {readonly ? '📊 成绩详情' : '🎉 答题完成'}
        </h2>

        <div className="card score-card">
          <div className="score-display">
            <div className="score-circle">
              <span className="score-number">{scoreResult.totalScore}</span>
              <span className="score-label">分</span>
            </div>
            <div className="score-info">
              <p>
                正确率：<strong>{scoreResult.percentage}%</strong>
              </p>
              <p>
                答对：<strong className="text-correct">
                  {scoreResult.details.filter((d) => d.isCorrect).length}
                </strong> / {scoreResult.details.length} 题
              </p>
            </div>
          </div>
        </div>

        {chartData.length > 0 ? (
          <div className="card">
            <h3 className="card-title">📈 知识点正确率分析</h3>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={chartData}
                  margin={{ top: 30, right: 40, left: 20, bottom: 20 }}
                  barCategoryGap="20%"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip
                    formatter={(value: number) => [`${value}%`, '正确率']}
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      padding: '12px 16px',
                    }}
                    labelStyle={{ fontWeight: 600, color: '#1e293b' }}
                    cursor={{ fill: 'rgba(37, 99, 235, 0.08)' }}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: '10px' }}
                    iconType="rect"
                  />
                  <Bar
                    dataKey="正确率"
                    name="知识点正确率"
                    fill="#2563eb"
                    radius={[8, 8, 0, 0]}
                    animationDuration={1000}
                    animationEasing="ease-out"
                    maxBarSize={60}
                    onMouseEnter={(data, index, e) => {
                      if (e && e.currentTarget) {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.transition = 'transform 0.2s ease';
                      }
                    }}
                    onMouseLeave={(data, index, e) => {
                      if (e && e.currentTarget) {
                        e.currentTarget.style.transform = 'translateY(0)';
                      }
                    }}
                  >
                    <LabelList
                      dataKey="正确率"
                      position="top"
                      formatter={(value: number) => `${value}%`}
                      style={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }}
                    />
                    {chartData.map((entry, index) => {
                      const color =
                        entry.正确率 >= 80
                          ? '#10b981'
                          : entry.正确率 >= 60
                          ? '#f59e0b'
                          : '#ef4444';
                      return <Cell key={`cell-${index}`} fill={color} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="card">
            <h3 className="card-title">📈 知识点正确率分析</h3>
            <div className="empty-state" style={{ padding: '40px 20px' }}>
              <p className="empty-icon">📊</p>
              <p style={{ color: '#64748b', marginBottom: '8px' }}>暂无知识点统计数据</p>
              <p className="upload-hint">完成答题后将在此展示各知识点的正确率分析</p>
            </div>
          </div>
        )}

        {wrongQuestions.length > 0 && (
          <div className="card">
            <h3 className="card-title">❌ 错题列表</h3>
            <div className="wrong-questions-list">
              {wrongQuestions.map((q, idx) => {
                const detail = scoreResult.details.find((d) => d.questionId === q.id);
                return (
                  <div key={q.id} className="wrong-question-item">
                    <div className="wrong-icon">⚠️</div>
                    <div className="wrong-content">
                      <p className="wrong-question-text">
                        {idx + 1}. {q.question}
                      </p>
                      <p className="wrong-answer">
                        <span className="label">你的答案：</span>
                        <span className="user-answer">
                          {detail?.userAnswer
                            ? Array.isArray(detail.userAnswer)
                              ? detail.userAnswer.join(', ')
                              : detail.userAnswer
                            : '未作答'}
                        </span>
                      </p>
                      <p className="correct-answer">
                        <span className="label">正确答案：</span>
                        <span className="correct-answer-text">
                          {Array.isArray(q.correctAnswer)
                            ? q.correctAnswer.join(', ')
                            : q.correctAnswer}
                        </span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="card">
          <h3 className="card-title">📋 答题详情</h3>
          <div className="answer-detail-list">
            {questions.map((q, idx) => {
              const detail = scoreResult.details.find((d) => d.questionId === q.id);
              return (
                <div
                  key={q.id}
                  className={`answer-detail-item ${detail?.isCorrect ? 'correct' : 'wrong'}`}
                >
                  <div className="detail-header">
                    <span className="detail-number">第 {idx + 1} 题</span>
                    <span className={`detail-status ${detail?.isCorrect ? 'correct' : 'wrong'}`}>
                      {detail?.isCorrect ? '✓ 正确' : '✗ 错误'}
                    </span>
                  </div>
                  <p className="detail-question">{q.question}</p>
                  {q.options.length > 0 && (
                    <div className="detail-options">
                      {q.options.map((opt, i) => (
                        <div key={i} className="detail-option">
                          {opt}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="answer-sheet">
      <h2 className="page-title">✏️ 在线答题</h2>

      <div className="card">
        <div className="progress-bar-container">
          <div
            className="progress-bar"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
        <div className="progress-text">
          第 {currentIndex + 1} 题 / 共 {questions.length} 题
        </div>
      </div>

      <div className="question-step-bar">
        {questions.map((q, idx) => (
          <button
            key={q.id}
            className={`step-item ${idx === currentIndex ? 'current' : ''} ${
              isQuestionAnswered(q.id) ? 'answered' : ''
            }`}
            onClick={() => {
              setFadeIn(false);
              setTimeout(() => {
                setCurrentIndex(idx);
                setFadeIn(true);
              }, 150);
            }}
          >
            {idx + 1}
          </button>
        ))}
      </div>

      {currentQuestion && (
        <div className={`card question-card ${fadeIn ? 'fade-in' : ''}`}>
          <div className="question-header">
            <span className="question-type type-badge">
              {currentQuestion.type === 'single'
                ? '单选题'
                : currentQuestion.type === 'multiple'
                ? '多选题'
                : '填空题'}
            </span>
            <span className="knowledge-tag">{currentQuestion.knowledge}</span>
            <span className={`difficulty-tag diff-${currentQuestion.difficulty}`}>
              {currentQuestion.difficulty === 'easy'
                ? '简单'
                : currentQuestion.difficulty === 'medium'
                ? '中等'
                : '困难'}
            </span>
          </div>

          <h3 className="question-title">
            {currentIndex + 1}. {currentQuestion.question}
          </h3>

          {currentQuestion.type === 'single' && currentQuestion.options.length > 0 && (
            <div className="options-list">
              {currentQuestion.options.map((option, idx) => {
                const optionLetter = String.fromCharCode(65 + idx);
                const isSelected = answers[currentQuestion.id] === optionLetter;
                return (
                  <label
                    key={idx}
                    className={`option-item radio-option ${isSelected ? 'selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name={`q-${currentQuestion.id}`}
                      checked={isSelected}
                      onChange={() => handleSingleAnswer(currentQuestion.id, optionLetter)}
                      disabled={readonly}
                    />
                    <span className="option-text">{option}</span>
                  </label>
                );
              })}
            </div>
          )}

          {currentQuestion.type === 'multiple' && currentQuestion.options.length > 0 && (
            <div className="options-list">
              {currentQuestion.options.map((option, idx) => {
                const optionLetter = String.fromCharCode(65 + idx);
                const currentAnswer = (answers[currentQuestion.id] as string[]) || [];
                const isSelected = currentAnswer.includes(optionLetter);
                return (
                  <label
                    key={idx}
                    className={`option-item checkbox-option ${isSelected ? 'selected' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) =>
                        handleMultipleAnswer(currentQuestion.id, optionLetter, e.target.checked)
                      }
                      disabled={readonly}
                    />
                    <span className="option-text">{option}</span>
                  </label>
                );
              })}
            </div>
          )}

          {currentQuestion.type === 'fill' && (
            <div className="fill-input-container">
              <input
                type="text"
                className="fill-input"
                placeholder="请输入答案..."
                value={(answers[currentQuestion.id] as string) || ''}
                onChange={(e) => handleFillAnswer(currentQuestion.id, e.target.value)}
                disabled={readonly}
              />
            </div>
          )}
        </div>
      )}

      <div className="navigation-buttons">
        <button
          className="btn btn-secondary"
          onClick={handlePrev}
          disabled={currentIndex === 0}
        >
          ← 上一题
        </button>
        {currentIndex === questions.length - 1 ? (
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={submitting || readonly}
          >
            {submitting ? '提交中...' : '提交答卷 ✓'}
          </button>
        ) : (
          <button className="btn btn-primary" onClick={handleNext}>
            下一题 →
          </button>
        )}
      </div>
    </div>
  );
};

export default AnswerSheet;
