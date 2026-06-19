import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { calculateScore, type Question, type ExamResult } from '../data/questionBank';
import { useAppContext } from '../App';

const optionLabels = ['A', 'B', 'C', 'D', 'E', 'F'];

const typeLabel: Record<string, string> = {
  single: '单选题',
  multiple: '多选题',
  judge: '判断题',
};

const EXAM_DURATION = 30 * 60;

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function ExamPage() {
  const navigate = useNavigate();
  const { examQuestions, setExamResult } = useAppContext();

  const questions: Question[] = useMemo(() => {
    if (examQuestions.length > 0) return examQuestions;
    return [];
  }, [examQuestions]);

  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [timeLeft, setTimeLeft] = useState(EXAM_DURATION);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (submitted || questions.length === 0) return;

    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timer);
          handleSubmit(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [submitted, questions.length]);

  const answeredCount = useMemo(() => {
    return Object.values(answers).filter((a) => {
      if (Array.isArray(a)) return a.length > 0;
      return !!a;
    }).length;
  }, [answers]);

  const handleSingleAnswer = (qid: string, option: string) => {
    setAnswers({ ...answers, [qid]: option });
  };

  const handleMultipleAnswer = (qid: string, option: string) => {
    const current = (answers[qid] as string[]) || [];
    const updated = current.includes(option)
      ? current.filter((x) => x !== option)
      : [...current, option];
    setAnswers({ ...answers, [qid]: updated });
  };

  const handleJudgeAnswer = (qid: string, value: string) => {
    setAnswers({ ...answers, [qid]: value });
  };

  const handleSubmit = (auto = false) => {
    if (!auto && answeredCount < questions.length) {
      const ok = window.confirm(
        `还有 ${questions.length - answeredCount} 道题未作答，确定要交卷吗？`
      );
      if (!ok) return;
    }
    setSubmitted(true);

    const result: ExamResult = calculateScore(questions, answers);
    setExamResult(result);
    setTimeout(() => navigate('/report'), 300);
  };

  const getTimerClass = () => {
    if (timeLeft <= 30) return 'danger pulse';
    const minutes = Math.floor(timeLeft / 60);
    if (minutes < 5) return 'danger';
    if (minutes < 10) return 'warning';
    return '';
  };

  if (questions.length === 0) {
    return (
      <div className="page-container">
        <h1 className="page-title">在线考试</h1>
        <div className="card empty-state">
          <div className="empty-state-icon">📋</div>
          <div style={{ marginBottom: 16 }}>暂无试卷，请先在「自动组卷」页面生成试卷</div>
          <button className="btn-primary" onClick={() => navigate('/create-paper')}>
            去组卷
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ paddingTop: 80 }}>
      <div className={`exam-timer ${getTimerClass()}`}>
        ⏱ {formatTime(timeLeft)}
      </div>

      <h1 className="page-title">在线考试</h1>

      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
              共 <strong style={{ color: 'var(--primary-color)', fontSize: 18 }}>{questions.length}</strong> 道题目，
              已作答 <strong style={{ color: answeredCount === questions.length ? 'var(--success-color)' : 'var(--warning-color)', fontSize: 18 }}>
                {answeredCount}
              </strong> 道
            </span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-light)' }}>
            💡 考试时间 30 分钟，时间结束将自动交卷
          </div>
        </div>
      </div>

      <div>
        {questions.map((q, idx) => (
          <div
            key={q.id}
            className="exam-question-card"
            style={{ animation: `fadeIn 400ms ease-out ${Math.min(idx * 40, 400)}ms both` }}
          >
            <div className="question-header">
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: 'var(--primary-color)',
                  color: 'white',
                  fontSize: 14,
                  fontWeight: 600,
                  marginRight: 8,
                }}
              >
                {idx + 1}
              </span>
              <span className={`tag tag-${q.type}`}>{typeLabel[q.type]}</span>
              <span className={`tag tag-${q.difficulty}`}>
                {q.difficulty === 'easy' ? '简单' : q.difficulty === 'medium' ? '中等' : '困难'}
              </span>
              <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-secondary)' }}>
                {q.score} 分
              </span>
            </div>

            <div className="question-content" style={{ marginTop: 12, marginBottom: 0 }}>
              {q.content}
            </div>

            {q.type === 'single' && q.options && (
              <div className="exam-options">
                {q.options.map((opt, i) => {
                  const label = optionLabels[i];
                  const selected = answers[q.id] === label;
                  return (
                    <div
                      key={i}
                      className={`exam-option ${selected ? 'selected' : ''}`}
                      onClick={() => handleSingleAnswer(q.id, label)}
                    >
                      <span className="exam-option-label">{label}</span>
                      <span className="exam-option-text">{opt}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {q.type === 'multiple' && q.options && (
              <div className="exam-options">
                {q.options.map((opt, i) => {
                  const label = optionLabels[i];
                  const selected = (answers[q.id] as string[] || []).includes(label);
                  return (
                    <div
                      key={i}
                      className={`exam-option ${selected ? 'selected' : ''}`}
                      onClick={() => handleMultipleAnswer(q.id, label)}
                    >
                      <span className="exam-option-label">{label}</span>
                      <span className="exam-option-text">{opt}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {q.type === 'judge' && (
              <div className="exam-options">
                {['正确', '错误'].map((val) => {
                  const selected = answers[q.id] === val;
                  return (
                    <div
                      key={val}
                      className={`exam-option ${selected ? 'selected' : ''}`}
                      onClick={() => handleJudgeAnswer(q.id, val)}
                      style={{ maxWidth: 200 }}
                    >
                      <span className="exam-option-label">{val === '正确' ? '✓' : '✗'}</span>
                      <span className="exam-option-text">{val}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="exam-submit-bar">
        <div className="exam-progress">
          答题进度：{answeredCount} / {questions.length}（
          {Math.round((answeredCount / questions.length) * 100)}%）
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn-secondary" onClick={() => navigate('/create-paper')}>
            返回组卷
          </button>
          <button className="btn-primary" onClick={() => handleSubmit(false)}>
            交卷
          </button>
        </div>
      </div>
    </div>
  );
}
