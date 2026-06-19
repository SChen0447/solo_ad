import React, { useState, useEffect } from 'react';
import { Post, Tag } from './types';
import TagNav from './components/TagNav';
import PostForm from './components/PostForm';
import VirtualPostList from './components/VirtualPostList';
import PostDetail from './components/PostDetail';
import Sidebar from './components/Sidebar';

const App: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin] = useState(true);
  const [sortMode, setSortMode] = useState<'latest' | 'hot'>('latest');

  useEffect(() => {
    fetchTags();
    fetchPosts();
  }, [selectedTag, sortMode]);

  const fetchTags = async () => {
    try {
      const response = await fetch('/api/tags');
      const data = await response.json();
      setTags(data);
    } catch (error) {
      console.error('获取标签失败:', error);
    }
  };

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedTag) params.set('tag', selectedTag);
      if (sortMode === 'hot') params.set('sort', 'hot');
      const query = params.toString();
      const url = query ? `/api/posts?${query}` : '/api/posts';
      const response = await fetch(url);
      const data = await response.json();
      setPosts(data);
    } catch (error) {
      console.error('获取帖子失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async (title: string, content: string, tag: string, author: string) => {
    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title, content, tag, author })
      });
      
      if (response.ok) {
        const newPost = await response.json();
        if (!selectedTag || newPost.tag === selectedTag) {
          setPosts(prev => {
            const updated = [newPost, ...prev];
            updated.sort((a, b) => {
              if (a.isTop !== b.isTop) return b.isTop ? 1 : -1;
              return b.createdAt - a.createdAt;
            });
            return updated;
          });
        }
      }
    } catch (error) {
      console.error('创建帖子失败:', error);
    }
  };

  const handleToggleTop = async (postId: string) => {
    try {
      const response = await fetch(`/api/posts/${postId}/top`, {
        method: 'PUT'
      });
      
      if (response.ok) {
        const updatedPost = await response.json();
        setPosts(prev => {
          const updated = prev.map(p => p.id === postId ? updatedPost : p);
          updated.sort((a, b) => {
            if (a.isTop !== b.isTop) return b.isTop ? 1 : -1;
            return b.createdAt - a.createdAt;
          });
          return updated;
        });
        
        if (selectedPost?.id === postId) {
          setSelectedPost(updatedPost);
        }
      }
    } catch (error) {
      console.error('切换置顶失败:', error);
    }
  };

  const handleToggleFeatured = async (postId: string) => {
    try {
      const response = await fetch(`/api/posts/${postId}/featured`, {
        method: 'PUT'
      });
      
      if (response.ok) {
        const updatedPost = await response.json();
        setPosts(prev => prev.map(p => p.id === postId ? updatedPost : p));
        
        if (selectedPost?.id === postId) {
          setSelectedPost(updatedPost);
        }
      }
    } catch (error) {
      console.error('切换加精失败:', error);
    }
  };

  const handleSelectTag = (tagId: string | null) => {
    setSelectedTag(tagId);
    setSelectedPost(null);
  };

  const handleSortChange = (mode: 'latest' | 'hot') => {
    setSortMode(mode);
    setSelectedPost(null);
  };

  const handleSelectPost = (post: Post) => {
    setSelectedPost(post);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToList = () => {
    setSelectedPost(null);
  };

  const handleSidebarTagClick = (tagId: string) => {
    setSelectedTag(tagId);
    setSelectedPost(null);
  };

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__header-inner">
          <div className="app__logo">
            <span className="app__logo-icon">💬</span>
            <h1 className="app__title">员工论坛</h1>
          </div>
          <div className="app__user">
            <div className="user-avatar">
              <span>当</span>
            </div>
            <span className="user-name">当前用户</span>
          </div>
        </div>
      </header>

      <main className="app__main">
        <div className="app__content">
          <section className="app__main-content">
            {!selectedPost ? (
              <>
                <PostForm tags={tags} onSubmit={handleCreatePost} />
                <TagNav 
                  tags={tags} 
                  selectedTag={selectedTag} 
                  onSelectTag={handleSelectTag}
                  sortMode={sortMode}
                  onSortChange={handleSortChange}
                />
                {loading ? (
                  <div className="loading">加载中...</div>
                ) : (
                  <VirtualPostList
                    posts={posts}
                    tags={tags}
                    onSelectPost={handleSelectPost}
                    onToggleTop={handleToggleTop}
                    onToggleFeatured={handleToggleFeatured}
                    isAdmin={isAdmin}
                  />
                )}
              </>
            ) : (
              <PostDetail
                post={selectedPost}
                tags={tags}
                onBack={handleBackToList}
                onToggleTop={handleToggleTop}
                onToggleFeatured={handleToggleFeatured}
                isAdmin={isAdmin}
              />
            )}
          </section>

          <aside className="app__sidebar">
            <Sidebar onTagClick={handleSidebarTagClick} />
          </aside>
        </div>
      </main>
    </div>
  );
};

export default App;
