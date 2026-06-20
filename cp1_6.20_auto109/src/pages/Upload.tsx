import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { uploadWork } from '../services/works';

const Upload: React.FC = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="main-content">
        <div className="loading">加载中...</div>
      </div>
    );
  }

  if (!user) {
    navigate('/login');
    return null;
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    setError(null);

    const validTypes = ['image/jpeg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      setError('只支持JPG和PNG格式的图片');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('图片大小不能超过5MB');
      return;
    }

    setImage(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('请输入作品标题');
      return;
    }

    if (description.length > 200) {
      setError('创作说明不能超过200字');
      return;
    }

    if (!image) {
      setError('请选择要上传的图片');
      return;
    }

    setLoading(true);

    try {
      await uploadWork(title.trim(), description.trim(), image);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || '上传失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="main-content">
      <div className="form-container" style={{ maxWidth: '600px' }}>
        <h1 className="page-title" style={{ textAlign: 'center' }}>
          上传作品
        </h1>
        <form onSubmit={handleSubmit}>
          <div
            className={`upload-area ${isDragging ? 'dragover' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            {preview ? (
              <img src={preview} alt="预览" className="upload-preview" />
            ) : (
              <div className="upload-placeholder">
                <p style={{ fontSize: '16px', marginBottom: '8px' }}>
                  点击或拖拽图片到此处上传
                </p>
                <p style={{ fontSize: '12px', opacity: 0.7 }}>
                  支持JPG、PNG格式，单张不超过5MB
                </p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              style={{ display: 'none' }}
              onChange={handleFileInputChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label">作品标题</label>
            <input
              type="text"
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="请输入作品标题"
              maxLength={100}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              创作说明
              <span style={{ fontWeight: 'normal', color: 'var(--color-text-secondary)' }}>
                （最多200字）
              </span>
            </label>
            <textarea
              className="form-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="请描述您的创作灵感或故事..."
              maxLength={200}
              rows={4}
            />
            <div className="form-hint">{description.length}/200</div>
          </div>

          {error && <div className="form-error">{error}</div>}

          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ flex: 1 }}
              onClick={() => navigate('/')}
              disabled={loading}
            >
              取消
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ flex: 1 }}
              disabled={loading}
            >
              {loading ? '上传中...' : '提交作品'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Upload;
