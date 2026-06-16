import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getTags, getRecommendations, addToReadingList, Book } from '../api';
import { useGlobal } from '../App';
import BookCard from '../components/BookCard';

const TAG_COLORS = [
  'linear-gradient(135deg, #F5A623, #F7B94F)',
  'linear-gradient(135deg, #4A90D9, #6AA8E8)',
  'linear-gradient(135deg, #E8575C, #F07A7E)',
  'linear-gradient(135deg, #52C41A, #73D13D)',
  'linear-gradient(135deg, #9254DE, #B37FEB)',
  'linear-gradient(135deg, #13C2C2, #36CFC9)',
  'linear-gradient(135deg, #FA8C16, #FFA940)',
  'linear-gradient(135deg, #2F54EB, #597EF7)',
  'linear-gradient(135deg, #EB2F96, #F759AB)',
  'linear-gradient(135deg, #722ED1, #9254DE)'
];

export default function Home() {
  const { readingList, refreshReadingList, selectedTags, setSelectedTags, initialized } = useGlobal();
  const [allTags, setAllTags] = useState<string[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [modalBook, setModalBook] = useState<Book | null>(null);
  const [justAdded, setJustAdded] = useState<Set<number>>(new Set());
  const [firstTime, setFirstTime] = useState(true);

  useEffect(() => {
    getTags().then(tags => setAllTags(tags)).catch(() => {});
  }, []);

  const fetchRecommendations = async () => {
    if (selectedTags.length === 0) return;
    setLoading(true);
    try {
      const res = await getRecommendations(selectedTags, 6);
      setBooks(res.books);
      setFirstTime(false);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(selectedTags.includes(tag) ? selectedTags.filter(t => t !== tag) : [...selectedTags, tag]);
  };

  const handleAdd = async (book: Book) => {
    try {
      const res = await addToReadingList(book.id);
      if (res.success) {
        setJustAdded(prev => new Set(prev).add(book.id));
        setTimeout(() => {
          setJustAdded(prev => {
            const n = new Set(prev);
            n.delete(book.id);
            return n;
          });
        }, 2000);
        refreshReadingList();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredBooks = useMemo(() => {
    if (!activeFilter) return books;
    return books.filter(b => b.tags.includes(activeFilter));
  }, [books, activeFilter]);

  const inListIds = useMemo(() => new Set(readingList.map(b => b.id)), [readingList]);

  const containerVariants = {
    hidden: {},
    show: {
      transition: { staggerChildren: 0.07 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35 } }
  };

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ marginBottom: '28px' }}
      >
        <h1 style={{ fontSize: '30px', fontWeight: 700, color: '#222', marginBottom: '8px' }}>
          发现你的下一本好书
        </h1>
        <p style={{ fontSize: '15px', color: '#777' }}>
          选择感兴趣的标签，我们将为你量身推荐
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        style={{
          background: '#fff',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
          marginBottom: '28px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '17px', fontWeight: 600, color: '#333' }}>
            🎯 选择你的兴趣标签
            {selectedTags.length > 0 && (
              <span style={{ marginLeft: '10px', fontSize: '13px', color: '#F5A623', fontWeight: 500 }}>
                已选 {selectedTags.length} 个
              </span>
            )}
          </h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            {selectedTags.length > 0 && (
              <button
                onClick={() => setSelectedTags([])}
                style={{
                  padding: '7px 16px',
                  borderRadius: '8px',
                  border: '1px solid #e0dcd4',
                  background: '#fff',
                  color: '#666',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                清空
              </button>
            )}
            <button
              onClick={fetchRecommendations}
              disabled={selectedTags.length === 0 || loading}
              style={{
                padding: '7px 20px',
                borderRadius: '8px',
                border: 'none',
                background: selectedTags.length === 0 ? '#ccc' : 'linear-gradient(135deg, #F5A623, #F7B94F)',
                color: '#fff',
                cursor: selectedTags.length === 0 ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                fontWeight: 500
              }}
            >
              {loading ? '推荐中...' : '✨ 获取推荐'}
            </button>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '10px',
            overflowX: 'auto',
            paddingBottom: '4px'
          }}
          className="tag-cloud"
        >
          {allTags.map((tag, i) => {
            const selected = selectedTags.includes(tag);
            const bg = TAG_COLORS[i % TAG_COLORS.length];
            return (
              <motion.button
                key={tag}
                whileHover={{ scale: selected ? 1 : 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => toggleTag(tag)}
                style={{
                  padding: '9px 18px',
                  borderRadius: '24px',
                  border: selected ? '2px solid #F5A623' : '2px solid transparent',
                  background: selected ? bg : '#f5f0e6',
                  color: selected ? '#fff' : '#555',
                  fontSize: '14px',
                  fontWeight: selected ? 600 : 400,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: selected ? '0 4px 14px rgba(245,166,35,0.35)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                {selected && '✓ '}{tag}
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {firstTime && selectedTags.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: '#aaa'
          }}
        >
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>📚</div>
          <p style={{ fontSize: '16px' }}>请先选择至少一个兴趣标签，然后点击「获取推荐」</p>
        </motion.div>
      )}

      {!firstTime && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ marginBottom: '20px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#333' }}>
              📖 为你推荐
            </h2>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[null, ...books.flatMap(b => b.tags)].filter((v, i, a) => a.indexOf(v) === i).slice(0, 6).map(tag => (
                <button
                  key={tag || 'all'}
                  onClick={() => setActiveFilter(tag)}
                  style={{
                    padding: '5px 14px',
                    borderRadius: '16px',
                    border: 'none',
                    background: activeFilter === tag ? '#4A90D9' : '#fff',
                    color: activeFilter === tag ? '#fff' : '#666',
                    fontSize: '12px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                  }}
                >
                  {tag || '全部'}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '80px 0', color: '#F5A623' }}>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                style={{
                  width: 40,
                  height: 40,
                  border: '4px solid #F7B94F',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  margin: '0 auto 16px'
                }}
              />
              <p>正在为你挑选书籍...</p>
            </div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              key={filteredBooks.map(b => b.id).join(',')}
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: '24px'
              }}
            >
              <AnimatePresence>
                {filteredBooks.map(book => (
                  <motion.div key={book.id} variants={itemVariants} layout>
                    <BookCard
                      book={book}
                      inList={inListIds.has(book.id) || justAdded.has(book.id)}
                      onClick={() => setModalBook(book)}
                      onAdd={() => handleAdd(book)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}

          {!loading && filteredBooks.length === 0 && books.length > 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
              该分类下暂无推荐书籍
            </div>
          )}
        </motion.div>
      )}

      <AnimatePresence>
        {modalBook && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}
            onClick={() => setModalBook(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#fff',
                borderRadius: '16px',
                maxWidth: 680,
                width: '100%',
                maxHeight: '90vh',
                overflow: 'auto',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <div style={{ display: 'flex', gap: '24px', padding: '28px' }}>
                <div style={{ flexShrink: 0, width: 160 }}>
                  <img
                    src={modalBook.cover}
                    alt={modalBook.title}
                    style={{
                      width: 160,
                      aspectRatio: '3 / 4.2',
                      objectFit: 'cover',
                      borderRadius: '12px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#222', marginBottom: '8px' }}>
                    {modalBook.title}
                  </h2>
                  <p style={{ fontSize: '14px', color: '#888', marginBottom: '14px' }}>
                    作者：{modalBook.author}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="#F5A623">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                      </svg>
                      <span style={{ fontSize: '18px', fontWeight: 700, color: '#F5A623' }}>{modalBook.rating}</span>
                    </div>
                    <span style={{ color: '#999', fontSize: '13px' }}>共 {modalBook.pages} 页</span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
                    {modalBook.tags.map(tag => (
                      <span
                        key={tag}
                        style={{
                          padding: '4px 12px',
                          background: '#f5f0e6',
                          borderRadius: '12px',
                          fontSize: '12px',
                          color: '#666'
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <p style={{ fontSize: '14px', lineHeight: 1.7, color: '#555' }}>
                    {modalBook.description}
                  </p>
                </div>
              </div>
              <div
                style={{
                  borderTop: '1px solid #f0ebe3',
                  padding: '16px 28px',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '12px'
                }}
              >
                <button
                  onClick={() => setModalBook(null)}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '8px',
                    border: '1px solid #e0dcd4',
                    background: '#fff',
                    color: '#666',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  关闭
                </button>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    handleAdd(modalBook);
                  }}
                  disabled={inListIds.has(modalBook.id)}
                  style={{
                    padding: '10px 28px',
                    borderRadius: '8px',
                    border: 'none',
                    background: inListIds.has(modalBook.id) ? '#52c41a' : 'linear-gradient(135deg, #F5A623, #F7B94F)',
                    color: '#fff',
                    cursor: inListIds.has(modalBook.id) ? 'default' : 'pointer',
                    fontSize: '14px',
                    fontWeight: 600
                  }}
                >
                  {inListIds.has(modalBook.id) ? '✓ 已在阅读清单' : '+ 加入阅读清单'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
