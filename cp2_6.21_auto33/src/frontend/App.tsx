import { useState, useEffect, useCallback, useMemo } from 'react';
import { useApp } from './context/AppContext';
import PetCard from './components/PetCard';
import PetDetail from './components/PetDetail';
import ApplicationModal from './components/ApplicationModal';
import AdminPanel from './components/AdminPanel';
import AdoptionRecords from './components/AdoptionRecords';
import AddPetModal from './components/AddPetModal';
import ToastContainer from './components/ToastContainer';
import FollowUpReminder from './components/FollowUpReminder';
import { useVirtualScroll } from './hooks/useVirtualScroll';
import type { Pet, PageView } from './types';

const CARD_HEIGHT = 400;
const CARD_WIDTH = 260;
const GRID_GAP = 24;

export default function App() {
  const { pets, loading, adoptionRecords, addToast } = useApp();
  const [currentView, setCurrentView] = useState<PageView>('home');
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [showAddPetModal, setShowAddPetModal] = useState(false);
  const [gridColumns, setGridColumns] = useState(4);

  const adoptablePets = useMemo(() => pets.filter(p => p.adoptable), [pets]);

  const virtualScroll = useVirtualScroll({
    itemCount: adoptablePets.length,
    itemHeight: CARD_HEIGHT + GRID_GAP,
    columns: gridColumns,
    overscan: 2
  });

  useEffect(() => {
    const calculateColumns = () => {
      const mainEl = document.querySelector('.app-main');
      const availableWidth = mainEl ? mainEl.clientWidth - 48 : 1200;
      const cols = Math.max(1, Math.floor((availableWidth + GRID_GAP) / (CARD_WIDTH + GRID_GAP)));
      setGridColumns(cols);
    };
    calculateColumns();
    window.addEventListener('resize', calculateColumns);
    return () => window.removeEventListener('resize', calculateColumns);
  }, []);

  const checkReminders = useCallback(() => {
    const now = new Date();
    const due = adoptionRecords.filter(record => {
      if (record.archived) return false;
      const nextDate = new Date(record.nextFollowUpDate);
      return nextDate <= now;
    });
    if (due.length > 0) {
      addToast('warning', `您有${due.length}条回访待处理`);
    }
  }, [adoptionRecords, addToast]);

  useEffect(() => {
    checkReminders();
    const interval = setInterval(checkReminders, 60000);
    return () => clearInterval(interval);
  }, [checkReminders]);

  const handleApplyClick = useCallback((pet: Pet) => {
    setSelectedPet(pet);
    setShowApplicationModal(true);
  }, []);

  const handleCardClick = useCallback((pet: Pet) => {
    setSelectedPet(pet);
  }, []);

  const closeDetail = useCallback(() => {
    setSelectedPet(null);
  }, []);

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <h1 className="app-title" onClick={() => setCurrentView('home')}>
            🐾 宠物救助领养平台
          </h1>
          <nav className="app-nav">
            <button
              className={`nav-btn ${currentView === 'home' ? 'active' : ''}`}
              onClick={() => setCurrentView('home')}
            >
              首页
            </button>
            <button
              className={`nav-btn ${currentView === 'admin' ? 'active' : ''}`}
              onClick={() => setCurrentView('admin')}
            >
              管理后台
            </button>
            <button
              className={`nav-btn ${currentView === 'adoptions' ? 'active' : ''}`}
              onClick={() => setCurrentView('adoptions')}
            >
              领养记录
            </button>
          </nav>
        </div>
      </header>

      <main className="app-main">
        {currentView === 'home' && (
          <>
            <div className="page-header">
              <h2 className="page-title">待领养宠物</h2>
              <button className="add-pet-btn" onClick={() => setShowAddPetModal(true)}>
                + 添加宠物
              </button>
            </div>
            {loading ? (
              <div className="loading">加载中...</div>
            ) : (
              <div
                ref={virtualScroll.containerRef}
                className="pet-grid-virtual"
                style={virtualScroll.containerStyle}
              >
                <div style={virtualScroll.contentStyle}>
                  <div
                    className="pet-grid-inner"
                    style={{
                      transform: `translateY(${virtualScroll.offsetY}px)`,
                      gridTemplateColumns: `repeat(${gridColumns}, ${CARD_WIDTH}px)`,
                    }}
                  >
                    {virtualScroll.visibleItems.map(idx => {
                      const pet = adoptablePets[idx];
                      if (!pet) return null;
                      return (
                        <PetCard
                          key={pet.id}
                          pet={pet}
                          onClick={() => handleCardClick(pet)}
                          onApply={() => handleApplyClick(pet)}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {currentView === 'admin' && <AdminPanel />}
        {currentView === 'adoptions' && <AdoptionRecords />}
      </main>

      <PetDetail
        pet={selectedPet}
        onClose={closeDetail}
        onApply={() => selectedPet && handleApplyClick(selectedPet)}
      />

      {showApplicationModal && selectedPet && (
        <ApplicationModal
          pet={selectedPet}
          onClose={() => setShowApplicationModal(false)}
        />
      )}

      {showAddPetModal && (
        <AddPetModal onClose={() => setShowAddPetModal(false)} />
      )}

      <FollowUpReminder />
      <ToastContainer />
    </div>
  );
}
