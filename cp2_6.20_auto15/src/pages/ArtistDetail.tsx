import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import ForceGraph from '../components/ForceGraph';
import PerformanceModal from '../components/PerformanceModal';
import type { Work, Performance } from '../types';
import '../styles/artist-detail.css';

const ArtistDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { state, addWork, updateWork, deleteWork } = useApp();
  const [showWorkModal, setShowWorkModal] = useState(false);
  const [editingWork, setEditingWork] = useState<Work | null>(null);
  const [showPerfModal, setShowPerfModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'works' | 'performances'>('works');

  const artist = state.artists.find(a => a.id === id);

  if (!artist) {
    return (
      <div className="artist-detail">
        <div className="not-found">艺术家不存在</div>
      </div>
    );
  }

  const artistPerformances = state.performances
    .filter(p => p.artistId === artist.id)
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

  const relatedWorks = state.artists
    .filter(a => a.id !== artist.id)
    .flatMap(a => a.works.map(w => ({ ...w, artistName: a.name, styleTags: a.styleTags })));

  const handleAddWork = () => {
    setEditingWork(null);
    setShowWorkModal(true);
  };

  const handleEditWork = (work: Work) => {
    setEditingWork(work);
    setShowWorkModal(true);
  };

  const handleDeleteWork = async (workId: string) => {
    if (!confirm('确定要删除这个作品吗？')) return;
    await deleteWork(artist.id, workId);
  };

  const handleWorkSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      duration: parseInt(formData.get('duration') as string) || 180,
      releaseDate: formData.get('releaseDate') as string,
      playUrl: formData.get('playUrl') as string || '#',
    };

    if (editingWork) {
      await updateWork(artist.id, editingWork.id, data);
    } else {
      await addWork(artist.id, data);
    }
    setShowWorkModal(false);
    setEditingWork(null);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const styleTagColors = [
    '#6c63ff', '#4ade80', '#fbbf24', '#f472b6', '#38bdf8',
    '#fb923c', '#a78bfa', '#34d399', '#f87171', '#2dd4bf',
  ];

  return (
    <div className="artist-detail">
      <button className="back-btn" onClick={() => navigate('/artists')}>
        ← 返回艺术家列表
      </button>

      <div className="artist-header">
        <div className="artist-avatar-large">
          {artist.avatarUrl ? (
            <img src={artist.avatarUrl} alt={artist.name} />
          ) : (
            <span>🎤</span>
          )}
        </div>
        <div className="artist-info">
          <h1 className="artist-name">{artist.name}</h1>
          <div className="artist-tags">
            {artist.styleTags.map((tag, idx) => (
              <span
                key={tag}
                className="style-tag-large"
                style={{ backgroundColor: styleTagColors[idx % styleTagColors.length] }}
              >
                {tag}
              </span>
            ))}
          </div>
          <p className="artist-bio-text">{artist.bio || '暂无简介'}</p>
          <div className="artist-stats">
            <span className="stat">
              <strong>{artist.works.length}</strong> 首作品
            </span>
            <span className="stat">
              <strong>{artistPerformances.length}</strong> 场演出
            </span>
          </div>
        </div>
      </div>

      <div className="detail-tabs">
        <button
          className={`tab-btn ${activeTab === 'works' ? 'active' : ''}`}
          onClick={() => setActiveTab('works')}
        >
          作品列表
        </button>
        <button
          className={`tab-btn ${activeTab === 'performances' ? 'active' : ''}`}
          onClick={() => setActiveTab('performances')}
        >
          演出安排
        </button>
      </div>

      <div className="detail-content">
        <div className="content-left">
          {activeTab === 'works' && (
            <div className="works-section">
              <div className="section-header">
                <h2>作品列表</h2>
                <button className="btn-primary" onClick={handleAddWork}>
                  + 添加作品
                </button>
              </div>
              {artist.works.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon">🎵</span>
                  <p>暂无作品，点击上方按钮添加</p>
                </div>
              ) : (
                <div className="works-list">
                  {artist.works.map(work => (
                    <div key={work.id} className="work-item">
                      <div className="work-icon">🎵</div>
                      <div className="work-info">
                        <div className="work-title">{work.name}</div>
                        <div className="work-meta">
                          时长: {formatDuration(work.duration)} · 发行: {work.releaseDate}
                        </div>
                      </div>
                      <div className="work-actions">
                        <button
                          className="btn-secondary small"
                          onClick={() => handleEditWork(work)}
                        >
                          编辑
                        </button>
                        <button
                          className="btn-danger small"
                          onClick={() => handleDeleteWork(work.id)}
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'performances' && (
            <div className="performances-section">
              <div className="section-header">
                <h2>演出安排</h2>
                <button className="btn-primary" onClick={() => setShowPerfModal(true)}>
                  + 添加演出
                </button>
              </div>
              {artistPerformances.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon">📅</span>
                  <p>暂无演出安排</p>
                </div>
              ) : (
                <div className="performances-list">
                  {artistPerformances.map(perf => (
                    <div key={perf.id} className="performance-item">
                      <div className="perf-date-box">
                        <span className="perf-day">{new Date(perf.date).getDate()}</span>
                        <span className="perf-month">{perf.date.slice(5, 7)}月</span>
                      </div>
                      <div className="perf-details">
                        <div className="perf-time">{perf.time}</div>
                        <div className="perf-venue-name">{perf.venue}</div>
                        {perf.notes && <div className="perf-notes">{perf.notes}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="content-right">
          <div className="graph-section">
            <h3>作品关联图谱</h3>
            <p className="graph-desc">节点可拖拽，绿色连线表示风格相似度 &gt; 70%</p>
            <ForceGraph
              mainArtistWorks={artist.works}
              relatedWorks={relatedWorks}
              artistStyleTags={artist.styleTags}
            />
          </div>
        </div>
      </div>

      {showWorkModal && (
        <div className="modal-overlay" onClick={() => setShowWorkModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">
              {editingWork ? '编辑作品' : '添加作品'}
            </h2>
            <form onSubmit={handleWorkSubmit}>
              <div className="form-group">
                <label className="form-label">曲名 *</label>
                <input
                  type="text"
                  name="name"
                  className="form-input"
                  defaultValue={editingWork?.name || ''}
                  placeholder="输入作品名称"
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">时长（秒）*</label>
                  <input
                    type="number"
                    name="duration"
                    className="form-input"
                    defaultValue={editingWork?.duration || 180}
                    min="1"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">发行日期 *</label>
                  <input
                    type="date"
                    name="releaseDate"
                    className="form-input"
                    defaultValue={editingWork?.releaseDate || ''}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">播放链接</label>
                <input
                  type="text"
                  name="playUrl"
                  className="form-input"
                  defaultValue={editingWork?.playUrl || ''}
                  placeholder="https://..."
                />
              </div>
              <div className="form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowWorkModal(false)}
                >
                  取消
                </button>
                <button type="submit" className="btn-primary">
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <PerformanceModal
        isOpen={showPerfModal}
        onClose={() => setShowPerfModal(false)}
        performance={null}
        defaultDate=""
      />
    </div>
  );
};

export default ArtistDetail;
