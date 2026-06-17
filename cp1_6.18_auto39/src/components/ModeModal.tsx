import { useState } from 'react';
import { CheckCircle, Clock, Wrench, X } from 'lucide-react';
import type { DeviceStatus } from '../types';

interface ModeModalProps {
  isOpen: boolean;
  deviceName: string;
  onClose: () => void;
  onConfirm: (status: DeviceStatus, options?: { currentUser?: string; duration?: number; reason?: string }) => void;
}

export default function ModeModal({ isOpen, deviceName, onClose, onConfirm }: ModeModalProps) {
  const [selectedMode, setSelectedMode] = useState<DeviceStatus | null>(null);
  const [currentUser, setCurrentUser] = useState('');
  const [duration, setDuration] = useState(30);
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  const handleSelectMode = (mode: DeviceStatus) => {
    setSelectedMode(mode);
  };

  const handleConfirm = () => {
    if (!selectedMode) return;
    
    const options: { currentUser?: string; duration?: number; reason?: string } = {};
    if (selectedMode === 'in-use') {
      options.currentUser = currentUser || '管理员';
      options.duration = duration;
    } else if (selectedMode === 'maintenance') {
      options.reason = reason || '维护中';
    }
    
    onConfirm(selectedMode, options);
    setSelectedMode(null);
    setCurrentUser('');
    setDuration(30);
    setReason('');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">切换 {deviceName} 模式</h3>
        
        <div className="modal-options">
          <div
            className={`modal-option ${selectedMode === 'idle' ? 'selected' : ''}`}
            onClick={() => handleSelectMode('idle')}
          >
            <div className="option-icon idle">
              <CheckCircle size={20} color="#276749" />
            </div>
            <div className="option-text">
              <h4>设为空闲</h4>
              <p>设备可用，等待用户预约</p>
            </div>
          </div>

          <div
            className={`modal-option ${selectedMode === 'in-use' ? 'selected' : ''}`}
            onClick={() => handleSelectMode('in-use')}
          >
            <div className="option-icon in-use">
              <Clock size={20} color="#7B341E" />
            </div>
            <div className="option-text">
              <h4>设为使用中</h4>
              <p>手动指定设备使用者</p>
            </div>
          </div>

          {selectedMode === 'in-use' && (
            <div style={{ paddingLeft: 52 }}>
              <div className="modal-input-group">
                <label>使用者昵称</label>
                <input
                  type="text"
                  placeholder="输入昵称"
                  value={currentUser}
                  onChange={(e) => setCurrentUser(e.target.value)}
                />
              </div>
              <div className="modal-input-group">
                <label>使用时长：{duration} 分钟</label>
                <input
                  type="range"
                  min="5"
                  max="60"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                />
              </div>
            </div>
          )}

          <div
            className={`modal-option ${selectedMode === 'maintenance' ? 'selected' : ''}`}
            onClick={() => handleSelectMode('maintenance')}
          >
            <div className="option-icon maintenance">
              <Wrench size={20} color="#4A5568" />
            </div>
            <div className="option-text">
              <h4>设为维护中</h4>
              <p>暂停设备使用</p>
            </div>
          </div>

          {selectedMode === 'maintenance' && (
            <div style={{ paddingLeft: 52 }}>
              <div className="modal-input-group">
                <label>维护原因</label>
                <input
                  type="text"
                  placeholder="输入维护原因"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        <button
          className="submit-btn"
          style={{ marginTop: 20 }}
          onClick={handleConfirm}
          disabled={!selectedMode}
        >
          确认切换
        </button>

        <div className="modal-close">
          <button onClick={onClose}>取消</button>
        </div>
      </div>
    </div>
  );
}
