import { useState, useCallback } from 'react';
import type { TechOption } from '../types';

interface FormOption extends Omit<TechOption, 'id'> {
  _expanded: boolean;
}

interface ProjectFormProps {
  onSubmit: (data: {
    name: string;
    description: string;
    options: Omit<TechOption, 'id'>[];
  }) => void;
  onCancel: () => void;
}

const createEmptyOption = (index: number): FormOption => ({
  name: `方案 ${index + 1}`,
  version: '',
  advantages: [],
  disadvantages: [],
  tags: [],
  ratings: {},
  ratingNotes: {},
  _expanded: true,
});

export default function ProjectForm({ onSubmit, onCancel }: ProjectFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState<FormOption[]>([createEmptyOption(0)]);
  const [tagInput, setTagInput] = useState<Record<number, string>>({});
  const [advInput, setAdvInput] = useState<Record<number, string>>({});
  const [disInput, setDisInput] = useState<Record<number, string>>({});

  const handleAddOption = useCallback(() => {
    setOptions((prev) => [...prev, createEmptyOption(prev.length)]);
  }, []);

  const handleRemoveOption = useCallback((idx: number) => {
    setOptions((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleToggleExpand = useCallback((idx: number) => {
    setOptions((prev) =>
      prev.map((opt, i) =>
        i === idx ? { ...opt, _expanded: !opt._expanded } : opt
      )
    );
  }, []);

  const updateOption = useCallback((idx: number, patch: Partial<FormOption>) => {
    setOptions((prev) =>
      prev.map((opt, i) => (i === idx ? { ...opt, ...patch } : opt))
    );
  }, []);

  const handleAddAdvantage = useCallback((idx: number) => {
    const text = advInput[idx]?.trim();
    if (!text) return;
    setOptions((prev) =>
      prev.map((opt, i) =>
        i === idx ? { ...opt, advantages: [...opt.advantages, text] } : opt
      )
    );
    setAdvInput((prev) => ({ ...prev, [idx]: '' }));
  }, [advInput]);

  const handleRemoveAdvantage = useCallback((idx: number, advIdx: number) => {
    setOptions((prev) =>
      prev.map((opt, i) =>
        i === idx
          ? { ...opt, advantages: opt.advantages.filter((_, ai) => ai !== advIdx) }
          : opt
      )
    );
  }, []);

  const handleAddDisadvantage = useCallback((idx: number) => {
    const text = disInput[idx]?.trim();
    if (!text) return;
    setOptions((prev) =>
      prev.map((opt, i) =>
        i === idx ? { ...opt, disadvantages: [...opt.disadvantages, text] } : opt
      )
    );
    setDisInput((prev) => ({ ...prev, [idx]: '' }));
  }, [disInput]);

  const handleRemoveDisadvantage = useCallback((idx: number, disIdx: number) => {
    setOptions((prev) =>
      prev.map((opt, i) =>
        i === idx
          ? { ...opt, disadvantages: opt.disadvantages.filter((_, di) => di !== disIdx) }
          : opt
      )
    );
  }, []);

  const handleAddTag = useCallback((idx: number) => {
    const text = tagInput[idx]?.trim();
    if (!text) return;
    setOptions((prev) =>
      prev.map((opt, i) =>
        i === idx && !opt.tags.includes(text)
          ? { ...opt, tags: [...opt.tags, text] }
          : opt
      )
    );
    setTagInput((prev) => ({ ...prev, [idx]: '' }));
  }, [tagInput]);

  const handleRemoveTag = useCallback((idx: number, tagIdx: number) => {
    setOptions((prev) =>
      prev.map((opt, i) =>
        i === idx
          ? { ...opt, tags: opt.tags.filter((_, ti) => ti !== tagIdx) }
          : opt
      )
    );
  }, []);

  const handleSubmit = useCallback(() => {
    if (!name.trim()) {
      alert('请填写项目名称');
      return;
    }
    if (name.length > 20) {
      alert('项目名称不能超过20字');
      return;
    }
    if (!description.trim()) {
      alert('请填写项目描述');
      return;
    }
    if (description.length > 150) {
      alert('项目描述不能超过150字');
      return;
    }
    if (options.length === 0) {
      alert('至少添加一个方案');
      return;
    }
    const cleanOptions = options.map(({ _expanded, ...rest }) => rest);
    onSubmit({ name: name.trim(), description: description.trim(), options: cleanOptions });
  }, [name, description, options, onSubmit]);

  return (
    <div className="project-form">
      <div className="form-header">
        <h2>创建对比项目</h2>
        <p className="form-subtitle">填写项目信息并添加待对比的技术方案</p>
      </div>

      <div className="form-section">
        <label className="form-label">
          项目名称 <span className="required">*</span>
          <span className="char-count">{name.length}/20</span>
        </label>
        <input
          type="text"
          className="form-input"
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 20))}
          placeholder="例如：前端框架选型对比"
        />
      </div>

      <div className="form-section">
        <label className="form-label">
          项目描述 <span className="required">*</span>
          <span className="char-count">{description.length}/150</span>
        </label>
        <textarea
          className="form-textarea"
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, 150))}
          placeholder="简要描述本次对比的背景和目标..."
          rows={3}
        />
      </div>

      <div className="form-section">
        <div className="section-header">
          <label className="form-label">技术方案列表</label>
          <button className="btn-add ripple" onClick={handleAddOption}>
            + 添加方案
          </button>
        </div>

        <div className="options-list">
          {options.map((opt, idx) => (
            <div
              key={idx}
              className="option-card"
              style={{
                background: '#ffffff',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              }}
            >
              <div
                className="option-card-header"
                onClick={() => handleToggleExpand(idx)}
              >
                <div className="option-title-row">
                  <input
                    type="text"
                    className="option-name-input"
                    value={opt.name}
                    onChange={(e) => updateOption(idx, { name: e.target.value })}
                    placeholder="方案名称"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <input
                    type="text"
                    className="option-version-input"
                    value={opt.version}
                    onChange={(e) => updateOption(idx, { version: e.target.value })}
                    placeholder="版本号"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <div className="option-actions">
                  <span className="expand-icon">{opt._expanded ? '▲' : '▼'}</span>
                  {options.length > 1 && (
                    <button
                      className="btn-remove"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveOption(idx);
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {opt._expanded && (
                <div className="option-card-body">
                  <div className="sub-section">
                    <label className="sub-label">优势</label>
                    <div className="tag-list">
                      {opt.advantages.map((adv, ai) => (
                        <span key={ai} className="adv-item">
                          ✓ {adv}
                          <button onClick={() => handleRemoveAdvantage(idx, ai)}>✕</button>
                        </span>
                      ))}
                    </div>
                    <div className="input-row">
                      <input
                        type="text"
                        className="form-input small"
                        value={advInput[idx] || ''}
                        onChange={(e) =>
                          setAdvInput((prev) => ({ ...prev, [idx]: e.target.value }))
                        }
                        onKeyDown={(e) => e.key === 'Enter' && handleAddAdvantage(idx)}
                        placeholder="输入优势后按回车添加"
                      />
                      <button
                        className="btn-small ripple"
                        onClick={() => handleAddAdvantage(idx)}
                      >
                        添加
                      </button>
                    </div>
                  </div>

                  <div className="sub-section">
                    <label className="sub-label">劣势</label>
                    <div className="tag-list">
                      {opt.disadvantages.map((dis, di) => (
                        <span key={di} className="dis-item">
                          ✗ {dis}
                          <button onClick={() => handleRemoveDisadvantage(idx, di)}>✕</button>
                        </span>
                      ))}
                    </div>
                    <div className="input-row">
                      <input
                        type="text"
                        className="form-input small"
                        value={disInput[idx] || ''}
                        onChange={(e) =>
                          setDisInput((prev) => ({ ...prev, [idx]: e.target.value }))
                        }
                        onKeyDown={(e) => e.key === 'Enter' && handleAddDisadvantage(idx)}
                        placeholder="输入劣势后按回车添加"
                      />
                      <button
                        className="btn-small ripple"
                        onClick={() => handleAddDisadvantage(idx)}
                      >
                        添加
                      </button>
                    </div>
                  </div>

                  <div className="sub-section">
                    <label className="sub-label">适用场景</label>
                    <div className="tag-list">
                      {opt.tags.map((tag, ti) => (
                        <span
                          key={ti}
                          className="tag-pill"
                          style={{
                            background: '#e0e7ff',
                            color: '#4338ca',
                            borderRadius: '999px',
                          }}
                        >
                          {tag}
                          <button onClick={() => handleRemoveTag(idx, ti)}>✕</button>
                        </span>
                      ))}
                    </div>
                    <div className="input-row">
                      <input
                        type="text"
                        className="form-input small"
                        value={tagInput[idx] || ''}
                        onChange={(e) =>
                          setTagInput((prev) => ({ ...prev, [idx]: e.target.value }))
                        }
                        onKeyDown={(e) => e.key === 'Enter' && handleAddTag(idx)}
                        placeholder="输入场景标签后按回车添加"
                      />
                      <button
                        className="btn-small ripple"
                        onClick={() => handleAddTag(idx)}
                      >
                        添加
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="form-actions">
        <button className="btn-secondary ripple" onClick={onCancel}>
          取消
        </button>
        <button className="btn-primary ripple" onClick={handleSubmit}>
          创建项目
        </button>
      </div>
    </div>
  );
}
