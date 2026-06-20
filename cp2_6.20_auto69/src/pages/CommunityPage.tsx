import React, { useState, useEffect } from 'react';
import { Post, Comment } from '../types';
import { getPosts, addPost, likePost, savePost, addComment } from '../api';

const formatRelativeTime = (isoTime: string): string => {
  const diff = Date.now() - new Date(isoTime).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  return `${days}天前`;
};

const CommunityPage: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [showNewPost, setShowNewPost] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [commentText, setCommentText] = useState('');
  const [focusSearch, setFocusSearch] = useState(false);

  useEffect(() => {
    getPosts().then(setPosts).catch(console.error);
  }, []);

  const handleAddPost = async () => {
    if (!newContent.trim()) return;
    const post = await addPost({ author: '植物爱好者', avatar: '', content: newContent });
    setPosts(prev => [post, ...prev]);
    setNewContent('');
    setShowNewPost(false);
  };

  const handleLike = async (id: string) => {
    const updated = await likePost(id);
    setPosts(prev => prev.map(p => p.id === id ? updated : p));
    if (selectedPost?.id === id) setSelectedPost(updated);
  };

  const handleSave = async (id: string) => {
    const updated = await savePost(id);
    setPosts(prev => prev.map(p => p.id === id ? updated : p));
    if (selectedPost?.id === id) setSelectedPost(updated);
  };

  const handleComment = async () => {
    if (!commentText.trim() || !selectedPost) return;
    const comment = await addComment(selectedPost.id, { author: '植物爱好者', avatar: '', content: commentText });
    const updatedPost = { ...selectedPost, comments: [comment, ...selectedPost.comments] };
    setSelectedPost(updatedPost);
    setPosts(prev => prev.map(p => p.id === selectedPost.id ? updatedPost : p));
    setCommentText('');
  };

  const filteredPosts = posts.filter(p =>
    p.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ padding: '16px' }}>
      <h2 style={{ color: '#2E7D32', marginBottom: 16, fontSize: 22 }}>💬 花友社区</h2>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
        <button
          onClick={() => setShowNewPost(true)}
          style={{
            padding: '8px 16px', borderRadius: 6, background: '#fff', border: '1px solid #43A047',
            color: '#43A047', cursor: 'pointer', fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap',
          }}
        >
          ✏️ 发帖
        </button>
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onFocus={() => setFocusSearch(true)}
            onBlur={() => setFocusSearch(false)}
            placeholder="搜索帖子..."
            style={{
              width: '100%', padding: '8px 36px 8px 12px', borderRadius: 6,
              border: `1px solid ${focusSearch ? '#43A047' : '#C8E6C9'}`,
              fontSize: 13, outline: 'none',
              transition: 'border-color 0.2s',
            }}
          />
          <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#999', fontSize: 14 }}>🔍</span>
        </div>
      </div>

      {filteredPosts.map(post => (
        <div
          key={post.id}
          onClick={() => setSelectedPost(post)}
          style={{
            background: '#fff', borderRadius: 8, padding: '12px 16px', marginBottom: 10,
            cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            display: 'flex', gap: 12,
          }}
        >
          <img
            src={post.avatar || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect fill="%23C8E6C9" width="40" height="40"/><text x="20" y="26" text-anchor="middle" fill="%2343A047" font-size="18">👤</text></svg>'}
            alt=""
            style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid #E0E0E0', flexShrink: 0 }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#333' }}>{post.author}</span>
              <span style={{ fontSize: 11, color: '#999' }}>{formatRelativeTime(post.time)}</span>
            </div>
            <div style={{
              fontSize: 13, color: '#555', lineHeight: 1.5,
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {post.content}
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
              <button onClick={e => { e.stopPropagation(); handleLike(post.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: post.liked ? '#43A047' : '#999', transition: 'transform 0.2s', padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span>{post.liked ? '❤️' : '🤍'}</span> {post.likes}
              </button>
              <span style={{ fontSize: 13, color: '#999', display: 'flex', alignItems: 'center', gap: 4 }}>💬 {post.comments.length}</span>
              <button onClick={e => { e.stopPropagation(); handleSave(post.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: post.saved ? '#FF9800' : '#999', padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span>{post.saved ? '⭐' : '☆'}</span>
              </button>
            </div>
          </div>
        </div>
      ))}

      {showNewPost && (
        <div
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowNewPost(false)}
        >
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, padding: 24, width: 380, maxWidth: '90vw', animation: 'scaleIn 0.25s ease-out' }}>
            <h3 style={{ color: '#2E7D32', marginBottom: 16 }}>发表新帖</h3>
            <textarea
              value={newContent}
              onChange={e => setNewContent(e.target.value)}
              placeholder="分享你的养护心得..."
              style={{ width: '100%', height: 120, padding: 12, borderRadius: 8, border: '1px solid #C8E6C9', fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
            />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 12 }}>
              <button onClick={() => setShowNewPost(false)} style={{ padding: '8px 20px', borderRadius: 6, border: '1px solid #ccc', background: '#fff', cursor: 'pointer' }}>取消</button>
              <button onClick={handleAddPost} style={{ padding: '8px 20px', borderRadius: 6, border: 'none', background: '#43A047', color: '#fff', cursor: 'pointer' }}>发布</button>
            </div>
          </div>
        </div>
      )}

      {selectedPost && (
        <div
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: '#fff', zIndex: 200, animation: 'slideRight 0.3s ease-out', display: 'flex', flexDirection: 'column' }}
        >
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #E0E0E0', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <button onClick={() => setSelectedPost(null)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#666' }}>←</button>
            <span style={{ fontWeight: 600, color: '#333' }}>帖子详情</span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <img
                src={selectedPost.avatar || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect fill="%23C8E6C9" width="40" height="40"/><text x="20" y="26" text-anchor="middle" fill="%2343A047" font-size="18">👤</text></svg>'}
                alt=""
                style={{ width: 40, height: 40, borderRadius: '50%', border: '1px solid #E0E0E0' }}
              />
              <div>
                <div style={{ fontWeight: 600, color: '#333', fontSize: 15 }}>{selectedPost.author}</div>
                <div style={{ fontSize: 12, color: '#999' }}>{formatRelativeTime(selectedPost.time)}</div>
              </div>
            </div>

            <p style={{ fontSize: 15, lineHeight: 1.8, color: '#333', marginBottom: 16 }}>{selectedPost.content}</p>

            <div style={{ display: 'flex', gap: 16, marginBottom: 20, padding: '8px 0', borderTop: '1px solid #f0f0f0', borderBottom: '1px solid #f0f0f0' }}>
              <button onClick={() => handleLike(selectedPost.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: selectedPost.liked ? '#43A047' : '#999', display: 'flex', alignItems: 'center', gap: 4 }}>
                {selectedPost.liked ? '❤️' : '🤍'} {selectedPost.likes}
              </button>
              <button onClick={() => handleSave(selectedPost.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: selectedPost.saved ? '#FF9800' : '#999', display: 'flex', alignItems: 'center', gap: 4 }}>
                {selectedPost.saved ? '⭐' : '☆'} 收藏
              </button>
            </div>

            <h4 style={{ color: '#333', marginBottom: 12 }}>评论 ({selectedPost.comments.length})</h4>
            {selectedPost.comments.map((cm, i) => (
              <div
                key={cm.id}
                style={{
                  display: 'flex', gap: 10, marginBottom: 12,
                  animation: i === 0 ? 'fadeIn 0.3s ease-out' : 'none',
                }}
              >
                <img
                  src={cm.avatar || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect fill="%23C8E6C9" width="40" height="40"/><text x="20" y="26" text-anchor="middle" fill="%2343A047" font-size="18">👤</text></svg>'}
                  alt=""
                  style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid #E0E0E0', flexShrink: 0 }}
                />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>{cm.author} <span style={{ fontWeight: 400, color: '#999', fontSize: 11 }}>{formatRelativeTime(cm.time)}</span></div>
                  <div style={{ fontSize: 13, color: '#555', lineHeight: 1.5 }}>{cm.content}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ padding: '8px 16px', borderTop: '1px solid #E0E0E0', display: 'flex', gap: 8, flexShrink: 0, background: '#fff' }}>
            <textarea
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder="写评论..."
              rows={1}
              style={{
                flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #E0E0E0',
                fontSize: 14, outline: 'none', resize: 'none', fontFamily: 'inherit',
                maxHeight: 96, minHeight: 36,
                transition: 'height 0.2s',
              }}
              onInput={e => {
                const t = e.target as HTMLTextAreaElement;
                t.style.height = 'auto';
                t.style.height = Math.min(t.scrollHeight, 96) + 'px';
              }}
            />
            <button
              onClick={handleComment}
              style={{
                padding: '8px 16px', borderRadius: 8, border: 'none',
                background: commentText.trim() ? '#43A047' : '#C8E6C9',
                color: '#fff', cursor: commentText.trim() ? 'pointer' : 'default',
                fontSize: 14, alignSelf: 'flex-end',
              }}
            >
              发送
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes scaleIn {
          from { transform: scale(0.7); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes slideRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default CommunityPage;
