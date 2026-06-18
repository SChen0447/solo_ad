import React, { useState, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

interface ResumeUploaderProps {
  onTextExtracted: (text: string, fileName: string) => void;
}

const ResumeUploader: React.FC<ResumeUploaderProps> = ({ onTextExtracted }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return '仅支持 PDF 格式文件';
    }
    if (file.size > 5 * 1024 * 1024) {
      return '文件大小不能超过 5MB';
    }
    return null;
  };

  const extractPdfText = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf: PDFDocumentProxy = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item: any) => item.str || '')
        .join('\n');
      fullText += pageText + '\n';
    }
    return fullText;
  };

  const processFile = useCallback(async (file: File) => {
    setError('');
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 95) {
          clearInterval(interval);
          return 95;
        }
        return prev + Math.random() * 15 + 5;
      });
    }, 100);

    try {
      const text = await extractPdfText(file);
      clearInterval(interval);
      setUploadProgress(100);
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
        onTextExtracted(text, file.name);
      }, 300);
    } catch (e) {
      clearInterval(interval);
      setIsUploading(false);
      setUploadProgress(0);
      setError('PDF 解析失败，请确保文件未损坏');
      console.error(e);
    }
  }, [onTextExtracted]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  }, [processFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  }, [processFile]);

  const handleClick = useCallback(() => {
    if (!isUploading) {
      fileInputRef.current?.click();
    }
  }, [isUploading]);

  return (
    <div>
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          background: isDragging ? '#eff6ff' : '#ffffff',
          border: `2px dashed ${isDragging ? '#3b82f6' : '#d1d5db'}`,
          borderRadius: 12,
          padding: '48px 24px',
          textAlign: 'center',
          cursor: isUploading ? 'default' : 'pointer',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={e => {
          if (!isDragging && !isUploading) {
            e.currentTarget.style.borderColor = '#9ca3af';
            e.currentTarget.style.background = '#fafafa';
          }
        }}
        onMouseLeave={e => {
          if (!isDragging && !isUploading) {
            e.currentTarget.style.borderColor = '#d1d5db';
            e.currentTarget.style.background = '#ffffff';
          }
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        <div style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 6 }}>
          {isUploading ? '正在处理...' : '点击或拖拽上传 PDF 简历'}
        </div>
        <div style={{ fontSize: 13, color: '#6b7280' }}>
          仅限 .pdf 格式，最大 5MB
        </div>

        {isUploading && (
          <div style={{ marginTop: 20, maxWidth: 320, marginLeft: 'auto', marginRight: 'auto' }}>
            <div style={{
              width: '100%',
              height: 8,
              background: '#e5e7eb',
              borderRadius: 9999,
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                background: 'linear-gradient(90deg, #3b82f6, #1d4ed8)',
                borderRadius: 9999,
                width: `${uploadProgress}%`,
                transition: 'width 0.1s ease',
              }} />
            </div>
            <div style={{ marginTop: 8, fontSize: 13, color: '#6b7280' }}>
              {Math.round(uploadProgress)}%
            </div>
          </div>
        )}
      </div>

      {error && (
        <div style={{
          marginTop: 12,
          padding: '12px 16px',
          background: '#fef2f2',
          borderRadius: 12,
          color: '#dc2626',
          fontSize: 14,
          border: '1px solid #fecaca',
        }}>
          {error}
        </div>
      )}
    </div>
  );
};

export default ResumeUploader;
