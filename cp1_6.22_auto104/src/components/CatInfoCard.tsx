import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { CatPoint, Feedback, CatStatus } from '../types';

interface CatInfoCardProps {
  point: CatPoint | null;
  onClose: () => void;
  onFeedbackSubmitted: () => void;
}

const STATUS_LABELS: Record<CatStatus, { text: string; color: string; bg: string }> = {
  healthy: { text: '健康', color: '#38a169', bg: '#c6f6d5' },
  injured: { text: '受伤', color: '#e53e3e', bg: '#fed7d7' },
  needsAdoption: { text: '待领养', color: '#d69e2e', bg: '#fefcbf' },
  spayed: { text: '已绝育', color: '#3182ce', bg: '#bee3f8' },
};

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  return `${days}天前`;
}

export default function CatInfoCard({ point, onClose, onFeedbackSubmitted }: CatInfoCardProps) {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [author, setAuthor] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<CatStatus>('healthy');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (point) {
      fetchFeedbacks();
      const timer = setTimeout(() => setIsVisible(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [point]);

  const fetchFeedbacks = useCallback(async () => {
    if (!point) return;
    try {
      const res = await fetch(`/api/cat-points/${point.id}/feedbacks`);
      if (res.ok) {
        const data: Feedback[] = await res.json();
        setFeedbacks(data);
      }
    } catch {
      setFeedbacks(point.feedbacks || []);
    }
  }, [point]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!point || !content.trim()) return;
      setIsSubmitting(true);
      try {
        const res = await fetch(`/api/cat-points/${point.id}/feedbacks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            author: author.trim() || '匿名好心人',
            content: content.trim(),
            status,
          }),
        });
        if (res.ok) {
          setAuthor('');
          setContent('');
          setStatus('healthy');
          await fetchFeedbacks();
          onFeedbackSubmitted();
        }
      } catch {
      } finally {
        setIsSubmitting(false);
      }
    },
    [point, author, content, status, fetchFeedbacks, onFeedbackSubmitted]
  );

  const handleClose = useCallback(() => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  }, [onClose]);

  if (!point) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        ref={cardRef}
        style={{
          background: '#ffffff',
          borderRadius: 16,
          boxShadow: '0 4px 24px rgba(0,0,0,0.12), 0 1px 8px rgba(0,0,0,0.08)',
          width: '100%',
          maxWidth: 480,
          maxHeight: '85vh',
          overflow: 'auto',
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity 300ms ease-out, transform 300ms ease-out',
        }}
      >
        <div
          style={{
            background: 'linear-gradient(135deg, #f687b3, #ffd1a3)',
            padding: '16px 20px',
            borderRadius: '16px 16px 0 0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 20, color: '#fff', fontWeight: 700 }}>
              🐾 {point.name}
            </h2>
          </div>
          <button
            onClick={handleClose}
            style={{
              background: 'rgba(255,255,255,0.3)',
              border: 'none',
              borderRadius: '50%',
              width: 32,
              height: 32,
              cursor: 'pointer',
              fontSize: 16,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
            <div
              style={{
                flex: 1,
                background: '#fef9f0',
                borderRadius: 12,
                padding: '12px 14px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 28, fontWeight: 800, color: '#ed8936' }}>
                {point.catCount}
              </div>
              <div style={{ fontSize: 12, color: '#9b7e65' }}>常驻猫咪</div>
            </div>
            <div
              style={{
                flex: 1,
                background: '#fef9f0',
                borderRadius: 12,
                padding: '12px 14px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 700, color: '#ed8936' }}>
                {formatTimeAgo(point.lastFedAt)}
              </div>
              <div style={{ fontSize: 12, color: '#9b7e65' }}>上次投喂</div>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, color: '#744210', marginBottom: 8 }}>最近猫咪照片</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              {point.images.slice(0, 3).map((img, i) => (
                <img
                  key={i}
                  src={img}
                  alt={`猫咪照片${i + 1}`}
                  loading="lazy"
                  style={{
                    width: 'calc(33.33% - 6px)',
                    aspectRatio: '1',
                    objectFit: 'cover',
                    borderRadius: 10,
                    border: '2px solid #fed7aa',
                  }}
                />
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, color: '#744210', marginBottom: 8 }}>
              最新反馈 ({feedbacks.length})
            </h3>
            <div style={{ maxHeight: 180, overflowY: 'auto' }}>
              {feedbacks.length === 0 && (
                <p style={{ color: '#b8a08a', fontSize: 13, textAlign: 'center', padding: 12 }}>
                  暂无反馈，成为第一个留言的人吧 🐱
                </p>
              )}
              {feedbacks.map((fb) => {
                const sl = STATUS_LABELS[fb.status];
                return (
                  <div
                    key={fb.id}
                    style={{
                      padding: '10px 0',
                      borderBottom: '1px dashed #fde8d0',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#5a3e2b' }}>
                        {fb.author}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          padding: '1px 8px',
                          borderRadius: 10,
                          color: sl.color,
                          background: sl.bg,
                          fontWeight: 600,
                        }}
                      >
                        {sl.text}
                      </span>
                      <span style={{ fontSize: 11, color: '#b8a08a', marginLeft: 'auto' }}>
                        {formatTimeAgo(fb.createdAt)}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: '#5a3e2b', lineHeight: 1.5 }}>
                      {fb.content}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <h3 style={{ fontSize: 14, color: '#744210', marginBottom: 8 }}>提交新反馈</h3>
            <input
              type="text"
              placeholder="你的称呼（选填）"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 10,
                border: '2px solid #fed7aa',
                fontSize: 13,
                marginBottom: 8,
                outline: 'none',
                background: '#fef9f0',
              }}
            />
            <textarea
              placeholder="描述猫咪的状态..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 10,
                border: '2px solid #fed7aa',
                fontSize: 13,
                marginBottom: 8,
                outline: 'none',
                resize: 'vertical',
                background: '#fef9f0',
                fontFamily: 'inherit',
              }}
            />
            <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
              {(Object.keys(STATUS_LABELS) as CatStatus[]).map((s) => {
                const sl = STATUS_LABELS[s];
                const active = status === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    style={{
                      padding: '4px 12px',
                      borderRadius: 12,
                      border: active ? `2px solid ${sl.color}` : '2px solid #e2d8cc',
                      background: active ? sl.bg : '#fef9f0',
                      color: active ? sl.color : '#9b7e65',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 150ms ease',
                    }}
                  >
                    {sl.text}
                  </button>
                );
              })}
            </div>
            <button
              type="submit"
              disabled={isSubmitting || !content.trim()}
              style={{
                width: '100%',
                padding: '10px 0',
                borderRadius: 12,
                border: 'none',
                background: isSubmitting || !content.trim() ? '#d4c5b5' : '#ed8936',
                color: '#fff',
                fontSize: 14,
                fontWeight: 700,
                cursor: isSubmitting || !content.trim() ? 'not-allowed' : 'pointer',
                transition: 'background 150ms ease',
              }}
            >
              {isSubmitting ? '提交中...' : '🐾 提交反馈'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
