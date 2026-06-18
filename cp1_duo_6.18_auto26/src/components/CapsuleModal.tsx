import { useState, useMemo } from 'react';
import { useStore } from '../store';
import { validateTargetDate, formatDate } from '../modules/timeManager';

function getMinDate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
}

function renderMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    .replace(/\n/g, '<br />');
}

export default function CapsuleModal() {
  const isOpen = useStore(state => state.isModalOpen);
  const currentStep = useStore(state => state.currentStep);
  const formData = useStore(state => state.formData);
  const setFormData = useStore(state => state.setFormData);
  const setCurrentStep = useStore(state => state.setCurrentStep);
  const setModalOpen = useStore(state => state.setModalOpen);
  const addCapsule = useStore(state => state.addCapsule);
  const resetForm = useStore(state => state.resetForm);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const previewContent = useMemo(() => renderMarkdown(formData.content), [formData.content]);

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.targetDate) {
        newErrors.targetDate = '请选择目标日期';
      } else if (!validateTargetDate(formData.targetDate)) {
        newErrors.targetDate = '目标日期必须至少是明天';
      }
    }

    if (step === 2) {
      if (!formData.recipient.trim()) {
        newErrors.recipient = '请填写收件人昵称';
      } else if (formData.recipient.length > 20) {
        newErrors.recipient = '昵称不能超过20个字符';
      }
      if (!formData.title.trim()) {
        newErrors.title = '请填写信件标题';
      } else if (formData.title.length > 50) {
        newErrors.title = '标题不能超过50个字符';
      }
    }

    if (step === 3) {
      if (!formData.content.trim()) {
        newErrors.content = '请填写信件内容';
      }
    }

    if (step === 4) {
      if (formData.reminderType === 'email' && !formData.email.trim()) {
        newErrors.email = '请输入邮箱地址';
      } else if (formData.reminderType === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = '请输入有效的邮箱地址';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 4) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setErrors({});
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(4) || !formData.targetDate) return;

    setIsSubmitting(true);
    try {
      await addCapsule({
        title: formData.title,
        recipient: formData.recipient,
        encryptedContent: '',
        targetDate: formData.targetDate.toISOString(),
        reminderType: formData.reminderType,
        email: formData.reminderType === 'email' ? formData.email : undefined,
      });

      if (formData.reminderType === 'browser' && 'Notification' in window) {
        if (Notification.permission === 'default') {
          await Notification.requestPermission();
        }
      }

      setModalOpen(false);
      resetForm();
    } catch (error) {
      console.error('创建胶囊失败:', error);
      setErrors({ submit: error instanceof Error ? error.message : '创建失败，请重试' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setModalOpen(false);
    resetForm();
    setErrors({});
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-container" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={handleClose}>×</button>

        <div className="modal-header">
          <h2>创建时间胶囊</h2>
          <div className="step-indicator">
            {[1, 2, 3, 4].map(step => (
              <div
                key={step}
                className={`step-dot ${step < currentStep ? 'completed' : ''} ${step === currentStep ? 'active' : ''}`}
              />
            ))}
          </div>
        </div>

        <div className="modal-content">
          <div
            className={`step-content ${currentStep === 1 ? 'active' : ''}`}
            style={{ transform: `translateX(${(currentStep - 1) * -100}%)` }}
          >
            <div className="step-1">
              <h3>第一步：选择开启日期</h3>
              <p className="step-desc">选择一个未来的日期，信件将在那一天解锁</p>
              <input
                type="date"
                className="form-input date-input"
                min={getMinDate()}
                value={formData.targetDate ? formData.targetDate.toISOString().split('T')[0] : ''}
                onChange={e => {
                  const date = e.target.value ? new Date(e.target.value) : null;
                  setFormData({ targetDate: date });
                }}
              />
              {formData.targetDate && (
                <p className="date-preview">
                  信件将于 <strong>{formatDate(formData.targetDate)}</strong> 解锁
                </p>
              )}
              {errors.targetDate && <p className="error-text">{errors.targetDate}</p>}
            </div>
          </div>

          <div
            className={`step-content ${currentStep === 2 ? 'active' : ''}`}
            style={{ transform: `translateX(${(currentStep - 1) * -100}%)` }}
          >
            <div className="step-2">
              <h3>第二步：填写收件人</h3>
              <p className="step-desc">这封信是写给谁的？</p>

              <div className="form-group">
                <label>收件人昵称</label>
                <div className="input-with-counter">
                  <input
                    type="text"
                    className="form-input"
                    placeholder="未来的自己 / 亲爱的TA..."
                    maxLength={20}
                    value={formData.recipient}
                    onChange={e => setFormData({ recipient: e.target.value })}
                  />
                  <span className="char-counter">{formData.recipient.length}/20</span>
                </div>
                {errors.recipient && <p className="error-text">{errors.recipient}</p>}
              </div>

              <div className="form-group">
                <label>信件标题</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="给这封信起个标题..."
                  maxLength={50}
                  value={formData.title}
                  onChange={e => setFormData({ title: e.target.value })}
                />
                {errors.title && <p className="error-text">{errors.title}</p>}
              </div>
            </div>
          </div>

          <div
            className={`step-content ${currentStep === 3 ? 'active' : ''}`}
            style={{ transform: `translateX(${(currentStep - 1) * -100}%)` }}
          >
            <div className="step-3">
              <h3>第三步：书写信件内容</h3>
              <p className="step-desc">写下你想说的话，支持基础Markdown格式（**粗体**、*斜体*、#标题）</p>

              <div className="editor-container">
                <div className="editor-tabs">
                  <span className="tab active">编辑</span>
                  <span className="tab">预览</span>
                </div>

                <div className="editor-content">
                  <textarea
                    className="form-textarea"
                    placeholder="亲爱的未来的自己：\n\n今天是..."
                    value={formData.content}
                    onChange={e => setFormData({ content: e.target.value })}
                  />
                </div>

                <div className="preview-container">
                  <div className="preview-label">实时预览</div>
                  <div
                    className="preview-content"
                    dangerouslySetInnerHTML={{ __html: previewContent }}
                  />
                </div>
              </div>

              {errors.content && <p className="error-text">{errors.content}</p>}
            </div>
          </div>

          <div
            className={`step-content ${currentStep === 4 ? 'active' : ''}`}
            style={{ transform: `translateX(${(currentStep - 1) * -100}%)` }}
          >
            <div className="step-4">
              <h3>第四步：设置提醒方式</h3>
              <p className="step-desc">信件解锁时如何通知你？</p>

              <div className="reminder-options">
                <label
                  className={`reminder-option ${formData.reminderType === 'browser' ? 'selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="reminderType"
                    value="browser"
                    checked={formData.reminderType === 'browser'}
                    onChange={() => setFormData({ reminderType: 'browser' })}
                  />
                  <div className="option-content">
                    <strong>浏览器通知</strong>
                    <p>解锁时在浏览器弹出通知提醒</p>
                  </div>
                </label>

                <label
                  className={`reminder-option ${formData.reminderType === 'email' ? 'selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="reminderType"
                    value="email"
                    checked={formData.reminderType === 'email'}
                    onChange={() => setFormData({ reminderType: 'email' })}
                  />
                  <div className="option-content">
                    <strong>邮件提醒</strong>
                    <p>解锁时发送邮件到指定邮箱</p>
                  </div>
                </label>
              </div>

              {formData.reminderType === 'email' && (
                <div className="form-group">
                  <label>邮箱地址</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={e => setFormData({ email: e.target.value })}
                  />
                  {errors.email && <p className="error-text">{errors.email}</p>}
                </div>
              )}

              {errors.submit && <p className="error-text">{errors.submit}</p>}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          {currentStep > 1 && (
            <button className="btn btn-secondary" onClick={handlePrev}>
              上一步
            </button>
          )}
          {currentStep < 4 ? (
            <button className="btn btn-primary" onClick={handleNext}>
              下一步
            </button>
          ) : (
            <button className="btn btn-primary" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? '创建中...' : '封存时间胶囊'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
