import { useEffect, useState, useMemo } from 'react';
import { api } from './api';
import { useApp } from './App';
import { Supplier, Ingredient, CATEGORY_LABELS } from '../shared/types';

export default function SupplierPanel() {
  const { refreshFlag, triggerRefresh, showIngredientDetail } = useApp();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [selectedIngredient, setSelectedIngredient] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addQuoteFor, setAddQuoteFor] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [refreshFlag]);

  async function loadData() {
    setLoading(true);
    try {
      const [sups, invs] = await Promise.all([api.getSuppliers(), api.getInventory()]);
      setSuppliers(sups);
      setIngredients(invs);
      if (invs.length > 0 && !selectedIngredient) {
        setSelectedIngredient(invs[0].id);
      }
    } finally {
      setLoading(false);
    }
  }

  const ingredientOptions = useMemo(() => {
    if (search) {
      return ingredients.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()));
    }
    return ingredients;
  }, [ingredients, search]);

  const currentIngredient = ingredients.find((i) => i.id === selectedIngredient);
  const relatedSuppliers = useMemo(
    () => suppliers.filter((s) => s.ingredientId === selectedIngredient),
    [suppliers, selectedIngredient]
  );

  const priceChartData = useMemo(() => {
    const sorted = [...relatedSuppliers]
      .map((s) => ({
        supplier: s,
        latestPrice: s.priceHistory[0]?.price || 0,
        shortName: s.name.length > 4 ? s.name.slice(0, 4) : s.name,
      }))
      .sort((a, b) => a.latestPrice - b.latestPrice);
    const maxPrice = Math.max(...sorted.map((s) => s.latestPrice), 1);
    return sorted.map((s, idx) => ({
      ...s,
      heightPercent: (s.latestPrice / maxPrice) * 100,
      isCheapest: idx === 0,
      rank: idx,
    }));
  }, [relatedSuppliers]);

  async function setPreferred(id: string) {
    await api.setPreferredSupplier(id);
    triggerRefresh();
  }

  async function addQuote(supplierId: string, price: number, notes: string) {
    await api.addQuote(supplierId, { price, notes });
    setAddQuoteFor(null);
    triggerRefresh();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1F2937', marginBottom: 4 }}>
            🏪 供应商管理与比价
          </h1>
          <p style={{ color: '#6B7280', fontSize: 14 }}>
            选择原材料，查看多家供应商报价对比，设置首选供应商
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          disabled={ingredients.length === 0}
          style={{
            padding: '10px 20px',
            backgroundColor: ingredients.length === 0 ? '#D1D5DB' : '#F97316',
            color: 'white',
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 14,
            cursor: ingredients.length === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          + 新增供应商
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '280px 1fr',
          gap: 20,
        }}
        className="supplier-layout"
      >
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: 8,
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            maxHeight: 'calc(100vh - 220px)',
          }}
        >
          <div style={{ fontWeight: 600, color: '#374151', marginBottom: 4 }}>选择原材料</div>
          <input
            placeholder="🔍 搜索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div style={{ overflowY: 'auto', margin: '0 -8px', padding: '0 8px' }}>
            {ingredientOptions.length === 0 ? (
              <div style={{ color: '#9CA3AF', fontSize: 13, padding: 12, textAlign: 'center' }}>
                暂无数据
              </div>
            ) : (
              ingredientOptions.map((ing) => {
                const count = suppliers.filter((s) => s.ingredientId === ing.id).length;
                return (
                  <button
                    key={ing.id}
                    onClick={() => setSelectedIngredient(ing.id)}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '10px 12px',
                      borderRadius: 8,
                      backgroundColor: selectedIngredient === ing.id ? '#FFF7ED' : 'transparent',
                      border: selectedIngredient === ing.id ? '1px solid #FDBA74' : '1px solid transparent',
                      color: selectedIngredient === ing.id ? '#9A3412' : '#374151',
                      marginBottom: 4,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontWeight: selectedIngredient === ing.id ? 600 : 500, fontSize: 14 }}>
                        {ing.name}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          padding: '2px 8px',
                          borderRadius: 10,
                          backgroundColor: selectedIngredient === ing.id ? '#FED7AA' : '#F3F4F6',
                          color: selectedIngredient === ing.id ? '#9A3412' : '#6B7280',
                        }}
                      >
                        {count}家
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                      {CATEGORY_LABELS[ing.category]} · 库存 {ing.currentStock}{ing.unit}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {currentIngredient ? (
            <>
              <div
                style={{
                  backgroundColor: 'white',
                  borderRadius: 8,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  padding: 20,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: 20,
                    flexWrap: 'wrap',
                    gap: 12,
                  }}
                >
                  <div>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1F2937' }}>
                      {currentIngredient.name}
                    </h2>
                    <div style={{ color: '#6B7280', fontSize: 14, marginTop: 4 }}>
                      {CATEGORY_LABELS[currentIngredient.category]} · 单位：{currentIngredient.unit}
                    </div>
                  </div>
                  <button
                    onClick={() => showIngredientDetail(currentIngredient.id)}
                    style={{
                      padding: '8px 14px',
                      backgroundColor: '#F3F4F6',
                      color: '#374151',
                      borderRadius: 6,
                      fontSize: 13,
                      fontWeight: 500,
                    }}
                  >
                    查看库存详情 →
                  </button>
                </div>

                {priceChartData.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40, color: '#9CA3AF' }}>
                    该原材料还没有关联供应商，点击右上角"新增供应商"添加
                  </div>
                ) : (
                  <div>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 16 }}>
                      📊 最新报价对比（共 {priceChartData.length} 家供应商）
                    </h3>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-end',
                        gap: 24,
                        padding: '16px 8px',
                        overflowX: 'auto',
                        minHeight: 220,
                      }}
                      className="chart-container"
                    >
                      {priceChartData.map((item) => (
                        <PriceBar
                          key={item.supplier.id}
                          shortName={item.shortName}
                          fullName={item.supplier.name}
                          price={item.latestPrice}
                          heightPercent={item.heightPercent}
                          isCheapest={item.isCheapest}
                          isPreferred={item.supplier.isPreferred}
                          onStarClick={() => setPreferred(item.supplier.id)}
                          onAddQuote={() => setAddQuoteFor(item.supplier.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div
                style={{
                  backgroundColor: 'white',
                  borderRadius: 8,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  padding: 20,
                }}
              >
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1F2937', marginBottom: 16 }}>
                  📋 供应商详情
                </h3>
                {relatedSuppliers.length === 0 ? (
                  <div style={{ color: '#9CA3AF', textAlign: 'center', padding: 32 }}>暂无数据</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {relatedSuppliers.map((s) => (
                      <SupplierCard
                        key={s.id}
                        supplier={s}
                        onStar={() => setPreferred(s.id)}
                        onAddQuote={() => setAddQuoteFor(s.id)}
                        onDelete={async () => {
                          if (confirm(`确定删除供应商 "${s.name}" 吗？`)) {
                            await api.deleteSupplier(s.id);
                            triggerRefresh();
                          }
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: 80, color: '#9CA3AF' }}>
              {loading ? '⏳ 加载中...' : '请先在左侧选择原材料'}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .supplier-layout { grid-template-columns: 1fr !important; }
          .chart-container { overflow-x: auto !important; }
        }
      `}</style>

      {showAddModal && (
        <AddSupplierModal
          ingredients={ingredients}
          defaultIngredientId={selectedIngredient}
          onClose={() => setShowAddModal(false)}
          onAdded={() => {
            setShowAddModal(false);
            triggerRefresh();
          }}
        />
      )}

      {addQuoteFor && (
        <AddQuoteModal
          onClose={() => setAddQuoteFor(null)}
          onSubmit={(price, notes) => addQuote(addQuoteFor, price, notes)}
          supplierName={suppliers.find((s) => s.id === addQuoteFor)?.name || ''}
        />
      )}
    </div>
  );
}

function PriceBar({
  shortName,
  fullName,
  price,
  heightPercent,
  isCheapest,
  isPreferred,
  onStarClick,
  onAddQuote,
}: {
  shortName: string;
  fullName: string;
  price: number;
  heightPercent: number;
  isCheapest: boolean;
  isPreferred: boolean;
  onStarClick: () => void;
  onAddQuote: () => void;
}) {
  const barHeight = Math.max(40, (heightPercent / 100) * 160);
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        minWidth: 120,
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 700, color: '#1F2937' }}>
        ¥{price.toFixed(2)}
      </div>
      <div
        style={{
          width: 120,
          height: barHeight,
          background: `linear-gradient(180deg, #60A5FA 0%, #3B82F6 100%)`,
          borderRadius: '8px 8px 4px 4px',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          paddingBottom: 8,
          transition: 'all 0.3s ease',
          boxShadow: isCheapest ? '0 4px 14px rgba(59, 130, 246, 0.35)' : 'none',
          cursor: 'pointer',
          position: 'relative',
        }}
        title={fullName}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scaleY(1.02)';
          e.currentTarget.style.opacity = '0.95';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scaleY(1)';
          e.currentTarget.style.opacity = '1';
        }}
        onClick={onAddQuote}
      >
        {isPreferred && (
          <div
            style={{
              position: 'absolute',
              top: -10,
              right: -10,
              backgroundColor: '#10B981',
              color: 'white',
              fontSize: 10,
              padding: '2px 6px',
              borderRadius: 4,
              fontWeight: 600,
            }}
          >
            首选
          </div>
        )}
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
          查看报价
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>{shortName}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onStarClick();
          }}
          style={{
            background: 'transparent',
            fontSize: 16,
            padding: 0,
            color: isCheapest ? '#F59E0B' : '#D1D5DB',
            lineHeight: 1,
          }}
          title={isPreferred ? '当前首选（点击其他切换）' : '设为首选供应商'}
        >
          ★
        </button>
      </div>
      {isCheapest && (
        <div
          style={{
            fontSize: 10,
            color: '#065F46',
            backgroundColor: '#D1FAE5',
            padding: '2px 8px',
            borderRadius: 4,
            fontWeight: 600,
          }}
        >
          最低价 ✓
        </div>
      )}
    </div>
  );
}

function SupplierCard({
  supplier,
  onStar,
  onAddQuote,
  onDelete,
}: {
  supplier: Supplier;
  onStar: () => void;
  onAddQuote: () => void;
  onDelete: () => void;
}) {
  const latestPrice = supplier.priceHistory[0];
  const prevPrice = supplier.priceHistory[1];
  const priceDelta = prevPrice ? latestPrice.price - prevPrice.price : 0;

  return (
    <div
      style={{
        border: supplier.isPreferred ? '1px solid #FDBA74' : '1px solid #E5E7EB',
        borderRadius: 8,
        padding: 16,
        backgroundColor: supplier.isPreferred ? '#FFFBEB' : 'white',
        transition: 'all 0.2s ease',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <button
              onClick={onStar}
              style={{
                background: 'transparent',
                fontSize: 20,
                padding: 0,
                color: supplier.isPreferred ? '#F59E0B' : '#D1D5DB',
              }}
              title="设为首选"
            >
              ★
            </button>
            <h4 style={{ fontSize: 16, fontWeight: 700, color: '#1F2937' }}>
              {supplier.name}
              {supplier.isPreferred && (
                <span
                  style={{
                    marginLeft: 8,
                    fontSize: 11,
                    backgroundColor: '#F59E0B',
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: 4,
                    fontWeight: 500,
                  }}
                >
                  首选供应商
                </span>
              )}
            </h4>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, color: '#6B7280', fontSize: 13 }}>
            <span>👤 {supplier.contactPerson}</span>
            <span>📞 {supplier.contactInfo}</span>
            {supplier.distance && <span>📍 {supplier.distance}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onAddQuote}
            style={{
              padding: '6px 12px',
              backgroundColor: '#EFF6FF',
              color: '#1D4ED8',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            + 录入报价
          </button>
          <button
            onClick={onDelete}
            style={{
              padding: '6px 12px',
              backgroundColor: '#FEF2F2',
              color: '#DC2626',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            删除
          </button>
        </div>
      </div>

      {supplier.priceHistory.length > 0 && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px dashed #E5E7EB' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>最新报价</div>
            {prevPrice && (
              <div
                style={{
                  fontSize: 12,
                  color: priceDelta < 0 ? '#059669' : priceDelta > 0 ? '#DC2626' : '#6B7280',
                  fontWeight: 500,
                }}
              >
                {priceDelta < 0 ? '↓' : priceDelta > 0 ? '↑' : '→'} 较上次 {priceDelta > 0 ? '+' : ''}¥{priceDelta.toFixed(2)}
              </div>
            )}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 8,
              marginBottom: 8,
            }}
          >
            <span style={{ fontSize: 28, fontWeight: 800, color: '#F97316' }}>
              ¥{latestPrice.price.toFixed(2)}
            </span>
            <span style={{ color: '#9CA3AF', fontSize: 12 }}>
              {new Date(latestPrice.date).toLocaleDateString('zh-CN')}
            </span>
            {latestPrice.notes && (
              <span style={{ fontSize: 12, color: '#6B7280' }}>({latestPrice.notes})</span>
            )}
          </div>

          {supplier.priceHistory.length > 1 && (
            <div>
              <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 6 }}>历史报价：</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {supplier.priceHistory.slice(1, 6).map((q) => (
                  <span
                    key={q.id}
                    style={{
                      fontSize: 12,
                      padding: '3px 8px',
                      borderRadius: 4,
                      backgroundColor: '#F3F4F6',
                      color: '#6B7280',
                    }}
                  >
                    {new Date(q.date).toLocaleDateString('zh-CN')}：¥{q.price.toFixed(2)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AddSupplierModal({
  ingredients,
  defaultIngredientId,
  onClose,
  onAdded,
}: {
  ingredients: Ingredient[];
  defaultIngredientId: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [form, setForm] = useState({
    name: '',
    contactPerson: '',
    contactInfo: '',
    ingredientId: defaultIngredientId,
    initPrice: '' as string | number,
    initNotes: '',
    distance: '',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const supplier = await api.createSupplier({
      name: form.name,
      contactPerson: form.contactPerson,
      contactInfo: form.contactInfo,
      ingredientId: form.ingredientId,
      distance: form.distance,
      priceHistory: form.initPrice
        ? [
            {
              id: Math.random().toString(36).slice(2),
              date: new Date().toISOString(),
              price: Number(form.initPrice),
              notes: form.initNotes,
            },
          ]
        : [],
      isPreferred: false,
    });
    const existingPreferred = ingredients
      .flatMap((_) => [])
      .length;
    void existingPreferred;
    void supplier;
    onAdded();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 480, maxWidth: '95vw' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1F2937' }}>🏪 新增供应商</h2>
          <button onClick={onClose} style={{ background: 'transparent', fontSize: 20, color: '#6B7280', padding: 4 }}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="供应商名称" required>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={{ width: '100%' }} />
          </Field>
          <Field label="关联原材料" required>
            <select
              required
              value={form.ingredientId}
              onChange={(e) => setForm({ ...form, ingredientId: e.target.value })}
              style={{ width: '100%' }}
            >
              {ingredients.map((ing) => (
                <option key={ing.id} value={ing.id}>{ing.name}</option>
              ))}
            </select>
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="联系人" required>
              <input required value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} style={{ width: '100%' }} />
            </Field>
            <Field label="联系方式" required>
              <input required value={form.contactInfo} onChange={(e) => setForm({ ...form, contactInfo: e.target.value })} style={{ width: '100%' }} placeholder="电话/微信" />
            </Field>
          </div>
          <Field label="距离（可选）">
            <input value={form.distance} onChange={(e) => setForm({ ...form, distance: e.target.value })} style={{ width: '100%' }} placeholder="例：5公里" />
          </Field>
          <div style={{ padding: 12, backgroundColor: '#F9FAFB', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>💡 初始报价（可选）</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="单价（¥）">
                <input type="number" step={0.01} min={0} value={form.initPrice} onChange={(e) => setForm({ ...form, initPrice: e.target.value })} style={{ width: '100%' }} />
              </Field>
              <Field label="备注">
                <input value={form.initNotes} onChange={(e) => setForm({ ...form, initNotes: e.target.value })} style={{ width: '100%' }} />
              </Field>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '10px 16px', backgroundColor: '#F3F4F6', color: '#374151', borderRadius: 8, fontWeight: 500 }}>取消</button>
            <button type="submit" style={{ flex: 1, padding: '10px 16px', backgroundColor: '#F97316', color: 'white', borderRadius: 8, fontWeight: 600 }}>确认添加</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddQuoteModal({
  supplierName,
  onClose,
  onSubmit,
}: {
  supplierName: string;
  onClose: () => void;
  onSubmit: (price: number, notes: string) => void;
}) {
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!price) return;
    onSubmit(Number(price), notes);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: 400, maxWidth: '95vw' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1F2937' }}>💰 录入报价</h2>
          <button onClick={onClose} style={{ background: 'transparent', fontSize: 20, color: '#6B7280', padding: 4 }}>✕</button>
        </div>
        <div style={{ padding: 12, backgroundColor: '#FFF7ED', borderRadius: 8, marginBottom: 16, color: '#9A3412', fontSize: 13 }}>
          供应商：<strong>{supplierName}</strong>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="单价（¥）" required>
            <input type="number" step={0.01} min={0} required value={price} onChange={(e) => setPrice(e.target.value)} style={{ width: '100%' }} placeholder="0.00" />
          </Field>
          <Field label="备注">
            <input value={notes} onChange={(e) => setNotes(e.target.value)} style={{ width: '100%' }} placeholder="价格变动原因、批量折扣等" />
          </Field>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '10px 16px', backgroundColor: '#F3F4F6', color: '#374151', borderRadius: 8, fontWeight: 500 }}>取消</button>
            <button type="submit" style={{ flex: 1, padding: '10px 16px', backgroundColor: '#F97316', color: 'white', borderRadius: 8, fontWeight: 600 }}>保存报价</button>
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
