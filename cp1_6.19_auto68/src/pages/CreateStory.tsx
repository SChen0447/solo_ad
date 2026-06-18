import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStoryStore } from '../store/storyStore';

export default function CreateStory() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [firstContent, setFirstContent] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const createStory = useStoryStore((s) => s.createStory);
  const nickname = useStoryStore((s) => s.userNickname);
  const navigate = useNavigate();

  const descLength = description.length;
  const contentLength = firstContent.length;
  const contentProgress = Math.min(contentLength / 500, 1);
  const progressColor = contentProgress < 0.5
    ? `hsl(${120 - contentProgress * 120}, 80%, 50%)`
    : contentProgress < 1
    ? `hsl(${120 - contentProgress * 120}, 80%, 50%)`
    : '#4CAF50';

  const handleSubmit = async () => {
    setError('');
    if (!title.trim()) {
      setError('请输入故事标题');
      return;
    }
    if (descLength > 200) {
      setError('简介不能超过200字');
      return;
    }
    if (contentLength < 500) {
      setError('第一章内容至少需要500字');
      return;
    }
    setSubmitting(true);
    try {
      const story = await createStory({
        title: title.trim(),
        description: description.trim(),
        firstSegment: firstContent.trim(),
        author: nickname || '匿名',
      });
      setInviteCode(story.code);
      setTimeout(() => {
        navigate(`/story/${story.code}`);
      }, 2000);
    } catch (e: any) {
      setError(e.message || '创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="create-page">
      <h2 className="page-title">创建新故事</h2>
      <div className="create-form">
        <div className="form-group">
          <label className="form-label">故事标题</label>
          <input
            className="form-input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="给你的故事起个名字..."
            maxLength={50}
          />
        </div>

        <div className="form-group">
          <label className="form-label">简介</label>
          <textarea
            className="form-textarea"
            value={description}
            onChange={(e) => { if (e.target.value.length <= 200) setDescription(e.target.value); }}
            placeholder="简短描述你的故事..."
            rows={3}
          />
          <div className="char-count">{descLength}/200</div>
        </div>

        <div className="form-group">
          <label className="form-label">第一章内容</label>
          <textarea
            className="form-textarea form-textarea-lg"
            value={firstContent}
            onChange={(e) => setFirstContent(e.target.value)}
            placeholder="开始你的故事...至少500字"
            rows={10}
          />
          <div className="progress-wrapper">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${contentProgress * 100}%`, backgroundColor: progressColor }}
              />
            </div>
            <span className="char-count">{contentLength}/500</span>
          </div>
        </div>

        {error && <div className="form-error">{error}</div>}

        <button
          className="btn-primary btn-generate"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? '生成中...' : '生成邀请码'}
        </button>

        {inviteCode && (
          <div className="invite-code-box">
            <span className="invite-label">故事邀请码</span>
            <span className="invite-code">{inviteCode}</span>
            <span className="invite-hint">分享此码让其他人加入续写！即将跳转...</span>
          </div>
        )}
      </div>
    </div>
  );
}
