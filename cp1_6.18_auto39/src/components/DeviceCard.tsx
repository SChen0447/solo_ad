import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Device } from '../types';
import { Settings } from 'lucide-react';

interface DeviceCardProps {
  device: Device;
  queueCount: number;
  isAdmin: boolean;
  onSettingsClick: () => void;
  recentlyFreed?: boolean;
}

export default function DeviceCard({ device, queueCount, isAdmin, onSettingsClick, recentlyFreed }: DeviceCardProps) {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (device.status === 'in-use' && device.totalDuration && device.remainingMinutes) {
      const elapsed = device.totalDuration - device.remainingMinutes;
      setProgress((elapsed / device.totalDuration) * 100);
    } else {
      setProgress(0);
    }
  }, [device.status, device.remainingMinutes, device.totalDuration]);

  const handleClick = () => {
    if (device.status === 'maintenance') return;
    navigate(`/device/${device.id}`);
  };

  const getStatusText = () => {
    switch (device.status) {
      case 'idle':
        return '空闲';
      case 'in-use':
        return '使用中';
      case 'maintenance':
        return '维护中';
    }
  };

  const getStatusClass = () => {
    switch (device.status) {
      case 'idle':
        return 'status-idle';
      case 'in-use':
        return 'status-in-use';
      case 'maintenance':
        return 'status-maintenance';
    }
  };

  const getTextClass = () => {
    switch (device.status) {
      case 'idle':
        return 'status-text-idle';
      case 'in-use':
        return 'status-text-in-use';
      case 'maintenance':
        return 'status-text-maintenance';
    }
  };

  return (
    <div
      className={`device-card ${getStatusClass()} ${recentlyFreed ? 'breathing' : ''}`}
      onClick={handleClick}
    >
      <div className={`status-dot ${device.status}`}></div>
      
      <h3 className="device-name">{device.name}</h3>
      <p className={`device-status-text ${getTextClass()}`}>
        {getStatusText()}
      </p>

      {device.status === 'in-use' && (
        <>
          <div className="progress-bar-container">
            <div
              className="progress-bar"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="device-info">
            剩余 <strong>{device.remainingMinutes}</strong> 分钟
          </div>
          {device.currentUser && (
            <p className="current-user">使用者：{device.currentUser}</p>
          )}
        </>
      )}

      {device.status === 'maintenance' && device.maintenanceReason && (
        <p className="maintenance-reason">原因：{device.maintenanceReason}</p>
      )}

      {device.status === 'idle' && (
        <p className="device-info">随时可用</p>
      )}

      {queueCount > 0 && device.status !== 'maintenance' && (
        <div className="queue-count">
          {queueCount} 人排队
        </div>
      )}

      {isAdmin && (
        <button
          className="gear-btn"
          onClick={(e) => {
            e.stopPropagation();
            onSettingsClick();
          }}
        >
          <Settings size={16} />
        </button>
      )}
    </div>
  );
}
