import React, { useState, useRef, useCallback } from 'react';
import { ParsedResume } from '../types';
import { uploadResume } from '../api';

interface ResumeUploaderProps {
  onParseComplete: (resume: ParsedResume) => void;
}

const ResumeUploader: React.FC<ResumeUploaderProps> = ({ onParseComplete }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [resumeText, setResumeText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        setError('请上传PDF格式的文件');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('文件大小不能超过5MB');
        return;
      }
      handleFileUpload(file);
    }
  }, []);

  const handleFileUpload = async (file: File) => {
    setError(null);
    setIsUploading(true);
    setUploadProgress(0);
    setFileName(file.name);
    setResumeText('');

    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 100);

    try {
      const result = await uploadResume(file);
      setUploadProgress(100);
      setTimeout(() => {
        setIsUploading(false);
        onParseComplete(result);
      }, 300);
    } catch (err: any) {
      setError(err.message || '上传失败');
      setIsUploading(false);
      setUploadProgress(0);
    } finally {
      clearInterval(progressInterval);
    }
  };

  const handleTextSubmit = async () => {
    if (!resumeText.trim()) {
      setError('请粘贴简历文本内容');
      return;
    }

    setError(null);
    setIsUploading(true);
    setUploadProgress(0);
    setFileName(null);

    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 15;
      });
    }, 80);

    try {
      const result = await uploadResume(undefined, resumeText);
      setUploadProgress(100);
      setTimeout(() => {
        setIsUploading(false);
        onParseComplete(result);
      }, 300);
    } catch (err: any) {
      setError(err.message || '解析失败');
      setIsUploading(false);
      setUploadProgress(0);
    } finally {
      clearInterval(progressInterval);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        setError('请上传PDF格式的文件');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('文件大小不能超过5MB');
        return;
      }
      handleFileUpload(file);
    }
  };

  const handleClick = () => {
    if (!isUploading) {
      fileInputRef.current?.click();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (const item of items) {
      if (item.kind === 'file') {
        e.preventDefault();
        const file = item.getAsFile();
        if (file && file.name.toLowerCase().endsWith('.pdf')) {
          handleFileUpload(file);
        }
        break;
      }
    }
  };

  return (
    <div className="upload-container">
      <div
        className={`drop-zone ${isDragging ? 'dragging' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
        onPaste={handlePaste}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
        />

        {isUploading ? (
          <div className="uploading-content">
            <div className="progress-ring">
              <svg width="80" height="80" viewBox="0 0 80 80">
                <circle
                  cx="40"
                  cy="40"
                  r="36"
                  fill="none"
                  stroke="#E8F0FE"
                  strokeWidth="4"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="36"
                  fill="none"
                  stroke="#1E3A5F"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={`${uploadProgress * 2.26} 226`}
                  strokeDashoffset="56.5"
                  transform="rotate(-90 40 40)"
                  style={{ transition: 'stroke-dasharray 0.2s ease' }}
                />
              </svg>
              <span className="progress-text">{uploadProgress}%</span>
            </div>
            <p className="uploading-text">
              {fileName ? `正在解析 ${fileName}...` : '正在解析简历...'}
            </p>
          </div>
        ) : (
          <div className="drop-content">
            <div className="upload-icon">
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                <path
                  d="M32 40V16M32 16L22 26M32 16L42 26"
                  stroke="#1E3A5F"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M12 40V48C12 51.3137 14.6863 54 18 54H46C49.3137 54 52 51.3137 52 48V40"
                  stroke="#1E3A5F"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <h3 className="drop-title">拖拽PDF文件到此处</h3>
            <p className="drop-subtitle">或点击选择文件（不超过5MB）</p>
            <p className="drop-hint">支持PDF格式文件</p>
          </div>
        )}
      </div>

      <div className="text-input-section">
        <div className="divider">
          <span>或</span>
        </div>

        <div className="textarea-wrapper">
          <textarea
            ref={textareaRef}
            className="resume-textarea"
            placeholder="在此粘贴简历文本内容..."
            value={resumeText}
            onChange={(e) => {
              setResumeText(e.target.value);
              setError(null);
            }}
            disabled={isUploading}
            rows={8}
          />
          <button
            className={`submit-btn ${resumeText.trim() ? 'active' : ''}`}
            onClick={handleTextSubmit}
            disabled={isUploading || !resumeText.trim()}
          >
            解析文本
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message" style={{ animation: 'fadeIn 0.3s ease' }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0-1a6 6 0 1 0 0-12 6 6 0 0 0 0 12zm-1-5h2v2H7v-2zm0-4h2v3H7V5z"
              fill="#FF6B35"
            />
          </svg>
          {error}
        </div>
      )}

      <style>{`
        .upload-container {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .drop-zone {
          border: 2px dashed rgba(30, 58, 95, 0.3);
          border-radius: 16px;
          padding: 48px 24px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s ease;
          background: #fff;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          min-height: 240px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .drop-zone:hover {
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
          transform: translateY(-4px);
          border-color: rgba(30, 58, 95, 0.5);
        }

        .drop-zone.dragging {
          border-color: #1E3A5F;
          background: linear-gradient(135deg, #F5F7FA 0%, #E8F0FE 100%);
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0%, 100% {
            border-color: rgba(30, 58, 95, 0.5);
          }
          50% {
            border-color: #1E3A5F;
          }
        }

        .drop-content {
          animation: fadeIn 0.4s ease;
        }

        .upload-icon {
          margin-bottom: 16px;
          opacity: 0.8;
        }

        .drop-title {
          font-size: 18px;
          font-weight: 600;
          color: #1E3A5F;
          margin: 0 0 8px 0;
        }

        .drop-subtitle {
          font-size: 14px;
          color: #4A5568;
          margin: 0 0 8px 0;
        }

        .drop-hint {
          font-size: 12px;
          color: #718096;
          margin: 0;
        }

        .uploading-content {
          animation: fadeIn 0.3s ease;
        }

        .progress-ring {
          position: relative;
          display: inline-block;
          margin-bottom: 16px;
        }

        .progress-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 16px;
          font-weight: 600;
          color: #1E3A5F;
        }

        .uploading-text {
          font-size: 14px;
          color: #4A5568;
          margin: 0;
        }

        .text-input-section {
          animation: fadeIn 0.4s ease 0.1s both;
        }

        .divider {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 20px;
        }

        .divider::before,
        .divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #E2E8F0;
        }

        .divider span {
          font-size: 13px;
          color: #718096;
          font-weight: 500;
        }

        .textarea-wrapper {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .resume-textarea {
          width: 100%;
          padding: 16px;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          font-size: 14px;
          font-family: inherit;
          resize: vertical;
          transition: all 0.2s ease;
          background: #fff;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }

        .resume-textarea:focus {
          outline: none;
          border-color: #1E3A5F;
          box-shadow: 0 0 0 3px rgba(30, 58, 95, 0.1);
        }

        .resume-textarea:hover {
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
          transform: translateY(-2px);
        }

        .resume-textarea:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .submit-btn {
          padding: 14px 32px;
          border: none;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          background: #CBD5E0;
          color: #718096;
          align-self: flex-start;
        }

        .submit-btn.active {
          background: #FF6B35;
          color: #fff;
          box-shadow: 0 4px 12px rgba(255, 107, 53, 0.3);
        }

        .submit-btn.active:hover {
          background: #E85A2C;
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(255, 107, 53, 0.4);
        }

        .submit-btn:disabled {
          cursor: not-allowed;
          transform: none;
        }

        .error-message {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: #FFF5F0;
          border: 1px solid #FFD4C4;
          border-radius: 10px;
          color: #FF6B35;
          font-size: 14px;
          font-weight: 500;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default ResumeUploader;
