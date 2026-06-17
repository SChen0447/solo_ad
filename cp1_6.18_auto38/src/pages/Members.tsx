import { useState } from 'react';
import { useAppStore } from '../store';

export default function Members() {
  const { members, medicines, addMember, deleteMember, setCurrentUser, currentUserId } = useAppStore();
  const [newMemberName, setNewMemberName] = useState('');
  const [formError, setFormError] = useState('');

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) {
      setFormError('请输入成员昵称');
      return;
    }
    try {
      await addMember(newMemberName.trim());
      setNewMemberName('');
      setFormError('');
    } catch (err) {
      setFormError('添加失败，请重试');
    }
  };

  const handleDeleteMember = async (memberId: string, memberName: string) => {
    if (confirm(`确定要将 "${memberName}" 移出药箱吗？`)) {
      await deleteMember(memberId);
    }
  };

  const getMemberMedicineCount = (memberId: string) => {
    return medicines.filter(m => m.memberIds.includes(memberId)).length;
  };

  return (
    <div className="members-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">👨‍👩‍👧 家庭成员</h1>
          <p className="page-subtitle">
            共 <strong>{members.length}</strong> 位成员共享此药箱
          </p>
        </div>
      </div>

      <div className="members-layout">
        <div className="members-list-section">
          <h2 className="section-title">成员列表</h2>

          <div className="members-card-grid">
            {members.map(member => (
              <div
                key={member.id}
                className={`member-card ${member.id === currentUserId ? 'current' : ''}`}
              >
                <div className="member-card-header">
                  <div
                    className="member-card-avatar"
                    style={{ backgroundColor: member.color }}
                  >
                    {member.name.charAt(0)}
                  </div>
                  {member.id === currentUserId && (
                    <div className="current-indicator">当前登录</div>
                  )}
                </div>

                <div className="member-card-body">
                  <h3 className="member-card-name">
                    {member.name}
                    {member.isOwner && <span className="owner-badge-lg">创建者</span>}
                  </h3>
                  <div className="member-card-stats">
                    <div className="stat-item">
                      <span className="stat-value">{getMemberMedicineCount(member.id)}</span>
                      <span className="stat-label">关联药品</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-value">
                        {member.isOwner ? '全部' : '查看'}
                      </span>
                      <span className="stat-label">权限</span>
                    </div>
                  </div>
                  <div className="member-card-date">
                    加入：{new Date(member.createdAt).toLocaleDateString('zh-CN')}
                  </div>
                </div>

                <div className="member-card-actions">
                  {!member.isOwner && (
                    <button
                      className="btn-secondary-sm"
                      onClick={() => setCurrentUser(member.id)}
                    >
                      切换身份
                    </button>
                  )}
                  {!member.isOwner && (
                    <button
                      className="btn-danger-sm"
                      onClick={() => handleDeleteMember(member.id, member.name)}
                    >
                      移除成员
                    </button>
                  )}
                  {member.isOwner && (
                    <div className="owner-note">药箱创建者拥有全部权限</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="add-member-section">
          <div className="add-member-card">
            <h2 className="section-title">邀请新成员</h2>
            <p className="section-desc">
              输入成员昵称即可邀请加入药箱，新成员可以查看药品和标记使用状态
            </p>

            <form onSubmit={handleAddMember}>
              <div className="form-group">
                <label>成员昵称 *</label>
                <input
                  type="text"
                  value={newMemberName}
                  onChange={e => {
                    setNewMemberName(e.target.value);
                    setFormError('');
                  }}
                  placeholder="请输入成员昵称"
                  autoFocus
                />
              </div>
              {formError && <div className="form-error">{formError}</div>}
              <button type="submit" className="btn-primary full-width">
                + 发送邀请
              </button>
            </form>

            <div className="permissions-info">
              <h4>📋 权限说明</h4>
              <ul>
                <li>
                  <strong>创建者：</strong>
                  完整权限，可添加/修改/删除药品，管理成员
                </li>
                <li>
                  <strong>成员：</strong>
                  可查看药箱、标记使用状态、接收提醒通知
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
