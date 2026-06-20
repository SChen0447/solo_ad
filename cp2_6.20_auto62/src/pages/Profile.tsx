import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  fetchItems,
  fetchQuestions,
  deleteItem,
  deleteQuestion,
  CURRENT_USER,
  type Item,
  type Question,
} from '../api';

export default function Profile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'items' | 'qa'>('items');
  const [myItems, setMyItems] = useState<Item[]>([]);
  const [myQuestions, setMyQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [itemsRes, questions] = await Promise.all([
        fetchItems(1, 100),
        fetchQuestions(),
      ]);
      const uid = userId || CURRENT_USER.id;
      setMyItems(itemsRes.items.filter(i => i.ownerId === uid));
      setMyQuestions(questions.filter(q => q.authorId === uid));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userId]);

  const handleDeleteItem = async (id: string) => {
    setDeletingId(id);
    setTimeout(async () => {
      try {
        await deleteItem(id);
        setMyItems(prev => prev.filter(i => i.id !== id));
      } catch (err) {
        console.error(err);
      }
      setDeletingId(null);
    }, 300);
  };

  const handleDeleteQuestion = async (id: string) => {
    setDeletingId(id);
    setTimeout(async () => {
      try {
        await deleteQuestion(id);
        setMyQuestions(prev => prev.filter(q => q.id !== id));
      } catch (err) {
        console.error(err);
      }
      setDeletingId(null);
    }, 300);
  };

  const handleEditItem = (id: string) => {
    navigate(`/item/${id}`);
  };

  if (loading) return <div className="loading-spinner" />;

  return (
    <div>
      <div className="profile-header">
        <img className="profile-avatar" src={CURRENT_USER.avatar} alt="头像" />
        <div className="profile-name">{CURRENT_USER.name}</div>
      </div>

      <div className="profile-tabs">
        <button
          className={`profile-tab ${activeTab === 'items' ? 'active' : ''}`}
          onClick={() => setActiveTab('items')}
        >
          我的物品
        </button>
        <button
          className={`profile-tab ${activeTab === 'qa' ? 'active' : ''}`}
          onClick={() => setActiveTab('qa')}
        >
          我的问答
        </button>
      </div>

      {activeTab === 'items' && (
        <div>
          {myItems.length === 0 ? (
            <div className="empty-state">暂无发布的物品</div>
          ) : (
            myItems.map(item => (
              <div
                key={item.id}
                className={`profile-item-card ${deletingId === item.id ? 'delete-anim' : ''}`}
              >
                <img src={item.imageUrl} alt={item.title} />
                <div className="profile-item-info">
                  <div className="profile-item-title">{item.title}</div>
                  <div className="profile-item-condition">{item.condition}</div>
                </div>
                <div className="profile-item-actions">
                  <button className="btn-edit" onClick={() => handleEditItem(item.id)}>
                    编辑
                  </button>
                  <button className="btn-delete" onClick={() => handleDeleteItem(item.id)}>
                    删除
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'qa' && (
        <div>
          {myQuestions.length === 0 ? (
            <div className="empty-state">暂无发布的问题</div>
          ) : (
            myQuestions.map(q => (
              <div
                key={q.id}
                className={`profile-qa-card ${deletingId === q.id ? 'delete-anim' : ''}`}
              >
                <div className="profile-qa-info">
                  <div className="profile-qa-title">{q.title}</div>
                  <div className="profile-qa-tags">
                    {q.tags.map((tag, i) => (
                      <span key={i} className="qa-tag">{tag}</span>
                    ))}
                  </div>
                </div>
                <div className="profile-item-actions">
                  <button className="btn-delete" onClick={() => handleDeleteQuestion(q.id)}>
                    删除
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
