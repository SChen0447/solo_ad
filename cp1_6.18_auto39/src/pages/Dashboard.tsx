import { useState } from 'react';
import { useStore } from '../store/useStore';
import DeviceCard from '../components/DeviceCard';
import ModeModal from '../components/ModeModal';
import type { DeviceStatus } from '../types';
import { Users } from 'lucide-react';

interface DashboardProps {
  nickname: string;
  isAdmin: boolean;
}

export default function Dashboard({ nickname, isAdmin }: DashboardProps) {
  const { devices, queues, onlineCount } = useStore();
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [recentlyFreedDevices, setRecentlyFreedDevices] = useState<Set<string>>(new Set());

  const handleSettingsClick = (deviceId: string) => {
    setSelectedDevice(deviceId);
    setShowModal(true);
  };

  const handleModeChange = async (status: DeviceStatus, options?: { currentUser?: string; duration?: number; reason?: string }) => {
    if (!selectedDevice) return;

    try {
      await fetch(`/api/devices/${selectedDevice}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          currentUser: options?.currentUser,
          duration: options?.duration,
          reason: options?.reason,
          isAdmin,
        }),
      });
    } catch (error) {
      console.error('Failed to update device status:', error);
    }
  };

  const selectedDeviceData = devices.find((d) => d.id === selectedDevice);

  return (
    <>
      <header className="header">
        <h1>🔧 智能设备排队系统</h1>
        <div className="user-info">
          <div className="online-badge">
            <Users size={14} />
            <span>{onlineCount} 人在线</span>
          </div>
          <span className="user-nickname">
            {nickname} {isAdmin && '(管理员)'}
          </span>
        </div>
      </header>

      <div className="dashboard-container">
        <div className="device-grid">
          {devices.map((device) => (
            <DeviceCard
              key={device.id}
              device={device}
              queueCount={(queues[device.id] || []).length}
              isAdmin={isAdmin}
              onSettingsClick={() => handleSettingsClick(device.id)}
              recentlyFreed={recentlyFreedDevices.has(device.id)}
            />
          ))}
        </div>
      </div>

      {selectedDeviceData && (
        <ModeModal
          isOpen={showModal}
          deviceName={selectedDeviceData.name}
          onClose={() => setShowModal(false)}
          onConfirm={handleModeChange}
        />
      )}
    </>
  );
}
