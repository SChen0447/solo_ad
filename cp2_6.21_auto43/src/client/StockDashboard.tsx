import { useEffect, useState, useMemo, useRef } from 'react';
import { api } from './api';
import { useApp } from './App';
import { Ingredient, IngredientCategory, CATEGORY_COLORS, CATEGORY_LABELS } from '../shared/types';

interface WarningItem {
  ingredientId: string;
  ingredientName: string;
  daysLeft: number;
  belowThreshold: boolean;
  expiringSoon: boolean;
  recommendedQuantity: number;
  unit: string;
}

export default function StockDashboard() {
  const { refreshFlag, triggerRefresh, showIngredientDetail } = useApp();
  const [items, setItems] = useState<Ingredient[]>([]);
  const [warnings, setWarnings] = useState<WarningItem[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<IngredientCategory | 'all'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const warningRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, [refreshFlag]);

  async function loadData() {
    setLoading(true);
    try {
      const [inv, warn] = await Promise.all([api.getInventory(), api.getWarnings()]);
      setItems(inv);
      setWarnings(warn as WarningItem[]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const el = warningRef.current;
    if (!el || warnings.length === 0) return;
    let anim: number;
    let pos = el.scrollWidth;
    const loop = () => {
      pos -= 0.5;
      if (pos < -el.scrollWidth / 2) pos = 0;
      el.style.transform = `translateX(${pos}px)`;
      anim = requestAnimationFrame(loop);
    };
    anim = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(anim);
  }, [warnings.length]);

  const filtered = useMemo(() => {
    return items.filter((it) => {
      const matchSearch = it.name.toLowerCase().includes(search.toLowerCase());
      const matchCategory = categoryFilter === 'all' || it.category === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [items, search, categoryFilter]);

  const stats = useMemo(() => {
    const total = items.length;
    const lowStock = items.filter((i) => i.currentStock < i.threshold).length;
    const expiring = warnings.filter((w) => w.expiringSoon).length;
    return { total, lowStock, expiring };
  }, [items, warnings]);

  const warningIngredientIds = useMemo(
    () => new Set(warnings.map((w) => w.ingredientId)),
    [warnings]
  );

  function daysUntil(dateStr: string): number {
    const d = new Date(dateStr);
    const now = new Date();
    return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {warnings.length > 0 && (
        <div
          style={{
            backgroundColor: '#FEE2E2',
            borderRadius: 8,
            padding: 12,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#991B1B', fontWeight: 600 }}>
              <span>⚠️</span>
              <span>库存预警</span>
              <span style={{ backgroundColor: '#DC2626', color: 'white', padding: '2px 8px', borderRadius: 10, fontSize: 12 }}>
                {warnings.length}
              </span>
            </div>
            <button
              onClick={() => {
                const encoded = btoa(JSON.stringify(warnings));
                window.location.hash = `#purchase?data=${encoded}`;
                window.dispatchEvent(new HashChangeEvent('hashchange'));
                const event = new CustomEvent('navigate-orders');
                window.dispatchEvent(event);
              }}
              style={{
                backgroundColor: '#DC2626',
                color: 'white',
                padding: '6px 14px',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              🛒 一键生成采购单
            </button>
          </div>
          <div style={{ overflow: 'hidden', position: 'relative' }}>
            <div
              ref={warningRef}
              style={{
                display: 'flex',
                gap: 24,
                whiteSpace: 'nowrap',
                willChange: 'transform',
              }}
            >
              {[...warnings, ...warnings].map((w, idx) => (
                <div
                  key={`${w.ingredientId}-${idx}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 12px',
                    backgroundColor: 'white',
                    borderRadius: 6,
                    color: '#7F1D1D',
                    fontSize: 13,
                    border: '1px solid #FECACA',
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{w.ingredientName}</span>
                  {w.expiringSoon && (
                    <span>
                      {w.daysLeft < 0 ? `已过期 ${-w.daysLeft} 天` : `${w.daysLeft}天后过期`}
                    </span>
                  )}
                  {w.belowThreshold && <span>库存不足</span>}
                  <span style={{ color: '#065F46', fontWeight: 600 }}>
                    建议采购 {w.recommendedQuantity}{w.unit}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        <StatCard icon="📦" label="原材料种类" value={stats.total} color="#F97316" />
        <StatCard icon="⚠️" label="库存不足" value={stats.lowStock} color="#DC2626" />
        <StatCard icon="⏰" label="即将过期" value={stats.expiring} color="#F59E0B" />
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', flex: 1, minWidth: 280 }}>
          <input
            type="text"
            placeholder="🔍 搜索原材料..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: 200, maxWidth: 320 }}
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as any)}
            style={{ minWidth: 140 }}
          >
            <option value="all">所有类别</option>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => api.exportCSV()}
            style={{
              padding: '8px 16px',
              backgroundColor: '#1F2937',
              color: 'white',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            📥 导出CSV
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#F97316',
              color: 'white',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            + 添加原材料
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#9CA3AF' }}>⏳ 加载中...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#9CA3AF' }}>
          暂无库存数据，点击右上角"添加原材料"开始管理
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, 260px)',
            gap: 20,
            justifyContent: 'start',
          }}
          className="stock-grid"
        >
          {filtered.map((it) => (
            <IngredientCard
              key={it.id}
              ingredient={it}
              isWarning={warningIngredientIds.has(it.id)}
              daysLeft={daysUntil(it.expiryDate)}
              onClick={() => showIngredientDetail(it.id)}
            />
          ))}
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .stock-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .stock-grid > * { width: 100% !important; min-width: 0 !important; }
        }
      `}</style>

      {showAddModal && (
        <AddIngredientModal
          onClose={() => setShowAddModal(false)}
          onAdded={() => {
            setShowAddModal(false);
            triggerRefresh();
          }}
        />
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 180,
        padding: 16,
        backgroundColor: 'white',
        borderRadius: 8,
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)')}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)')}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 10,
          backgroundColor: `${color}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 22,
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ color: '#6B7280', fontSize: 13 }}>{label}</div>
        <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
      </div>
    </div>
  );
}

function IngredientCard({
  ingredient,
  isWarning,
  daysLeft,
  onClick,
}: {
  ingredient: Ingredient;
  isWarning: boolean;
  daysLeft: number;
  onClick: () => void;
}) {
  const categoryColor = CATEGORY_COLORS[ingredient.category];
  const isLowStock = ingredient.currentStock < ingredient.threshold;
  const stockPercent = Math.min(100, (ingredient.currentStock / Math.max(ingredient.threshold * 3, 1)) * 100);

  return (
    <div
      onClick={onClick}
      style={{
        width: 260,
        minWidth: 260,
        borderRadius: 10,
        background: `linear-gradient(180deg, #E8F5E9 0%, #FFFFFF 60%)`,
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        padding: 16,
        cursor: 'pointer',
        position: 'relative',
        transition: 'all 0.2s ease',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 14,
          left: 14,
          width: 10,
          height: 10,
          borderRadius: '50%',
          backgroundColor: categoryColor,
          boxShadow: `0 0 0 2px ${categoryColor}30`,
        }}
      />

      {isLowStock && (
        <div
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            minWidth: 28,
            height: 28,
            padding: '0 8px',
            backgroundColor: '#DC2626',
            color: 'white',
            borderRadius: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {ingredient.currentStock}
        </div>
      )}

      <div style={{ marginLeft: 20, marginBottom: 12 }}>
        <div
          style={{
            fontSize: 11,
            color: '#6B7280',
            marginBottom: 4,
            fontWeight: 500,
          }}
        >
          {CATEGORY_LABELS[ingredient.category]}
        </div>
        <div
          style={{
            fontWeight: 700,
            fontSize: 16,
            color: '#1F2937',
            lineHeight: 1.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {ingredient.name}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginBottom: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 2 }}>当前库存</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#1F2937' }}>
            {ingredient.currentStock}
            <span style={{ fontSize: 13, color: '#6B7280', marginLeft: 2, fontWeight: 500 }}>
              {ingredient.unit}
            </span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 2 }}>阈值</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#6B7280' }}>
            {ingredient.threshold}{ingredient.unit}
          </div>
        </div>
      </div>

      <div style={{ height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden', marginBottom: 10 }}>
        <div
          style={{
            height: '100%',
            width: `${stockPercent}%`,
            backgroundColor: isLowStock ? '#DC2626' : '#10B981',
            borderRadius: 3,
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      <div
        style={{
          padding: '6px 10px',
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          backgroundColor: daysLeft < 0
            ? '#FEE2E2'
            : daysLeft <= 7
            ? '#FEF3C7'
            : '#F0FDF4',
          color: daysLeft < 0
            ? '#991B1B'
            : daysLeft <= 7
            ? '#92400E'
            : '#065F46',
        }}
      >
        <span>{daysLeft < 0 ? '❌' : daysLeft <= 7 ? '⏰' : '✅'}</span>
        <span>
          {daysLeft < 0
            ? `已过期 ${-daysLeft} 天`
            : daysLeft <= 7
            ? `${daysLeft} 天后过期`
            : `保质期剩余 ${daysLeft} 天`}
        </span>
      </div>
    </div>
  );
}

function AddIngredientModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [form, setForm] = useState({
    name: '',
    category: 'coffee' as IngredientCategory,
    unit: 'kg',
    currentStock: 0,
    threshold: 10,
    expiryDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await api.createInventory({
      ...form,
      expiryDate: new Date(form.expiryDate).toISOString(),
    });
    onAdded();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: 440, maxWidth: '95vw' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1F2937' }}>➕ 添加原材料</h2>
          <button onClick={onClose} style={{ background: 'transparent', fontSize: 20, color: '#6B7280', padding: 4 }}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="名称" required>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              style={{ width: '100%' }}
              placeholder="例：阿拉比卡咖啡豆"
            />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="类别">
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as IngredientCategory })}
                style={{ width: '100%' }}
              >
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </Field>
            <Field label="单位">
              <input
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                style={{ width: '100%' }}
                placeholder="kg / L / 袋"
              />
            </Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="当前库存">
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.currentStock}
                onChange={(e) => setForm({ ...form, currentStock: Number(e.target.value) })}
                style={{ width: '100%' }}
              />
            </Field>
            <Field label="预警阈值">
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.threshold}
                onChange={(e) => setForm({ ...form, threshold: Number(e.target.value) })}
                style={{ width: '100%' }}
              />
            </Field>
          </div>
          <Field label="保质期至">
            <input
              type="date"
              value={form.expiryDate}
              onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
              style={{ width: '100%' }}
            />
          </Field>
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <button
              type="button"
              onClick={onClose}
              style={{ flex: 1, padding: '10px 16px', backgroundColor: '#F3F4F6', color: '#374151', borderRadius: 8, fontWeight: 500 }}
            >
              取消
            </button>
            <button
              type="submit"
              style={{ flex: 1, padding: '10px 16px', backgroundColor: '#F97316', color: 'white', borderRadius: 8, fontWeight: 600 }}
            >
              确认添加
            </button>
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
