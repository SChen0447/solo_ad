import { useState, useEffect } from 'react';
import { Device, Scene } from '../types';
import { deviceApi, sceneApi } from '../services/api';
import DeviceCard from '../components/DeviceCard';

interface DeviceManagerProps {
  devices: Device[];
  updatedDeviceIds: Set<string>;
  addNotification: (type: 'success' | 'error' | 'info', message: string) => void;
}

function DeviceManager({ devices, updatedDeviceIds, addNotification }: DeviceManagerProps) {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newDeviceIds, setNewDeviceIds] = useState<Set<string>>(new Set());
  const [addForm, setAddForm] = useState({
    name: '',
    type: 'light' as Device['type'],
    status: 'off' as Device['status'],
    value: 0,
  });
  const [adding, setAdding] = useState(false);

  const loadScenes = async () => {
    try {
      const scns = await sceneApi.getAll();
      setScenes(scns);
    } catch (e: any) {
      addNotification('error', e.message || '加载场景失败');
    }
  };

  useEffect(() => {
    loadScenes();
  }, []);

  const handleAddDevice = async () => {
    if (addForm.name.length < 3 || addForm.name.length > 20) {
      addNotification('error', '设备名称必须在3-20个字符之间');
      return;
    }
    setAdding(true);
    try {
      const newDevice = await deviceApi.create(addForm);
      setDevices((prev) => [newDevice, ...prev]);
      setNewDeviceIds((prev) => new Set(prev).add(newDevice.id));
      setTimeout(() => {
        setNewDeviceIds((prev) => {
          const next = new Set(prev);
          next.delete(newDevice.id);
          return next;
        });
      }, 3000);
      addNotification('success', `设备"${newDevice.name}"已添加`);
      setShowAdd(false);
      setAddForm({ name: '', type: 'light', status: 'off', value: 0 });
    } catch (e: any) {
      addNotification('error', e.message || '添加失败');
    } finally {
      setAdding(false);
    }
  };

  const handleExecuteScene = async (sceneId: string, sceneName: string) => {
    try {
      const result = await sceneApi.execute(sceneId);
      if (result.changes.length > 0) {
        result.changes.forEach((c) => {
          addNotification('success', c.message);
        });
      }
      addNotification('success', `场景"${sceneName}"执行成功`);
      loadData();
    } catch (e: any) {
      addNotification('error', e.message || '执行失败');
    }
  };

  const handleDeleteScene = async (sceneId: string, sceneName: string) => {
    if (!confirm(`确定要删除场景"${sceneName}"吗？`)) return;
    try {
      await sceneApi.delete(sceneId);
      setScenes((prev) => prev.filter((s) => s.id !== sceneId));
      addNotification('success', `场景"${sceneName}"已删除`);
    } catch (e: any) {
      addNotification('error', e.message || '删除失败');
    }
  };

  const getTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      light: '灯',
      ac: '空调',
      curtain: '窗帘',
      temp_sensor: '温度传感器',
      humidity_sensor: '湿度传感器',
      motion_sensor: '运动传感器',
    };
    return map[type] || type;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20,
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 600, color: '#e2e8f0', marginBottom: 4 }}>
              设备管理
            </h2>
            <p style={{ fontSize: 13, color: '#94a3b8' }}>
              共 {devices.length} 台设备，在线 {devices.filter((d) => d.online).length} 台
            </p>
          </div>
          <button
            className="btn-pulse"
            onClick={() => setShowAdd(true)}
            style={{
              padding: '10px 24px',
              borderRadius: 8,
              border: 'none',
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              color: '#ffffff',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
              transition: 'filter 200ms',
              boxShadow: 'rgba(0,0,0,0.3) 0px 4px 12px',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(1.2)')}
            onMouseLeave={(e) => (e.currentTarget.style.filter = 'brightness(1)')}
          >
            + 添加设备
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>
            加载中...
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 20,
            }}
          >
            {devices.map((device) => (
              <DeviceCard
                key={device.id}
                device={device}
                hasUpdate={updatedDeviceIds.has(device.id)}
                isNew={newDeviceIds.has(device.id)}
                onUpdate={loadData}
                onDelete={loadData}
                addNotification={addNotification}
              />
            ))}
          </div>
        )}
      </div>

      <div
        style={{
          background: '#1e293b',
          borderRadius: 12,
          padding: 20,
          boxShadow: 'rgba(0,0,0,0.3) 0px 4px 12px',
        }}
      >
        <h3
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: '#e2e8f0',
            marginBottom: 16,
          }}
        >
          自动化场景
        </h3>

        {scenes.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '32px',
              color: '#64748b',
              fontSize: 14,
            }}
          >
            暂无场景，前往"场景编辑"创建自动化规则
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {scenes.map((scene) => (
              <div
                key={scene.id}
                style={{
                  height: 60,
                  padding: '0 16px',
                  background: '#334155',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'background 300ms',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#475569')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#334155')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 20 }}>⚡</span>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 500, color: '#e2e8f0' }}>
                      {scene.name}
                    </div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>
                      {scene.nodes.filter((n) => n.type === 'condition').length} 个条件 →{' '}
                      {scene.nodes.filter((n) => n.type === 'action').length} 个动作
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn-pulse"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExecuteScene(scene.id, scene.name);
                    }}
                    style={{
                      padding: '6px 16px',
                      borderRadius: 6,
                      border: 'none',
                      background: '#8b5cf6',
                      color: '#ffffff',
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 500,
                      transition: 'filter 200ms',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(1.2)')}
                    onMouseLeave={(e) => (e.currentTarget.style.filter = 'brightness(1)')}
                  >
                    执行
                  </button>
                  <button
                    className="btn-pulse"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteScene(scene.id, scene.name);
                    }}
                    style={{
                      padding: '6px 16px',
                      borderRadius: 6,
                      border: 'none',
                      background: '#ef4444',
                      color: '#ffffff',
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 500,
                      transition: 'filter 200ms',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(1.2)')}
                    onMouseLeave={(e) => (e.currentTarget.style.filter = 'brightness(1)')}
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAdd && (
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
          onClick={() => setShowAdd(false)}
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
              添加设备
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
                  value={addForm.name}
                  onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="请输入设备名称（3-20字符）"
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
                  value={addForm.type}
                  onChange={(e) =>
                    setAddForm((f) => ({
                      ...f,
                      type: e.target.value as Device['type'],
                      status:
                        e.target.value === 'curtain'
                          ? 'closed'
                          : e.target.value.includes('sensor')
                          ? 'on'
                          : 'off',
                    }))
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

              {(addForm.type === 'light' ||
                addForm.type === 'ac' ||
                addForm.type === 'curtain') && (
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 13,
                      color: '#94a3b8',
                      marginBottom: 6,
                    }}
                  >
                    初始状态
                  </label>
                  <select
                    value={addForm.status}
                    onChange={(e) =>
                      setAddForm((f) => ({ ...f, status: e.target.value as Device['status'] }))
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
                    {addForm.type === 'curtain' ? (
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
                  初始数值
                </label>
                <input
                  type="number"
                  value={addForm.value}
                  onChange={(e) =>
                    setAddForm((f) => ({ ...f, value: Number(e.target.value) }))
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
                onClick={() => setShowAdd(false)}
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
                onClick={handleAddDevice}
                disabled={adding}
                style={{
                  padding: '10px 20px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                  color: '#ffffff',
                  cursor: adding ? 'not-allowed' : 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                  opacity: adding ? 0.6 : 1,
                  transition: 'filter 200ms',
                }}
                onMouseEnter={(e) => {
                  if (!adding) e.currentTarget.style.filter = 'brightness(1.2)';
                }}
                onMouseLeave={(e) => (e.currentTarget.style.filter = 'brightness(1)')}
              >
                {adding ? '添加中...' : '添加'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          div[style*="grid-template-columns: repeat(3"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

export default DeviceManager;
