import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { ideaApi } from '../../services/api';
import IdeaCard from './IdeaCard';
import type { Idea } from '../../types';

interface IdeaBoardProps {
  ideas: Idea[];
  onIdeaCreated: (idea: Idea) => void;
  onIdeaUpdated: (idea: Idea) => void;
  getUserId: () => string;
  getUserName: () => string;
}

export default function IdeaBoard({
  ideas,
  onIdeaCreated,
  onIdeaUpdated,
  getUserId,
  getUserName
}: IdeaBoardProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const createRipple = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const button = e.currentTarget;
    const ripple = document.createElement('span');
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    ripple.className = 'ripple';

    button.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!title.trim() || isSubmitting) return;

      setIsSubmitting(true);
      try {
        const idea = await ideaApi.createIdea({
          title: title.trim(),
          description: description.trim(),
          author_name: getUserName()
        });
        onIdeaCreated(idea);
        setTitle('');
        setDescription('');

        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#00d4ff', '#0099cc', '#ffffff']
        });
      } catch (error) {
        console.error('发布想法失败:', error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [title, description, isSubmitting, getUserName, onIdeaCreated]
  );

  const handleLike = useCallback(
    async (ideaId: string) => {
      try {
        const userId = getUserId();
        const updatedIdea = await ideaApi.likeIdea(ideaId, { user_id: userId });
        onIdeaUpdated(updatedIdea);
      } catch (error) {
        console.error('点赞失败:', error);
      }
    },
    [getUserId, onIdeaUpdated]
  );

  const handleVote = useCallback(
    async (ideaId: string, rating: number) => {
      try {
        const userId = getUserId();
        const updatedIdea = await ideaApi.voteIdea(ideaId, {
          user_id: userId,
          rating
        });
        onIdeaUpdated(updatedIdea);
      } catch (error) {
        console.error('投票失败:', error);
      }
    },
    [getUserId, onIdeaUpdated]
  );

  const handleComment = useCallback(
    async (ideaId: string, content: string) => {
      try {
        const userId = getUserId();
        const userName = getUserName();
        const updatedIdea = await ideaApi.commentIdea(ideaId, {
          user_id: userId,
          user_name: userName,
          content
        });
        onIdeaUpdated(updatedIdea);
      } catch (error) {
        console.error('评论失败:', error);
      }
    },
    [getUserId, getUserName, onIdeaUpdated]
  );

  const handleToggleExpand = useCallback((ideaId: string) => {
    setExpandedId((prev) => (prev === ideaId ? null : ideaId));
  }, []);

  return (
    <div className="idea-board">
      <motion.form
        ref={formRef}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="create-idea-form"
        onSubmit={handleSubmit}
      >
        <input
          type="text"
          className="form-input"
          placeholder="输入你的想法标题..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={50}
        />
        <textarea
          className="form-input form-textarea"
          placeholder="详细描述你的想法（最多200字）..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={200}
        />
        <div className="char-count">{description.length}/200</div>
        <div className="form-actions">
          <motion.button
            type="submit"
            className="btn-primary"
            disabled={!title.trim() || isSubmitting}
            whileHover={{ scale: !title.trim() || isSubmitting ? 1 : 1.02 }}
            whileTap={{ scale: !title.trim() || isSubmitting ? 1 : 0.98 }}
            onClick={createRipple}
          >
            {isSubmitting ? '发布中...' : '发布想法'}
          </motion.button>
        </div>
      </motion.form>

      <div className="ideas-grid">
        <AnimatePresence>
          {ideas.map((idea, index) => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              index={index}
              isExpanded={expandedId === idea.id}
              onToggleExpand={() => handleToggleExpand(idea.id)}
              onLike={() => handleLike(idea.id)}
              onVote={(rating) => handleVote(idea.id, rating)}
              onComment={(content) => handleComment(idea.id, content)}
              userId={getUserId()}
            />
          ))}
        </AnimatePresence>
      </div>

      {ideas.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="empty-state"
        >
          <span className="empty-state-icon">💡</span>
          <p>还没有想法，快来发布第一个吧！</p>
        </motion.div>
      )}
    </div>
  );
}
