import { useState } from 'react';
import { Send } from 'lucide-react';

interface InquiryFormProps {
  onSubmitSuccess: () => void;
}

const budgetOptions = [
  { value: '小于1000', label: '小于 ¥1,000' },
  { value: '1000-3000', label: '¥1,000 - ¥3,000' },
  { value: '3000-5000', label: '¥3,000 - ¥5,000' },
  { value: '5000以上', label: '¥5,000 以上' },
];

export default function InquiryForm({ onSubmitSuccess }: InquiryFormProps) {
  const [budget, setBudget] = useState('');
  const [description, setDescription] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    
    if (!budget) {
      newErrors.budget = '请选择预算范围';
    }
    if (!description.trim()) {
      newErrors.description = '请填写项目描述';
    } else if (description.trim().length < 10) {
      newErrors.description = '项目描述至少10个字符';
    }
    if (!expectedDate) {
      newErrors.expectedDate = '请选择期望完成日期';
    } else {
      const selectedDate = new Date(expectedDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        newErrors.expectedDate = '期望日期不能早于今天';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          budget,
          description: description.trim(),
          expectedDate,
        }),
      });

      if (res.ok) {
        setBudget('');
        setDescription('');
        setExpectedDate('');
        onSubmitSuccess();
      } else {
        const data = await res.json();
        setErrors({ submit: data.error || '提交失败，请重试' });
      }
    } catch (error) {
      setErrors({ submit: '网络错误，请稍后重试' });
    } finally {
      setSubmitting(false);
    }
  };

  const getMinDate = (): string => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  return (
    <div className="container">
      <div className="inquiry-form-container">
        <h2>项目询价</h2>
        <p>告诉我们您的需求，我们会尽快与您联系</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">预算范围 *</label>
            <select
              className={`form-select ${errors.budget ? 'error' : ''}`}
              value={budget}
              onChange={(e) => {
                setBudget(e.target.value);
                setErrors(prev => ({ ...prev, budget: '' }));
              }}
            >
              <option value="">请选择预算范围</option>
              {budgetOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {errors.budget && (
              <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                {errors.budget}
              </span>
            )}
          </div>

          <div className="form-group" style={{ marginTop: '16px' }}>
            <label className="form-label">项目描述 *</label>
            <textarea
              className={`form-textarea ${errors.description ? 'error' : ''}`}
              placeholder="请详细描述您的项目需求，包括风格偏好、使用场景、参考示例等..."
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setErrors(prev => ({ ...prev, description: '' }));
              }}
              rows={5}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
              {errors.description ? (
                <span style={{ color: '#ef4444', fontSize: '12px' }}>
                  {errors.description}
                </span>
              ) : (
                <span></span>
              )}
              <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                {description.length} 字符
              </span>
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '16px' }}>
            <label className="form-label">期望完成日期 *</label>
            <input
              type="date"
              className={`form-input ${errors.expectedDate ? 'error' : ''}`}
              value={expectedDate}
              min={getMinDate()}
              onChange={(e) => {
                setExpectedDate(e.target.value);
                setErrors(prev => ({ ...prev, expectedDate: '' }));
              }}
            />
            {errors.expectedDate && (
              <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                {errors.expectedDate}
              </span>
            )}
          </div>

          {errors.submit && (
            <div 
              style={{ 
                padding: '12px', 
                background: '#fef2f2', 
                border: '1px solid #fecaca',
                borderRadius: '8px',
                color: '#dc2626',
                fontSize: '14px',
                marginTop: '16px'
              }}
            >
              {errors.submit}
            </div>
          )}

          <button 
            type="submit" 
            className="form-submit"
            style={{ width: '100%', marginTop: '24px' }}
            disabled={submitting}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              {submitting ? (
                <>
                  <span className="spinner" style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#fff',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }}></span>
                  提交中...
                </>
              ) : (
                <>
                  <Send size={18} />
                  提交询价
                </>
              )}
            </span>
          </button>
        </form>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .form-select.error,
        .form-input.error,
        .form-textarea.error {
          border-color: #ef4444;
        }
      `}</style>
    </div>
  );
}
