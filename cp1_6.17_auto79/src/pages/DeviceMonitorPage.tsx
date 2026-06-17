import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, Button, message } from 'antd';
import {
  ReloadOutlined,
  PoweroffOutlined,
  SoundOutlined,
  PlusOutlined,
  MinusOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import StatusBadge from '../components/StatusBadge';
import { getDevices, controlDevice, initDeviceWebSocket, disconnectWebSocket, Device } from '../services/api';

const styles = `
  @keyframes deviceFadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes statusTransition {
    0% { transform: scale(0.9); opacity: 0.5; }
    100% { transform: scale(1); opacity: 1; }
  }
  .device-card {
    animation: deviceFadeIn 0.4s ease-out both;
    transition: all 0.3s ease-in-out;
  }
  .device-card:hover {
    box-shadow: 0 4px 16px rgba(0,0,0,0.15);
  }
  .control-panel {
    overflow: hidden;
    max-height: 0;
    opacity: 0;
    transition: max-height 0.3s ease-in-out, opacity 0.3s ease-in-out, margin 0.3s ease-in-out;
    margin-top: 0;
  }
  .control-panel.open {
    max-height: 120px;
    opacity: 1;
    margin-top: 12px;
  }
  .led-indicator {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    display: inline-block;
    transition: all 0.3s ease-in-out;
  }
  .log-entry {
    animation: deviceFadeIn 0.3s ease-out;
  }
`;

const faultBarColors = ['#4caf50', '#ff9800', '#f44336', '#2196f3', '#9c27b0', '#ff5722', '#607d8b'];

const DeviceMonitorPage: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDevice, setExpandedDevice] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((text: string) => {
    setLogs((prev) => {
      const newLogs = [...prev, text];
      if (newLogs.length > 100) newLogs.shift();
      return newLogs;
    });
  }, []);

  const fetchDevices = useCallback(async () => {
    try {
      const res = await getDevices();
      setDevices(res.data);
    } catch {
      message.error('获取设备列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
    const socket = initDeviceWebSocket((updatedDevice: Device) => {
      setDevices((prev) =>
        prev.map((d) => (d.id === updatedDevice.id ? { ...d, ...updatedDevice } : d))
      );
    });
    return () => {
      disconnectWebSocket();
    };
  }, [fetchDevices]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleControl = async (deviceId: string, action: 'turn_on' | 'turn_off' | 'volume_up' | 'volume_down', deviceName: string, roomName: string) => {
    try {
      await controlDevice({ device_id: deviceId, action });
      const actionLabel: Record<string, string> = {
        turn_on: '已开启',
        turn_off: '已关闭',
        volume_up: '音量+1',
        volume_down: '音量-1',
      };
      const timestamp = dayjs().format('YYYY-MM-DD HH:mm:ss');
      addLog(`${timestamp} - ${roomName} - ${deviceName}${actionLabel[action]}`);
      message.success(`${deviceName} ${actionLabel[action]}`);
      fetchDevices();
    } catch {
      message.error('操作失败');
    }
  };

  const handleRefresh = async (deviceId: string) => {
    message.loading({ content: '刷新中...', key: deviceId, duration: 0.5 });
    await fetchDevices();
    message.success({ content: '已刷新', key: deviceId, duration: 1 });
  };

  const getDeviceTypeLabel = (type: string) => {
    const map: Record<string, string> = { projector: '投影仪', microphone: '麦克风', whiteboard: '白板' };
    return map[type] || type;
  };

  return (
    <>
      <style>{styles}</style>
      <div style={{ padding: 24 }}>
        <h2 style={{ color: '#ffffff', marginBottom: 24, fontSize: 22, fontWeight: 600 }}>
          设备状态监控
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(480px, 1fr))',
            gap: 20,
          }}
        >
          {devices.map((device, idx) => (
            <Card
              key={device.id}
              className="device-card"
              style={{
                backgroundColor: '#ffffff',
                borderRadius: 8,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                animationDelay: `${idx * 0.05}s`,
                position: 'relative',
                overflow: 'hidden',
              }}
              styles={{ body: { padding: 20 } }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: 4,
                  backgroundColor:
                    device.status === 'normal'
                      ? '#4caf50'
                      : device.status === 'warning'
                      ? '#ff9800'
                      : '#f44336',
                  transition: 'background-color 0.3s ease-in-out',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  right: 16,
                  top: 20,
                }}
              >
                <StatusBadge status={device.status} size={14} />
              </div>

              <div style={{ paddingRight: 80 }}>
                <div style={{ fontSize: 17, fontWeight: 600, color: '#1a1a2e', marginBottom: 4 }}>
                  {device.name}
                </div>
                <div style={{ color: '#888', fontSize: 13, marginBottom: 8 }}>
                  {device.room_name} · {getDeviceTypeLabel(device.type)}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 24, fontSize: 12, color: '#666', marginBottom: 8 }}>
                <span>型号: {device.model}</span>
                <span>维护: {device.last_maintenance}</span>
                {device.is_on !== undefined && (
                  <span>状态: {device.is_on ? '开启' : '关闭'}</span>
                )}
                {device.volume !== undefined && <span>音量: {device.volume}</span>}
              </div>

              {device.fault_records && device.fault_records.length > 0 && (
                <div style={{ marginTop: 8, marginBottom: 4 }}>
                  <div style={{ fontSize: 11, color: '#999', marginBottom: 4 }}>近7天故障记录</div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 40 }}>
                    {device.fault_records.map((record, ri) => (
                      <div key={ri} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                        <div
                          style={{
                            width: '100%',
                            backgroundColor: record.count > 0 ? faultBarColors[ri % faultBarColors.length] : '#e0e0e0',
                            height: Math.max(record.count * 8, 2),
                            borderRadius: 2,
                            transition: 'height 0.3s ease-in-out',
                          }}
                        />
                        <span style={{ fontSize: 9, color: '#aaa', marginTop: 2 }}>
                          {record.date.slice(5)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div
                className={`control-panel ${expandedDevice === device.id ? 'open' : ''}`}
              >
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {(device.type === 'projector' || device.type === 'microphone') && (
                    <>
                      <Button
                        size="small"
                        icon={<PoweroffOutlined />}
                        onClick={() => handleControl(device.id, 'turn_on', device.name, device.room_name)}
                        style={{ transition: 'all 0.2s' }}
                      >
                        开启
                      </Button>
                      <Button
                        size="small"
                        icon={<PoweroffOutlined />}
                        danger
                        onClick={() => handleControl(device.id, 'turn_off', device.name, device.room_name)}
                        style={{ transition: 'all 0.2s' }}
                      >
                        关闭
                      </Button>
                    </>
                  )}
                  {device.type === 'microphone' && (
                    <>
                      <Button
                        size="small"
                        icon={<PlusOutlined />}
                        onClick={() => handleControl(device.id, 'volume_up', device.name, device.room_name)}
                        style={{ transition: 'all 0.2s' }}
                      >
                        音量+
                      </Button>
                      <Button
                        size="small"
                        icon={<MinusOutlined />}
                        onClick={() => handleControl(device.id, 'volume_down', device.name, device.room_name)}
                        style={{ transition: 'all 0.2s' }}
                      >
                        音量-
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <Button
                  size="small"
                  icon={<SoundOutlined />}
                  onClick={() =>
                    setExpandedDevice(expandedDevice === device.id ? null : device.id)
                  }
                  style={{ transition: 'all 0.3s' }}
                >
                  控制
                </Button>
                <Button
                  size="small"
                  icon={<ReloadOutlined />}
                  onClick={() => handleRefresh(device.id)}
                  style={{ transition: 'all 0.3s' }}
                >
                  刷新
                </Button>
              </div>
            </Card>
          ))}
        </div>

        <div
          style={{
            marginTop: 24,
            backgroundColor: '#ffffff',
            borderRadius: 8,
            padding: 16,
            maxHeight: 200,
            overflow: 'auto',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontWeight: 600, color: '#1a1a2e' }}>操作日志</span>
            <Button size="small" onClick={() => setLogs([])}>
              清空
            </Button>
          </div>
          {logs.length === 0 ? (
            <div style={{ color: '#999', fontSize: 13 }}>暂无操作日志</div>
          ) : (
            logs.map((log, idx) => (
              <div
                key={idx}
                className="log-entry"
                style={{
                  fontSize: 12,
                  color: '#666',
                  padding: '3px 0',
                  borderBottom: '1px solid #f0f0f0',
                }}
              >
                {log}
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>
      </div>
    </>
  );
};

export default DeviceMonitorPage;
