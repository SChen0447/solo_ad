import { useState, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

interface ResumeUploaderProps {
  onTextExtracted: (text: string, fileName: string) => void;
  isParsing: boolean;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export default function ResumeUploader({ onTextExtracted, isParsing }: ResumeUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
      return '请上传PDF格式的文件';
    }
    if (file.size > MAX_FILE_SIZE) {
      return '文件大小不能超过5MB';
    }
    return null;
  };

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

  const simulateProgress = useCallback(() => {
    setProgress(0);
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += Math.random() * 15 + 5;
      if (currentProgress >= 100) {
        currentProgress = 100;
        clearInterval(interval);
      }
      setProgress(Math.min(currentProgress, 100));
    }, 100);
    return interval;
  }, []);

  const handleFile = async (file: File) => {
    setError('');
    
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setUploading(true);
    const progressInterval = simulateProgress();

    try {
      const text = await extractTextFromPDF(file);
      
      const checkProgress = setInterval(() => {
        if (progress >= 100) {
          clearInterval(checkProgress);
          onTextExtracted(text, file.name);
          setUploading(false);
        }
      }, 50);
      
      setTimeout(() => {
        clearInterval(checkProgress);
        setProgress(100);
        onTextExtracted(text, file.name);
        setUploading(false);
      }, 800);
      
    } catch (err) {
      setError('PDF解析失败，请确保文件格式正确');
      setUploading(false);
      clearInterval(progressInterval);
    }
  };

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
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="uploader-container">
      <h3 className="section-title">📄 上传简历</h3>
      
      <div 
        className={`upload-area ${isDragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileInput}
          style={{ display: 'none' }}
        />
        
        <div className="upload-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        
        <p className="upload-text">
          拖拽PDF文件到这里，或<span className="upload-link">点击选择</span>
        </p>
        <p className="upload-hint">仅限 .pdf 格式，最大 5MB</p>
      </div>

      {error && (
        <div className="error-message">{error}</div>
      )}

      {(uploading || isParsing) && (
        <div className="progress-container">
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="progress-text">
            {isParsing ? '解析中...' : '上传中...'} {Math.round(progress)}%
          </span>
        </div>
      )}
    </div>
  );
}
