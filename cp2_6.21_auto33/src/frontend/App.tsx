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
import type { Pet, PageView } from './types';

export default function App() {
  const { pets, loading, adoptionRecords, addToast } = useApp();
  const [currentView, setCurrentView] = useState<PageView>('home');
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [showAddPetModal, setShowAddPetModal] = useState(false);
  const [showReminders, setShowReminders] = useState(false);

  const checkReminders = useCallback(() => {
    const now = new Date();
    const due = adoptionRecords.filter(record => {
      if (record.archived) return false;
      const nextDate = new Date(record.nextFollowUpDate);
      return nextDate <= now;
    });
    if (due.length > 0 && !showReminders) {
      setShowReminders(true);
      addToast('warning', `您有${due.length}条回访待处理`);
    }
  }, [adoptionRecords, addToast, showReminders]);

  useEffect(() => {
    checkReminders();
    const interval = setInterval(checkReminders, 60000);
    return () => clearInterval(interval);
  }, [checkReminders]);

  const adoptablePets = useMemo(() => pets.filter(p => p.adoptable), [pets]);

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
              {currentView === 'home' && (
                <button className="add-pet-btn" onClick={() => setShowAddPetModal(true)}>
                  + 添加宠物
                </button>
              )}
            </div>
            {loading ? (
              <div className="loading">加载中...</div>
            ) : (
              <div className="pet-grid">
                {adoptablePets.map(pet => (
                  <PetCard
                    key={pet.id}
                    pet={pet}
                    onClick={() => handleCardClick(pet)}
                    onApply={() => handleApplyClick(pet)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {currentView === 'admin' && <AdminPanel />}
        {currentView === 'adoptions' && <AdoptionRecords />}
      </main>

      {selectedPet && (
        <PetDetail
          pet={selectedPet}
          onClose={closeDetail}
          onApply={() => handleApplyClick(selectedPet)}
        />
      )}

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
