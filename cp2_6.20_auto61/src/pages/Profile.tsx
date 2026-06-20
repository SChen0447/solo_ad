import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Award, Calendar } from 'lucide-react';
import { useStore } from '../store/useStore';
import { ACHIEVEMENTS } from '../types';
import AchievementBadge from '../components/AchievementBadge';

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { enrollments } = useStore();
  
  const sortedEnrollments = [...enrollments].sort((a, b) => {
    if (!a.course || !b.course) return 0;
    return new Date(b.course.dateTime).getTime() - new Date(a.course.dateTime).getTime();
  });
  
  const completedCourses = sortedEnrollments.filter(e => e.course?.isEnded);
  const completedCount = completedCourses.length;
  
  const handleEnrollmentClick = (courseId: string) => {
    navigate(`/course/${courseId}`);
  };
  
  return (
    <div className="page-transition-enter">
      <h1 className="page-title">个人中心</h1>
      
      <div className="profile-header">
        <div className="profile-avatar">🧑‍🎨</div>
        <div className="profile-info">
          <h2>手工艺爱好者</h2>
          <p>已完成 {completedCount} 门课程，继续加油！</p>
        </div>
      </div>
      
      <div className="achievements-section">
        <h3 className="detail-section-title">
          <Award size={20} />
          成就徽章
        </h3>
        <div className="achievements-list">
          {ACHIEVEMENTS.map((achievement) => (
            <AchievementBadge
              key={achievement.id}
              achievement={achievement}
              unlocked={completedCount >= achievement.requirement}
              currentProgress={completedCount}
            />
          ))}
        </div>
      </div>
      
      <div className="detail-section">
        <h3 className="detail-section-title">
          <Calendar size={20} />
          我的课程 ({sortedEnrollments.length})
        </h3>
        
        {sortedEnrollments.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px 20px' }}>
            <div className="empty-state-icon">📚</div>
            <p>还没有报名任何课程</p>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/')}
              style={{ marginTop: '16px' }}
            >
              去浏览课程
            </button>
          </div>
        ) : (
          <div>
            {sortedEnrollments.map((enrollment) => (
              <div
                key={enrollment.id}
                className="enrollment-card"
                onClick={() => enrollment.course && handleEnrollmentClick(enrollment.course.id)}
              >
                <div className="enrollment-info">
                  <h3>{enrollment.course?.title}</h3>
                  <p>
                    <Calendar size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                    {enrollment.course?.dateTime}
                  </p>
                </div>
                <div className="enrollment-status">
                  {enrollment.course?.isEnded ? (
                    enrollment.feedbackSubmitted ? (
                      <div className="feedback-submitted">
                        <CheckCircle size={16} />
                        <span>已反馈</span>
                      </div>
                    ) : (
                      <span style={{ color: '#D2691E', fontSize: '0.85rem' }}>待反馈</span>
                    )
                  ) : (
                    <span style={{ color: '#6B8E23', fontSize: '0.85rem' }}>待上课</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
