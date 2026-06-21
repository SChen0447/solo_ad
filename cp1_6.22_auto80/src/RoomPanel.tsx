import React, { useState } from 'react';
import type { Device, Rule, DeviceType, SensorType } from './types';
import { DeviceCard } from './DeviceCard';
import { createDevice, getDeviceTypeLabel } from './dataStore';

interface RoomPanelProps {
  devices: Device[];
  rules: Rule[];
  selectedDeviceId: string | null;
  onDeviceSelect: (device: Device) => void;
  onDeviceMove: (fromIndex: number, toIndex: number) => void;
  onDeviceUpdate: (device: Device) => void;
  onAddDevice: (deviceData: Omit<Device, 'id' | 'positionIndex'>) => void;
}

export const RoomPanel: React.FC<RoomPanelProps> = ({
  devices,
  selectedDeviceId,
  onDeviceSelect,
  onDeviceMove,
  onDeviceUpdate,
  onAddDevice,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDeviceType, setNewDeviceType] = useState<DeviceType>('light');
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newSensorType, setNewSensorType] = useState<SensorType>('temperature');

  const handlePanelClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setShowAddModal(true);
    }
  };

  const handleAddDevice = () => {
    if (!newDeviceName.trim()) {
      alert('请输入设备名称');
      return;
    }
    const deviceData = createDevice(newDeviceType, newDeviceName.trim(), newSensorType);
    onAddDevice(deviceData);
    setShowAddModal(false);
    setNewDeviceName('');
    setNewDeviceType('light');
    setNewSensorType('temperature');
  };

  const panelStyle: React.CSSProperties = {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    minHeight: '100vh',
    boxSizing: 'border-box',
    cursor: 'pointer',
  };

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 200px)',
    gap: 16,
    justifyContent: 'center',
    marginTop: 16,
  };

  const titleStyle: React.CSSProperties = {
    color: '#f1f5f9',
    fontSize: 24,
    fontWeight: 700,
    margin: 0,
  };

  const subtitleStyle: React.CSSProperties = {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 4,
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
  };

  const modalContentStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: 440,
    padding: 24,
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    color: '#374151',
    fontWeight: 500,
    marginBottom: 8,
    fontSize: 14,
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid #d1d5db',
    fontSize: 14,
    boxSizing: 'border-box',
    outline: 'none',
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    cursor: 'pointer',
    backgroundColor: '#ffffff',
  };

  const buttonStyle: React.CSSProperties = {
    padding: '10px 20px',
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 14,
    transition: 'transform 0.15s ease',
  };

  const formGroupStyle: React.CSSProperties = {
    marginBottom: 16,
  };

  return (
    <div style={panelStyle} onClick={handlePanelClick}>
      <h1 style={titleStyle}>🏠 智能家居场景联动配置器</h1>
      <p style={subtitleStyle}>点击空白处添加新设备，点击设备卡片进行控制，拖拽设备调整排序</p>

      <div style={gridStyle}>
        {devices.map((device, index) => (
          <DeviceCard
            key={device.id}
            device={device}
            index={index}
            isSelected={device.id === selectedDeviceId}
            onSelect={onDeviceSelect}
            onMove={onDeviceMove}
            onUpdateDevice={onDeviceUpdate}
          />
        ))}
      </div>

      {showAddModal && (
        <div style={modalOverlayStyle} onClick={() => setShowAddModal(false)}>
          <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ margin: '0 0 20px 0', color: '#1f2937', fontSize: 20 }}>
              ➕ 添加新设备
            </h2>

            <div style={formGroupStyle}>
              <label style={labelStyle}>设备类型</label>
              <select
                style={selectStyle}
                value={newDeviceType}
                onChange={(e) => setNewDeviceType(e.target.value as DeviceType)}
              >
                <option value="light">{getDeviceTypeLabel('light')} 💡</option>
                <option value="ac">{getDeviceTypeLabel('ac')} ❄️</option>
                <option value="curtain">{getDeviceTypeLabel('curtain')} 🪟</option>
                <option value="sensor">{getDeviceTypeLabel('sensor')} 📊</option>
              </select>
            </div>

            {newDeviceType === 'sensor' && (
              <div style={formGroupStyle}>
                <label style={labelStyle}>传感器类型</label>
                <select
                  style={selectStyle}
                  value={newSensorType}
                  onChange={(e) => setNewSensorType(e.target.value as SensorType)}
                >
                  <option value="temperature">温度传感器 🌡️</option>
                  <option value="humidity">湿度传感器 💧</option>
                  <option value="smoke">烟雾传感器 🚨</option>
                  <option value="light">光线传感器 ☀️</option>
                </select>
              </div>
            )}

            <div style={formGroupStyle}>
              <label style={labelStyle}>设备名称</label>
              <input
                type="text"
                style={inputStyle}
                placeholder="请输入设备名称"
                value={newDeviceName}
                onChange={(e) => setNewDeviceName(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
              <button
                style={{
                  ...buttonStyle,
                  backgroundColor: '#e5e7eb',
                  color: '#374151',
                }}
                onClick={() => setShowAddModal(false)}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                取消
              </button>
              <button
                style={{
                  ...buttonStyle,
                  backgroundColor: '#3b82f6',
                  color: '#ffffff',
                }}
                onClick={handleAddDevice}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
