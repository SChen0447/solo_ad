import { useState, useMemo } from 'react';
import { useAppStore } from '../store';
import MedicineCard from '../components/MedicineCard';

export default function MedicineBox() {
  const { medicines, members, currentUserId, addMedicine } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMember, setFilterMember] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMed, setNewMed] = useState({
    name: '',
    specification: '',
    quantity: 0,
    expiryDate: new Date().toISOString().split('T')[0],
    usage: '',
    memberIds: [] as string[],
    timesPerDay: 1,
    startTime: '08:00',
    dosageAmount: '',
  });
  const [formError, setFormError] = useState('');

  const PAGE_SIZE = 20;

  const filteredMedicines = useMemo(() => {
    const now = new Date();
    return medicines
      .filter(m => {
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          if (!m.name.toLowerCase().includes(q) &&
              !m.specification.toLowerCase().includes(q)) {
            return false;
          }
        }
        if (filterMember !== 'all') {
          if (!m.memberIds.includes(filterMember)) return false;
        }
        if (filterStatus !== 'all') {
          const expiry = new Date(m.expiryDate);
          const diffDays = Math.ceil(
            (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );
          if (filterStatus === 'expired' && diffDays >= 0) return false;
          if (filterStatus === 'near' && (diffDays < 0 || diffDays > 7)) return false;
          if (filterStatus === 'normal' && diffDays <= 7) return false;
          if (filterStatus === 'low' && m.quantity > 5) return false;
        }
        return true;
      });
  }, [medicines, searchQuery, filterMember, filterStatus]);

  const totalPages = Math.ceil(filteredMedicines.length / PAGE_SIZE);
  const paginatedMedicines = filteredMedicines.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const handleAddMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMed.name.trim()) {
      setFormError('请输入药品名称');
      return;
    }
    if (!newMed.specification.trim()) {
      setFormError('请输入药品规格');
      return;
    }
    if (newMed.quantity <= 0) {
      setFormError('剩余数量必须大于0');
      return;
    }
    try {
      const dosageSchedule = newMed.timesPerDay > 0 ? {
        timesPerDay: newMed.timesPerDay,
        startTime: newMed.startTime,
        dosageAmount: newMed.dosageAmount,
      } : undefined;

      await addMedicine({
        name: newMed.name,
        specification: newMed.specification,
        quantity: newMed.quantity,
        expiryDate: newMed.expiryDate,
        usage: newMed.usage,
        memberIds: newMed.memberIds,
        createdBy: currentUserId,
        dosageSchedule,
      });
      setShowAddModal(false);
      setNewMed({
        name: '',
        specification: '',
        quantity: 0,
        expiryDate: new Date().toISOString().split('T')[0],
        usage: '',
        memberIds: [],
        timesPerDay: 1,
        startTime: '08:00',
        dosageAmount: '',
      });
      setFormError('');
    } catch (err) {
      setFormError('添加失败，请重试');
    }
  };

  const toggleMember = (memberId: string) => {
    setNewMed(prev => ({
      ...prev,
      memberIds: prev.memberIds.includes(memberId)
        ? prev.memberIds.filter(id => id !== memberId)
        : [...prev.memberIds, memberId],
    }));
  };

  const resetFilters = () => {
    setSearchQuery('');
    setFilterMember('all');
    setFilterStatus('all');
    setCurrentPage(1);
  };

  return (
    <div className="medicine-box-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">📦 我的药箱</h1>
          <p className="page-subtitle">
            共 <strong>{filteredMedicines.length}</strong> 种药品
            {searchQuery || filterMember !== 'all' || filterStatus !== 'all'
              ? ` (已筛选，原始 ${medicines.length} 种)`
              : ''}
          </p>
        </div>
        <button className="add-btn" onClick={() => setShowAddModal(true)}>
          <span className="add-icon">+</span> 添加药品
        </button>
      </div>

      <div className="filter-bar">
        <div className="filter-search">
          <span className="filter-icon">🔍</span>
          <input
            type="text"
            placeholder="搜索药品名称或规格..."
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <div className="filter-group">
          <label>成员筛选</label>
          <select
            value={filterMember}
            onChange={e => {
              setFilterMember(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="all">全部成员</option>
            {members.map(m => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>状态筛选</label>
          <select
            value={filterStatus}
            onChange={e => {
              setFilterStatus(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="all">全部状态</option>
            <option value="normal">效期正常</option>
            <option value="near">即将过期(7天内)</option>
            <option value="expired">已过期</option>
            <option value="low">库存不足(≤5)</option>
          </select>
        </div>

        {(searchQuery || filterMember !== 'all' || filterStatus !== 'all') && (
          <button className="reset-filter-btn" onClick={resetFilters}>
            ✕ 清除筛选
          </button>
        )}
      </div>

      {filteredMedicines.length === 0 ? (
        <div className="empty-state large">
          <div className="empty-icon-lg">💊</div>
          <h3>没有找到药品</h3>
          <p>
            {medicines.length === 0
              ? '药箱还空着，点击上方"添加药品"开始管理你的药箱吧'
              : '试试调整筛选条件，或清除所有筛选'}
          </p>
          {medicines.length > 0 && (
            <button className="btn-primary" onClick={resetFilters}>
              清除筛选条件
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="medicine-grid full">
            {paginatedMedicines.map((medicine, idx) => (
              <MedicineCard
                key={medicine.id}
                medicine={medicine}
                index={(currentPage - 1) * PAGE_SIZE + idx}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="page-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(1)}
              >
                « 首页
              </button>
              <button
                className="page-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
              >
                ‹ 上一页
              </button>

              <div className="page-numbers">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      className={`page-num ${currentPage === pageNum ? 'active' : ''}`}
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                className="page-btn"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
              >
                下一页 ›
              </button>
              <button
                className="page-btn"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(totalPages)}
              >
                末页 »
              </button>
              <span className="page-info">
                第 {currentPage} / {totalPages} 页
              </span>
            </div>
          )}
        </>
      )}

      {showAddModal && (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowAddModal(false);
            setFormError('');
          }}
        >
          <div className="modal-content glass" onClick={e => e.stopPropagation()}>
            <button
              className="close-btn rotate-in"
              onClick={() => {
                setShowAddModal(false);
                setFormError('');
              }}
            >
              ×
            </button>
            <h2 className="modal-title">添加药品</h2>
            <form onSubmit={handleAddMedicine}>
              <div className="form-row">
                <div className="form-group half">
                  <label>药品名称 *</label>
                  <input
                    type="text"
                    value={newMed.name}
                    onChange={e => setNewMed({ ...newMed, name: e.target.value })}
                    placeholder="如：布洛芬胶囊"
                    autoFocus
                  />
                </div>
                <div className="form-group half">
                  <label>药品规格 *</label>
                  <input
                    type="text"
                    value={newMed.specification}
                    onChange={e => setNewMed({ ...newMed, specification: e.target.value })}
                    placeholder="如：0.3g*24粒"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group half">
                  <label>剩余数量 *</label>
                  <input
                    type="number"
                    min="0"
                    value={newMed.quantity}
                    onChange={e =>
                      setNewMed({ ...newMed, quantity: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="form-group half">
                  <label>有效期至 *</label>
                  <input
                    type="date"
                    value={newMed.expiryDate}
                    onChange={e => setNewMed({ ...newMed, expiryDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>使用说明</label>
                <textarea
                  rows={2}
                  value={newMed.usage}
                  onChange={e => setNewMed({ ...newMed, usage: e.target.value })}
                  placeholder="如：每次1粒，每日3次，饭后服用"
                />
              </div>

              <div className="form-group">
                <label>适用成员</label>
                <div className="member-tags">
                  {members.map(member => (
                    <button
                      key={member.id}
                      type="button"
                      className={`member-tag ${newMed.memberIds.includes(member.id) ? 'selected' : ''}`}
                      style={{
                        borderColor: newMed.memberIds.includes(member.id) ? member.color : '#e0e0e0',
                        backgroundColor: newMed.memberIds.includes(member.id)
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

              <div className="form-divider">
                <span>用药提醒设置（可选）</span>
              </div>

              <div className="form-row">
                <div className="form-group half">
                  <label>每日次数</label>
                  <input
                    type="number"
                    min="0"
                    max="6"
                    value={newMed.timesPerDay}
                    onChange={e =>
                      setNewMed({ ...newMed, timesPerDay: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="form-group half">
                  <label>开始时间</label>
                  <input
                    type="time"
                    value={newMed.startTime}
                    onChange={e => setNewMed({ ...newMed, startTime: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>每次剂量</label>
                <input
                  type="text"
                  value={newMed.dosageAmount}
                  onChange={e => setNewMed({ ...newMed, dosageAmount: e.target.value })}
                  placeholder="如：1粒 / 1袋 / 5ml"
                />
              </div>

              {formError && <div className="form-error">{formError}</div>}

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setShowAddModal(false);
                    setFormError('');
                  }}
                >
                  取消
                </button>
                <button type="submit" className="btn-primary">
                  添加药品
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
