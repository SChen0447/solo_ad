import React, { useReducer, useMemo } from 'react';
import './SongList.css';

export interface Song {
  id: string;
  name: string;
  artist: string;
  bpm: number;
  duration: number;
  notes: string;
}

interface SongListProps {
  songs: Song[];
  selectedSongId: string | null;
  onSelectSong: (songId: string) => void;
  onAddSong: () => void;
}

type State = {
  selectedId: string | null;
};

type Action = 
  | { type: 'SELECT'; payload: string }
  | { type: 'DESELECT' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SELECT':
      return { selectedId: action.payload };
    case 'DESELECT':
      return { selectedId: null };
    default:
      return state;
  }
}

function formatDuration(seconds: number): string {
  if (!seconds) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const SongList: React.FC<SongListProps> = ({ 
  songs, 
  selectedSongId, 
  onSelectSong,
  onAddSong 
}) => {
  const [, dispatch] = useReducer(reducer, { selectedId: selectedSongId });

  const handleSongClick = (songId: string) => {
    if (selectedSongId === songId) {
      dispatch({ type: 'DESELECT' });
    } else {
      dispatch({ type: 'SELECT', payload: songId });
    }
    onSelectSong(songId);
  };

  const { leftSongs, rightSongs, selectedSong } = useMemo(() => {
    if (!selectedSongId || songs.length === 0) {
      return { leftSongs: [], rightSongs: [], selectedSong: null };
    }

    const selectedIndex = songs.findIndex(s => s.id === selectedSongId);
    if (selectedIndex === -1) {
      return { leftSongs: songs, rightSongs: [], selectedSong: null };
    }

    return {
      leftSongs: songs.slice(0, selectedIndex),
      rightSongs: songs.slice(selectedIndex + 1),
      selectedSong: songs[selectedIndex],
    };
  }, [songs, selectedSongId]);

  const isCompactView = !selectedSongId;

  return (
    <div className="song-list-container">
      {isCompactView ? (
        <div className="song-grid">
          {songs.map(song => (
            <div
              key={song.id}
              className="song-card compact"
              onClick={() => handleSongClick(song.id)}
            >
              <div className="song-card-content">
                <h3 className="song-name">{song.name}</h3>
                <p className="song-artist">{song.artist}</p>
                <div className="song-meta">
                  <span className="song-bpm">{song.bpm} BPM</span>
                  <span className="song-duration">{formatDuration(song.duration)}</span>
                </div>
              </div>
            </div>
          ))}
          <div className="song-card add-card" onClick={onAddSong}>
            <div className="add-icon">+</div>
            <span>添加曲目</span>
          </div>
        </div>
      ) : (
        <div className="song-showcase">
          <div className="side-column left">
            {leftSongs.slice(-3).map((song, index) => (
              <div
                key={song.id}
                className="song-card thumbnail"
                style={{ 
                  opacity: 0.3 + (index / leftSongs.slice(-3).length) * 0.3,
                  transform: `scale(${0.6 + (index / leftSongs.slice(-3).length) * 0.15})`,
                }}
                onClick={() => handleSongClick(song.id)}
              >
                <h4 className="song-name-small">{song.name}</h4>
                <p className="song-bpm-small">{song.bpm} BPM</p>
              </div>
            ))}
          </div>

          <div className="center-column">
            {selectedSong && (
              <div 
                className="song-card selected"
                onClick={() => handleSongClick(selectedSong.id)}
              >
                <div className="pulse-ring"></div>
                <div className="pulse-ring delay"></div>
                <div className="song-card-content large">
                  <h2 className="song-name-large">{selectedSong.name}</h2>
                  <p className="song-artist-large">{selectedSong.artist}</p>
                  <div className="song-meta-large">
                    <div className="meta-item">
                      <span className="meta-label">BPM</span>
                      <span className="meta-value">{selectedSong.bpm}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">时长</span>
                      <span className="meta-value">{formatDuration(selectedSong.duration)}</span>
                    </div>
                  </div>
                  {selectedSong.notes && (
                    <p className="song-notes">{selectedSong.notes}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="side-column right">
            {rightSongs.slice(0, 3).map((song, index) => (
              <div
                key={song.id}
                className="song-card thumbnail"
                style={{ 
                  opacity: 0.6 - (index / rightSongs.slice(0, 3).length) * 0.3,
                  transform: `scale(${0.75 - (index / rightSongs.slice(0, 3).length) * 0.15})`,
                }}
                onClick={() => handleSongClick(song.id)}
              >
                <h4 className="song-name-small">{song.name}</h4>
                <p className="song-bpm-small">{song.bpm} BPM</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SongList;
