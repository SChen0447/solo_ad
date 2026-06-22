import React, { useState } from 'react';
import type { Idea } from '../api/ideas';

interface IdeaCardProps {
  idea: Idea;
  onVote?: (id: string) => void;
  votesRemaining?: number;
  showVoteButton?: boolean;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent, idea: Idea) => void;
  index?: number;
}

export default function IdeaCard({
  idea,
  onVote,
  votesRemaining = 5,
  showVoteButton = true,
  draggable = false,
  onDragStart,
  index = 0,
}: IdeaCardProps) {
  const [bouncing, setBouncing] = useState(false);
  const [scaleUp, setScaleUp] = useState(false);
  const canVote = votesRemaining > 0;

  const handleVote = () => {
    if (!canVote || !onVote) return;
    if (idea.voteCount === 0) {
      setScaleUp(true);
      setTimeout(() => setScaleUp(false), 300);
    }
    setBouncing(true);
    setTimeout(() => setBouncing(false), 300);
    onVote(idea.id);
  };

  return (
    <div
      draggable={draggable}
      onDragStart={draggable && onDragStart ? (e) => onDragStart(e, idea) : undefined}
      style={{
        width: 320,
        height: 200,
        borderRadius: 16,
        background: '#FFFFFF',
        border: '2px solid #E5E7EB',
        boxShadow: '0px 2px 8px rgba(0,0,0,0.06)',
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'box-shadow 0.25s ease, transform 0.2s',
        cursor: draggable ? 'grab' : 'default',
        animation: `fadeInUp 0.4s ease ${index * 80}ms both`,
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0px 4px 16px rgba(0,0,0,0.1)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0px 2px 8px rgba(0,0,0,0.06)';
      }}
    >
      <div>
        <div style={{
          fontSize: 18,
          fontWeight: 700,
          color: '#1F2937',
          marginBottom: 8,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {idea.title}
        </div>
        <div style={{
          fontSize: 14,
          color: '#6B7280',
          lineHeight: 1.5,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {idea.description}
        </div>
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
      }}>
        <span style={{ fontSize: 12, color: '#9CA3AF' }}>
          {idea.author}
        </span>

        {showVoteButton && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontSize: 16,
              fontWeight: 700,
              color: canVote ? '#6366F1' : '#9CA3AF',
              transform: scaleUp ? 'scale(1.2)' : 'scale(1)',
              transition: 'transform 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
            }}>
              {idea.voteCount}
            </span>
            <button
              onClick={handleVote}
              disabled={!canVote}
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                border: 'none',
                background: canVote ? '#6366F1' : '#D1D5DB',
                color: '#fff',
                fontSize: 20,
                cursor: canVote ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s, transform 0.2s',
                transform: bouncing
                  ? 'scale(0.95)'
                  : scaleUp
                    ? 'scale(1.2)'
                    : 'scale(1)',
                animation: bouncing ? 'bounce 0.3s ease' : 'none',
              }}
              onMouseEnter={(e) => {
                if (canVote) {
                  (e.currentTarget as HTMLButtonElement).style.background = '#818CF8';
                  (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (canVote) {
                  (e.currentTarget as HTMLButtonElement).style.background = '#6366F1';
                  (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                }
              }}
            >
              👍
            </button>
          </div>
        )}

        {!showVoteButton && (
          <span style={{
            fontSize: 14,
            fontWeight: 600,
            color: idea.priority === 'high' ? '#EF4444' : idea.priority === 'medium' ? '#F59E0B' : '#10B981',
          }}>
            {idea.voteCount} 票
          </span>
        )}
      </div>
    </div>
  );
}
