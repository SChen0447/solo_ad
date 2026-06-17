import { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { Idea } from '../../types';

interface MatrixCardProps {
  idea: Idea;
  index: number;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: (ideaId: string, x: number, y: number) => void;
  containerRef: React.RefObject<HTMLDivElement>;
}

export default function MatrixCard({
  idea,
  index,
  isDragging,
  onDragStart,
  onDragEnd,
  containerRef
}: MatrixCardProps) {
  const [position, setPosition] = useState({ x: idea.matrix_x, y: idea.matrix_y });
  const [isLocalDragging, setIsLocalDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLocalDragging) {
      setPosition({ x: idea.matrix_x, y: idea.matrix_y });
    }
  }, [idea.matrix_x, idea.matrix_y, isLocalDragging]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsLocalDragging(true);
      onDragStart();
      dragStartPos.current = { x: e.clientX, y: e.clientY };
    },
    [onDragStart]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isLocalDragging || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      const clampedX = Math.max(5, Math.min(95, x));
      const clampedY = Math.max(5, Math.min(95, y));

      setPosition({ x: clampedX, y: clampedY });
    },
    [isLocalDragging, containerRef]
  );

  const handleMouseUp = useCallback(
    (e: MouseEvent) => {
      if (!isLocalDragging) return;

      setIsLocalDragging(false);

      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        onDragEnd(idea.id, x, y);
      }
    },
    [isLocalDragging, idea.id, onDragEnd, containerRef]
  );

  useEffect(() => {
    if (isLocalDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isLocalDragging, handleMouseMove, handleMouseUp]);

  const cardVariants = {
    hidden: { opacity: 0, scale: 0 },
    visible: (i: number) => ({
      opacity: 1,
      scale: 1,
      transition: {
        delay: i * 0.05 + 0.3,
        duration: 0.4,
        ease: 'easeOut'
      }
    })
  };

  const getQuadrantBorderColor = () => {
    const { x, y } = position;
    if (x >= 50 && y >= 50) return 'rgba(255, 71, 87, 0.5)';
    if (x < 50 && y >= 50) return 'rgba(0, 212, 255, 0.5)';
    if (x >= 50 && y < 50) return 'rgba(255, 159, 67, 0.5)';
    return 'rgba(108, 117, 125, 0.5)';
  };

  return (
    <motion.div
      ref={cardRef}
      custom={index}
      initial="hidden"
      animate="visible"
      variants={cardVariants}
      className={`matrix-card ${isDragging ? 'dragging' : ''}`}
      onMouseDown={handleMouseDown}
      style={{
        left: `${position.x}%`,
        top: `${100 - position.y}%`,
        borderColor: getQuadrantBorderColor(),
        transition: isDragging || isLocalDragging
          ? 'none'
          : 'left 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94), top 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 0.2s ease, border-color 0.2s ease'
      }}
    >
      <h4 className="matrix-card-title">{idea.title}</h4>
      <div className="matrix-card-stats">
        <span>👍 {idea.likes_count}</span>
        <span>⭐ {idea.average_rating.toFixed(1)}</span>
      </div>
    </motion.div>
  );
}
