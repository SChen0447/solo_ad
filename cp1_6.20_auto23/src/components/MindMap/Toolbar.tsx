import { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { MindMapData } from '@typeDefs/index';
import { exportToJSON } from '@utils/mindmap';
import './Toolbar.css';

interface ToolbarProps {
  roomId: string;
  roomName: string;
  mindMapData: MindMapData | null;
  user: { id: string; nickname: string; avatar: string } | null;
}

const Toolbar = ({ roomId, roomName, mindMapData, user }: ToolbarProps) => {
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleCopyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleExportPNG = async () => {
    const canvasElement = document.querySelector('.canvas-svg');
    if (!canvasElement) return;

    try {
      const canvas = await html2canvas(canvasElement as HTMLElement, {
        backgroundColor: '#fafafa',
        scale: 2,
      });

      const link = document.createElement('a');
      link.download = `${roomName}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Export PNG failed:', err);
    }
  };

  const handleExportJSON = () => {
    if (!mindMapData) return;

    const json = exportToJSON(mindMapData);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.download = `${roomName}.json`;
    link.href = url;
    link.click();

    URL.revokeObjectURL(url);
  };

  return (
    <header className="toolbar">
      <div className="toolbar-left">
        <div className="app-logo">
          <svg viewBox="0 0 24 24" className="app-logo-icon">
            <circle cx="12" cy="12" r="3" fill="#1a73e8" />
            <circle cx="4" cy="6" r="2" fill="#34a853" />
            <circle cx="4" cy="18" r="2" fill="#fbbc04" />
            <circle cx="20" cy="12" r="2" fill="#ea4335" />
          </svg>
          <span className="app-name">思维导图</span>
        </div>
      </div>

      <div className="toolbar-center">
        <div className="room-info">
          <span className="room-name">{roomName}</span>
          <div className="room-id-container">
            <span className="room-id-label">房间号:</span>
            <span className="room-id-text">{roomId}</span>
            <button
              className="copy-btn"
              onClick={handleCopyRoomId}
              title="复制房间号"
            >
              {copied ? '✓' : '📋'}
            </button>
          </div>
        </div>
      </div>

      <div className="toolbar-right">
        <div className="toolbar-actions">
          <button className="toolbar-btn" onClick={handleExportPNG} title="导出PNG">
            <span className="btn-icon">🖼️</span>
            <span className="btn-text">PNG</span>
          </button>
          <button className="toolbar-btn" onClick={handleExportJSON} title="导出JSON">
            <span className="btn-icon">📄</span>
            <span className="btn-text">JSON</span>
          </button>
        </div>

        {user && (
          <div className="user-info">
            <div
              className="user-avatar"
              style={{ backgroundColor: user.avatar }}
            >
              {user.nickname.charAt(0)}
            </div>
            <span className="user-name">{user.nickname}</span>
          </div>
        )}
      </div>

      <div ref={canvasRef} style={{ display: 'none' }} />
    </header>
  );
};

export default Toolbar;
