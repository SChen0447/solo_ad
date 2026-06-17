import { useState, useEffect, useCallback, useRef } from 'react';
import { getExam, gradeExam, type FullQuestion, type GradeResponse } from './api';
import { ResultCard } from './ResultCard';
import { addWrongAnswers } from './wrongAnswerStorage';

const TOTAL_TIME = 10 * 60;
const WARNING_TIME = 2 * 60;
const CIRCUMFERENCE = 2 * Math.PI * 27;

export function ExamPage() {
  const [questions, setQuestions] = useState<FullQuestion[]>([]);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<GradeResponse | null>(null);
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [isTimeout, setIsTimeout] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadExam = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);
      setIsTimeout(false);
      setTimeLeft(TOTAL_TIME);
      const data = await getExam();
      setQuestions(data.fullQuestions);
      setAnswers(new Array(data.fullQuestions.length).fill(null));
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadExam();
  }, [loadExam]);

  useEffect(() => {
    if (!result && questions.length > 0 && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            setIsTimeout(true);
            handleSubmit(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [questions.length, result]);

  const handleSubmit = useCallback(
    async (timeout = false) => {
      if (submitting || result) return;
      try {
        setSubmitting(true);
        if (timerRef.current) clearInterval(timerRef.current);
        const gradeResult = await gradeExam(answers, questions);
        setResult(gradeResult);
        addWrongAnswers(gradeResult.results);
        if (timeout) setIsTimeout(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : '提交失败');
      } finally {
        setSubmitting(false);
      }
    },
    [answers, questions, submitting, result]
  );

  const handleSelect = (qIndex: number, optIndex: number) => {
    if (result) return;
    setAnswers((prev) => {
      const next = [...prev];
      next[qIndex] = optIndex;
      return next;
    });
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progress = (timeLeft / TOTAL_TIME) * CIRCUMFERENCE;
  const isWarning = timeLeft <= WARNING_TIME;

  const optionLabels = ['A', 'B', 'C', 'D'];
  const answeredCount = answers.filter((a) => a !== null).length;

  if (loading) {
    return (
      <div className="exam-page">
        <div className="loading-container">正在加载题目...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="exam-page">
        <div className="error-container">
          <div>{error}</div>
          <button className="retry-btn" onClick={loadExam}>
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="exam-page">
      {!result && (
        <div className={`timer-container ${isWarning ? 'timer-warning' : ''}`}>
          <div className="timer-circle">
            <svg className="timer-svg" width="64" height="64" viewBox="0 0 64 64">
              <circle className="timer-bg" cx="32" cy="32" r="27" />
              <circle
                className="timer-progress"
                cx="32"
                cy="32"
                r="27"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={CIRCUMFERENCE - progress}
              />
            </svg>
            <div className="timer-text">{formatTime(timeLeft)}</div>
          </div>
        </div>
      )}

      <div className="page-header">
        <h1 className="page-title">
          {result ? '练习结果' : '技术知识练习'}
        </h1>
        <p className="page-subtitle">
          {result
            ? `答对 ${result.correctCount}/${result.totalCount} 题，得分 ${result.score} 分`
            : `共 ${questions.length} 道选择题，已作答 ${answeredCount} 题`}
        </p>
      </div>

      {isTimeout && result && (
        <div className="timeout-banner">⏰ 时间已到，系统已自动提交答案</div>
      )}

      {!result ? (
        <>
          <div className="questions-list">
            {questions.map((q, qIdx) => (
              <div key={q.id} className="question-card">
                <span className="question-number-badge">第 {qIdx + 1} 题</span>
                <p className="question-content">{q.question}</p>
                <div className="question-tags-row">
                  {q.tags.map((t) => (
                    <span key={t} className="tag-chip">
                      {t}
                    </span>
                  ))}
                </div>
                <div className="question-options">
                  {q.options.map((opt, oIdx) => (
                    <div
                      key={oIdx}
                      className={`option-item ${answers[qIdx] === oIdx ? 'selected' : ''}`}
                      onClick={() => handleSelect(qIdx, oIdx)}
                    >
                      <span className="option-circle">{optionLabels[oIdx]}</span>
                      <span>{opt}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="submit-area">
            <button
              className="submit-btn"
              onClick={() => handleSubmit(false)}
              disabled={submitting}
            >
              {submitting ? '提交中...' : '提交答案'}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="results-summary">
            <div className="score-display">
              <div className="score-value">{result.score}</div>
              <div className="score-label">总得分</div>
            </div>
            <div className="score-breakdown">
              <div className="breakdown-item">
                <div className="breakdown-value correct">{result.correctCount}</div>
                <div className="breakdown-label">答对</div>
              </div>
              <div className="breakdown-item">
                <div className="breakdown-value wrong">{result.totalCount - result.correctCount}</div>
                <div className="breakdown-label">答错</div>
              </div>
              <div className="breakdown-item">
                <div className="breakdown-value">{result.totalCount}</div>
                <div className="breakdown-label">总题数</div>
              </div>
            </div>
            <div className="knowledge-title">📊 知识点掌握度分析</div>
            <div className="knowledge-chart">
              {result.knowledgeAnalysis.map((k) => (
                <div key={k.tag} className="knowledge-bar-row">
                  <span className="knowledge-tag">{k.tag}</span>
                  <div className="knowledge-bar-container">
                    <div
                      className="knowledge-bar"
                      style={{ width: `${k.accuracy}%` }}
                    >
                      {k.accuracy > 20 && (
                        <span className="knowledge-bar-text">{k.accuracy}%</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="results-list">
            {result.results.map((r, idx) => (
              <ResultCard key={r.id} result={r} index={idx} />
            ))}
          </div>

          <div className="submit-area">
            <button className="restart-btn" onClick={loadExam}>
              再来一次
            </button>
          </div>
        </>
      )}
    </div>
  );
}
