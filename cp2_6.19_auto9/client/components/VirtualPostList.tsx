import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Post, Tag } from '../types';
import PostCard from './PostCard';

interface VirtualPostListProps {
  posts: Post[];
  tags: Tag[];
  onSelectPost: (post: Post) => void;
  onToggleTop: (postId: string) => void;
  onToggleFeatured: (postId: string) => void;
  isAdmin?: boolean;
  itemHeight?: number;
  overscan?: number;
  threshold?: number;
}

const VirtualPostList: React.FC<VirtualPostListProps> = ({
  posts,
  tags,
  onSelectPost,
  onToggleTop,
  onToggleFeatured,
  isAdmin = true,
  itemHeight = 140,
  overscan = 5,
  threshold = 30
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  const useVirtualScroll = posts.length > threshold;

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !useVirtualScroll) return;

    const updateHeight = () => {
      setContainerHeight(container.clientHeight);
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, [useVirtualScroll]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const renderPosts = () => {
    if (!useVirtualScroll) {
      return posts.map(post => (
        <PostCard
          key={post.id}
          post={post}
          tags={tags}
          onSelect={onSelectPost}
          onToggleTop={onToggleTop}
          onToggleFeatured={onToggleFeatured}
          isAdmin={isAdmin}
        />
      ));
    }

    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      posts.length,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );

    const visiblePosts = posts.slice(startIndex, endIndex);
    const totalHeight = posts.length * itemHeight;
    const offsetY = startIndex * itemHeight;

    return (
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visiblePosts.map((post, index) => (
            <div
              key={post.id}
              style={{
                height: itemHeight,
                position: 'absolute',
                top: index * itemHeight,
                left: 0,
                right: 0
              }}
            >
              <PostCard
                post={post}
                tags={tags}
                onSelect={onSelectPost}
                onToggleTop={onToggleTop}
                onToggleFeatured={onToggleFeatured}
                isAdmin={isAdmin}
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className="post-list"
      onScroll={handleScroll}
    >
      {posts.length === 0 ? (
        <div className="post-list__empty">
          暂无帖子，快来发布第一篇吧～
        </div>
      ) : (
        renderPosts()
      )}
      
      {useVirtualScroll && (
        <div className="post-list__hint">
          共 {posts.length} 条帖子（虚拟滚动已启用）
        </div>
      )}
    </div>
  );
};

export default VirtualPostList;
