import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Survey, Question, Language, AnswerValue } from './types';
import { t, validateRequired } from './utils';
import { getSurvey, submitResponse } from './api';

const sharedStyles = `
  button {
    font-family: inherit;
    cursor: pointer;
    border: none;
    outline: none;
    transition: filter 0.15s ease, transform 0.15s ease;
  }
  button:hover { filter: brightness(1.1); }
  button:active { transform: scale(0.95); }
  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    filter: none !important;
    transform: none !important;
  }
  input, textarea, select {
    font-family: inherit;
    outline: none;
  }
  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.25); }
    100% { transform: scale(1); }
  }
  .star-pulse {
    animation: pulse 0.15s ease-out;
  }
`;

const btnPrimary: React.CSSProperties = {
  padding: '14px 28px',
  borderRadius: '10px',
  backgroundColor: '#e94560',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 600,
  width: '100%',
};

const btnSecondary: React.CSSProperties = {
  padding: '10px 20px',
  borderRadius: '8px',
  backgroundColor: 'transparent',
  color: '#e0e0e0',
  fontSize: '14px',
  border: '1px solid #2d3748',
};

export default function SurveyAnswer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [lang, setLang] = useState<Language>('zh');
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [pulsedStars, setPulsedStars] = useState<Record<string, number>>({});
  const [respondent, setRespondent] = useState('');

  useEffect(() => {
    if (!id) return;
    getSurvey(id)
      .then((s) => {
        setSurvey(s);
        const init: Record<string, AnswerValue> = {};
        for (const q of s.questions) {
          if (q.type === 'multiple_choice') init[q.id] = [];
          else if (q.type === 'rating') init[q.id] = null;
          else init[q.id] = '';
        }
        setAnswers(init);
      })
      .catch((e: any) => {
        const msg = e?.response?.data?.error || e.message || '加载问卷失败';
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const ui = {
    back: { zh: '← 返回首页', en: '← Home' },
    language: { zh: '语言', en: 'Language' },
    loading: { zh: '加载问卷中...', en: 'Loading survey...' },
    loadError: { zh: '加载问卷失败', en: 'Failed to load survey' },
    surveyClosed: { zh: '该问卷已关闭', en: 'This survey is closed' },
    surveyExpired: { zh: '该问卷已过期', en: 'This survey has expired' },
    surveyDeleted: { zh: '该问卷已被删除', en: 'This survey has been deleted' },
    surveyNotActive: { zh: '该问卷暂不可用', en: 'This survey is not available' },
    submit: { zh: '提交问卷', en: 'Submit' },
    submitting: { zh: '提交中...', en: 'Submitting...' },
    required: { zh: '此项为必填', en: 'This field is required' },
    thankYou: { zh: '🎉 感谢您的参与！', en: '🎉 Thank you for your participation!' },
    successDesc: { zh: '您的回答已成功提交，我们将认真分析您的反馈。', en: 'Your response has been successfully submitted.' },
    answerAnother: { zh: '提交另一份答卷', en: 'Submit another response' },
    backHome: { zh: '返回首页', en: 'Back to Home' },
    viewDashboard: { zh: '查看数据看板', en: 'View Dashboard' },
    requiredField: { zh: '必填', en: 'Required' },
    pleaseFillAll: { zh: '请填写所有必填项', en: 'Please fill in all required fields' },
    respondent: { zh: '您的称呼（选填）', en: 'Your name (optional)' },
  };

  const validationErrors = useMemo(() => {
    if (!survey) return {};
    const errs: Record<string, boolean> = {};
    for (const q of survey.questions) {
      if (!validateRequired(q, answers[q.id])) {
        errs[q.id] = true;
      }
    }
    return errs;
  }, [survey, answers]);

  const handleSubmit = async () => {
    if (!survey || !id) return;
    if (Object.keys(validationErrors).length > 0) {
      setError(t(ui.pleaseFillAll, lang));
      setTimeout(() => setError(null), 3000);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submitResponse(id, { answers, respondent: respondent || undefined });
      setSubmitted(true);
    } catch (e: any) {
      const status = (e as any).status;
      if (status === 'closed' || status === 'expired') {
        setError(status === 'closed' ? t(ui.surveyClosed, lang) : t(ui.surveyExpired, lang));
      } else {
        setError(e.message || t(ui.loadError, lang));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const updateAnswer = (qid: string, value: AnswerValue) => {
    setAnswers((prev) => ({ ...prev, [qid]: value }));
  };

  const toggleMultiple = (qid: string, optId: string) => {
    const current = (answers[qid] as string[]) || [];
    const next = current.includes(optId)
      ? current.filter((x) => x !== optId)
      : [...current, optId];
    updateAnswer(qid, next);
  };

  const triggerStarPulse = (qid: string, value: number) => {
    setPulsedStars((prev) => ({ ...prev, [`${qid}_${value}`]: Date.now() }));
    setTimeout(() => {
      setPulsedStars((prev) => {
        const next = { ...prev };
        delete next[`${qid}_${value}`];
        return next;
      });
    }, 150);
  };

  const handleRating = (qid: string, value: number) => {
    updateAnswer(qid, value);
    triggerStarPulse(qid, value);
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#1a1a2e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#a0a0a0',
          fontSize: '16px',
        }}
      >
        <style>{sharedStyles}</style>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
          {t(ui.loading, lang)}
        </div>
      </div>
    );
  }

  if (!survey) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#1a1a2e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px',
        }}
      >
        <style>{sharedStyles}</style>
        <div
          style={{
            maxWidth: '480px',
            width: '100%',
            padding: '40px',
            backgroundColor: '#16213e',
            borderRadius: '16px',
            textAlign: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}
        >
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>😢</div>
          <h2 style={{ fontSize: '22px', color: '#e0e0e0', marginBottom: '12px' }}>
            {error || t(ui.loadError, lang)}
          </h2>
          <p style={{ fontSize: '14px', color: '#a0a0a0', marginBottom: '24px', lineHeight: 1.6 }}>
            {lang === 'zh' ? '请检查链接是否正确，或联系问卷创建者。' : 'Please check the link or contact the survey creator.'}
          </p>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <button style={btnSecondary}>{t(ui.back, lang)}</button>
          </Link>
        </div>
      </div>
    );
  }

  if (survey.status !== 'active') {
    const msgMap: Record<string, string> = {
      closed: t(ui.surveyClosed, lang),
      expired: t(ui.surveyExpired, lang),
      deleted: t(ui.surveyDeleted, lang),
    };
    const msg = msgMap[survey.status || ''] || t(ui.surveyNotActive, lang);
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#1a1a2e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px',
        }}
      >
        <style>{sharedStyles}</style>
        <div
          style={{
            maxWidth: '480px',
            width: '100%',
            padding: '40px',
            backgroundColor: '#16213e',
            borderRadius: '16px',
            textAlign: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}
        >
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>⏹️</div>
          <h2 style={{ fontSize: '22px', color: '#e94560', marginBottom: '12px' }}>{msg}</h2>
          <p style={{ fontSize: '14px', color: '#a0a0a0', marginBottom: '24px', lineHeight: 1.6 }}>
            {lang === 'zh'
              ? '该问卷已停止收集答案，请联系问卷创建者了解更多信息。'
              : 'This survey is no longer collecting responses.'}
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <Link to="/" style={{ textDecoration: 'none' }}>
              <button style={btnSecondary}>{t(ui.backHome, lang)}</button>
            </Link>
            <Link to={`/dashboard/${id}`} style={{ textDecoration: 'none' }}>
              <button style={{ ...btnPrimary, padding: '10px 20px', width: 'auto', fontSize: '14px' }}>
                {t(ui.viewDashboard, lang)}
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#1a1a2e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px',
        }}
      >
        <style>{sharedStyles}</style>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 20 }}
          style={{
            maxWidth: '520px',
            width: '100%',
            padding: '48px 40px',
            backgroundColor: '#16213e',
            borderRadius: '20px',
            textAlign: 'center',
            boxShadow: '0 12px 48px rgba(0,0,0,0.4)',
          }}
        >
          <div
            style={{
              fontSize: '72px',
              marginBottom: '20px',
              animation: 'pulse 1s ease-in-out infinite',
            }}
          >
            ✅
          </div>
          <h2
            style={{
              fontSize: '28px',
              color: '#e0e0e0',
              marginBottom: '12px',
              fontWeight: 700,
            }}
          >
            {t(ui.thankYou, lang)}
          </h2>
          <p
            style={{
              fontSize: '15px',
              color: '#a0a0a0',
              marginBottom: '32px',
              lineHeight: 1.7,
            }}
          >
            {t(ui.successDesc, lang)}
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/" style={{ textDecoration: 'none' }}>
              <button style={btnSecondary}>{t(ui.backHome, lang)}</button>
            </Link>
            <Link to={`/dashboard/${id}`} style={{ textDecoration: 'none' }}>
              <button
                style={{
                  ...btnPrimary,
                  padding: '12px 24px',
                  width: 'auto',
                  fontSize: '14px',
                }}
              >
                📊 {t(ui.viewDashboard, lang)}
              </button>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#1a1a2e' }}>
      <style>{sharedStyles}</style>

      <header
        style={{
          padding: '20px 40px',
          backgroundColor: '#16213e',
          borderBottom: '1px solid #2d3748',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            cursor: 'pointer',
          }}
          onClick={() => navigate('/')}
        >
          <span style={{ fontSize: '24px' }}>📋</span>
          <Link to="/" style={{ textDecoration: 'none', color: '#e0e0e0' }}>
            <span style={{ fontSize: '13px' }}>{t(ui.back, lang)}</span>
          </Link>
        </div>
        <button
          onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
          style={btnSecondary}
        >
          {lang === 'zh' ? 'English' : '中文'}
        </button>
      </header>

      <main style={{ padding: '40px 20px 80px', maxWidth: '720px', margin: '0 auto' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{
            backgroundColor: '#16213e',
            borderRadius: '16px',
            padding: '40px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            marginBottom: '28px',
          }}
        >
          <h1
            style={{
              fontSize: '30px',
              color: '#e0e0e0',
              fontWeight: 700,
              marginBottom: '12px',
              lineHeight: 1.3,
            }}
          >
            {t(survey.title, lang)}
          </h1>
          {(t(survey.description, lang) || '').trim() !== '' && (
            <p style={{ fontSize: '15px', color: '#a0a0a0', lineHeight: 1.7 }}>
              {t(survey.description, lang)}
            </p>
          )}
          <div style={{ marginTop: '20px', padding: '12px 16px', backgroundColor: '#0f172a', borderRadius: '10px' }}>
            <label style={{ fontSize: '12px', color: '#a0a0a0', display: 'block', marginBottom: '6px' }}>
              {t(ui.respondent, lang)}
            </label>
            <input
              type="text"
              value={respondent}
              onChange={(e) => setRespondent(e.target.value)}
              placeholder={lang === 'zh' ? '匿名用户' : 'Anonymous User'}
              style={{
                width: '100%',
                padding: '10px 14px',
                backgroundColor: '#1a1a2e',
                border: '1px solid #2d3748',
                borderRadius: '8px',
                color: '#e0e0e0',
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </motion.div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{
                padding: '14px 20px',
                backgroundColor: 'rgba(233,69,96,0.15)',
                border: '1px solid rgba(233,69,96,0.4)',
                borderRadius: '10px',
                color: '#e94560',
                fontSize: '14px',
                marginBottom: '20px',
              }}
            >
              ⚠️ {error}
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {survey.questions.map((q, idx) => (
            <QuestionRenderer
              key={q.id}
              index={idx}
              question={q}
              value={answers[q.id]}
              onChange={(val) => updateAnswer(q.id, val)}
              onToggleMultiple={(oid) => toggleMultiple(q.id, oid)}
              onRating={(val) => handleRating(q.id, val)}
              pulsedStars={pulsedStars}
              lang={lang}
              hasError={!!validationErrors[q.id]}
              requiredText={t(ui.required, lang)}
              requiredFieldText={t(ui.requiredField, lang)}
            />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 + survey.questions.length * 0.05, duration: 0.3 }}
          style={{ marginTop: '40px' }}
        >
          <button onClick={handleSubmit} disabled={submitting} style={btnPrimary}>
            {submitting ? `⏳ ${t(ui.submitting, lang)}` : `✓ ${t(ui.submit, lang)}`}
          </button>
        </motion.div>
      </main>
    </div>
  );
}

interface QuestionRendererProps {
  index: number;
  question: Question;
  value: AnswerValue;
  onChange: (val: AnswerValue) => void;
  onToggleMultiple: (optId: string) => void;
  onRating: (val: number) => void;
  pulsedStars: Record<string, number>;
  lang: Language;
  hasError: boolean;
  requiredText: string;
  requiredFieldText: string;
}

function QuestionRenderer({
  index,
  question,
  value,
  onChange,
  onToggleMultiple,
  onRating,
  pulsedStars,
  lang,
  hasError,
  requiredText,
  requiredFieldText,
}: QuestionRendererProps) {
  const qid = question.id;
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.05, duration: 0.35 }}
      style={{
        backgroundColor: '#16213e',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        border: hasError ? '1px solid #e94560' : '1px solid #2d3748',
        transition: 'border-color 0.2s',
      }}
    >
      <div style={{ marginBottom: '18px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            marginBottom: '6px',
          }}
        >
          <span
            style={{
              minWidth: '28px',
              height: '28px',
              borderRadius: '6px',
              backgroundColor: '#e9456020',
              color: '#e94560',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '13px',
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {index + 1}
          </span>
          <h3
            style={{
              fontSize: '17px',
              color: '#e0e0e0',
              fontWeight: 600,
              lineHeight: 1.5,
              wordBreak: 'break-word',
            }}
          >
            {t(question.title, lang) || (lang === 'zh' ? '题目' : 'Question')}
            {question.required && (
              <span style={{ color: '#e94560', marginLeft: '6px' }}>*</span>
            )}
          </h3>
        </div>
        {question.description && (t(question.description, lang) || '').trim() !== '' && (
          <p
            style={{
              fontSize: '14px',
              color: '#a0a0a0',
              paddingLeft: '38px',
              lineHeight: 1.5,
            }}
          >
            {t(question.description, lang)}
          </p>
        )}
        {hasError && (
          <p
            style={{
              fontSize: '12px',
              color: '#e94560',
              paddingLeft: '38px',
              marginTop: '8px',
              fontWeight: 500,
            }}
          >
            ⚠️ {requiredText}
          </p>
        )}
      </div>

      <div style={{ paddingLeft: '38px' }}>
        {(question.type === 'single_choice' || question.type === 'multiple_choice') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {(question.options || []).map((opt) => {
              const isSelected =
                question.type === 'single_choice'
                  ? value === opt.id
                  : Array.isArray(value) && value.includes(opt.id);
              return (
                <label
                  key={opt.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '14px 18px',
                    backgroundColor: isSelected ? '#1f2a4a' : '#0f172a',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    border: `1px solid ${isSelected ? '#e9456060' : '#2d3748'}`,
                    transition: 'all 0.15s',
                    userSelect: 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) (e.currentTarget as HTMLElement).style.borderColor = '#e9456040';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) (e.currentTarget as HTMLElement).style.borderColor = '#2d3748';
                  }}
                >
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: question.type === 'single_choice' ? '50%' : '4px',
                      border: `2px solid ${isSelected ? '#e94560' : '#6b7280'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      backgroundColor: isSelected ? '#e94560' : 'transparent',
                      transition: 'all 0.15s',
                    }}
                  >
                    {isSelected && (
                      <span
                        style={{
                          color: '#fff',
                          fontSize: question.type === 'single_choice' ? '8px' : '12px',
                          fontWeight: 700,
                        }}
                      >
                        {question.type === 'single_choice' ? '●' : '✓'}
                      </span>
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: '15px',
                      color: isSelected ? '#ffffff' : '#e0e0e0',
                      fontWeight: isSelected ? 500 : 400,
                    }}
                  >
                    {t(opt.label, lang)}
                  </span>
                </label>
              );
            })}
          </div>
        )}

        {question.type === 'rating' && (
          <div>
            <div style={{ display: 'inline-flex', gap: '12px' }}>
              {Array.from({ length: question.maxRating || 5 }).map((_, i) => {
                const rating = i + 1;
                const currentValue = typeof value === 'number' ? value : 0;
                const isActive = rating <= currentValue;
                const pulseKey = `${qid}_${rating}`;
                const isPulsing = !!pulsedStars[pulseKey];
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onRating(rating)}
                    className={isPulsing ? 'star-pulse' : ''}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      fontSize: '36px',
                      color: isActive ? '#f59e0b' : '#2d3748',
                      transition: 'color 0.15s, transform 0.15s',
                      lineHeight: 1,
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) (e.currentTarget as HTMLElement).style.color = '#f59e0b80';
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) (e.currentTarget as HTMLElement).style.color = '#2d3748';
                    }}
                  >
                    ★
                  </button>
                );
              })}
            </div>
            {typeof value === 'number' && value > 0 && (
              <div
                style={{
                  marginTop: '10px',
                  fontSize: '13px',
                  color: '#f59e0b',
                  fontWeight: 500,
                }}
              >
                {lang === 'zh'
                  ? `您选择了 ${value} / ${question.maxRating || 5} 星`
                  : `You selected ${value} / ${question.maxRating || 5} Stars`}
              </div>
            )}
          </div>
        )}

        {question.type === 'text' && (
          <textarea
            value={(typeof value === 'string' ? value : '') as string}
            onChange={(e) => onChange(e.target.value)}
            placeholder={t(question.placeholder || { zh: '', en: '' }, lang) || (lang === 'zh' ? '请输入您的回答...' : 'Please enter your answer...')}
            rows={5}
            style={{
              width: '100%',
              padding: '14px 16px',
              backgroundColor: '#0f172a',
              border: '1px solid #2d3748',
              borderRadius: '10px',
              color: '#e0e0e0',
              fontSize: '15px',
              lineHeight: 1.6,
              boxSizing: 'border-box' as const,
              resize: 'vertical',
              transition: 'border-color 0.15s',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = '#e9456060')}
            onBlur={(e) => (e.currentTarget.style.borderColor = '#2d3748')}
          />
        )}
      </div>
    </motion.div>
  );
}
