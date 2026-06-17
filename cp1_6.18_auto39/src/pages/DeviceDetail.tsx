import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { ArrowLeft } from 'lucide-react';
import QueueList from '../components/QueueList';
import BookingForm from '../components/BookingForm';
import { useSocket } from '../hooks/useSocket';

interface DeviceDetailProps {
  nickname: string;
  isAdmin: boolean;
}

export default function DeviceDetail({ nickname, isAdmin }: DeviceDetailProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { devices, queues } = useStore();
  const { getSocket } = useSocket();

  const device = devices.find((d) => d.id === id);
  const queue = queues[id || ''] || [];

  if (!device) {
    return (
      <div className="detail-page">
        <button className="back-btn" onClick={() => navigate('/')}>
          <ArrowLeft size={18} />
          返回看板
        </button>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <p>设备不存在</p>
        </div>
      </div>
    );
  }

  const getStatusBadgeClass = () => {
    switch (device.status) {
      case 'idle':
        return 'idle';
      case 'in-use':
        return 'in-use';
      case 'maintenance':
        return 'maintenance';
    }
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

  const handleBooking = async (nickname: string, duration: number) => {
    const socket = getSocket();
    try {
      const res = await fetch(`/api/devices/${id}/queue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nickname,
          duration,
          socketId: socket?.id,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || '预约失败');
      }

      const data = await res.json();
      if (data.isImmediate) {
        console.log('设备空闲，立即使用');
      }
    } catch (error) {
      console.error('Booking failed:', error);
      alert(error instanceof Error ? error.message : '预约失败');
    }
  };

  const handleCancel = async (queueId: string) => {
    try {
      const res = await fetch(`/api/devices/${id}/queue/${queueId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('取消失败');
      }
    } catch (error) {
      console.error('Cancel failed:', error);
      alert('取消失败，请重试');
    }
  };

  return (
    <div className="detail-page">
      <button className="back-btn" onClick={() => navigate('/')}>
        <ArrowLeft size={18} />
        返回看板
      </button>

      <div className="device-header">
        <h2>{device.name}</h2>
        <span className={`status-badge ${getStatusBadgeClass()}`}>
          {getStatusText()}
        </span>
        {device.status === 'in-use' && device.currentUser && (
          <p style={{ color: '#718096', marginTop: 8 }}>
            当前使用者：<strong>{device.currentUser}</strong>
            ，剩余 {device.remainingMinutes} 分钟
          </p>
        )}
        {device.status === 'maintenance' && device.maintenanceReason && (
          <p style={{ color: '#718096', marginTop: 8, fontStyle: 'italic' }}>
            维护原因：{device.maintenanceReason}
          </p>
        )}
        {device.status === 'idle' && (
          <p style={{ color: '#38A169', marginTop: 8 }}>
            设备空闲，随时可用
          </p>
        )}
      </div>

      <div className="queue-section">
        <h3>
          <span>排队列表</span>
          <span className="queue-count-badge">{queue.length}</span>
        </h3>
        <QueueList
          deviceId={id!}
          nickname={nickname}
          onCancel={handleCancel}
        />
      </div>

      <BookingForm
        nickname={nickname}
        disabled={device.status === 'maintenance'}
        onSubmit={handleBooking}
      />
    </div>
  );
}
