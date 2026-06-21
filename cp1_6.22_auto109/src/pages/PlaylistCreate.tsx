import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, Song } from '../api';

export default function PlaylistCreate() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [selectedSongs, setSelectedSongs] = useState<Song[]>([]);
  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    api.getSongs().then(setAllSongs);
  }, []);

  const doSearch = useCallback((q: string) => {
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    const lower = q.toLowerCase();
    const results = allSongs.filter(
      s =>
        s.title.toLowerCase().includes(lower) ||
        s.artist.toLowerCase().includes(lower) ||
        s.album.toLowerCase().includes(lower)
    );
    setSearchResults(results);
  }, [allSongs]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 300);
  };

  const addSong = (song: Song) => {
    if (selectedSongs.find(s => s.id === song.id)) return;
    setSelectedSongs(prev => [...prev, song]);
  };

  const removeSong = (songId: string) => {
    setSelectedSongs(prev => prev.filter(s => s.id !== songId));
  };

  const nameLengthRatio = name.length / 20;
  const borderColor = nameLengthRatio >= 1
    ? '#e53e3e'
    : nameLengthRatio > 0.7
      ? `rgb(${Math.round(56 + (229 - 56) * ((nameLengthRatio - 0.7) / 0.3))}, ${Math.round(161 - (161 - 62) * ((nameLengthRatio - 0.7) / 0.3))}, ${Math.round(105 - (105 - 62) * ((nameLengthRatio - 0.7) / 0.3))})`
      : '#38a169';

  const handleSubmit = () => {
    if (!name.trim() || name.length > 20) return;
    setSubmitting(true);
    api.createPlaylist({
      name: name.trim(),
      description: description.trim(),
      songIds: selectedSongs.map(s => s.id),
    }).then(pl => {
      navigate(`/playlists/${pl.id}`);
    }).finally(() => setSubmitting(false));
  };

  return (
    <div className="playlist-create-page">
      <h1>创建歌单</h1>
      <div className="form-group">
        <label>歌单名称 <span className="char-count">{20 - name.length}</span></label>
        <input
          className="form-input name-input"
          style={{ borderColor: name.length > 0 ? borderColor : undefined }}
          placeholder="输入歌单名称..."
          value={name}
          onChange={e => setName(e.target.value.slice(0, 20))}
          maxLength={20}
        />
      </div>
      <div className="form-group">
        <label>描述 <span className="char-count">{200 - description.length}</span></label>
        <textarea
          className="form-input desc-input"
          placeholder="歌单描述（可选）..."
          value={description}
          onChange={e => setDescription(e.target.value.slice(0, 200))}
          maxLength={200}
          rows={3}
        />
      </div>
      <div className="form-group">
        <label>添加歌曲</label>
        <input
          className="form-input search-input"
          placeholder="搜索歌曲..."
          value={searchQuery}
          onChange={e => handleSearchChange(e.target.value)}
        />
        {searchResults.length > 0 && (
          <div className="search-results">
            {searchResults.map(song => (
              <div
                key={song.id}
                className={`search-result-item ${selectedSongs.find(s => s.id === song.id) ? 'selected' : ''}`}
                onClick={() => addSong(song)}
              >
                <span className="result-title">{song.title}</span>
                <span className="result-artist">{song.artist}</span>
                {selectedSongs.find(s => s.id === song.id) && <span className="check-mark">✓</span>}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="selected-songs">
        {selectedSongs.map(song => (
          <span key={song.id} className="song-tag">
            {song.title}
            <button className="tag-remove" onClick={() => removeSong(song.id)}>×</button>
          </span>
        ))}
      </div>
      <button
        className="submit-btn playlist-submit"
        onClick={handleSubmit}
        disabled={submitting || !name.trim() || name.length > 20}
      >
        {submitting ? '创建中...' : '创建歌单'}
      </button>
    </div>
  );
}
