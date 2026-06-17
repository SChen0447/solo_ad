import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import MapView from './MapView';
import SoundRecorder from './SoundRecorder';
import EmotionDetail from './EmotionDetail';
import type { SoundRecord } from './types';

function App() {
  const [records, setRecords] = useState<SoundRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<SoundRecord | null>(null);
  const [isRecorderOpen, setIsRecorderOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);

  const fetchRecords = useCallback(async () => {
    try {
      const response = await axios.get('/api/records');
      setRecords(response.data);
    } catch (error) {
      console.error('Failed to fetch records:', error);
      const mockRecords: SoundRecord[] = [];
      setRecords(mockRecords);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleMarkerClick = (record: SoundRecord) => {
    setSelectedRecord(record);
  };

  const handleCloseDetail = () => {
    setSelectedRecord(null);
  };

  const handleMapClick = (lat: number, lng: number) => {
    if (isRecorderOpen) return;
    setSelectedLocation({ lat, lng });
    setIsRecorderOpen(true);
  };

  const handleRecordButtonClick = () => {
    setSelectedLocation(null);
    setIsRecorderOpen(true);
  };

  const handleCloseRecorder = () => {
    setIsRecorderOpen(false);
    setSelectedLocation(null);
  };

  const handleRecordSubmit = async (data: {
    name: string;
    audioData: string;
    duration: number;
    emotion: string;
    scene: string;
    latitude: number;
    longitude: number;
    recorderNickname: string;
  }) => {
    try {
      const response = await axios.post('/api/records', data);
      setRecords(prev => [...prev, response.data]);
      setIsRecorderOpen(false);
      setSelectedLocation(null);
      setTimeout(() => {
        setSelectedRecord(response.data);
      }, 300);
    } catch (error) {
      console.error('Failed to submit record:', error);
    }
  };

  const handleEmotionSubmit = async (recordId: string, emotion: string) => {
    try {
      const response = await axios.post('/api/emotions', {
        recordId,
        emotion,
        userNickname: '匿名用户',
        userAvatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${Date.now()}`
      });
      setRecords(prev => prev.map(r => r.id === recordId ? response.data : r));
      if (selectedRecord?.id === recordId) {
        setSelectedRecord(response.data);
      }
    } catch (error) {
      console.error('Failed to submit emotion:', error);
    }
  };

  return (
    <div style={styles.appContainer}>
      <MapView
        records={records}
        selectedRecord={selectedRecord}
        onMarkerClick={handleMarkerClick}
        onMapClick={handleMapClick}
        onRecordButtonClick={handleRecordButtonClick}
      />
      
      {selectedRecord && (
        <EmotionDetail
          record={selectedRecord}
          onClose={handleCloseDetail}
          onEmotionSubmit={handleEmotionSubmit}
        />
      )}
      
      {isRecorderOpen && (
        <SoundRecorder
          onClose={handleCloseRecorder}
          onSubmit={handleRecordSubmit}
          initialLocation={selectedLocation}
        />
      )}
      
      <footer style={styles.footer}>
        <span style={styles.footerText}>城市声音地图 v1.0.0</span>
      </footer>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  appContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: '8px 16px',
    background: 'rgba(15, 15, 26, 0.9)',
    backdropFilter: 'blur(10px)',
    borderTop: '1px solid rgba(6, 182, 212, 0.2)',
    zIndex: 1000,
    textAlign: 'center',
  },
  footerText: {
    fontSize: '12px',
    color: '#6b7280',
  },
};

export default App;
