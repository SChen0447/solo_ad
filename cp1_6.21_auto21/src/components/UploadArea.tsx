import React, { useState, useRef, useCallback } from 'react';

interface UploadAreaProps {
  onUpload: (imageData: string, name: string) => void;
}

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

const UploadArea: React.FC<UploadAreaProps> = ({ onUpload }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('请上传PNG、JPG或WebP格式的图片');
      return false;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError('图片大小不能超过50MB');
      return false;
    }
    return true;
  };

  const processFile = useCallback(async (file: File) => {
    if (!validateFile(file)) return;

    setError(null);
    setUploadProgress(0);

    const reader = new FileReader();

    reader.onprogress = (event) => {
      if (event.lengthComputable) {
        const progress = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(progress);
      }
    };

    reader.onload = (e) => {
      const result = e.target?.result as string;
      setUploadProgress(100);
      
      setTimeout(() => {
        onUpload(result, file.name);
      }, 300);
    };

    reader.onerror = () => {
      setError('文件读取失败，请重试');
      setUploadProgress(null);
    };

    reader.readAsDataURL(file);
  }, [onUpload]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          processFile(file);
        }
        break;
      }
    }
  }, [processFile]);

  React.useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  return (
    <div style={styles.container}>
      <div
        style={{
          ...styles.uploadBox,
          ...(isDragging ? styles.uploadBoxActive : {}),
          ...(error ? styles.uploadBoxError : {}),
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          onChange={handleFileChange}
          style={styles.hiddenInput}
        />

        <div style={styles.iconContainer}>
          <svg
            width="80"
            height="80"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            style={styles.uploadIcon}
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>

        <h2 style={styles.title}>上传截图</h2>
        <p style={styles.subtitle}>
          拖拽图片到此处，或<span style={styles.highlight}>点击选择</span>，也可直接<span style={styles.highlight}>Ctrl+V粘贴</span>
        </p>
        <p style={styles.formats}>支持 PNG、JPG、WebP 格式，最大 50MB</p>

        {uploadProgress !== null && (
          <div style={styles.progressContainer}>
            <div style={styles.progressBar}>
              <div style={{ ...styles.progressFill, width: `${uploadProgress}%` }} />
            </div>
            <span style={styles.progressText}>{uploadProgress}%</span>
          </div>
        )}

        {error && (
          <div style={styles.errorContainer}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}
      </div>

      <div style={styles.tips}>
        <h3 style={styles.tipsTitle}>使用提示</h3>
        <ul style={styles.tipsList}>
          <li>上传后进入批注编辑模式</li>
          <li>使用工具栏添加箭头、矩形、文字和自由画笔</li>
          <li>所有批注自动保存并实时同步给协作者</li>
          <li>点击回放按钮可查看批注过程</li>
        </ul>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: 40,
    gap: 40,
  },
  uploadBox: {
    width: '100%',
    maxWidth: 600,
    padding: '60px 40px',
    border: '3px dashed var(--border-color)',
    borderRadius: 'var(--border-radius-lg)',
    backgroundColor: 'var(--card-background)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    cursor: 'pointer',
    transition: 'var(--transition)',
    textAlign: 'center',
  },
  uploadBoxActive: {
    borderColor: 'var(--primary-color)',
    borderStyle: 'solid',
    backgroundColor: 'rgba(108, 99, 255, 0.1)',
    transform: 'scale(1.02)',
  },
  uploadBoxError: {
    borderColor: 'var(--danger)',
  },
  hiddenInput: {
    display: 'none',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: '50%',
    background: 'var(--primary-gradient)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.9,
  },
  uploadIcon: {
    color: 'white',
  },
  title: {
    fontSize: 24,
    fontWeight: 600,
    color: 'var(--text-primary)',
    margin: 0,
  },
  subtitle: {
    fontSize: 16,
    color: 'var(--text-secondary)',
    margin: 0,
  },
  highlight: {
    color: 'var(--primary-color)',
    fontWeight: 600,
  },
  formats: {
    fontSize: 13,
    color: 'var(--text-secondary)',
    opacity: 0.7,
    margin: 0,
  },
  progressContainer: {
    width: '100%',
    maxWidth: 300,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: 'var(--border-color)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'var(--primary-gradient)',
    borderRadius: 3,
    transition: 'width 0.3s ease',
  },
  progressText: {
    fontSize: 14,
    color: 'var(--text-secondary)',
    minWidth: 40,
    textAlign: 'right',
  },
  errorContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 16px',
    backgroundColor: 'rgba(245, 101, 101, 0.1)',
    borderRadius: 'var(--border-radius)',
    color: 'var(--danger)',
    fontSize: 14,
  },
  tips: {
    width: '100%',
    maxWidth: 600,
    padding: '24px 32px',
    backgroundColor: 'var(--card-background)',
    borderRadius: 'var(--border-radius-lg)',
    boxShadow: 'var(--shadow-md)',
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: 'var(--text-primary)',
    margin: '0 0 16px 0',
  },
  tipsList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
};

export default UploadArea;
