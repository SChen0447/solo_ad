import React, { useState } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import type { Device, LightDevice, ACDevice, CurtainDevice, ACMode } from './types';
import { getSensorValueLabel } from './dataStore';

interface DeviceCardProps {
  device: Device;
  index: number;
  isSelected: boolean;
  onSelect: (device: Device) => void;
  onMove: (fromIndex: number, toIndex: number) => void;
  onUpdateDevice: (device: Device) => void;
}

const getDeviceIcon = (device: Device): string => {
  switch (device.type) {
    case 'light':
      return '💡';
    case 'ac':
      return '❄️';
    case 'curtain':
      return '🪟';
    case 'sensor':
      switch (device.sensorType) {
        case 'temperature':
          return '🌡️';
        case 'humidity':
          return '💧';
        case 'smoke':
          return '🚨';
        case 'light':
          return '☀️';
        default:
          return '📊';
      }
    default:
      return '📱';
  }
};

const getDeviceBgColor = (type: string): string => {
  switch (type) {
    case 'light':
      return '#fef3c7';
    case 'ac':
      return '#e0f2fe';
    case 'curtain':
      return '#d1fae5';
    case 'sensor':
      return '#fce7f3';
    default:
      return '#ffffff';
  }
};

const getDeviceStatus = (device: Device): boolean => {
  switch (device.type) {
    case 'light':
      return device.isOn;
    case 'ac':
      return device.isOn;
    case 'curtain':
      return device.openPercent > 0;
    case 'sensor':
      return device.value > 50;
    default:
      return false;
  }
};

const ItemType = 'DEVICE_CARD';

interface DragItem {
  index: number;
  id: string;
  type: string;
}

export const DeviceCard: React.FC<DeviceCardProps> = ({
  device,
  index,
  isSelected,
  onSelect,
  onMove,
  onUpdateDevice,
}) => {
  const [showControlPanel, setShowControlPanel] = useState(false);

  const ref = React.useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemType,
    item: { index, id: device.id, type: ItemType } as DragItem,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  const [, drop] = useDrop(() => ({
    accept: ItemType,
    hover(item: DragItem) {
      if (!ref.current) return;
      const dragIndex = item.index;
      const hoverIndex = index;
      if (dragIndex === hoverIndex) return;
      onMove(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  }));

  drag(drop(ref));

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(device);
    setShowControlPanel(true);
  };

  const handleToggleLight = () => {
    if (device.type === 'light') {
      const updated = { ...device, isOn: !device.isOn } as LightDevice;
      onUpdateDevice(updated);
    }
  };

  const handleToggleAC = () => {
    if (device.type === 'ac') {
      const updated = { ...device, isOn: !device.isOn } as ACDevice;
      onUpdateDevice(updated);
    }
  };

  const handleACTemperatureChange = (temp: number) => {
    if (device.type === 'ac') {
      const updated = { ...device, temperature: Math.max(22, Math.min(30, temp)) } as ACDevice;
      onUpdateDevice(updated);
    }
  };

  const handleACModeChange = (mode: ACMode) => {
    if (device.type === 'ac') {
      const updated = { ...device, mode } as ACDevice;
      onUpdateDevice(updated);
    }
  };

  const handleCurtainChange = (percent: number) => {
    if (device.type === 'curtain') {
      const updated = { ...device, openPercent: Math.max(0, Math.min(100, percent)) } as CurtainDevice;
      onUpdateDevice(updated);
    }
  };

  const isActive = getDeviceStatus(device);

  const cardStyle: React.CSSProperties = {
    width: 200,
    height: 150,
    borderRadius: 10,
    backgroundColor: getDeviceBgColor(device.type),
    padding: 12,
    cursor: 'pointer',
    position: 'relative',
    transition: 'all 0.2s ease',
    boxShadow: isSelected
      ? '0 10px 15px -3px rgba(59,130,246,0.5)'
      : '0 4px 6px -1px rgba(0,0,0,0.3)',
    border: isSelected ? '2px solid #3b82f6' : '2px solid transparent',
    opacity: isDragging ? 0.5 : 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    userSelect: 'none',
  };

  const statusDotStyle: React.CSSProperties = {
    width: 12,
    height: 12,
    borderRadius: '50%',
    backgroundColor: isActive ? '#22c55e' : '#9ca3af',
    position: 'absolute',
    top: 8,
    left: 8,
    boxShadow: isActive ? '0 0 6px #22c55e' : 'none',
  };

  const modalOverlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    animation: 'fadeIn 0.3s ease',
  };

  const modalContentStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: 440,
    padding: 24,
    animation: 'fadeIn 1s ease',
  };

  const buttonStyle: React.CSSProperties = {
    padding: '8px 16px',
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    fontWeight: 600,
    transition: 'transform 0.15s ease',
  };

  return (
    <>
      <div ref={ref} style={cardStyle} onClick={handleClick}>
        <div style={statusDotStyle} />
        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 48 }}>
          {getDeviceIcon(device)}
        </div>
        <div style={{ textAlign: 'center', fontWeight: 600, color: '#1f2937', fontSize: 14 }}>
          {device.name}
        </div>
        <div style={{ textAlign: 'center', fontSize: 12, color: '#6b7280' }}>
          {device.type === 'sensor' && (
            <>
              {device.value}
              {getSensorValueLabel(device.sensorType)}
            </>
          )}
          {device.type === 'light' && (device.isOn ? '已开启' : '已关闭')}
          {device.type === 'ac' &&
            (device.isOn ? `${device.temperature}°C ${device.mode === 'cool' ? '制冷' : device.mode === 'heat' ? '制热' : '送风'}` : '已关闭')}
          {device.type === 'curtain' && `开合度: ${device.openPercent}%`}
        </div>
      </div>

      {showControlPanel && (
        <div style={modalOverlayStyle} onClick={() => setShowControlPanel(false)}>
          <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ margin: '0 0 16px 0', color: '#1f2937', fontSize: 20 }}>
              {getDeviceIcon(device)} {device.name}
            </h2>

            {device.type === 'light' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: '#374151', fontWeight: 500 }}>电源开关</span>
                  <button
                    style={{
                      ...buttonStyle,
                      backgroundColor: device.isOn ? '#22c55e' : '#9ca3af',
                      color: '#ffffff',
                    }}
                    onClick={handleToggleLight}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                  >
                    {device.isOn ? '关闭' : '开启'}
                  </button>
                </div>
              </div>
            )}

            {device.type === 'ac' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: '#374151', fontWeight: 500 }}>电源开关</span>
                  <button
                    style={{
                      ...buttonStyle,
                      backgroundColor: device.isOn ? '#22c55e' : '#9ca3af',
                      color: '#ffffff',
                    }}
                    onClick={handleToggleAC}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                  >
                    {device.isOn ? '关闭' : '开启'}
                  </button>
                </div>
                <div>
                  <div style={{ color: '#374151', fontWeight: 500, marginBottom: 8 }}>
                    温度: {device.temperature}°C
                  </div>
                  <input
                    type="range"
                    min={22}
                    max={30}
                    value={device.temperature}
                    onChange={(e) => handleACTemperatureChange(Number(e.target.value))}
                    style={{ width: '100%', accentColor: '#3b82f6' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6b7280' }}>
                    <span>22°C</span>
                    <span>30°C</span>
                  </div>
                </div>
                <div>
                  <div style={{ color: '#374151', fontWeight: 500, marginBottom: 8 }}>运行模式</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {(['cool', 'heat', 'fan'] as ACMode[]).map((mode) => (
                      <button
                        key={mode}
                        style={{
                          ...buttonStyle,
                          backgroundColor: device.mode === mode ? '#3b82f6' : '#e5e7eb',
                          color: device.mode === mode ? '#ffffff' : '#374151',
                          flex: 1,
                        }}
                        onClick={() => handleACModeChange(mode)}
                        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
                        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                      >
                        {mode === 'cool' ? '制冷' : mode === 'heat' ? '制热' : '送风'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {device.type === 'curtain' && (
              <div>
                <div style={{ color: '#374151', fontWeight: 500, marginBottom: 8 }}>
                  开合度: {device.openPercent}%
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={device.openPercent}
                  onChange={(e) => handleCurtainChange(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#10b981' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6b7280' }}>
                  <span>0% 关闭</span>
                  <span>100% 打开</span>
                </div>
              </div>
            )}

            {device.type === 'sensor' && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 64, marginBottom: 12 }}>{getDeviceIcon(device)}</div>
                <div style={{ fontSize: 32, fontWeight: 700, color: '#1f2937' }}>
                  {device.value}
                  {getSensorValueLabel(device.sensorType)}
                </div>
                <div style={{ fontSize: 14, color: '#6b7280', marginTop: 8 }}>
                  当前读数（仅显示，不可修改）
                </div>
              </div>
            )}

            <div style={{ marginTop: 24, textAlign: 'right' }}>
              <button
                style={{
                  ...buttonStyle,
                  backgroundColor: '#6b7280',
                  color: '#ffffff',
                }}
                onClick={() => setShowControlPanel(false)}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
