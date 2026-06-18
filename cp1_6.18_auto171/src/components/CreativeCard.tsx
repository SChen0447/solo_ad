import React, { useState, memo } from 'react';
import type { Creative } from '../types';
import { categoryLabels, categoryColor } from '../dataStore';
import { voteEngine } from '../VoteEngine';

interface CreativeCardProps {
  creative: Creative;
  onVote: () => void;
  hasVoted: boolean;
  onClick?: () => void;
  isNew?: boolean;
  index?: number;
}

const CreativeCard: React.FC<CreativeCardProps> = memo(function CreativeCard({
  creative,
  onVote,
  hasVoted,
  onClick,
  isNew = false,
  index = 0,
}) {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleVoteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAnimating(true);
    onVote();
    setTimeout(() => setIsAnimating(false), 200);
  };

  const handleCardClick = () => {
    onClick?.();
  };

  const descriptionPreview =
    creative.description.length > 100
      ? creative.description.slice(0, 100) + '...'
      : creative.description;

  return (
    <div
      className={`creative-card ${isNew ? 'slide-in' : ''}`}
      style={{ animationDelay: `${index * 0.05}s` }}
      onClick={handleCardClick}
    >
      <div className="card-header">
        <span
          className="category-tag"
          style={{ backgroundColor: categoryColor[creative.category] + '20', color: categoryColor[creative.category] }}
        >
          {categoryLabels[creative.category]}
        </span>
        <span className="author">{creative.authorName}</span>
      </div>
      <h3 className="card-title">{creative.title}</h3>
      <p className="card-description">{descriptionPreview}</p>
      <div className="card-footer">
        <button
          className={`vote-button ${hasVoted ? 'voted' : ''} ${isAnimating ? 'animating' : ''}`}
          onClick={handleVoteClick}
          aria-label={hasVoted ? '取消投票' : '投票'}
        >
          <svg
            className="heart-icon"
            viewBox="0 0 24 24"
            fill={hasVoted ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          <span className="vote-count">{voteEngine.formatVoteCount(creative.votes)}</span>
        </button>
        <div className="comment-count">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span>{creative.comments.length}</span>
        </div>
      </div>
    </div>
  );
});

export default CreativeCard;
