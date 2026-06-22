import { useState } from 'react';
import { Device } from '../types';
import { deviceApi } from '../services/api';

interface DeviceCardProps {
  device: Device;
  hasUpdate: boolean;
  onUpdate: () => void;
  onDelete: () => void;
  addNotification: (type: 'success' | 'error' | 'info', message: string) => void;
  isNew?: boolean;
}

const deviceTypeMap: Record<string, { label: string; icon: string }> = {
  light: { label: '灯', icon: '💡' },
  ac: { label: '空调', icon: '❄️' },
  curtain: { label: '窗帘', icon: '🪟' },
  temp_sensor: { label: '温度传感器', icon: '🌡️' },
  humidity_sensor: { label: '湿度传感器', icon: '💧' },
  motion_sensor: { label: '运动传感器', icon: '🚶' },
};

function DeviceCard({
  device,
  hasUpdate,
  onUpdate,
  onDelete,
  addNotification,
  isNew,
}: DeviceCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    name: device.name,
    type: device.type,
    status: device.status,
    value: device.value,
  });
  const [saving, setSaving] = useState(false);

  const typeInfo = deviceTypeMap[device.type] || { label: device.type, icon: '📦' };
  const isOn = device.status === 'on' || device.status === 'open';
  const isSensor = device.type.includes('sensor');

  const handleSave = async () => {
    if (editForm.name.length < 3 || editForm.name.length > 20) {
      addNotification('error', '设备名称必须在3-20个字符之间');
      return;
    }
    setSaving(true);
    try {
      await deviceApi.update(device.id, editForm);
      addNotification('success', `${device.name} 已更新`);
      setShowEdit(false);
      onUpdate();
    } catch (e: any) {
      addNotification('error', e.message || '更新失败');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async () => {
    let newStatus: string;
    let newValue: number;
    if (device.type === 'curtain') {
      newStatus = device.status === 'open' ? 'closed' : 'open';
      newValue = device.status === 'open' ? 0 : 100;
    } else if (isSensor) {
      return;
    } else {
      newStatus = device.status === 'on' ? 'off' : 'on';
      newValue = device.status === 'on' ? 0 : device.type === 'ac' ? 26 : 100;
    }
    try {
      await deviceApi.update(device.id, { status: newStatus as any, value: newValue });
      onUpdate();
    } catch (e: any) {
      addNotification('error', e.message || '操作失败');
    }
  };

  const handleDelete = async () => {
    try {
      await deviceApi.delete(device.id);
      addNotification('success', `${device.name} 已删除`);
      onDelete();
    } catch (e: any) {
      addNotification('error', e.message || '删除失败');
    }
  };

  const getStatusDisplay = () => {
    if (isSensor) {
      if (device.type === 'temp_sensor') return `${device.value}°C`;
      if (device.type === 'humidity_sensor') return `${device.value}%`;
      if (device.type === 'motion_sensor') return device.value === 1 ? '检测到移动' : '无移动';
    }
    if (device.type === 'curtain') return device.status === 'open' ? '已打开' : '已关闭';
    return isOn ? '已开启' : '已关闭';
  };

  return (
    <>
      <div
        className={isNew ? 'fade-in' : ''}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 260,
          height: 180,
          borderRadius: 16,
          background: '#1e293b',
          border: '1px solid #334155',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          cursor: 'pointer',
          transition: 'all 200ms',
          boxShadow: 'rgba(0,0,0,0.3) 0px 4px 12px',
          opacity: device.online ? 1 : 0.6,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#475569';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#334155';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
        onClick={() => setExpanded(!expanded)}
      >
        {hasUpdate && (
          <div
            className="pulse-dot"
            style={{
              position: 'absolute',
              top: 10,
              left: 10,
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: '#22c55e',
              boxShadow: '0 0 8px #22c55e',
            }}
          />
        )}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 12,
          }}
        >
          <span style={{ fontSize: 24 }}>{typeInfo.icon}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: '#e2e8f0',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {device.name}
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>{typeInfo.label}</div>
          </div>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: device.online ? '#22c55e' : '#6b7280',
              boxShadow: device.online ? '0 0 6px #22c55e' : 'none',
            }}
          />
        </div>

        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>当前状态</div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: isOn ? '#22c55e' : isSensor ? '#38bdf8' : '#6b7280',
              }}
            >
              {getStatusDisplay()}
            </div>
          </div>

          {!isSensor && (
            <button
              className="btn-pulse"
              onClick={(e) => {
                e.stopPropagation();
                handleToggle();
              }}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
                background: isOn
                  ? 'linear-gradient(135deg, #10b981, #059669)'
                  : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                color: '#ffffff',
                transition: 'filter 200ms',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(1.2)')}
              onMouseLeave={(e) => (e.currentTarget.style.filter = 'brightness(1)')}
            >
              {device.type === 'curtain'
                ? device.status === 'open'
                  ? '关闭'
                  : '打开'
                : isOn
                ? '关闭'
                : '开启'}
            </button>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
            marginTop: 8,
            paddingTop: 8,
            borderTop: '1px solid #334155',
          }}
        >
          <button
            className="btn-pulse"
            onClick={(e) => {
              e.stopPropagation();
              setEditForm({
                name: device.name,
                type: device.type,
                status: device.status,
                value: device.value,
              });
              setShowEdit(true);
            }}
            style={{
              padding: '4px 12px',
              borderRadius: 6,
              border: '1px solid #475569',
              background: 'transparent',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: 12,
              transition: 'all 200ms',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#e2e8f0';
              e.currentTarget.style.borderColor = '#64748b';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#94a3b8';
              e.currentTarget.style.borderColor = '#475569';
            }}
          >
            编辑
          </button>
          <button
            className="btn-pulse"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`确定要删除设备"${device.name}"吗？`)) {
                handleDelete();
              }
            }}
            style={{
              padding: '4px 12px',
              borderRadius: 6,
              border: '1px solid #7f1d1d',
              background: 'transparent',
              color: '#f87171',
              cursor: 'pointer',
              fontSize: 12,
              transition: 'all 200ms',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            删除
          </button>
        </div>

        {expanded && (
          <div
            className="fade-in"
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: 8,
              padding: 16,
              background: '#0f172a',
              borderRadius: 12,
              border: '1px solid #334155',
              zIndex: 10,
              boxShadow: 'rgba(0,0,0,0.5) 0px 8px 24px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 8 }}>设备详情</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
              <div>
                <span style={{ color: '#64748b' }}>ID: </span>
                <span style={{ color: '#e2e8f0' }}>{device.id.slice(0, 8)}...</span>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>在线: </span>
                <span style={{ color: device.online ? '#22c55e' : '#6b7280' }}>
                  {device.online ? '是' : '否'}
                </span>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>数值: </span>
                <span style={{ color: '#38bdf8' }}>{device.value}</span>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>状态: </span>
                <span style={{ color: '#e2e8f0' }}>{device.status}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {showEdit && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
          onClick={() => setShowEdit(false)}
        >
          <div
            className="fade-in-up"
            style={{
              background: '#0f172a',
              borderRadius: 12,
              padding: 24,
              width: '100%',
              maxWidth: 400,
              boxShadow: 'rgba(0,0,0,0.5) 0px 8px 32px',
              border: '1px solid #334155',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: '#e2e8f0',
                marginBottom: 20,
              }}
            >
              编辑设备
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 13,
                    color: '#94a3b8',
                    marginBottom: 6,
                  }}
                >
                  设备名称 <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="3-20个字符"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 6,
                    border: '1px solid #334155',
                    background: '#334155',
                    color: '#e2e8f0',
                    fontSize: 14,
                    outline: 'none',
                    transition: 'border-color 200ms',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#3b82f6')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#334155')}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 13,
                    color: '#94a3b8',
                    marginBottom: 6,
                  }}
                >
                  设备类型
                </label>
                <select
                  value={editForm.type}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, type: e.target.value as any }))
                  }
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 6,
                    border: '1px solid #334155',
                    background: '#334155',
                    color: '#e2e8f0',
                    fontSize: 14,
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="light">灯</option>
                  <option value="ac">空调</option>
                  <option value="curtain">窗帘</option>
                  <option value="temp_sensor">温度传感器</option>
                  <option value="humidity_sensor">湿度传感器</option>
                  <option value="motion_sensor">运动传感器</option>
                </select>
              </div>

              {(editForm.type === 'light' ||
                editForm.type === 'ac' ||
                editForm.type === 'curtain') && (
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 13,
                      color: '#94a3b8',
                      marginBottom: 6,
                    }}
                  >
                    状态
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, status: e.target.value as any }))
                    }
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 6,
                      border: '1px solid #334155',
                      background: '#334155',
                      color: '#e2e8f0',
                      fontSize: 14,
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {editForm.type === 'curtain' ? (
                      <>
                        <option value="open">打开</option>
                        <option value="closed">关闭</option>
                      </>
                    ) : (
                      <>
                        <option value="on">开启</option>
                        <option value="off">关闭</option>
                      </>
                    )}
                  </select>
                </div>
              )}

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 13,
                    color: '#94a3b8',
                    marginBottom: 6,
                  }}
                >
                  数值
                </label>
                <input
                  type="number"
                  value={editForm.value}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, value: Number(e.target.value) }))
                  }
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 6,
                    border: '1px solid #334155',
                    background: '#334155',
                    color: '#e2e8f0',
                    fontSize: 14,
                    outline: 'none',
                    transition: 'border-color 200ms',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#3b82f6')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#334155')}
                />
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                gap: 12,
                marginTop: 24,
                justifyContent: 'flex-end',
              }}
            >
              <button
                className="btn-pulse"
                onClick={() => setShowEdit(false)}
                style={{
                  padding: '10px 20px',
                  borderRadius: 8,
                  border: '1px solid #475569',
                  background: 'transparent',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 500,
                  transition: 'all 200ms',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#e2e8f0';
                  e.currentTarget.style.borderColor = '#64748b';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#94a3b8';
                  e.currentTarget.style.borderColor = '#475569';
                }}
              >
                取消
              </button>
              <button
                className="btn-pulse"
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: '10px 20px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#ffffff',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                  opacity: saving ? 0.6 : 1,
                  transition: 'filter 200ms',
                }}
                onMouseEnter={(e) => {
                  if (!saving) e.currentTarget.style.filter = 'brightness(1.2)';
                }}
                onMouseLeave={(e) => (e.currentTarget.style.filter = 'brightness(1)')}
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default DeviceCard;
