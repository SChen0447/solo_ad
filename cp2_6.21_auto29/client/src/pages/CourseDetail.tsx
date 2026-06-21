import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AssignmentModal from '../components/AssignmentModal';
import { api } from '../services/api';
import type { Course, Attachment } from '../types';

const CourseDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<{ id: number; title: string } | null>(null);

  useEffect(() => {
    const fetchCourse = async () => {
      if (!id) return;
      try {
        const data = await api.getCourseById(id);
        setCourse(data);
      } catch (error) {
        console.error('Failed to fetch course:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCourse();
  }, [id]);

  const handleSubmitAssignment = async (content: string, attachments: Attachment[]) => {
    if (!selectedLesson || !id) return;
    
    try {
      await api.submitAssignment({
        courseId: id,
        lessonId: selectedLesson.id,
        lessonTitle: selectedLesson.title,
        content,
        attachments
      });
      alert('作业提交成功！');
    } catch (error) {
      console.error('Failed to submit assignment:', error);
      alert('提交失败，请重试');
    }
  };

  const openSubmitModal = (lessonId: number, lessonTitle: string) => {
    setSelectedLesson({ id: lessonId, title: lessonTitle });
    setIsModalOpen(true);
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

  if (!course) {
    return (
      <div style={pageStyle}>
        <div className="container" style={{ textAlign: 'center', padding: '80px 0' }}>
          <p style={{ color: '#6B7280' }}>课程不存在</p>
          <button 
            onClick={() => navigate('/')}
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
            返回课程列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div className="container">
        <button onClick={() => navigate('/')} style={backButtonStyle}>
          ← 返回课程列表
        </button>

        <div style={heroStyle}>
          <div style={heroCoverStyle}>
            <img src={course.coverImage} alt={course.title} style={heroImageStyle} />
          </div>
          <div style={heroInfoStyle}>
            <h1 style={courseTitleStyle}>{course.title}</h1>
            <div style={instructorRowStyle}>
              <img src={course.instructorAvatar} alt={course.instructor} style={instructorAvatarStyle} />
              <span style={instructorNameStyle}>{course.instructor}</span>
              <span style={dotStyle}>•</span>
              <span style={metaStyle}>{course.totalLessons} 课时</span>
              <span style={dotStyle}>•</span>
              <span style={metaStyle}>开课时间：{course.startDate}</span>
            </div>
            <p style={descriptionStyle}>{course.description}</p>
            <div style={progressRowStyle}>
              <div style={progressBarContainerStyle}>
                <div 
                  style={{
                    ...progressBarFillStyle,
                    width: `${course.progress}%`,
                    backgroundColor: course.progress <= 33 ? '#EF4444' : course.progress <= 66 ? '#F59E0B' : '#10B981'
                  }} 
                />
              </div>
              <span style={progressTextStyle}>{course.progress}% 完成</span>
            </div>
          </div>
        </div>

        <div style={lessonsSectionStyle}>
          <h2 style={sectionTitleStyle}>课程内容</h2>
          <div style={lessonsListStyle}>
            {course.lessons.map((lesson, index) => (
              <div key={lesson.id} style={lessonItemStyle}>
                <div style={lessonHeaderStyle}>
                  <div style={lessonNumberStyle}>
                    {index < course.completedLessons ? '✓' : index + 1}
                  </div>
                  <div style={lessonInfoStyle}>
                    <h3 style={lessonTitleStyle}>{lesson.title}</h3>
                    <p style={lessonDescStyle}>{lesson.description}</p>
                  </div>
                </div>
                
                {lesson.assignment && (
                  <div style={assignmentBoxStyle}>
                    <div style={assignmentHeaderStyle}>
                      <span style={assignmentIconStyle}>📝</span>
                      <span style={assignmentLabelStyle}>课后作业</span>
                    </div>
                    <p style={assignmentDescStyle}>{lesson.assignment.description}</p>
                    
                    {lesson.assignment.attachments && lesson.assignment.attachments.length > 0 && (
                      <div style={attachmentsStyle}>
                        {lesson.assignment.attachments.map(att => (
                          <a key={att.id} href={att.url} style={attachmentItemStyle}>
                            📎 {att.name} ({formatFileSize(att.size)})
                          </a>
                        ))}
                      </div>
                    )}
                    
                    <button 
                      onClick={() => openSubmitModal(lesson.id, lesson.title)}
                      style={submitBtnStyle}
                    >
                      提交作业
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <AssignmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmitAssignment}
        lessonTitle={selectedLesson?.title || ''}
      />
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

const heroStyle: React.CSSProperties = {
  display: 'flex',
  gap: '32px',
  marginBottom: '48px'
};

const heroCoverStyle: React.CSSProperties = {
  width: '400px',
  height: '280px',
  borderRadius: '12px',
  overflow: 'hidden',
  flexShrink: 0,
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
};

const heroImageStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover'
};

const heroInfoStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: '16px'
};

const courseTitleStyle: React.CSSProperties = {
  fontSize: '28px',
  fontWeight: '700',
  color: '#1F2937',
  lineHeight: '1.3'
};

const instructorRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  flexWrap: 'wrap'
};

const instructorAvatarStyle: React.CSSProperties = {
  width: '32px',
  height: '32px',
  borderRadius: '50%',
  objectFit: 'cover'
};

const instructorNameStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: '500',
  color: '#4B5563'
};

const dotStyle: React.CSSProperties = {
  color: '#D1D5DB'
};

const metaStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#6B7280'
};

const descriptionStyle: React.CSSProperties = {
  fontSize: '15px',
  color: '#4B5563',
  lineHeight: '1.7',
  maxWidth: '500px'
};

const progressRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
  marginTop: 'auto'
};

const progressBarContainerStyle: React.CSSProperties = {
  flex: 1,
  maxWidth: '300px',
  height: '8px',
  backgroundColor: '#E5E7EB',
  borderRadius: '4px',
  overflow: 'hidden'
};

const progressBarFillStyle: React.CSSProperties = {
  height: '100%',
  borderRadius: '4px',
  transition: 'width 0.5s ease'
};

const progressTextStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#1F2937'
};

const lessonsSectionStyle: React.CSSProperties = {
  marginBottom: '40px'
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '20px',
  fontWeight: '600',
  color: '#1F2937',
  marginBottom: '20px'
};

const lessonsListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '16px'
};

const lessonItemStyle: React.CSSProperties = {
  backgroundColor: '#FFFFFF',
  borderRadius: '12px',
  padding: '20px',
  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
};

const lessonHeaderStyle: React.CSSProperties = {
  display: 'flex',
  gap: '16px',
  alignItems: 'flex-start'
};

const lessonNumberStyle: React.CSSProperties = {
  width: '36px',
  height: '36px',
  borderRadius: '50%',
  backgroundColor: '#E8DEF8',
  color: '#7C3AED',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '14px',
  fontWeight: '600',
  flexShrink: 0
};

const lessonInfoStyle: React.CSSProperties = {
  flex: 1
};

const lessonTitleStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#1F2937',
  marginBottom: '6px'
};

const lessonDescStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#6B7280',
  lineHeight: '1.6'
};

const assignmentBoxStyle: React.CSSProperties = {
  marginTop: '16px',
  marginLeft: '52px',
  padding: '16px',
  backgroundColor: '#F9FAFB',
  borderRadius: '8px',
  border: '1px solid #E5E7EB'
};

const assignmentHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  marginBottom: '8px'
};

const assignmentIconStyle: React.CSSProperties = {
  fontSize: '16px'
};

const assignmentLabelStyle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: '600',
  color: '#7C3AED'
};

const assignmentDescStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#4B5563',
  lineHeight: '1.6',
  marginBottom: '12px'
};

const attachmentsStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  marginBottom: '12px'
};

const attachmentItemStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#6B7280',
  textDecoration: 'none',
  padding: '6px 10px',
  backgroundColor: '#FFFFFF',
  borderRadius: '6px',
  border: '1px solid #E5E7EB',
  display: 'inline-block'
};

const submitBtnStyle: React.CSSProperties = {
  padding: '8px 16px',
  backgroundColor: '#7C3AED',
  color: '#FFFFFF',
  border: 'none',
  borderRadius: '6px',
  fontSize: '13px',
  fontWeight: '500',
  cursor: 'pointer'
};

const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @media (max-width: 768px) {
    div[style*="heroStyle"] {
      flex-direction: column !important;
    }
    div[style*="heroCoverStyle"] {
      width: 100% !important;
      height: 200px !important;
    }
    div[style*="assignmentBoxStyle"] {
      margin-left: 0 !important;
    }
  }
`;
document.head.appendChild(styleSheet);

export default CourseDetail;
