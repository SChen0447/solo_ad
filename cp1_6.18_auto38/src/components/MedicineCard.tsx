import { useState, useMemo } from 'react';
import { Medicine, Member } from '../types';
import { useAppStore } from '../store';

interface MedicineCardProps {
  medicine: Medicine;
  index?: number;
}

export default function MedicineCard({ medicine, index = 0 }: MedicineCardProps) {
  const { members, currentUserId, deleteMedicine, updateMedicine } = useAppStore();
  const [showDetail, setShowDetail] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({ ...medicine });
  const [formError, setFormError] = useState('');

  const expiryStatus = useMemo(() => {
    const now = new Date();
    const expiry = new Date(medicine.expiryDate);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { status: 'expired', days: Math.abs(diffDays) };
    if (diffDays <= 7) return { status: 'near', days: diffDays };
    return { status: 'normal', days: diffDays };
  }, [medicine.expiryDate]);

  const linkedMembers = members.filter(m => medicine.memberIds.includes(m.id));
  const isOwner = currentUserId === medicine.createdBy;

  const handleDelete = async () => {
    if (confirm(`确定要删除 "${medicine.name}" 吗？`)) {
      await deleteMedicine(medicine.id);
      setShowDetail(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.name.trim() || !editForm.specification.trim()) {
      setFormError('药品名称和规格不能为空');
      return;
    }
    try {
      await updateMedicine(medicine.id, editForm);
      setShowEdit(false);
      setFormError('');
    } catch (err) {
      setFormError('保存失败');
    }
  };

  const toggleMember = (memberId: string) => {
    setEditForm(prev => ({
      ...prev,
      memberIds: prev.memberIds.includes(memberId)
        ? prev.memberIds.filter(id => id !== memberId)
        : [...prev.memberIds, memberId],
    }));
  };

  return (
    <>
      <div
        className={`medicine-card status-${expiryStatus.status}`}
        style={{ animationDelay: `${index * 80}ms` }}
        onClick={() => setShowDetail(true)}
      >
        <div className="card-inner">
          <div className="card-top">
            <div className="member-badges">
              {linkedMembers.slice(0, 3).map(member => (
                <div
                  key={member.id}
                  className="member-badge-small"
                  style={{ backgroundColor: member.color }}
                  title={member.name}
                >
                  {member.name.charAt(0)}
                </div>
              ))}
              {linkedMembers.length > 3 && (
                <div className="member-badge-more">+{linkedMembers.length - 3}</div>
              )}
            </div>
          </div>

          <div className="card-body">
            <h3 className="medicine-name">{medicine.name}</h3>
            <p className="medicine-spec">{medicine.specification}</p>
          </div>

          <div className="card-bottom">
            <div className="card-quantity">
              <span className="quantity-label">剩余</span>
              <span className={`quantity-value ${medicine.quantity <= 5 ? 'low' : ''}`}>
                {medicine.quantity}
              </span>
            </div>
            <div className={`card-expiry ${expiryStatus.status}`}>
              <span className="expiry-icon">
                {expiryStatus.status === 'expired' ? '⚠️' : expiryStatus.status === 'near' ? '⏰' : '📅'}
              </span>
              <span className="expiry-text">
                {expiryStatus.status === 'expired'
                  ? `已过期${expiryStatus.days}天`
                  : expiryStatus.status === 'near'
                    ? `剩${expiryStatus.days}天`
                    : medicine.expiryDate}
              </span>
            </div>
          </div>

          {expiryStatus.status !== 'normal' && (
            <div className={`status-glow glow-${expiryStatus.status}`}></div>
          )}
        </div>
      </div>

      {showDetail && (
        <div
          className="modal-overlay detail-overlay"
          onClick={() => {
            setShowDetail(false);
            setShowEdit(false);
          }}
        >
          <div
            className="modal-content detail-modal glass"
            onClick={e => e.stopPropagation()}
          >
            <button
              className="close-btn rotate-in"
              onClick={() => {
                setShowDetail(false);
                setShowEdit(false);
              }}
            >
              ×
            </button>

            {!showEdit ? (
              <>
                <div className="detail-header">
                  <div className={`detail-status-badge badge-${expiryStatus.status}`}>
                    {expiryStatus.status === 'expired'
                      ? '已过期'
                      : expiryStatus.status === 'near'
                        ? '即将过期'
                        : '正常'}
                  </div>
                  <h2 className="detail-name">{medicine.name}</h2>
                  <p className="detail-spec">{medicine.specification}</p>
                </div>

                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">剩余数量</span>
                    <span className={`detail-value ${medicine.quantity <= 5 ? 'warning' : ''}`}>
                      {medicine.quantity} 单位
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">有效期至</span>
                    <span className={`detail-value ${expiryStatus.status !== 'normal' ? 'warning' : ''}`}>
                      {medicine.expiryDate}
                    </span>
                  </div>
                  <div className="detail-item full">
                    <span className="detail-label">使用说明</span>
                    <span className="detail-value usage">
                      {medicine.usage || '暂无使用说明'}
                    </span>
                  </div>
                  <div className="detail-item full">
                    <span className="detail-label">适用成员</span>
                    <div className="detail-members">
                      {linkedMembers.length === 0 ? (
                        <span className="detail-value muted">未指定</span>
                      ) : (
                        linkedMembers.map(member => (
                          <div
                            key={member.id}
                            className="detail-member"
                            style={{ borderColor: member.color }}
                          >
                            <span
                              className="detail-member-avatar"
                              style={{ backgroundColor: member.color }}
                            >
                              {member.name.charAt(0)}
                            </span>
                            <span>{member.name}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  {medicine.dosageSchedule && (
                    <div className="detail-item full">
                      <span className="detail-label">用药计划</span>
                      <div className="dosage-info">
                        <span className="dosage-item">
                          每日 <strong>{medicine.dosageSchedule.timesPerDay}</strong> 次
                        </span>
                        {medicine.dosageSchedule.startTime && (
                          <span className="dosage-item">
                            开始时间：<strong>{medicine.dosageSchedule.startTime}</strong>
                          </span>
                        )}
                        {medicine.dosageSchedule.dosageAmount && (
                          <span className="dosage-item">
                            每次：<strong>{medicine.dosageSchedule.dosageAmount}</strong>
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="detail-actions">
                  {isOwner ? (
                    <>
                      <button
                        className="btn-secondary"
                        onClick={() => {
                          setEditForm({ ...medicine });
                          setShowEdit(true);
                        }}
                      >
                        ✏️ 编辑药品
                      </button>
                      <button className="btn-danger" onClick={handleDelete}>
                        🗑️ 删除药品
                      </button>
                    </>
                  ) : (
                    <div className="permission-note">
                      ⚠️ 仅药箱创建者可以编辑和删除药品
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <h2 className="modal-title">编辑药品</h2>
                <form onSubmit={handleSaveEdit}>
                  <div className="form-row">
                    <div className="form-group half">
                      <label>药品名称 *</label>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                      />
                    </div>
                    <div className="form-group half">
                      <label>药品规格 *</label>
                      <input
                        type="text"
                        value={editForm.specification}
                        onChange={e =>
                          setEditForm({ ...editForm, specification: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group half">
                      <label>剩余数量</label>
                      <input
                        type="number"
                        min="0"
                        value={editForm.quantity}
                        onChange={e =>
                          setEditForm({
                            ...editForm,
                            quantity: parseInt(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                    <div className="form-group half">
                      <label>有效期至</label>
                      <input
                        type="date"
                        value={editForm.expiryDate}
                        onChange={e =>
                          setEditForm({ ...editForm, expiryDate: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>使用说明</label>
                    <textarea
                      rows={2}
                      value={editForm.usage}
                      onChange={e => setEditForm({ ...editForm, usage: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>适用成员</label>
                    <div className="member-tags">
                      {members.map(member => (
                        <button
                          key={member.id}
                          type="button"
                          className={`member-tag ${editForm.memberIds.includes(member.id) ? 'selected' : ''}`}
                          style={{
                            borderColor: editForm.memberIds.includes(member.id)
                              ? member.color
                              : '#e0e0e0',
                            backgroundColor: editForm.memberIds.includes(member.id)
                              ? `${member.color}20`
                              : '#fff',
                          }}
                          onClick={() => toggleMember(member.id)}
                        >
                          <span
                            className="tag-avatar"
                            style={{ backgroundColor: member.color }}
                          >
                            {member.name.charAt(0)}
                          </span>
                          {member.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {formError && <div className="form-error">{formError}</div>}

                  <div className="modal-actions">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        setShowEdit(false);
                        setFormError('');
                      }}
                    >
                      取消
                    </button>
                    <button type="submit" className="btn-primary">
                      保存修改
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
