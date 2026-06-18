import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useStore } from '../store';

export default function DesignList() {
  const navigate = useNavigate();
  const { designs, fetchDesigns, uploadDesign } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchDesigns();
  }, [fetchDesigns]);

  const filteredDesigns = useMemo(() => {
    let result = [...designs];
    if (searchTerm) {
      result = result.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    result.sort((a, b) => {
      return sortOrder === 'desc' ? b.createdAt - a.createdAt : a.createdAt - b.createdAt;
    });
    return result;
  }, [designs, searchTerm, sortOrder]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      toast.error('只支持 PNG/JPG/WebP 格式的图片');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('图片大小不能超过 5MB');
      return;
    }

    setIsUploading(true);
    const loadingToast = toast.loading('正在上传设计稿...');

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const imageData = ev.target?.result as string;
      const design = await uploadDesign(file.name, imageData);
      toast.dismiss(loadingToast);
      if (design) {
        toast.success('设计稿上传成功！');
      } else {
        toast.error('上传失败，请重试');
      }
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="design-list-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">设计稿列表</h1>
          <p className="page-subtitle">共 {designs.length} 个设计稿</p>
        </div>
        <label className="upload-btn">
          <span>＋ 上传设计稿</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            hidden
            onChange={handleFileUpload}
            disabled={isUploading}
          />
        </label>
      </div>

      <div className="filter-bar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="搜索设计稿名称..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="sort-select"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as 'desc' | 'asc')}
        >
          <option value="desc">最新上传</option>
          <option value="asc">最早上传</option>
        </select>
      </div>

      {filteredDesigns.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📁</div>
          <p className="empty-text">
            {searchTerm ? '没有找到匹配的设计稿' : '还没有设计稿，快去上传一个吧！'}
          </p>
        </div>
      ) : (
        <div className="design-grid">
          {filteredDesigns.map((design) => (
            <div
              key={design.id}
              className="design-card"
              onClick={() => navigate(`/design/${design.id}`)}
            >
              <div className="design-thumbnail">
                <img
                  src={`/api/designs/${design.id}`}
                  alt={design.name}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="280" height="180"><rect fill="%23E2E8F0" width="100%" height="100%"/><text x="50%" y="50%" fill="%23A0AEC0" font-size="16" text-anchor="middle" dy=".3em">图片加载中</text></svg>';
                  }}
                />
                {design.commentCount > 0 && (
                  <div className="comment-badge">💬 {design.commentCount}</div>
                )}
              </div>
              <div className="design-info">
                <h3 className="design-name" title={design.name}>{design.name}</h3>
                <p className="design-date">{formatDate(design.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
