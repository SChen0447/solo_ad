import React, { useState, useCallback, useEffect } from 'react';
import MoodSelector from './components/MoodSelector';
import SongCard from './components/SongCard';
import PlaylistSidebar from './components/PlaylistSidebar';

export type MoodType = 'happy' | 'calm' | 'sad' | 'angry' | 'excited' | 'tired';

export interface Song {
  id: string;
  title: string;
  artist: string;
  albumCoverUrl: string;
  genre: string;
  reason: string;
}

export interface Favorite {
  id: string;
  songId: string;
  title: string;
  artist: string;
  albumCoverUrl: string;
}

const moodGradients: Record<MoodType, string> = {
  happy: '#FFD93D, #FF9F43',
  calm: '#6C5CE7, #A29BFE',
  sad: '#636E72, #DFE6E9',
  angry: '#FF6B6B, #C0392B',
  excited: '#00CEC9, #55EFC4',
  tired: '#B2BEC3, #FDCB6E',
};

const moodColors: Record<MoodType, string> = {
  happy: '#FFD93D',
  calm: '#6C5CE7',
  sad: '#636E72',
  angry: '#FF6B6B',
  excited: '#00CEC9',
  tired: '#B2BEC3',
};

export { moodGradients, moodColors };

function App() {
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  const fetchFavorites = useCallback(async () => {
    try {
      const res = await fetch('/api/favorites');
      const data = await res.json();
      setFavorites(data);
      setFavoriteIds(new Set(data.map((f: Favorite) => f.songId)));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const handleMoodSelect = useCallback(async (mood: MoodType) => {
    setSelectedMood(mood);
    setLoading(true);
    setSongs([]);
    try {
      const res = await fetch(`/api/songs?mood=${mood}`);
      const data = await res.json();
      setSongs(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFeedback = useCallback(async (songId: string, liked: boolean) => {
    if (!selectedMood) return;
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songId, mood: selectedMood, liked }),
      });
    } catch {
      // ignore
    }
  }, [selectedMood]);

  const handleToggleFavorite = useCallback(async (song: Song) => {
    if (favoriteIds.has(song.id)) {
      const fav = favorites.find(f => f.songId === song.id);
      if (fav) {
        try {
          await fetch(`/api/favorites/${fav.id}`, { method: 'DELETE' });
          setFavorites(prev => prev.filter(f => f.songId !== song.id));
          setFavoriteIds(prev => {
            const next = new Set(prev);
            next.delete(song.id);
            return next;
          });
        } catch {
          // ignore
        }
      }
    } else {
      try {
        const res = await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            songId: song.id,
            title: song.title,
            artist: song.artist,
            albumCoverUrl: song.albumCoverUrl,
          }),
        });
        const data = await res.json();
        setFavorites(prev => [...prev, data]);
        setFavoriteIds(prev => new Set(prev).add(song.id));
      } catch {
        // ignore
      }
    }
  }, [favoriteIds, favorites]);

  const handleRemoveFavorite = useCallback(async (favId: string) => {
    try {
      await fetch(`/api/favorites/${favId}`, { method: 'DELETE' });
      setFavorites(prev => {
        const removed = prev.find(f => f.id === favId);
        if (removed) {
          setFavoriteIds(prevIds => {
            const next = new Set(prevIds);
            next.delete(removed.songId);
            return next;
          });
        }
        return prev.filter(f => f.id !== favId);
      });
    } catch {
      // ignore
    }
  }, []);

  const handleReorderFavorites = useCallback(async (order: string[]) => {
    try {
      await fetch('/api/favorites/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order }),
      });
      setFavorites(prev => {
        const map = new Map(prev.map(f => [f.id, f]));
        return order.map(id => map.get(id)!).filter(Boolean);
      });
    } catch {
      // ignore
    }
  }, []);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 960);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#1a1a2e', color: '#e0e0e0' }}>
      <main
        style={{
          flex: 1,
          minWidth: isMobile ? 'auto' : 780,
          marginRight: isMobile ? 0 : 320,
          padding: isMobile ? '20px 16px 100px' : '32px 40px',
          overflowY: 'auto',
        }}
      >
        <MoodSelector
          selectedMood={selectedMood}
          onMoodSelect={handleMoodSelect}
        />

        {selectedMood && (
          <div style={{ marginTop: 40 }}>
            <h2
              style={{
                fontSize: 24,
                fontWeight: 700,
                background: `linear-gradient(135deg, #6C5CE7, #A29BFE)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                paddingBottom: 16,
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                marginBottom: 24,
              }}
            >
              为你推荐
            </h2>

            {loading && (
              <div style={{ textAlign: 'center', padding: 60, color: '#888' }}>
                正在为你寻找合适的音乐...
              </div>
            )}

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? 'repeat(auto-fill, minmax(200px, 1fr))' : 'repeat(3, 240px)',
                gap: 24,
              }}
            >
              {songs.map((song, index) => (
                <SongCard
                  key={song.id}
                  song={song}
                  mood={selectedMood}
                  index={index}
                  isFavorite={favoriteIds.has(song.id)}
                  onFeedback={handleFeedback}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      <PlaylistSidebar
        favorites={favorites}
        onRemove={handleRemoveFavorite}
        onReorder={handleReorderFavorites}
        themeColor={selectedMood ? moodColors[selectedMood] : '#6C5CE7'}
      />
    </div>
  );
}

export default App;
