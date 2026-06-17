import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

interface CreatePollProps {
  onPollCreated: (pollId: string, adminToken: string) => void;
}

const CreatePoll = ({ onPollCreated }: CreatePollProps) => {
  const [topic, setTopic] = useState('');
  const [options, setOptions] = useState<{ id: string; text: string }[]>([
    { id: uuidv4(), text: '' },
    { id: uuidv4(), text: '' },
  ]);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleOptionChange = (id: string, text: string) => {
    setOptions(options.map((opt) => (opt.id === id ? { ...opt, text } : opt)));
  };

  const handleAddOption = () => {
    if (options.length >= 10) return;
    setOptions([...options, { id: uuidv4(), text: '' }]);
  };

  const handleRemoveOption = (id: string) => {
    if (options.length <= 2) return;
    setOptions(options.filter((opt) => opt.id !== id));
  };

  const isFormValid = () => {
    if (!topic.trim() || topic.length > 50) return false;
    const validOptions = options.filter((opt) => opt.text.trim().length > 0);
    return validOptions.length >= 2 && validOptions.length <= 10;
  };

  const handleCreate = async () => {
    if (!isFormValid() || loading) return;

    setLoading(true);
    try {
      const validOptions = options
        .filter((opt) => opt.text.trim().length > 0)
        .map((opt) => opt.text.trim());

      const response = await fetch('/api/poll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic: topic.trim(),
          options: validOptions,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || '创建失败');
      }

      const data = await response.json();
      const link = `${window.location.origin}${window.location.pathname}#${data.id}`;
      setShareLink(link);
      setAdminToken(data.adminToken);

      try {
        await navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // fallback
        const textarea = document.createElement('textarea');
        textarea.value = link;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }

      onPollCreated(data.id, data.adminToken);
    } catch (error) {
      alert(error instanceof Error ? error.message : '创建失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = shareLink;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="create-poll-container">
      <h1 className="create-poll-title">创建匿名投票</h1>
      <p className="create-poll-subtitle">无需登录，即刻创建投票并分享链接</p>

      <div className="card">
        <div className="form-group">
          <label className="form-label">投票议题</label>
          <input
            type="text"
            className="form-input"
            placeholder="输入投票议题（最多50字）"
            value={topic}
            onChange={(e) => setTopic(e.target.value.slice(0, 50))}
            maxLength={50}
          />
          <div className="char-count">{topic.length}/50</div>
        </div>

        <div className="form-group">
          <label className="form-label">
            投票选项（{options.length}/10，至少2个）
          </label>

          {options.map((opt, index) => (
            <div className="option-item" key={opt.id}>
              <input
                type="text"
                className="option-input"
                placeholder={`选项 ${index + 1}`}
                value={opt.text}
                onChange={(e) => handleOptionChange(opt.id, e.target.value)}
              />
              <button
                className="option-remove-btn"
                onClick={() => handleRemoveOption(opt.id)}
                disabled={options.length <= 2}
                title="删除选项"
              >
                ×
              </button>
            </div>
          ))}

          <button
            className="add-option-btn"
            onClick={handleAddOption}
            disabled={options.length >= 10}
          >
            + 添加选项
          </button>
        </div>

        <button
          className="btn btn-primary"
          style={{ width: '100%', padding: '14px', fontSize: '16px' }}
          onClick={handleCreate}
          disabled={!isFormValid() || loading}
        >
          {loading ? '创建中...' : '生成投票链接'}
        </button>

        {shareLink && (
          <div className="share-link-section">
            <div className="share-link-title">✓ 投票创建成功！</div>
            <div className="share-link-box">
              <input
                type="text"
                className="share-link-input"
                value={shareLink}
                readOnly
              />
              <button className="copy-btn" onClick={handleCopyLink}>
                {copied ? '已复制' : '复制链接'}
              </button>
            </div>
            {adminToken && (
              <div className="admin-token-hint">
                管理员令牌：<strong>{adminToken}</strong>（请妥善保存，用于管理投票）
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CreatePoll;
