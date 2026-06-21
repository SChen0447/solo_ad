import React, { useState, useEffect } from 'react';
import { PetCard } from '../components/PetCard';
import { VaccineModal } from '../components/VaccineModal';
import { petService } from '../api/petService';
import { PetWithDetails, Reminder } from '../types';
import './HomePage.css';

export const HomePage: React.FC = () => {
  const [pets, setPets] = useState<PetWithDetails[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPetId, setSelectedPetId] = useState('');
  const [selectedPetName, setSelectedPetName] = useState('');

  const fetchData = async () => {
    try {
      const [petsData, remindersData] = await Promise.all([
        petService.getAllPets(),
        petService.getReminders(),
      ]);
      setPets(petsData.slice(0, 5));
      setReminders(remindersData.filter(r => r.isUrgent || r.isOverdue).slice(0, 5));
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddVaccine = (petId: string) => {
    const pet = pets.find(p => p.id === petId);
    if (pet) {
      setSelectedPetId(petId);
      setSelectedPetName(pet.name);
      setModalOpen(true);
    }
  };

  const handleVaccineAdded = () => {
    fetchData();
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <div className="home-page">
      <header className="app-header">
        <div className="header-content">
          <h1>🐾 宠物健康档案</h1>
          <p className="header-subtitle">记录每一次成长，守护毛孩子健康</p>
        </div>
      </header>

      <main className="main-content">
        <section className="reminders-section">
          <h2 className="section-title">📋 近期待办</h2>
          {reminders.length === 0 ? (
            <div className="empty-reminders">
              <p>✅ 暂无待办事项</p>
            </div>
          ) : (
            <div className="reminders-list">
              {reminders.map((reminder, index) => (
                <div
                  key={`${reminder.petId}-${index}`}
                  className={`reminder-item ${reminder.isOverdue ? 'overdue' : ''} ${reminder.isUrgent ? 'urgent' : ''}`}
                >
                  <span className="reminder-avatar">{reminder.petAvatar}</span>
                  <div className="reminder-info">
                    <div className="reminder-title">
                      <strong>{reminder.petName}</strong>
                      <span className="reminder-type">{reminder.vaccineType}</span>
                    </div>
                    <div className="reminder-date">{reminder.date}</div>
                  </div>
                  <span className={`reminder-badge ${reminder.isOverdue ? 'badge-overdue' : 'badge-urgent'}`}>
                    {reminder.isOverdue ? `已超期${Math.abs(reminder.daysUntil)}天` : `还有${reminder.daysUntil}天`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="pets-section">
          <h2 className="section-title">🐕 我的宠物</h2>
          {pets.length === 0 ? (
            <div className="empty-pets">
              <p>还没有添加宠物</p>
            </div>
          ) : (
            <div className="pets-grid">
              {pets.map(pet => (
                <PetCard
                  key={pet.id}
                  pet={pet}
                  onAddVaccine={handleAddVaccine}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      <VaccineModal
        isOpen={modalOpen}
        petId={selectedPetId}
        petName={selectedPetName}
        onClose={() => setModalOpen(false)}
        onSuccess={handleVaccineAdded}
      />
    </div>
  );
};
