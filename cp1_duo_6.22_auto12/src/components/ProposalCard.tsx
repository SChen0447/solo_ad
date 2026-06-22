import React, { memo } from 'react';
import type { Proposal } from '../data/types';
import { statusLabels, formatCurrency, formatDate, avgRating } from '../data/mockData';

interface ProposalCardProps {
  proposal: Proposal;
  index: number;
  onClick: () => void;
}

const StarIcon: React.FC<{ filled: boolean }> = ({ filled }) => (
  <svg
    className={`star-icon ${filled ? '' : 'empty'}`}
    viewBox="0 0 24 24"
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth="2"
  >
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const ProposalCard: React.FC<ProposalCardProps> = ({ proposal, index, onClick }) => {
  const rating = avgRating(proposal.comments);
  const fullStars = Math.round(rating);

  return (
    <div
      className="proposal-card"
      onClick={onClick}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="card-header">
        <h3 className="card-title">{proposal.title}</h3>
        <span className={`status-badge status-${proposal.status}`}>
          {statusLabels[proposal.status]}
        </span>
      </div>
      <p className="card-desc">{proposal.description}</p>
      <div className="card-meta">
        <span className="card-amount">{formatCurrency(proposal.totalAmount)}</span>
        <div className="card-footer-info">
          <div className="stars">
            {[1, 2, 3, 4, 5].map((s) => (
              <StarIcon key={s} filled={s <= fullStars} />
            ))}
          </div>
          <span className="card-date">更新于 {formatDate(proposal.lastUpdated)}</span>
        </div>
      </div>
    </div>
  );
};

export default memo(ProposalCard);
