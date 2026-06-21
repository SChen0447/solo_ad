import { useEffect, useState } from 'react';
import type { RoomData } from './types';

interface InfoPanelProps {
  room: RoomData;
  allRooms: RoomData[];
  onClose: () => void;
}

export default function InfoPanel({ room, allRooms, onClose }: InfoPanelProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(timer);
  }, []);

  const adjacentNames = room.adjacentRooms
    .map((id) => allRooms.find((r) => r.id === id)?.name || id)
    .join('、');

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        right: 32,
        bottom: 32,
        width: 280,
        background: '#2d3748',
        border: '1px solid #4a5568',
        borderRadius: 12,
        padding: 20,
        color: 'white',
        boxShadow: 'rgba(0,0,0,0.25) 0px 4px 12px',
        transform: mounted ? 'scale(1)' : 'scale(0.8)',
        opacity: mounted ? 1 : 0,
        transition: 'transform 0.3s ease-in-out, opacity 0.3s ease-in-out',
        transformOrigin: 'center',
        zIndex: 20,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{room.name}</h3>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#a0aec0',
            fontSize: 20,
            cursor: 'pointer',
            padding: 0,
            lineHeight: 1,
            transition: 'color 0.3s ease-in-out',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'white')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#a0aec0')}
        >
          ×
        </button>
      </div>
      <div
        style={{
          marginTop: 16,
          paddingTop: 16,
          borderTop: '1px solid #4a5568',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#a0aec0', fontSize: 14 }}>面积</span>
          <span style={{ fontSize: 18, fontWeight: 600, color: '#63b3ed' }}>
            {room.area.toFixed(1)} ㎡
          </span>
        </div>
        <div>
          <div style={{ color: '#a0aec0', fontSize: 14, marginBottom: 8 }}>相邻房间</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {room.adjacentRooms.length > 0 ? (
              room.adjacentRooms.map((id) => {
                const r = allRooms.find((x) => x.id === id);
                return (
                  <span
                    key={id}
                    style={{
                      background: 'rgba(99, 179, 237, 0.2)',
                      border: '1px solid rgba(99, 179, 237, 0.4)',
                      color: '#90cdf4',
                      padding: '4px 10px',
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                  >
                    {r?.name || id}
                  </span>
                );
              })
            ) : (
              <span style={{ color: '#718096', fontSize: 13 }}>无</span>
            )}
          </div>
          {adjacentNames && (
            <div style={{ fontSize: 12, color: '#718096', marginTop: 8 }}>
              与 {adjacentNames} 相邻
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
