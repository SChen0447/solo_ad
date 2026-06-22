import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Component } from '../types';
import '../styles/component-grid.css';

function ThumbnailCanvas({ name, tags }: { name: string; tags: string[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = 200;
    const height = 120;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    const colors = [
      ['#e0e7ff', '#6366f1'],
      ['#fce7f3', '#ec4899'],
      ['#dcfce7', '#22c55e'],
      ['#fef3c7', '#f59e0b'],
      ['#e0f2fe', '#0ea5e9'],
      ['#f3e8ff', '#a855f7'],
    ];

    const colorIndex = name.charCodeAt(0) % colors.length;
    const [bgColor, accentColor] = colors[colorIndex];

    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, bgColor);
    gradient.addColorStop(1, '#f8fafc');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = accentColor;
    ctx.globalAlpha = 0.15;
    ctx.beginPath();
    ctx.arc(width - 30, 30, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(40, height - 20, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.roundRect(16, 16, 40, 40, 10);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name.charAt(0), 36, 36);

    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(name, 16, height - 16);

    if (tags.length > 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText(tags[0], 16, height - 32);
    }
  }, [name, tags]);

  return <canvas ref={canvasRef} className="component-thumbnail" />;
}

function ComponentCard({ component }: { component: Component }) {
  const navigate = useNavigate();
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(component.likes);

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!liked) {
      setLiked(true);
      setLikes(prev => prev + 1);
      fetch(`/api/components/${component.id}/like`, { method: 'POST' });
    }
  };

  return (
    <div
      className="component-card"
      onClick={() => navigate(`/component/${component.id}`)}
    >
      <div className="card-thumbnail">
        <ThumbnailCanvas name={component.name} tags={component.tags} />
      </div>
      <div className="card-content">
        <h3 className="component-name">{component.name}</h3>
        <div className="tag-list">
          {component.tags.slice(0, 3).map((tag, index) => (
            <span key={index} className="tag">
              {tag}
            </span>
          ))}
        </div>
        <div className="card-footer">
          <button
            className={`like-btn ${liked ? 'liked' : ''}`}
            onClick={handleLike}
          >
            <span className="like-icon">{liked ? '❤️' : '🤍'}</span>
            <span className="like-count">{likes}</span>
          </button>
          <span className="version-badge">
            v{component.versions[component.versions.length - 1].version.replace(/^v/, '')}
          </span>
        </div>
      </div>
    </div>
  );
}

function ComponentGrid() {
  const [components, setComponents] = useState<Component[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchComponents = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (searchQuery) params.set('search', searchQuery);
        if (selectedTag) params.set('tag', selectedTag);

        const res = await fetch(`/api/components?${params}`);
        const data = await res.json();
        setComponents(data);
      } catch (error) {
        console.error('获取组件列表失败:', error);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(fetchComponents, searchQuery ? 100 : 0);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedTag]);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    components.forEach(c => c.tags.forEach(t => tagSet.add(t)));
    return Array.from(tagSet);
  }, [components]);

  return (
    <div className="browser-page">
      <div className="browser-header">
        <div>
          <h1 className="page-title">组件库</h1>
          <p className="page-subtitle">浏览和发现团队共享的UI组件</p>
        </div>
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="搜索组件名称或描述..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      <div className="tag-filter-bar">
        <button
          className={`tag-filter-btn ${selectedTag === null ? 'active' : ''}`}
          onClick={() => setSelectedTag(null)}
        >
          全部
        </button>
        {allTags.map((tag) => (
          <button
            key={tag}
            className={`tag-filter-btn ${selectedTag === tag ? 'active' : ''}`}
            onClick={() => setSelectedTag(tag)}
          >
            {tag}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner" />
          <p>加载中...</p>
        </div>
      ) : components.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <h3>没有找到组件</h3>
          <p>试试其他搜索关键词或标签</p>
        </div>
      ) : (
        <div className="component-grid">
          {components.map((component) => (
            <ComponentCard key={component.id} component={component} />
          ))}
        </div>
      )}
    </div>
  );
}

export default ComponentGrid;
