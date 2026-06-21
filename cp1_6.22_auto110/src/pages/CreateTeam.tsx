import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const AVAILABLE_TAGS = [
  '羽毛球', '篮球', '足球', '乒乓球', '跑步', '健身',
  '图书馆刷夜', '高数冲刺', '英语备考', '考研', '编程学习',
  '联机游戏', '王者荣耀', '英雄联盟', '原神', '桌游'
];

const CreateTeam: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [maxMembers, setMaxMembers] = useState(4);
  const [nickname, setNickname] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else if (selectedTags.length < 3) {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('请输入小队名称');
      return;
    }
    if (selectedTags.length === 0) {
      setError('请至少选择一个兴趣标签');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          tags: selectedTags,
          maxMembers,
          creatorNickname: nickname.trim() || undefined
        })
      });

      if (response.ok) {
        const team = await response.json();
        navigate(`/room/${team.id}`);
      } else {
        const data = await response.json();
        setError(data.error || '创建失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="create-team-container">
      <header className="navbar">
        <div className="navbar-content">
          <Link to="/" className="back-link">← 返回</Link>
          <h1 className="logo">创建小队</h1>
        </div>
      </header>

      <main className="form-container">
        <form onSubmit={handleSubmit} className="create-form">
          <div className="form-group">
            <label htmlFor="name">小队名称 *</label>
            <input
              id="name"
              type="text"
              className="form-input"
              placeholder="给小队起个响亮的名字"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={30}
            />
          </div>

          <div className="form-group">
            <label>你的昵称（可选）</label>
            <input
              type="text"
              className="form-input"
              placeholder="留空将随机分配"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={15}
            />
          </div>

          <div className="form-group">
            <label>兴趣标签 * （最多选择3个）</label>
            <div className="tags-container">
              {AVAILABLE_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={`tag-btn ${selectedTags.includes(tag) ? 'selected' : ''}`}
                  onClick={() => toggleTag(tag)}
                  disabled={!selectedTags.includes(tag) && selectedTags.length >= 3}
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="maxMembers">最大人数：{maxMembers}人</label>
            <input
              id="maxMembers"
              type="range"
              className="range-input"
              min="2"
              max="8"
              value={maxMembers}
              onChange={(e) => setMaxMembers(Number(e.target.value))}
            />
            <div className="range-labels">
              <span>2人</span>
              <span>8人</span>
            </div>
          </div>

          {error && <div className="form-error">{error}</div>}

          <button
            type="submit"
            className="btn btn-primary btn-large"
            disabled={submitting}
          >
            {submitting ? '创建中...' : '创建小队'}
          </button>
        </form>
      </main>
    </div>
  );
};

export default CreateTeam;
