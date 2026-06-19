import { useState } from 'react';

interface CreatePollProps {
  onSuccess: (pollId: string) => void;
}

interface CreatePollResponse {
  id: string;
}

function CreatePoll({ onSuccess }: CreatePollProps) {
  const [title, setTitle] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [deadlineMinutes, setDeadlineMinutes] = useState<number>(30);
  const [customDeadline, setCustomDeadline] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdPollId, setCreatedPollId] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const addOption = () => {
    if (options.length < 8) {
      setOptions([...options, '']);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      const newOptions = options.filter((_, i) => i !== index);
      setOptions(newOptions);
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const getDeadline = (): number => {
    if (customDeadline) {
      return new Date(customDeadline).getTime();
    }
    return Date.now() + deadlineMinutes * 60 * 1000;
  };

  const validateForm = (): string | null => {
    if (!title.trim()) {
      return '请输入投票标题';
    }
    const validOptions = options.filter((o) => o.trim());
    if (validOptions.length < 2) {
      return '请至少填写2个选项';
    }
    const deadline = getDeadline();
    if (customDeadline && isNaN(deadline)) {
      return '请选择有效的截止时间';
    }
    if (deadline <= Date.now()) {
      return '截止时间必须大于当前时间';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      const validOptions = options.filter((o) => o.trim());
      const response = await fetch('/api/polls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: title.trim(),
          options: validOptions.map((o) => o.trim()),
          deadline: getDeadline()
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '创建投票失败');
      }

      const data: CreatePollResponse = await response.json();
      setCreatedPollId(data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建投票失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getShareLink = (): string => {
    if (!createdPollId) return '';
    return `${window.location.origin}${window.location.pathname}#poll/${createdPollId}`;
  };

  const copyLink = async () => {
    const link = getShareLink();
    try {
      await navigator.clipboard.writeText(link);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = link;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  if (createdPollId) {
    return (
      <div className="card">
        <h2 className="card-title">投票创建成功！</h2>
        <div className="success-message">
          您的投票已成功创建，复制下方链接分享给团队成员参与投票。
        </div>
        <div className="share-link-container">
          <div className="share-link-label">分享链接</div>
          <div className="share-link-box">
            <input
              type="text"
              className="share-link-input"
              value={getShareLink()}
              readOnly
            />
            <button
              className={`copy-btn ${linkCopied ? 'copied' : ''}`}
              onClick={copyLink}
            >
              {linkCopied ? '已复制 ✓' : '复制链接'}
            </button>
          </div>
        </div>
        <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
          <button className="btn-primary" onClick={() => onSuccess(createdPollId)}>
            进入投票页面
          </button>
          <button
            className="btn-secondary"
            onClick={() => {
              setCreatedPollId(null);
              setTitle('');
              setOptions(['', '']);
              setLinkCopied(false);
            }}
          >
            创建新投票
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="card-title">创建新投票</h2>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">投票标题</label>
          <input
            type="text"
            className="form-input"
            placeholder="请输入投票问题或议题..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
          />
        </div>

        <div className="form-group">
          <label className="form-label">
            选项 ({options.length}/8)
          </label>
          {options.map((option, index) => (
            <div key={index} className="option-input-row">
              <input
                type="text"
                className="form-input"
                placeholder={`选项 ${index + 1}`}
                value={option}
                onChange={(e) => updateOption(index, e.target.value)}
                maxLength={100}
              />
              {options.length > 2 && (
                <button
                  type="button"
                  className="remove-btn"
                  onClick={() => removeOption(index)}
                >
                  删除
                </button>
              )}
            </div>
          ))}
          {options.length < 8 && (
            <button type="button" className="add-btn" onClick={addOption}>
              + 添加选项
            </button>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">截止时间</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <select
              className="form-input"
              value={deadlineMinutes}
              onChange={(e) => {
                setDeadlineMinutes(Number(e.target.value));
                setCustomDeadline('');
              }}
              disabled={!!customDeadline}
            >
              <option value={5}>5 分钟后</option>
              <option value={15}>15 分钟后</option>
              <option value={30}>30 分钟后</option>
              <option value={60}>1 小时后</option>
              <option value={1440}>1 天后</option>
            </select>
            <div style={{ textAlign: 'center', color: '#718096', fontSize: '13px' }}>
              或
            </div>
            <input
              type="datetime-local"
              className="form-input"
              value={customDeadline}
              onChange={(e) => setCustomDeadline(e.target.value)}
            />
          </div>
        </div>

        <button
          type="submit"
          className="btn-primary"
          disabled={isSubmitting}
          style={{ width: '100%' }}
        >
          {isSubmitting ? '创建中...' : '创建投票'}
        </button>
      </form>
    </div>
  );
}

export default CreatePoll;
