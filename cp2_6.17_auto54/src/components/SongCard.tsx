import { useState } from 'react';
import type { Song } from '../types';

interface Props {
  song: Song;
  isFavorite: boolean;
  feedback: 'like' | 'dislike' | null;
  onToggleFavorite: (song: Song) => void;
  onFeedback: (songId: string, type: 'like' | 'dislike') => void;
}

export default function SongCard({
  song,
  isFavorite,
  feedback,
  onToggleFavorite,
  onFeedback,
}: Props) {
  const [heartAnimating, setHeartAnimating] = useState(false);
  const [likeAnimating, setLikeAnimating] = useState(false);
  const [dislikeAnimating, setDislikeAnimating] = useState(false);
  const [hovered, setHovered] = useState(false);

  const handleFavorite = () => {
    setHeartAnimating(true);
    onToggleFavorite(song);
    setTimeout(() => setHeartAnimating(false), 200);
  };

  const handleLike = () => {
    setLikeAnimating(true);
    onFeedback(song.id, 'like');
    setTimeout(() => setLikeAnimating(false), 150);
  };

  const handleDislike = () => {
    setDislikeAnimating(true);
    onFeedback(song.id, 'dislike');
    setTimeout(() => setDislikeAnimating(false), 150);
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '240px',
        height: '320px',
        borderRadius: '12px',
        background: '#ffffff',
        boxShadow: hovered
          ? '0 8px 24px rgba(0,0,0,0.15)'
          : '0 4px 12px rgba(0,0,0,0.1)',
        transform: hovered ? 'translateY(-8px)' : 'translateY(0)',
        transition: 'all 0.3s ease-out',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
      }}
    >
      <div
        style={{
          width: '240px',
          height: '200px',
          background: `linear-gradient(135deg, ${song.gradient[0]}, ${song.gradient[1]})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: '64px', opacity: 0.6 }}>🎵</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleFavorite();
          }}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'rgba(255,255,255,0.9)',
            border: 'none',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            transition: 'all 0.2s ease-out',
            transform: heartAnimating ? 'scale(1.3)' : 'scale(1)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          {isFavorite ? '❤️' : '🤍'}
        </button>
      </div>

      <div
        style={{
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          gap: '4px',
        }}
      >
        <div
          style={{
            fontSize: '14px',
            fontWeight: 700,
            color: '#1a1a2e',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            lineHeight: '1.4',
            minHeight: '39px',
          }}
        >
          {song.title}
        </div>
        <div style={{ fontSize: '12px', color: '#888', marginBottom: '6px' }}>
          {song.artist}
        </div>
        <div
          style={{
            fontSize: '10px',
            color: '#666',
            lineHeight: '1.4',
            flex: 1,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {song.reason}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: '8px',
            marginTop: '8px',
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleLike();
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '2px',
              fontSize: '20px',
              width: '20px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease-out',
              transform: likeAnimating ? 'scale(1.3)' : feedback === 'like' ? 'scale(1.1)' : 'scale(1)',
              filter: feedback === 'like' ? 'none' : 'grayscale(60%)',
              opacity: feedback === 'like' ? 1 : 0.6,
            }}
          >
            👍
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDislike();
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '2px',
              fontSize: '20px',
              width: '20px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease-out',
              transform: dislikeAnimating
                ? 'scale(1.3)'
                : feedback === 'dislike'
                ? 'scale(1.1)'
                : 'scale(1)',
              filter: feedback === 'dislike' ? 'none' : 'grayscale(60%)',
              opacity: feedback === 'dislike' ? 1 : 0.6,
            }}
          >
            👎
          </button>
        </div>
      </div>
    </div>
  );
}
