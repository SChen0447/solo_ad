import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Users, Package, Star, CheckCircle } from 'lucide-react';
import { useStore } from '../store/useStore';
import { CURRENT_USER_ID, DIFFICULTY_LABELS } from '../types';
import type { Feedback } from '../types';
import * as api from '../api';
import StarRating from '../components/StarRating';
import FeedbackCard from '../components/FeedbackCard';
import Modal from '../components/Modal';

const CourseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { courses, enrollments, signUpForCourse, cancelCourseEnrollment, submitCourseFeedback } = useStore();
  
  const [course, setCourse] = useState(courses.find(c => c.id === id));
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [commentError, setCommentError] = useState(false);
  const [newFeedbackId, setNewFeedbackId] = useState<string | null>(null);
  
  useEffect(() => {
    const foundCourse = courses.find(c => c.id === id);
    setCourse(foundCourse);
    
    const enrollment = enrollments.find(e => e.courseId === id && e.userId === CURRENT_USER_ID);
    setIsEnrolled(!!enrollment);
    setFeedbackSubmitted(enrollment?.feedbackSubmitted || false);
    
    if (id) {
      api.fetchFeedback(id).then(data => {
        setFeedbackList(data);
      });
    }
  }, [id, courses, enrollments]);
  
  useEffect(() => {
    const updatedCourse = courses.find(c => c.id === id);
    if (updatedCourse) {
      setCourse(updatedCourse);
    }
  }, [courses, id]);
  
  if (!course) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">❓</div>
        <p>课程不存在</p>
        <Link to="/" className="btn btn-primary" style={{ marginTop: '16px' }}>
          返回课程列表
        </Link>
      </div>
    );
  }
  
  const remainingSpots = course.maxCapacity - course.currentEnrollment;
  const remainingPercent = (remainingSpots / course.maxCapacity) * 100;
  const isFull = remainingSpots <= 0;
  const canSubmitFeedback = course.isEnded && isEnrolled && !feedbackSubmitted;
  
  const handleSignUp = async () => {
    setIsSigningUp(true);
    const success = await signUpForCourse(course.id);
    
    setTimeout(() => {
      setIsSigningUp(false);
      if (success) {
        setIsEnrolled(true);
      }
    }, 300);
  };
  
  const handleCancelConfirm = async () => {
    setShowCancelModal(false);
    setIsCanceling(true);
    
    const success = await cancelCourseEnrollment(course.id);
    
    setTimeout(() => {
      setIsCanceling(false);
      if (success) {
        setIsEnrolled(false);
        setFeedbackSubmitted(false);
      }
    }, 300);
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
  
  const handleSubmitFeedback = async () => {
    if (rating === 0) {
      alert('请选择评分');
      return;
    }
    
    if (comment.length > 150) {
      setCommentError(true);
      return;
    }
    
    setIsSubmittingFeedback(true);
    
    const feedback = await submitCourseFeedback(course.id, rating, comment);
    
    setTimeout(() => {
      setIsSubmittingFeedback(false);
      if (feedback) {
        setFeedbackSubmitted(true);
        setFeedbackList([feedback, ...feedbackList]);
        setNewFeedbackId(feedback.id);
        setRating(0);
        setComment('');
      }
    }, 300);
  };
  
  return (
    <div className="page-transition-enter">
      <Link to="/" className="back-link">
        <ArrowLeft size={18} />
        返回课程列表
      </Link>
      
      <div className="detail-container">
        <div className="detail-header">
          <div>
            <h1 className="detail-title">{course.title}</h1>
            <span className={`difficulty-badge difficulty-${course.difficulty}`} style={{ marginRight: '12px' }}>
              {DIFFICULTY_LABELS[course.difficulty]}
            </span>
            <div className="average-rating" style={{ marginTop: '12px' }}>
              <Star size={20} fill="#FFD700" stroke="#FFD700" />
              <span>{course.averageRating}</span>
              <span style={{ color: '#999', fontWeight: 'normal', fontSize: '0.9rem' }}>
                ({course.feedbackCount} 条评价)
              </span>
            </div>
          </div>
          
          <div style={{ textAlign: 'right' }}>
            <div style={{ marginBottom: '8px', color: '#666' }}>
              <Users size={18} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
              已报名 {course.currentEnrollment} / {course.maxCapacity} 人
            </div>
            <div className="progress-container" style={{ width: '200px' }}>
              <div
                className={`progress-bar ${remainingPercent < 20 ? 'warning' : ''}`}
                style={{ width: `${(course.currentEnrollment / course.maxCapacity) * 100}%` }}
              />
            </div>
            {remainingPercent < 20 && (
              <div style={{ color: '#FF8C00', fontSize: '0.8rem', marginTop: '4px' }}>
                名额紧张！仅剩 {remainingSpots} 个名额
              </div>
            )}
          </div>
        </div>
        
        <div className="detail-meta">
          <div className="detail-meta-item">
            <Calendar size={18} />
            <span>{course.dateTime}</span>
          </div>
          <div className="detail-meta-item">
            <Users size={18} />
            <span>剩余 {remainingSpots} 个名额</span>
          </div>
        </div>
        
        <div className="detail-section">
          <h3 className="detail-section-title">课程介绍</h3>
          <p style={{ color: '#555', lineHeight: '1.8' }}>{course.description}</p>
        </div>
        
        <div className="detail-section">
          <h3 className="detail-section-title">
            <Package size={20} />
            材料清单
          </h3>
          <div className="materials-list">
            {course.materials.map((material, index) => (
              <span key={index} className="material-tag">
                {material}
              </span>
            ))}
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
          {isEnrolled ? (
            <>
              <button
                className="btn btn-danger"
                onClick={() => setShowCancelModal(true)}
                disabled={isCanceling}
              >
                {isCanceling && <div className="btn-loading" />}
                {isCanceling ? '取消中...' : '取消报名'}
              </button>
              {feedbackSubmitted && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6B8E23' }}>
                  <CheckCircle size={18} />
                  <span>已提交反馈</span>
                </div>
              )}
            </>
          ) : (
            <button
              className="btn btn-primary"
              onClick={handleSignUp}
              disabled={isFull || isSigningUp}
            >
              {isSigningUp && <div className="btn-loading" />}
              {isFull ? '名额已满' : isSigningUp ? '报名中...' : '立即报名'}
            </button>
          )}
        </div>
        
        {canSubmitFeedback && (
          <div className="detail-section">
            <h3 className="detail-section-title">课程反馈</h3>
            <div className="feedback-form">
              <div className="form-group">
                <label className="form-label">评分</label>
                <StarRating rating={rating} onRatingChange={setRating} size="large" />
              </div>
              
              <div className="form-group">
                <label className="form-label">评价内容</label>
                <textarea
                  className={`form-textarea ${commentError ? 'error' : ''}`}
                  placeholder="分享您的学习体验..."
                  value={comment}
                  onChange={handleCommentChange}
                  maxLength={160}
                />
                <div className={`char-counter ${commentError ? 'error' : ''}`}>
                  {comment.length} / 150
                </div>
              </div>
              
              <button
                className="btn btn-primary"
                onClick={handleSubmitFeedback}
                disabled={rating === 0 || isSubmittingFeedback || comment.length > 150}
              >
                {isSubmittingFeedback && <div className="btn-loading" />}
                {isSubmittingFeedback ? '提交中...' : '提交反馈'}
              </button>
            </div>
          </div>
        )}
        
        <div className="detail-section">
          <h3 className="detail-section-title">
            <Star size={20} fill="#FFD700" stroke="#FFD700" />
            学员评价 ({feedbackList.length})
          </h3>
          
          {feedbackList.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 20px' }}>
              <div className="empty-state-icon">💬</div>
              <p>暂无评价</p>
            </div>
          ) : (
            <div className="feedback-list">
              {feedbackList.map((feedback) => (
                <FeedbackCard
                  key={feedback.id}
                  feedback={feedback}
                  isNew={feedback.id === newFeedbackId}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      
      <Modal
        isOpen={showCancelModal}
        title="确认取消报名"
        message={`确定要取消"${course.title}"的报名吗？取消后将无法保留名额。`}
        confirmText="确认取消"
        cancelText="再想想"
        type="danger"
        onConfirm={handleCancelConfirm}
        onCancel={() => setShowCancelModal(false)}
      />
    </div>
  );
};

export default CourseDetail;
