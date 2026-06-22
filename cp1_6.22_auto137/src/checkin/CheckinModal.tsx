import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

interface CheckinModalProps {
  routeId: string;
  poi: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CheckinModal({ routeId, poi, onClose, onSuccess }: CheckinModalProps) {
  const [comment, setComment] = useState('');
  const [photoName, setPhotoName] = useState<string | null>(null);
  const [checkinTime, setCheckinTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const now = new Date();
    setCheckinTime(
      now.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    );
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoName(file.name);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await axios.post('/api/checkins', {
        routeId,
        poiId: poi.id,
        comment,
        photoName,
        timestamp: new Date().toISOString(),
        lat: poi.lat,
        lng: poi.lng,
      });
      onSuccess();
    } catch (err) {
      console.error('Failed to check in:', err);
      setIsSubmitting(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div style={styles.backdrop} onClick={handleBackdropClick}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>📍 打卡记录</h2>
          <button style={styles.closeBtn} onClick={onClose}>
            ×
          </button>
        </div>

        <div style={styles.poiInfo}>
          <h3 style={styles.poiName}>{poi.name}</h3>
          <p style={styles.poiType}>
            {poi.type === 'viewpoint' && '🏔️ 观景台'}
            {poi.type === 'farmstay' && '🏡 农家乐'}
            {poi.type === 'gasstation' && '⛽ 加油站'}
            {poi.type === 'photospot' && '📸 网红拍照点'}
          </p>
        </div>

        <div style={styles.section}>
          <label style={styles.label}>照片</label>
          <div style={styles.uploadArea} onClick={() => fileInputRef.current?.click()}>
            {photoName ? (
              <div style={styles.photoPreview}>
                <span style={styles.photoIcon}>🖼️</span>
                <span style={styles.photoName}>{photoName}</span>
              </div>
            ) : (
              <div style={styles.uploadPlaceholder}>
                <span style={styles.uploadIcon}>📷</span>
                <span style={styles.uploadText}>点击上传照片</span>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={styles.fileInput}
              onChange={handleFileChange}
            />
          </div>
        </div>

        <div style={styles.section}>
          <label style={styles.label}>
            感想 <span style={styles.charCount}>{comment.length}/100</span>
          </label>
          <textarea
            style={styles.textarea}
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, 100))}
            placeholder="写下此刻的感受..."
            maxLength={100}
            rows={3}
          />
        </div>

        <div style={styles.section}>
          <label style={styles.label}>打卡时间</label>
          <div style={styles.timeDisplay}>
            <span style={styles.timeIcon}>🕐</span>
            <span style={styles.timeText}>{checkinTime}</span>
          </div>
        </div>

        <div style={styles.actions}>
          <button style={styles.cancelBtn} onClick={onClose}>
            取消
          </button>
          <button style={styles.submitBtn} onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? '提交中...' : '确认打卡'}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(4px)',
  },
  modal: {
    width: '420px',
    background: '#0f172a',
    borderRadius: '16px',
    padding: '28px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    animation: 'fadeIn 0.3s ease-out',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  title: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#e2e8f0',
  },
  closeBtn: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'transparent',
    border: 'none',
    color: '#94a3b8',
    fontSize: '24px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 500ms ease-out',
  },
  poiInfo: {
    marginBottom: '24px',
    padding: '16px',
    background: 'rgba(56, 189, 248, 0.1)',
    borderRadius: '12px',
    border: '1px solid rgba(56, 189, 248, 0.2)',
  },
  poiName: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#e2e8f0',
    marginBottom: '4px',
  },
  poiType: {
    fontSize: '13px',
    color: '#38bdf8',
  },
  section: {
    marginBottom: '20px',
  },
  label: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '14px',
    fontWeight: 500,
    color: '#94a3b8',
    marginBottom: '8px',
  },
  charCount: {
    fontSize: '12px',
    color: '#64748b',
  },
  uploadArea: {
    padding: '24px',
    border: '2px dashed #0f3460',
    borderRadius: '12px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 500ms ease-out',
    background: 'rgba(15, 52, 96, 0.3)',
  },
  fileInput: {
    display: 'none',
  },
  uploadPlaceholder: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  uploadIcon: {
    fontSize: '32px',
  },
  uploadText: {
    fontSize: '13px',
    color: '#64748b',
  },
  photoPreview: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  photoIcon: {
    fontSize: '32px',
  },
  photoName: {
    fontSize: '13px',
    color: '#e2e8f0',
  },
  textarea: {
    width: '100%',
    padding: '12px 14px',
    background: '#16213e',
    border: '1px solid #0f3460',
    borderRadius: '10px',
    color: '#e2e8f0',
    fontSize: '14px',
    fontFamily: "'Inter', sans-serif",
    resize: 'none',
    outline: 'none',
    transition: 'border-color 500ms ease-out',
    lineHeight: 1.5,
  },
  timeDisplay: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 14px',
    background: '#16213e',
    borderRadius: '10px',
  },
  timeIcon: {
    fontSize: '18px',
  },
  timeText: {
    fontSize: '14px',
    color: '#e2e8f0',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    marginTop: '28px',
  },
  cancelBtn: {
    flex: 1,
    padding: '12px',
    background: 'transparent',
    color: '#94a3b8',
    border: '1px solid #0f3460',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 500ms ease-out',
  },
  submitBtn: {
    flex: 2,
    padding: '12px',
    background: '#10b981',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'filter 500ms ease-out',
  },
};
