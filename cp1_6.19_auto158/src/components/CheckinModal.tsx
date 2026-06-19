import { useState, useEffect } from 'react';
import type { Kr } from '../types';

interface Props {
  kr: Kr;
  onClose: () => void;
  onSubmit: (comment: string, progress: number) => void;
}

export default function CheckinModal({ kr, onClose, onSubmit }: Props) {
  const [visible, setVisible] = useState(false);
  const [comment, setComment] = useState('');
  const [progress, setProgress] = useState(kr.progress);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  function handleClose() {
    setVisible(false);
    setTimeout(onClose, 300);
  }

  function handleSubmit() {
    onSubmit(comment.trim(), progress);
    setComment('');
  }

  const sortedCheckins = [...kr.checkins].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div
      className={`modal-overlay ${visible ? 'visible' : ''}`}
      onClick={handleClose}
    >
      <div
        className={`checkin-modal ${visible ? 'visible' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-header-text">
            <h3>每周复盘 - {kr.description}</h3>
            <div className="modal-subtitle">
              负责人：{kr.owner} · 截止：{kr.dueDate}
            </div>
          </div>
          <button className="close-btn" onClick={handleClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="checkin-form">
            <div className="form-group">
              <label>调整进度 (步进5%)</label>
              <div className="checkin-progress-row">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={progress}
                  onChange={(e) => setProgress(Number(e.target.value))}
                  className="kr-slider"
                />
                <div className="checkin-progress-value">{progress}%</div>
              </div>
            </div>
            <div className="form-group">
              <label>本周复盘评论</label>
              <textarea
                placeholder="记录本周进展、遇到的问题和下周计划..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
              />
            </div>
            <div className="form-actions">
              <button className="btn btn-secondary" onClick={handleClose}>
                取消
              </button>
              <button
                className="btn btn-primary ripple-btn"
                onClick={handleSubmit}
                disabled={progress === kr.progress && !comment.trim()}
              >
                提交复盘
              </button>
            </div>
          </div>

          <div className="checkin-history">
            <h4>历史打卡记录</h4>
            {sortedCheckins.length === 0 ? (
              <div className="no-checkins">暂无打卡记录</div>
            ) : (
              <div className="checkin-list">
                {sortedCheckins.map((c) => (
                  <div key={c.id} className="checkin-item animate-fade-in">
                    <div className="checkin-time">
                      {formatDate(c.timestamp)}
                    </div>
                    <div className="checkin-content">
                      <div className="checkin-progress-badge" style={{
                        background: getProgressColor(c.progressValue),
                      }}>
                        {c.progressValue}%
                        {c.progressDelta !== 0 && (
                          <span className={`delta ${c.progressDelta > 0 ? 'positive' : c.progressDelta < 0 ? 'negative' : ''}`}>
                            {c.progressDelta > 0 ? ` +${c.progressDelta}` : c.progressDelta < 0 ? ` ${c.progressDelta}` : ''}
                          </span>
                        )}
                      </div>
                      {c.comment && <div className="checkin-comment">{c.comment}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  if (hours < 24) return `${hours} 小时前`;
  if (days < 7) return `${days} 天前`;
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getProgressColor(p: number): string {
  if (p < 33) return '#ef5350';
  if (p < 66) return '#ffa726';
  return '#66bb6a';
}
