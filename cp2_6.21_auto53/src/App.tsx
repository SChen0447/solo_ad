import React, { useState, useEffect } from 'react';
import { Plant, Reminder, DiagnosisRecord } from '@/types';
import { PlantCard } from '@/components/PlantCard';
import { ReminderBar } from '@/components/ReminderBar';
import { DiagnosisPanel } from '@/components/DiagnosisPanel';
import { PlantIcon } from '@/components/PlantIcon';
import { getDaysUntilWatering, isOverdue, formatDate } from '@/utils/dateUtils';

type View = 'home' | 'detail';

export const App: React.FC = () => {
  const [view, setView] = useState<View>('home');
  const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [diagnosisRecords, setDiagnosisRecords] = useState<DiagnosisRecord[]>([]);
  const [highlightedPlantId, setHighlightedPlantId] = useState<string | null>(null);
  const [isDetailEntering, setIsDetailEntering] = useState(false);

  useEffect(() => {
    fetchPlants();
    fetchReminders();
  }, []);

  useEffect(() => {
    if (selectedPlantId) {
      fetchDiagnosisRecords(selectedPlantId);
    }
  }, [selectedPlantId]);

  const fetchPlants = async () => {
    try {
      const response = await fetch('/api/plants');
      const data = await response.json();
      setPlants(data);
    } catch (error) {
      console.error('获取植物数据失败:', error);
    }
  };

  const fetchReminders = async () => {
    try {
      const response = await fetch('/api/reminders');
      const data = await response.json();
      setReminders(data);
    } catch (error) {
      console.error('获取提醒数据失败:', error);
    }
  };

  const fetchDiagnosisRecords = async (plantId: string) => {
    try {
      const response = await fetch(`/api/plants/${plantId}/diagnosis`);
      const data = await response.json();
      setDiagnosisRecords(data);
    } catch (error) {
      console.error('获取诊断记录失败:', error);
    }
  };

  const handlePlantClick = (plantId: string) => {
    setSelectedPlantId(plantId);
    setIsDetailEntering(true);
    setTimeout(() => {
      setView('detail');
      setIsDetailEntering(false);
    }, 150);
  };

  const handleBackClick = () => {
    setIsDetailEntering(true);
    setTimeout(() => {
      setView('home');
      setSelectedPlantId(null);
      setIsDetailEntering(false);
      setHighlightedPlantId(null);
    }, 150);
  };

  const handleReminderClick = (plantId: string) => {
    setHighlightedPlantId(plantId);
    setSelectedPlantId(plantId);
    setView('detail');
    setTimeout(() => {
      setHighlightedPlantId(null);
    }, 900);
  };

  const handleDiagnosisComplete = async (record: DiagnosisRecord) => {
    if (!selectedPlantId) return;
    try {
      const response = await fetch(`/api/plants/${selectedPlantId}/diagnosis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          healthScore: record.healthScore,
          photoUrl: record.photoUrl,
          notes: record.notes,
        }),
      });
      const newRecord = await response.json();
      setDiagnosisRecords(prev => [newRecord, ...prev]);
      fetchReminders();
    } catch (error) {
      console.error('提交诊断记录失败:', error);
    }
  };

  const handleWaterPlant = async () => {
    if (!selectedPlantId) return;
    try {
      const response = await fetch(`/api/plants/${selectedPlantId}/water`, {
        method: 'POST',
      });
      const updatedPlant = await response.json();
      setPlants(prev => prev.map(p => p.id === selectedPlantId ? updatedPlant : p));
      fetchReminders();
    } catch (error) {
      console.error('浇水失败:', error);
    }
  };

  const selectedPlant = plants.find(p => p.id === selectedPlantId);

  const appStyle: React.CSSProperties = {
    maxWidth: 480,
    margin: '0 auto',
    minHeight: '100vh',
    backgroundColor: '#F9FAFB',
    position: 'relative',
  };

  const headerStyle: React.CSSProperties = {
    padding: '20px 20px 16px',
    backgroundColor: 'white',
    position: 'sticky',
    top: 0,
    zIndex: 10,
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: 24,
    fontWeight: 700,
    color: '#1F2937',
    margin: 0,
    marginBottom: 4,
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: 14,
    color: '#6B7280',
    margin: 0,
  };

  const reminderSectionStyle: React.CSSProperties = {
    padding: '16px 20px',
    backgroundColor: 'white',
    borderBottom: '1px solid #F3F4F6',
  };

  const reminderTitleStyle: React.CSSProperties = {
    fontSize: 16,
    fontWeight: 600,
    color: '#1F2937',
    margin: 0,
    marginBottom: 12,
  };

  const plantsSectionStyle: React.CSSProperties = {
    padding: '20px',
  };

  const plantsGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 16,
    justifyItems: 'center',
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: 18,
    fontWeight: 600,
    color: '#1F2937',
    margin: 0,
    marginBottom: 16,
  };

  const detailContainerStyle: React.CSSProperties = {
    animation: isDetailEntering ? 'fade-slide 0.3s ease-out' : 'none',
  };

  const backButtonStyle: React.CSSProperties = {
    position: 'absolute',
    top: 20,
    left: 16,
    width: 36,
    height: 36,
    borderRadius: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  };

  const detailHeroStyle: React.CSSProperties = {
    position: 'relative',
    height: 280,
    overflow: 'hidden',
  };

  const detailPhotoStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  };

  const detailGradientStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
    background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)',
  };

  const detailInfoOverlayStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: 16,
    left: 20,
    right: 20,
    color: 'white',
  };

  const detailNameStyle: React.CSSProperties = {
    fontSize: 28,
    fontWeight: 700,
    margin: 0,
    marginBottom: 4,
  };

  const detailSpeciesStyle: React.CSSProperties = {
    fontSize: 14,
    opacity: 0.9,
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  };

  const detailContentStyle: React.CSSProperties = {
    padding: 20,
    marginTop: -20,
    backgroundColor: '#F9FAFB',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    position: 'relative',
    zIndex: 1,
  };

  const infoCardStyle: React.CSSProperties = {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
  };

  const infoRowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 0',
    borderBottom: '1px solid #F3F4F6',
  };

  const infoLabelStyle: React.CSSProperties = {
    fontSize: 14,
    color: '#6B7280',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  };

  const infoValueStyle: React.CSSProperties = {
    fontSize: 14,
    fontWeight: 500,
    color: '#1F2937',
  };

  const waterButtonStyle: React.CSSProperties = {
    width: '100%',
    padding: '14px',
    backgroundColor: '#22C55E',
    color: 'white',
    border: 'none',
    borderRadius: 12,
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    marginTop: 8,
  };

  if (view === 'home') {
    return (
      <div style={appStyle}>
        <div style={headerStyle}>
          <h1 style={titleStyle}>🌿 花草养护助手</h1>
          <p style={subtitleStyle}>悉心照料每一株绿色生命</p>
        </div>

        <div style={reminderSectionStyle}>
          <h2 style={reminderTitleStyle}>近期提醒</h2>
          <ReminderBar reminders={reminders} onReminderClick={handleReminderClick} />
        </div>

        <div style={plantsSectionStyle}>
          <h2 style={sectionTitleStyle}>我的植物</h2>
          <div style={plantsGridStyle}>
            {plants.map((plant) => (
              <PlantCard
                key={plant.id}
                plant={plant}
                onClick={() => handlePlantClick(plant.id)}
                isHighlighted={highlightedPlantId === plant.id}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!selectedPlant) {
    return null;
  }

  const daysUntil = getDaysUntilWatering(selectedPlant);
  const overdue = isOverdue(selectedPlant);

  return (
    <div style={{ ...appStyle, ...detailContainerStyle }}>
      <button style={backButtonStyle} onClick={handleBackClick}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
      </button>

      <div style={detailHeroStyle}>
        <img src={selectedPlant.photoUrl} alt={selectedPlant.name} style={detailPhotoStyle} />
        <div style={detailGradientStyle} />
        <div style={detailInfoOverlayStyle}>
          <h1 style={detailNameStyle}>{selectedPlant.name}</h1>
          <p style={detailSpeciesStyle}>
            <PlantIcon type={selectedPlant.type} size={16} color="white" />
            {selectedPlant.species}
          </p>
        </div>
      </div>

      <div style={detailContentStyle}>
        <div style={infoCardStyle}>
          <div style={{ ...infoRowStyle, paddingTop: 0 }}>
            <span style={infoLabelStyle}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              浇水周期
            </span>
            <span style={infoValueStyle}>每 {selectedPlant.wateringFrequencyDays} 天</span>
          </div>
          <div style={infoRowStyle}>
            <span style={infoLabelStyle}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2">
                <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
              </svg>
              上次浇水
            </span>
            <span style={infoValueStyle}>{formatDate(selectedPlant.lastWateredDate)}</span>
          </div>
          <div style={infoRowStyle}>
            <span style={infoLabelStyle}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              下次浇水
            </span>
            <span style={{ ...infoValueStyle, color: overdue ? '#DC2626' : '#16A34A', fontWeight: 600 }}>
              {overdue ? `逾期 ${Math.abs(daysUntil)} 天` : daysUntil === 0 ? '今天' : `还有 ${daysUntil} 天`}
            </span>
          </div>
          <div style={infoRowStyle}>
            <span style={infoLabelStyle}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
              上次施肥
            </span>
            <span style={infoValueStyle}>
              {selectedPlant.lastFertilizedDate ? formatDate(selectedPlant.lastFertilizedDate) : '暂无记录'}
            </span>
          </div>
          <div style={{ ...infoRowStyle, borderBottom: 'none', paddingBottom: 0 }}>
            <span style={infoLabelStyle}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              购买日期
            </span>
            <span style={infoValueStyle}>{formatDate(selectedPlant.purchaseDate)}</span>
          </div>
        </div>

        <button style={waterButtonStyle} onClick={handleWaterPlant}>
          💧 立即浇水
        </button>

        <DiagnosisPanel
          plantId={selectedPlant.id}
          records={diagnosisRecords}
          onDiagnosisComplete={handleDiagnosisComplete}
          plantPhotoUrl={selectedPlant.photoUrl}
        />
      </div>

      <style>{`
        @keyframes fade-slide {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
};
