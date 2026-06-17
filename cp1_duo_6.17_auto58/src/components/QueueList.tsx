import React, { useState, useRef, useEffect } from 'react';
import { User } from 'lucide-react';
import type { Song } from '@/utils/socket';
import { socketManager } from '@/utils/socket';

interface QueueListProps {
  songs: Song[];
}

interface Ripple {
  id: number;
  x: number;
  y: number;
}

interface VoteAnimationState {
  [songId: string]: boolean;
}

const QueueList: React.FC<QueueListProps> = ({ songs }) => {
  const [voteAnimations, setVoteAnimations] = useState<VoteAnimationState>({});
  const [ripples, setRipples] = useState<Map<string, Ripple[]>>(new Map());
  const rippleIdRef = useRef(0);

  const prevVotesRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const newAnimations: VoteAnimationState = {};
    songs.forEach((song) => {
      const prevVotes = prevVotesRef.current.get(song.id);
      if (prevVotes !== undefined && prevVotes !== song.votes) {
        newAnimations[song.id] = true;
      }
      prevVotesRef.current.set(song.id, song.votes);
    });

    if (Object.keys(newAnimations).length > 0) {
      setVoteAnimations((prev) => ({ ...prev, ...newAnimations }));

      const timer = setTimeout(() => {
        setVoteAnimations((prev) => {
          const updated = { ...prev };
          Object.keys(newAnimations).forEach((id) => {
            delete updated[id];
          });
          return updated;
        });
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [songs]);

  const handleVote = (songId: string, e: React.MouseEvent<HTMLButtonElement>) => {
    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const rippleId = rippleIdRef.current++;
    setRipples((prev) => {
      const updated = new Map(prev);
      const songRipples = updated.get(songId) || [];
      songRipples.push({ id: rippleId, x, y });
      updated.set(songId, songRipples);
      return updated;
    });

    setTimeout(() => {
      setRipples((prev) => {
        const updated = new Map(prev);
        const songRipples = (updated.get(songId) || []).filter((r) => r.id !== rippleId);
        updated.set(songId, songRipples);
        return updated;
      });
    }, 600);

    socketManager.vote(songId);
  };

  const sortedSongs = [...songs].sort((a, b) => b.votes - a.votes);

  return (
    <div className="h-full flex flex-col rounded-2xl p-6 overflow-hidden" style={{ backgroundColor: '#1e1e1e' }}>
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <span className="w-1 h-5 rounded-full" style={{ backgroundColor: '#1db954' }} />
        待播队列
      </h2>

      <div className="flex-1 overflow-y-auto space-y-3 pr-2" style={{ scrollbarWidth: 'thin' }}>
        {sortedSongs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12">
            <p style={{ color: '#b3b3b3' }}>队列中暂无歌曲</p>
            <p className="text-sm mt-2" style={{ color: '#6b6b6b' }}>
              在下方输入框添加歌曲开始
            </p>
          </div>
        ) : (
          sortedSongs.map((song, index) => (
            <div
              key={song.id}
              className="group relative flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
              style={{
                backgroundColor: '#121212',
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
              }}
            >
              <span
                className="text-sm font-medium w-5 text-center"
                style={{ color: index < 3 ? '#1db954' : '#6b6b6b' }}
              >
                {index + 1}
              </span>

              <img
                src={song.coverUrl}
                alt={song.title}
                className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                style={{ borderRadius: '8px' }}
              />

              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{song.title}</p>
                <p className="text-sm truncate" style={{ color: '#b3b3b3' }}>
                  {song.artist}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: '#2a2a2a' }}
                >
                  <User size={14} style={{ color: '#b3b3b3' }} />
                </div>

                <div
                  className={`relative px-2.5 py-1 rounded-full text-sm font-semibold flex items-center justify-center min-w-[36px] ${
                    voteAnimations[song.id] ? 'animate-bounce-scale' : ''
                  }`}
                  style={{
                    backgroundColor: song.votes > 0 ? '#1db954' : '#2a2a2a',
                    color: song.votes > 0 ? '#ffffff' : '#b3b3b3',
                  }}
                >
                  {song.votes}
                </div>

                <button
                  onClick={(e) => handleVote(song.id, e)}
                  className="relative overflow-hidden w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
                  style={{
                    backgroundColor: '#1db954',
                    color: '#ffffff',
                  }}
                >
                  <span className="text-lg font-bold leading-none">+</span>
                  {(ripples.get(song.id) || []).map((ripple) => (
                    <span
                      key={ripple.id}
                      className="absolute rounded-full pointer-events-none"
                      style={{
                        left: ripple.x,
                        top: ripple.y,
                        width: '10px',
                        height: '10px',
                        marginLeft: '-5px',
                        marginTop: '-5px',
                        backgroundColor: 'rgba(255,255,255,0.5)',
                        animation: 'ripple 0.6s ease-out forwards',
                      }}
                    />
                  ))}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default QueueList;
