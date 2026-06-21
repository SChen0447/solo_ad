import { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { AdoptionRecord, FollowUpRecord } from '../types';

export default function AdoptionRecords() {
  const { adoptionRecords, addFollowUp } = useApp();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newFollowUp, setNewFollowUp] = useState({
    description: '',
    rating: 3
  });
  const [showFollowUpForm, setShowFollowUpForm] = useState<string | null>(null);

  const handleSubmitFollowUp = (record: AdoptionRecord) => {
    if (!newFollowUp.description.trim()) return;
    addFollowUp({
      applicationId: record.applicationId,
      petId: record.petId,
      date: new Date().toISOString(),
      description: newFollowUp.description,
      rating: newFollowUp.rating
    });
    setNewFollowUp({ description: '', rating: 3 });
    setShowFollowUpForm(null);
  };

  const renderStars = (rating: number, interactive = false, onChange?: (r: number) => void) => {
    return (
      <div className="stars">
        {[1, 2, 3, 4, 5].map(star => (
          <span
            key={star}
            className={`star ${star <= rating ? 'filled' : ''} ${interactive ? 'interactive' : ''}`}
            onClick={() => interactive && onChange && onChange(star)}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  const isOverdue = (date: string): boolean => {
    return new Date(date) <= new Date();
  };

  return (
    <div className="adoption-records">
      <div className="page-header">
        <h2 className="page-title">领养记录与回访管理</h2>
      </div>

      <div className="records-list">
        {adoptionRecords.length === 0 ? (
          <p className="empty-text">暂无领养记录</p>
        ) : (
          adoptionRecords.map(record => (
            <div
              key={record.id}
              className={`record-card ${record.archived ? 'archived' : ''} ${!record.archived && isOverdue(record.nextFollowUpDate) ? 'overdue' : ''}`}
            >
              <div
                className="record-header"
                onClick={() => setExpandedId(expandedId === record.id ? null : record.id)}
              >
                <div className="record-pet-info">
                  <span className="pet-icon">🐾</span>
                  <div>
                    <h3 className="record-pet-name">{record.petName}</h3>
                    <p className="record-adopter">领养人：{record.applicantName}</p>
                  </div>
                </div>
                <div className="record-meta">
                  <span className="adopt-date">
                    领养日期：{new Date(record.adoptedAt).toLocaleDateString()}
                  </span>
                  {record.archived ? (
                    <span className="archive-tag">已归档</span>
                  ) : (
                    <span className={`next-followup ${isOverdue(record.nextFollowUpDate) ? 'overdue' : ''}`}>
                      下次回访：{new Date(record.nextFollowUpDate).toLocaleDateString()}
                      {isOverdue(record.nextFollowUpDate) && ' ⚠️'}
                    </span>
                  )}
                  <span className="expand-icon">{expandedId === record.id ? '▲' : '▼'}</span>
                </div>
              </div>

              {expandedId === record.id && (
                <div className="record-details">
                  <div className="followups-section">
                    <h4 className="section-subtitle">
                      回访记录 ({record.followUps.length}/3)
                    </h4>
                    {record.followUps.length === 0 ? (
                      <p className="empty-text">暂无回访记录</p>
                    ) : (
                      <div className="followups-list">
                        {record.followUps.map((fu: FollowUpRecord) => (
                          <div key={fu.id} className="followup-item">
                            <div className="followup-header">
                              <span className="followup-date">
                                {new Date(fu.date).toLocaleDateString()}
                              </span>
                              {renderStars(fu.rating)}
                            </div>
                            <p className="followup-desc">{fu.description}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {!record.archived && (
                      <div className="add-followup-section">
                        {showFollowUpForm === record.id ? (
                          <div className="followup-form">
                            <textarea
                              value={newFollowUp.description}
                              onChange={(e) => setNewFollowUp(prev => ({ ...prev, description: e.target.value }))}
                              placeholder="请输入回访内容..."
                              rows={3}
                            />
                            <div className="form-row">
                              <span>评分：</span>
                              {renderStars(newFollowUp.rating, true, (r) => setNewFollowUp(prev => ({ ...prev, rating: r })))}
                            </div>
                            <div className="form-actions">
                              <button
                                className="action-btn submit-btn"
                                onClick={() => handleSubmitFollowUp(record)}
                              >
                                提交回访
                              </button>
                              <button
                                className="action-btn cancel-btn"
                                onClick={() => setShowFollowUpForm(null)}
                              >
                                取消
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            className="add-followup-btn"
                            onClick={() => setShowFollowUpForm(record.id)}
                          >
                            + 添加回访记录
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
