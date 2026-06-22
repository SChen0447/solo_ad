import React, { useState } from 'react'
import { Idea } from '../api/ideas'

interface IdeaCardProps {
  idea: Idea
  onVote?: () => void
  canVote?: boolean
  showVoteButton?: boolean
  style?: React.CSSProperties
  className?: string
  draggable?: boolean
  onDragStart?: (e: React.DragEvent) => void
}

const IdeaCard: React.FC<IdeaCardProps> = ({
  idea,
  onVote,
  canVote = true,
  showVoteButton = true,
  style,
  className = '',
  draggable = false,
  onDragStart
}) => {
  const [isAnimating, setIsAnimating] = useState(false)
  const [prevVoteCount, setPrevVoteCount] = useState(idea.voteCount)

  const handleVoteClick = () => {
    if (!canVote || !onVote) return
    if (idea.voteCount === prevVoteCount + 1) {
      setIsAnimating(false)
      return
    }
    setPrevVoteCount(idea.voteCount)
    setIsAnimating(true)
    onVote()
    setTimeout(() => setIsAnimating(false), 300)
  }

  return (
    <div
      className={`idea-card ${className}`}
      style={style}
      draggable={draggable}
      onDragStart={onDragStart}
    >
      <div className="idea-card-content">
        <h3 className="idea-title">{idea.title}</h3>
        <p className="idea-description">{idea.description}</p>
        <div className="idea-author">
          <span className="author-label">作者：</span>
          <span className="author-name">{idea.author}</span>
        </div>
      </div>
      {showVoteButton && (
        <div className="idea-vote-section">
          <button
            className={`vote-button ${!canVote ? 'disabled' : ''} ${isAnimating ? 'bounce' : ''}`}
            onClick={handleVoteClick}
            disabled={!canVote}
          >
            <span className="vote-count">{idea.voteCount}</span>
          </button>
        </div>
      )}

      <style>{`
        .idea-card {
          width: 320px;
          height: 200px;
          border-radius: 16px;
          background: #FFFFFF;
          border: 2px solid #E5E7EB;
          box-shadow: 0px 2px 8px rgba(0, 0, 0, 0.06);
          padding: 20px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          transition: box-shadow 0.25s ease, transform 0.25s ease;
          box-sizing: border-box;
          cursor: ${draggable ? 'grab' : 'default'};
        }
        
        .idea-card:hover {
          box-shadow: 0px 4px 16px rgba(0, 0, 0, 0.1);
        }
        
        .idea-card:active {
          cursor: ${draggable ? 'grabbing' : 'default'};
        }
        
        .idea-card-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 8px;
          overflow: hidden;
        }
        
        .idea-title {
          font-size: 18px;
          font-weight: 700;
          color: #1F2937;
          margin: 0;
          line-height: 1.4;
        }
        
        .idea-description {
          font-size: 14px;
          color: #6B7280;
          margin: 0;
          line-height: 1.5;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .idea-author {
          font-size: 12px;
          color: #9CA3AF;
          margin-top: auto;
        }
        
        .author-label {
          color: #9CA3AF;
        }
        
        .author-name {
          color: #6B7280;
          font-weight: 500;
        }
        
        .idea-vote-section {
          display: flex;
          justify-content: flex-end;
          align-items: flex-end;
        }
        
        .vote-button {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: #6366F1;
          color: white;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s ease, transform 0.2s ease;
          font-size: 18px;
          font-weight: 700;
        }
        
        .vote-button:hover:not(.disabled) {
          background: #818CF8;
          transform: scale(1.1);
        }
        
        .vote-button:active:not(.disabled) {
          transform: scale(0.95);
        }
        
        .vote-button.disabled {
          background: #D1D5DB;
          cursor: not-allowed;
        }
        
        .vote-button.bounce .vote-count {
          animation: bounce 0.3s ease;
        }
        
        .vote-count {
          display: inline-block;
        }
        
        @keyframes bounce {
          0% { transform: scale(1); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  )
}

export default IdeaCard
