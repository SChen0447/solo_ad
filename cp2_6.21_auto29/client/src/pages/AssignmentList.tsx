import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { Assignment } from '../types';

const AssignmentList = () => {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'graded'>('all');

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      const data = await api.getAssignments();
      setAssignments(data);
    } catch (error) {
      console.error('Failed to fetch assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAssignments = assignments.filter(a => {
    if (filter === 'all') return true;
    return a.status === filter;
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderStars = (score?: number) => {
    if (!score) return null;
    return (
      <span style={starContainerStyle}>
        {[1, 2, 3, 4, 5].map(i => (
          <span 
            key={i} 
            style={{
              ...starStyle,
              color: i <= score ? '#FBBF24' : '#E5E7EB'
            }}
          >
            ★
          </span>
        ))}
      </span>
    );
  };

  if (loading) {
    return (
      <div style={pageStyle}>
        <div className="container" style={{ textAlign: 'center', padding: '80px 0' }}>
          <p style={{ color: '#6B7280' }}>加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div className="container">
        <div style={headerStyle}>
          <div>
            <h1 style={pageTitleStyle}>作业管理</h1>
            <p style={pageSubtitleStyle}>查看和批改学员提交的作业</p>
          </div>
        </div>

        <div style={filterTabsStyle}>
          {[
            { key: 'all', label: '全部' },
            { key: 'pending', label: '待批改' },
            { key: 'graded', label: '已批改' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as typeof filter)}
              style={{
                ...tabButtonStyle,
                ...(filter === tab.key ? tabActiveStyle : {})
              }}
            >
              {tab.label}
              <span style={tabCountStyle}>
                {tab.key === 'all' 
                  ? assignments.length 
                  : assignments.filter(a => a.status === tab.key).length}
              </span>
            </button>
          ))}
        </div>

        <div style={listStyle}>
          {filteredAssignments.length === 0 ? (
            <div style={emptyStyle}>
              <div style={emptyIconStyle}>📭</div>
              <p style={emptyTextStyle}>暂无作业</p>
            </div>
          ) : (
            filteredAssignments.map(assignment => (
              <div
                key={assignment.id}
                style={cardStyle}
                onClick={() => navigate(`/assignments/${assignment.id}`)}
              >
                <div style={cardHeaderStyle}>
                  <img 
                    src={assignment.studentAvatar} 
                    alt={assignment.studentName} 
                    style={studentAvatarStyle} 
                  />
                  <div style={studentInfoStyle}>
                    <h3 style={studentNameStyle}>{assignment.studentName}</h3>
                    <p style={lessonTitleStyle}>{assignment.lessonTitle}</p>
                  </div>
                  <span style={{
                    ...statusBadgeStyle,
                    backgroundColor: assignment.status === 'graded' ? '#D1FAE5' : '#FEF3C7',
                    color: assignment.status === 'graded' ? '#065F46' : '#92400E'
                  }}>
                    {assignment.status === 'graded' ? '已批改' : '待批改'}
                  </span>
                </div>
                
                <div style={cardBodyStyle}>
                  <p style={descStyle}>{assignment.description}</p>
                  {assignment.attachments.length > 0 && (
                    <div style={attachmentsStyle}>
                      {assignment.attachments.map(att => (
                        <span key={att.id} style={attachmentTagStyle}>
                          📎 {att.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div style={cardFooterStyle}>
                  <span style={timeStyle}>提交于 {formatDate(assignment.submittedAt)}</span>
                  {assignment.status === 'graded' && (
                    <div style={gradeInfoStyle}>
                      {renderStars(assignment.score)}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const pageStyle: React.CSSProperties = {
  paddingTop: '80px',
  paddingBottom: '60px',
  minHeight: '100vh'
};

const headerStyle: React.CSSProperties = {
  marginBottom: '24px'
};

const pageTitleStyle: React.CSSProperties = {
  fontSize: '28px',
  fontWeight: '700',
  color: '#1F2937',
  marginBottom: '4px'
};

const pageSubtitleStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#6B7280'
};

const filterTabsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  marginBottom: '24px'
};

const tabButtonStyle: React.CSSProperties = {
  padding: '8px 16px',
  border: 'none',
  backgroundColor: '#F3F4F6',
  color: '#6B7280',
  fontSize: '14px',
  fontWeight: '500',
  borderRadius: '8px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '6px'
};

const tabActiveStyle: React.CSSProperties = {
  backgroundColor: '#7C3AED',
  color: '#FFFFFF'
};

const tabCountStyle: React.CSSProperties = {
  fontSize: '12px',
  padding: '2px 6px',
  borderRadius: '10px',
  backgroundColor: 'rgba(255, 255, 255, 0.2)'
};

const listStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '16px'
};

const cardStyle: React.CSSProperties = {
  backgroundColor: '#FFFFFF',
  borderRadius: '12px',
  padding: '20px',
  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  cursor: 'pointer',
  transition: 'all 0.2s ease'
};

const cardHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  marginBottom: '12px'
};

const studentAvatarStyle: React.CSSProperties = {
  width: '48px',
  height: '48px',
  borderRadius: '50%',
  objectFit: 'cover'
};

const studentInfoStyle: React.CSSProperties = {
  flex: 1
};

const studentNameStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#1F2937',
  marginBottom: '2px'
};

const lessonTitleStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#6B7280'
};

const statusBadgeStyle: React.CSSProperties = {
  padding: '4px 12px',
  borderRadius: '20px',
  fontSize: '12px',
  fontWeight: '500'
};

const cardBodyStyle: React.CSSProperties = {
  marginBottom: '12px'
};

const descStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#4B5563',
  lineHeight: '1.6',
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden'
};

const attachmentsStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '8px',
  marginTop: '10px'
};

const attachmentTagStyle: React.CSSProperties = {
  padding: '4px 10px',
  backgroundColor: '#F3F4F6',
  borderRadius: '6px',
  fontSize: '12px',
  color: '#6B7280'
};

const cardFooterStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingTop: '12px',
  borderTop: '1px solid #F3F4F6'
};

const timeStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#9CA3AF'
};

const gradeInfoStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px'
};

const starContainerStyle: React.CSSProperties = {
  display: 'flex',
  gap: '2px'
};

const starStyle: React.CSSProperties = {
  fontSize: '16px'
};

const emptyStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '80px 0'
};

const emptyIconStyle: React.CSSProperties = {
  fontSize: '48px',
  marginBottom: '16px'
};

const emptyTextStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#9CA3AF'
};

const styleSheet = document.createElement('style');
styleSheet.textContent = `
  div[style*="cardStyle"]:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
  }
`;
document.head.appendChild(styleSheet);

export default AssignmentList;
