import React, { useState, useRef, useCallback } from 'react';

interface ResumeUploaderProps {
  onParseComplete: (parsedResume: any, fileName: string) => void;
  isLoading: boolean;
}

const ResumeUploader: React.FC<ResumeUploaderProps> = ({ onParseComplete, isLoading }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showProgress, setShowProgress] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const resetState = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    setProgress(0);
    setUploading(false);
    setShowProgress(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const uploadFileToBackend = useCallback(async (file: File): Promise<any> => {
    const formData = new FormData();
    formData.append('resume', file);

    const response = await fetch('/api/parse', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || '解析失败');
    }
    return result;
  }, []);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    resetState();

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('请上传PDF格式的文件');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('文件大小不能超过5MB');
      return;
    }

    setUploading(true);
    setShowProgress(true);
    setProgress(0);

    progressIntervalRef.current = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          return 90;
        }
        return prev + 5;
      });
    }, 50);

    try {
      const result = await uploadFileToBackend(file);

      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      setProgress(100);

      setTimeout(() => {
        resetState();
        onParseComplete(result.data, result.fileName || file.name);
      }, 400);
    } catch (err: any) {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      setUploading(false);
      setShowProgress(false);
      setProgress(0);
      setError(err.message || '上传失败，请稍后重试');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [onParseComplete, resetState, uploadFileToBackend]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && !uploading && !isLoading) handleFile(file);
  }, [handleFile, uploading, isLoading]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleClick = () => {
    if (!uploading && !isLoading) {
      fileInputRef.current?.click();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div style={styles.container}>
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        style={{
          ...styles.dropZone,
          ...(isDragging ? styles.dropZoneActive : {}),
          ...((uploading || isLoading) ? styles.dropZoneDisabled : {}),
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleInputChange}
          style={styles.hiddenInput}
        />
        <div style={styles.iconWrapper}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
        </div>
        <p style={styles.title}>
          {uploading ? '正在上传...' : isLoading ? '正在解析...' : '拖拽PDF到此处，或点击选择文件'}
        </p>
        <p style={styles.subtitle}>仅支持 .pdf 格式，最大 5MB</p>

        {showProgress && (
          <div style={styles.progressContainer}>
            <div style={styles.progressBar}>
              <div style={{
                ...styles.progressFill,
                width: `${progress}%`,
              }} />
            </div>
            <span style={styles.progressText}>
              {progress >= 100 ? '完成' : `${progress}%`}
            </span>
          </div>
        )}
      </div>

      {error && (
        <div style={styles.errorBox}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}>
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
  },
  dropZone: {
    border: '2px dashed #d1d5db',
    borderRadius: 12,
    padding: '48px 24px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    backgroundColor: '#ffffff',
  },
  dropZoneActive: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  dropZoneDisabled: {
    cursor: 'not-allowed',
    opacity: 0.7,
  },
  hiddenInput: {
    display: 'none',
  },
  iconWrapper: {
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: 600,
    color: '#374151',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#9ca3af',
  },
  progressContainer: {
    marginTop: 20,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #3b82f6, #1d4ed8)',
    borderRadius: 4,
    transition: 'width 0.1s linear',
  },
  progressText: {
    fontSize: 13,
    fontWeight: 600,
    color: '#3b82f6',
    minWidth: 50,
  },
  errorBox: {
    marginTop: 12,
    padding: '10px 14px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 8,
    color: '#ef4444',
    fontSize: 13,
    display: 'flex',
    alignItems: 'center',
  },
};

export default ResumeUploader;
