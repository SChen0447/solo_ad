import { useState, useMemo, useRef } from 'react';
import { TravelPlan, FileItem } from './types';

interface FileWallProps {
  plan: TravelPlan;
  currentMemberId: string;
  currentMemberName: string;
}

type FileTypeFilter = 'all' | 'image' | 'pdf' | 'note';

const TYPE_ICONS: Record<string, string> = {
  image: '🖼️',
  pdf: '📄',
  note: '📝',
};

export default function FileWall({ plan, currentMemberId, currentMemberName }: FileWallProps) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<FileTypeFilter>('all');
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredFiles = useMemo(() => {
    let files = [...plan.files];
    if (typeFilter !== 'all') {
      files = files.filter(f => f.type === typeFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      files = files.filter(f =>
        f.name.toLowerCase().includes(q) ||
        f.uploaderName.toLowerCase().includes(q)
      );
    }
    return files.sort((a, b) =>
      new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
  }, [plan.files, search, typeFilter]);

  const groupedFiles = useMemo(() => {
    const groups: Record<string, FileItem[]> = {};
    filteredFiles.forEach(f => {
      const date = new Date(f.uploadedAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(f);
    });
    return groups;
  }, [filteredFiles]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('uploaderId', currentMemberId);
      formData.append('uploaderName', currentMemberName);

      await fetch(`/api/plans/${plan.id}/upload`, {
        method: 'POST',
        body: formData,
      });
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('确定删除这个文件吗？')) return;
    await fetch(`/api/plans/${plan.id}/files/${fileId}`, { method: 'DELETE' });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateStr: string): string => {
    const d = new Date(dateStr);
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();

    if (isToday) return '今天';
    if (isYesterday) return '昨天';
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  };

  const formatTime = (dateStr: string): string => {
    const d = new Date(dateStr);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className="filewall-container">
      <div className="filewall-toolbar">
        <input
          type="text"
          placeholder="🔍 搜索文件名或上传者..."
          className="search-input"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="filter-tabs">
          {(['all', 'image', 'pdf', 'note'] as FileTypeFilter[]).map(t => (
            <button
              key={t}
              className={`filter-tab ${typeFilter === t ? 'active' : ''}`}
              onClick={() => setTypeFilter(t)}
            >
              {t === 'all' ? '全部' : TYPE_ICONS[t] + ' ' + (t === 'image' ? '图片' : t === 'pdf' ? 'PDF' : '笔记')}
            </button>
          ))}
        </div>
        <button
          className="upload-btn"
          onClick={() => fileInputRef.current?.click()}
        >
          ⬆️ 上传文件
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.txt,.md,.doc,.docx"
          style={{ display: 'none' }}
          onChange={handleUpload}
        />
      </div>

      {Object.keys(groupedFiles).length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📁</div>
          <p>{search ? '没有找到匹配的文件' : '还没有上传任何文件，点击上方按钮开始上传'}</p>
        </div>
      ) : (
        Object.entries(groupedFiles).map(([date, files]) => (
          <div key={date} className="files-group">
            <div className="files-group-title">{formatDate(date)}</div>
            <div className="files-grid">
              {files.map(file => (
                <div
                  key={file.id}
                  className="file-card"
                  onClick={() => setPreviewFile(file)}
                >
                  <div className="file-preview">
                    {file.type === 'image' ? (
                      <img src={file.url} alt={file.name} />
                    ) : (
                      <span>{TYPE_ICONS[file.type]}</span>
                    )}
                    {file.uploaderId === currentMemberId && (
                      <button
                        className="file-delete"
                        onClick={e => handleDelete(file.id, e)}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <div className="file-info">
                    <div className="file-name" title={file.name}>{file.name}</div>
                    <div className="file-meta">
                      <span>{formatFileSize(file.size)}</span>
                      <span>{formatTime(file.uploadedAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {previewFile && (
        <PreviewModal
          file={previewFile}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  );
}

interface PreviewModalProps {
  file: FileItem;
  onClose: () => void;
}

function PreviewModal({ file, onClose }: PreviewModalProps) {
  return (
    <div className="modal-overlay preview-modal" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3 style={{ marginBottom: 16, wordBreak: 'break-all' }}>{file.name}</h3>
        <div className="preview-content">
          {file.type === 'image' ? (
            <img src={file.url} alt={file.name} />
          ) : file.type === 'pdf' ? (
            <iframe src={file.url} title={file.name} />
          ) : (
            <span className="file-icon-large">{TYPE_ICONS[file.type]}</span>
          )}
        </div>
        <div className="preview-actions">
          <div style={{ fontSize: 13, color: '#888' }}>
            由 {file.uploaderName} 上传
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn-cancel" onClick={onClose} style={{ flex: 'none', padding: '10px 20px' }}>
              关闭
            </button>
            <a
              className="download-btn"
              href={file.url}
              download={file.name}
              target="_blank"
              rel="noopener noreferrer"
            >
              ⬇️ 下载
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
