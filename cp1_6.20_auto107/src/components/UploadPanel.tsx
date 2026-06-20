import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { uploadDoc } from '../api/translationApi';
import type { UploadResponse } from '../types';

type FileFormat = 'markdown' | 'pdf' | 'txt';

const formatConfig: Record<FileFormat, { label: string; accept: string; extensions: string[] }> = {
  markdown: {
    label: 'Markdown',
    accept: '.md,.markdown',
    extensions: ['.md', '.markdown'],
  },
  pdf: {
    label: 'PDF',
    accept: '.pdf',
    extensions: ['.pdf'],
  },
  txt: {
    label: 'TXT',
    accept: '.txt',
    extensions: ['.txt'],
  },
};

export const UploadPanel: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [format, setFormat] = useState<FileFormat>('markdown');
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const validateFile = useCallback((file: File, selectedFormat: FileFormat): string | null => {
    const config = formatConfig[selectedFormat];
    const fileName = file.name.toLowerCase();
    const isValidExtension = config.extensions.some(ext => fileName.endsWith(ext));

    if (!isValidExtension) {
      return `请选择 ${config.label} 格式的文件 (${config.extensions.join(', ')})`;
    }

    if (file.size === 0) {
      return '文件不能为空';
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return '文件大小不能超过 10MB';
    }

    return null;
  }, []);

  const handleFileSelect = useCallback((file: File) => {
    setError(null);
    const validationError = validateFile(file, format);
    if (validationError) {
      setError(validationError);
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
  }, [format, validateFile]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
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
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleZoneClick = useCallback(() => {
    if (!isLoading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [isLoading]);

  const handleFormatChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newFormat = e.target.value as FileFormat;
    setFormat(newFormat);
    setError(null);
    if (selectedFile) {
      const validationError = validateFile(selectedFile, newFormat);
      if (validationError) {
        setError(validationError);
      }
    }
  }, [selectedFile, validateFile]);

  const simulateProgress = useCallback(() => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress > 90) {
        progress = 90;
        clearInterval(interval);
      }
      setUploadProgress(progress);
    }, 200);
    return interval;
  }, []);

  const handleUpload = useCallback(async () => {
    if (!selectedFile) {
      setError('请先选择文件');
      return;
    }

    const validationError = validateFile(selectedFile, format);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setError(null);
    setUploadProgress(0);

    const progressInterval = simulateProgress();

    try {
      const response: UploadResponse = await uploadDoc(selectedFile, format);
      setUploadProgress(100);

      setTimeout(() => {
        navigate(`/translate/${response.doc_id}`);
      }, 500);
    } catch (err) {
      console.error('上传失败:', err);
      setError(err instanceof Error ? err.message : '上传失败，请稍后重试');
      setUploadProgress(0);
    } finally {
      clearInterval(progressInterval);
      setIsLoading(false);
    }
  }, [selectedFile, format, validateFile, simulateProgress, navigate]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="card"
    >
      <div className="page-header">
        <h2 className="page-title">文档上传</h2>
      </div>

      <div className="form-group">
        <label className="form-label">文件格式</label>
        <select
          className="form-select"
          value={format}
          onChange={handleFormatChange}
          disabled={isLoading}
        >
          {Object.entries(formatConfig).map(([key, config]) => (
            <option key={key} value={key}>
              {config.label} ({config.extensions.join(', ')})
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">选择文件</label>
        <motion.div
          className={`upload-zone ${isDragging ? 'dragging' : ''}`}
          onClick={handleZoneClick}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          animate={isDragging ? { scale: 1.02, borderColor: '#4361ee' } : {}}
          transition={{ duration: 0.2 }}
          style={{ cursor: isLoading ? 'not-allowed' : 'pointer' }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={formatConfig[format].accept}
            onChange={handleInputChange}
            style={{ display: 'none' }}
            disabled={isLoading}
          />

          <AnimatePresence mode="wait">
            {selectedFile ? (
              <motion.div
                key="file-info"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
              >
                <div className="upload-icon">📄</div>
                <p className="upload-text" style={{ wordBreak: 'break-all', padding: '0 20px' }}>
                  {selectedFile.name}
                </p>
                <p className="upload-hint">
                  {formatFileSize(selectedFile.size)}
                </p>
                {!isLoading && (
                  <motion.button
                    type="button"
                    className="btn btn-secondary"
                    style={{ marginTop: 16 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                      setError(null);
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    重新选择
                  </motion.button>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="upload-prompt"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
              >
                <motion.div
                  className="upload-icon"
                  animate={isDragging ? { y: -10 } : { y: 0 }}
                  transition={{ duration: 0.3, repeat: isDragging ? Infinity : 0, repeatType: 'reverse' }}
                >
                  📁
                </motion.div>
                <p className="upload-text">
                  {isDragging ? '释放文件以上传' : '拖拽文件到此处，或点击选择文件'}
                </p>
                <p className="upload-hint">
                  支持 {formatConfig[format].extensions.join(', ')} 格式，最大 10MB
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="form-group"
          >
            <div className="progress-bar">
              <motion.div
                className="progress-fill"
                initial={{ width: 0 }}
                animate={{ width: `${uploadProgress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <p className="upload-hint" style={{ marginTop: 8, textAlign: 'center' }}>
              上传中... {Math.round(uploadProgress)}%
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="form-group"
            style={{
              padding: '12px 16px',
              backgroundColor: '#f8d7da',
              color: '#721c24',
              borderRadius: 8,
              border: '1px solid #f5c6cb',
            }}
          >
            ⚠️ {error}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        className="btn btn-primary"
        style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
        onClick={handleUpload}
        disabled={!selectedFile || isLoading || !!error}
        whileHover={{ scale: !selectedFile || isLoading || error ? 1 : 1.02 }}
        whileTap={{ scale: !selectedFile || isLoading || error ? 1 : 0.98 }}
      >
        {isLoading ? (
          <>
            <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }}></span>
            上传中...
          </>
        ) : (
          <>
            <span>🚀</span>
            开始上传
          </>
        )}
      </motion.button>

      <style>{`
        @media (max-width: 768px) {
          .upload-zone {
            height: 300px;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
        }
      `}</style>
    </motion.div>
  );
};
