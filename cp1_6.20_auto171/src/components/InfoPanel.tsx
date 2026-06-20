import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { Unit } from '../types';

interface InfoPanelProps {
  turn: number;
  currentTeam: 'player' | 'ai';
  selectedUnit: Unit | null;
  logs: string[];
  onEndTurn: () => void;
  onResetGame: () => void;
  isPlayerTurn: boolean;
  onShowHistory: () => void;
}

export const InfoPanel: React.FC<InfoPanelProps> = ({
  turn,
  currentTeam,
  selectedUnit,
  logs,
  onEndTurn,
  onResetGame,
  isPlayerTurn,
  onShowHistory,
}) => {
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '16px',
        gap: '16px',
        overflow: 'hidden',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          backgroundColor: '#0f3460',
          borderRadius: '8px',
          padding: '16px',
        }}
      >
        <h2 style={{ fontSize: '18px', marginBottom: '8px', color: '#e0e0e0' }}>
          第 {turn} 回合
        </h2>
        <p style={{
          color: currentTeam === 'player' ? '#3498db' : '#e74c3c',
          fontWeight: 'bold',
          fontSize: '14px',
        }}>
          {currentTeam === 'player' ? '玩家回合' : 'AI回合'}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        style={{
          backgroundColor: '#0f3460',
          borderRadius: '8px',
          padding: '16px',
          flex: '0 0 auto',
        }}
      >
        <h3 style={{ fontSize: '14px', marginBottom: '12px', color: '#e0e0e0' }}>
          选中单位
        </h3>
        {selectedUnit ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  backgroundColor: selectedUnit.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                }}
              >
                {selectedUnit.type === 'infantry' ? '⚔️' :
                 selectedUnit.type === 'archer' ? '🏹' : '🐴'}
              </div>
              <div>
                <p style={{ fontWeight: 'bold', color: '#e0e0e0' }}>
                  {selectedUnit.name}
                </p>
                <p style={{ fontSize: '12px', color: '#888' }}>
                  {selectedUnit.team === 'player' ? '玩家' : 'AI'}
                </p>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '12px', color: '#aaa' }}>生命值</span>
                <span style={{ fontSize: '12px', color: '#e0e0e0' }}>
                  {selectedUnit.currentHealth}/{selectedUnit.maxHealth}
                </span>
              </div>
              <div
                style={{
                  width: '100%',
                  height: '8px',
                  backgroundColor: '#333',
                  borderRadius: '4px',
                  overflow: 'hidden',
                }}
              >
                <motion.div
                  initial={false}
                  animate={{
                    width: `${(selectedUnit.currentHealth / selectedUnit.maxHealth) * 100}%`,
                  }}
                  transition={{ duration: 0.3 }}
                  style={{
                    height: '100%',
                    backgroundColor:
                      selectedUnit.currentHealth / selectedUnit.maxHealth > 0.5
                        ? '#2ecc71'
                        : selectedUnit.currentHealth / selectedUnit.maxHealth > 0.25
                        ? '#f39c12'
                        : '#e74c3c',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#888' }}>攻击力</span>
                <span style={{ color: '#e74c3c' }}>{selectedUnit.attack}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#888' }}>防御力</span>
                <span style={{ color: '#3498db' }}>{selectedUnit.defense}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#888' }}>移动力</span>
                <span style={{ color: '#2ecc71' }}>{selectedUnit.movement}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#888' }}>射程</span>
                <span style={{ color: '#f39c12' }}>{selectedUnit.range}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <span
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  backgroundColor: selectedUnit.hasMoved ? '#555' : '#2ecc71',
                  color: '#fff',
                }}
              >
                {selectedUnit.hasMoved ? '已移动' : '可移动'}
              </span>
              <span
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  backgroundColor: selectedUnit.hasAttacked ? '#555' : '#e74c3c',
                  color: '#fff',
                }}
              >
                {selectedUnit.hasAttacked ? '已攻击' : '可攻击'}
              </span>
            </div>
          </div>
        ) : (
          <p style={{ color: '#888', fontSize: '13px' }}>点击己方单位选中</p>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        style={{
          flex: '1 1 auto',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          backgroundColor: '#0f3460',
          borderRadius: '8px',
          padding: '12px',
        }}
      >
        <h3 style={{ fontSize: '14px', marginBottom: '8px', color: '#e0e0e0', flexShrink: 0 }}>
          操作日志
        </h3>
        <div
          ref={logRef}
          style={{
            flex: '1 1 auto',
            overflowY: 'auto',
            fontSize: '12px',
            lineHeight: '1.6',
            color: '#aaa',
          }}
        >
          {logs.map((log, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              style={{ padding: '2px 0', borderBottom: '1px solid #1a3a5c' }}
            >
              {log}
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
        style={{
          display: 'flex',
          gap: '10px',
          flexShrink: 0,
        }}
      >
        <button
          onClick={onEndTurn}
          disabled={!isPlayerTurn}
          style={{
            flex: 1,
            padding: '12px',
            borderRadius: '8px',
            border: 'none',
            cursor: isPlayerTurn ? 'pointer' : 'not-allowed',
            background: isPlayerTurn
              ? 'linear-gradient(135deg, #e94560, #c23152)'
              : '#555',
            color: '#fff',
            fontWeight: 'bold',
            fontSize: '14px',
            transition: 'filter 0.3s',
            filter: isPlayerTurn ? 'brightness(1)' : 'brightness(0.7)',
          }}
          onMouseEnter={(e) => {
            if (isPlayerTurn) {
              e.currentTarget.style.filter = 'brightness(1.2)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.filter = isPlayerTurn ? 'brightness(1)' : 'brightness(0.7)';
          }}
        >
          结束回合
        </button>
        <button
          onClick={onResetGame}
          style={{
            flex: 1,
            padding: '12px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            background: 'linear-gradient(135deg, #e94560, #c23152)',
            color: '#fff',
            fontWeight: 'bold',
            fontSize: '14px',
            transition: 'filter 0.3s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.filter = 'brightness(1.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.filter = 'brightness(1)';
          }}
        >
          重置
        </button>
      </motion.div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.4 }}
        onClick={onShowHistory}
        style={{
          padding: '10px',
          borderRadius: '8px',
          border: 'none',
          cursor: 'pointer',
          backgroundColor: '#0f3460',
          color: '#e0e0e0',
          fontSize: '13px',
          transition: 'background-color 0.3s',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#1a4a7c';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#0f3460';
        }}
      >
        📜 历史对局
      </motion.button>
    </div>
  );
};
