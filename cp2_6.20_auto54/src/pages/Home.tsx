import React, { useEffect, useState, useCallback, useRef } from 'react';
import { fetchItems, postItem, type Item } from '../api';
import ItemCard from '../components/ItemCard';

const PAGE_SIZE = 12;

const containerStyle: React.CSSProperties = {
  padding: '20px 24px',
  maxWidth: 1200,
  margin: '0 auto',
};

const waterfallStyle: React.CSSProperties = {
  columnCount: 4,
  columnGap: 12,
  '@media (max-width: 960px)': { columnCount: 3 },
  '@media (max-width: 640px)': { columnCount: 2 },
};

const fabStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: 32,
  right: 32,
  width: 56,
  height: 56,
  borderRadius: '50%',
  background: 'linear-gradient(135deg, #FF9F43, #FF6B35)',
  border: 'none',
  color: '#fff',
  fontSize: 28,
  cursor: 'pointer',
  boxShadow: '0 4px 16px rgba(255,107,53,0.35)',
  transition: 'transform 0.2s, box-shadow 0.2s',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 50,
};

const loadingStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: 24,
  color: '#999',
  fontSize: 14,
};

function getColumns(): number {
  const w = window.innerWidth;
  if (w < 640) return 2;
  if (w < 960) return 3;
  return 4;
}

export default function Home() {
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [columns, setColumns] = useState(getColumns());
  const loaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchItems()
      .then(setAllItems)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handleResize = () => setColumns(getColumns());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLoadMore = useCallback(() => {
    if (visibleCount < allItems.length) {
      setVisibleCount(prev => prev + PAGE_SIZE);
    }
  }, [visibleCount, allItems.length]);

  useEffect(() => {
    if (!loaderRef.current) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) handleLoadMore();
      },
      { threshold: 0.1 }
    );
    observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [handleLoadMore]);

  const visibleItems = allItems.slice(0, visibleCount);

  const distributeToColumns = (items: Item[], colCount: number): Item[][] => {
    const cols: Item[][] = Array.from({ length: colCount }, () => []);
    items.forEach((item, i) => cols[i % colCount].push(item));
    return cols;
  };

  const colData = distributeToColumns(visibleItems, columns);

  const handlePostItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = {
      title: (form.elements.namedItem('title') as HTMLInputElement).value,
      description: (form.elements.namedItem('description') as HTMLInputElement).value,
      imageUrl: (form.elements.namedItem('imageUrl') as HTMLInputElement).value,
      condition: (form.elements.namedItem('condition') as HTMLInputElement).value,
      ownerId: 'user1',
      ownerName: '小王',
      ownerAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix',
    };
    try {
      const newItem = await postItem(data);
      setAllItems(prev => [newItem, ...prev]);
      setShowForm(false);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '80px 24px 20px', maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: 40, animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <style>{`
        .wf-col { display: flex; flexDirection: column; gap: 12px; flex: 1; }
        @media (max-width: 640px) { .wf-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (min-width: 641px) and (max-width: 960px) { .wf-grid { grid-template-columns: repeat(3, 1fr) !important; } }
      `}</style>
      <div
        className="wf-grid"
        style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: 12, alignItems: 'start' }}
      >
        {colData.map((col, ci) => (
          <div className="wf-col" key={ci}>
            {col.map(item => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        ))}
      </div>
      <div ref={loaderRef} style={loadingStyle}>
        {visibleCount < allItems.length && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
            加载更多...
          </div>
        )}
      </div>

      {showForm && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
          }}
          onClick={() => setShowForm(false)}
        >
          <form
            onClick={e => e.stopPropagation()}
            onSubmit={handlePostItem}
            style={{
              background: '#fff', borderRadius: 16, padding: 24, width: 400, maxWidth: '90vw',
              display: 'flex', flexDirection: 'column', gap: 12,
            }}
          >
            <h3 style={{ margin: 0, color: '#FF6B35' }}>发布闲置物品</h3>
            <input name="title" placeholder="物品名称" required style={inputStyle} />
            <textarea name="description" placeholder="物品描述" required rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
            <input name="imageUrl" placeholder="图片URL（选填）" style={inputStyle} />
            <select name="condition" style={inputStyle}>
              <option value="全新">全新</option>
              <option value="九成新">九成新</option>
              <option value="八成新">八成新</option>
              <option value="七成新">七成新</option>
              <option value="六成新">六成新</option>
            </select>
            <button type="submit" style={submitBtnStyle}>发布</button>
          </form>
        </div>
      )}

      <button
        style={fabStyle}
        onClick={() => setShowForm(true)}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
      >
        +
      </button>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid #E0D5C5',
  fontSize: 14,
  outline: 'none',
  fontFamily: 'inherit',
};

const submitBtnStyle: React.CSSProperties = {
  padding: '10px 0',
  borderRadius: 8,
  border: 'none',
  background: 'linear-gradient(135deg, #FF9F43, #FF6B35)',
  color: '#fff',
  fontSize: 15,
  fontWeight: 600,
  cursor: 'pointer',
};
