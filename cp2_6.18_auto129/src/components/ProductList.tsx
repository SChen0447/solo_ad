import React, { useState, useMemo } from 'react';
import { Product, OrderItem } from '../App';

const categoryColors: Record<string, string> = {
  '电子产品': '#3b82f6',
  '服装': '#ec4899',
  '食品': '#22c55e',
  '家居': '#f59e0b',
  '文具': '#8b5cf6',
  '运动': '#ef4444',
};

function getCategoryColor(category: string): string {
  if (categoryColors[category]) return categoryColors[category];
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 60%, 55%)`;
}

interface ProductListProps {
  products: Product[];
  onAdd: (product: Omit<Product, 'id'>) => Promise<any>;
  onDelete: (id: string) => Promise<void>;
  onUpdate: (id: string, updates: Partial<Product>) => Promise<any>;
  onCreateOrder: (items: OrderItem[], trackingNumber: string) => Promise<any>;
}

export default function ProductList({ products, onAdd, onDelete, onUpdate, onCreateOrder }: ProductListProps) {
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showOrder, setShowOrder] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const [addForm, setAddForm] = useState({ name: '', sku: '', quantity: '', location: '', threshold: '', category: '电子产品' });
  const [orderItems, setOrderItems] = useState<{ productId: string; productName: string; sku: string; quantity: number }[]>([]);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [editForm, setEditForm] = useState({ name: '', sku: '', quantity: '', location: '', threshold: '', category: '' });

  const filtered = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.trim().toLowerCase();
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
    );
  }, [products, search]);

  const handleAdd = async () => {
    if (!addForm.name || !addForm.sku || !addForm.quantity || !addForm.location || !addForm.threshold) {
      setError('请填写所有必填字段');
      return;
    }
    const err = await onAdd({
      name: addForm.name,
      sku: addForm.sku,
      quantity: Number(addForm.quantity),
      location: addForm.location,
      threshold: Number(addForm.threshold),
      category: addForm.category,
    });
    if (err) {
      setError(err.error || '添加失败');
    } else {
      setAddForm({ name: '', sku: '', quantity: '', location: '', threshold: '', category: '电子产品' });
      setShowAdd(false);
      setError('');
    }
  };

  const handleEdit = (product: Product) => {
    setEditingId(product.id);
    setEditForm({
      name: product.name,
      sku: product.sku,
      quantity: String(product.quantity),
      location: product.location,
      threshold: String(product.threshold),
      category: product.category,
    });
  };

  const handleEditSave = async () => {
    if (!editingId) return;
    await onUpdate(editingId, {
      name: editForm.name,
      sku: editForm.sku,
      quantity: Number(editForm.quantity),
      location: editForm.location,
      threshold: Number(editForm.threshold),
      category: editForm.category,
    });
    setEditingId(null);
  };

  const openOrderModal = () => {
    setOrderItems([]);
    setTrackingNumber('');
    setShowOrder(true);
  };

  const addOrderItem = (product: Product) => {
    const existing = orderItems.find((i) => i.productId === product.id);
    if (existing) {
      setOrderItems(orderItems.map((i) => (i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i)));
    } else {
      setOrderItems([...orderItems, { productId: product.id, productName: product.name, sku: product.sku, quantity: 1 }]);
    }
  };

  const updateOrderItemQty = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setOrderItems(orderItems.filter((i) => i.productId !== productId));
    } else {
      setOrderItems(orderItems.map((i) => (i.productId === productId ? { ...i, quantity } : i)));
    }
  };

  const handleCreateOrder = async () => {
    if (orderItems.length === 0) {
      setError('请选择至少一件商品');
      return;
    }
    const err = await onCreateOrder(orderItems, trackingNumber);
    if (err) {
      setError(`库存不足: ${err.insufficient.map((i: any) => `${i.productName}(${i.sku}) 需要${i.requested}件, 库存${i.available}件`).join('; ')}`);
    } else {
      setShowOrder(false);
      setError('');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <input
          type="text"
          placeholder="搜索商品（SKU或名称）..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            padding: '8px 14px',
            borderRadius: 8,
            border: '1px solid #e5e7eb',
            fontSize: 14,
            outline: 'none',
          }}
        />
        <button
          onClick={() => setShowAdd(true)}
          style={{
            padding: '8px 16px',
            background: '#1e40af',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          + 添加商品
        </button>
        <button
          onClick={openOrderModal}
          style={{
            padding: '8px 16px',
            background: '#7c3aed',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          创建订单
        </button>
      </div>

      {error && (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #dc2626',
            color: '#dc2626',
            padding: '10px 14px',
            borderRadius: 8,
            marginBottom: 12,
            fontSize: 14,
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map((product) => (
          <div
            key={product.id}
            style={{
              width: 320,
              background: '#fff',
              borderRadius: 12,
              border: '1px solid #e5e7eb',
              padding: 14,
              transition: 'all 0.3s ease-out',
              position: 'relative',
              cursor: 'default',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
              (e.currentTarget as HTMLDivElement).style.boxShadow = '0 6px 18px rgba(0,0,0,0.10)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
              (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
            }}
          >
            {product.quantity < product.threshold && (
              <div
                style={{
                  position: 'absolute',
                  top: 10,
                  left: 10,
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: '#dc2626',
                }}
              />
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: product.quantity < product.threshold ? 0 : 0 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  background: getCategoryColor(product.category),
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {product.name}
                </div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>{product.sku}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span
                  style={{
                    fontWeight: product.quantity < 10 ? 700 : 400,
                    color: product.quantity < 10 ? '#dc2626' : '#1f2937',
                    fontSize: 16,
                  }}
                >
                  {product.quantity}
                </span>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>库存</div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, fontSize: 12, color: '#6b7280' }}>
              <span>仓库: {product.location}</span>
              <span>预警: {product.threshold}</span>
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <button
                onClick={() => handleEdit(product)}
                style={{ padding: '4px 10px', fontSize: 12, border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', cursor: 'pointer' }}
              >
                编辑
              </button>
              <button
                onClick={() => onDelete(product.id)}
                style={{ padding: '4px 10px', fontSize: 12, border: '1px solid #fca5a5', borderRadius: 6, background: '#fff', color: '#dc2626', cursor: 'pointer' }}
              >
                删除
              </button>
            </div>
          </div>
        ))}
      </div>

      {showAdd && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 400, boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
            <h3 style={{ marginBottom: 16, fontSize: 18, fontWeight: 700 }}>添加商品</h3>
            {['name', 'sku', 'quantity', 'location', 'threshold'].map((field) => (
              <div key={field} style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 13, color: '#6b7280', display: 'block', marginBottom: 4 }}>
                  {field === 'name' ? '名称' : field === 'sku' ? 'SKU' : field === 'quantity' ? '库存数量' : field === 'location' ? '仓库位置' : '预警阈值'}
                </label>
                <input
                  value={(addForm as any)[field]}
                  onChange={(e) => setAddForm({ ...addForm, [field]: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, outline: 'none' }}
                />
              </div>
            ))}
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 13, color: '#6b7280', display: 'block', marginBottom: 4 }}>分类</label>
              <select
                value={addForm.category}
                onChange={(e) => setAddForm({ ...addForm, category: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14 }}
              >
                {['电子产品', '服装', '食品', '家居', '文具', '运动'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button onClick={handleAdd} style={{ flex: 1, padding: 10, background: '#1e40af', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>确认添加</button>
              <button onClick={() => { setShowAdd(false); setError(''); }} style={{ flex: 1, padding: 10, background: '#f3f4f6', border: 'none', borderRadius: 8, cursor: 'pointer' }}>取消</button>
            </div>
          </div>
        </div>
      )}

      {editingId && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 400, boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
            <h3 style={{ marginBottom: 16, fontSize: 18, fontWeight: 700 }}>编辑商品</h3>
            {(['name', 'sku', 'quantity', 'location', 'threshold'] as const).map((field) => (
              <div key={field} style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 13, color: '#6b7280', display: 'block', marginBottom: 4 }}>
                  {field === 'name' ? '名称' : field === 'sku' ? 'SKU' : field === 'quantity' ? '库存数量' : field === 'location' ? '仓库位置' : '预警阈值'}
                </label>
                <input
                  value={editForm[field]}
                  onChange={(e) => setEditForm({ ...editForm, [field]: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, outline: 'none' }}
                />
              </div>
            ))}
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 13, color: '#6b7280', display: 'block', marginBottom: 4 }}>分类</label>
              <select
                value={editForm.category}
                onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14 }}
              >
                {['电子产品', '服装', '食品', '家居', '文具', '运动'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button onClick={handleEditSave} style={{ flex: 1, padding: 10, background: '#1e40af', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>保存</button>
              <button onClick={() => setEditingId(null)} style={{ flex: 1, padding: 10, background: '#f3f4f6', border: 'none', borderRadius: 8, cursor: 'pointer' }}>取消</button>
            </div>
          </div>
        </div>
      )}

      {showOrder && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 500, maxHeight: '80vh', overflow: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
            <h3 style={{ marginBottom: 16, fontSize: 18, fontWeight: 700 }}>创建订单</h3>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 13, color: '#6b7280', display: 'block', marginBottom: 4 }}>物流单号（可选）</label>
              <input
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="输入物流单号"
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, outline: 'none' }}
              />
            </div>
            <div style={{ marginBottom: 8, fontSize: 14, fontWeight: 600 }}>选择商品</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {products.map((p) => (
                <button
                  key={p.id}
                  onClick={() => addOrderItem(p)}
                  style={{
                    padding: '4px 10px',
                    fontSize: 12,
                    border: orderItems.some((i) => i.productId === p.id) ? '1px solid #1e40af' : '1px solid #d1d5db',
                    borderRadius: 6,
                    background: orderItems.some((i) => i.productId === p.id) ? '#e0f2fe' : '#fff',
                    cursor: 'pointer',
                  }}
                >
                  {p.name} (库存:{p.quantity})
                </button>
              ))}
            </div>
            {orderItems.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>订单商品</div>
                {orderItems.map((item) => {
                  const product = products.find((p) => p.id === item.productId);
                  return (
                    <div key={item.productId} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ flex: 1, fontSize: 13 }}>{item.productName} ({item.sku})</span>
                      <input
                        type="number"
                        min={1}
                        max={product?.quantity || 999}
                        value={item.quantity}
                        onChange={(e) => updateOrderItemQty(item.productId, Number(e.target.value))}
                        style={{ width: 60, padding: '4px 8px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13, textAlign: 'center' }}
                      />
                      <button
                        onClick={() => updateOrderItemQty(item.productId, 0)}
                        style={{ padding: '4px 8px', fontSize: 12, border: '1px solid #fca5a5', borderRadius: 6, background: '#fff', color: '#dc2626', cursor: 'pointer' }}
                      >
                        移除
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button onClick={handleCreateOrder} style={{ flex: 1, padding: 10, background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>创建订单</button>
              <button onClick={() => { setShowOrder(false); setError(''); }} style={{ flex: 1, padding: 10, background: '#f3f4f6', border: 'none', borderRadius: 8, cursor: 'pointer' }}>取消</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
