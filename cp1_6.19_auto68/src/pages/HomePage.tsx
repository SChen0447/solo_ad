import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStoryStore } from '../store/storyStore';

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}天前`;
  return new Date(dateStr).toLocaleDateString('zh-CN');
}

export default function HomePage() {
  const { storyList, fetchStoryList, loading } = useStoryStore();
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchStoryList();
  }, [fetchStoryList]);

  const filteredList = useMemo(() => {
    if (!search.trim()) return storyList;
    const q = search.toLowerCase();
    return storyList.filter((s) => s.title.toLowerCase().includes(q) || s.description.toLowerCase().includes(q));
  }, [storyList, search]);

  return (
    <div className="home-page">
      <div className="home-header">
        <h1 className="home-title">✨ 发现精彩故事</h1>
        <div className="search-wrapper">
          <input
            className="search-input"
            type="text"
            placeholder="搜索故事..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span className="search-icon">🔍</span>
        </div>
        <Link to="/create" className="btn-primary btn-create-story">
          ＋ 创建新故事
        </Link>
      </div>

      {loading ? (
        <div className="loading-text">加载中...</div>
      ) : filteredList.length === 0 ? (
        <div className="empty-state">
          <p>还没有故事，快来创建第一个吧！</p>
          <Link to="/create" className="btn-primary">创建新故事</Link>
        </div>
      ) : (
        <div className="story-grid">
          {filteredList.map((story) => (
            <div
              key={story.code}
              className="story-card"
              onClick={() => navigate(`/story/${story.code}`)}
            >
              <h3 className="story-card-title">{story.title}</h3>
              <p className="story-card-desc">{story.description || '暂无简介'}</p>
              <div className="story-card-meta">
                <span className="meta-chapters">{story.segmentCount} 章节</span>
                <span className="meta-time">{timeAgo(story.updatedAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
