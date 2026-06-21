import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

export default function CreateActivity() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [hasDeadline, setHasDeadline] = useState(false);
  const [deadline, setDeadline] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const addOption = () => {
    if (options.length < 10) {
      setOptions([...options, '']);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validOptions = options.filter((o) => o.trim() !== '');
    if (!title.trim()) {
      setError('请输入活动标题');
      return;
    }
    if (validOptions.length < 2) {
      setError('至少需要2个有效选项');
      return;
    }

    setLoading(true);
    try {
      const deadlineTimestamp = hasDeadline && deadline
        ? new Date(deadline).getTime()
        : null;

      const activity = await api.createActivity({
        title: title.trim(),
        description: description.trim(),
        options: validOptions,
        deadline: deadlineTimestamp,
      });

      navigate(`/activity/${activity.id}`);
    } catch (err) {
      setError('创建活动失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page create-activity-page">
      <div className="page-header">
        <h1>创建投票活动</h1>
        <p>创建一个新的创意投票，让团队成员一起参与决策</p>
      </div>

      <form className="form-card" onSubmit={handleSubmit}>
        {error && <div className="error-message">{error}</div>}

        <div className="form-group">
          <label htmlFor="title">活动标题 *</label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="输入活动标题"
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">活动描述</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="详细描述这个投票活动的目的和背景"
            className="form-textarea"
            rows={4}
          />
        </div>

        <div className="form-group">
          <label>投票选项 *</label>
          <div className="options-list">
            {options.map((option, index) => (
              <div key={index} className="option-input-row">
                <span className="option-number">{index + 1}</span>
                <input
                  type="text"
                  value={option}
                  onChange={(e) => updateOption(index, e.target.value)}
                  placeholder={`选项 ${index + 1}`}
                  className="form-input"
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOption(index)}
                    className="remove-option-btn"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
          {options.length < 10 && (
            <button
              type="button"
              onClick={addOption}
              className="add-option-btn"
            >
              + 添加选项
            </button>
          )}
        </div>

        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={hasDeadline}
              onChange={(e) => setHasDeadline(e.target.checked)}
            />
            <span>设置投票截止时间</span>
          </label>
          {hasDeadline && (
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="form-input deadline-input"
            />
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="submit-btn primary-btn"
        >
          {loading ? '创建中...' : '创建活动'}
        </button>
      </form>
    </div>
  );
}
