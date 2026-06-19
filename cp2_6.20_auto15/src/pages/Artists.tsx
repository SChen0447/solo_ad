import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import ArtistCard from '../components/ArtistCard';
import AddArtistModal from '../components/AddArtistModal';
import SkeletonCard from '../components/SkeletonCard';
import '../styles/artists-page.css';

const Artists: React.FC = () => {
  const { state } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [newArtistId, setNewArtistId] = useState<string | null>(null);

  const handleArtistAdded = (id: string) => {
    setNewArtistId(id);
    setTimeout(() => setNewArtistId(null), 500);
  };

  return (
    <div className="artists-page">
      <div className="page-header">
        <h1 className="page-title">艺术家管理</h1>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          + 新增艺术家
        </button>
      </div>

      {state.loading ? (
        <div className="artists-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <div className="artists-grid">
          {state.artists.map(artist => (
            <ArtistCard
              key={artist.id}
              artist={artist}
              isNew={artist.id === newArtistId}
            />
          ))}
        </div>
      )}

      {state.artists.length === 0 && !state.loading && (
        <div className="empty-state">
          <span className="empty-icon">🎤</span>
          <p className="empty-text">还没有艺术家，点击上方按钮添加第一位吧！</p>
        </div>
      )}

      <AddArtistModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onAdded={handleArtistAdded}
      />
    </div>
  );
};

export default Artists;
