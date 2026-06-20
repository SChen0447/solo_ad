import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import ArtistCard from '../components/ArtistCard';
import AddArtistModal from '../components/AddArtistModal';
import { ArtistsGridSkeleton } from '../components/Skeleton';
import { Artist } from '../types';

const ArtistsPage: React.FC = () => {
  const { artists, loading } = useAppContext();
  const [modalOpen, setModalOpen] = useState(false);
  const [newArtistId, setNewArtistId] = useState<string | null>(null);

  const handleCreated = (artist: Artist) => {
    setNewArtistId(artist.id);
    setTimeout(() => setNewArtistId(null), 1000);
  };

  return (
    <>
      <div className="page-header">
        <h1>艺术家管理</h1>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          <span>＋</span> 添加艺术家
        </button>
      </div>

      {loading ? (
        <ArtistsGridSkeleton />
      ) : artists.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎤</div>
          <div className="empty-text">还没有添加任何艺术家</div>
          <div className="empty-sub">点击右上角按钮添加你的第一位艺术家</div>
        </div>
      ) : (
        <div className="artists-grid">
          {artists.map(artist => (
            <ArtistCard
              key={artist.id}
              artist={artist}
              isNew={artist.id === newArtistId}
            />
          ))}
          <button
            className="add-artist-card"
            onClick={() => setModalOpen(true)}
            style={{ height: 'auto', aspectRatio: '1.15' }}
          >
            <div className="add-artist-icon">＋</div>
            <div className="add-artist-text">添加艺术家</div>
          </button>
        </div>
      )}

      <AddArtistModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={handleCreated}
      />
    </>
  );
};

export default ArtistsPage;
