import { useState, useEffect } from 'react';
import { getFamilyMembers, addFamilyMember, deleteFamilyMember } from '../services/api';
import type { FamilyMember, NewFamilyMember } from '../types';
import './Family.css';

const availablePreferences = ['素食', '低碳水', '无乳糖', '高蛋白', '低卡'];
const availableAllergens = ['花生', '海鲜', '牛奶', '鸡蛋', '小麦', '大豆'];

function Family() {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMember, setNewMember] = useState<NewFamilyMember>({
    name: '',
    preferences: [],
    allergens: []
  });

  useEffect(() => {
    loadMembers();
  }, []);

  async function loadMembers() {
    try {
      const data = await getFamilyMembers();
      setMembers(data);
    } catch (error) {
      console.error('加载家庭成员失败:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMember.name.trim()) return;
    try {
      await addFamilyMember(newMember);
      setNewMember({ name: '', preferences: [], allergens: [] });
      setShowAddForm(false);
      loadMembers();
    } catch (error) {
      console.error('添加成员失败:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('确定要删除这个家庭成员吗？')) {
      try {
        await deleteFamilyMember(id);
        loadMembers();
      } catch (error) {
        console.error('删除成员失败:', error);
      }
    }
  };

  const togglePreference = (pref: string) => {
    if (newMember.preferences.includes(pref)) {
      setNewMember({
        ...newMember,
        preferences: newMember.preferences.filter(p => p !== pref)
      });
    } else {
      setNewMember({
        ...newMember,
        preferences: [...newMember.preferences, pref]
      });
    }
  };

  const toggleAllergen = (allergen: string) => {
    if (newMember.allergens.includes(allergen)) {
      setNewMember({
        ...newMember,
        allergens: newMember.allergens.filter(a => a !== allergen)
      });
    } else {
      setNewMember({
        ...newMember,
        allergens: [...newMember.allergens, allergen]
      });
    }
  };

  if (loading) {
    return <div className="page-container"><div className="loading">加载中...</div></div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>家庭成员管理</h1>
        <button className="btn-primary" onClick={() => setShowAddForm(true)}>
          + 添加成员
        </button>
      </div>

      {showAddForm && (
        <div className="modal-overlay" onClick={() => setShowAddForm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>添加家庭成员</h2>
            <form onSubmit={handleAddSubmit} className="add-form">
              <div className="form-group">
                <label>姓名</label>
                <input
                  type="text"
                  value={newMember.name}
                  onChange={e => setNewMember({ ...newMember, name: e.target.value })}
                  placeholder="输入成员姓名"
                  required
                />
              </div>

              <div className="form-group">
                <label>饮食偏好</label>
                <div className="tag-group">
                  {availablePreferences.map(pref => (
                    <button
                      key={pref}
                      type="button"
                      className={`tag-btn ${newMember.preferences.includes(pref) ? 'active' : ''}`}
                      onClick={() => togglePreference(pref)}
                    >
                      {pref}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>过敏原</label>
                <div className="tag-group">
                  {availableAllergens.map(allergen => (
                    <button
                      key={allergen}
                      type="button"
                      className={`tag-btn allergen ${newMember.allergens.includes(allergen) ? 'active' : ''}`}
                      onClick={() => toggleAllergen(allergen)}
                    >
                      {allergen}
                    </button>
                  ))}
                </div>
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

      <div className="members-grid">
        {members.map(member => (
          <div key={member.id} className="member-card">
            <div className="member-header">
              <div className="member-avatar">
                {member.name.charAt(0)}
              </div>
              <div className="member-info">
                <h3 className="member-name">{member.name}</h3>
              </div>
              <button
                className="btn-icon btn-delete"
                onClick={() => handleDelete(member.id)}
                title="删除"
              >
                🗑️
              </button>
            </div>

            <div className="member-section">
              <p className="section-label">饮食偏好</p>
              {member.preferences.length > 0 ? (
                <div className="tags-container">
                  {member.preferences.map(pref => (
                    <span key={pref} className="pref-tag">{pref}</span>
                  ))}
                </div>
              ) : (
                <p className="no-tags">暂无偏好</p>
              )}
            </div>

            <div className="member-section">
              <p className="section-label">过敏原</p>
              {member.allergens.length > 0 ? (
                <div className="tags-container">
                  {member.allergens.map(allergen => (
                    <span key={allergen} className="allergen-tag">{allergen}</span>
                  ))}
                </div>
              ) : (
                <p className="no-tags">无过敏</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {members.length === 0 && (
        <div className="empty-state">
          <p>暂无家庭成员，点击上方按钮添加</p>
        </div>
      )}
    </div>
  );
}

export default Family;
