import { useState, useRef } from 'react';
import { Socket } from 'socket.io-client';

interface FileItem {
  id: string;
  filename: string;
  originalName: string;
  size: number;
  uploader: string;
  createdAt: number;
}

interface FileUploadProps {
  socket: Socket;
  roomCode: string;
  nickname: string;
  files: FileItem[];
}

interface UploadingFile {
  id: string;
  name: string;
  size: number;
  progress: number;
  completed: boolean;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export default function FileUpload({ socket, roomCode, nickname, files }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState<UploadingFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
    ];
    if (!allowedTypes.includes(file.type)) {
      return '只允许上传图片和PDF文件';
    }
    if (file.size > 5 * 1024 * 1024) {
      return '文件大小不能超过5MB';
    }
    return null;
  };

  const uploadFile = (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setTimeout(() => setError(null), 3000);
      return;
    }

    const uploadId = Math.random().toString(36).substring(2, 10);
    const uploadingFile: UploadingFile = {
      id: uploadId,
      name: file.name,
      size: file.size,
      progress: 0,
      completed: false,
    };
    setUploading((prev) => [...prev, uploadingFile]);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('roomCode', roomCode);
    formData.append('nickname', nickname);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/files/upload');

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const progress = Math.round((e.loaded / e.total) * 100);
        setUploading((prev) =>
          prev.map((u) => (u.id === uploadId ? { ...u, progress } : u))
        );
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        setUploading((prev) =>
          prev.map((u) => (u.id === uploadId ? { ...u, progress: 100, completed: true } : u))
        );
        setTimeout(() => {
          setUploading((prev) => prev.filter((u) => u.id !== uploadId));
        }, 300);
      } else {
        try {
          const data = JSON.parse(xhr.responseText);
          setError(data.error || '上传失败');
        } catch {
          setError('上传失败');
        }
        setTimeout(() => setError(null), 3000);
        setUploading((prev) => prev.filter((u) => u.id !== uploadId));
      }
    };

    xhr.onerror = () => {
      setError('上传失败，请检查网络');
      setTimeout(() => setError(null), 3000);
      setUploading((prev) => prev.filter((u) => u.id !== uploadId));
    };

    xhr.send(formData);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    droppedFiles.forEach((file) => uploadFile(file));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      Array.from(e.target.files).forEach((file) => uploadFile(file));
      e.target.value = '';
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>📁 文件共享</span>
      </div>

      {error && (
        <div style={styles.error}>{error}</div>
      )}

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        style={{
          ...styles.dropZone,
          borderColor: isDragging ? '#5b6cff' : '#3a3b5e',
          backgroundColor: isDragging ? '#2a2b5e' : '#1e1f35',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*,application/pdf"
          multiple
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        <span style={styles.dropIcon}>📤</span>
        <span style={styles.dropText}>
          {isDragging ? '释放以上传文件' : '拖拽文件到此处，或点击选择'}
        </span>
        <span style={styles.dropHint}>支持图片和PDF，单文件最大5MB</span>
      </div>

      {uploading.length > 0 && (
        <div style={styles.uploadingList}>
          {uploading.map((u) => (
            <div key={u.id} style={styles.uploadingItem}>
              <div style={styles.uploadingInfo}>
                <span style={styles.uploadingName}>{u.name}</span>
                <span style={styles.uploadingSize}>{formatSize(u.size)}</span>
              </div>
              <div style={styles.progressBarContainer}>
                <div
                  style={{
                    ...styles.progressBar,
                    width: `${u.progress}%`,
                    background: u.completed
                      ? '#4caf50'
                      : 'linear-gradient(90deg, #2196f3, #5b6cff)',
                    transition: 'width 0.2s ease',
                  }}
                />
              </div>
              {u.completed && <span style={styles.completedCheck}>✓</span>}
            </div>
          ))}
        </div>
      )}

      <div style={styles.fileList}>
        {files.length === 0 && uploading.length === 0 && (
          <div style={styles.emptyState}>暂无文件</div>
        )}
        {files.map((file) => (
          <a
            key={file.id}
            href={`/files/${file.id}`}
            style={styles.fileItem}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span style={styles.fileIcon}>
              {file.originalName.toLowerCase().endsWith('.pdf') ? '📄' : '🖼️'}
            </span>
            <div style={styles.fileInfo}>
              <span style={styles.fileName}>{file.originalName}</span>
              <span style={styles.fileMeta}>
                {formatSize(file.size)} · {file.uploader}
              </span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#252640',
    borderRadius: '12px',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    flex: '1',
    minHeight: 0,
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: '15px',
    fontWeight: 600,
  },
  error: {
    backgroundColor: '#e5393533',
    color: '#ff8a80',
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: '13px',
  },
  dropZone: {
    border: '2px dashed',
    borderRadius: '8px',
    padding: '20px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
  },
  dropIcon: {
    fontSize: '28px',
  },
  dropText: {
    color: '#ddd',
    fontSize: '13px',
  },
  dropHint: {
    color: '#888',
    fontSize: '11px',
  },
  uploadingList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  uploadingItem: {
    backgroundColor: '#1e1f35',
    padding: '10px',
    borderRadius: '6px',
    position: 'relative',
  },
  uploadingInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px',
  },
  uploadingName: {
    color: '#ddd',
    fontSize: '12px',
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    marginRight: '8px',
  },
  uploadingSize: {
    color: '#888',
    fontSize: '11px',
  },
  progressBarContainer: {
    height: '6px',
    backgroundColor: '#3a3b5e',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: '3px',
  },
  completedCheck: {
    position: 'absolute',
    right: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#4caf50',
    fontSize: '18px',
    fontWeight: 'bold',
  },
  fileList: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  emptyState: {
    color: '#666',
    textAlign: 'center',
    padding: '16px',
    fontSize: '12px',
  },
  fileItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px',
    backgroundColor: '#1e1f35',
    borderRadius: '6px',
    textDecoration: 'none',
    transition: 'filter 0.2s, transform 0.2s',
  },
  fileIcon: {
    fontSize: '20px',
  },
  fileInfo: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  fileName: {
    color: '#ddd',
    fontSize: '13px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  fileMeta: {
    color: '#888',
    fontSize: '11px',
    marginTop: '2px',
  },
};
