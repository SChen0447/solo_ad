import { useState, useEffect, useCallback } from 'react';
import MoodSelector from './components/MoodSelector';
import SongCard from './components/SongCard';
import PlaylistSidebar from './components/PlaylistSidebar';
import type { MoodType, Song, Favorite } from './types';

function App() {
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  const [recommendations, setRecommendations] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [feedbackMap, setFeedbackMap] = useState<Record<string, 'like' | 'dislike'>>({});

  const fetchFavorites = useCallback(async () => {
    try {
      const res = await fetch('/api/favorites');
      if (res.ok) {
        const data = await res.json();
        setFavorites(data);
      }
    } catch (e) {
      console.error('Failed to fetch favorites:', e);
    }
  }, []);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const fetchRecommendations = useCallback(async (mood: MoodType) => {
    setLoading(true);
    setRecommendations([]);
    try {
      const res = await fetch(`/api/songs?mood=${mood}`);
      if (res.ok) {
        const data = await res.json();
        setRecommendations(data);
      }
    } catch (e) {
      console.error('Failed to fetch recommendations:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleMoodSelect = useCallback(
    (mood: MoodType) => {
      setSelectedMood(mood);
      fetchRecommendations(mood);
    },
    [fetchRecommendations]
  );

  const handleFeedback = useCallback(
    async (songId: string, type: 'like' | 'dislike') => {
      if (!selectedMood) return;
      setFeedbackMap((prev) => ({ ...prev, [songId]: type }));
      try {
        await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ songId, type, mood: selectedMood }),
        });
      } catch (e) {
        console.error('Failed to send feedback:', e);
      }
    },
    [selectedMood]
  );

  const handleToggleFavorite = useCallback(
    async (song: Song) => {
      const isFav = favorites.some((f) => f.song.id === song.id);
      try {
        await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ song, action: isFav ? 'remove' : 'add' }),
        });
        fetchFavorites();
      } catch (e) {
        console.error('Failed to toggle favorite:', e);
      }
    },
    [favorites, fetchFavorites]
  );

  const handleRemoveFavorite = useCallback(
    async (song: Song) => {
      try {
        await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ song, action: 'remove' }),
        });
        fetchFavorites();
      } catch (e) {
        console.error('Failed to remove favorite:', e);
      }
    },
    [fetchFavorites]
  );

  const handleReorderFavorites = useCallback(async (orderIds: string[]) => {
    try {
      await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ song: { id: 'reorder' }, action: 'reorder', order: orderIds }),
      });
      fetchFavorites();
    } catch (e) {
      console.error('Failed to reorder favorites:', e);
    }
  }, [fetchFavorites]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <div
        style={{
          flex: 1,
          padding: '32px 40px',
          minWidth: '780px',
          paddingRight: '360px',
        }}
      >
        <h1
          style={{
            fontSize: '32px',
            fontWeight: 700,
            marginBottom: '24px',
            background: 'linear-gradient(135deg, #6C5CE7, #A29BFE)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          🎵 心情音乐推荐
        </h1>

        <MoodSelector selectedMood={selectedMood} onSelect={handleMoodSelect} />

        <div style={{ marginTop: '40px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
              paddingBottom: '16px',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <h2
              style={{
                fontSize: '24px',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #6C5CE7, #A29BFE)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {selectedMood ? '为你推荐' : '选择心情开始推荐'}
            </h2>
            {loading && (
              <span style={{ fontSize: '14px', color: '#A29BFE' }}>加载中...</span>
            )}
          </div>

          {recommendations.length > 0 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 240px)',
                gap: '24px',
                justifyContent: 'flex-start',
              }}
            >
              {recommendations.map((song, index) => {
                const isFav = favorites.some((f) => f.song.id === song.id);
                return (
                  <div
                    key={song.id}
                    style={{
                      opacity: 0,
                      transform: 'translateY(-20px)',
                      animation: `staggerIn 0.4s ease-out ${index * 50}ms forwards`,
                    }}
                  >
                    <SongCard
                      song={song}
                      isFavorite={isFav}
                      feedback={feedbackMap[song.id] || null}
                      onToggleFavorite={handleToggleFavorite}
                      onFeedback={handleFeedback}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {!selectedMood && !loading && (
            <div
              style={{
                textAlign: 'center',
                padding: '80px 20px',
                color: 'rgba(255,255,255,0.4)',
                fontSize: '16px',
              }}
            >
              👆 请在上方选择你现在的心情
            </div>
          )}
        </div>
      </div>

      <PlaylistSidebar
        favorites={favorites}
        onRemove={handleRemoveFavorite}
        onReorder={handleReorderFavorites}
        themeColor={selectedMood ? getMoodGradient(selectedMood)[0] : '#6C5CE7'}
      />

      <style>{`
        @keyframes staggerIn {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @media (max-width: 960px) {
          div[style*="minWidth"] {
            min-width: auto !important;
            paddingRight: 20px !important;
            paddingBottom: 120px !important;
          }
        }
      `}</style>
    </div>
  );
}

function getMoodGradient(mood: MoodType): [string, string] {
  const map: Record<MoodType, [string, string]> = {
    happy: ['#FFD93D', '#FF9F43'],
    calm: ['#6C5CE7', '#A29BFE'],
    sad: ['#636E72', '#DFE6E9'],
    angry: ['#FF6B6B', '#C0392B'],
    excited: ['#00CEC9', '#55EFC4'],
    tired: ['#B2BEC3', '#FDCB6E'],
  };
  return map[mood];
}

export default App;
