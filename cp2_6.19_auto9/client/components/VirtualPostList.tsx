import React, { useRef, useEffect } from 'react';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
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
  const listRef = useRef<List>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = React.useState(600);
  const useVirtualScroll = posts.length > threshold;

  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const vh = window.innerHeight;
        const topOffset = containerRef.current.getBoundingClientRect().top;
        const maxHeight = vh - topOffset - 40;
        setContainerHeight(Math.max(400, Math.min(maxHeight, 700)));
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    
    const timeout = setTimeout(updateHeight, 100);
    
    return () => {
      window.removeEventListener('resize', updateHeight);
      clearTimeout(timeout);
    };
  }, []);

  const Row = ({ index, style }: ListChildComponentProps) => {
    const post = posts[index];
    return (
      <div style={style} className="virtual-list__item">
        <PostCard
          post={post}
          tags={tags}
          onSelect={onSelectPost}
          onToggleTop={onToggleTop}
          onToggleFeatured={onToggleFeatured}
          isAdmin={isAdmin}
        />
      </div>
    );
  };

  const renderPlainList = () => (
    <div className="post-list post-list--plain">
      {posts.map(post => (
        <PostCard
          key={post.id}
          post={post}
          tags={tags}
          onSelect={onSelectPost}
          onToggleTop={onToggleTop}
          onToggleFeatured={onToggleFeatured}
          isAdmin={isAdmin}
        />
      ))}
    </div>
  );

  const renderVirtualList = () => (
    <div ref={containerRef} className="post-list post-list--virtual">
      <List
        ref={listRef}
        height={containerHeight}
        itemCount={posts.length}
        itemSize={itemHeight}
        width="100%"
        overscanCount={overscan}
        className="virtual-list"
        itemData={posts}
      >
        {Row}
      </List>
      <div className="post-list__hint">
        共 {posts.length} 条帖子（虚拟滚动已启用）
      </div>
    </div>
  );

  if (posts.length === 0) {
    return (
      <div className="post-list__empty">
        暂无帖子，快来发布第一篇吧～
      </div>
    );
  }

  return useVirtualScroll ? renderVirtualList() : renderPlainList();
};

export default VirtualPostList;
