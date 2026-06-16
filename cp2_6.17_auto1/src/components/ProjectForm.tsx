import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { createProject, getVoterId } from '@/utils/api';
import { DIMENSIONS } from '@/types';
import type { TechSolution } from '@/types';
import './ProjectForm.css';

interface SolutionForm {
  name: string;
  version: string;
  advantages: string[];
  disadvantages: string[];
  tags: string[];
  expanded: boolean;
  removing?: boolean;
}

const ProjectForm: React.FC = () => {
  const navigate = useNavigate();
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [createdBy, setCreatedBy] = useState('');
  const [solutions, setSolutions] = useState<SolutionForm[]>([
    { name: '', version: '', advantages: [''], disadvantages: [''], tags: [], expanded: true },
    { name: '', version: '', advantages: [''], disadvantages: [''], tags: [], expanded: true }
  ]);
  const [tagInput, setTagInput] = useState<{ [key: number]: string }>({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const initScores = useCallback(() => {
    const scores: { [key: string]: { rating: number; description: string } } = {};
    DIMENSIONS.forEach(dim => {
      scores[dim] = { rating: 3, description: '' };
    });
    return scores;
  }, []);

  const addSolution = () => {
    setSolutions(prev => [...prev, {
      name: '',
      version: '',
      advantages: [''],
      disadvantages: [''],
      tags: [],
      expanded: true
    }]);
  };

  const removeSolution = (index: number) => {
    if (solutions.length <= 2) {
      setError('至少需要保留2个技术方案');
      return;
    }
    setSolutions(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], removing: true };
      return updated;
    });
    setTimeout(() => {
      setSolutions(prev => prev.filter((_, i) => i !== index));
    }, 400);
  };

  const toggleExpand = (index: number) => {
    setSolutions(prev => prev.map((s, i) =>
      i === index ? { ...s, expanded: !s.expanded } : s
    ));
  };

  const updateSolution = (index: number, field: keyof SolutionForm, value: string) => {
    setSolutions(prev => prev.map((s, i) =>
      i === index ? { ...s, [field]: value } : s
    ));
  };

  const updateList = (solIndex: number, listType: 'advantages' | 'disadvantages', itemIndex: number, value: string) => {
    setSolutions(prev => prev.map((s, i) => {
      if (i !== solIndex) return s;
      const list = [...s[listType]];
      list[itemIndex] = value;
      return { ...s, [listType]: list };
    }));
  };

  const addListItem = (solIndex: number, listType: 'advantages' | 'disadvantages') => {
    setSolutions(prev => prev.map((s, i) => {
      if (i !== solIndex) return s;
      return { ...s, [listType]: [...s[listType], ''] };
    }));
  };

  const removeListItem = (solIndex: number, listType: 'advantages' | 'disadvantages', itemIndex: number) => {
    setSolutions(prev => prev.map((s, i) => {
      if (i !== solIndex) return s;
      const list = s[listType].filter((_, idx) => idx !== itemIndex);
      return { ...s, [listType]: list.length ? list : [''] };
    }));
  };

  const addTag = (solIndex: number) => {
    const tag = tagInput[solIndex]?.trim();
    if (!tag) return;
    setSolutions(prev => prev.map((s, i) => {
      if (i !== solIndex) return s;
      if (s.tags.includes(tag)) return s;
      return { ...s, tags: [...s.tags, tag] };
    }));
    setTagInput(prev => ({ ...prev, [solIndex]: '' }));
  };

  const removeTag = (solIndex: number, tagIndex: number) => {
    setSolutions(prev => prev.map((s, i) => {
      if (i !== solIndex) return s;
      return { ...s, tags: s.tags.filter((_, idx) => idx !== tagIndex) };
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!projectName.trim()) {
      setError('请输入项目名称');
      return;
    }
    if (projectName.length > 20) {
      setError('项目名称不能超过20字');
      return;
    }
    if (!projectDesc.trim()) {
      setError('请输入项目描述');
      return;
    }
    if (projectDesc.length > 150) {
      setError('项目描述不能超过150字');
      return;
    }

    const validSolutions = solutions.filter(s => s.name.trim());
    if (validSolutions.length < 2) {
      setError('至少需要2个有效技术方案');
      return;
    }

    setSubmitting(true);
    try {
      const solutionsData: Omit<TechSolution, 'id'>[] = validSolutions.map(s => ({
        name: s.name.trim(),
        version: s.version.trim(),
        advantages: s.advantages.filter(a => a.trim()),
        disadvantages: s.disadvantages.filter(d => d.trim()),
        tags: s.tags,
        scores: initScores()
      }));

      const result = await createProject({
        name: projectName.trim(),
        description: projectDesc.trim(),
        createdBy: createdBy.trim() || '匿名用户',
        solutions: solutionsData
      });

      localStorage.setItem('voterId', getVoterId());
      navigate(`/projects/${result.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="project-form-container">
      <div className="form-header">
        <h1>创建技术方案对比项目</h1>
        <p>填写项目信息并添加待对比的技术方案</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-section card">
          <h2>项目基本信息</h2>
          <div className="form-group">
            <label>项目名称 <span className="required">*</span></label>
            <input
              type="text"
              value={projectName}
              onChange={e => setProjectName(e.target.value)}
              placeholder="请输入项目名称（最多20字）"
              maxLength={20}
            />
            <span className="char-count">{projectName.length}/20</span>
          </div>
          <div className="form-group">
            <label>项目描述 <span className="required">*</span></label>
            <textarea
              value={projectDesc}
              onChange={e => setProjectDesc(e.target.value)}
              placeholder="请输入项目描述（最多150字）"
              maxLength={150}
              rows={3}
            />
            <span className="char-count">{projectDesc.length}/150</span>
          </div>
          <div className="form-group">
            <label>创建者名称</label>
            <input
              type="text"
              value={createdBy}
              onChange={e => setCreatedBy(e.target.value)}
              placeholder="请输入您的名称（选填）"
            />
          </div>
        </div>

        <div className="solutions-section">
          <div className="section-header">
            <h2>技术方案列表</h2>
            <button type="button" className="btn btn-secondary ripple" onClick={addSolution}>
              + 添加方案
            </button>
          </div>

          {solutions.map((solution, index) => (
            <div
              key={index}
              className={`solution-card card fade-in ${solution.removing ? 'slide-out-right' : ''}`}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="solution-header" onClick={() => toggleExpand(index)}>
                <div className="solution-title">
                  <span className="solution-index">{index + 1}</span>
                  <span className="solution-name">
                    {solution.name || `方案 ${index + 1}`}
                    {solution.version && <span className="solution-version">v{solution.version}</span>}
                  </span>
                </div>
                <div className="solution-actions">
                  <button
                    type="button"
                    className="btn btn-danger ripple btn-sm"
                    onClick={e => { e.stopPropagation(); removeSolution(index); }}
                  >
                    删除
                  </button>
                  <span className={`expand-icon ${solution.expanded ? 'expanded' : ''}`}>▼</span>
                </div>
              </div>

              {solution.expanded && (
                <div className="solution-body">
                  <div className="form-row">
                    <div className="form-group flex-1">
                      <label>方案名称 <span className="required">*</span></label>
                      <input
                        type="text"
                        value={solution.name}
                        onChange={e => updateSolution(index, 'name', e.target.value)}
                        placeholder="如：React"
                      />
                    </div>
                    <div className="form-group flex-1">
                      <label>版本号</label>
                      <input
                        type="text"
                        value={solution.version}
                        onChange={e => updateSolution(index, 'version', e.target.value)}
                        placeholder="如：18.2.0"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>优势列表</label>
                    {solution.advantages.map((adv, advIndex) => (
                      <div key={advIndex} className="list-item-row">
                        <input
                          type="text"
                          value={adv}
                          onChange={e => updateList(index, 'advantages', advIndex, e.target.value)}
                          placeholder="请输入优势描述"
                        />
                        <button
                          type="button"
                          className="btn-remove-item"
                          onClick={() => removeListItem(index, 'advantages', advIndex)}
                          disabled={solution.advantages.length === 1}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="btn-add-item"
                      onClick={() => addListItem(index, 'advantages')}
                    >
                      + 添加优势
                    </button>
                  </div>

                  <div className="form-group">
                    <label>劣势列表</label>
                    {solution.disadvantages.map((dis, disIndex) => (
                      <div key={disIndex} className="list-item-row">
                        <input
                          type="text"
                          value={dis}
                          onChange={e => updateList(index, 'disadvantages', disIndex, e.target.value)}
                          placeholder="请输入劣势描述"
                        />
                        <button
                          type="button"
                          className="btn-remove-item"
                          onClick={() => removeListItem(index, 'disadvantages', disIndex)}
                          disabled={solution.disadvantages.length === 1}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="btn-add-item"
                      onClick={() => addListItem(index, 'disadvantages')}
                    >
                      + 添加劣势
                    </button>
                  </div>

                  <div className="form-group">
                    <label>适用场景标签</label>
                    <div className="tag-input-row">
                      <input
                        type="text"
                        value={tagInput[index] || ''}
                        onChange={e => setTagInput(prev => ({ ...prev, [index]: e.target.value }))}
                        placeholder="输入标签后按回车添加"
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addTag(index);
                          }
                        }}
                      />
                      <button type="button" className="btn btn-secondary ripple" onClick={() => addTag(index)}>
                        添加
                      </button>
                    </div>
                    <div className="tags-container">
                      {solution.tags.map((tag, tagIndex) => (
                        <span key={tagIndex} className="tag">
                          {tag}
                          <button
                            type="button"
                            className="tag-remove"
                            onClick={() => removeTag(index, tagIndex)}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="form-footer">
          <button
            type="submit"
            className="btn btn-primary ripple btn-large"
            disabled={submitting}
          >
            {submitting ? '创建中...' : '创建并进入对比'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProjectForm;
