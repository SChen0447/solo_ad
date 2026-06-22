import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Recruitment } from '../types';

export default function RecruitmentList() {
  const [recruitments, setRecruitments] = useState<Recruitment[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRecruitments();
  }, []);

  const fetchRecruitments = async () => {
    try {
      const response = await fetch('/api/recruitment/list');
      const data = await response.json();
      setRecruitments(data);
    } catch (err) {
      console.error('Failed to fetch recruitments:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getDaysRemaining = (deadline: string) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diff = deadlineDate.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  };

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">招新列表</h1>
          <p className="page-subtitle">浏览并报名感兴趣的社团</p>
        </div>
        <div className="recruitment-list">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card" style={{ height: '160px' }}>
              <div className="skeleton" style={{ height: '100%' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">招新列表</h1>
        <p className="page-subtitle">浏览并报名感兴趣的社团</p>
      </div>

      {recruitments.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <div className="empty-state-title">暂无招新信息</div>
          <div className="empty-state-desc">请稍后再来查看</div>
        </div>
      ) : (
        <div className="recruitment-list">
          {recruitments.map((recruitment) => {
            const daysRemaining = getDaysRemaining(recruitment.deadline);
            return (
              <div key={recruitment.id} className="recruitment-item">
                <div className="recruitment-header">
                  <div>
                    <h3 className="recruitment-name">{recruitment.title}</h3>
                    <div className="recruitment-club">{recruitment.clubName}</div>
                  </div>
                  <div className="recruitment-count">
                    <span>👥</span>
                    <span>{recruitment.applicationCount} 人已报名</span>
                  </div>
                </div>
                <p className="recruitment-description">{recruitment.description}</p>
                <div className="recruitment-footer">
                  <div className="recruitment-deadline">
                    {daysRemaining > 0 ? (
                      <span className="text-warning">
                        📅 截止日期：{formatDate(recruitment.deadline)}（还剩 {daysRemaining} 天）
                      </span>
                    ) : (
                      <span className="text-error">
                        📅 已截止
                      </span>
                    )}
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={() => navigate(`/apply/${recruitment.id}`)}
                    disabled={daysRemaining <= 0}
                  >
                    立即报名
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
