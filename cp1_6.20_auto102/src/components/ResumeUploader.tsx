import React, { useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { uploadResume } from '../utils/api';

interface ResumeUploaderProps {
  onUploadComplete: (fileId: string) => void;
}

const ResumeUploader: React.FC<ResumeUploaderProps> = ({ onUploadComplete }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');

  const MAX_SIZE = 10 * 1024 * 1024;
  const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/bmp'];

  const validateFile = (file: File): boolean => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('不支持的文件格式，请上传PDF或图片文件');
      return false;
    }
    if (file.size > MAX_SIZE) {
      setError('文件大小超过10MB限制');
      return false;
    }
    return true;
  };

  const handleFile = useCallback(async (file: File) => {
    setError('');
    if (!validateFile(file)) return;

    setFileName(file.name);
    setIsUploading(true);
    setProgress(0);

    try {
      const result = await uploadResume(file, (percent) => {
        setProgress(percent);
      });
      onUploadComplete(result.file_id);
    } catch (err: any) {
      setError(err.response?.data?.error || '上传失败，请重试');
      setIsUploading(false);
      setProgress(0);
    }
  }, [onUploadComplete]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleClick = () => {
    if (!isUploading) {
      inputRef.current?.click();
    }
  };

  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="uploader-container">
      <motion.div
        className={`uploader-zone ${isDragging ? 'dragging' : ''}`}
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        whileHover={!isUploading ? { scale: 1.01, borderColor: '#3498db' } : {}}
        animate={isDragging ? { backgroundColor: '#e8f4fd' } : { backgroundColor: '#ffffff' }}
        transition={{ duration: 0.2 }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.gif,.bmp"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />

        <AnimatePresence mode="wait">
          {isUploading ? (
            <motion.div
              key="uploading"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              className="progress-wrapper"
            >
              <svg className="progress-svg" width="120" height="120" viewBox="0 0 120 120">
                <defs>
                  <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3498db" />
                    <stop offset="100%" stopColor="#2ecc71" />
                  </linearGradient>
                </defs>
                <motion.g animate={{ rotate: 360 }} transition={{ duration: 0.5, repeat: Infinity, ease: 'linear' }} style={{ transformOrigin: '60px 60px' }}>
                  <circle
                    cx="60"
                    cy="60"
                    r="45"
                    fill="none"
                    stroke="#ecf0f1"
                    strokeWidth="8"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r="45"
                    fill="none"
                    stroke="url(#progressGradient)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    transform="rotate(-90 60 60)"
                  />
                </motion.g>
              </svg>
              <div className="progress-text">{progress}%</div>
              <div className="file-name">{fileName}</div>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="uploader-content"
            >
              <div className="uploader-icon">📄</div>
              <p className="uploader-title">点击或拖拽文件到此处上传</p>
              <p className="uploader-subtitle">支持 PDF / PNG / JPG 格式，最大 10MB</p>
              <motion.button
                className="upload-btn"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleClick();
                }}
              >
                选择文件
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="error-msg"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ResumeUploader;
