import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { Assignment } from '../types';

const AssignmentDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');
  const [score, setScore] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAssignment();
  }, [id]);

  const fetchAssignment = async () => {
    if (!id) return;
    try {
      const data = await api.getAssignmentById(id);
      setAssignment(data);
      if (data.status === 'graded') {
        setFeedback(data.feedback || '');
        setScore(data.score || 0);
      }
    } catch (error) {
      console.error('Failed to fetch assignment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitGrade = async () => {
    if (!id || !feedback || score === 0) {
      alert('请填写反馈和评分');
      return;
    }
    if (feedback.length > 500) {
      alert('反馈不能超过500字');
      return;
    }

    setSubmitting(true);
    try {
      await api.gradeAssignment(id, { feedback, score });
      alert('批改成功！');
      fetchAssignment();
    } catch (error) {
      console.error('Failed to grade:', error);
      alert('批改失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
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

  if (!assignment) {
    return (
      <div style={pageStyle}>
        <div className="container" style={{ textAlign: 'center', padding: '80px 0' }}>
          <p style={{ color: '#6B7280' }}>作业不存在</p>
          <button 
            onClick={() => navigate('/assignments')}
            style={{
              marginTop: '16px',
              padding: '10px 20px',
              backgroundColor: '#7C3AED',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            返回作业列表
          </button>
        </div>
      </div>
    );
  }

  const isGraded = assignment.status === 'graded';

  return (
    <div style={pageStyle}>
      <div className="container">
        <button onClick={() => navigate('/assignments')} style={backButtonStyle}>
          ← 返回作业列表
        </button>

        <div style={headerStyle}>
          <div style={studentInfoStyle}>
            <img 
              src={assignment.studentAvatar} 
              alt={assignment.studentName} 
              style={studentAvatarStyle} 
            />
            <div>
              <h1 style={studentNameStyle}>{assignment.studentName}</h1>
              <p style={lessonTitleStyle}>{assignment.lessonTitle}</p>
            </div>
          </div>
          <span style={{
            ...statusBadgeStyle,
            backgroundColor: isGraded ? '#D1FAE5' : '#FEF3C7',
            color: isGraded ? '#065F46' : '#92400E'
          }}>
            {isGraded ? '已批改' : '待批改'}
          </span>
        </div>

        <div style={contentSectionStyle}>
          <h2 style={sectionTitleStyle}>作业内容</h2>
          <div 
            style={contentStyle}
            dangerouslySetInnerHTML={{ __html: assignment.content }}
          />
        </div>

        {assignment.attachments.length > 0 && (
          <div style={attachmentsSectionStyle}>
            <h2 style={sectionTitleStyle}>附件</h2>
            <div style={attachmentsListStyle}>
              {assignment.attachments.map(att => (
                <a key={att.id} href={att.url} style={attachmentItemStyle}>
                  <span style={attachmentIconStyle}>📄</span>
                  <div style={attachmentInfoStyle}>
                    <p style={attachmentNameStyle}>{att.name}</p>
                    <p style={attachmentSizeStyle}>{formatFileSize(att.size)}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        <div style={metaSectionStyle}>
          <p style={metaTextStyle}>提交时间：{formatDate(assignment.submittedAt)}</p>
          {isGraded && (
            <p style={metaTextStyle}>批改时间：{formatDate(assignment.gradedAt)}</p>
          )}
        </div>

        <div style={gradingSectionStyle}>
          <h2 style={sectionTitleStyle}>{isGraded ? '批改结果' : '作业批改'}</h2>
          
          <div style={scoreSectionStyle}>
            <span style={scoreLabelStyle}>评分：</span>
            <div style={starsContainerStyle}>
              {[1, 2, 3, 4, 5].map(i => (
                <button
                  key={i}
                  onClick={() => !isGraded && setScore(i)}
                  onMouseEnter={() => !isGraded && setHoveredStar(i)}
                  onMouseLeave={() => !isGraded && setHoveredStar(0)}
                  disabled={isGraded}
                  style={{
                    ...starButtonStyle,
                    ...(isGraded ? starDisabledStyle : {}),
                    transform: (hoveredStar === i || score === i) && !isGraded ? 'scale(1.2)' : 'scale(1)'
                  }}
                >
                  <span style={{
                    ...starIconStyle,
                    color: (hoveredStar >= i || score >= i) ? '#FBBF24' : '#E5E7EB'
                  }}>
                    ★
                  </span>
                </button>
              ))}
            </div>
            {score > 0 && <span style={scoreTextStyle}>{score} 星</span>}
          </div>

          <div style={feedbackSectionStyle}>
            <label style={feedbackLabelStyle}>
              反馈 ({feedback.length}/500)
            </label>
            <textarea
              value={feedback}
              onChange={e => setFeedback(e.target.value.slice(0, 500))}
              disabled={isGraded}
              placeholder="请输入批改反馈..."
              style={{
                ...feedbackTextareaStyle,
                ...(isGraded ? feedbackDisabledStyle : {})
              }}
            />
          </div>

          {!isGraded && (
            <button
              onClick={handleSubmitGrade}
              disabled={submitting}
              style={submitButtonStyle}
            >
              {submitting ? '提交中...' : '提交批改'}
            </button>
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

const backButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '8px 16px',
  border: 'none',
  backgroundColor: 'transparent',
  color: '#6B7280',
  fontSize: '14px',
  cursor: 'pointer',
  marginBottom: '24px'
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '32px',
  padding: '24px',
  backgroundColor: '#FFFFFF',
  borderRadius: '12px',
  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
};

const studentInfoStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '16px'
};

const studentAvatarStyle: React.CSSProperties = {
  width: '56px',
  height: '56px',
  borderRadius: '50%',
  objectFit: 'cover'
};

const studentNameStyle: React.CSSProperties = {
  fontSize: '20px',
  fontWeight: '600',
  color: '#1F2937',
  marginBottom: '4px'
};

const lessonTitleStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#6B7280'
};

const statusBadgeStyle: React.CSSProperties = {
  padding: '6px 14px',
  borderRadius: '20px',
  fontSize: '13px',
  fontWeight: '500'
};

const contentSectionStyle: React.CSSProperties = {
  backgroundColor: '#FFFFFF',
  borderRadius: '12px',
  padding: '24px',
  marginBottom: '20px',
  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#1F2937',
  marginBottom: '16px'
};

const contentStyle: React.CSSProperties = {
  fontSize: '14px',
  lineHeight: '1.8',
  color: '#4B5563'
};

const attachmentsSectionStyle: React.CSSProperties = {
  backgroundColor: '#FFFFFF',
  borderRadius: '12px',
  padding: '24px',
  marginBottom: '20px',
  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
};

const attachmentsListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px'
};

const attachmentItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '12px',
  backgroundColor: '#F9FAFB',
  borderRadius: '8px',
  textDecoration: 'none',
  color: 'inherit'
};

const attachmentIconStyle: React.CSSProperties = {
  fontSize: '24px'
};

const attachmentInfoStyle: React.CSSProperties = {
  flex: 1
};

const attachmentNameStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: '500',
  color: '#1F2937',
  marginBottom: '2px'
};

const attachmentSizeStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#9CA3AF'
};

const metaSectionStyle: React.CSSProperties = {
  display: 'flex',
  gap: '24px',
  marginBottom: '20px'
};

const metaTextStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#9CA3AF'
};

const gradingSectionStyle: React.CSSProperties = {
  backgroundColor: '#FFFFFF',
  borderRadius: '12px',
  padding: '24px',
  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
};

const scoreSectionStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  marginBottom: '20px'
};

const scoreLabelStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: '500',
  color: '#4B5563'
};

const starsContainerStyle: React.CSSProperties = {
  display: 'flex',
  gap: '4px'
};

const starButtonStyle: React.CSSProperties = {
  width: '36px',
  height: '36px',
  border: 'none',
  backgroundColor: 'transparent',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'transform 0.2s ease'
};

const starDisabledStyle: React.CSSProperties = {
  cursor: 'default'
};

const starIconStyle: React.CSSProperties = {
  fontSize: '28px',
  transition: 'color 0.15s ease'
};

const scoreTextStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#FBBF24',
  marginLeft: '8px'
};

const feedbackSectionStyle: React.CSSProperties = {
  marginBottom: '20px'
};

const feedbackLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '14px',
  fontWeight: '500',
  color: '#4B5563',
  marginBottom: '8px'
};

const feedbackTextareaStyle: React.CSSProperties = {
  width: '100%',
  minHeight: '120px',
  padding: '12px',
  border: '1px solid #E5E7EB',
  borderRadius: '8px',
  fontSize: '14px',
  lineHeight: '1.6',
  color: '#1F2937',
  resize: 'vertical',
  fontFamily: 'inherit'
};

const feedbackDisabledStyle: React.CSSProperties = {
  backgroundColor: '#F9FAFB',
  color: '#6B7280'
};

const submitButtonStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 24px',
  backgroundColor: '#7C3AED',
  color: '#FFFFFF',
  border: 'none',
  borderRadius: '8px',
  fontSize: '15px',
  fontWeight: '500',
  cursor: 'pointer'
};

export default AssignmentDetail;
