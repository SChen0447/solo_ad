import { useState, useEffect, useMemo } from 'react';
import { getInventory, addIngredient, updateIngredient, deleteIngredient } from '../services/api';
import type { Ingredient, NewIngredient } from '../types';
import './Inventory.css';

type SortField = 'name' | 'quantity' | 'expiryDate';
type SortOrder = 'asc' | 'desc';

function Inventory() {
  const [inventory, setInventory] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>('expiryDate');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState<string>('');
  const [newIngredient, setNewIngredient] = useState<NewIngredient>({
    name: '',
    quantity: 0,
    unit: '个',
    expiryDate: ''
  });

  useEffect(() => {
    loadInventory();
  }, []);

  async function loadInventory() {
    try {
      const data = await getInventory();
      setInventory(data);
    } catch (error) {
      console.error('加载食材清单失败:', error);
    } finally {
      setLoading(false);
    }
  }

  const isExpiringSoon = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 3;
  };

  const getDaysRemaining = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const sortedInventory = useMemo(() => {
    const sorted = [...inventory];
    sorted.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name, 'zh-CN');
      } else if (sortField === 'quantity') {
        comparison = a.quantity - b.quantity;
      } else if (sortField === 'expiryDate') {
        comparison = new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    return sorted;
  }, [inventory, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addIngredient(newIngredient);
      setNewIngredient({ name: '', quantity: 0, unit: '个', expiryDate: '' });
      setShowAddForm(false);
      loadInventory();
    } catch (error) {
      console.error('添加食材失败:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('确定要删除这个食材吗？')) {
      try {
        await deleteIngredient(id);
        loadInventory();
      } catch (error) {
        console.error('删除食材失败:', error);
      }
    }
  };

  const startEditQuantity = (item: Ingredient) => {
    setEditingId(item.id);
    setEditQuantity(item.quantity.toString());
  };

  const saveEditQuantity = async (id: string) => {
    const newQty = parseFloat(editQuantity);
    if (isNaN(newQty) || newQty < 0) {
      alert('请输入有效的数量');
      return;
    }
    try {
      await updateIngredient(id, { quantity: newQty });
      setEditingId(null);
      loadInventory();
    } catch (error) {
      console.error('更新数量失败:', error);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditQuantity('');
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return '↕';
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  const expiringCount = inventory.filter(item => isExpiringSoon(item.expiryDate)).length;

  if (loading) {
    return <div className="page-container"><div className="loading">加载中...</div></div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>食材库存管理</h1>
        {expiringCount > 0 && (
          <div className="expiring-alert">
            ⚠️ 有 {expiringCount} 种食材即将过期
          </div>
        )}
        <button className="btn-primary" onClick={() => setShowAddForm(true)}>
          + 添加食材
        </button>
      </div>

      {showAddForm && (
        <div className="modal-overlay" onClick={() => setShowAddForm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>添加食材</h2>
            <form onSubmit={handleAddSubmit} className="add-form">
              <div className="form-group">
                <label>食材名称</label>
                <input
                  type="text"
                  value={newIngredient.name}
                  onChange={e => setNewIngredient({ ...newIngredient, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>数量</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={newIngredient.quantity || ''}
                    onChange={e => setNewIngredient({ ...newIngredient, quantity: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>单位</label>
                  <select
                    value={newIngredient.unit}
                    onChange={e => setNewIngredient({ ...newIngredient, unit: e.target.value })}
                  >
                    <option value="个">个</option>
                    <option value="克">克</option>
                    <option value="公斤">公斤</option>
                    <option value="盒">盒</option>
                    <option value="瓶">瓶</option>
                    <option value="颗">颗</option>
                    <option value="块">块</option>
                    <option value="袋">袋</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>保质期</label>
                <input
                  type="date"
                  value={newIngredient.expiryDate}
                  onChange={e => setNewIngredient({ ...newIngredient, expiryDate: e.target.value })}
                  required
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowAddForm(false)}>
                  取消
                </button>
                <button type="submit" className="btn-primary">
                  添加
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="table-container">
        <table className="inventory-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('name')} className="sortable">
                食材名称 {getSortIcon('name')}
              </th>
              <th onClick={() => handleSort('quantity')} className="sortable">
                数量 {getSortIcon('quantity')}
              </th>
              <th>单位</th>
              <th onClick={() => handleSort('expiryDate')} className="sortable">
                保质期 {getSortIcon('expiryDate')}
              </th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {sortedInventory.map(item => {
              const expiring = isExpiringSoon(item.expiryDate);
              const daysRemaining = getDaysRemaining(item.expiryDate);
              return (
                <tr key={item.id} className={expiring ? 'expiring-row' : ''}>
                  <td className="name-cell">{item.name}</td>
                  <td className="quantity-cell">
                    {editingId === item.id ? (
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={editQuantity}
                        onChange={e => setEditQuantity(e.target.value)}
                        className="quantity-input"
                        autoFocus
                        onKeyDown={e => {
                          if (e.key === 'Enter') saveEditQuantity(item.id);
                          if (e.key === 'Escape') cancelEdit();
                        }}
                      />
                    ) : (
                      <span onDoubleClick={() => startEditQuantity(item)} title="双击修改">
                        {item.quantity}
                      </span>
                    )}
                  </td>
                  <td>{item.unit}</td>
                  <td>{item.expiryDate}</td>
                  <td>
                    {expiring ? (
                      <span className="status-badge warning">
                        {daysRemaining > 0 ? `剩${daysRemaining}天` : '今天过期'}
                      </span>
                    ) : (
                      <span className="status-badge normal">正常</span>
                    )}
                  </td>
                  <td className="actions-cell">
                    {editingId === item.id ? (
                      <>
                        <button className="btn-icon btn-save" onClick={() => saveEditQuantity(item.id)} title="保存">
                          ✓
                        </button>
                        <button className="btn-icon btn-cancel" onClick={cancelEdit} title="取消">
                          ✕
                        </button>
                      </>
                    ) : (
                      <>
                        <button className="btn-icon btn-edit" onClick={() => startEditQuantity(item)} title="修改数量">
                          ✏️
                        </button>
                        <button className="btn-icon btn-delete" onClick={() => handleDelete(item.id)} title="删除">
                          🗑️
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {inventory.length === 0 && (
          <div className="empty-state">
            <p>暂无食材，点击上方按钮添加</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Inventory;
