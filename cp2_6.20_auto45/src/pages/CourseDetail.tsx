import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  fetchCourse,
  fetchFeedbacks,
  signUp,
  cancelSignUp,
  submitFeedback,
  getTypeColor
} from '../api';
import type { Course, Feedback } from '../api';

interface CourseDetailProps {
  courses: Course[];
  updateCourseEnrollment: (courseId: number, enrolled: number, remaining: number) => void;
  refreshCourses: () => void;
}

export default function CourseDetail({
  courses,
  updateCourseEnrollment,
  refreshCourses
}: CourseDetailProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const courseId = id ? parseInt(id) : 0;

  const [course, setCourse] = useState<Course | null>(null);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [commentError, setCommentError] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [hasSubmittedFeedback, setHasSubmittedFeedback] = useState(false);

  useEffect(() => {
    loadData();
  }, [courseId]);

  const loadData = async () => {
    try {
      const [courseData, feedbacksData] = await Promise.all([
        fetchCourse(courseId),
        fetchFeedbacks(courseId)
      ]);
      setCourse(courseData);
      setFeedbacks(feedbacksData);
      setHasSubmittedFeedback(feedbacksData.some(f => f.userId === 'user_001'));
    } catch (err) {
      console.error('加载课程详情失败:', err);
      showToast('加载失败，请重试', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg: string, type: string = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  const handleSignUp = async () => {
    if (!course) return;
    setActionLoading(true);
    try {
      const result = await signUp(courseId);
      updateCourseEnrollment(courseId, result.enrolled, result.remaining);
      setCourse(prev => prev ? {
        ...prev,
        enrolled: result.enrolled,
        remaining: result.remaining,
        isEnrolled: true
      } : null);
      showToast('报名成功！期待与您相见 🎉');
    } catch (err: any) {
      showToast(err.message || '报名失败', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelSignUp = async () => {
    if (!course) return;
    setShowCancelModal(false);
    setActionLoading(true);
    try {
      const result = await cancelSignUp(courseId);
      updateCourseEnrollment(courseId, result.enrolled, result.remaining);
      setCourse(prev => prev ? {
        ...prev,
        enrolled: result.enrolled,
        remaining: result.remaining,
        isEnrolled: false
      } : null);
      showToast('已取消报名');
    } catch (err: any) {
      showToast(err.message || '取消失败', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (rating === 0) {
      showToast('请选择评分', 'error');
      return;
    }
    if (comment.length > 150) {
      setCommentError(true);
      return;
    }
    setFeedbackLoading(true);
    try {
      const result = await submitFeedback(courseId, rating, comment);
      setFeedbacks(prev => [result.feedback, ...prev]);
      setHasSubmittedFeedback(true);
      setRating(0);
      setComment('');
      refreshCourses();
      showToast('反馈提交成功，感谢您的评价！');
    } catch (err: any) {
      showToast(err.message || '提交失败', 'error');
    } finally {
      setFeedbackLoading(false);
    }
  };

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setComment(value);
    if (value.length > 150) {
      setCommentError(true);
    } else {
      setCommentError(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>😕</div>
        <div style={{ fontSize: '18px', color: '#5D4037', marginBottom: '16px' }}>
          课程不存在
        </div>
        <Link to="/" className="btn btn-primary">返回课程列表</Link>
      </div>
    );
  }

  const typeColor = getTypeColor(course.type);
  const isFull = course.remaining <= 0;
  const remainingRatio = course.remaining / course.capacity;
  const isLowStock = remainingRatio < 0.2 && !isFull;
  const courseEnded = new Date(course.endTime) < new Date();
  const canSubmitFeedback = course.isEnrolled && courseEnded && !hasSubmittedFeedback;

  return (
    <>
      {toast && (
        <div className={`toast ${toast.type}`}>{toast.msg}</div>
      )}

      {showCancelModal && (
        <div className="modal-overlay" onClick={() => setShowCancelModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">⚠️ 确认取消报名</div>
            <div className="modal-text">
              您确定要取消《{course.title}》的报名吗？<br />
              取消后名额将释放给其他学员，如需重新报名可能需要等待。
            </div>
            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowCancelModal(false)}
                disabled={actionLoading}
              >
                再想想
              </button>
              <button
                className="btn btn-danger"
                onClick={handleCancelSignUp}
                disabled={actionLoading}
              >
                {actionLoading ? <><div className="spinner" />处理中</> : '确认取消'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'none',
            border: 'none',
            color: '#8B4513',
            cursor: 'pointer',
            fontSize: '14px',
            padding: '8px 12px',
            borderRadius: '8px',
            transition: 'all 0.2s ease',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,69,19,0.08)'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >
          ← 返回课程列表
        </button>
      </div>

      <div
        className="card"
        style={{
          padding: '32px',
          marginBottom: '24px',
          borderLeft: `6px solid ${typeColor}`
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
          <span
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              color: 'white',
              background: typeColor
            }}
          >
            {course.type}
          </span>
          <span
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              background: 'rgba(107,142,35,0.1)',
              color: '#6B8E23'
            }}
          >
            {course.difficulty}
          </span>
          {course.isEnrolled && (
            <span
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                background: 'rgba(76,175,80,0.12)',
                color: '#2E7D32'
              }}
            >
              ✅ 已报名
            </span>
          )}
          {courseEnded && (
            <span
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                background: 'rgba(158,158,158,0.15)',
                color: '#616161'
              }}
            >
              已结束
            </span>
          )}
        </div>

        <h1
          style={{
            fontSize: '28px',
            fontWeight: 700,
            color: '#3E2723',
            marginBottom: '16px',
            lineHeight: 1.3
          }}
        >
          {course.title}
        </h1>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
            marginBottom: '24px',
            padding: '20px',
            background: 'rgba(245,240,225,0.5)',
            borderRadius: '12px'
          }}
        >
          {[
            { icon: '📅', label: '课程日期', value: course.date },
            { icon: '🕐', label: '上课时间', value: course.time },
            { icon: '📍', label: '上课地点', value: course.location },
            { icon: '👨‍🏫', label: '授课讲师', value: course.instructor }
          ].map((item, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <span style={{ fontSize: '22px' }}>{item.icon}</span>
              <div>
                <div style={{ fontSize: '12px', color: '#8D6E63', marginBottom: '2px' }}>{item.label}</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#3E2723' }}>{item.value}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#5D4037' }}>
              报名进度
            </div>
            <div style={{ fontSize: '14px', color: '#6D4C41' }}>
              已报名 <span style={{ fontWeight: 700, color: isFull ? '#C62828' : '#D2691E' }}>{course.enrolled}</span>
              {' / '}
              {course.capacity} 人
            </div>
          </div>
          <div
            style={{
              width: '100%',
              height: '10px',
              borderRadius: '5px',
              background: '#EFEBE0',
              overflow: 'hidden',
              marginBottom: '6px'
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${(course.enrolled / course.capacity) * 100}%`,
                borderRadius: '5px',
                background: isFull
                  ? '#E53935'
                  : isLowStock
                  ? 'linear-gradient(90deg, #FF8C00, #FF6F00)'
                  : 'linear-gradient(90deg, #8BC34A, #6B8E23)',
                transition: 'width 0.3s ease'
              }}
            />
          </div>
          <div style={{ fontSize: '13px', color: isLowStock ? '#E65100' : '#8D6E63', fontWeight: isLowStock ? 600 : 400 }}>
            {isFull ? '😢 名额已满，下次早些哦' :
             isLowStock ? `🔥 仅剩 ${course.remaining} 个名额，手慢无！` :
             `还剩 ${course.remaining} 个名额`}
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#5D4037', marginBottom: '10px' }}>
            📝 课程介绍
          </h3>
          <p style={{ color: '#5D4037', lineHeight: 1.8, fontSize: '14px' }}>
            {course.description}
          </p>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#5D4037', marginBottom: '12px' }}>
            🎒 材料清单
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '10px'
            }}
          >
            {course.materials.map((material, idx) => (
              <div
                key={idx}
                style={{
                  padding: '10px 14px',
                  background: 'rgba(210,105,30,0.06)',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: '#5D4037',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span>📦</span>
                {material}
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '16px',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '20px',
            background: 'linear-gradient(135deg, #FAF6EC 0%, #FFFFFF 100%)',
            borderRadius: '12px',
            border: '1px solid rgba(210,105,30,0.1)'
          }}
        >
          <div>
            <div style={{ fontSize: '13px', color: '#8D6E63', marginBottom: '4px' }}>课程费用</div>
            <div style={{ fontSize: '32px', fontWeight: 700, color: '#D2691E' }}>
              ¥{course.price}
              <span style={{ fontSize: '14px', color: '#8D6E63', fontWeight: 400 }}> / 人</span>
            </div>
            {course.avgRating > 0 && (
              <div style={{ marginTop: '6px', fontSize: '13px', color: '#6D4C41' }}>
                <span style={{ color: '#FFB300' }}>{'★'.repeat(Math.round(course.avgRating))}</span>
                <span style={{ color: '#E0E0E0' }}>{'★'.repeat(5 - Math.round(course.avgRating))}</span>
                {' '}{course.avgRating} 分 · {course.feedbackCount} 条评价
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            {course.isEnrolled ? (
              <button
                className="btn btn-danger"
                onClick={() => setShowCancelModal(true)}
                disabled={actionLoading || courseEnded}
                style={{ minWidth: '140px' }}
              >
                {actionLoading ? <><div className="spinner" />处理中</> : '取消报名'}
              </button>
            ) : (
              <button
                className="btn btn-primary"
                onClick={handleSignUp}
                disabled={actionLoading || isFull || courseEnded}
                style={{ minWidth: '140px' }}
              >
                {actionLoading ? (
                  <><div className="spinner" />报名中</>
                ) : isFull ? (
                  '名额已满'
                ) : courseEnded ? (
                  '课程已结束'
                ) : (
                  '🚀 立即报名'
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      <div
        className="card"
        style={{
          padding: '28px',
          marginBottom: '24px'
        }}
      >
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#5D4037', marginBottom: '20px' }}>
          💬 学员反馈
          <span style={{ fontSize: '14px', fontWeight: 400, color: '#8D6E63', marginLeft: '10px' }}>
            共 {feedbacks.length} 条评价
          </span>
        </h3>

        {canSubmitFeedback && (
          <div
            style={{
              padding: '20px',
              background: 'rgba(210,105,30,0.04)',
              borderRadius: '12px',
              marginBottom: '24px',
              border: '1px dashed rgba(210,105,30,0.3)'
            }}
          >
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#5D4037', marginBottom: '14px' }}>
              ✍️ 分享您的学习体验
            </div>

            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '13px', color: '#6D4C41', marginBottom: '8px' }}>课程评分</div>
              <div style={{ display: 'flex', gap: '4px' }}>
                {[1, 2, 3, 4, 5].map(star => {
                  const isActive = (hoverRating || rating) >= star;
                  return (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        fontSize: '32px',
                        color: isActive ? '#FFB300' : '#E0E0E0',
                        transition: 'all 0.15s ease',
                        transform: isActive ? 'scale(1.1)' : 'scale(1)',
                        textShadow: isActive ? '0 2px 8px rgba(255,179,0,0.3)' : 'none',
                        lineHeight: 1
                      }}
                    >
                      ★
                    </button>
                  );
                })}
                {rating > 0 && (
                  <span style={{ alignSelf: 'center', marginLeft: '10px', fontSize: '14px', color: '#D2691E', fontWeight: 600 }}>
                    {['差评', '一般', '还行', '推荐', '超赞'][rating - 1]}
                  </span>
                )}
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#6D4C41', marginBottom: '8px' }}>
                <span>文字评论</span>
                <span style={{
                  color: comment.length > 150 ? '#E53935' : '#8D6E63',
                  fontWeight: comment.length > 150 ? 600 : 400
                }}>
                  {comment.length}/150
                </span>
              </div>
              <textarea
                value={comment}
                onChange={handleCommentChange}
                placeholder="说说您对这门课程的真实感受吧..."
                rows={4}
                className={`input-field ${commentError ? 'error' : ''}`}
                style={{ resize: 'vertical', minHeight: '100px' }}
              />
            </div>

            <button
              className="btn btn-primary"
              onClick={handleSubmitFeedback}
              disabled={feedbackLoading || rating === 0}
            >
              {feedbackLoading ? <><div className="spinner" />提交中</> : '📤 提交反馈'}
            </button>
          </div>
        )}

        {course.isEnrolled && courseEnded && hasSubmittedFeedback && (
          <div
            style={{
              padding: '14px 18px',
              background: 'rgba(76,175,80,0.08)',
              borderRadius: '10px',
              marginBottom: '20px',
              fontSize: '14px',
              color: '#2E7D32',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span style={{ fontSize: '18px' }}>✅</span>
            您已提交该课程的反馈，感谢您的宝贵意见！
          </div>
        )}

        {feedbacks.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {feedbacks.map((fb, idx) => (
              <div
                key={fb.id}
                style={{
                  padding: '18px',
                  background: 'rgba(245,240,225,0.4)',
                  borderRadius: '10px',
                  animation: `fadeIn 0.4s ease ${idx * 0.05}s both`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: `linear-gradient(135deg, ${typeColor}, #E07A2F)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '16px',
                        fontWeight: 700
                      }}
                    >
                      {fb.userName.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#3E2723' }}>{fb.userName}</div>
                      <div style={{ fontSize: '12px', color: '#8D6E63' }}>
                        {new Date(fb.createdAt).toLocaleDateString('zh-CN', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '16px', color: '#FFB300' }}>
                    {'★'.repeat(fb.rating)}
                    <span style={{ color: '#E0E0E0' }}>{'★'.repeat(5 - fb.rating)}</span>
                  </div>
                </div>
                {fb.comment && (
                  <p style={{ color: '#5D4037', lineHeight: 1.7, fontSize: '14px', paddingLeft: '46px' }}>
                    {fb.comment}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '32px', textAlign: 'center', color: '#8D6E63' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>💭</div>
            <div style={{ fontSize: '15px' }}>暂无学员评价</div>
          </div>
        )}
      </div>
    </>
  );
}
