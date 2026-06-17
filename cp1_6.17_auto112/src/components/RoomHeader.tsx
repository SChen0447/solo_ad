import { useState } from 'react';
import { RoomData } from '../types';

interface Props {
  room: RoomData;
}

export default function RoomHeader({ room }: Props) {
  const [copied, setCopied] = useState(false);

  const participants = Object.values(room.participants);
  const shareUrl = `${window.location.origin}/?room=${room.room_code}`;

  const handleCopyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(room.room_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const textarea = document.createElement('textarea');
      textarea.value = room.room_code;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleExportStory = async () => {
    try {
      const res = await fetch(`/api/rooms/${room.room_code}/export`);
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `story_${room.room_code}_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('导出失败');
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: 60,
      background: 'rgba(26, 26, 46, 0.8)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      borderBottom: '1px solid rgba(108, 99, 255, 0.2)',
      display: 'flex', alignItems: 'center',
      padding: '0 24px', zIndex: 100
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: 'linear-gradient(135deg, #6C63FF, #8B5CF6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, fontWeight: 700, color: '#fff'
        }}>
          S
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#E0E0E0' }}>
            {room.theme}
          </div>
          <div style={{ fontSize: 11, color: '#B0B0B0' }}>
            协作故事接龙 · {Object.keys(room.nodes).length} 个故事节点
            {room.is_completed && <span style={{ color: '#6BCB77', marginLeft: 8 }}>已完成</span>}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div
          onClick={handleCopyRoomCode}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(108, 99, 255, 0.15)',
            border: '1px solid rgba(108, 99, 255, 0.4)',
            borderRadius: 8, padding: '6px 14px',
            cursor: 'pointer', transition: 'all 0.2s ease',
            userSelect: 'none'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(108, 99, 255, 0.25)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(108, 99, 255, 0.15)';
          }}
        >
          <span style={{ color: '#B0B0B0', fontSize: 12 }}>房间码</span>
          <span style={{
            color: '#E0E0E0', fontWeight: 600, fontSize: 14,
            letterSpacing: 2, fontFamily: 'monospace'
          }}>
            {room.room_code}
          </span>
          <span style={{ color: copied ? '#6BCB77' : '#6C63FF', fontSize: 12 }}>
            {copied ? '已复制' : '复制'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {participants.slice(0, 6).map((p, idx) => (
            <img
              key={p.id}
              src={p.avatar}
              alt={p.name}
              title={p.name}
              style={{
                width: 28, height: 28, borderRadius: '50%',
                border: '2px solid #1A1A2E',
                marginLeft: idx > 0 ? -8 : 0,
                background: '#2D2D44'
              }}
            />
          ))}
          {participants.length > 6 && (
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: '#6C63FF', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 600, marginLeft: -8,
              border: '2px solid #1A1A2E'
            }}>
              +{participants.length - 6}
            </div>
          )}
        </div>

        <button
          onClick={handleExportStory}
          style={{
            background: 'transparent', border: '1px solid #6C63FF',
            color: '#6C63FF', padding: '6px 16px',
            borderRadius: 8, cursor: 'pointer', fontSize: 13,
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(108, 99, 255, 0.15)';
            e.currentTarget.style.color = '#8B83FF';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = '#6C63FF';
          }}
        >
          导出 JSON
        </button>
      </div>
    </div>
  );
}
