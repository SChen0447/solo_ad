import { useState, useMemo, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import {
  getAllQuestions,
  filterQuestions,
  addQuestion,
  type Question,
  type QuestionType,
  type Difficulty,
} from '../data/questionBank';

const typeLabel: Record<QuestionType, string> = {
  single: '单选题',
  multiple: '多选题',
  judge: '判断题',
};

const difficultyLabel: Record<Difficulty, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
};

const optionLabels = ['A', 'B', 'C', 'D', 'E', 'F'];

interface QuestionForm {
  type: QuestionType;
  content: string;
  options: string[];
  answerSingle: string;
  answerMultiple: string[];
  answerJudge: string;
  analysis: string;
  difficulty: Difficulty;
  tags: string;
  score: number;
}

const emptyForm: QuestionForm = {
  type: 'single',
  content: '',
  options: ['', '', '', ''],
  answerSingle: 'A',
  answerMultiple: [],
  answerJudge: '正确',
  analysis: '',
  difficulty: 'easy',
  tags: '',
  score: 2,
};

export default function QuestionBankPage() {
  const [questions, setQuestions] = useState<Question[]>(() => getAllQuestions());
  const [filterType, setFilterType] = useState<QuestionType | ''>('');
  const [filterDifficulty, setFilterDifficulty] = useState<Difficulty | ''>('');
  const [filterTag, setFilterTag] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<QuestionForm>(emptyForm);
  const [animKey, setAnimKey] = useState(0);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    questions.forEach((q) => q.tags.forEach((t) => set.add(t)));
    return Array.from(set);
  }, [questions]);

  const filtered = useMemo(() => {
    return filterQuestions({
      type: filterType || undefined,
      difficulty: filterDifficulty || undefined,
      tag: filterTag || undefined,
    });
  }, [questions, filterType, filterDifficulty, filterTag]);

  useEffect(() => {
    setAnimKey((k) => k + 1);
  }, [filtered.length]);

  const handleSubmit = () => {
    if (!form.content.trim()) {
      alert('请输入题目内容');
      return;
    }

    let answer: string | string[];
    if (form.type === 'single') answer = form.answerSingle;
    else if (form.type === 'multiple') answer = form.answerMultiple;
    else answer = form.answerJudge;

    const options =
      form.type === 'judge'
        ? undefined
        : form.options.filter((o) => o.trim() !== '');

    if (form.type !== 'judge' && options && options.length < 2) {
      alert('请至少填写2个选项');
      return;
    }

    const newQ = addQuestion({
      type: form.type,
      content: form.content,
      options,
      answer,
      analysis: form.analysis,
      difficulty: form.difficulty,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      score: form.score,
    });

    setQuestions([newQ, ...questions]);
    setForm(emptyForm);
    setShowModal(false);
  };

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 className="page-title" style={{ margin: 0 }}>题库管理</h1>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Plus size={16} /> 添加题目
          </span>
        </button>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="filter-bar" style={{ margin: 0 }}>
          <div className="filter-item">
            <label className="form-label">题型</label>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value as QuestionType | '')}>
              <option value="">全部题型</option>
              <option value="single">单选题</option>
              <option value="multiple">多选题</option>
              <option value="judge">判断题</option>
            </select>
          </div>
          <div className="filter-item">
            <label className="form-label">难度</label>
            <select value={filterDifficulty} onChange={(e) => setFilterDifficulty(e.target.value as Difficulty | '')}>
              <option value="">全部难度</option>
              <option value="easy">简单</option>
              <option value="medium">中等</option>
              <option value="hard">困难</option>
            </select>
          </div>
          <div className="filter-item">
            <label className="form-label">标签</label>
            <select value={filterTag} onChange={(e) => setFilterTag(e.target.value)}>
              <option value="">全部标签</option>
              {allTags.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div style={{ marginLeft: 'auto', alignSelf: 'center', color: 'var(--text-secondary)', fontSize: 14 }}>
            共 <strong style={{ color: 'var(--primary-color)' }}>{filtered.length}</strong> 道题目
          </div>
        </div>
      </div>

      <div className="question-list" key={animKey}>
        {filtered.map((q, idx) => (
          <div
            key={q.id}
            className="question-item"
            style={{ animationDelay: `${Math.min(idx * 30, 300)}ms` }}
          >
            <div className="question-header">
              <span className={`tag tag-${q.type}`}>{typeLabel[q.type]}</span>
              <span className={`tag tag-${q.difficulty}`}>{difficultyLabel[q.difficulty]}</span>
              {q.tags.map((t) => (
                <span key={t} className="tag" style={{ background: '#F3F4F6', color: '#4B5563' }}>
                  {t}
                </span>
              ))}
              <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-secondary)' }}>
                {q.score}分
              </span>
            </div>
            <div className="question-content">{q.content}</div>
            {q.options && (
              <div className="question-options">
                {q.options.map((opt, i) => (
                  <div key={i} className="question-option">
                    {optionLabels[i]}. {opt}
                  </div>
                ))}
              </div>
            )}
            {q.type === 'judge' && (
              <div className="question-options">
                <div className="question-option">正确 / 错误</div>
              </div>
            )}
            <div className="question-meta">
              <span>
                答案：
                <strong style={{ color: 'var(--primary-color)' }}>
                  {Array.isArray(q.answer) ? q.answer.join(', ') : q.answer}
                </strong>
              </span>
              <span style={{ color: 'var(--text-light)' }}>解析：{q.analysis || '暂无'}</span>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="card empty-state">
          <div className="empty-state-icon">📭</div>
          <div>暂无符合条件的题目</div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">添加题目</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="form-grid">
              <div>
                <label className="form-label">题目类型</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as QuestionType })}
                  style={{ width: '100%' }}
                >
                  <option value="single">单选题</option>
                  <option value="multiple">多选题</option>
                  <option value="judge">判断题</option>
                </select>
              </div>
              <div>
                <label className="form-label">难度</label>
                <select
                  value={form.difficulty}
                  onChange={(e) => setForm({ ...form, difficulty: e.target.value as Difficulty })}
                  style={{ width: '100%' }}
                >
                  <option value="easy">简单</option>
                  <option value="medium">中等</option>
                  <option value="hard">困难</option>
                </select>
              </div>
              <div>
                <label className="form-label">分值</label>
                <input
                  type="number"
                  value={form.score}
                  onChange={(e) => setForm({ ...form, score: Number(e.target.value) })}
                  style={{ width: '100%' }}
                  min={1}
                />
              </div>
              <div>
                <label className="form-label">标签（逗号分隔）</label>
                <input
                  type="text"
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  placeholder="如：React, 前端"
                  style={{ width: '100%' }}
                />
              </div>

              <div className="full-width">
                <label className="form-label">题目内容</label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="请输入题目内容"
                  style={{ width: '100%', minHeight: 80, resize: 'vertical' }}
                />
              </div>

              {form.type !== 'judge' && (
                <div className="full-width">
                  <label className="form-label">选项</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {form.options.map((opt, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ minWidth: 24, fontWeight: 600 }}>{optionLabels[i]}.</span>
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => {
                            const newOpts = [...form.options];
                            newOpts[i] = e.target.value;
                            setForm({ ...form, options: newOpts });
                          }}
                          style={{ flex: 1 }}
                          placeholder={`选项 ${optionLabels[i]}`}
                        />
                      </div>
                    ))}
                    {form.options.length < 6 && (
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ alignSelf: 'flex-start', padding: '6px 14px', fontSize: 13 }}
                        onClick={() => setForm({ ...form, options: [...form.options, ''] })}
                      >
                        + 添加选项
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="full-width">
                <label className="form-label">正确答案</label>
                {form.type === 'single' && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    {form.options.slice(0, form.options.findIndex((o) => !o) || form.options.length).map((_, i) => (
                      <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                        <input
                          type="radio"
                          checked={form.answerSingle === optionLabels[i]}
                          onChange={() => setForm({ ...form, answerSingle: optionLabels[i] })}
                        />
                        {optionLabels[i]}
                      </label>
                    ))}
                  </div>
                )}
                {form.type === 'multiple' && (
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {form.options.slice(0, form.options.findIndex((o) => !o) || form.options.length).map((_, i) => (
                      <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={form.answerMultiple.includes(optionLabels[i])}
                          onChange={(e) => {
                            const v = optionLabels[i];
                            setForm({
                              ...form,
                              answerMultiple: e.target.checked
                                ? [...form.answerMultiple, v]
                                : form.answerMultiple.filter((x) => x !== v),
                            });
                          }}
                        />
                        {optionLabels[i]}
                      </label>
                    ))}
                  </div>
                )}
                {form.type === 'judge' && (
                  <div style={{ display: 'flex', gap: 12 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                      <input
                        type="radio"
                        checked={form.answerJudge === '正确'}
                        onChange={() => setForm({ ...form, answerJudge: '正确' })}
                      />
                      正确
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                      <input
                        type="radio"
                        checked={form.answerJudge === '错误'}
                        onChange={() => setForm({ ...form, answerJudge: '错误' })}
                      />
                      错误
                    </label>
                  </div>
                )}
              </div>

              <div className="full-width">
                <label className="form-label">解析</label>
                <textarea
                  value={form.analysis}
                  onChange={(e) => setForm({ ...form, analysis: e.target.value })}
                  placeholder="请输入题目解析（可选）"
                  style={{ width: '100%', minHeight: 60, resize: 'vertical' }}
                />
              </div>
            </div>

            <div className="form-actions">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>
                取消
              </button>
              <button className="btn-primary" onClick={handleSubmit}>
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
