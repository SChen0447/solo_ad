import { useState, useCallback, useRef, useEffect } from 'react';
import ImageViewer from './components/ImageViewer';
import AnnotationPanel from './components/AnnotationPanel';
import type { Annotation, UploadedImage, AnnotationStatus } from './types';

function App() {
  const [currentImage, setCurrentImage] = useState<UploadedImage | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [filterStatus, setFilterStatus] = useState<AnnotationStatus | 'all'>('all');
  const [showReport, setShowReport] = useState(false);
  const [reportContent, setReportContent] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAnnotations = useCallback(async (imageId: string, status: AnnotationStatus | 'all' = 'all') => {
    try {
      const params = new URLSearchParams({ imageId });
      if (status !== 'all') params.append('status', status);
      const res = await fetch(`/api/annotations?${params}`);
      const data = await res.json();
      if (data.success) {
        setAnnotations(data.annotations);
      }
    } catch (err) {
      console.error('获取标注列表失败:', err);
    }
  }, []);

  useEffect(() => {
    if (currentImage) {
      fetchAnnotations(currentImage.id, filterStatus);
    } else {
      setAnnotations([]);
    }
  }, [currentImage, filterStatus, fetchAnnotations]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/image\/(png|jpeg|jpg)/.test(file.type)) {
      alert('只允许上传 PNG 或 JPG 格式的图片');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('图片大小不能超过 5MB');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setCurrentImage(data.image);
        setFilterStatus('all');
      } else {
        alert(data.error || '上传失败');
      }
    } catch (err) {
      console.error('上传失败:', err);
      alert('上传失败，请重试');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleImageClick = async (x: number, y: number) => {
    if (!currentImage) return;
    try {
      const res = await fetch('/api/annotation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageId: currentImage.id,
          x,
          y,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchAnnotations(currentImage.id, filterStatus);
      }
    } catch (err) {
      console.error('添加标注失败:', err);
    }
  };

  const handleUpdateAnnotation = async (
    id: string,
    updates: Partial<Pick<Annotation, 'author' | 'comment' | 'status'>>
  ) => {
    try {
      const res = await fetch(`/api/annotation/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.success && currentImage) {
        await fetchAnnotations(currentImage.id, filterStatus);
      }
    } catch (err) {
      console.error('更新标注失败:', err);
    }
  };

  const handleFilterChange = (status: AnnotationStatus | 'all') => {
    setFilterStatus(status);
  };

  const handleExportReport = async () => {
    if (!currentImage) return;
    try {
      const res = await fetch(`/api/report?imageId=${currentImage.id}`);
      const data = await res.json();
      if (data.success) {
        setReportContent(data.report);
        setShowReport(true);
      } else {
        alert(data.error || '导出报告失败');
      }
    } catch (err) {
      console.error('导出报告失败:', err);
      alert('导出报告失败，请重试');
    }
  };

  const handleCopyReport = async () => {
    try {
      await navigator.clipboard.writeText(reportContent);
      alert('报告已复制到剪贴板');
    } catch (err) {
      console.error('复制失败:', err);
      alert('复制失败，请手动复制');
    }
  };

  return (
    <div style={styles.appContainer}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.appTitle}>设计稿标注平台</h1>
          <div style={{ position: 'relative' }}>
            <button
              onClick={handleUploadClick}
              disabled={uploading}
              style={{
                ...styles.uploadBtn,
                ...(uploading ? { opacity: 0.6, cursor: 'not-allowed' } : {}),
              }}
            >
              {uploading ? '上传中...' : '上传设计稿'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </div>
        </div>
      </header>

      <div style={styles.mainContent}>
        <ImageViewer
          image={currentImage}
          annotations={annotations}
          onImageClick={handleImageClick}
        />
        <AnnotationPanel
          annotations={annotations}
          filterStatus={filterStatus}
          onFilterChange={handleFilterChange}
          onUpdateAnnotation={handleUpdateAnnotation}
          onExportReport={handleExportReport}
          hasImage={!!currentImage}
        />
      </div>

      {showReport && (
        <div style={styles.modalOverlay} onClick={() => setShowReport(false)}>
          <div
            style={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>标注汇总报告</h3>
              <button
                onClick={() => setShowReport(false)}
                style={styles.modalCloseBtn}
              >
                ✕
              </button>
            </div>
            <pre style={styles.reportText}>{reportContent}</pre>
            <div style={styles.modalFooter}>
              <button onClick={handleCopyReport} style={styles.copyBtn}>
                复制内容
              </button>
              <button
                onClick={() => setShowReport(false)}
                style={styles.closeBtn}
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  appContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    backgroundColor: '#1e3a5f',
    height: '56px',
    display: 'flex',
    alignItems: 'center',
    padding: '0 24px',
    flexShrink: 0,
  },
  headerContent: {
    width: '100%',
    maxWidth: '1600px',
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  appTitle: {
    color: '#ffffff',
    fontSize: '24px',
    fontWeight: 700,
  },
  uploadBtn: {
    backgroundColor: '#ffffff',
    color: '#3b82f6',
    padding: '8px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'all 0.2s ease-out',
  },
  mainContent: {
    flex: 1,
    display: 'flex',
    maxWidth: '1600px',
    width: '100%',
    margin: '0 auto',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '24px',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.16)',
    width: '100%',
    maxWidth: '700px',
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px',
    borderBottom: '1px solid #e5e7eb',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1f2937',
  },
  modalCloseBtn: {
    width: '32px',
    height: '32px',
    borderRadius: '6px',
    backgroundColor: 'transparent',
    color: '#6b7280',
    fontSize: '16px',
    transition: 'background-color 0.2s',
  },
  reportText: {
    padding: '20px 24px',
    overflowY: 'auto',
    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
    fontSize: '13px',
    lineHeight: 1.8,
    color: '#374151',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
    flex: 1,
    margin: 0,
  },
  modalFooter: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    padding: '16px 24px',
    borderTop: '1px solid #e5e7eb',
  },
  copyBtn: {
    backgroundColor: '#8b5cf6',
    color: '#ffffff',
    padding: '8px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'background-color 0.2s',
  },
  closeBtn: {
    backgroundColor: '#e5e7eb',
    color: '#374151',
    padding: '8px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'background-color 0.2s',
  },
};

export default App;
