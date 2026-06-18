import { useState, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

interface ResumeUploaderProps {
  onParsed: (text: string, fileName: string) => void;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export default function ResumeUploader({ onParsed }: ResumeUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearProgress = () => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  };

  const simulateProgress = useCallback(() => {
    setProgress(0);
    clearProgress();
    progressTimerRef.current = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) {
          return prev;
        }
        const increment = Math.random() * 12 + 3;
        return Math.min(95, prev + increment);
      });
    }, 80);
  }, []);

  const extractTextFromPDF = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pagesText: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item: any) => item.str || '')
        .join(' ');
      pagesText.push(pageText);
    }
    return pagesText.join('\n');
  };

  const handleFile = useCallback(async (file: File) => {
    setError('');

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('仅支持 PDF 格式文件');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('文件大小不能超过 5MB');
      return;
    }

    setIsProcessing(true);
    simulateProgress();

    try {
      const text = await extractTextFromPDF(file);
      if (!text || text.trim().length < 10) {
        setError('未能从 PDF 中提取到有效文本，请确认文件内容');
        setIsProcessing(false);
        setProgress(0);
        clearProgress();
        return;
      }
      setProgress(100);
      clearProgress();
      setTimeout(() => {
        onParsed(text, file.name);
      }, 200);
    } catch (err) {
      console.error('PDF parse error:', err);
      setError('PDF 解析失败，请确认文件未损坏');
      setIsProcessing(false);
      setProgress(0);
      clearProgress();
    }
  }, [onParsed, simulateProgress]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (isProcessing) return;
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleClick = () => {
    if (!isProcessing) fileInputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  return (
    <div style={styles.wrapper}>
      <div
        style={{
          ...styles.dropzone,
          ...(isDragging ? styles.dropzoneActive : {}),
          ...(isProcessing ? styles.dropzoneDisabled : {})
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          style={{ display: 'none' }}
          onChange={handleInputChange}
        />
        <div style={styles.icon}>{isProcessing ? '⏳' : '📄'}</div>
        <div style={styles.title}>
          {isProcessing ? '正在解析简历...' : '拖拽 PDF 简历到此处，或点击上传'}
        </div>
        <div style={styles.hint}>仅支持 PDF 格式，文件大小不超过 5MB</div>

        {isProcessing && (
          <div style={styles.progressWrapper}>
            <div style={styles.progressBar}>
              <div
                style={{
                  ...styles.progressFill,
                  width: `${progress}%`
                }}
              />
            </div>
            <div style={styles.progressText}>{Math.round(progress)}%</div>
          </div>
        )}
      </div>

      {error && (
        <div style={styles.errorBox}>
          <span style={{ marginRight: 6 }}>⚠️</span>
          {error}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    width: '100%'
  },
  dropzone: {
    width: '100%',
    minHeight: 320,
    borderRadius: 12,
    border: '2px dashed #d1d5db',
    background: '#fff',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxSizing: 'border-box'
  },
  dropzoneActive: {
    borderColor: '#3b82f6',
    background: '#eff6ff',
    transform: 'scale(1.01)'
  },
  dropzoneDisabled: {
    cursor: 'not-allowed',
    opacity: 0.8
  },
  icon: {
    fontSize: 64,
    marginBottom: 16
  },
  title: {
    fontSize: 18,
    fontWeight: 600,
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center'
  },
  hint: {
    fontSize: 13,
    color: '#9ca3af'
  },
  progressWrapper: {
    width: '80%',
    maxWidth: 360,
    marginTop: 24,
    display: 'flex',
    alignItems: 'center',
    gap: 12
  },
  progressBar: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    background: '#e5e7eb',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%)',
    borderRadius: 5,
    transition: 'width 0.08s linear'
  },
  progressText: {
    fontSize: 14,
    fontWeight: 600,
    color: '#3b82f6',
    minWidth: 44,
    textAlign: 'right'
  },
  errorBox: {
    marginTop: 16,
    padding: '12px 16px',
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 8,
    color: '#dc2626',
    fontSize: 14
  }
};
