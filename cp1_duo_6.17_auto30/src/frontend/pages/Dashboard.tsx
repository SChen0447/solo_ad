import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import dayjs from 'dayjs';

interface SkuItem {
  sku_id: string;
  sku_name: string;
  quantity: number;
  in_transit: number;
  safety_threshold: number;
  base_threshold: number;
  recent_records: Array<{
    warehouse_id: string;
    sku_id: string;
    direction: string;
    amount: number;
    timestamp: string;
  }>;
}

interface Warehouse {
  id: string;
  name: string;
  capacity: number;
  total_quantity: number;
  capacity_ratio: number;
  pending_orders: number;
  below_threshold: boolean;
  threshold_multiplier: number;
  threshold_note: string;
  skus: SkuItem[];
}

interface ChangeRecord {
  warehouse_id: string;
  sku_id: string;
  direction: string;
  amount: number;
  timestamp: string;
}

interface InventoryData {
  warehouses: Warehouse[];
  recent_changes: ChangeRecord[];
  timestamp: string;
}

interface AlertItem {
  sku_id: string;
  sku_name: string;
  current_stock: number;
  predicted_demand: number;
  daily_avg: number;
}

interface SnapshotInfo {
  id: number;
  created_at: string;
}

interface DiffItem {
  warehouse_id: string;
  warehouse_name: string;
  sku_id: string;
  sku_name: string;
  old_qty: number;
  new_qty: number;
  change: number;
}

const SkeletonBlock: React.FC<{ width?: string; height?: number }> = ({ width, height = 16 }) => (
  <div style={{
    width: width || `${60 + Math.random() * 40}%`,
    height,
    background: 'linear-gradient(90deg, #e8e8e8 25%, #f5f5f5 50%, #e8e8e8 75%)',
    backgroundSize: '200% 100%',
    borderRadius: 4,
    animation: 'shimmer 1.5s infinite',
  }} />
);

const RingChart: React.FC<{ ratio: number; size?: number }> = ({ ratio, size = 100 }) => {
  const data = [
    { name: 'used', value: ratio },
    { name: 'free', value: 1 - ratio },
  ];
  const getColor = (v: number) => {
    if (v > 0.8) return '#e74c3c';
    if (v > 0.6) return '#f07b3f';
    return '#0f4c81';
  };
  return (
    <div style={{ width: size, height: size, position: 'relative' }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={size * 0.3}
            outerRadius={size * 0.45}
            startAngle={90}
            endAngle={-270}
            dataKey="value"
            stroke="none"
          >
            <Cell fill={getColor(ratio)} />
            <Cell fill="#e8ecf1" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#0f4c81' }}>
          {Math.round(ratio * 100)}%
        </div>
      </div>
    </div>
  );
};

const Dashboard: React.FC = () => {
  const [data, setData] = useState<InventoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [alertBanner, setAlertBanner] = useState<string | null>(null);
  const [snapshots, setSnapshots] = useState<SnapshotInfo[]>([]);
  const [compareA, setCompareA] = useState<number | null>(null);
  const [compareB, setCompareB] = useState<number | null>(null);
  const [diffs, setDiffs] = useState<DiffItem[]>([]);
  const [diffSearch, setDiffSearch] = useState('');
  const [showDiffs, setShowDiffs] = useState(false);
  const [blinkFinished, setBlinkFinished] = useState<Record<string, boolean>>({});
  const [hoveredWarehouse, setHoveredWarehouse] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    data.warehouses.forEach((wh) => {
      if (wh.below_threshold && !blinkFinished[wh.id]) {
        const timer = setTimeout(() => {
          setBlinkFinished((prev) => ({ ...prev, [wh.id]: true }));
        }, 4500);
        timers.push(timer);
      }
    });
    return () => timers.forEach((t) => clearTimeout(t));
  }, [data]);

  const fetchData = useCallback(async () => {
    try {
      const res = await axios.get('/api/inventory/');
      setData(res.data);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, []);

  const fetchAlerts = useCallback(async () => {
    try {
      const [alertRes, forecastRes] = await Promise.all([
        axios.get('/api/inventory/alert'),
        axios.get('/api/forecast/all'),
      ]);
      const lowStockAlerts = alertRes.data.alerts || [];
      const forecastAlerts = forecastRes.data.alerts || [];
      setAlerts(forecastAlerts);
      if (forecastAlerts.length > 0) {
        const msg = forecastAlerts
          .map((a: AlertItem) => `${a.sku_name}库存不足（当前${a.current_stock}，7天需求${a.predicted_demand}）`)
          .join('；');
        setAlertBanner(msg);
        setTimeout(() => setAlertBanner(null), 5000);
      }
    } catch { /* ignore */ }
  }, []);

  const fetchSnapshots = useCallback(async () => {
    try {
      const res = await axios.get('/api/inventory/snapshots');
      setSnapshots(res.data.snapshots || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchData();
    fetchAlerts();
    fetchSnapshots();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [fetchData, fetchAlerts, fetchSnapshots]);

  const handleCreateSnapshot = async () => {
    await axios.post('/api/inventory/snapshot');
    fetchSnapshots();
  };

  const handleCompare = async () => {
    if (compareA !== null && compareB !== null) {
      const res = await axios.post('/api/inventory/snapshot/compare', {
        snapshot_a: compareA,
        snapshot_b: compareB,
      });
      setDiffs(res.data.differences || []);
      setShowDiffs(true);
    }
  };

  if (loading || !data) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        {[1, 2, 3].map((i) => (
          <div key={i} style={{
            background: '#fff',
            borderRadius: 12,
            padding: 24,
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          }}>
            <SkeletonBlock width="40%" height={20} />
            <div style={{ height: 16 }} />
            <SkeletonBlock height={80} />
            <div style={{ height: 16 }} />
            <SkeletonBlock height={16} />
            <SkeletonBlock height={16} />
            <SkeletonBlock height={16} />
          </div>
        ))}
      </div>
    );
  }

  const filteredDiffs = diffs.filter(
    (d) => d.sku_name.toLowerCase().includes(diffSearch.toLowerCase())
  );

  return (
    <div>
      {alertBanner && (
        <div style={{
          position: 'fixed',
          top: 60,
          right: 0,
          zIndex: 2000,
          background: '#e74c3c',
          color: '#fff',
          padding: '12px 24px',
          borderRadius: '8px 0 0 8px',
          maxWidth: 600,
          fontSize: 13,
          animation: 'slideInRight 0.4s ease-out',
          boxShadow: '-4px 4px 16px rgba(0,0,0,0.2)',
        }}>
          ⚠️ {alertBanner}
        </div>
      )}

      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ color: '#0f4c81', margin: 0 }}>仓库仪表盘</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={handleCreateSnapshot} style={{
            background: '#0f4c81',
            color: '#fff',
            border: 'none',
            padding: '8px 16px',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 13,
            transition: 'transform 0.2s',
          }}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
            onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            📸 创建快照
          </button>
          {snapshots.length >= 2 && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <select
                value={compareA ?? ''}
                onChange={(e) => setCompareA(Number(e.target.value) || null)}
                style={{ padding: '6px 10px', borderRadius: 4, border: '1px solid #d0d5dd', fontSize: 12 }}
              >
                <option value="">快照A</option>
                {snapshots.map((s) => (
                  <option key={s.id} value={s.id}>
                    #{s.id} {dayjs(s.created_at).format('MM-DD HH:mm')}
                  </option>
                ))}
              </select>
              <span style={{ color: '#999' }}>vs</span>
              <select
                value={compareB ?? ''}
                onChange={(e) => setCompareB(Number(e.target.value) || null)}
                style={{ padding: '6px 10px', borderRadius: 4, border: '1px solid #d0d5dd', fontSize: 12 }}
              >
                <option value="">快照B</option>
                {snapshots.map((s) => (
                  <option key={s.id} value={s.id}>
                    #{s.id} {dayjs(s.created_at).format('MM-DD HH:mm')}
                  </option>
                ))}
              </select>
              <button
                onClick={handleCompare}
                disabled={compareA === null || compareB === null}
                style={{
                  background: compareA && compareB ? '#f07b3f' : '#ccc',
                  color: '#fff',
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: 4,
                  cursor: compareA && compareB ? 'pointer' : 'not-allowed',
                  fontSize: 12,
                  transition: 'transform 0.2s',
                }}
              >
                对比
              </button>
            </div>
          )}
        </div>
      </div>

      {showDiffs && (
        <div style={{
          background: '#fff',
          borderRadius: 12,
          padding: 20,
          marginBottom: 20,
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ color: '#0f4c81', margin: 0 }}>快照对比差异</h3>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="text"
                placeholder="搜索SKU..."
                value={diffSearch}
                onChange={(e) => setDiffSearch(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 4,
                  border: '1px solid #d0d5dd',
                  fontSize: 12,
                  width: 160,
                }}
              />
              <button onClick={() => setShowDiffs(false)} style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 18,
                color: '#999',
              }}>✕</button>
            </div>
          </div>
          {filteredDiffs.length === 0 ? (
            <div style={{ color: '#999', textAlign: 'center', padding: 20 }}>无差异或无匹配结果</div>
          ) : (
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f5f6fa' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>仓库</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>SKU</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>旧库存</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>新库存</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>变动</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDiffs.map((d, i) => (
                    <tr key={i} style={{
                      background: d.change > 0 ? 'rgba(46,204,113,0.08)' : 'rgba(231,76,60,0.08)',
                    }}>
                      <td style={{ padding: '8px 12px' }}>{d.warehouse_name}</td>
                      <td style={{
                        padding: '8px 12px',
                        color: d.change > 0 ? '#27ae60' : '#e74c3c',
                        fontWeight: 600,
                      }}>{d.sku_name}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right' }}>{d.old_qty}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right' }}>{d.new_qty}</td>
                      <td style={{
                        padding: '8px 12px',
                        textAlign: 'right',
                        color: d.change > 0 ? '#27ae60' : '#e74c3c',
                        fontWeight: 700,
                      }}>
                        {d.change > 0 ? '+' : ''}{d.change}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 20,
      }}>
        {data.warehouses.map((wh) => {
          const isAlert = wh.below_threshold;
          const isBlinkPhase = isAlert && !blinkFinished[wh.id];
          const isHovered = hoveredWarehouse === wh.id;
          const animationName = isBlinkPhase ? 'blink-pulse-combined' : isAlert ? 'pulse-scale' : 'none';
          const animationDuration = isBlinkPhase ? '1.5s' : '1.5s';
          const animationIteration = isBlinkPhase ? '3' : 'infinite';
          const animationPaused = isHovered ? 'paused' : 'running';

          return (
            <div
              key={wh.id}
              onClick={() => {
                setSelectedWarehouse(wh);
                setDrawerVisible(true);
              }}
              style={{
                background: '#fff',
                borderRadius: 12,
                padding: 24,
                boxShadow: isAlert ? '0 2px 16px rgba(231,76,60,0.2)' : '0 2px 12px rgba(0,0,0,0.06)',
                border: isAlert ? '2px solid #e74c3c' : '2px solid transparent',
                animation: `${animationName} ${animationDuration} ease-in-out ${animationIteration}`,
                animationPlayState: animationPaused,
                cursor: 'pointer',
                transition: 'transform 0.3s, box-shadow 0.3s',
                transformOrigin: 'center center',
              }}
              onMouseEnter={(e) => {
                setHoveredWarehouse(wh.id);
                if (!isAlert) {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
                }
              }}
              onMouseLeave={(e) => {
                setHoveredWarehouse(null);
                if (!isAlert) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)';
                }
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3 style={{ color: '#0f4c81', margin: '0 0 4px 0' }}>{wh.name}</h3>
                  <span style={{ fontSize: 12, color: '#888' }}>
                    容量 {wh.total_quantity}/{wh.capacity}
                  </span>
                </div>
                <RingChart ratio={wh.capacity_ratio} size={80} />
              </div>

              <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                <div style={{
                  background: '#f07b3f',
                  color: '#fff',
                  borderRadius: 20,
                  padding: '4px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                }}>
                  待处理 {wh.pending_orders}
                </div>
                {isAlert && (
                  <div style={{
                    background: '#e74c3c',
                    color: '#fff',
                    borderRadius: 20,
                    padding: '4px 12px',
                    fontSize: 12,
                    fontWeight: 600,
                  }}>
                    ⚠️ 库存预警
                  </div>
                )}
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 12, color: '#0f4c81', fontWeight: 500 }}>
                  查看详情 →
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {drawerVisible && selectedWarehouse && (
        <>
          <div
            onClick={() => setDrawerVisible(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.4)',
              zIndex: 1500,
              animation: 'fadeIn 0.2s ease-out',
            }}
          />
          <div style={{
            position: 'fixed',
            top: 0,
            right: 0,
            width: 'min(480px, 90vw)',
            height: '100vh',
            background: '#fff',
            boxShadow: '-4px 0 20px rgba(0,0,0,0.15)',
            zIndex: 1600,
            animation: 'slideInDrawer 0.3s ease-out',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #eee',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#fff',
            }}>
              <div>
                <h3 style={{ color: '#0f4c81', margin: 0, fontSize: 18 }}>
                  {selectedWarehouse.name}
                </h3>
                <span style={{ fontSize: 12, color: '#888' }}>
                  库存总量 {selectedWarehouse.total_quantity} / 容量 {selectedWarehouse.capacity}
                </span>
              </div>
              <button
                onClick={() => setDrawerVisible(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 22,
                  color: '#999',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'center',
              padding: '20px 0',
              background: '#f9fafb',
              borderBottom: '1px solid #eee',
            }}>
              <RingChart ratio={selectedWarehouse.capacity_ratio} size={140} />
            </div>

            <div style={{
              padding: '12px 24px',
              background: selectedWarehouse.below_threshold ? '#fdecea' : '#f0f7ff',
              borderBottom: '1px solid #eee',
              fontSize: 12,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#666' }}>安全阈值系数：</span>
                <strong style={{ color: selectedWarehouse.below_threshold ? '#e74c3c' : '#0f4c81' }}>
                  {selectedWarehouse.threshold_multiplier}x
                </strong>
              </div>
              {selectedWarehouse.threshold_note && (
                <div style={{ color: '#888', marginTop: 4, fontSize: 11 }}>
                  {selectedWarehouse.threshold_note}
                </div>
              )}
            </div>

            <div style={{ padding: '16px 24px', flex: 1, overflowY: 'auto' }}>
              <h4 style={{ color: '#0f4c81', margin: '0 0 12px 0', fontSize: 14 }}>
                SKU详情（{selectedWarehouse.skus.length}个）
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {selectedWarehouse.skus.map((sku) => (
                  <div key={sku.sku_id} style={{
                    padding: 12,
                    borderRadius: 8,
                    background: '#f9fafb',
                    fontSize: 13,
                    border: sku.quantity < sku.safety_threshold ? '1px solid #fdecea' : '1px solid transparent',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontWeight: 600, color: sku.quantity < sku.safety_threshold ? '#e74c3c' : '#333' }}>
                        {sku.sku_name}
                      </span>
                      <span style={{
                        fontSize: 11,
                        padding: '2px 8px',
                        borderRadius: 10,
                        background: sku.quantity < sku.safety_threshold ? '#fdecea' : '#e8f5e9',
                        color: sku.quantity < sku.safety_threshold ? '#e74c3c' : '#27ae60',
                        fontWeight: 600,
                      }}>
                        {sku.quantity < sku.safety_threshold ? '⚠ 低于阈值' : '正常'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
                      <span style={{ color: '#666' }}>
                        当前库存: <strong style={{ color: '#333' }}>{sku.quantity}</strong>
                      </span>
                      <span style={{ color: '#666' }}>
                        安全阈值: <strong style={{ color: '#333' }}>{sku.safety_threshold}</strong>
                      </span>
                    </div>
                    <div style={{ color: '#888', fontSize: 12, marginBottom: 8 }}>
                      在途数量: {sku.in_transit}
                    </div>
                    <div style={{ fontSize: 11, color: '#999', marginBottom: 4 }}>最近5次出入库：</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {sku.recent_records.slice(0, 5).map((rec, ri) => (
                        <span key={ri} style={{
                          display: 'inline-block',
                          fontSize: 11,
                          padding: '3px 8px',
                          borderRadius: 4,
                          background: rec.direction === 'in' ? '#e8f5e9' : '#fdecea',
                          color: rec.direction === 'in' ? '#27ae60' : '#e74c3c',
                        }}>
                          {rec.direction === 'in' ? '入库 +' : '出库 -'}{rec.amount}
                          <span style={{ color: '#aaa', marginLeft: 4 }}>
                            {dayjs(rec.timestamp).format('MM-DD HH:mm')}
                          </span>
                        </span>
                      ))}
                      {sku.recent_records.length === 0 && (
                        <span style={{ color: '#bbb', fontSize: 11 }}>暂无记录</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      <div style={{
        background: '#fff',
        borderRadius: 12,
        padding: 20,
        marginTop: 20,
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      }}>
        <h3 style={{ color: '#0f4c81', marginBottom: 12 }}>最近24小时库存变动</h3>
        <div style={{ maxHeight: 220, overflowY: 'auto' }}>
          {data.recent_changes.map((change, i) => (
            <div key={i} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 12px',
              borderBottom: '1px solid #f5f5f5',
              fontSize: 13,
            }}>
              <div>
                <span style={{
                  display: 'inline-block',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: change.direction === 'in' ? '#27ae60' : '#e74c3c',
                  marginRight: 8,
                }} />
                <span style={{ fontWeight: 600 }}>
                  {change.direction === 'in' ? '入库' : '出库'}
                </span>
                <span style={{ color: '#888', marginLeft: 8 }}>
                  {change.sku_id}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <span style={{
                  fontWeight: 700,
                  color: change.direction === 'in' ? '#27ae60' : '#e74c3c',
                }}>
                  {change.direction === 'in' ? '+' : '-'}{change.amount}
                </span>
                <span style={{ color: '#aaa', fontSize: 12 }}>
                  {dayjs(change.timestamp).format('HH:mm:ss')}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
