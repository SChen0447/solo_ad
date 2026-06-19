import { useState, useEffect, useCallback } from 'react';
import Dashboard from './components/Dashboard';
import { getRecords, getFriends } from './mockApi';
import type { CommuteRecord, Friend } from './types';
import './styles.css';

function App() {
  const [records, setRecords] = useState<CommuteRecord[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [recordsData, friendsData] = await Promise.all([
          getRecords(),
          getFriends(),
        ]);
        setRecords(recordsData);
        setFriends(friendsData);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleRecordAdded = useCallback((newRecord: CommuteRecord) => {
    setRecords((prev) => [newRecord, ...prev]);
  }, []);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>🌿 城市通勤碳排放追踪器</h1>
        <p>记录每一次出行，为地球减负</p>
      </header>

      {loading ? (
        <div className="loading">
          <div className="spinner" />
        </div>
      ) : (
        <Dashboard
          records={records}
          friends={friends}
          loading={loading}
          onRecordAdded={handleRecordAdded}
        />
      )}
    </div>
  );
}

export default App;
