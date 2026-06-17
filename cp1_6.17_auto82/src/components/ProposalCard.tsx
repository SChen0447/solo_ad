import { useState } from 'react';
import { motion } from 'framer-motion';
import type { Proposal } from '../dataFetcher';

interface ProposalCardProps {
  proposal: Proposal;
  index: number;
  onClick: () => void;
  onVoteChange?: (proposalId: string, type: 'like' | 'dislike', delta: number) => void;
}

export default function ProposalCard({
  proposal,
  index,
  onClick,
  onVoteChange,
}: ProposalCardProps) {
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [likeCount, setLikeCount] = useState(proposal.likes);
  const [dislikeCount, setDislikeCount] = useState(proposal.dislikes);

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (liked || disliked) return;
    setLiked(true);
    setLikeCount((prev) => prev + 1);
    onVoteChange?.(proposal.id, 'like', 1);
  };

  const handleDislike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (liked || disliked) return;
    setDisliked(true);
    setDislikeCount((prev) => prev + 1);
    onVoteChange?.(proposal.id, 'dislike', 1);
  };

  return (
    <motion.div
      className="proposal-card"
      onClick={onClick}
      initial={{ x: -50, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: index * 0.15, ease: 'easeOut' }}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
    >
      <div className="card-category-badge">{proposal.category}</div>
      <div className="card-title" title={proposal.title}>
        {proposal.title}
      </div>
      <p className="card-summary">{proposal.summary}</p>

      <div className="card-footer">
        <div className="card-creator">
          <div
            className="avatar"
            style={{ backgroundColor: proposal.creator.avatar }}
          >
            {proposal.creator.name.charAt(0)}
          </div>
          <span className="creator-name">{proposal.creator.name}</span>
        </div>

        <div className="card-votes">
          <motion.button
            className={`vote-btn like-btn ${liked ? 'active' : ''}`}
            onClick={handleLike}
            disabled={liked || disliked}
            whileTap={!liked && !disliked ? { scale: [1, 1.3, 1] } : {}}
            transition={{ duration: 0.3 }}
          >
            <i className={`fas fa-heart`}></i>
            <span>{likeCount}</span>
          </motion.button>

          <motion.button
            className={`vote-btn dislike-btn ${disliked ? 'active' : ''}`}
            onClick={handleDislike}
            disabled={liked || disliked}
            whileTap={!liked && !disliked ? { scale: [1, 1.3, 1] } : {}}
            transition={{ duration: 0.3 }}
          >
            <i className="fas fa-thumbs-down"></i>
            <span>{dislikeCount}</span>
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
