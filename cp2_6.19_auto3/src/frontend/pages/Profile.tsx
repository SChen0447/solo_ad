import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import RecipeCard from '../components/RecipeCard';
import SkeletonCard from '../components/SkeletonCard';
import { fetchRecipes, fetchFavorites, removeRecipe } from '../api';
import type { Recipe } from '../types';

type Tab = 'published' | 'favorites';

export default function Profile() {
  const [tab, setTab] = useState<Tab>('published');
  const [published, setPublished] = useState<Recipe[]>([]);
  const [favorites, setFavorites] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editIngredients, setEditIngredients] = useState('');
  const [editSteps, setEditSteps] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pubRes, favRes] = await Promise.all([
        fetchRecipes(1, 100),
        fetchFavorites()
      ]);
      setPublished(pubRes.data);
      setFavorites(favRes);
    } catch (err) {
      console.error('加载数据失败', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('确定要删除这道食谱吗？')) return;
    await removeRecipe(id);
    setPublished(prev => prev.filter(r => r.id !== id));
    setFavorites(prev => prev.filter(r => r.id !== id));
  };

  const startEdit = (recipe: Recipe) => {
    setEditingId(recipe.id);
    setEditTitle(recipe.title);
    setEditIngredients(recipe.ingredients.join('\n'));
    setEditSteps(recipe.steps.join('\n'));
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (id: number) => {
    try {
      await fetch(`/api/recipes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle,
          ingredients: editIngredients.split('\n').filter(Boolean),
          steps: editSteps.split('\n').filter(Boolean)
        })
      });
      setPublished(prev =>
        prev.map(r =>
          r.id === id
            ? {
                ...r,
                title: editTitle,
                ingredients: editIngredients.split('\n').filter(Boolean),
                steps: editSteps.split('\n').filter(Boolean)
              }
            : r
        )
      );
      setEditingId(null);
    } catch (err) {
      console.error('更新失败', err);
    }
  };

  const currentList = tab === 'published' ? published : favorites;

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="profile-avatar">👨‍🍳</div>
        <h1 className="profile-name">我的厨房</h1>
      </div>

      <div className="profile-tabs">
        <button
          className={`profile-tab ${tab === 'published' ? 'active' : ''}`}
          onClick={() => setTab('published')}
        >
          我的发布 ({published.length})
        </button>
        <button
          className={`profile-tab ${tab === 'favorites' ? 'active' : ''}`}
          onClick={() => setTab('favorites')}
        >
          我的收藏 ({favorites.length})
        </button>
      </div>

      {loading ? (
        <div className="masonry-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : currentList.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">{tab === 'published' ? '📝' : '⭐'}</span>
          <p>{tab === 'published' ? '还没有发布食谱，去分享一道吧！' : '还没有收藏食谱，去发现美味吧！'}</p>
          <Link to="/" className="empty-link">探索食谱</Link>
        </div>
      ) : (
        <div className="profile-list">
          {currentList.map(recipe => (
            <div key={recipe.id} className="profile-item">
              {editingId === recipe.id ? (
                <div className="edit-form">
                  <input
                    className="form-input"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    placeholder="食谱名称"
                  />
                  <textarea
                    className="form-textarea"
                    value={editIngredients}
                    onChange={e => setEditIngredients(e.target.value)}
                    placeholder="食材清单（每行一种）"
                    rows={4}
                  />
                  <textarea
                    className="form-textarea"
                    value={editSteps}
                    onChange={e => setEditSteps(e.target.value)}
                    placeholder="烹饪步骤（每行一步）"
                    rows={4}
                  />
                  <div className="edit-actions">
                    <button className="btn-save" onClick={() => saveEdit(recipe.id)}>保存</button>
                    <button className="btn-cancel" onClick={cancelEdit}>取消</button>
                  </div>
                </div>
              ) : (
                <div className="profile-item-inner">
                  <RecipeCard recipe={recipe} />
                  {tab === 'published' && (
                    <div className="item-actions">
                      <button className="btn-edit" onClick={() => startEdit(recipe)}>✏️ 编辑</button>
                      <button className="btn-delete" onClick={() => handleDelete(recipe.id)}>🗑️ 删除</button>
                    </div>
                  )}
                  {tab === 'favorites' && (
                    <div className="item-actions">
                      <Link to={`/recipe/${recipe.id}`} className="btn-view">👀 查看</Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
