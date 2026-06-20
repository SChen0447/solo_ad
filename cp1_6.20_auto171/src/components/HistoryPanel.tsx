import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GameAPI } from '../api/GameAPI';
import type { GameRecord } from '../types';

interface HistoryPanelProps {
  onClose: () => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ onClose }) => {
  const [records, setRecords] = useState<GameRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const data = await GameAPI.getGames();
        setRecords(data);
      } catch (error) {
        console.error('Failed to fetch game records:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchRecords();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        style={{
          backgroundColor: '#16213e',
          borderRadius: '12px',
          padding: '24px',
          width: '90%',
          maxWidth: '500px',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          border: '2px solid #0f3460',
          zIndex: 1001,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ color: '#e0e0e0', fontSize: '20px' }}>📜 历史对局</h2>
          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: 'none',
              backgroundColor: '#0f3460',
              color: '#e0e0e0',
              cursor: 'pointer',
              fontSize: '16px',
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <p style={{ color: '#888', textAlign: 'center', padding: '20px' }}>加载中...</p>
          ) : records.length === 0 ? (
            <p style={{ color: '#888', textAlign: 'center', padding: '20px' }}>暂无对局记录</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {records.map((record, index) => (
                <motion.div
                  key={record.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  style={{
                    backgroundColor: '#0f3460',
                    borderRadius: '8px',
                    padding: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <p style={{
                      color: record.winner === 'player' ? '#2ecc71' : '#e74c3c',
                      fontWeight: 'bold',
                      marginBottom: '4px',
                    }}>
                      {record.winner === 'player' ? '玩家胜' : 'AI胜'}
                    </p>
                    <p style={{ color: '#888', fontSize: '12px' }}>
                      {new Date(record.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ color: '#e0e0e0', fontSize: '13px' }}>
                      第 {record.turns} 回合
                    </p>
                    <p style={{ color: '#888', fontSize: '12px' }}>
                      {Math.floor(record.duration)}秒
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
