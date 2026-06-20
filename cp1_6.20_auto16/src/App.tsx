import React, { useState, useCallback, useEffect } from 'react';
import { MapView } from '@components/MapView';
import { MarkerForm } from '@components/MarkerForm';
import { StatsPanel } from '@components/StatsPanel';
import { useMemories } from '@data/memoryStore';
import type { TravelMemory } from '@/types';
import '@styles/App.css';

function App(): React.JSX.Element {
  const { memories, add, update, delete: deleteMemory, getStats, compressImage } =
    useMemories();

  const [formPosition, setFormPosition] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [editingMemory, setEditingMemory] = useState<TravelMemory | null>(null);
  const [showTrail, setShowTrail] = useState(true);
  const [newlyAddedId, setNewlyAddedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleMapClick = useCallback((lat: number, lng: number) => {
    setEditingMemory(null);
    setFormPosition({ lat, lng });
  }, []);

  const handleEditMemory = useCallback((memory: TravelMemory) => {
    setFormPosition(null);
    setEditingMemory(memory);
  }, []);

  const handleDeleteMemory = useCallback((id: string) => {
    setDeletingId(id);
    setTimeout(() => {
      deleteMemory(id);
      setDeletingId(null);
    }, 280);
  }, [deleteMemory]);

  const handleFormSubmit = useCallback(
    (data: Omit<TravelMemory, 'id' | 'createdAt'>) => {
      const newMemory = add(data);
      setNewlyAddedId(newMemory.id);
      setTimeout(() => setNewlyAddedId(null), 600);
    },
    [add]
  );

  const handleFormUpdate = useCallback(
    (
      id: string,
      data: Partial<Omit<TravelMemory, 'id' | 'createdAt'>>
    ) => {
      update(id, data);
    },
    [update]
  );

  const handleCloseForm = useCallback(() => {
    setFormPosition(null);
    setEditingMemory(null);
  }, []);

  useEffect(() => {
    const preventDefault = (e: TouchEvent): void => {
      if (e.touches.length > 1) e.preventDefault();
    };
    document.addEventListener('touchmove', preventDefault, { passive: false });
    return () => document.removeEventListener('touchmove', preventDefault);
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-logo">
          <span className="logo-icon">🌍</span>
          <span className="logo-text">旅行记忆地图</span>
        </div>
        <div className="app-controls">
          <button
            className={`trail-toggle ${showTrail ? 'active' : ''}`}
            onClick={() => setShowTrail((prev) => !prev)}
            title={showTrail ? '隐藏旅行轨迹' : '显示旅行轨迹'}
          >
            <span className="trail-icon">🛤️</span>
            <span className="trail-text">轨迹</span>
          </button>
        </div>
      </header>

      <main className="app-main">
        <MapView
          memories={memories}
          showTrail={showTrail}
          onMapClick={handleMapClick}
          onEditMemory={handleEditMemory}
          onDeleteMemory={handleDeleteMemory}
          newlyAddedId={newlyAddedId}
          deletingId={deletingId}
        />

        <StatsPanel stats={getStats()} memories={memories} />
      </main>

      <MarkerForm
        position={formPosition}
        editingMemory={editingMemory}
        onSubmit={handleFormSubmit}
        onUpdate={handleFormUpdate}
        onClose={handleCloseForm}
        compressImage={compressImage}
      />

      <div className="map-hint">
        💡 点击地图任意位置添加新的旅行记忆
      </div>
    </div>
  );
}

export default App;
