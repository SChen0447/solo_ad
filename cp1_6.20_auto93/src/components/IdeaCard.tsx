import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Idea } from '@/types';
import { useApp } from '@/context/AppContext';
import { useParams } from 'react-router-dom';

interface Props {
  idea: Idea;
}

const AVATAR_COLORS = [
  '#667eea', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#3b82f6',
];

const getAvatarColor = (id: string): string => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const getInitials = (name: string): string => {
  if (!name) return '?';
  return name.charAt(0).toUpperCase();
};

const IdeaCard: React.FC<Props> = ({ idea }) => {
  const { topicId } = useParams<{ topicId: string }>();
  const { voteIdea, userVotes, currentTopic } = useApp();
  const [expanded, setExpanded] = useState(false);
  const [voteAnim, setVoteAnim] = useState(false);
  const [localVotes, setLocalVotes] = useState(idea.votes);
  const [voting, setVoting] = useState(false);
  const prevVotesRef = useRef(idea.votes);

  const isVoted = userVotes.voted_ids.includes(idea.id);
  const canVote = !currentTopic?.is_voting_ended && !isVoted && userVotes.remaining_votes > 0;

  useEffect(() => {
    if (idea.votes !== prevVotesRef.current) {
      if (idea.votes > prevVotesRef.current) {
        setVoteAnim(true);
        setTimeout(() => setVoteAnim(false), 200);
      }
      prevVotesRef.current = idea.votes;
    }
    setLocalVotes(idea.votes);
  }, [idea.votes]);

  const handleVote = async () => {
    if (!topicId || !canVote || voting) return;
    setVoting(true);
    const ok = await voteIdea(topicId, idea.id);
    if (ok) {
      setVoteAnim(true);
      setTimeout(() => setVoteAnim(false), 200);
    }
    setVoting(false);
  };

  const cardBg = '#ffffff';
  const isRemote = (idea as Idea & { _remote?: boolean })._remote;

  return (
    <motion.div
      layout
      initial={
        isRemote
          ? { opacity: 0, x: '100%', y: 20 }
          : { opacity: 0, y: 20 }
      }
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={
        isRemote
          ? { duration: 0.5, ease: 'easeOut' }
          : { duration: 0.3 }
      }
      whileHover={{ y: -2, boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}
      style={{
        display: 'inline-block',
        width: '100%',
        background: cardBg,
        borderRadius: 12,
        padding: 18,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        willChange: 'transform',
        cursor: 'pointer',
      }}
      onClick={() => setExpanded((v) => !v)}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            background: getAvatarColor(idea.author_id),
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {getInitials(idea.author_name)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: '#1a1a2e',
              lineHeight: 1.35,
              marginBottom: 2,
              wordBreak: 'break-word',
            }}
          >
            {idea.title}
          </h3>
          <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>
            {idea.author_name}
          </div>
        </div>
      </div>

      <AnimatePresence initial={false}>
        <motion.div
          key={expanded ? 'expanded' : 'collapsed'}
          initial={{ height: expanded ? 0 : 'auto', opacity: expanded ? 0 : 1 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          style={{ overflow: 'hidden' }}
        >
          <p
            style={{
              fontSize: 14,
              color: '#475569',
              lineHeight: 1.65,
              marginTop: 8,
              marginBottom: 14,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              display: expanded ? 'block' : '-webkit-box',
              WebkitLineClamp: expanded ? 'unset' : 3,
              WebkitBoxOrient: 'vertical',
              overflow: expanded ? 'visible' : 'hidden',
            }}
          >
            {idea.description || '暂无描述'}
          </p>
        </motion.div>
      </AnimatePresence>

      {!expanded && idea.description && idea.description.length > 60 && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(true);
          }}
          style={{
            fontSize: 12,
            color: '#667eea',
            fontWeight: 600,
            marginBottom: 10,
            cursor: 'pointer',
          }}
        >
          展开详情 →
        </div>
      )}
      {expanded && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(false);
          }}
          style={{
            fontSize: 12,
            color: '#667eea',
            fontWeight: 600,
            marginTop: -4,
            marginBottom: 10,
            cursor: 'pointer',
          }}
        >
          收起 ↑
        </div>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: 12,
          borderTop: '1px solid #f1f5f9',
        }}
      >
        <div style={{ fontSize: 11, color: '#cbd5e1' }}>
          {idea.created_at && new Date(idea.created_at).toLocaleDateString('zh-CN')}
        </div>

        <motion.button
          onClick={(e) => {
            e.stopPropagation();
            handleVote();
          }}
          whileTap={canVote ? { scale: 0.95 } : {}}
          transition={{ duration: 0.15 }}
          disabled={!canVote}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 14px',
            borderRadius: 20,
            background: isVoted
              ? 'rgba(239,68,68,0.08)'
              : canVote
              ? 'rgba(245,158,11,0.08)'
              : '#f1f5f9',
            border: `1.5px solid ${
              isVoted
                ? '#fecaca'
                : canVote
                ? '#fde68a'
                : '#e2e8f0'
            }`,
            cursor: canVote ? 'pointer' : 'not-allowed',
            userSelect: 'none',
            position: 'relative',
          }}
        >
          <motion.span
            animate={voteAnim ? { scale: [1, 1.3, 1] } : {}}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{
              fontSize: 15,
              display: 'inline-block',
              color: isVoted ? '#ef4444' : canVote ? '#f59e0b' : '#94a3b8',
            }}
          >
            {isVoted ? '❤️' : '🤍'}
          </motion.span>
          <motion.span
            animate={voteAnim ? { scale: [1, 1.3, 1] } : {}}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: isVoted ? '#ef4444' : canVote ? '#f59e0b' : '#94a3b8',
              minWidth: 18,
              textAlign: 'center',
            }}
          >
            {localVotes}
          </motion.span>
          {!canVote && !currentTopic?.is_voting_ended && isVoted && (
            <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 600 }}>已投</span>
          )}
          {currentTopic?.is_voting_ended && (
            <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>结束</span>
          )}
        </motion.button>
      </div>
    </motion.div>
  );
};

export default React.memo(IdeaCard);
