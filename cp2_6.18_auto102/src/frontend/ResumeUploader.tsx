import React, { useState, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

interface ResumeUploaderProps {
  onTextExtracted: (text: string, fileName: string) => void;
  isLoading: boolean;
}

const ResumeUploader: React.FC<ResumeUploaderProps> = ({ onTextExtracted, isLoading }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const extractTextFromPDF = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join('\n');
      fullText += pageText + '\n\n';
    }

    return fullText;
  };

  const handleFile = useCallback(async (file: File) => {
    setError(null);

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('请上传PDF格式的文件');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('文件大小不能超过5MB');
      return;
    }

    setUploading(true);
    setProgress(0);

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) {
          clearInterval(progressInterval);
          return 95;
        }
        return prev + 5;
      });
    }, 50);

    try {
      const text = await extractTextFromPDF(file);
      setProgress(100);
      clearInterval(progressInterval);

      setTimeout(() => {
        setUploading(false);
        onTextExtracted(text, file.name);
      }, 200);
    } catch (err) {
      clearInterval(progressInterval);
      setUploading(false);
      setError('PDF解析失败，请检查文件是否损坏');
      setProgress(0);
    }
  }, [onTextExtracted]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

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
    e.target.value = '';
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
          {uploading ? '正在处理...' : isLoading ? '正在解析...' : '拖拽PDF到此处，或点击选择文件'}
        </p>
        <p style={styles.subtitle}>仅支持 .pdf 格式，最大 5MB</p>

        {(uploading || isLoading) && (
          <div style={styles.progressContainer}>
            <div style={styles.progressBar}>
              <div style={{
                ...styles.progressFill,
                width: `${isLoading ? 100 : progress}%`,
              }} />
            </div>
            <span style={styles.progressText}>
              {isLoading ? '解析中...' : `${isLoading ? 100 : progress}%`}
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
    minWidth: 60,
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
