import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api } from './api';
import { useAuth } from './AuthContext';
import type { RecipeStep } from './types';
import './CreateRecipePage.css';

interface StepInput {
  title: string;
  description: string;
  duration: number;
}

export default function CreateRecipePage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [description, setDescription] = useState('');
  const [cuisine, setCuisine] = useState<'chinese' | 'japanese' | 'western' | 'other'>('chinese');
  const [ingredientsText, setIngredientsText] = useState('');
  const [steps, setSteps] = useState<StepInput[]>([
    { title: '', description: '', duration: 0 },
  ]);
  const [isPublic, setIsPublic] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login', { state: { from: '/create-recipe' } });
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (isEdit && id && user) {
      const fetchRecipe = async () => {
        try {
          const data = await api.recipes.get(id);
          setTitle(data.title);
          setCoverImage(data.coverImage);
          setDescription(data.description);
          setCuisine(data.cuisine);
          setIngredientsText(data.ingredients.join('\n'));
          setSteps(
            data.steps.map((s: RecipeStep) => ({
              title: s.title,
              description: s.description,
              duration: s.duration,
            }))
          );
          setIsPublic(data.isPublic);
        } catch (err: any) {
          setError(err.message);
        }
      };
      fetchRecipe();
    }
  }, [isEdit, id, user]);

  const totalTime = steps.reduce((acc, step) => acc + (step.duration || 0), 0);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins} 分钟`;
    const hours = Math.floor(mins / 60);
    const remainMins = mins % 60;
    return remainMins > 0 ? `${hours} 小时 ${remainMins} 分钟` : `${hours} 小时`;
  };

  const addStep = () => {
    setSteps([...steps, { title: '', description: '', duration: 0 }]);
  };

  const removeStep = (index: number) => {
    if (steps.length <= 1) return;
    setSteps(steps.filter((_, i) => i !== index));
  };

  const updateStep = (index: number, field: keyof StepInput, value: string | number) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setSteps(newSteps);
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === steps.length - 1) return;

    const newSteps = [...steps];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];
    setSteps(newSteps);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('请填写食谱标题');
      return;
    }

    const ingredients = ingredientsText
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (ingredients.length === 0) {
      setError('请至少添加一种食材');
      return;
    }

    const validSteps = steps.filter((s) => s.title.trim().length > 0);
    if (validSteps.length === 0) {
      setError('请至少添加一个步骤');
      return;
    }

    setSubmitting(true);

    try {
      const recipeData = {
        title,
        coverImage: coverImage || 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=600',
        description,
        cuisine,
        ingredients,
        steps: validSteps,
        isPublic,
      };

      if (isEdit && id) {
        await api.recipes.update(id, recipeData);
        navigate(`/recipe/${id}`);
      } else {
        const data = await api.recipes.create(recipeData);
        navigate(`/recipe/${data.id}`);
      }
    } catch (err: any) {
      setError(err.message || '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user) {
    return <div className="create-loading">加载中...</div>;
  }

  return (
    <div className="create-recipe-page">
      <div className="create-container">
        <div className="create-header">
          <Link to="/profile" className="back-btn">
            ← 返回
          </Link>
          <h1>{isEdit ? '编辑食谱' : '发布新食谱'}</h1>
        </div>

        <form className="create-form" onSubmit={handleSubmit}>
          {error && <div className="form-error">{error}</div>}

          <div className="form-section">
            <h2>基本信息</h2>

            <div className="form-group">
              <label htmlFor="title">食谱标题 *</label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例如：番茄炒蛋"
                maxLength={50}
              />
            </div>

            <div className="form-group">
              <label htmlFor="coverImage">封面图片 URL</label>
              <input
                id="coverImage"
                type="url"
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                placeholder="输入图片链接（可选，将使用默认图片）"
              />
              {coverImage && (
                <div className="image-preview">
                  <img src={coverImage} alt="预览" onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }} />
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="description">简介</label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="简单介绍一下这道菜..."
                rows={3}
                maxLength={200}
              />
            </div>

            <div className="form-group">
              <label>菜系</label>
              <div className="cuisine-options">
                {[
                  { value: 'chinese', label: '中餐' },
                  { value: 'japanese', label: '日料' },
                  { value: 'western', label: '西餐' },
                  { value: 'other', label: '其他' },
                ].map((option) => (
                  <label key={option.value} className="cuisine-option">
                    <input
                      type="radio"
                      name="cuisine"
                      value={option.value}
                      checked={cuisine === option.value}
                      onChange={() => setCuisine(option.value as any)}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                />
                公开食谱（所有人可见）
              </label>
            </div>
          </div>

          <div className="form-section">
            <h2>食材清单</h2>
            <p className="form-hint">每行输入一种食材，例如：番茄 2个</p>
            <textarea
              value={ingredientsText}
              onChange={(e) => setIngredientsText(e.target.value)}
              placeholder="番茄 2个&#10;鸡蛋 3个&#10;葱花 适量"
              rows={6}
            />
          </div>

          <div className="form-section">
            <div className="section-header">
              <h2>烹饪步骤</h2>
              <div className="total-time">
                预计总时长: <strong>{formatTime(totalTime)}</strong>
              </div>
            </div>

            <div className="steps-editor">
              {steps.map((step, index) => (
                <div key={index} className="step-editor-item">
                  <div className="step-editor-header">
                    <span className="step-number">步骤 {index + 1}</span>
                    <div className="step-actions">
                      <button
                        type="button"
                        className="step-action-btn"
                        onClick={() => moveStep(index, 'up')}
                        disabled={index === 0}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="step-action-btn"
                        onClick={() => moveStep(index, 'down')}
                        disabled={index === steps.length - 1}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="step-remove-btn"
                        onClick={() => removeStep(index)}
                        disabled={steps.length <= 1}
                      >
                        删除
                      </button>
                    </div>
                  </div>

                  <div className="step-inputs">
                    <div className="form-group">
                      <label>步骤名称 *</label>
                      <input
                        type="text"
                        value={step.title}
                        onChange={(e) => updateStep(index, 'title', e.target.value)}
                        placeholder="例如：准备食材"
                      />
                    </div>

                    <div className="form-group">
                      <label>步骤描述</label>
                      <textarea
                        value={step.description}
                        onChange={(e) => updateStep(index, 'description', e.target.value)}
                        placeholder="详细描述这一步怎么做..."
                        rows={2}
                      />
                    </div>

                    <div className="form-group">
                      <label>预计耗时（秒）</label>
                      <input
                        type="number"
                        min="0"
                        value={step.duration}
                        onChange={(e) =>
                          updateStep(index, 'duration', parseInt(e.target.value) || 0)
                        }
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="add-step-btn"
              onClick={addStep}
            >
              + 添加步骤
            </button>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn-cancel"
              onClick={() => navigate(-1)}
            >
              取消
            </button>
            <button
              type="submit"
              className="btn-submit"
              disabled={submitting}
            >
              {submitting ? '提交中...' : isEdit ? '保存修改' : '发布食谱'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
