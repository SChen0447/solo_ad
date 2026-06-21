import { useState, FormEvent } from 'react';
import { FeedbackType, CreateFeedbackRequest } from '../types';

function SubmitPage() {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<FeedbackType>(FeedbackType.FEATURE);
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<{ title?: string; description?: string }>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): boolean => {
    const newErrors: { title?: string; description?: string } = {};
    if (!title.trim()) {
      newErrors.title = '请填写反馈标题';
    }
    if (!description.trim()) {
      newErrors.description = '请填写反馈描述';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const data: CreateFeedbackRequest = {
        title: title.trim(),
        type,
        description: description.trim(),
      };

      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        setShowSuccess(true);
        setTitle('');
        setType(FeedbackType.FEATURE);
        setDescription('');
        setErrors({});
        setTimeout(() => setShowSuccess(false), 3000);
      } else {
        const errorData = await response.json();
        setErrors({ title: errorData.error });
      }
    } catch {
      setErrors({ title: '提交失败，请稍后重试' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTypeLabel = (t: FeedbackType): string => {
    const labels: Record<FeedbackType, string> = {
      [FeedbackType.FEATURE]: '功能建议',
      [FeedbackType.BUG]: 'Bug报告',
      [FeedbackType.OTHER]: '其他',
    };
    return labels[t];
  };

  return (
    <div className="form-page fade-in">
      <h1 className="form-title">提交反馈</h1>
      <p className="form-subtitle">您的反馈对我们很重要，请填写以下信息</p>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="label">标题</label>
          <input
            type="text"
            className={`input ${errors.title ? 'input-error' : ''}`}
            placeholder="请简要描述您的反馈"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
          />
          {errors.title && <div className="error-text">{errors.title}</div>}
        </div>

        <div className="form-group">
          <label className="label">反馈类型</label>
          <select
            className="select"
            value={type}
            onChange={(e) => setType(e.target.value as FeedbackType)}
          >
            {Object.values(FeedbackType).map((t) => (
              <option key={t} value={t}>
                {getTypeLabel(t)}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="label">详细描述</label>
          <textarea
            className={`textarea ${errors.description ? 'input-error' : ''}`}
            placeholder="请详细描述您遇到的问题或建议..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
          />
          {errors.description && <div className="error-text">{errors.description}</div>}
          <div style={{ textAlign: 'right', fontSize: '12px', color: '#a0aec0', marginTop: '4px' }}>
            {description.length}/2000
          </div>
        </div>

        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? '提交中...' : '提交反馈'}
        </button>
      </form>

      {showSuccess && (
        <div className="success-modal">
          <div className="success-icon">✓</div>
          <h3 className="success-title">提交成功！</h3>
          <p className="success-desc">感谢您的反馈，我们会尽快处理</p>
          <button className="btn btn-primary" onClick={() => setShowSuccess(false)}>
            确定
          </button>
        </div>
      )}
    </div>
  );
}

export default SubmitPage;
