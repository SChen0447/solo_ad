import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { favoriteAPI } from '../api';

interface StarButtonProps {
  petId: number;
  initialFavorited: boolean;
  onToggle?: (favorited: boolean) => void;
}

const StarButton: React.FC<StarButtonProps> = ({ petId, initialFavorited, onToggle }) => {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [loading, setLoading] = useState(false);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/login';
      return;
    }
    if (loading) return;
    setLoading(true);
    try {
      const res = await favoriteAPI.toggleFavorite(petId);
      setFavorited(res.data.favorited);
      onToggle?.(res.data.favorited);
    } catch (err) {
      console.error('Failed to toggle favorite', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.button
      onClick={handleToggle}
      whileTap={{ scale: 0.85 }}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        outline: 'none',
      }}
      aria-label={favorited ? '取消收藏' : '收藏'}
    >
      <AnimatePresence mode="wait">
        <motion.svg
          key={favorited ? 'filled' : 'outline'}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ duration: 0.2 }}
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill={favorited ? '#ff4757' : 'none'}
          stroke={favorited ? '#ff4757' : '#999'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </motion.svg>
      </AnimatePresence>
    </motion.button>
  );
};

export default StarButton;
