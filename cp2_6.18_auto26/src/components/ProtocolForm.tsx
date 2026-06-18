import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createProtocol } from '../utils/api';
import { renderMarkdown, validateEmail } from '../utils/markdown';

export default function ProtocolForm() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState(
    `# 协议标题\n\n## 第一条 协议目的\n\n在此描述协议的目的和背景...\n\n## 第二条 双方权利义务\n\n- 甲方应履行以下义务...\n- 乙方应履行以下义务...\n\n## 第三条 其他约定\n\n本协议一式两份，双方各执一份，签署后生效。`
  );
  const [parties, setParties] = useState<string[]>(['', '']);
  const [errors, setErrors] = useState<{
    title?: string;
    content?: string;
    parties?: Record<number, string>;
  }>({});
  const [submitting, setSubmitting] = useState(false);

  const updateParty = (idx: number, value: string) => {
    setParties((prev) => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
    setErrors((prev) => ({
      ...prev,
      parties: prev.parties
        ? { ...prev.parties, [idx]: '' }
        : undefined,
    }));
  };

  const addParty = () => {
    setParties((prev) => [...prev, '']);
  };

  const removeParty = (idx: number) => {
    if (parties.length <= 1) {
      alert('至少保留一个签署方');
      return;
    }
    setParties((prev) => prev.filter((_, i) => i !== idx));
  };

  const validate = (): boolean => {
    const newErrors: typeof errors = {};
    if (!title.trim()) newErrors.title = '协议标题不能为空';
    if (!content.trim()) newErrors.content = '协议内容不能为空';
    const partyErrors: Record<number, string> = {};
    let hasPartyError = false;
    parties.forEach((email, idx) => {
      if (!email.trim()) {
        partyErrors[idx] = '邮箱不能为空';
        hasPartyError = true;
      } else if (!validateEmail(email)) {
        partyErrors[idx] = '邮箱格式不正确';
        hasPartyError = true;
      }
    });
    if (hasPartyError) newErrors.parties = partyErrors;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      setSubmitting(true);
      const created = await createProtocol({
        title: title.trim(),
        content: content.trim(),
        parties: parties.map((p) => p.trim()),
      });
      alert('协议创建成功！');
      navigate(`/detail/${created.id}`);
    } catch {
      // 错误已在拦截器中处理
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className="page-title">创建新协议</h1>
      <form onSubmit={handleSubmit}>
        <div className="form-layout">
          <div className="form-panel">
            <div className="form-group">
              <label className="form-label">协议标题 *</label>
              <input
                type="text"
                className={`form-input ${
                  errors.title ? 'input-error' : ''
                }`}
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setErrors((p) => ({ ...p, title: undefined }));
                }}
                placeholder="例如：项目保密协议"
              />
              {errors.title && (
                <div className="error-text">{errors.title}</div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">协议内容（支持简单 Markdown）*</label>
              <textarea
                className={`form-textarea ${
                  errors.content ? 'input-error' : ''
                }`}
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  setErrors((p) => ({ ...p, content: undefined }));
                }}
                placeholder="# 标题\n\n段落内容，**加粗**，*斜体*\n\n- 列表项 1\n- 列表项 2"
              />
              {errors.content && (
                <div className="error-text">{errors.content}</div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">签署方邮箱 *（至少一个）</label>
              <div className="email-list">
                {parties.map((email, idx) => (
                  <div className="email-input-row" key={idx}>
                    <input
                      type="email"
                      className={`form-input ${
                        errors.parties?.[idx] ? 'input-error' : ''
                      }`}
                      value={email}
                      onChange={(e) => updateParty(idx, e.target.value)}
                      placeholder={`签署方 ${idx + 1} 邮箱`}
                    />
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => removeParty(idx)}
                      title="移除该签署方"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              {Object.values(errors.parties || {}).some(Boolean) && (
                <div className="error-text">
                  请检查签署方邮箱格式
                </div>
              )}
              <button
                type="button"
                className="secondary-btn"
                style={{ marginTop: 12 }}
                onClick={addParty}
              >
                + 添加签署方
              </button>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => navigate('/')}
              >
                取消
              </button>
              <button
                type="submit"
                className="primary-btn"
                disabled={submitting}
              >
                {submitting ? '提交中...' : '创建协议'}
              </button>
            </div>
          </div>

          <div className="preview-panel">
            <h2>实时预览</h2>
            {title.trim() || content.trim() ? (
              <>
                <h1
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: '#1e3a5f',
                    marginBottom: 12,
                    paddingBottom: 12,
                    borderBottom: '2px solid #1e3a5f22',
                  }}
                >
                  {title.trim() || '（协议标题预览）'}
                </h1>
                <div
                  dangerouslySetInnerHTML={{
                    __html: renderMarkdown(content.trim() || '*（协议内容将在此预览）*'),
                  }}
                />
                <div style={{ marginTop: 24 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      marginBottom: 8,
                      color: '#374151',
                    }}
                  >
                    签署方（{parties.filter((p) => p.trim()).length}/
                    {parties.length} 已填写）
                  </div>
                  {parties.map((email, idx) => (
                    <div
                      key={idx}
                      style={{
                        fontSize: 13,
                        padding: '6px 10px',
                        background: '#f9fafb',
                        borderRadius: 6,
                        marginBottom: 4,
                        color: email.trim() ? '#1f2937' : '#9ca3af',
                      }}
                    >
                      {idx + 1}. {email.trim() || '（待填写邮箱）'}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="empty-state" style={{ padding: '40px 20px' }}>
                <div className="empty-state-icon">👀</div>
                <div className="empty-state-text" style={{ fontSize: 14 }}>
                  填写左侧表单，这里将实时显示协议效果
                </div>
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
