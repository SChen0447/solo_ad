import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  getAssets,
  searchAssets,
  uploadAsset,
  downloadAsset,
  getCategories,
  Asset,
  CategoryGroup,
} from './apiService';

const PLACEHOLDER_COLORS = [
  '#6366F1', '#8B5CF6', '#EC4899', '#F59E0B',
  '#10B981', '#3B82F6', '#EF4444', '#14B8A6',
];

function getPlaceholderColor(id: string): string {
  const num = parseInt(id, 10) || 0;
  return PLACEHOLDER_COLORS[num % PLACEHOLDER_COLORS.length];
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#F8F9FA',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  sidebar: {
    width: 240,
    backgroundColor: '#FFFFFF',
    borderRight: '1px solid #E5E7EB',
    padding: '24px 0',
    flexShrink: 0,
    transition: 'width 0.3s ease, opacity 0.3s ease',
    overflowY: 'auto',
    position: 'relative' as const,
  },
  sidebarCollapsed: {
    width: 0,
    padding: '24px 0',
    overflow: 'hidden',
    opacity: 0,
  },
  sidebarHeader: {
    padding: '0 20px 16px',
    fontSize: 12,
    fontWeight: 600,
    color: '#6B7280',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  categoryGroup: {
    marginBottom: 4,
  },
  categoryHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 20px',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
    color: '#1F2937',
    transition: 'background-color 0.15s',
    userSelect: 'none' as const,
  },
  categoryHeaderHover: {
    backgroundColor: '#F3F4F6',
  },
  categoryArrow: {
    transition: 'transform 0.2s ease',
    fontSize: 10,
    color: '#9CA3AF',
  },
  tagList: {
    overflow: 'hidden',
    transition: 'max-height 0.3s ease, opacity 0.3s ease',
    maxHeight: 0,
    opacity: 0,
  },
  tagListExpanded: {
    maxHeight: 300,
    opacity: 1,
  },
  tagItem: {
    padding: '8px 20px 8px 36px',
    fontSize: 13,
    color: '#6B7280',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    borderRadius: 0,
    position: 'relative' as const,
  },
  tagItemSelected: {
    backgroundColor: '#4F46E5',
    color: '#FFFFFF',
    fontWeight: 500,
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    minWidth: 0,
    transition: 'margin-left 0.3s ease',
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '16px 24px',
    backgroundColor: '#FFFFFF',
    borderBottom: '1px solid #E5E7EB',
    position: 'sticky' as const,
    top: 0,
    zIndex: 20,
  },
  sidebarToggle: {
    width: 36,
    height: 36,
    borderRadius: 8,
    border: '1px solid #E5E7EB',
    backgroundColor: '#FFFFFF',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 16,
    color: '#6B7280',
    transition: 'all 0.15s ease',
    flexShrink: 0,
  },
  searchBox: {
    flex: 1,
    maxWidth: 480,
    position: 'relative' as const,
  },
  searchInput: {
    width: '100%',
    padding: '10px 16px 10px 40px',
    borderRadius: 10,
    border: '1px solid #E5E7EB',
    backgroundColor: '#F9FAFB',
    fontSize: 14,
    outline: 'none',
    transition: 'all 0.2s ease',
    boxSizing: 'border-box' as const,
  },
  searchIcon: {
    position: 'absolute' as const,
    left: 14,
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#9CA3AF',
    fontSize: 14,
    pointerEvents: 'none' as const,
  },
  uploadBtn: {
    padding: '10px 20px',
    borderRadius: 10,
    border: 'none',
    backgroundColor: '#4F46E5',
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
    whiteSpace: 'nowrap' as const,
  },
  content: {
    flex: 1,
    padding: '24px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
    transition: 'transform 0.25s ease, box-shadow 0.25s ease',
    cursor: 'default',
    position: 'relative' as const,
    display: 'flex',
    flexDirection: 'column' as const,
  },
  cardThumb: {
    width: '100%',
    aspectRatio: '4/3',
    objectFit: 'cover',
    display: 'block',
    backgroundColor: '#F3F4F6',
  },
  cardInfo: {
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 6,
    maxHeight: 72,
    overflow: 'hidden',
    opacity: 1,
    transition: 'max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease',
  },
  cardInfoExpanded: {
    maxHeight: 220,
    opacity: 1,
  },
  cardName: {
    fontSize: 13,
    fontWeight: 600,
    color: '#1F2937',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  cardCategory: {
    fontSize: 11,
    color: '#4F46E5',
    fontWeight: 500,
  },
  cardDesc: {
    fontSize: 12,
    color: '#9CA3AF',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    opacity: 0.8,
    transition: 'opacity 0.3s ease 0.1s',
  },
  cardDescExpanded: {
    whiteSpace: 'normal' as const,
    WebkitLineClamp: 2,
    display: '-webkit-box',
    WebkitBoxOrient: 'vertical',
    opacity: 1,
  },
  cardTags: {
    display: 'flex',
    gap: 4,
    flexWrap: 'wrap' as const,
    marginTop: 2,
    opacity: 0,
    maxHeight: 0,
    overflow: 'hidden',
    transition: 'opacity 0.3s ease 0.15s, max-height 0.3s ease 0.1s',
  },
  cardTagsExpanded: {
    opacity: 1,
    maxHeight: 100,
  },
  cardTag: {
    fontSize: 10,
    padding: '2px 8px',
    borderRadius: 4,
    backgroundColor: '#F3F4F6',
    color: '#6B7280',
  },
  cardBottom: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 14px 12px',
    borderTop: '1px solid #F3F4F6',
  },
  downloadCount: {
    fontSize: 12,
    color: '#9CA3AF',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  downloadBtn: {
    padding: '5px 12px',
    borderRadius: 6,
    border: '1px solid #E5E7EB',
    backgroundColor: '#FFFFFF',
    fontSize: 12,
    fontWeight: 500,
    color: '#4F46E5',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  modalOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
    animation: 'fadeIn 0.2s ease',
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 28,
    width: 460,
    maxWidth: '90vw',
    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
    animation: 'scaleIn 0.25s ease',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: '#1F2937',
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    display: 'block',
    fontSize: 13,
    fontWeight: 500,
    color: '#374151',
    marginBottom: 6,
  },
  formInput: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid #E5E7EB',
    fontSize: 14,
    outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box' as const,
  },
  formSelect: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid #E5E7EB',
    fontSize: 14,
    outline: 'none',
    backgroundColor: '#FFFFFF',
    boxSizing: 'border-box' as const,
  },
  fileDrop: {
    border: '2px dashed #D1D5DB',
    borderRadius: 10,
    padding: '28px 20px',
    textAlign: 'center' as const,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    backgroundColor: '#F9FAFB',
  },
  fileDropActive: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  fileDropText: {
    fontSize: 14,
    color: '#6B7280',
  },
  fileDropHint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  selectedFile: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
    fontSize: 13,
    color: '#4F46E5',
  },
  progressBar: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
    marginTop: 12,
    position: 'relative' as const,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
    background: 'linear-gradient(90deg, #6366F1 0%, #4F46E5 100%)',
    transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative' as const,
    overflow: 'hidden',
  },
  progressPercent: {
    fontSize: 12,
    color: '#4F46E5',
    fontWeight: 600,
    marginTop: 6,
    textAlign: 'center' as const,
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 20,
  },
  cancelBtn: {
    padding: '10px 20px',
    borderRadius: 8,
    border: '1px solid #E5E7EB',
    backgroundColor: '#FFFFFF',
    fontSize: 14,
    color: '#6B7280',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  submitBtn: {
    padding: '10px 20px',
    borderRadius: 8,
    border: 'none',
    backgroundColor: '#4F46E5',
    fontSize: 14,
    fontWeight: 600,
    color: '#FFFFFF',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  submitBtnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  toast: {
    position: 'fixed' as const,
    top: 20,
    right: 20,
    padding: '12px 20px',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 500,
    zIndex: 100,
    animation: 'slideIn 0.3s ease',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  },
  toastSuccess: {
    backgroundColor: '#ECFDF5',
    color: '#065F46',
    border: '1px solid #A7F3D0',
  },
  toastError: {
    backgroundColor: '#FEF2F2',
    color: '#991B1B',
    border: '1px solid #FECACA',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    textAlign: 'center' as const,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
    opacity: 0.4,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: '#374151',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  fadeEnter: {
    opacity: 0,
    transform: 'translateY(8px)',
  },
  fadeEnterActive: {
    opacity: 1,
    transform: 'translateY(0)',
    transition: 'opacity 0.3s ease, transform 0.3s ease',
  },
};

function App() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<CategoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState('图标');
  const [uploadTags, setUploadTags] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [bouncingId, setBouncingId] = useState<string | null>(null);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [fadeIn, setFadeIn] = useState(true);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchAssets = useCallback(async (category?: string | null, tag?: string | null) => {
    try {
      setFadeIn(false);
      await new Promise((r) => setTimeout(r, 150));
      const data = await getAssets(category || undefined, tag || undefined);
      setAssets(data);
      setFadeIn(true);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  }, [showToast]);

  const doSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      fetchAssets(selectedCategory, selectedTag);
      return;
    }
    try {
      setFadeIn(false);
      await new Promise((r) => setTimeout(r, 150));
      const data = await searchAssets(query);
      setAssets(data);
      setFadeIn(true);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  }, [fetchAssets, selectedCategory, selectedTag, showToast]);

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
    fetchAssets();
  }, [fetchAssets]);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      doSearch(searchQuery);
    }, 300);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [searchQuery, doSearch]);

  const handleTagClick = (category: string, tag: string) => {
    const newCat = selectedCategory === category && selectedTag === tag ? null : category;
    const newTag = newCat === null ? null : tag;
    setSelectedCategory(newCat);
    setSelectedTag(newTag);
    setSearchQuery('');
    fetchAssets(newCat, newTag);
  };

  const toggleCategory = (name: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleUploadSubmit = async () => {
    if (!uploadFile) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      const tags = uploadTags
        .split(/[,，]/)
        .map((t) => t.trim())
        .filter(Boolean);
      await uploadAsset(uploadFile, uploadCategory, tags, uploadDescription, (p) =>
        setUploadProgress(p)
      );
      showToast('素材上传成功！');
      setShowUploadModal(false);
      resetUploadForm();
      fetchAssets(selectedCategory, selectedTag);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  const resetUploadForm = () => {
    setUploadFile(null);
    setUploadCategory('图标');
    setUploadTags('');
    setUploadDescription('');
    setUploadProgress(0);
  };

  const handleDownload = async (e: React.MouseEvent, asset: Asset) => {
    e.stopPropagation();
    try {
      await downloadAsset(asset.id);
      setBouncingId(asset.id);
      setTimeout(() => setBouncingId(null), 600);
      setAssets((prev) =>
        prev.map((a) => (a.id === asset.id ? { ...a, downloadCount: a.downloadCount + 1 } : a))
      );
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['png', 'jpg', 'jpeg', 'svg'].includes(ext || '')) {
      showToast('仅支持 PNG、JPG、SVG 格式', 'error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast('文件大小不能超过10MB', 'error');
      return;
    }
    setUploadFile(file);
  };

  return (
    <>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes bounceCount { 
          0% { transform: scale(1); } 
          25% { transform: scale(1.5); } 
          50% { transform: scale(0.95); } 
          75% { transform: scale(1.1); } 
          100% { transform: scale(1); } 
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { margin: 0; }
        input:focus, select:focus, textarea:focus { border-color: #4F46E5 !important; box-shadow: 0 0 0 3px rgba(79,70,229,0.1); }
        button:hover { filter: brightness(1.05); }
        .sidebar-tag:hover { background-color: #F3F4F6 !important; }
        .sidebar-tag-selected { background-color: #4F46E5 !important; color: #FFFFFF !important; font-weight: 500; }
        .download-btn:hover { background-color: #4F46E5 !important; color: #FFFFFF !important; border-color: #4F46E5 !important; }
        .upload-btn:hover { background-color: #4338CA !important; }
        .cancel-btn:hover { background-color: #F9FAFB !important; }
        .submit-btn:hover:not(:disabled) { background-color: #4338CA !important; }
        .toggle-btn:hover { background-color: #F3F4F6 !important; }
        @media (max-width: 1200px) { .asset-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 768px) {
          .asset-grid { grid-template-columns: 1fr !important; }
          .sidebar-container { position: fixed !important; left: 0; top: 0; bottom: 0; z-index: 30; box-shadow: 4px 0 20px rgba(0,0,0,0.1); }
        }
        .bounce-anim { 
          animation: bounceCount 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55) !important; 
          color: #4F46E5 !important;
          display: inline-flex !important;
        }
        .bounce-anim > * { display: inline-block; }
        .card-hover { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(0,0,0,0.1) !important; }
        .card-hover .card-info-inner { max-height: 220px !important; }
        .progress-fill::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 40%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
          animation: shimmer 1.2s infinite;
        }
        .grid-wrapper {
          position: relative;
        }
        .asset-grid { 
          transition: opacity 0.4s ease, transform 0.4s ease;
        }
        .grid-fade-out { 
          opacity: 0 !important; 
          transform: translateY(6px) scale(0.995) !important; 
          transition: opacity 0.25s ease, transform 0.25s ease !important;
        }
        .grid-fade-in { 
          opacity: 1 !important; 
          transform: translateY(0) scale(1) !important; 
        }
      `}</style>

      <div style={styles.container}>
        <div
          className="sidebar-container"
          style={sidebarOpen ? styles.sidebar : { ...styles.sidebarCollapsed, ...styles.sidebar }}
        >
          <div style={styles.sidebarHeader}>分类筛选</div>
          {categories.map((cat) => (
            <div key={cat.name} style={styles.categoryGroup}>
              <div
                style={styles.categoryHeader}
                onClick={() => toggleCategory(cat.name)}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = '#F3F4F6')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = 'transparent')
                }
              >
                <span>{cat.name}</span>
                <span
                  style={{
                    ...styles.categoryArrow,
                    transform: expandedCategories.has(cat.name)
                      ? 'rotate(90deg)'
                      : 'rotate(0deg)',
                  }}
                >
                  ▶
                </span>
              </div>
              <div
                style={{
                  ...styles.tagList,
                  ...(expandedCategories.has(cat.name) ? styles.tagListExpanded : {}),
                }}
              >
                {cat.tags.map((tag) => {
                  const isSelected = selectedCategory === cat.name && selectedTag === tag;
                  return (
                    <div
                      key={tag}
                      className={`sidebar-tag ${isSelected ? 'sidebar-tag-selected' : ''}`}
                      style={{
                        ...styles.tagItem,
                        ...(isSelected ? styles.tagItemSelected : {}),
                      }}
                      onClick={() => handleTagClick(cat.name, tag)}
                    >
                      {tag}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div style={styles.main}>
          <div style={styles.topBar}>
            <button
              className="toggle-btn"
              style={styles.sidebarToggle}
              onClick={() => setSidebarOpen(!sidebarOpen)}
              title={sidebarOpen ? '收起侧栏' : '展开侧栏'}
            >
              {sidebarOpen ? '◀' : '▶'}
            </button>

            <div style={styles.searchBox}>
              <span style={styles.searchIcon}>🔍</span>
              <input
                style={styles.searchInput}
                type="text"
                placeholder="搜索素材名称或描述..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={(e) => (e.target.style.borderColor = '#4F46E5')}
                onBlur={(e) => (e.target.style.borderColor = '#E5E7EB')}
              />
            </div>

            <button
              className="upload-btn"
              style={styles.uploadBtn}
              onClick={() => setShowUploadModal(true)}
            >
              <span>＋</span> 上传素材
            </button>
          </div>

          <div style={styles.content}>
            {assets.length === 0 && !loading ? (
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>
                  <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                    <rect x="10" y="16" width="60" height="48" rx="6" stroke="#D1D5DB" strokeWidth="2" fill="#F9FAFB" />
                    <circle cx="30" cy="36" r="6" stroke="#D1D5DB" strokeWidth="2" fill="none" />
                    <path d="M10 52 L28 38 L42 48 L54 34 L70 48" stroke="#D1D5DB" strokeWidth="2" fill="none" />
                  </svg>
                </div>
                <div style={styles.emptyTitle}>没有找到相关素材</div>
                <div style={styles.emptyDesc}>换个关键词试试</div>
              </div>
            ) : (
              <div className="grid-wrapper">
                <div
                  className={`asset-grid ${fadeIn ? 'grid-fade-in' : 'grid-fade-out'}`}
                  style={styles.grid}
                >
                  {assets.map((asset) => {
                    const isHovered = hoveredCard === asset.id;
                    const isBouncing = bouncingId === asset.id;
                    return (
                      <div
                        key={asset.id}
                        style={styles.card}
                        className={isHovered ? 'card-hover' : ''}
                        onMouseEnter={() => setHoveredCard(asset.id)}
                        onMouseLeave={() => setHoveredCard(null)}
                      >
                        <div style={{ position: 'relative', overflow: 'hidden' }}>
                          <img
                            src={asset.url}
                            alt={asset.originalName}
                            style={styles.cardThumb}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement!;
                              if (!parent.querySelector('.placeholder')) {
                                const div = document.createElement('div');
                                div.className = 'placeholder';
                                div.style.cssText = `width:100%;aspect-ratio:4/3;display:flex;align-items:center;justify-content:center;background:${getPlaceholderColor(asset.id)};color:white;font-size:28px;font-weight:700;`;
                                div.textContent = asset.originalName.charAt(0).toUpperCase();
                                parent.appendChild(div);
                              }
                            }}
                          />
                        </div>
                        <div
                          className="card-info-inner"
                          style={{
                            ...styles.cardInfo,
                            ...(isHovered ? styles.cardInfoExpanded : {}),
                          }}
                        >
                          <div style={styles.cardName}>{asset.originalName}</div>
                          <div style={styles.cardCategory}>{asset.category}</div>
                          <div
                            style={{
                              ...styles.cardDesc,
                              ...(isHovered ? styles.cardDescExpanded : {}),
                            }}
                          >
                            {asset.description}
                          </div>
                          <div
                            style={{
                              ...styles.cardTags,
                              ...(isHovered ? styles.cardTagsExpanded : {}),
                            }}
                          >
                            {asset.tags.map((tag) => (
                              <span key={tag} style={styles.cardTag}>
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div style={styles.cardBottom}>
                          <span
                            style={{
                              ...styles.downloadCount,
                              display: 'inline-flex',
                            }}
                            className={isBouncing ? 'bounce-anim' : ''}
                            key={`${asset.id}-${asset.downloadCount}`}
                          >
                            <span>⬇</span>
                            <span style={{ display: 'inline-block' }}>
                              {asset.downloadCount}
                            </span>
                          </span>
                          <button
                            className="download-btn"
                            style={styles.downloadBtn}
                            onClick={(e) => handleDownload(e, asset)}
                          >
                            下载
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showUploadModal && (
        <div
          style={styles.modalOverlay}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowUploadModal(false);
              resetUploadForm();
            }
          }}
        >
          <div style={styles.modal}>
            <div style={styles.modalTitle}>上传素材</div>

            <div style={styles.formGroup}>
              <label style={styles.formLabel}>选择文件</label>
              {uploadFile ? (
                <div style={styles.selectedFile}>
                  📎 {uploadFile.name}
                  <span style={{ fontSize: 11, color: '#9CA3AF' }}>
                    ({formatSize(uploadFile.size)})
                  </span>
                </div>
              ) : (
                <div
                  style={styles.fileDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div style={styles.fileDropText}>点击选择文件</div>
                  <div style={styles.fileDropHint}>
                    支持 PNG、JPG、SVG，单文件不超过 10MB
                  </div>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".png,.jpg,.jpeg,.svg"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.formLabel}>分类</label>
              <select
                style={styles.formSelect}
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value)}
              >
                <option value="图标">图标</option>
                <option value="插画">插画</option>
                <option value="UI组件">UI组件</option>
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.formLabel}>标签（用逗号分隔）</label>
              <input
                style={styles.formInput}
                type="text"
                placeholder="例如：品牌色, 界面元素"
                value={uploadTags}
                onChange={(e) => setUploadTags(e.target.value)}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.formLabel}>描述</label>
              <input
                style={styles.formInput}
                type="text"
                placeholder="简要描述素材用途"
                value={uploadDescription}
                onChange={(e) => setUploadDescription(e.target.value)}
              />
            </div>

            {uploading && (
              <>
                <div style={styles.progressBar}>
                  <div
                    className="progress-fill"
                    style={{
                      ...styles.progressBarFill,
                      width: `${uploadProgress}%`,
                    }}
                  />
                </div>
                <div style={styles.progressPercent}>
                  上传进度：{uploadProgress}%
                </div>
              </>
            )}

            <div style={styles.modalActions}>
              <button
                className="cancel-btn"
                style={styles.cancelBtn}
                onClick={() => {
                  setShowUploadModal(false);
                  resetUploadForm();
                }}
                disabled={uploading}
              >
                取消
              </button>
              <button
                className="submit-btn"
                style={{
                  ...styles.submitBtn,
                  ...(!uploadFile || uploading ? styles.submitBtnDisabled : {}),
                }}
                onClick={handleUploadSubmit}
                disabled={!uploadFile || uploading}
              >
                {uploading ? `上传中 ${uploadProgress}%` : '确认上传'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          style={{
            ...styles.toast,
            ...(toast.type === 'success' ? styles.toastSuccess : styles.toastError),
          }}
        >
          {toast.type === 'success' ? '✅ ' : '❌ '}
          {toast.message}
        </div>
      )}
    </>
  );
}

export default App;
