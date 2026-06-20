import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { voteApi } from '../api/voteApi';
import type { VoteType } from '../types';
import { useVoteContext } from '../App';

export const VoteCreate: React.FC = () => {
  const navigate = useNavigate();
  const { addVote } = useVoteContext();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<VoteType>('single');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [endTime, setEndTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdVote, setCreatedVote] = useState<{ id: string; qrCode: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = '请输入投票标题';
    }

    const validOptions = options.filter(opt => opt.trim());
    if (validOptions.length < 2) {
      newErrors.options = '至少需要2个有效选项';
    }

    if (!endTime) {
      newErrors.endTime = '请选择截止时间';
    } else if (new Date(endTime) <= new Date()) {
      newErrors.endTime = '截止时间必须晚于当前时间';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const validOptions = options.filter(opt => opt.trim());
      const result = await voteApi.createVote({
        title: title.trim(),
        description: description.trim(),
        type,
        options: validOptions,
        endTime
      });

      addVote(result.vote);
      setCreatedVote({ id: result.vote.id, qrCode: result.qrCode });
    } catch (error) {
      console.error('创建投票失败:', error);
      setErrors({ submit: '创建投票失败，请重试' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (createdVote) {
    return (
      <div className="vote-create-container">
        <div className="card success-card">
          <div className="success-icon">✓</div>
          <h2>投票创建成功！</h2>
          <p className="vote-id">投票ID: {createdVote.id}</p>

          <div className="qr-section">
            <h3>扫码参与投票</h3>
            <div className="qr-code-wrapper">
              <QRCodeSVG
                value={`${window.location.origin}/vote/${createdVote.id}`}
                size={180}
                bgColor="#1a1a2e"
                fgColor="#00d2ff"
                level="H"
              />
            </div>
            <p className="qr-hint">扫描二维码或分享链接参与投票</p>
          </div>

          <div className="action-buttons">
            <button
              className="btn btn-primary"
              onClick={() => navigate(`/vote/${createdVote.id}`)}
            >
              查看投票详情
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setCreatedVote(null);
                setTitle('');
                setDescription('');
                setOptions(['', '']);
                setEndTime('');
              }}
            >
              再创建一个
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="vote-create-container">
      <div className="card">
        <h2 className="card-title">创建新投票</h2>

        <form onSubmit={handleSubmit} className="vote-form">
          <div className="form-group">
            <label className="form-label">投票标题 *</label>
            <input
              type="text"
              className={`form-input ${errors.title ? 'error' : ''}`}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="请输入投票标题"
              maxLength={100}
            />
            {errors.title && <span className="error-text">{errors.title}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">投票描述</label>
            <textarea
              className="form-textarea"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="请输入投票描述（可选）"
              rows={3}
              maxLength={500}
            />
          </div>

          <div className="form-group">
            <label className="form-label">投票类型 *</label>
            <div className="type-selector">
              {[
                { value: 'single', label: '单选', icon: '◉' },
                { value: 'multiple', label: '多选', icon: '☑' },
                { value: 'rating', label: '评分', icon: '★' }
              ].map(item => (
                <button
                  key={item.value}
                  type="button"
                  className={`type-btn ${type === item.value ? 'active' : ''}`}
                  onClick={() => setType(item.value as VoteType)}
                >
                  <span className="type-icon">{item.icon}</span>
                  <span className="type-label">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              选项列表 * <span className="hint">（至少2个，最多10个）</span>
            </label>
            <div className="options-list">
              {options.map((option, index) => (
                <div key={index} className="option-item">
                  <span className="option-index">{index + 1}</span>
                  <input
                    type="text"
                    className="form-input option-input"
                    value={option}
                    onChange={e => updateOption(index, e.target.value)}
                    placeholder={`选项 ${index + 1}`}
                    maxLength={200}
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      className="remove-option-btn"
                      onClick={() => removeOption(index)}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
            {errors.options && <span className="error-text">{errors.options}</span>}

            {options.length < 10 && (
              <button type="button" className="add-option-btn" onClick={addOption}>
                <span className="plus-icon">+</span>
                添加选项
              </button>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">截止时间 *</label>
            <input
              type="datetime-local"
              className={`form-input ${errors.endTime ? 'error' : ''}`}
              value={endTime}
              onChange={e => setEndTime(e.target.value)}
            />
            {errors.endTime && <span className="error-text">{errors.endTime}</span>}
          </div>

          {errors.submit && (
            <div className="error-banner">{errors.submit}</div>
          )}

          <button
            type="submit"
            className="btn btn-primary submit-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? '创建中...' : '创建投票'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default VoteCreate;
