import React, { useState, useEffect } from 'react';
import { Assignment } from '../types';
import { getAssignments } from '../services/api';

interface AssignmentListProps {
  onSelectAssignment: (assignment: Assignment) => void;
  onViewHistory: () => void;
  onLogout: () => void;
  userEmail: string;
}

const AssignmentList: React.FC<AssignmentListProps> = ({
  onSelectAssignment,
  onViewHistory,
  onLogout,
  userEmail,
}) => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        const data = await getAssignments();
        setAssignments(data);
      } catch (err) {
        console.error('Failed to fetch assignments:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAssignments();
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getCountdown = (deadline: string) => {
    const deadlineDate = new Date(deadline);
    const diff = deadlineDate.getTime() - now.getTime();

    if (diff <= 0) return '已截止';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (days > 0) return `${days}天 ${hours}小时`;
    if (hours > 0) return `${hours}小时 ${minutes}分钟`;
    return `${minutes}分 ${seconds}秒`;
  };

  const renderStars = (difficulty: number) => {
    return (
      <div className="stars">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={star <= difficulty ? 'star filled' : 'star'}
          >
            ☆
          </span>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <h1 className="app-title">代码评测平台</h1>
          <div className="header-actions">
            <span className="user-email">{userEmail}</span>
            <button className="btn btn-secondary" onClick={onViewHistory}>
              历史记录
            </button>
            <button className="btn btn-outline" onClick={onLogout}>
              退出登录
            </button>
          </div>
        </div>
      </header>

      <main className="main-content">
        <h2 className="page-title">作业列表</h2>
        <div className="assignment-grid">
          {assignments.map((assignment) => (
            <div
              key={assignment.id}
              className="assignment-card"
              onClick={() => onSelectAssignment(assignment)}
            >
              <h3 className="assignment-title">{assignment.title}</h3>
              {renderStars(assignment.difficulty)}
              <p className="assignment-description">{assignment.description}</p>
              <div className="assignment-footer">
                <span className="deadline-label">截止时间：</span>
                <span className="countdown">{getCountdown(assignment.deadline)}</span>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default AssignmentList;
