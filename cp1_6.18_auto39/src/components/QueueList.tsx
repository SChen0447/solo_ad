import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { ArrowLeft, Clock, Users } from 'lucide-react';
import { formatTime, getInitials, getGradientColor, formatMinutes } from '../utils/time';
import type { QueueItem } from '../types';

interface QueueListProps {
  deviceId: string;
  nickname: string;
  onCancel: (queueId: string) => void;
}

export default function QueueList({ deviceId, nickname, onCancel }: QueueListProps) {
  const { queues, devices } = useStore();
  const queue = queues[deviceId] || [];
  const device = devices.find((d) => d.id === deviceId);

  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleCancel = (queueId: string) => {
    setRemovingId(queueId);
    setTimeout(() => {
      onCancel(queueId);
      setRemovingId(null);
    }, 300);
  };

  const isOwnQueueItem = (item: QueueItem) => {
    return item.nickname === nickname;
  };

  if (queue.length === 0 && device?.status !== 'in-use') {
    return (
      <div className="empty-queue">
        <Clock size={48} />
        <p>暂无排队，设备空闲可用</p>
      </div>
    );
  }

  return (
    <ul className="queue-list">
      {device?.status === 'in-use' && (
        <li className="queue-item current">
          <div
            className="avatar"
            style={{ background: getGradientColor(device.currentUser || 'U') }}
          >
            {getInitials(device.currentUser || 'U')}
          </div>
          <div className="queue-item-content">
            <div className="queue-item-name">
              {device.currentUser || '未知用户'}
              <span style={{ marginLeft: 8, fontSize: 12, color: '#ED8936' }}>
                (使用中)
              </span>
            </div>
            <div className="queue-item-time">
              剩余 {device.remainingMinutes} 分钟
            </div>
          </div>
        </li>
      )}

      {queue.map((item, index) => (
        <li
          key={item.id}
          className={`queue-item ${removingId === item.id ? 'removing' : ''}`}
        >
          <div
            className="avatar"
            style={{ background: getGradientColor(item.nickname) }}
          >
            {getInitials(item.nickname)}
          </div>
          <div className="queue-item-content">
            <div className="queue-item-name">
              {item.nickname}
              {index === 0 && device?.status === 'in-use' && (
                <span style={{ marginLeft: 8, fontSize: 12, color: '#667eea' }}>
                  (下一位)
                </span>
              )}
            </div>
            <div className="queue-item-time">
              预计 {formatTime(item.estimatedStartTime)} 开始
            </div>
            <div className="queue-item-duration">
              预计使用 {formatMinutes(item.duration)}
            </div>
          </div>
          {isOwnQueueItem(item) && (
            <button
              className="cancel-btn"
              onClick={() => handleCancel(item.id)}
            >
              取消
            </button>
          )}
        </li>
      ))}

      {queue.length === 0 && device?.status === 'in-use' && (
        <div className="empty-queue" style={{ padding: '20px 0' }}>
          <p style={{ fontSize: 14 }}>暂无排队，点击下方表单立即预约</p>
        </div>
      )}
    </ul>
  );
}
