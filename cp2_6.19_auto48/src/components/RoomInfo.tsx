import React, { useState } from 'react';

interface RoomInfoProps {
  roomId: string;
  onlineCount: number;
}

const RoomInfo: React.FC<RoomInfoProps> = ({ roomId, onlineCount }) => {
  const [showCopied, setShowCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(roomId).then(() => {
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 1500);
    });
  };

  return (
    <div className="room-info">
      <div className="room-id-display">
        <span className="room-id-text">{roomId}</span>
        <button className="copy-btn" onClick={handleCopy} title="复制房间号">
          📋
          {showCopied && <span className="copy-tooltip">已复制</span>}
        </button>
      </div>
      <div className="online-count">
        <span>在线人数：</span>
        <span className="online-number">{onlineCount}</span>
        <span>人</span>
      </div>
    </div>
  );
};

export default RoomInfo;
