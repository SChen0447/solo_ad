import React from 'react';
import type { Feedback } from '../types';
import StarRating from './StarRating';

interface FeedbackCardProps {
  feedback: Feedback;
  isNew?: boolean;
}

const FeedbackCard: React.FC<FeedbackCardProps> = ({ feedback, isNew = false }) => {
  return (
    <div className="feedback-card" style={isNew ? { animationDelay: '0s' } : undefined}>
      <div className="feedback-header">
        <StarRating rating={feedback.rating} readOnly size="small" />
        <span className="feedback-date">{feedback.createdAt}</span>
      </div>
      <p className="feedback-comment">{feedback.comment}</p>
    </div>
  );
};

export default FeedbackCard;
