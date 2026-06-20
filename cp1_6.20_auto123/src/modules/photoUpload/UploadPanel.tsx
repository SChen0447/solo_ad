import { useState, useRef, useCallback } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import type { Photo, UploadTask } from '../../types';
import { compressImage, generatePreview } from '../../utils';

interface Props {
  onUpload: (photo: Photo) => void;
  onUploadDone: () => void;
}

export default function UploadPanel({ onUpload, onUploadDone }: Props) {
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileList = Array.from(files).filter((f) =>
      f.type.startsWith('image/')
    );
    const newTasks: UploadTask[] = await Promise.all(
      fileList.map(async (file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        preview: await generatePreview(file),
        progress: 0,
        status: 'pending' as const,
      }))
    );
    setTasks((prev) => [...prev, ...newTasks]);

    for (const task of newTasks) {
      await uploadTask(task);
    }
    onUploadDone();
  }, [onUploadDone]);

  const uploadTask = async (task: UploadTask) => {
    try {
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: 'uploading' } : t))
      );

      const compressedBlob = await compressImage(task.file);
      const formData = new FormData();
      formData.append('file', compressedBlob, task.file.name);

      const response = await axios.post<Photo>('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) {
            const progress = Math.round((e.loaded * 100) / e.total);
            setTasks((prev) =>
              prev.map((t) => (t.id === task.id ? { ...t, progress } : t))
            );
          }
        },
      });

      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? { ...t, status: 'done', progress: 100, photo: response.data }
            : t
        )
      );
      onUpload(response.data);
    } catch (err: any) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? { ...t, status: 'error', error: err?.message || '上传失败' }
            : t
        )
      );
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  return (
    <div className="upload-panel">
      <div
        className={`drop-zone ${isDragOver ? 'dragover' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        <div className="drop-icon">📤</div>
        <p className="drop-text">拖拽照片到此处，或点击选择文件</p>
        <p className="drop-hint">支持 JPG / PNG 格式，最大 50MB</p>
      </div>

      {tasks.length > 0 && (
        <div className="upload-tasks">
          <AnimatePresence>
            {tasks.map((task) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="upload-task"
              >
                <img src={task.preview} alt="" className="task-thumb" />
                <div className="task-info">
                  <div className="task-filename">{task.file.name}</div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                  <div className="task-status">
                    {task.status === 'pending' && '等待上传...'}
                    {task.status === 'uploading' && `上传中 ${task.progress}%`}
                    {task.status === 'done' && <span className="success">✓ 上传完成</span>}
                    {task.status === 'error' && (
                      <span className="error">✗ {task.error}</span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
