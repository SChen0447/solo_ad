import React, { useState } from 'react';
import { useRoleStore } from '../store/roleStore';
import { useSceneStore } from '../store/sceneStore';
import { Role } from '../types';
import { exportScene } from '../utils/exportImport';
import './RolePanel.css';

const RolePanel: React.FC = () => {
  const { activeSceneId, scenes, getMessages } = useSceneStore();
  const { getRolesByScene, addRole, updateRole } = useRoleStore();

  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPersonality, setEditPersonality] = useState('');
  const [editAppearance, setEditAppearance] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  const activeScene = scenes.find((s) => s.id === activeSceneId) || null;
  const roles = activeSceneId ? getRolesByScene(activeSceneId) : [];

  const handleEditClick = (role: Role) => {
    setEditingRoleId(role.id);
    setEditName(role.name);
    setEditPersonality(role.personality);
    setEditAppearance(role.appearance);
    setShowAddForm(false);
  };

  const handleEditSave = (roleId: string) => {
    if (!editName.trim()) return;
    updateRole(roleId, {
      name: editName.trim(),
      personality: editPersonality.trim(),
      appearance: editAppearance.trim(),
      description: editPersonality.trim() || editAppearance.trim()
        ? `${editPersonality.trim().slice(0, 30)}${editPersonality.trim().length > 30 ? '...' : ''}`
        : '',
    });
    setSavingId(roleId);
    setTimeout(() => {
      setSavingId(null);
      setEditingRoleId(null);
      setEditName('');
      setEditPersonality('');
      setEditAppearance('');
    }, 300);
  };

  const handleEditCancel = () => {
    setEditingRoleId(null);
    setEditName('');
    setEditPersonality('');
    setEditAppearance('');
  };

  const handleAddClick = () => {
    setShowAddForm(true);
    setEditingRoleId(null);
    setEditName('');
    setEditPersonality('');
    setEditAppearance('');
  };

  const handleAddSave = () => {
    if (!editName.trim() || !activeSceneId) return;
    const description = editPersonality.trim() || editAppearance.trim()
      ? `${editPersonality.trim().slice(0, 30)}${editPersonality.trim().length > 30 ? '...' : ''}`
      : '';
    const newRole = addRole(
      activeSceneId,
      editName.trim(),
      description,
      editPersonality.trim(),
      editAppearance.trim()
    );
    setSavingId(newRole.id);
    setTimeout(() => {
      setSavingId(null);
      setShowAddForm(false);
      setEditName('');
      setEditPersonality('');
      setEditAppearance('');
    }, 300);
  };

  const handleAddCancel = () => {
    setShowAddForm(false);
    setEditName('');
    setEditPersonality('');
    setEditAppearance('');
  };

  const handleExport = () => {
    if (!activeScene || !activeSceneId) return;
    const messages = getMessages(activeSceneId);
    exportScene(activeScene, roles, messages);
  };

  if (!activeScene) {
    return (
      <div className="role-panel">
        <div className="role-panel-empty">
          <p>选择场景后可管理角色</p>
        </div>
      </div>
    );
  }

  return (
    <div className="role-panel">
      <div className="role-panel-header">
        <h2>角色</h2>
        <span className="role-count">{roles.length} 个角色</span>
      </div>

      <div className="role-list">
        {roles.map((role) => (
          <div
            key={role.id}
            className={`role-card ${savingId === role.id ? 'save-flash' : ''}`}
          >
            <div className="role-card-main">
              <div
                className="role-avatar"
                style={{
                  background: `linear-gradient(135deg, ${role.avatarColor || '#7c3aed'}, #555)`,
                }}
              >
                {role.name.charAt(0).toUpperCase()}
              </div>
              <div className="role-info">
                <div className="role-name">{role.name}</div>
                <div className="role-desc">
                  {role.description || '暂无描述'}
                </div>
              </div>
            </div>

            {editingRoleId === role.id ? (
              <div className="role-edit-form">
                <div className="form-group">
                  <label>角色名称</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="form-input"
                    placeholder="输入角色名"
                  />
                </div>
                <div className="form-group">
                  <label>性格描述</label>
                  <textarea
                    value={editPersonality}
                    onChange={(e) => setEditPersonality(e.target.value)}
                    className="form-textarea"
                    rows={3}
                    placeholder="描述角色的性格特点..."
                  />
                </div>
                <div className="form-group">
                  <label>外观描述</label>
                  <textarea
                    value={editAppearance}
                    onChange={(e) => setEditAppearance(e.target.value)}
                    className="form-textarea"
                    rows={3}
                    placeholder="描述角色的外貌特征..."
                  />
                </div>
                <div className="form-actions">
                  <button className="btn-save" onClick={() => handleEditSave(role.id)}>
                    保存
                  </button>
                  <button className="btn-cancel" onClick={handleEditCancel}>
                    取消
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="edit-role-btn"
                onClick={() => handleEditClick(role)}
              >
                编辑角色
              </button>
            )}
          </div>
        ))}

        {showAddForm && (
          <div className="role-card add-form-card">
            <div className="role-card-main">
              <div className="role-avatar add-avatar">+</div>
              <div className="role-info">
                <div className="role-name">新角色</div>
                <div className="role-desc">填写角色信息</div>
              </div>
            </div>
            <div className="role-edit-form">
              <div className="form-group">
                <label>角色名称</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="form-input"
                  placeholder="输入角色名"
                />
              </div>
              <div className="form-group">
                <label>性格描述</label>
                <textarea
                  value={editPersonality}
                  onChange={(e) => setEditPersonality(e.target.value)}
                  className="form-textarea"
                  rows={3}
                  placeholder="描述角色的性格特点..."
                />
              </div>
              <div className="form-group">
                <label>外观描述</label>
                <textarea
                  value={editAppearance}
                  onChange={(e) => setEditAppearance(e.target.value)}
                  className="form-textarea"
                  rows={3}
                  placeholder="描述角色的外貌特征..."
                />
              </div>
              <div className="form-actions">
                <button className="btn-save" onClick={handleAddSave}>
                  添加
                </button>
                <button className="btn-cancel" onClick={handleAddCancel}>
                  取消
                </button>
              </div>
            </div>
          </div>
        )}

        {!showAddForm && (
          <button className="add-role-btn" onClick={handleAddClick}>
            + 添加角色
          </button>
        )}
      </div>

      <div className="role-panel-footer">
        <button className="export-btn" onClick={handleExport} disabled={!activeSceneId}>
          导出场景
        </button>
      </div>
    </div>
  );
};

export default RolePanel;
