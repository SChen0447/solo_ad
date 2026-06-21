import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import type { Holiday, Activity } from './services/api';
import { api } from './services/api';
import CalendarPanel from './components/CalendarPanel';

const App: React.FC = () => {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [holidaysData, activitiesData] = await Promise.all([
          api.getHolidays(),
          api.getActivities()
        ]);
        setHolidays(holidaysData);
        setActivities(activitiesData);
      } catch (error) {
        console.error('加载数据失败:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleAddActivity = (activity: Activity) => {
    setActivities(prev => [...prev, activity]);
  };

  const handleUpdateActivity = (updatedActivity: Activity) => {
    setActivities(prev =>
      prev.map(a => a.id === updatedActivity.id ? updatedActivity : a)
    );
  };

  const handleDeleteActivity = (id: string) => {
    setActivities(prev => prev.filter(a => a.id !== id));
  };

  return (
    <div className="app" style={{
      minHeight: '100vh',
      backgroundColor: '#f5f5f4'
    }}>
      <nav style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        height: '56px',
        backgroundColor: '#1f2937',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{
          fontSize: '24px',
          fontWeight: 700,
          color: '#ffffff'
        }}>
          🌍 跨文化节日庆典日历
        </h1>
      </nav>

      <main style={{
        padding: '24px 16px',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <Routes>
          <Route
            path="/"
            element={
              <CalendarPanel
                holidays={holidays}
                activities={activities}
                onAddActivity={handleAddActivity}
                onUpdateActivity={handleUpdateActivity}
                onDeleteActivity={handleDeleteActivity}
                loading={loading}
              />
            }
          />
        </Routes>
      </main>
    </div>
  );
};

export default App;
