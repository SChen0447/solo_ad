import { useState, useRef } from 'react';
import {
  Toy, Cat, ToyType, DangerLevel, CatReaction,
  getToyUsageCount, getToyLastInteraction, checkInterestDecline
} from '../utils/database';

interface ToyListProps {
  toys: Toy[];
  cat: Cat;
  onToyClick: (toyId: number) => void;
  onRecordInteraction: (toyId: number, data: {
    duration: number; reaction: CatReaction; damaged: boolean;
  }) => void;
  onDeleteToy: (toyId: number) => void;
}

const typeLabels: Record<ToyType, string> = {
  chase: '追逐型',
  scratch: '抓挠型',
  puzzle: '智力型',
};

const dangerIcons: Record<DangerLevel, { icon: string; label: string }> = {
  safe: { icon: '😊', label: '安全' },
  supervise: { icon: '⚠️', label: '需监督' },
  avoid: { icon: '❌', label: '避免' },
};

function ToyList({ toys, cat, onToyClick, onRecordInteraction, onDeleteToy }: ToyListProps) {
  const [filter, setFilter] = useState<ToyType | 'all'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'usage'>('recent');
  const [recordingToyId, setRecordingToyId] = useState<number | null>(null);
  const [duration, setDuration] = useState(10);
  const [reaction, setReaction] = useState<CatReaction>('normal');
  const [damaged, setDamaged] = useState(false);
  const [expandedToyId, setExpandedToyId] = useState<number | null>(null);

  const filteredToys = toys
    .filter(t => filter === 'all' || t.type === filter)
    .sort((a, b) => {
      if (sortBy === 'recent') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      return getToyUsageCount(b.id) - getToyUsageCount(a.id);
    });

  const handleRecordClick = (e: React.MouseEvent, toyId: number) => {
    e.stopPropagation();
    setRecordingToyId(toyId);
    setDuration(10);
    setReaction('normal');
    setDamaged(false);
  };

  const handleSubmitRecord = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (recordingToyId !== null) {
      onRecordInteraction(recordingToyId, { duration, reaction, damaged });
      setRecordingToyId(null);
    }
  };

  const handleCancelRecord = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRecordingToyId(null);
  };

  const handleDelete = (e: React.MouseEvent, toyId: number) => {
    e.stopPropagation();
    onDeleteToy(toyId);
  };

  const toggleExpand = (e: React.MouseEvent, toyId: number) => {
    e.stopPropagation();
    setExpandedToyId(prev => prev === toyId ? null : toyId);
  };

  const formatLastTime = (dateStr: string | null) => {
    if (!dateStr) return '暂无记录';
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return '今天';
    if (diffDays === 1) return '昨天';
    if (diffDays < 7) return `${diffDays}天前`;
    return dateStr.slice(0, 10);
  };

  return (
    <div className="toy-list-section">
      <div className="toy-filters">
        <div className="filter-tabs">
          <button
            className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            全部
          </button>
          <button
            className={`filter-tab chase ${filter === 'chase' ? 'active' : ''}`}
            onClick={() => setFilter('chase')}
          >
            追逐型
          </button>
          <button
            className={`filter-tab scratch ${filter === 'scratch' ? 'active' : ''}`}
            onClick={() => setFilter('scratch')}
          >
            抓挠型
          </button>
          <button
            className={`filter-tab puzzle ${filter === 'puzzle' ? 'active' : ''}`}
            onClick={() => setFilter('puzzle')}
          >
            智力型
          </button>
        </div>
        <div className="sort-select">
          <label>排序：</label>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as 'recent' | 'usage')}>
            <option value="recent">最近添加</option>
            <option value="usage">使用频率</option>
          </select>
        </div>
      </div>

      {filteredToys.length === 0 ? (
        <div className="empty-state">
          <p>暂无玩具，点击右上角添加吧！</p>
        </div>
      ) : (
        <div className="toy-grid">
          {filteredToys.map(toy => {
            const usageCount = getToyUsageCount(toy.id);
            const lastTime = getToyLastInteraction(toy.id);
            const isDeclining = usageCount > 0 && checkInterestDecline(toy.id);
            const isRecording = recordingToyId === toy.id;
            const isExpanded = expandedToyId === toy.id;

            return (
              <div
                key={toy.id}
                className={`toy-card ${isExpanded ? 'expanded' : ''} ${isDeclining ? 'declining' : ''}`}
                onClick={() => onToyClick(toy.id)}
              >
                <div className="toy-card-inner">
                  <div className="toy-image">
                    {toy.image ? (
                      <img src={toy.image} alt={toy.name} />
                    ) : (
                      <div className="toy-placeholder">
                        {toy.type === 'chase' && '🏃'}
                        {toy.type === 'scratch' && '🐾'}
                        {toy.type === 'puzzle' && '🧩'}
                      </div>
                    )}
                  </div>
                  <div className="toy-info">
                    <div className="toy-header">
                      <h3 className="toy-name">{toy.name}</h3>
                      <span className={`toy-type-tag ${toy.type}`}>
                        {typeLabels[toy.type]}
                      </span>
                    </div>
                    <div className="toy-danger">
                      <span className="danger-icon">{dangerIcons[toy.danger_level].icon}</span>
                      <span className="danger-label">{dangerIcons[toy.danger_level].label}</span>
                    </div>
                    {isDeclining && (
                      <span className="interest-decline-tag">兴趣衰退</span>
                    )}
                    <div className="toy-stats">
                      <span>使用 {usageCount} 次</span>
                      <span className="toy-last-time">
                        {formatLastTime(lastTime)}
                      </span>
                    </div>
                    <div className="toy-actions">
                      <button
                        className="record-btn"
                        onClick={(e) => handleRecordClick(e, toy.id)}
                      >
                        记录互动
                      </button>
                      <button
                        className="expand-btn"
                        onClick={(e) => toggleExpand(e, toy.id)}
                      >
                        {isExpanded ? '收起' : '详情'}
                      </button>
                      <button
                        className="delete-btn"
                        onClick={(e) => handleDelete(e, toy.id)}
                      >
                        删除
                      </button>
                    </div>
                  </div>
                </div>

                {isExpanded && toy.description && (
                  <div className="toy-detail-expand">
                    <p className="toy-description">{toy.description}</p>
                    <p className="toy-material">材质：{toy.material}</p>
                  </div>
                )}

                {isRecording && (
                  <div className="record-popup" onClick={e => e.stopPropagation()}>
                    <h4>记录互动</h4>
                    <div className="form-group">
                      <label>互动时长：{duration} 分钟</label>
                      <input
                        type="range"
                        min="1"
                        max="30"
                        value={duration}
                        onChange={e => setDuration(parseInt(e.target.value))}
                        className="duration-slider"
                      />
                    </div>
                    <div className="form-group">
                      <label>猫咪反应：</label>
                      <div className="reaction-options">
                        <button
                          className={`reaction-btn ${reaction === 'excited' ? 'active' : ''}`}
                          onClick={() => setReaction('excited')}
                          title="很兴奋"
                        >
                          😸
                          <span>很兴奋</span>
                        </button>
                        <button
                          className={`reaction-btn ${reaction === 'normal' ? 'active' : ''}`}
                          onClick={() => setReaction('normal')}
                          title="一般"
                        >
                          😺
                          <span>一般</span>
                        </button>
                        <button
                          className={`reaction-btn ${reaction === 'ignore' ? 'active' : ''}`}
                          onClick={() => setReaction('ignore')}
                          title="不理睬"
                        >
                          😾
                          <span>不理睬</span>
                        </button>
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={damaged}
                          onChange={e => setDamaged(e.target.checked)}
                        />
                        产生损坏
                      </label>
                    </div>
                    <div className="popup-actions">
                      <button className="cancel-btn" onClick={handleCancelRecord}>
                        取消
                      </button>
                      <button className="submit-btn" onClick={handleSubmitRecord}>
                        提交
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ToyList;
