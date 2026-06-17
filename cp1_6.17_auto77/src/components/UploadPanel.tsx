import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import type { UploadedFile } from '../App';

interface UploadPanelProps {
  files: UploadedFile[];
  onFilesAdded: (files: UploadedFile[]) => void;
  onFileRemove: (id: string) => void;
  onFileRotate: (id: string) => void;
  onStartRecognize: () => void;
  onClearAll: () => void;
  isProcessing: boolean;
  progress: number;
  progressComplete: boolean;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];

function generateId(): string {
  return `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function UploadPanel({
  files,
  onFilesAdded,
  onFileRemove,
  onFileRotate,
  onStartRecognize,
  onClearAll,
  isProcessing,
  progress,
  progressComplete
}: UploadPanelProps) {
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const validFiles = acceptedFiles.filter(f => {
      if (f.size > MAX_FILE_SIZE) {
        alert(`文件 ${f.name} 超过 5MB 限制`);
        return false;
      }
      if (!ACCEPTED_TYPES.includes(f.type)) {
        alert(`文件 ${f.name} 格式不支持`);
        return false;
      }
      return true;
    });

    const uploadedFiles: UploadedFile[] = await Promise.all(
      validFiles.map(async (file) => {
        const base64 = await fileToBase64(file);
        const preview = file.type.startsWith('image/')
          ? base64
          : '';

        return {
          id: generateId(),
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          preview,
          rotation: 0,
          base64
        };
      })
    );

    onFilesAdded(uploadedFiles);
  }, [onFilesAdded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg']
    },
    multiple: true,
    maxSize: MAX_FILE_SIZE
  });

  const getRandomExitAnimation = () => {
    const directions = [
      { x: -300, y: -150, rotate: -360 },
      { x: 300, y: -100, rotate: 270 },
      { x: -200, y: 200, rotate: 180 },
      { x: 250, y: 150, rotate: -270 },
      { x: 0, y: -300, rotate: 360 },
    ];
    return directions[Math.floor(Math.random() * directions.length)];
  };

  return (
    <div className="left-panel">
      <div
        {...getRootProps()}
        className={`dropzone ${isDragActive ? 'drag-over' : ''}`}
      >
        <input {...getInputProps()} />
        <div className="dropzone-icon">📁</div>
        <div className="dropzone-text">
          {isDragActive ? '释放以开始上传' : '拖拽或点击上传'}
        </div>
        <div className="dropzone-hint">
          支持 PDF / PNG / JPG，单文件不超过 5MB
        </div>
      </div>

      {(isProcessing || progress > 0) && (
        <div className="progress-container" style={{ position: 'relative' }}>
          <motion.div
            className={`progress-bar ${progressComplete ? 'complete' : ''}`}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(progress, 100)}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
          {progressComplete && (
            <motion.div
              className="progress-check"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              ✓
            </motion.div>
          )}
        </div>
      )}

      <div className="thumbnails-list">
        <AnimatePresence mode="popLayout">
          {files.map((f, index) => (
            <motion.div
              key={f.id}
              className="thumbnail-item"
              layout
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{
                ...getRandomExitAnimation(),
                opacity: 0,
                transition: { duration: 0.5, ease: 'easeIn' }
              }}
              transition={{
                type: 'spring',
                stiffness: 400,
                damping: 30,
                delay: index * 0.05
              }}
            >
              <div className="thumbnail-content">
                <div className="thumbnail-image-wrapper">
                  {f.preview ? (
                    <motion.img
                      src={f.preview}
                      alt={f.name}
                      className="thumbnail-image"
                      animate={{ rotate: f.rotation }}
                      transition={{ duration: 0.3 }}
                    />
                  ) : (
                    <span className="file-pdf-icon">📄</span>
                  )}
                </div>
                <div className="thumbnail-info">
                  <div className="thumbnail-name">{f.name}</div>
                  <div className="thumbnail-size">{formatSize(f.size)}</div>
                  {f.rotation > 0 && (
                    <div className="thumbnail-size" style={{ color: '#e94560' }}>
                      旋转: {f.rotation}°
                    </div>
                  )}
                </div>
                <div className="thumbnail-actions">
                  <button
                    className="action-btn rotate-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onFileRotate(f.id);
                    }}
                    title="旋转90°"
                  >
                    ↻
                  </button>
                  <button
                    className="action-btn delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onFileRemove(f.id);
                    }}
                    title="删除"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="panel-actions">
        <motion.button
          className="btn-primary"
          disabled={files.length === 0 || isProcessing}
          onClick={onStartRecognize}
          whileHover={files.length > 0 && !isProcessing ? { scale: 1.02 } : {}}
          whileTap={files.length > 0 && !isProcessing ? { scale: 0.98 } : {}}
        >
          {isProcessing ? (
            <>
              <span className="btn-loading" />
              识别中...
            </>
          ) : (
            <>
              <span>🔍</span>
              开始识别
            </>
          )}
        </motion.button>
        <motion.button
          className="btn-secondary"
          disabled={(files.length === 0 && isProcessing === false) || isProcessing}
          onClick={onClearAll}
          whileHover={(files.length > 0 && !isProcessing) ? { scale: 1.02 } : {}}
          whileTap={(files.length > 0 && !isProcessing) ? { scale: 0.98 } : {}}
        >
          <span>🗑️</span>
          清空
        </motion.button>
      </div>
    </div>
  );
}
