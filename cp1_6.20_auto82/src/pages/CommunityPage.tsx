import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { postAPI, uploadAPI } from '../api';

interface PostAuthor {
  id: number;
  nickname: string;
  avatar: string;
}

interface PostData {
  id: number;
  content: string;
  images: string[];
  created_at: string;
  author: PostAuthor;
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
}

interface CommentData {
  id: number;
  content: string;
  created_at: string;
  user: PostAuthor;
}

const ImageWithPlaceholder: React.FC<{ src: string; alt: string }> = ({ src, alt }) => {
  const [loaded, setLoaded] = useState(false);
  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '8px' }}>
      <div
        style={{
          background: 'var(--placeholder)',
          transition: 'opacity 0.5s ease',
          opacity: loaded ? 0 : 1,
          position: 'absolute',
          inset: 0,
        }}
      />
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        style={{
          width: '100%',
          display: 'block',
          opacity: loaded ? 1 : 0,
          transition: 'opacity 0.5s ease',
        }}
      />
    </div>
  );
};

export default function CommunityPage() {
  const [posts, setPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showNewPost, setShowNewPost] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newImages, setNewImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Record<number, CommentData[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<number, string>>({});
  const [commentSubmitting, setCommentSubmitting] = useState<Record<number, boolean>>({});
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const loadMoreRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loading) return;
      if (observerRef.current) observerRef.current.disconnect();
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setPage((prev) => prev + 1);
        }
      });
      if (node) observerRef.current.observe(node);
    },
    [loading, hasMore]
  );

  const fetchPosts = async (pageNum: number, reset = false) => {
    try {
      setLoading(true);
      const res = await postAPI.getPosts({ page: pageNum, per_page: 10 });
      const newPosts = res.data.posts;
      setPosts((prev) => (reset ? newPosts : [...prev, ...newPosts]));
      setHasMore(pageNum < res.data.pages);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts(1, true);
  }, []);

  useEffect(() => {
    if (page > 1) fetchPosts(page);
  }, [page]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 5 * 1024 * 1024) {
        setToast({ message: '图片不能超过5MB', type: 'error' });
        continue;
      }
      try {
        const canvas = document.createElement('canvas');
        const img = new Image();
        img.src = URL.createObjectURL(file);
        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
        });
        const maxWidth = 800;
        let w = img.width;
        let h = img.height;
        if (w > maxWidth) {
          h = (h * maxWidth) / w;
          w = maxWidth;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          async (blob) => {
            if (!blob) return;
            const compressed = new File([blob], file.name, { type: 'image/jpeg' });
            try {
              const res = await uploadAPI.uploadFile(compressed);
              setNewImages((prev) => [...prev, res.data.url]);
            } catch {
              setToast({ message: '图片上传失败', type: 'error' });
            }
          },
          'image/jpeg',
          0.8
        );
      } catch {
        setToast({ message: '图片处理失败', type: 'error' });
      }
    }
  };

  const handlePostSubmit = async () => {
    if (!newContent.trim() || submitting) return;
    if (newContent.length > 500) {
      setToast({ message: '内容不能超过500字', type: 'error' });
      return;
    }
    setSubmitting(true);
    try {
      await postAPI.createPost({ content: newContent.trim(), images: newImages });
      setNewContent('');
      setNewImages([]);
      setShowNewPost(false);
      setToast({ message: '发布成功！', type: 'success' });
      fetchPosts(1, true);
    } catch (err: any) {
      setToast({ message: err.response?.data?.error || '发布失败', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (postId: number) => {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/login';
      return;
    }
    try {
      const res = await postAPI.toggleLike(postId);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, is_liked: res.data.liked, likes_count: res.data.likes_count }
            : p
        )
      );
    } catch {}
  };

  const handleLoadComments = async (postId: number) => {
    try {
      const res = await postAPI.getComments(postId);
      setExpandedComments((prev) => ({ ...prev, [postId]: res.data.comments }));
    } catch {}
  };

  const handleAddComment = async (postId: number) => {
    const content = commentInputs[postId]?.trim();
    if (!content) return;
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/login';
      return;
    }
    setCommentSubmitting((prev) => ({ ...prev, [postId]: true }));
    try {
      const res = await postAPI.addComment(postId, content);
      setExpandedComments((prev) => ({
        ...prev,
        [postId]: [res.data, ...(prev[postId] || [])],
      }));
      setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p
        )
      );
    } catch {
    } finally {
      setCommentSubmitting((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return '刚刚';
    if (mins < 60) return `${mins}分钟前`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}小时前`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}天前`;
    return d.toLocaleDateString('zh-CN');
  };

  return (
    <div className="page-content">
      <div className="container" style={{ maxWidth: '800px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 className="section-title" style={{ marginBottom: 0 }}>社区动态</h1>
          <button className="btn btn-primary btn-sm" onClick={() => setShowNewPost(true)}>
            ✏️ 发布动态
          </button>
        </div>

        <AnimatePresence>
          {showNewPost && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                background: 'var(--bg-white)', borderRadius: '12px',
                padding: '20px', marginBottom: '24px',
                boxShadow: '0 2px 8px #e0e0e0', overflow: 'hidden',
              }}
            >
              <textarea
                value={newContent}
                onChange={(e) => {
                  if (e.target.value.length <= 500) setNewContent(e.target.value);
                }}
                placeholder="分享你和宠物的日常..."
                rows={4}
                style={{
                  width: '100%', border: '1.5px solid var(--border)',
                  borderRadius: '8px', padding: '12px', fontSize: '14px',
                  resize: 'vertical', marginBottom: '8px',
                  fontFamily: 'inherit',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <label style={{
                    cursor: 'pointer', padding: '6px 12px',
                    background: 'var(--bg)', borderRadius: '6px',
                    fontSize: '13px', color: 'var(--text-light)',
                  }}>
                    📷 添加图片
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      style={{ display: 'none' }}
                    />
                  </label>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {500 - newContent.length} 字剩余
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-outline btn-sm" onClick={() => { setShowNewPost(false); setNewContent(''); setNewImages([]); }}>
                    取消
                  </button>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={handlePostSubmit}
                    disabled={!newContent.trim() || submitting}
                  >
                    {submitting ? '发布中...' : '发布'}
                  </button>
                </div>
              </div>
              {newImages.length > 0 && (
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                  {newImages.map((img, idx) => (
                    <div key={idx} style={{ position: 'relative' }}>
                      <img src={img} alt="" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px' }} />
                      <button
                        onClick={() => setNewImages((prev) => prev.filter((_, i) => i !== idx))}
                        style={{
                          position: 'absolute', top: '-6px', right: '-6px',
                          width: '20px', height: '20px', borderRadius: '50%',
                          background: 'rgba(0,0,0,0.6)', color: 'white',
                          fontSize: '12px', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', border: 'none', cursor: 'pointer',
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {posts.length === 0 && !loading && (
          <div className="empty-state">
            <p>📝 暂无动态，来发布第一条吧！</p>
          </div>
        )}

        <div className="masonry">
          {posts.map((post) => (
            <div key={post.id} className="masonry-item">
              <div style={{
                background: 'var(--bg-white)', borderRadius: '12px',
                padding: '20px', boxShadow: '0 2px 8px #e0e0e0',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    background: 'var(--primary-light)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontWeight: 600, fontSize: '14px', flexShrink: 0,
                  }}>
                    {post.author.nickname[0]}
                  </div>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 600 }}>{post.author.nickname}</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{formatTime(post.created_at)}</p>
                  </div>
                </div>

                <p style={{ fontSize: '14px', lineHeight: 1.8, marginBottom: '12px', color: 'var(--text)' }}>
                  {post.content}
                </p>

                {post.images.length > 0 && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: post.images.length === 1 ? '1fr' : 'repeat(2, 1fr)',
                    gap: '8px', marginBottom: '12px',
                  }}>
                    {post.images.map((img, idx) => (
                      <ImageWithPlaceholder key={idx} src={img} alt={`post-${post.id}-${idx}`} />
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                  <motion.button
                    onClick={() => handleLike(post.id)}
                    whileTap={{ scale: 0.9 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '4px',
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: '13px', color: post.is_liked ? '#1e90ff' : 'var(--text-muted)',
                      transition: 'color 0.2s',
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill={post.is_liked ? '#1e90ff' : 'none'} stroke={post.is_liked ? '#1e90ff' : 'currentColor'} strokeWidth="2">
                      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                    </svg>
                    {post.likes_count}
                  </motion.button>
                  <button
                    onClick={() => handleLoadComments(post.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '4px',
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: '13px', color: 'var(--text-muted)',
                    }}
                  >
                    💬 {post.comments_count}
                  </button>
                </div>

                {expandedComments[post.id] !== undefined && (
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                    {expandedComments[post.id].map((comment) => (
                      <div key={comment.id} style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                        <div style={{
                          width: '28px', height: '28px', borderRadius: '50%',
                          background: 'var(--primary-light)', display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                          color: 'white', fontSize: '11px', fontWeight: 600, flexShrink: 0,
                        }}>
                          {comment.user.nickname[0]}
                        </div>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, marginRight: '6px' }}>
                            {comment.user.nickname}
                          </span>
                          <span style={{ fontSize: '13px', color: 'var(--text-light)' }}>
                            {comment.content}
                          </span>
                          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {formatTime(comment.created_at)}
                          </p>
                        </div>
                      </div>
                    ))}

                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      <input
                        value={commentInputs[post.id] || ''}
                        onChange={(e) => setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))}
                        placeholder="写评论..."
                        style={{
                          flex: 1, padding: '8px 12px', border: '1.5px solid var(--border)',
                          borderRadius: '20px', fontSize: '13px',
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddComment(post.id);
                        }}
                      />
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleAddComment(post.id)}
                        disabled={!commentInputs[post.id]?.trim() || commentSubmitting[post.id]}
                        style={{ borderRadius: '20px', padding: '6px 16px' }}
                      >
                        发送
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div ref={loadMoreRef} style={{ height: '40px', margin: '20px 0' }}>
          {loading && <div className="loading-spinner" />}
        </div>
      </div>

      {toast && (
        <div className={`toast toast-${toast.type}`} onClick={() => setToast(null)}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
