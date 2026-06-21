import { useEffect, useState, useMemo } from 'react';
import { api } from './api';
import { useApp } from './App';
import {
  Ingredient,
  Supplier,
  HistoryEntry,
  HistoryEntryType,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  IngredientCategory,
} from '../shared/types';

type FilterRange = 'week' | 'month' | 'year' | 'all';

export default function IngredientDetail({
  ingredientId,
  onClose,
}: {
  ingredientId: string;
  onClose: () => void;
}) {
  const { triggerRefresh } = useApp();
  const [ingredient, setIngredient] = useState<Ingredient | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'history'>('info');
  const [historyFilter, setHistoryFilter] = useState<FilterRange>('all');

  const [showInbound, setShowInbound] = useState(false);
  const [showOutbound, setShowOutbound] = useState(false);
  const [showWaste, setShowWaste] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  useEffect(() => {
    loadData();
  }, [ingredientId]);

  async function loadData() {
    setLoading(true);
    try {
      const [ing, sups, hist] = await Promise.all([
        api.getInventoryById(ingredientId),
        api.getSuppliersByIngredient(ingredientId),
        api.getHistory(ingredientId),
      ]);
      setIngredient(ing);
      setSuppliers(sups);
      setHistory(hist);
    } finally {
      setLoading(false);
    }
  }

  const priceChart = useMemo(() => {
    const sorted = [...suppliers]
      .map((s) => ({
        supplier: s,
        latestPrice: s.priceHistory[0]?.price || 0,
        shortName: s.name.length > 4 ? s.name.slice(0, 4) : s.name,
      }))
      .sort((a, b) => a.latestPrice - b.latestPrice);
    const max = Math.max(...sorted.map((s) => s.latestPrice), 1);
    return sorted.map((s, idx) => ({
      ...s,
      heightPercent: (s.latestPrice / max) * 100,
      isCheapest: idx === 0,
      rank: idx,
    }));
  }, [suppliers]);

  const filteredHistory = useMemo(() => {
    const now = Date.now();
    const day = 86400000;
    const limits: Record<FilterRange, number> = {
      week: 7 * day,
      month: 30 * day,
      year: 365 * day,
      all: Infinity,
    };
    const limit = limits[historyFilter];
    return history.filter((h) => now - new Date(h.timestamp).getTime() <= limit);
  }, [history, historyFilter]);

  const preferredSupplier = suppliers.find((s) => s.isPreferred);

  async function handleStockIn(quantity: number, expiryDate: string, supplierId?: string) {
    const updated = await api.stockIn(ingredientId, { quantity, expiryDate, supplierId });
    setIngredient(updated);
    setShowInbound(false);
    triggerRefresh();
    loadData();
  }

  async function handleStockOut(quantity: number) {
    const updated = await api.stockOut(ingredientId, { quantity });
    setIngredient(updated);
    setShowOutbound(false);
    triggerRefresh();
    loadData();
  }

  async function handleWaste(quantity: number) {
    const updated = await api.waste(ingredientId, { quantity });
    setIngredient(updated);
    setShowWaste(false);
    triggerRefresh();
    loadData();
  }

  async function handleEdit(data: Partial<Ingredient>) {
    const updated = await api.updateInventory(ingredientId, data);
    setIngredient(updated);
    setShowEdit(false);
    triggerRefresh();
  }

  async function setPreferredSupplier(id: string) {
    await api.setPreferredSupplier(id);
    loadData();
    triggerRefresh();
  }

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: 60, textAlign: 'center' }}>
          <div style={{ color: '#9CA3AF' }}>⏳ 加载中...</div>
        </div>
      </div>
    );
  }

  if (!ingredient) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ color: '#DC2626', marginBottom: 12 }}>❌ 未找到该原材料</div>
          <button
            onClick={onClose}
            style={{ padding: '8px 20px', backgroundColor: '#F97316', color: 'white', borderRadius: 8 }}
          >
            关闭
          </button>
        </div>
      </div>
    );
  }

  const daysLeft = Math.ceil(
    (new Date(ingredient.expiryDate).getTime() - Date.now()) / 86400000
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '95vw',
          maxWidth: 900,
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingBottom: 16,
            borderBottom: '1px solid #E5E7EB',
            marginBottom: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: CATEGORY_COLORS[ingredient.category],
                boxShadow: `0 0 0 3px ${CATEGORY_COLORS[ingredient.category]}30`,
              }}
            />
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1F2937' }}>{ingredient.name}</h2>
              <div style={{ color: '#6B7280', fontSize: 13 }}>
                {CATEGORY_LABELS[ingredient.category]} · 创建于{' '}
                {new Date(ingredient.createdAt).toLocaleDateString('zh-CN')}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              fontSize: 24,
              color: '#9CA3AF',
              padding: '4px 10px',
              borderRadius: 6,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F3F4F6';
              e.currentTarget.style.color = '#374151';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#9CA3AF';
            }}
          >
            ✕
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 12,
            marginBottom: 16,
          }}
        >
          <InfoCard icon="📦" label="当前库存" value={`${ingredient.currentStock} ${ingredient.unit}`} color="#3B82F6" />
          <InfoCard
            icon="⚠️"
            label="预警阈值"
            value={`${ingredient.threshold} ${ingredient.unit}`}
            color={ingredient.currentStock < ingredient.threshold ? '#DC2626' : '#F59E0B'}
            highlight={ingredient.currentStock < ingredient.threshold}
          />
          <InfoCard
            icon={daysLeft < 0 ? '❌' : daysLeft <= 7 ? '⏰' : '✅'}
            label="保质期状态"
            value={
              daysLeft < 0
                ? `已过期 ${-daysLeft} 天`
                : daysLeft <= 7
                ? `${daysLeft} 天后过期`
                : `剩余 ${daysLeft} 天`
            }
            color={daysLeft < 0 ? '#DC2626' : daysLeft <= 7 ? '#F59E0B' : '#10B981'}
            highlight={daysLeft <= 7}
          />
          <InfoCard
            icon="📈"
            label="日消耗估算"
            value={`${(ingredient.dailyConsumptionRate || 0).toFixed(2)} ${ingredient.unit}/天`}
            color="#8B5CF6"
          />
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowInbound(true)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#10B981',
              color: 'white',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            ⬆️ 入库
          </button>
          <button
            onClick={() => setShowOutbound(true)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#3B82F6',
              color: 'white',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            ⬇️ 出库（消耗）
          </button>
          <button
            onClick={() => setShowWaste(true)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#EF4444',
              color: 'white',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            🗑️ 报废
          </button>
          <button
            onClick={() => setShowEdit(true)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#F3F4F6',
              color: '#374151',
              borderRadius: 8,
              fontWeight: 500,
              fontSize: 14,
              marginLeft: 'auto',
            }}
          >
            ✏️ 编辑信息
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            borderBottom: '2px solid #E5E7EB',
            marginBottom: 16,
            flexShrink: 0,
          }}
        >
          {(['info', 'history'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '10px 20px',
                background: 'transparent',
                fontWeight: 600,
                fontSize: 14,
                color: activeTab === tab ? '#F97316' : '#6B7280',
                borderBottom: activeTab === tab ? '2px solid #F97316' : '2px solid transparent',
                marginBottom: '-2px',
              }}
            >
              {tab === 'info' ? '📊 供应商与比价' : '📜 变动历史'}
            </button>
          ))}
        </div>

        <div style={{ overflowY: 'auto', flex: 1, minHeight: 300 }}>
          {activeTab === 'info' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 12 }}>
                  📊 供应商最新报价对比
                </h3>
                {priceChart.length === 0 ? (
                  <div
                    style={{
                      padding: 32,
                      textAlign: 'center',
                      backgroundColor: '#F9FAFB',
                      borderRadius: 8,
                      color: '#9CA3AF',
                    }}
                  >
                    暂无关联供应商，请前往"供应商管理"添加
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-end',
                      gap: 20,
                      padding: '16px 8px',
                      overflowX: 'auto',
                      minHeight: 200,
                    }}
                  >
                    {priceChart.map((item) => (
                      <div
                        key={item.supplier.id}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 8,
                          minWidth: 120,
                        }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#1F2937' }}>
                          ¥{item.latestPrice.toFixed(2)}
                        </div>
                        <div
                          style={{
                            width: 120,
                            height: Math.max(30, (item.heightPercent / 100) * 140),
                            background: `linear-gradient(180deg, #60A5FA 0%, #3B82F6 100%)`,
                            borderRadius: '8px 8px 4px 4px',
                            boxShadow: item.isCheapest ? '0 4px 12px rgba(59,130,246,0.3)' : 'none',
                            position: 'relative',
                          }}
                        >
                          {item.supplier.isPreferred && (
                            <div
                              style={{
                                position: 'absolute',
                                top: -8,
                                right: -8,
                                backgroundColor: '#10B981',
                                color: 'white',
                                fontSize: 9,
                                padding: '2px 5px',
                                borderRadius: 4,
                                fontWeight: 600,
                              }}
                            >
                              首选
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: 12, color: '#374151', fontWeight: 500 }}>
                            {item.shortName}
                          </span>
                          <button
                            onClick={() => setPreferredSupplier(item.supplier.id)}
                            style={{
                              background: 'transparent',
                              fontSize: 14,
                              padding: 0,
                              color: item.isCheapest ? '#F59E0B' : '#D1D5DB',
                            }}
                          >
                            ★
                          </button>
                        </div>
                        {item.isCheapest && (
                          <div
                            style={{
                              fontSize: 10,
                              backgroundColor: '#D1FAE5',
                              color: '#065F46',
                              padding: '2px 6px',
                              borderRadius: 4,
                              fontWeight: 600,
                            }}
                          >
                            最低
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {preferredSupplier && (
                <div
                  style={{
                    padding: 14,
                    backgroundColor: '#ECFDF5',
                    borderRadius: 8,
                    border: '1px solid #6EE7B7',
                  }}
                >
                  <div style={{ fontSize: 12, color: '#065F46', fontWeight: 600, marginBottom: 4 }}>
                    ⭐ 首选供应商推荐
                  </div>
                  <div style={{ fontSize: 14, color: '#064E3B', fontWeight: 700 }}>
                    {preferredSupplier.name}
                  </div>
                  <div style={{ fontSize: 12, color: '#047857', marginTop: 4 }}>
                    {preferredSupplier.contactPerson} · {preferredSupplier.contactInfo}
                    {preferredSupplier.distance && ` · ${preferredSupplier.distance}`}
                    {preferredSupplier.priceHistory[0] &&
                      ` · 最新报价 ¥${preferredSupplier.priceHistory[0].price.toFixed(2)}`}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
                {(['week', 'month', 'year', 'all'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setHistoryFilter(r)}
                    style={{
                      padding: '5px 12px',
                      fontSize: 12,
                      borderRadius: 6,
                      backgroundColor: historyFilter === r ? '#F97316' : '#F3F4F6',
                      color: historyFilter === r ? 'white' : '#374151',
                      fontWeight: historyFilter === r ? 600 : 500,
                    }}
                  >
                    {r === 'week' ? '近一周' : r === 'month' ? '近一月' : r === 'year' ? '近一年' : '全部'}
                  </button>
                ))}
              </div>
              {filteredHistory.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>暂无历史记录</div>
              ) : (
                <HistoryTimeline entries={filteredHistory} unit={ingredient.unit} />
              )}
            </div>
          )}
        </div>

        {showInbound && (
          <StockInModal
            unit={ingredient.unit}
            defaultExpiry={ingredient.expiryDate.split('T')[0]}
            suppliers={suppliers}
            onClose={() => setShowInbound(false)}
            onSubmit={handleStockIn}
          />
        )}
        {showOutbound && (
          <SimpleFormModal
            title="⬇️ 出库（消耗）"
            unit={ingredient.unit}
            color="#3B82F6"
            onClose={() => setShowOutbound(false)}
            onSubmit={handleStockOut}
          />
        )}
        {showWaste && (
          <SimpleFormModal
            title="🗑️ 报废"
            unit={ingredient.unit}
            color="#EF4444"
            onClose={() => setShowWaste(false)}
            onSubmit={handleWaste}
          />
        )}
        {showEdit && (
          <EditModal
            ingredient={ingredient}
            onClose={() => setShowEdit(false)}
            onSubmit={handleEdit}
          />
        )}
      </div>
    </div>
  );
}

function InfoCard({
  icon,
  label,
  value,
  color,
  highlight,
}: {
  icon: string;
  label: string;
  value: string;
  color: string;
  highlight?: boolean;
}) {
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 8,
        backgroundColor: highlight ? `${color}10` : '#F9FAFB',
        border: highlight ? `1px solid ${color}40` : '1px solid #E5E7EB',
        transition: 'all 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 14 }}>{icon}</span>
        <span style={{ fontSize: 11, color: '#6B7280' }}>{label}</span>
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

function HistoryTimeline({
  entries,
  unit,
}: {
  entries: HistoryEntry[];
  unit: string;
}) {
  const colors: Record<HistoryEntryType, string> = {
    in: '#10B981',
    out: '#3B82F6',
    waste: '#EF4444',
  };
  const labels: Record<HistoryEntryType, string> = {
    in: '入库',
    out: '出库',
    waste: '报废',
  };
  const signMap: Record<HistoryEntryType, string> = {
    in: '+',
    out: '-',
    waste: '-',
  };

  return (
    <div style={{ position: 'relative', paddingLeft: 24 }}>
      <div
        style={{
          position: 'absolute',
          left: 5,
          top: 6,
          bottom: 6,
          width: 2,
          backgroundColor: '#E5E7EB',
        }}
      />
      {entries.map((entry) => (
        <div
          key={entry.id}
          style={{
            position: 'relative',
            paddingBottom: 20,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 16,
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: -24,
              top: 4,
              width: 12,
              height: 12,
              borderRadius: '50%',
              backgroundColor: colors[entry.type],
              boxShadow: `0 0 0 3px ${colors[entry.type]}20`,
              zIndex: 1,
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <div>
                <span
                  style={{
                    display: 'inline-block',
                    fontSize: 11,
                    padding: '2px 8px',
                    borderRadius: 4,
                    backgroundColor: `${colors[entry.type]}15`,
                    color: colors[entry.type],
                    fontWeight: 600,
                    marginRight: 8,
                  }}
                >
                  {labels[entry.type]}
                </span>
                <span style={{ fontSize: 13, color: '#374151' }}>
                  {new Date(entry.timestamp).toLocaleString('zh-CN', {
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <span style={{ fontSize: 12, color: '#9CA3AF', marginLeft: 8 }}>
                  操作人：{entry.operator}
                </span>
              </div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: colors[entry.type],
                  whiteSpace: 'nowrap',
                }}
              >
                {signMap[entry.type]}
                {entry.quantity} {unit}
              </div>
            </div>
            {entry.notes && (
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4, paddingLeft: 4 }}>
                📝 {entry.notes}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function StockInModal({
  unit,
  defaultExpiry,
  suppliers,
  onClose,
  onSubmit,
}: {
  unit: string;
  defaultExpiry: string;
  suppliers: Supplier[];
  onClose: () => void;
  onSubmit: (quantity: number, expiryDate: string, supplierId?: string) => void;
}) {
  const [quantity, setQuantity] = useState('');
  const [expiryDate, setExpiryDate] = useState(defaultExpiry);
  const [supplierId, setSupplierId] = useState(
    suppliers.find((s) => s.isPreferred)?.id || (suppliers[0]?.id ?? '')
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!quantity) return;
    onSubmit(Number(quantity), new Date(expiryDate).toISOString(), supplierId || undefined);
  }

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{ zIndex: 1100 }}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 420, maxWidth: '95vw' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1F2937' }}>⬆️ 入库</h2>
          <button onClick={onClose} style={{ background: 'transparent', fontSize: 18, color: '#6B7280' }}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label={`入库数量（${unit}）`} required>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              style={{ width: '100%' }}
              placeholder="0.00"
            />
          </Field>
          <Field label="更新保质期至（自动重置）" required>
            <input
              type="date"
              required
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              style={{ width: '100%' }}
            />
          </Field>
          {suppliers.length > 0 && (
            <Field label="供应商（可选）">
              <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} style={{ width: '100%' }}>
                <option value="">-- 不关联 --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.isPreferred ? '⭐ ' : ''}{s.name}
                    {s.priceHistory[0] ? ` (¥${s.priceHistory[0].price.toFixed(2)})` : ''}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '10px 16px', backgroundColor: '#F3F4F6', color: '#374151', borderRadius: 8, fontWeight: 500 }}>取消</button>
            <button type="submit" style={{ flex: 1, padding: '10px 16px', backgroundColor: '#10B981', color: 'white', borderRadius: 8, fontWeight: 600 }}>确认入库</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SimpleFormModal({
  title,
  unit,
  color,
  onClose,
  onSubmit,
}: {
  title: string;
  unit: string;
  color: string;
  onClose: () => void;
  onSubmit: (quantity: number) => void;
}) {
  const [quantity, setQuantity] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!quantity) return;
    onSubmit(Number(quantity));
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: 380, maxWidth: '95vw' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1F2937' }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'transparent', fontSize: 18, color: '#6B7280' }}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label={`数量（${unit}）`} required>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              style={{ width: '100%' }}
              placeholder="0.00"
            />
          </Field>
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '10px 16px', backgroundColor: '#F3F4F6', color: '#374151', borderRadius: 8, fontWeight: 500 }}>取消</button>
            <button type="submit" style={{ flex: 1, padding: '10px 16px', backgroundColor: color, color: 'white', borderRadius: 8, fontWeight: 600 }}>确认</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditModal({
  ingredient,
  onClose,
  onSubmit,
}: {
  ingredient: Ingredient;
  onClose: () => void;
  onSubmit: (data: Partial<Ingredient>) => void;
}) {
  const [form, setForm] = useState({
    name: ingredient.name,
    category: ingredient.category,
    unit: ingredient.unit,
    currentStock: String(ingredient.currentStock),
    threshold: String(ingredient.threshold),
    expiryDate: ingredient.expiryDate.split('T')[0],
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      name: form.name,
      category: form.category as IngredientCategory,
      unit: form.unit,
      currentStock: Number(form.currentStock),
      threshold: Number(form.threshold),
      expiryDate: new Date(form.expiryDate).toISOString(),
    });
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: 460, maxWidth: '95vw' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1F2937' }}>✏️ 编辑信息</h2>
          <button onClick={onClose} style={{ background: 'transparent', fontSize: 18, color: '#6B7280' }}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field label="名称" required>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={{ width: '100%' }} />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="类别">
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as IngredientCategory })} style={{ width: '100%' }}>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </Field>
            <Field label="单位">
              <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} style={{ width: '100%' }} />
            </Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="当前库存">
              <input type="number" step="0.01" min="0" value={form.currentStock} onChange={(e) => setForm({ ...form, currentStock: e.target.value })} style={{ width: '100%' }} />
            </Field>
            <Field label="预警阈值">
              <input type="number" step="0.01" min="0" value={form.threshold} onChange={(e) => setForm({ ...form, threshold: e.target.value })} style={{ width: '100%' }} />
            </Field>
          </div>
          <Field label="保质期至">
            <input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} style={{ width: '100%' }} />
          </Field>
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '10px 16px', backgroundColor: '#F3F4F6', color: '#374151', borderRadius: 8, fontWeight: 500 }}>取消</button>
            <button type="submit" style={{ flex: 1, padding: '10px 16px', backgroundColor: '#F97316', color: 'white', borderRadius: 8, fontWeight: 600 }}>保存</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
        {label}{required && <span style={{ color: '#DC2626', marginLeft: 2 }}>*</span>}
      </label>
      {children}
    </div>
  );
}
