import React, { useState } from 'react';
import type { MoodType, Song } from '../App';
import { moodGradients } from '../App';

interface SongCardProps {
  song: Song;
  mood: MoodType;
  index: number;
  isFavorite: boolean;
  onFeedback: (songId: string, liked: boolean) => void;
  onToggleFavorite: (song: Song) => void;
}

function SongCard({ song, mood, index, isFavorite, onFeedback, onToggleFavorite }: SongCardProps) {
  const [feedbackState, setFeedbackState] = useState<'none' | 'liked' | 'disliked'>('none');
  const [heartAnimating, setHeartAnimating] = useState(false);
  const [feedbackAnimating, setFeedbackAnimating] = useState<string | null>(null);

  const gradient = moodGradients[mood];

  const handleFeedback = (liked: boolean) => {
    setFeedbackState(liked ? 'liked' : 'disliked');
    setFeedbackAnimating(liked ? 'like' : 'dislike');
    onFeedback(song.id, liked);
    setTimeout(() => setFeedbackAnimating(null), 200);
  };

  const handleFavorite = () => {
    setHeartAnimating(true);
    onToggleFavorite(song);
    setTimeout(() => setHeartAnimating(false), 200);
  };

  return (
    <>
      <style>{`
        @keyframes cardEnter {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes heartBounce {
          0% { transform: scale(1); }
          50% { transform: scale(1.3); }
          100% { transform: scale(1); }
        }
        @keyframes feedbackBounce {
          0% { transform: scale(1); }
          50% { transform: scale(1.4); }
          100% { transform: scale(1); }
        }
        .song-card-${song.id} {
          animation: cardEnter 0.4s ease-out ${index * 50}ms both;
        }
        .song-card-${song.id}:hover {
          transform: translateY(-8px) !important;
          box-shadow: 0 8px 24px rgba(0,0,0,0.15) !important;
        }
      `}</style>
      <div
        className={`song-card-${song.id}`}
        style={{
          width: 240,
          height: 320,
          borderRadius: 12,
          background: '#ffffff',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          overflow: 'hidden',
          transition: 'all 0.3s',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        <div
          style={{
            width: 240,
            height: 200,
            background: `linear-gradient(135deg, ${gradient})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 48, opacity: 0.6 }}>♪</span>
          <button
            onClick={handleFavorite}
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              background: 'rgba(0,0,0,0.2)',
              border: 'none',
              borderRadius: '50%',
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: 16,
              animation: heartAnimating ? 'heartBounce 0.2s ease-out' : 'none',
              transition: 'all 0.2s',
            }}
          >
            {isFavorite ? '❤️' : '🤍'}
          </button>
        </div>

        <div
          style={{
            padding: '12px 14px',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: '#1a1a2e',
                lineHeight: 1.3,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxHeight: 36,
              }}
            >
              {song.title}
            </div>
            <div
              style={{
                fontSize: 12,
                color: '#999',
                marginTop: 4,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {song.artist}
            </div>
          </div>

          <div>
            <div
              style={{
                fontSize: 10,
                color: '#aaa',
                lineHeight: 1.4,
                marginTop: 4,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {song.reason}
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 8,
                marginTop: 6,
              }}
            >
              <button
                onClick={() => handleFeedback(true)}
                style={{
                  width: 20,
                  height: 20,
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  fontSize: 14,
                  padding: 0,
                  lineHeight: 1,
                  opacity: feedbackState === 'disliked' ? 0.3 : feedbackState === 'liked' ? 1 : 0.6,
                  animation: feedbackAnimating === 'like' ? 'feedbackBounce 0.15s ease-out' : 'none',
                  transition: 'all 0.15s',
                }}
              >
                👍
              </button>
              <button
                onClick={() => handleFeedback(false)}
                style={{
                  width: 20,
                  height: 20,
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  fontSize: 14,
                  padding: 0,
                  lineHeight: 1,
                  opacity: feedbackState === 'liked' ? 0.3 : feedbackState === 'disliked' ? 1 : 0.6,
                  animation: feedbackAnimating === 'dislike' ? 'feedbackBounce 0.15s ease-out' : 'none',
                  transition: 'all 0.15s',
                }}
              >
                👎
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default SongCard;
