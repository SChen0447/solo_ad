import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AssignmentModal from '../components/AssignmentModal';
import { api, type Course, type Lesson, type Attachment } from '../services/api';
import './CourseDetailPage.css';

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const CourseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | undefined>();
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        const data = await api.getCourse(id);
        setCourse(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleSubmitAssignment = async (content: string, attachments: Attachment[]) => {
    if (!course || !selectedLesson) return;
    await api.submitAssignment({
      courseId: course.id,
      lessonId: selectedLesson.id,
      content,
      attachments
    });
    setSubmitSuccess(true);
    setTimeout(() => setSubmitSuccess(false), 3000);
  };

  const openSubmitModal = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setModalOpen(true);
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="detail-skeleton">
          <div className="detail-skeleton-cover" />
          <div className="detail-skeleton-body">
            <div className="skeleton-line w50 lg" />
            <div className="skeleton-line w30" />
            <div className="skeleton-line w90" />
            <div className="skeleton-line w80" />
          </div>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="page-container">
        <div className="empty-state-large">
          <div className="empty-icon-lg">📚</div>
          <div className="empty-title">课程不存在</div>
          <button className="btn btn-primary mt-16" onClick={() => navigate('/')}>
            返回课程列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <button className="back-btn" onClick={() => navigate('/')}>
        ← 返回课程列表
      </button>

      {submitSuccess && (
        <div className="success-toast">
          <span className="toast-icon">✓</span>
          作业提交成功！讲师将尽快批改
        </div>
      )}

      <div className="course-detail-hero">
        <div className="detail-cover">
          <img src={course.coverImage} alt={course.title} />
        </div>
        <div className="detail-info">
          <div className="detail-tags">
            <span className="tag tag-primary">技能工作坊</span>
            <span className="tag tag-outline">{course.totalLessons} 课时</span>
          </div>
          <h1 className="detail-title">{course.title}</h1>
          <div className="detail-meta">
            <div className="instructor-info">
              <img src={course.instructorAvatar} alt={course.instructorName} className="instructor-avatar-lg" />
              <div>
                <div className="instructor-name">{course.instructorName}</div>
                <div className="instructor-role">课程讲师</div>
              </div>
            </div>
            <div className="detail-time">
              <span className="meta-icon">📅</span>
              <span>开课时间：{formatDate(course.startTime)}</span>
            </div>
          </div>
          <p className="detail-description">{course.description}</p>
        </div>
      </div>

      <div className="lessons-section">
        <div className="section-header">
          <h2 className="section-title">课程章节与作业</h2>
          <span className="section-count">共 {course.lessons.length} 个课时</span>
        </div>

        <div className="lessons-list">
          {course.lessons.map((lesson, idx) => (
            <div key={lesson.id} className="lesson-item">
              <div className="lesson-number">{String(idx + 1).padStart(2, '0')}</div>
              <div className="lesson-content">
                <h3 className="lesson-title">{lesson.title}</h3>
                {lesson.assignment && (
                  <div className="assignment-box">
                    <div className="assignment-header">
                      <span className="assignment-icon">📝</span>
                      <span className="assignment-label">课后作业</span>
                      {lesson.assignment.deadline && (
                        <span className="deadline-tag">截止：{formatDate(lesson.assignment.deadline)}</span>
                      )}
                    </div>
                    <p className="assignment-desc">{lesson.assignment.description}</p>
                    {lesson.assignment.attachments?.length > 0 && (
                      <div className="assignment-files">
                        {lesson.assignment.attachments.map(att => (
                          <a
                            key={att.id}
                            href={att.url}
                            target="_blank"
                            rel="noreferrer"
                            className="file-chip"
                          >
                            📎 {att.name}
                          </a>
                        ))}
                      </div>
                    )}
                    <div className="assignment-actions">
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => openSubmitModal(lesson)}
                      >
                        提交作业
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <AssignmentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmitAssignment}
        lesson={selectedLesson}
      />
    </div>
  );
};

export default CourseDetailPage;
