import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { fetchItems, fetchQuestions, deleteItem, deleteQuestion, updateItem, type Item, type Question } from '../api';
import ItemCard from '../components/ItemCard';
import QuestionCard from '../components/QuestionCard';

const containerStyle: React.CSSProperties = {
  padding: '20px 24px',
  maxWidth: 900,
  margin: '0 auto',
};

const tabContainerStyle: React.CSSProperties = {
  display: 'flex',
  gap: 0,
  borderBottom: '2px solid #F0E6D6',
  marginBottom: 20,
  position: 'relative',
};

const tabStyle = (active: boolean): React.CSSProperties => ({
  padding: '10px 24px',
  fontSize: 15,
  fontWeight: active ? 600 : 400,
  color: active ? '#FF6B35' : '#999',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  position: 'relative',
  fontFamily: 'inherit',
});

export default function Profile() {
  const { userId } = useParams<{ userId: string }>();
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [tab, setTab] = useState<'items' | 'qna'>('items');
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  const loadData = useCallback(() => {
    Promise.all([fetchItems(), fetchQuestions()])
      .then(([items, questions]) => {
        setAllItems(items.filter(i => i.ownerId === userId));
        setAllQuestions(questions.filter(q => q.authorId === userId));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDeleteItem = async (id: string) => {
    setRemovingId(id);
    setTimeout(async () => {
      try {
        await deleteItem(id);
        setAllItems(prev => prev.filter(i => i.id !== id));
      } catch (err) {
        console.error(err);
      }
      setRemovingId(null);
    }, 300);
  };

  const handleDeleteQuestion = async (id: string) => {
    setRemovingId(id);
    setTimeout(async () => {
      try {
        await deleteQuestion(id);
        setAllQuestions(prev => prev.filter(q => q.id !== id));
      } catch (err) {
        console.error(err);
      }
      setRemovingId(null);
    }, 300);
  };

  const handleEditItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    const form = e.currentTarget;
    const data = {
      title: (form.elements.namedItem('title') as HTMLInputElement).value,
      description: (form.elements.namedItem('description') as HTMLInputElement).value,
      condition: (form.elements.namedItem('condition') as HTMLInputElement).value,
    };
    try {
      const updated = await updateItem(editingItem.id, data);
      setAllItems(prev => prev.map(i => i.id === updated.id ? updated : i));
      setEditingItem(null);
    } catch (err) {
      console.error(err);
    }
  };

  const user = userId === 'user1' ? { name: '小王', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix' }
    : userId === 'user2' ? { name: '阿李', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka' }
    : userId === 'user3' ? { name: '大张', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Buster' }
    : { name: '小陈', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Duke' };

  if (loading) return <div style={{ textAlign: 'center', paddingTop: 80 }}>加载中...</div>;

  return (
    <div style={containerStyle}>
      <style>{`
        @keyframes shrinkRotate {
          from { transform: scale(1) rotate(0deg); opacity: 1; }
          to { transform: scale(0) rotate(90deg); opacity: 0; }
        }
        @keyframes tabUnderline {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
      `}</style>

      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <img
          src={user.avatar}
          alt=""
          style={{
            width: 80, height: 80, borderRadius: '50%',
            border: '2px solid #F97316', objectFit: 'cover',
          }}
        />
        <div style={{ marginTop: 10, fontSize: 18, fontWeight: 600, color: '#333' }}>{user.name}</div>
      </div>

      <div style={tabContainerStyle}>
        <button style={tabStyle(tab === 'items')} onClick={() => setTab('items')}>
          我的物品
          {tab === 'items' && (
            <span style={{
              position: 'absolute', bottom: -2, left: '50%', transform: 'translateX(-50%)',
              width: '60%', height: 2, background: '#FF6B35', borderRadius: 1,
              animation: 'tabUnderline 0.2s ease forwards',
            }} />
          )}
        </button>
        <button style={tabStyle(tab === 'qna')} onClick={() => setTab('qna')}>
          我的问答
          {tab === 'qna' && (
            <span style={{
              position: 'absolute', bottom: -2, left: '50%', transform: 'translateX(-50%)',
              width: '60%', height: 2, background: '#FF6B35', borderRadius: 1,
              animation: 'tabUnderline 0.2s ease forwards',
            }} />
          )}
        </button>
      </div>

      {tab === 'items' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12, alignItems: 'start' }}>
          {allItems.map(item => (
            <div
              key={item.id}
              style={{
                animation: removingId === item.id ? 'shrinkRotate 0.3s ease forwards' : 'none',
                position: 'relative',
              }}
            >
              <ItemCard item={item} />
              <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 4, zIndex: 10 }}>
                <button
                  onClick={e => { e.stopPropagation(); setEditingItem(item); }}
                  style={{
                    padding: '3px 10px', borderRadius: 6, background: 'transparent',
                    border: '1px solid #F97316', color: '#F97316', fontSize: 12, cursor: 'pointer',
                    transition: 'background 0.15s, color 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#F97316'; e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#F97316'; }}
                >
                  编辑
                </button>
                <button
                  onClick={e => { e.stopPropagation(); handleDeleteItem(item.id); }}
                  style={{
                    padding: '3px 10px', borderRadius: 6, background: '#FF4444',
                    border: 'none', color: '#fff', fontSize: 12, cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#E03030'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#FF4444'; }}
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'qna' && (
        <div>
          {allQuestions.map(q => (
            <div
              key={q.id}
              style={{
                animation: removingId === q.id ? 'shrinkRotate 0.3s ease forwards' : 'none',
                position: 'relative',
              }}
            >
              <QuestionCard question={q} />
              <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 4 }}>
                <button
                  onClick={e => { e.stopPropagation(); handleDeleteQuestion(q.id); }}
                  style={{
                    padding: '3px 10px', borderRadius: 6, background: '#FF4444',
                    border: 'none', color: '#fff', fontSize: 12, cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#E03030'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#FF4444'; }}
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editingItem && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
          onClick={() => setEditingItem(null)}
        >
          <form
            onClick={e => e.stopPropagation()}
            onSubmit={handleEditItem}
            style={{ background: '#fff', borderRadius: 16, padding: 24, width: 400, maxWidth: '90vw', display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            <h3 style={{ margin: 0, color: '#FF6B35' }}>编辑物品</h3>
            <input name="title" defaultValue={editingItem.title} style={editInputStyle} />
            <textarea name="description" defaultValue={editingItem.description} rows={3} style={{ ...editInputStyle, resize: 'vertical' }} />
            <select name="condition" defaultValue={editingItem.condition} style={editInputStyle}>
              <option value="全新">全新</option>
              <option value="九成新">九成新</option>
              <option value="八成新">八成新</option>
              <option value="七成新">七成新</option>
              <option value="六成新">六成新</option>
            </select>
            <div style={{ display: 'flex', gap: 12 }}>
              <button type="button" onClick={() => setEditingItem(null)} style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #ddd', background: '#fff', cursor: 'pointer', fontSize: 14 }}>取消</button>
              <button type="submit" style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #FF9F43, #FF6B35)', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>保存</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

const editInputStyle: React.CSSProperties = {
  padding: '8px 12px', borderRadius: 8, border: '1px solid #E0D5C5', fontSize: 14, outline: 'none', fontFamily: 'inherit',
};
