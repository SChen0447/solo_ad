import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
  Survey,
  Question,
  QuestionType,
  Option,
  Language,
  BilingualText,
} from './types';
import {
  t,
  generateId,
  getQuestionTypeLabel,
  getQuestionTypeIcon,
  copyToClipboard,
} from './utils';
import { createSurvey, getSurvey } from './api';

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
  .drag-placeholder {
    height: 2px;
    background: #e94560;
    border-radius: 2px;
    margin: 4px 0;
    box-shadow: 0 0 8px rgba(233,69,96,0.5);
  }
  textarea { resize: vertical; }
`;

const btnPrimary = {
  padding: '10px 20px',
  borderRadius: '8px',
  backgroundColor: '#e94560',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 600,
};

const btnSecondary = {
  padding: '8px 16px',
  borderRadius: '8px',
  backgroundColor: 'transparent',
  color: '#e0e0e0',
  fontSize: '13px',
  border: '1px solid #2d3748',
};

const cardInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  backgroundColor: '#0f0f1e',
  border: '1px solid #2d3748',
  borderRadius: '8px',
  color: '#e0e0e0',
  fontSize: '13px',
  boxSizing: 'border-box' as const,
};

const makeEmptyQuestion = (type: QuestionType): Question => {
  const id = generateId();
  const base: Question = {
    id,
    type,
    title: { zh: '', en: '' },
    description: { zh: '', en: '' },
    required: false,
  };
  if (type === 'single_choice' || type === 'multiple_choice') {
    base.options = [
      { id: generateId(), label: { zh: '选项1', en: 'Option 1' } },
      { id: generateId(), label: { zh: '选项2', en: 'Option 2' } },
    ];
  }
  if (type === 'rating') {
    base.maxRating = 5;
  }
  if (type === 'text') {
    base.placeholder = { zh: '请输入...', en: 'Please enter...' };
  }
  return base;
};

const defaultSurvey = (): Survey => ({
  title: { zh: '新问卷', en: 'New Survey' },
  description: { zh: '', en: '' },
  questions: [],
});

interface SurveyDesignerProps {}

export default function SurveyDesigner({}: SurveyDesignerProps) {
  const navigate = useNavigate();
  const { id } = useParams();
  const [lang, setLang] = useState<Language>('zh');
  const [survey, setSurvey] = useState<Survey>(defaultSurvey());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [loading, setLoading] = useState(!!id);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  useEffect(() => {
    if (id) {
      getSurvey(id)
        .then((s) => {
          setSurvey(s);
          setSavedId(id);
        })
        .catch(() => showToast('加载问卷失败', 'error'))
        .finally(() => setLoading(false));
    }
  }, [id]);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  const ui = {
    back: { zh: '← 返回', en: '← Back' },
    designerTitle: { zh: '问卷设计器', en: 'Survey Designer' },
    language: { zh: '语言', en: 'Language' },
    preview: { zh: '预览', en: 'Preview' },
    save: { zh: '保存', en: 'Save' },
    saving: { zh: '保存中...', en: 'Saving...' },
    surveyTitle: { zh: '问卷标题', en: 'Survey Title' },
    surveyDesc: { zh: '问卷描述', en: 'Survey Description' },
    addQuestion: { zh: '+ 添加问题', en: '+ Add Question' },
    questionList: { zh: '问题列表', en: 'Question List' },
    empty: { zh: '点击上方按钮添加问题', en: 'Click button above to add questions' },
    editPanel: { zh: '问题编辑', en: 'Question Editor' },
    selectHint: { zh: '请选择左侧问题进行编辑', en: 'Select a question from left to edit' },
    questionTitle: { zh: '题目标题', en: 'Question Title' },
    questionDesc: { zh: '题目描述/辅助说明', en: 'Description / Hint' },
    required: { zh: '必填', en: 'Required' },
    questionType: { zh: '题目类型', en: 'Question Type' },
    options: { zh: '选项列表', en: 'Options' },
    addOption: { zh: '+ 添加选项', en: '+ Add Option' },
    maxRating: { zh: '最高评分', en: 'Max Rating' },
    placeholder: { zh: '输入提示', en: 'Placeholder' },
    delete: { zh: '删除', en: 'Delete' },
    duplicate: { zh: '复制', en: 'Duplicate' },
    moveUp: { zh: '上移', en: 'Move Up' },
    moveDown: { zh: '下移', en: 'Move Down' },
    previewTitle: { zh: '问卷预览', en: 'Survey Preview' },
    close: { zh: '关闭', en: 'Close' },
    saved: { zh: '保存成功！', en: 'Saved successfully!' },
    shareLink: { zh: '复制作答链接', en: 'Copy Answer Link' },
    dashboardLink: { zh: '查看数据看板', en: 'View Dashboard' },
    zhLabel: { zh: '中文', en: 'Chinese' },
    enLabel: { zh: '英文', en: 'English' },
    dragHint: { zh: '拖拽可调整顺序', en: 'Drag to reorder' },
  };

  const addQuestion = (type: QuestionType) => {
    const q = makeEmptyQuestion(type);
    setSurvey({ ...survey, questions: [...survey.questions, q] });
    setSelectedId(q.id);
  };

  const updateQuestion = (qid: string, patch: Partial<Question>) => {
    setSurvey({
      ...survey,
      questions: survey.questions.map((q) =>
        q.id === qid ? { ...q, ...patch } : q
      ),
    });
  };

  const updateQuestionTitle = (qid: string, field: 'zh' | 'en', value: string) => {
    setSurvey({
      ...survey,
      questions: survey.questions.map((q) =>
        q.id === qid
          ? {
              ...q,
              title: { ...q.title, [field]: value },
            }
          : q
      ),
    });
  };

  const updateQuestionDesc = (qid: string, field: 'zh' | 'en', value: string) => {
    setSurvey({
      ...survey,
      questions: survey.questions.map((q) =>
        q.id === qid
          ? {
              ...q,
              description: { ...(q.description || { zh: '', en: '' }), [field]: value },
            }
          : q
      ),
    });
  };

  const updateOption = (qid: string, optId: string, field: 'zh' | 'en', value: string) => {
    setSurvey({
      ...survey,
      questions: survey.questions.map((q) => {
        if (q.id !== qid) return q;
        return {
          ...q,
          options: (q.options || []).map((o) =>
            o.id === optId ? { ...o, label: { ...o.label, [field]: value } } : o
          ),
        };
      }),
    });
  };

  const addOptionToQuestion = (qid: string) => {
    setSurvey({
      ...survey,
      questions: survey.questions.map((q) => {
        if (q.id !== qid) return q;
        const opts = q.options || [];
        const nextIdx = opts.length + 1;
        return {
          ...q,
          options: [
            ...opts,
            { id: generateId(), label: { zh: `选项${nextIdx}`, en: `Option ${nextIdx}` } },
          ],
        };
      }),
    });
  };

  const removeOption = (qid: string, optId: string) => {
    setSurvey({
      ...survey,
      questions: survey.questions.map((q) => {
        if (q.id !== qid) return q;
        return { ...q, options: (q.options || []).filter((o) => o.id !== optId) };
      }),
    });
  };

  const deleteQuestion = (qid: string) => {
    setSurvey({
      ...survey,
      questions: survey.questions.filter((q) => q.id !== qid),
    });
    if (selectedId === qid) setSelectedId(null);
  };

  const duplicateQuestion = (qid: string) => {
    const idx = survey.questions.findIndex((q) => q.id === qid);
    if (idx < 0) return;
    const src = survey.questions[idx];
    const copy: Question = {
      ...JSON.parse(JSON.stringify(src)),
      id: generateId(),
      options: src.options?.map((o) => ({ ...o, id: generateId() })),
    };
    const newQuestions = [...survey.questions];
    newQuestions.splice(idx + 1, 0, copy);
    setSurvey({ ...survey, questions: newQuestions });
    setSelectedId(copy.id);
  };

  const moveQuestion = (qid: string, dir: -1 | 1) => {
    const idx = survey.questions.findIndex((q) => q.id === qid);
    const newIdx = idx + dir;
    if (idx < 0 || newIdx < 0 || newIdx >= survey.questions.length) return;
    const newQuestions = [...survey.questions];
    [newQuestions[idx], newQuestions[newIdx]] = [newQuestions[newIdx], newQuestions[idx]];
    setSurvey({ ...survey, questions: newQuestions });
  };

  const handleDragStart = (e: React.DragEvent, qid: string) => {
    setDraggedId(qid);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (!draggedId) return;
    const fromIdx = survey.questions.findIndex((q) => q.id === draggedId);
    if (fromIdx < 0) return;
    let toIdx = dropIndex;
    if (fromIdx < toIdx) toIdx -= 1;
    const newQuestions = [...survey.questions];
    const [moved] = newQuestions.splice(fromIdx, 1);
    newQuestions.splice(toIdx, 0, moved);
    setSurvey({ ...survey, questions: newQuestions });
    setDraggedId(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverIndex(null);
  };

  const handleSave = async () => {
    if (!survey.title.zh && !survey.title.en) {
      showToast('请填写问卷标题', 'error');
      return;
    }
    if (survey.questions.length === 0) {
      showToast('请至少添加一道题目', 'error');
      return;
    }
    setSaving(true);
    try {
      const saved = await createSurvey({
        title: survey.title,
        description: survey.description,
        questions: survey.questions,
      });
      setSavedId(saved.id || null);
      showToast(t(ui.saved, lang));
    } catch (e: any) {
      showToast(e.message || t(ui.saved, lang) + ' ' + 'failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const selectedQuestion = useMemo(
    () => survey.questions.find((q) => q.id === selectedId) || null,
    [survey.questions, selectedId]
  );

  const answerLink = savedId ? `${window.location.origin}/answer/${savedId}` : '';
  const dashboardLink = savedId ? `${window.location.origin}/dashboard/${savedId}` : '';

  const questionTypeOptions: { type: QuestionType; color: string }[] = [
    { type: 'single_choice', color: '#3b82f6' },
    { type: 'multiple_choice', color: '#8b5cf6' },
    { type: 'rating', color: '#f59e0b' },
    { type: 'text', color: '#10b981' },
  ];

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
        }}
      >
        {t({ zh: '加载中...', en: 'Loading...' }, lang)}
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#1a1a2e' }}>
      <style>{sharedStyles}</style>

      <header
        style={{
          padding: '16px 32px',
          backgroundColor: '#16213e',
          borderBottom: '1px solid #2d3748',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button onClick={() => navigate('/')} style={btnSecondary}>
            {t(ui.back, lang)}
          </button>
          <div>
            <h1 style={{ fontSize: '18px', color: '#e0e0e0', fontWeight: 700 }}>
              🛠️ {t(ui.designerTitle, lang)}
            </h1>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
            style={btnSecondary}
          >
            {lang === 'zh' ? 'EN' : '中文'}
          </button>
          <button onClick={() => setShowPreview(true)} style={btnSecondary}>
            👁️ {t(ui.preview, lang)}
          </button>
          <button onClick={handleSave} style={btnPrimary} disabled={saving}>
            {saving ? t(ui.saving, lang) : `💾 ${t(ui.save, lang)}`}
          </button>
        </div>
      </header>

      {savedId && (
        <div
          style={{
            padding: '12px 32px',
            backgroundColor: 'rgba(16,185,129,0.1)',
            borderBottom: '1px solid rgba(16,185,129,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ color: '#10b981', fontSize: '14px' }}>
            ✅ {t(ui.saved, lang)} ID: {savedId}
          </span>
          <button
            onClick={async () => {
              await copyToClipboard(answerLink);
              showToast(lang === 'zh' ? '已复制作答链接' : 'Answer link copied');
            }}
            style={btnSecondary}
          >
            🔗 {t(ui.shareLink, lang)}
          </button>
          <button
            onClick={() => navigate(`/dashboard/${savedId}`)}
            style={{ ...btnSecondary, borderColor: '#e94560', color: '#e94560' }}
          >
            📊 {t(ui.dashboardLink, lang)}
          </button>
        </div>
      )}

      <main
        style={{
          display: 'grid',
          gridTemplateColumns: '380px 1fr 340px',
          gap: '20px',
          padding: '24px 32px',
          height: 'calc(100vh - 130px)',
          minHeight: '600px',
        }}
      >
        <div
          style={{
            backgroundColor: '#16213e',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          }}
        >
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', color: '#a0a0a0', display: 'block', marginBottom: '6px' }}>
              {t(ui.surveyTitle, lang)} *
            </label>
            <BilingualInput
              value={survey.title}
              onChange={(field, val) =>
                setSurvey({ ...survey, title: { ...survey.title, [field]: val } })
              }
              lang={lang}
              labels={ui}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', color: '#a0a0a0', display: 'block', marginBottom: '6px' }}>
              {t(ui.surveyDesc, lang)}
            </label>
            <BilingualTextarea
              value={survey.description}
              onChange={(field, val) =>
                setSurvey({
                  ...survey,
                  description: { ...survey.description, [field]: val },
                })
              }
              lang={lang}
              rows={2}
              labels={ui}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', color: '#a0a0a0', display: 'block', marginBottom: '8px' }}>
              {t(ui.addQuestion, lang)}
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {questionTypeOptions.map(({ type, color }) => (
                <button
                  key={type}
                  onClick={() => addQuestion(type)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'transparent',
                    border: `1px solid ${color}50`,
                    color: color,
                    fontSize: '12px',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.15s',
                  }}
                >
                  <span style={{ fontSize: '14px' }}>{getQuestionTypeIcon(type)}</span>
                  <span>{getQuestionTypeLabel(type, lang)}</span>
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h3 style={{ fontSize: '14px', color: '#e0e0e0', fontWeight: 600 }}>
              {t(ui.questionList, lang)} ({survey.questions.length})
            </h3>
            <span style={{ fontSize: '11px', color: '#6b7280' }}>{t(ui.dragHint, lang)}</span>
          </div>

          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              minHeight: 0,
            }}
          >
            {survey.questions.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '40px 16px',
                  color: '#6b7280',
                  fontSize: '13px',
                  border: '2px dashed #2d3748',
                  borderRadius: '12px',
                }}
              >
                {t(ui.empty, lang)}
              </div>
            ) : (
              survey.questions.map((q, idx) => {
                const isSelected = selectedId === q.id;
                const typeColor = questionTypeOptions.find((o) => o.type === q.type)?.color || '#e94560';
                return (
                  <div key={q.id}>
                    {draggedId && dragOverIndex === idx && draggedId !== q.id && (
                      <div className="drag-placeholder" />
                    )}
                    <motion.div
                      draggable
                      onDragStart={(e) => handleDragStart(e, q.id)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDrop={(e) => handleDrop(e, idx)}
                      onDragEnd={handleDragEnd}
                      layout
                      animate={{
                        opacity: draggedId === q.id ? 0.5 : 1,
                        scale: isSelected ? 1 : 1,
                      }}
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      onClick={() => setSelectedId(q.id)}
                      style={{
                        padding: '12px 14px',
                        backgroundColor: isSelected ? '#1f2a4a' : '#0f172a',
                        borderRadius: '12px',
                        border: `1px solid ${isSelected ? '#e9456060' : '#2d3748'}`,
                        cursor: 'grab',
                        boxShadow: isSelected ? '0 4px 16px rgba(0,0,0,0.3)' : '0 4px 16px rgba(0,0,0,0.15)',
                        display: 'flex',
                        gap: '10px',
                        alignItems: 'flex-start',
                        userSelect: 'none',
                        transition: 'border-color 0.15s',
                      }}
                      className={draggedId === q.id ? 'dragging-item' : ''}
                    >
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '6px',
                          backgroundColor: typeColor + '20',
                          color: typeColor,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {idx + 1}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                          <span style={{ fontSize: '10px', color: typeColor, fontWeight: 600 }}>
                            {getQuestionTypeIcon(q.type)} {getQuestionTypeLabel(q.type, lang)}
                          </span>
                          {q.required && (
                            <span style={{ fontSize: '10px', color: '#e94560', fontWeight: 600 }}>
                              *
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: '13px',
                            color: '#e0e0e0',
                            fontWeight: 500,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {t(q.title, lang) || (lang === 'zh' ? '（未填写标题）' : '(Untitled)')}
                        </div>
                      </div>
                    </motion.div>
                  </div>
                );
              })
            )}
            {draggedId && dragOverIndex === survey.questions.length && (
              <div className="drag-placeholder" />
            )}
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#16213e',
            borderRadius: '12px',
            padding: '24px',
            overflowY: 'auto',
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          }}
        >
          {!selectedQuestion ? (
            <div
              style={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                color: '#6b7280',
                gap: '16px',
              }}
            >
              <div style={{ fontSize: '64px' }}>✏️</div>
              <p style={{ fontSize: '15px' }}>{t(ui.selectHint, lang)}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '18px', color: '#e0e0e0', fontWeight: 600 }}>
                  📝 {t(ui.editPanel, lang)}
                </h2>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => moveQuestion(selectedQuestion!.id, -1)}
                    style={btnSecondary}
                    title={t(ui.moveUp, lang)}
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveQuestion(selectedQuestion!.id, 1)}
                    style={btnSecondary}
                    title={t(ui.moveDown, lang)}
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => duplicateQuestion(selectedQuestion!.id)}
                    style={btnSecondary}
                  >
                    ⎘ {t(ui.duplicate, lang)}
                  </button>
                  <button
                    onClick={() => deleteQuestion(selectedQuestion!.id)}
                    style={{
                      ...btnSecondary,
                      borderColor: '#e94560',
                      color: '#e94560',
                    }}
                  >
                    🗑️ {t(ui.delete, lang)}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#a0a0a0', display: 'block', marginBottom: '6px' }}>
                  {t(ui.questionType, lang)}
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {questionTypeOptions.map(({ type, color }) => (
                    <button
                      key={type}
                      onClick={() => updateQuestion(selectedQuestion!.id, { type })}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '8px',
                        backgroundColor:
                          selectedQuestion!.type === type ? color + '30' : 'transparent',
                        border: `1px solid ${
                          selectedQuestion!.type === type ? color : '#2d3748'
                        }`,
                        color: selectedQuestion!.type === type ? color : '#a0a0a0',
                        fontSize: '12px',
                        fontWeight: 500,
                        transition: 'all 0.15s',
                      }}
                    >
                      {getQuestionTypeIcon(type)} {getQuestionTypeLabel(type, lang)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#a0a0a0', display: 'block', marginBottom: '6px' }}>
                  {t(ui.questionTitle, lang)} *
                </label>
                <BilingualInput
                  value={selectedQuestion.title}
                  onChange={(field, val) => updateQuestionTitle(selectedQuestion!.id, field, val)}
                  lang={lang}
                  labels={ui}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#a0a0a0', display: 'block', marginBottom: '6px' }}>
                  {t(ui.questionDesc, lang)}
                </label>
                <BilingualTextarea
                  value={selectedQuestion.description || { zh: '', en: '' }}
                  onChange={(field, val) => updateQuestionDesc(selectedQuestion!.id, field, val)}
                  lang={lang}
                  rows={2}
                  labels={ui}
                />
              </div>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  padding: '12px',
                  backgroundColor: '#0f172a',
                  borderRadius: '8px',
                  border: '1px solid #2d3748',
                  width: 'fit-content',
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedQuestion.required}
                  onChange={(e) =>
                    updateQuestion(selectedQuestion!.id, { required: e.target.checked })
                  }
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '13px', color: '#e0e0e0' }}>{t(ui.required, lang)}</span>
              </label>

              {(selectedQuestion.type === 'single_choice' || selectedQuestion.type === 'multiple_choice') && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <label style={{ fontSize: '12px', color: '#a0a0a0' }}>
                      {t(ui.options, lang)} ({(selectedQuestion.options || []).length})
                    </label>
                    <button
                      onClick={() => addOptionToQuestion(selectedQuestion!.id)}
                      style={{ ...btnSecondary, padding: '4px 10px', fontSize: '12px' }}
                    >
                      +
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(selectedQuestion.options || []).map((opt, i) => (
                      <div
                        key={opt.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px',
                          backgroundColor: '#0f172a',
                          borderRadius: '8px',
                        }}
                      >
                        <span style={{ color: '#6b7280', fontSize: '13px', width: '24px' }}>
                          {i + 1}.
                        </span>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <input
                            style={cardInputStyle}
                            placeholder={lang === 'zh' ? '中文选项' : 'Option (Chinese)'}
                            value={opt.label.zh}
                            onChange={(e) =>
                              updateOption(selectedQuestion!.id, opt.id, 'zh', e.target.value)
                            }
                          />
                          <input
                            style={cardInputStyle}
                            placeholder={lang === 'zh' ? '英文选项' : 'Option (English)'}
                            value={opt.label.en}
                            onChange={(e) =>
                              updateOption(selectedQuestion!.id, opt.id, 'en', e.target.value)
                            }
                          />
                        </div>
                        <button
                          onClick={() => removeOption(selectedQuestion!.id, opt.id)}
                          style={{
                            ...btnSecondary,
                            padding: '4px 10px',
                            fontSize: '12px',
                            borderColor: '#e94560',
                            color: '#e94560',
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedQuestion.type === 'rating' && (
                <div>
                  <label style={{ fontSize: '12px', color: '#a0a0a0', display: 'block', marginBottom: '6px' }}>
                    {t(ui.maxRating, lang)}
                  </label>
                  <select
                    style={cardInputStyle}
                    value={selectedQuestion.maxRating || 5}
                    onChange={(e) =>
                      updateQuestion(selectedQuestion!.id, { maxRating: Number(e.target.value) })
                    }
                  >
                    {[3, 4, 5, 7, 10].map((n) => (
                      <option key={n} value={n}>
                        {n} ({lang === 'zh' ? `1-${n}星` : `1-${n} Stars`})
                      </option>
                    ))}
                  </select>
                  <div style={{ marginTop: '12px', fontSize: '28px', color: '#f59e0b' }}>
                    {Array.from({ length: selectedQuestion.maxRating || 5 }).map((_, i) => (
                      <span key={i} style={{ marginRight: '4px' }}>★</span>
                    ))}
                  </div>
                </div>
              )}

              {selectedQuestion.type === 'text' && (
                <div>
                  <label style={{ fontSize: '12px', color: '#a0a0a0', display: 'block', marginBottom: '6px' }}>
                    {t(ui.placeholder, lang)}
                  </label>
                  <BilingualInput
                    value={selectedQuestion.placeholder || { zh: '', en: '' }}
                    onChange={(field, val) =>
                      updateQuestion(selectedQuestion!.id, {
                        placeholder: {
                          ...(selectedQuestion!.placeholder || { zh: '', en: '' }),
                          [field]: val,
                        },
                      })
                    }
                    lang={lang}
                    labels={ui}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <div
          style={{
            backgroundColor: '#16213e',
            borderRadius: '12px',
            padding: '20px',
            overflowY: 'auto',
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          }}
        >
          <h3 style={{ fontSize: '16px', color: '#e0e0e0', fontWeight: 600, marginBottom: '16px' }}>
            👁️ {t(ui.previewTitle, lang)}
          </h3>
          <PreviewPanel survey={survey} lang={lang} />
        </div>
      </main>

      <AnimatePresence>
        {showPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.7)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px',
            }}
            onClick={() => setShowPreview(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: '640px',
                maxHeight: '90vh',
                overflowY: 'auto',
                backgroundColor: '#1a1a2e',
                borderRadius: '16px',
                padding: '32px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '20px', color: '#e0e0e0' }}>👁️ {t(ui.previewTitle, lang)}</h2>
                <button onClick={() => setShowPreview(false)} style={btnSecondary}>
                  ✕ {t(ui.close, lang)}
                </button>
              </div>
              <PreviewPanel survey={survey} lang={lang} full />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            style={{
              position: 'fixed',
              bottom: '32px',
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '12px 24px',
              backgroundColor: toast.type === 'success' ? '#10b981' : '#e94560',
              color: '#fff',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500,
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
              zIndex: 2000,
            }}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface BilingualProps {
  value: BilingualText;
  onChange: (field: 'zh' | 'en', value: string) => void;
  lang: Language;
  labels: any;
  rows?: number;
}

function BilingualInput({ value, onChange, lang, labels }: BilingualProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <input
        style={cardInputStyle}
        placeholder={`${lang === 'zh' ? '中文 / ' : '中文'}Zh`}
        value={value.zh}
        onChange={(e) => onChange('zh', e.target.value)}
      />
      <input
        style={cardInputStyle}
        placeholder={`${lang === 'en' ? 'English / ' : 'English'}En`}
        value={value.en}
        onChange={(e) => onChange('en', e.target.value)}
      />
    </div>
  );
}

function BilingualTextarea({ value, onChange, lang, rows = 3 }: BilingualProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <textarea
        style={{ ...cardInputStyle, minHeight: `${rows * 24}px` }}
        rows={rows}
        placeholder={`${lang === 'zh' ? '中文 / ' : '中文'}Zh`}
        value={value.zh}
        onChange={(e) => onChange('zh', e.target.value)}
      />
      <textarea
        style={{ ...cardInputStyle, minHeight: `${rows * 24}px` }}
        rows={rows}
        placeholder={`${lang === 'en' ? 'English / ' : 'English'}En`}
        value={value.en}
        onChange={(e) => onChange('en', e.target.value)}
      />
    </div>
  );
}

function PreviewPanel({ survey, lang, full = false }: { survey: Survey; lang: Language; full?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: full ? '20px' : '14px' }}>
      <div>
        <h1
          style={{
            fontSize: full ? '28px' : '18px',
            color: '#e0e0e0',
            fontWeight: 700,
            marginBottom: '8px',
          }}
        >
          {t(survey.title, lang) || (lang === 'zh' ? '问卷标题' : 'Survey Title')}
        </h1>
        {(t(survey.description, lang) || '').trim() !== '' && (
          <p style={{ fontSize: full ? '15px' : '12px', color: '#a0a0a0', lineHeight: 1.6 }}>
            {t(survey.description, lang)}
          </p>
        )}
      </div>

      {survey.questions.length === 0 ? (
        <div
          style={{
            padding: full ? '60px 20px' : '30px 10px',
            textAlign: 'center',
            color: '#6b7280',
            fontSize: full ? '14px' : '12px',
            border: '2px dashed #2d3748',
            borderRadius: '12px',
          }}
        >
          {lang === 'zh' ? '暂无问题预览' : 'No questions to preview'}
        </div>
      ) : (
        survey.questions.map((q, idx) => (
          <div
            key={q.id}
            style={{
              padding: full ? '20px' : '14px',
              backgroundColor: '#0f172a',
              borderRadius: '12px',
              border: '1px solid #2d3748',
            }}
          >
            <div style={{ marginBottom: '12px' }}>
              <span style={{ fontSize: full ? '16px' : '13px', color: '#e0e0e0', fontWeight: 600 }}>
                {idx + 1}. {t(q.title, lang) || (lang === 'zh' ? '题目' : 'Question')}
                {q.required && <span style={{ color: '#e94560', marginLeft: '4px' }}>*</span>}
              </span>
              {q.description && (t(q.description, lang) || '').trim() !== '' && (
                <p style={{ fontSize: full ? '14px' : '11px', color: '#a0a0a0', marginTop: '4px' }}>
                  {t(q.description, lang)}
                </p>
              )}
            </div>

            {(q.type === 'single_choice' || q.type === 'multiple_choice') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(q.options || []).map((opt) => (
                  <label
                    key={opt.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 14px',
                      backgroundColor: '#16213e',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      border: '1px solid transparent',
                      transition: 'border-color 0.15s',
                    }}
                  >
                    <input
                      type={q.type === 'single_choice' ? 'radio' : 'checkbox'}
                      disabled
                      style={{ width: '14px', height: '14px' }}
                    />
                    <span style={{ fontSize: full ? '14px' : '12px', color: '#e0e0e0' }}>
                      {t(opt.label, lang)}
                    </span>
                  </label>
                ))}
              </div>
            )}

            {q.type === 'rating' && (
              <div style={{ fontSize: full ? '32px' : '24px', display: 'inline-flex', gap: full ? '8px' : '4px' }}>
                {Array.from({ length: q.maxRating || 5 }).map((_, i) => (
                  <span key={i} style={{ color: '#f59e0b' }}>
                    ☆
                  </span>
                ))}
              </div>
            )}

            {q.type === 'text' && (
              <textarea
                disabled
                placeholder={t(q.placeholder || { zh: '', en: '' }, lang)}
                rows={full ? 4 : 3}
                style={{
                  ...cardInputStyle,
                  fontSize: full ? '14px' : '12px',
                  opacity: 0.7,
                }}
              />
            )}
          </div>
        ))
      )}

      {full && (
        <button style={{ ...btnPrimary, padding: '14px', fontSize: '15px' }} disabled>
          {lang === 'zh' ? '提交问卷' : 'Submit Survey'}
        </button>
      )}
    </div>
  );
}
