import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getCards, deleteCard, updateCardNote } from '../services/api';
import type { Card } from '../types';

function CardFolder() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [cards, setCards] = useState<Card[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date_desc');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [noteModal, setNoteModal] = useState<{ show: boolean; card: Card | null }>({
    show: false,
    card: null,
  });
  const [noteText, setNoteText] = useState('');
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; card: Card | null; countdown: number }>({
    show: false,
    card: null,
    countdown: 0,
  });
  const observerRef = useRef<HTMLDivElement>(null);
  const deleteTimerRef = useRef<number | null>(null);

  const loadCards = useCallback(async (pageNum: number, search: string, sort: string, reset = false) => {
    if (!user) return;

    setLoading(true);
    try {
      const response = await getCards({
        userId: user.id,
        page: pageNum,
        pageSize: 20,
        search,
        sort,
      });

      if (reset) {
        setCards(response.cards);
      } else {
        setCards(prev => [...prev, ...response.cards]);
      }
      setHasMore(response.hasMore);
      setPage(pageNum);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '加载失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [user, showToast]);

  useEffect(() => {
    if (user) {
      loadCards(1, searchQuery, sortBy, true);
    }
  }, [user, searchQuery, sortBy, loadCards]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadCards(page + 1, searchQuery, sortBy);
        }
      },
      { threshold: 0.1 }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => {
      if (observerRef.current) {
        observer.unobserve(observerRef.current);
      }
    };
  }, [hasMore, loading, page, searchQuery, sortBy, loadCards]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortBy(e.target.value);
  };

  const openNoteModal = (card: Card) => {
    setNoteModal({ show: true, card });
    setNoteText(card.note || '');
  };

  const closeNoteModal = () => {
    setNoteModal({ show: false, card: null });
    setNoteText('');
  };

  const saveNote = async () => {
    if (!noteModal.card || !user) return;

    try {
      await updateCardNote(user.id, noteModal.card.id, noteText);
      setCards(prev =>
        prev.map(c =>
          c.id === noteModal.card!.id ? { ...c, note: noteText } : c
        )
      );
      showToast('备注已保存');
      closeNoteModal();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '保存失败', 'error');
    }
  };

  const openDeleteModal = (card: Card) => {
    setDeleteModal({ show: true, card, countdown: 3 });

    if (deleteTimerRef.current) {
      clearInterval(deleteTimerRef.current);
    }

    let count = 3;
    deleteTimerRef.current = window.setInterval(() => {
      count -= 1;
      setDeleteModal(prev => ({ ...prev, countdown: count }));
      if (count <= 0) {
        if (deleteTimerRef.current) {
          clearInterval(deleteTimerRef.current);
        }
      }
    }, 1000);
  };

  const closeDeleteModal = () => {
    if (deleteTimerRef.current) {
      clearInterval(deleteTimerRef.current);
      deleteTimerRef.current = null;
    }
    setDeleteModal({ show: false, card: null, countdown: 0 });
  };

  const confirmDelete = async () => {
    if (!deleteModal.card || !user || deleteModal.countdown > 0) return;

    try {
      await deleteCard(user.id, deleteModal.card.id);
      setCards(prev => prev.filter(c => c.id !== deleteModal.card!.id));
      showToast('名片已删除');
      closeDeleteModal();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '删除失败', 'error');
    }
  };

  const viewProfile = (cardId: string) => {
    navigate(`/profile/${cardId}`);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN');
  };

  return (
    <div className="page-container card-folder-page">
      <div className="page-content">
        <div className="folder-header">
          <h1>我的名片夹</h1>
          <p>共 {cards.length} 张名片</p>
        </div>

        <div className="folder-toolbar">
          <div className="search-box">
            <i className="fas fa-search"></i>
            <input
              type="text"
              placeholder="搜索姓名、公司或职位..."
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </div>
          <div className="sort-box">
            <select value={sortBy} onChange={handleSortChange}>
              <option value="date_desc">最新交换</option>
              <option value="date_asc">最早交换</option>
              <option value="name_asc">姓名 A-Z</option>
              <option value="name_desc">姓名 Z-A</option>
            </select>
          </div>
        </div>

        {cards.length === 0 && !loading ? (
          <div className="empty-state">
            <i className="fas fa-address-book"></i>
            <p>名片夹是空的</p>
            <p className="empty-tip">去交换你的第一张名片吧</p>
            <button className="btn-primary" onClick={() => navigate('/exchange')}>
              <i className="fas fa-qrcode"></i>
              去交换
            </button>
          </div>
        ) : (
          <div className="cards-grid">
            {cards.map(card => (
              <div key={card.id} className="card-item card">
                <div className="card-info" onClick={() => viewProfile(card.id)}>
                  <div className="card-avatar">
                    {card.avatarUrl ? (
                      <img src={card.avatarUrl} alt={card.name} />
                    ) : (
                      <div className="avatar-fallback">
                        {card.name.charAt(0) || '?'}
                      </div>
                    )}
                  </div>
                  <h3 className="card-name">{card.name || '未命名'}</h3>
                  <p className="card-position">{card.position || '—'}</p>
                  <p className="card-company">{card.company || '—'}</p>
                  {card.note && (
                    <p className="card-note"><i className="fas fa-sticky-note"></i> {card.note}</p>
                  )}
                  <p className="card-date">交换于 {formatDate(card.exchangedAt)}</p>
                </div>
                <div className="card-actions">
                  <button className="card-btn" onClick={() => openNoteModal(card)}>
                    <i className="fas fa-edit"></i>
                    编辑备注
                  </button>
                  <button className="card-btn delete" onClick={() => openDeleteModal(card)}>
                    <i className="fas fa-trash"></i>
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {loading && (
          <div className="loading-more">
            <i className="fas fa-spinner fa-spin"></i>
            <span>加载中...</span>
          </div>
        )}

        <div ref={observerRef} className="observer-sentinel"></div>

        {!hasMore && cards.length > 0 && (
          <div className="no-more">
            <span>没有更多了</span>
          </div>
        )}
      </div>

      {noteModal.show && (
        <div className="modal-overlay" onClick={closeNoteModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>编辑备注</h3>
            <textarea
              className="note-textarea"
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="输入备注信息..."
              rows={4}
            />
            <div className="modal-actions">
              <button className="btn-secondary" onClick={closeNoteModal}>取消</button>
              <button className="btn-primary" onClick={saveNote}>保存</button>
            </div>
          </div>
        </div>
      )}

      {deleteModal.show && (
        <div className="modal-overlay" onClick={closeDeleteModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="delete-warning">
              <i className="fas fa-exclamation-triangle"></i>
              <h3>确认删除</h3>
              <p>确定要删除 <strong>{deleteModal.card?.name}</strong> 的名片吗？</p>
              <p className="delete-tip">删除后无法恢复</p>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={closeDeleteModal}>取消</button>
              <button
                className="btn-primary delete-btn"
                onClick={confirmDelete}
                disabled={deleteModal.countdown > 0}
              >
                {deleteModal.countdown > 0 ? `${deleteModal.countdown}秒后可删除` : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CardFolder;
