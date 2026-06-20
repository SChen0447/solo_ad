import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { Diary } from '../types';

interface DiaryCardProps {
  diary: Diary;
  currentUserId: number;
  userPoints: number;
  setUserPoints: (points: number) => void;
}

const DiaryCard = ({ diary, currentUserId, userPoints, setUserPoints }: DiaryCardProps) => {
  const [likes, setLikes] = useState(diary.likes);
  const [isLiking, setIsLiking] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [showPointsAnim, setShowPointsAnim] = useState(false);

  const handleLike = async () => {
    if (isLiking) return;
    if (diary.user_id !== currentUserId && userPoints < 1) {
      alert('积分不足，点赞需要1积分');
      return;
    }

    setIsLiking(true);
    setIsLiked(true);
    setShowPointsAnim(true);

    try {
      const response = await axios.post('/api/points/like', {
        diary_id: diary.id,
        user_id: currentUserId,
      });

      setLikes(response.data.likes);
      setUserPoints(response.data.user_points);

      setTimeout(() => {
        setShowPointsAnim(false);
        setIsLiked(false);
      }, 600);
    } catch (error: any) {
      alert(error.response?.data?.error || '点赞失败');
      setIsLiked(false);
      setShowPointsAnim(false);
    } finally {
      setIsLiking(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      style={{
        width: '280px',
        backgroundColor: '#faf8f5',
        borderRadius: '12px',
        border: '1px solid #d9cdc1',
        padding: '16px',
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
        <img
          src={diary.avatar}
          alt={diary.username}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            objectFit: 'cover',
          }}
        />
        <div>
          <p style={{ fontWeight: 600, fontSize: '14px', color: '#333' }}>{diary.username}</p>
          <p style={{ fontSize: '11px', color: '#999' }}>{formatDate(diary.created_at)}</p>
        </div>
      </div>

      <p style={{ fontSize: '14px', color: '#333', lineHeight: 1.6, marginBottom: '12px' }}>
        {diary.content}
      </p>

      {diary.image_url && (
        <div style={{ marginBottom: '12px', borderRadius: '8px', overflow: 'hidden' }}>
          <img
            src={diary.image_url}
            alt="日记配图"
            style={{
              width: '100%',
              height: 'auto',
              display: 'block',
              borderRadius: '8px',
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          position: 'relative',
        }}
      >
        <button
          onClick={handleLike}
          disabled={isLiking}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'transparent',
            padding: '4px 8px',
            borderRadius: '8px',
            position: 'relative',
          }}
        >
          <motion.span
            animate={isLiked ? { scale: [1, 1.5, 1], color: '#e63946' } : {}}
            transition={{ duration: 0.2 }}
            style={{
              fontSize: '18px',
              color: isLiked ? '#e63946' : '#999',
              display: 'inline-block',
            }}
          >
            ❤️
          </motion.span>
          <AnimatePresence mode="wait">
            <motion.span
              key={likes}
              initial={{ y: 0 }}
              animate={{ y: [0, -8, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              style={{
                fontSize: '13px',
                color: isLiked ? '#e63946' : '#666',
                fontWeight: 500,
              }}
            >
              {likes}
            </motion.span>
          </AnimatePresence>

          <AnimatePresence>
            {showPointsAnim && diary.user_id !== currentUserId && (
              <motion.span
                initial={{ opacity: 1, y: 0 }}
                animate={{ opacity: 0, y: -20 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                style={{
                  position: 'absolute',
                  right: '-30px',
                  top: '-10px',
                  fontSize: '12px',
                  color: '#4a7c59',
                  fontWeight: 600,
                }}
              >
                -1 ⭐
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.div>
  );
};

export default DiaryCard;
