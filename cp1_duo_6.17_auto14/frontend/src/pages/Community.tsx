import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { notesAPI } from '../utils/api';
import NoteCard from '../components/NoteCard';
import type { Note } from '../types';
import './Community.scss';

function Community() {
  const [searchParams] = useSearchParams();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showNewNoteModal, setShowNewNoteModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (searchParams.get('beanId')) {
      setShowNewNoteModal(true);
    }
  }, [searchParams]);

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    setLoading(true);
    try {
      const data = await notesAPI.getAll({ page: 1, limit: 10 });
      setNotes(data.notes || []);
      setHasMore((data.notes?.length || 0) >= 10);
      setPage(1);
    } catch (error) {
      console.error('Failed to load notes:', error);
      setNotes(mockNotes);
      setHasMore(true);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const data = await notesAPI.getAll({ page: nextPage, limit: 10 });
      const newNotes = data.notes || [];
      setNotes((prev) => [...prev, ...newNotes]);
      setHasMore(newNotes.length >= 10);
      setPage(nextPage);
    } catch (error) {
      console.error('Failed to load more notes:', error);
      const moreNotes = mockNotes.map((note, idx) => ({
        ...note,
        id: note.id + (page * 10) + idx,
      }));
      setNotes((prev) => [...prev, ...moreNotes]);
      setHasMore(page < 3);
      setPage((p) => p + 1);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadNotes();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleLike = async (noteId: number) => {
    try {
      const result = await notesAPI.like(noteId);
      setNotes((prev) =>
        prev.map((note) =>
          note.id === noteId
            ? { ...note, is_liked: result.liked, likes_count: result.likes_count }
            : note
        )
      );
    } catch (error) {
      console.error('Failed to like note:', error);
      setNotes((prev) =>
        prev.map((note) =>
          note.id === noteId
            ? {
                ...note,
                is_liked: !note.is_liked,
                likes_count: note.likes_count + (note.is_liked ? -1 : 1),
              }
            : note
        )
      );
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    if (target.scrollTop + target.clientHeight >= target.scrollHeight - 100) {
      loadMore();
    }
  };

  return (
    <div className="community-page">
      <div className="community-page__header">
        <div>
          <h1 className="community-page__title">风味社区</h1>
          <p className="community-page__subtitle">分享你的品鉴心得，发现更多风味可能</p>
        </div>
        <button className="btn btn--primary" onClick={() => setShowNewNoteModal(true)}>
          ✍️ 写笔记
        </button>
      </div>

      <div className="refresh-section">
        <button
          className={`refresh-btn ${isRefreshing ? 'refresh-btn--spinning' : ''}`}
          onClick={handleRefresh}
          disabled={isRefreshing || loading}
        >
          <span className="refresh-btn__icon">⟳</span>
          <span>刷新</span>
        </button>
      </div>

      <div
        className="notes-feed"
        ref={containerRef}
        onScroll={handleScroll}
      >
        {loading ? (
          <div className="notes-skeleton">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="skeleton-note">
                <div className="skeleton-note__header">
                  <div className="skeleton-avatar" />
                  <div className="skeleton-note__header-lines">
                    <div className="skeleton-line skeleton-line--title" />
                    <div className="skeleton-line skeleton-line--short" />
                  </div>
                </div>
                <div className="skeleton-note__body">
                  <div className="skeleton-line" />
                  <div className="skeleton-line" />
                  <div className="skeleton-line skeleton-line--short" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {notes.map((note) => (
              <NoteCard key={note.id} note={note} onLike={handleLike} />
            ))}

            {loadingMore && (
              <div className="loading-more">
                <div className="loading-spinner" />
                <span>加载中...</span>
              </div>
            )}

            {!hasMore && notes.length > 0 && (
              <div className="no-more">
                <span>— 已经到底啦 —</span>
              </div>
            )}
          </>
        )}
      </div>

      {showNewNoteModal && (
        <NoteEditorModal
          onClose={() => setShowNewNoteModal(false)}
          onSubmit={() => {
            setShowNewNoteModal(false);
            loadNotes();
          }}
          preselectedBeanId={searchParams.get('beanId') ? Number(searchParams.get('beanId')) : undefined}
        />
      )}
    </div>
  );
}

function NoteEditorModal({
  onClose,
  onSubmit,
  preselectedBeanId,
}: {
  onClose: () => void;
  onSubmit: () => void;
  preselectedBeanId?: number;
}) {
  const [content, setContent] = useState('');
  const [previewMode, setPreviewMode] = useState(false);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [images, setImages] = useState<string[]>([]);
  const [flavorTags, setFlavorTags] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<HTMLDivElement>(null);

  const flavorOptions = ['高甜感', '明亮酸度', '醇厚', '花香明显', '坚果风味', '巧克力尾韵'];

  const handleImageUpload = (files: FileList | null) => {
    if (!files || images.length >= 3) return;
    
    const file = files[0];
    if (!file) return;

    setUploadProgress(0);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const maxWidth = 1200;
        
        if (img.width > maxWidth) {
          const ratio = maxWidth / img.width;
          canvas.width = maxWidth;
          canvas.height = img.height * ratio;
        } else {
          canvas.width = img.width;
          canvas.height = img.height;
        }
        
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressed = canvas.toDataURL('image/jpeg', 0.85);
        
        setImages((prev) => [...prev, compressed]);
        setUploadProgress(null);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);

    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setUploadProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
      }
    }, 50);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleImageUpload(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const toggleFlavorTag = (tag: string) => {
    setFlavorTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    onSubmit();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--editor" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h3 className="modal__title">写品鉴笔记</h3>
          <button className="modal__close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal__body">
          <div className="editor-rating">
            <span className="editor-rating__label">综合评分</span>
            <div className="star-rating-editor">
              {[...Array(10)].map((_, i) => {
                const starNum = i + 1;
                const isFilled = (hoverRating || rating) >= starNum;
                return (
                  <span
                    key={i}
                    className={`star-editor ${isFilled ? 'star-editor--filled' : ''}`}
                    onMouseEnter={() => setHoverRating(starNum)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(starNum)}
                  >
                    ★
                  </span>
                );
              })}
              <span className="star-rating-value">{rating}/10</span>
            </div>
          </div>

          <div className="editor-tabs">
            <button
              className={`editor-tab ${!previewMode ? 'editor-tab--active' : ''}`}
              onClick={() => setPreviewMode(false)}
            >
              编辑
            </button>
            <button
              className={`editor-tab ${previewMode ? 'editor-tab--active' : ''}`}
              onClick={() => setPreviewMode(true)}
            >
              预览
            </button>
          </div>

          {!previewMode ? (
            <textarea
              className="editor-textarea"
              placeholder="分享你的品鉴体验...
支持 Markdown 语法
**加粗** *斜体*
- 列表项"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          ) : (
            <div className="editor-preview">
              <div className="markdown-preview">
                {content.split('\n').map((line, i) => {
                  let processed = line
                    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*(.+?)\*/g, '<em>$1</em>')
                    .replace(/^- (.+)$/, '• $1');
                  return (
                    <p key={i} dangerouslySetInnerHTML={{ __html: processed || '&nbsp;' }} />
                  );
                })}
                {!content && <p className="preview-placeholder">预览区域</p>}
              </div>
            </div>
          )}

          <div className="editor-flavors">
            <span className="editor-flavors__label">风味感知</span>
            <div className="flavor-tags-editor">
              {flavorOptions.map((tag) => (
                <button
                  key={tag}
                  className={`flavor-tag-btn ${flavorTags.includes(tag) ? 'flavor-tag-btn--active' : ''}`}
                  onClick={() => toggleFlavorTag(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div
            className="editor-upload"
            ref={dragRef}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="editor-upload__icon">📷</div>
            <p className="editor-upload__text">拖拽图片到此处或点击上传</p>
            <p className="editor-upload__hint">最多3张，自动压缩至1200px</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => handleImageUpload(e.target.files)}
            />
            {images.length > 0 && (
              <div className="uploaded-images">
                {images.map((img, idx) => (
                  <div key={idx} className="uploaded-image">
                    <img src={img} alt="" />
                    <button
                      className="uploaded-image__remove"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage(idx);
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            {uploadProgress !== null && (
              <div className="upload-progress">
                <div
                  className="upload-progress__ring"
                  style={{
                    background: `conic-gradient(#8BC34A ${uploadProgress * 3.6}deg, #E0E0E0 0deg)`,
                  }}
                >
                  <div className="upload-progress__inner">
                    {uploadProgress}%
                  </div>
                </div>
              </div>
            )}
          </div>

          <button className="btn btn--primary btn--full" onClick={handleSubmit}>
            发布笔记
          </button>
        </div>
      </div>
    </div>
  );
}

const mockNotes: Note[] = [
  {
    id: 1,
    user_id: 1,
    bean_id: 1,
    content: '**耶加雪菲沃卡**真的太惊艳了！\n\n刚入口就能感受到明显的*茉莉花香*，中段是明亮的柑橘酸度，尾韵带着淡淡的蜂蜜甜感。\n\n- 冲煮方式：手冲\n- 水温：92°C\n- 粉水比：1:15',
    rating: 9,
    images: [],
    flavor_tags: ['高甜感', '明亮酸度', '花香明显'],
    likes_count: 42,
    is_liked: false,
    comments_count: 8,
    created_at: '2026-06-15 14:30',
    user: {
      id: 1,
      email: '',
      nickname: '咖啡控小明',
      avatar_color: '#FFB74D',
      total_spent: 0,
    },
    bean: {
      id: 1,
      name: '耶加雪菲 沃卡',
      origin: '埃塞俄比亚',
      process: '水洗',
      flavor_tags: [],
      avg_rating: 4.7,
      price: 128,
      image: '',
      description: '',
      roast_level: '浅烘',
    },
    comments: [
      {
        id: 1,
        user_id: 2,
        note_id: 1,
        content: '同意！耶加雪菲的花香真的很独特',
        created_at: '2026-06-15 15:00',
        user: {
          id: 2,
          email: '',
          nickname: '豆子猎人',
          avatar_color: '#81C784',
          total_spent: 0,
        },
      },
    ],
  },
  {
    id: 2,
    user_id: 2,
    bean_id: 3,
    content: '今天试了**慧兰粉波旁**，非常均衡的一款豆子。\n\n巧克力和坚果的风味很明显，酸度较低，适合喜欢醇厚口感的朋友。',
    rating: 8,
    images: [],
    flavor_tags: ['巧克力尾韵', '醇厚', '坚果风味'],
    likes_count: 28,
    is_liked: true,
    comments_count: 3,
    created_at: '2026-06-14 10:15',
    user: {
      id: 2,
      email: '',
      nickname: '豆子猎人',
      avatar_color: '#81C784',
      total_spent: 0,
    },
    bean: {
      id: 3,
      name: '慧兰 粉波旁',
      origin: '哥伦比亚',
      process: '水洗',
      flavor_tags: [],
      avg_rating: 4.5,
      price: 98,
      image: '',
      description: '',
      roast_level: '中烘',
    },
    comments: [],
  },
  {
    id: 3,
    user_id: 3,
    bean_id: 6,
    content: '**肯尼亚雅加GA1**的果酸太明亮了！\n\n黑醋栗和浆果的风味非常突出，余韵悠长。喜欢果酸的朋友一定要试试！',
    rating: 9,
    images: [],
    flavor_tags: ['明亮酸度', '花香明显'],
    likes_count: 35,
    is_liked: false,
    comments_count: 5,
    created_at: '2026-06-13 16:45',
    user: {
      id: 3,
      email: '',
      nickname: '酸系少女',
      avatar_color: '#F06292',
      total_spent: 0,
    },
    bean: {
      id: 6,
      name: '雅加 GA1',
      origin: '肯尼亚',
      process: '水洗',
      flavor_tags: [],
      avg_rating: 4.6,
      price: 138,
      image: '',
      description: '',
      roast_level: '浅中烘',
    },
    comments: [],
  },
];

export default Community;
