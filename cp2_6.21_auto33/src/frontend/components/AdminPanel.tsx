import { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { ApplicationStatus, Pet } from '../types';

export default function AdminPanel() {
  const { applications, updateApplicationStatus, pets } = useApp();
  const [filter, setFilter] = useState<ApplicationStatus | 'all'>('all');
  const [pulsingId, setPulsingId] = useState<string | null>(null);

  const getPetName = (petId: string): string => {
    const pet = pets.find((p: Pet) => p.id === petId);
    return pet ? pet.name : '未知';
  };

  const filteredApplications = filter === 'all'
    ? applications
    : applications.filter(a => a.status === filter);

  const handleStatusChange = (id: string, status: ApplicationStatus) => {
    setPulsingId(id);
    updateApplicationStatus(id, status);
    setTimeout(() => setPulsingId(null), 200);
  };

  const getStatusClass = (status: ApplicationStatus): string => {
    switch (status) {
      case '待审核': return 'status-pending';
      case '通过': return 'status-approved';
      case '驳回': return 'status-rejected';
    }
  };

  return (
    <div className="admin-panel">
      <div className="page-header">
        <h2 className="page-title">申请审核管理</h2>
        <div className="filter-tabs">
          {(['all', '待审核', '通过', '驳回'] as const).map(f => (
            <button
              key={f}
              className={`filter-btn ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? '全部' : f}
            </button>
          ))}
        </div>
      </div>

      <div className="applications-list">
        {filteredApplications.length === 0 ? (
          <p className="empty-text">暂无申请记录</p>
        ) : (
          filteredApplications.map(app => (
            <div
              key={app.id}
              className={`application-card ${pulsingId === app.id ? 'pulsing' : ''}`}
            >
              <div className="app-card-header">
                <div className="app-pet-info">
                  <span className="pet-icon">🐾</span>
                  <div>
                    <h3 className="app-pet-name">{getPetName(app.petId)}</h3>
                    <p className="app-date">申请时间：{new Date(app.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <span className={`status-tag ${getStatusClass(app.status)}`}>
                  {app.status}
                </span>
              </div>
              <div className="app-card-body">
                <div className="app-info-grid">
                  <div className="info-item">
                    <span className="info-label">申请人</span>
                    <span className="info-value">{app.applicantName}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">联系方式</span>
                    <span className="info-value">{app.contact}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">居住类型</span>
                    <span className="info-value">{app.housingType}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">其他宠物</span>
                    <span className="info-value">{app.hasOtherPets ? '有' : '无'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">陪伴时间</span>
                    <span className="info-value">{app.dailyCompanionHours}小时/天</span>
                  </div>
                </div>
                <div className="app-images">
                  <span className="info-label">居住环境：</span>
                  {app.livingEnvImages.map((img, idx) => (
                    <img key={idx} src={img} alt={`环境${idx + 1}`} className="env-thumb" />
                  ))}
                </div>
              </div>
              {app.status === '待审核' && (
                <div className="app-actions">
                  <button
                    className="action-btn approve-btn"
                    onClick={() => handleStatusChange(app.id, '通过')}
                  >
                    ✓ 通过
                  </button>
                  <button
                    className="action-btn reject-btn"
                    onClick={() => handleStatusChange(app.id, '驳回')}
                  >
                    ✗ 驳回
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
