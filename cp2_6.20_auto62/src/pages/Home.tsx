import { useState, useEffect, useCallback, useRef } from 'react';
import ItemCard from '../components/ItemCard';
import { fetchItems, type Item } from '../api';

export default function Home() {
  const [items, setItems] = useState<Item[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadItems = useCallback(async (pageNum: number) => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetchItems(pageNum, 12);
      setItems(prev => pageNum === 1 ? res.items : [...prev, ...res.items]);
      setHasMore(res.hasMore);
    } catch (err) {
      console.error('Failed to load items:', err);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  useEffect(() => {
    loadItems(1);
  }, []);

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          const nextPage = page + 1;
          setPage(nextPage);
          loadItems(nextPage);
        }
      },
      { threshold: 0.1 }
    );

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [hasMore, loading, page, loadItems]);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">邻里闲置交换</h1>
      </div>
      <div className="masonry-grid">
        {items.map(item => (
          <ItemCard key={item.id} item={item} />
        ))}
      </div>
      {loading && <div className="loading-spinner" />}
      <div ref={sentinelRef} style={{ height: 1 }} />
      {!hasMore && items.length > 0 && (
        <div className="empty-state">没有更多物品了</div>
      )}
      {!loading && items.length === 0 && (
        <div className="empty-state">暂无物品，快来发布第一个吧！</div>
      )}
    </div>
  );
}
