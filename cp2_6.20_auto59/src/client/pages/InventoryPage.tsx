import { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, X, ShoppingBag, Tag, DollarSign, Package, Image as ImageIcon } from 'lucide-react';

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  unitPrice: number;
  stockQuantity: number;
  maxStock: number;
  coverUrl: string;
}

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [lowStockItems, setLowStockItems] = useState<Set<string>>(new Set());

  const [formData, setFormData] = useState({
    name: '',
    category: '服装',
    unitPrice: 0,
    stockQuantity: 0,
    maxStock: 100,
    coverUrl: '',
  });

  const [detailData, setDetailData] = useState({ stockQuantity: 0, maxStock: 100 });

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    fetchInventory();
  }, []);

  useEffect(() => {
    const low = new Set<string>();
    inventory.forEach((item) => {
      const percent = item.maxStock > 0 ? (item.stockQuantity / item.maxStock) * 100 : 0;
      if (percent < 10) low.add(item.id);
    });
    setLowStockItems(low);
  }, [inventory]);

  const fetchInventory = async () => {
    try {
      const res = await fetch('/api/inventory');
      const data = await res.json();
      setInventory(data);
    } catch (err) {
      console.error('获取库存失败', err);
    }
  };

  const openDetail = (item: InventoryItem) => {
    setSelectedItem(item);
    setDetailData({ stockQuantity: item.stockQuantity, maxStock: item.maxStock });
  };

  const closeDetail = () => {
    setSelectedItem(null);
  };

  const handleStockUpdate = async () => {
    if (!selectedItem) return;
    try {
      const res = await fetch(`/api/inventory/${selectedItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(detailData),
      });
      const updated = await res.json();
      setInventory((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      closeDetail();
    } catch (err) {
      console.error('更新库存失败', err);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const created = await res.json();
      setInventory((prev) => [...prev, created]);
      setIsAddModalOpen(false);
    } catch (err) {
      console.error('创建商品失败', err);
    }
  };

  const renderProgressRing = (item: InventoryItem, size: number = 44) => {
    const percent = item.maxStock > 0 ? Math.min(100, Math.round((item.stockQuantity / item.maxStock) * 100)) : 0;
    const isLow = percent < 10;
    const radius = (size - 6) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percent / 100) * circumference;
    const color = isLow ? '#FF6B6B' : percent < 30 ? '#FFEAA7' : '#96CEB4';

    return (
      <div
        style={{
          position: 'relative',
          width: size,
          height: size,
          animation: isLow ? 'blinkRed 1s ease-in-out infinite' : undefined,
        }}
      >
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="4"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="4"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.4s ease, stroke 0.3s' }}
          />
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: Math.round(size * 0.24),
            fontWeight: 700,
            color: isLow ? '#FF6B6B' : percent < 30 ? '#FFEAA7' : '#96CEB4',
          }}
        >
          {percent}%
        </div>
      </div>
    );
  };

  const categories = Array.from(new Set(inventory.map((i) => i.category)));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>周边商品库存</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            共 {inventory.length} 种商品
            {lowStockItems.size > 0 && (
              <span style={{ color: 'var(--accent-1)', marginLeft: '10px', fontWeight: 600 }}>
                ⚠ {lowStockItems.size} 件库存告急
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            background: 'var(--accent-4)',
            color: '#1a1a2e',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 600,
            transition: 'filter 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(1.2)')}
          onMouseLeave={(e) => (e.currentTarget.style.filter = 'brightness(1)')}
        >
          <Plus size={18} /> 添加商品
        </button>
      </div>

      {categories.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          {categories.map((cat) => {
            const catCount = inventory.filter((i) => i.category === cat).length;
            const catLow = inventory.filter((i) => i.category === cat && lowStockItems.has(i.id)).length;
            return (
              <div
                key={cat}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  background: 'var(--bg-card)',
                  borderRadius: '20px',
                  fontSize: '12px',
                  color: 'var(--text-primary)',
                }}
              >
                <Tag size={13} color="#45B7D1" />
                {cat}
                <span style={{ color: 'var(--text-secondary)', marginLeft: '2px' }}>· {catCount}</span>
                {catLow > 0 && (
                  <span style={{ color: '#FF6B6B', fontWeight: 600, fontSize: '11px' }}>({catLow}低)</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div
        style={{
          columnCount: isMobile ? 1 : undefined,
          display: isMobile ? 'flex' : 'grid',
          gridTemplateColumns: isMobile ? undefined : 'repeat(auto-fill, minmax(200px, 200px))',
          flexDirection: isMobile ? 'column' : undefined,
          gap: isMobile ? '14px' : '18px',
          alignItems: 'start',
          justifyContent: 'start',
        }}
      >
        {inventory.map((item) => {
          const cardWidth = isMobile ? '100%' : '200px';
          const isLow = lowStockItems.has(item.id);
          const randomHeights = [240, 270, 220, 250, 230, 260];
          const cardHeight = randomHeights[item.name.length % randomHeights.length];

          return (
            <div
              key={item.id}
              onClick={() => openDetail(item)}
              style={{
                width: cardWidth,
                minHeight: isMobile ? undefined : cardHeight,
                background: '#16213e',
                borderRadius: '8px',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05), inset 0 4px 12px rgba(0,0,0,0.2)',
                position: 'relative',
                border: isLow ? '1px solid rgba(255,107,107,0.3)' : '1px solid transparent',
                display: 'flex',
                flexDirection: 'column',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px) scale(1.01)';
                e.currentTarget.style.boxShadow = 'inset 0 0 0 1px rgba(69,183,209,0.3), 0 12px 28px rgba(0,0,0,0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = 'inset 0 0 0 1px rgba(255,255,255,0.05), inset 0 4px 12px rgba(0,0,0,0.2)';
              }}
            >
              <div
                style={{
                  height: isMobile ? '100px' : '110px',
                  background: item.coverUrl
                    ? `url(${item.coverUrl}) center/cover no-repeat`
                    : 'linear-gradient(135deg, #533483 0%, #0f3460 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                {!item.coverUrl && <ShoppingBag size={36} color="rgba(255,255,255,0.3)" />}
                {isLow && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      background: '#FF6B6B',
                      color: '#fff',
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '10px',
                      animation: 'blinkRed 1s ease-in-out infinite',
                    }}
                  >
                    库存告急
                  </span>
                )}
                <span
                  style={{
                    position: 'absolute',
                    top: '8px',
                    left: '8px',
                    background: 'rgba(22,33,62,0.9)',
                    color: '#45B7D1',
                    fontSize: '10px',
                    fontWeight: 500,
                    padding: '3px 8px',
                    borderRadius: '10px',
                    backdropFilter: 'blur(4px)',
                  }}
                >
                  {item.category}
                </span>
              </div>

              <div style={{ padding: '12px 12px 14px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h4
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#fff',
                    lineHeight: 1.3,
                    marginBottom: '6px',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {item.name}
                </h4>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    color: '#FFEAA7',
                    fontWeight: 700,
                    fontSize: '15px',
                    marginBottom: '10px',
                  }}
                >
                  <DollarSign size={14} />
                  ¥{item.unitPrice}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '2px' }}>当前库存</div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: isLow ? '#FF6B6B' : '#96CEB4' }}>
                      {item.stockQuantity}
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 400, marginLeft: '2px' }}>
                        /{item.maxStock}
                      </span>
                    </div>
                  </div>
                  {renderProgressRing(item)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {isAddModalOpen && (
        <>
          <div
            onClick={() => setIsAddModalOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.6)',
              zIndex: 200,
              animation: 'fadeIn 0.2s ease forwards',
            }}
          />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '480px',
              maxWidth: '94vw',
              background: '#fff',
              borderRadius: '12px',
              padding: '28px 28px 24px',
              zIndex: 201,
              color: '#1a1a2e',
              boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
              animation: 'scaleIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#16213e' }}>添加商品</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                style={{ padding: '4px', borderRadius: '6px' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f0f0')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <X size={20} color="#666" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={formStyles.label}>商品名称 *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="如：巡演T恤（限定款）"
                    style={formStyles.input}
                    required
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={formStyles.label}>分类</label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      placeholder="服装/周边/音乐"
                      style={formStyles.input}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={formStyles.label}>
                      <DollarSign size={13} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '3px' }} />
                      单价（元）
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.unitPrice}
                      onChange={(e) => setFormData({ ...formData, unitPrice: Number(e.target.value) })}
                      style={formStyles.input}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={formStyles.label}>
                      <Package size={13} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '3px' }} />
                      当前库存
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.stockQuantity}
                      onChange={(e) => setFormData({ ...formData, stockQuantity: Number(e.target.value) })}
                      style={formStyles.input}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={formStyles.label}>最大库存量</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.maxStock}
                      onChange={(e) => setFormData({ ...formData, maxStock: Number(e.target.value) })}
                      style={formStyles.input}
                    />
                  </div>
                </div>

                <div>
                  <label style={formStyles.label}>
                    <ImageIcon size={13} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '3px' }} />
                    封面图片URL（可选）
                  </label>
                  <input
                    type="text"
                    value={formData.coverUrl}
                    onChange={(e) => setFormData({ ...formData, coverUrl: e.target.value })}
                    placeholder="https://..."
                    style={formStyles.input}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '6px',
                      background: '#f0f0f0',
                      color: '#555',
                      fontSize: '14px',
                      fontWeight: 500,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(0.92)')}
                    onMouseLeave={(e) => (e.currentTarget.style.filter = 'brightness(1)')}
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: '10px 24px',
                      borderRadius: '6px',
                      background: '#96CEB4',
                      color: '#16213e',
                      fontSize: '14px',
                      fontWeight: 600,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(1.2)')}
                    onMouseLeave={(e) => (e.currentTarget.style.filter = 'brightness(1)')}
                  >
                    添加商品
                  </button>
                </div>
              </div>
            </form>
          </div>
        </>
      )}

      {selectedItem && (
        <>
          <div
            onClick={closeDetail}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.6)',
              zIndex: 200,
              animation: 'fadeIn 0.2s ease forwards',
            }}
          />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '440px',
              maxWidth: '94vw',
              background: '#fff',
              borderRadius: '12px',
              padding: '28px',
              zIndex: 201,
              color: '#1a1a2e',
              boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
              animation: 'scaleIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '22px' }}>
              <div>
                <span
                  style={{
                    display: 'inline-block',
                    fontSize: '11px',
                    fontWeight: 500,
                    padding: '3px 10px',
                    borderRadius: '10px',
                    background: '#e0f2fe',
                    color: '#0369a1',
                    marginBottom: '8px',
                  }}
                >
                  {selectedItem.category}
                </span>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#16213e' }}>{selectedItem.name}</h3>
                <p style={{ fontSize: '20px', fontWeight: 700, color: '#92400e', marginTop: '6px' }}>
                  ¥{selectedItem.unitPrice}
                </p>
              </div>
              <button
                onClick={closeDetail}
                style={{ padding: '4px', borderRadius: '6px' }}
              >
                <X size={20} color="#666" />
              </button>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '24px',
                padding: '20px',
                background: '#f8fafc',
                borderRadius: '10px',
                marginBottom: '22px',
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>当前库存</div>
                <div style={{ fontSize: '32px', fontWeight: 700, color: detailData.stockQuantity < selectedItem.maxStock * 0.1 ? '#ef4444' : '#059669' }}>
                  {detailData.stockQuantity}
                </div>
              </div>
              <div style={{ fontSize: '20px', color: '#94a3b8', fontWeight: 300 }}>/</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>最大库存</div>
                <div style={{ fontSize: '32px', fontWeight: 700, color: '#475569' }}>{detailData.maxStock}</div>
              </div>
              <div style={{ marginLeft: '8px' }}>
                {renderProgressRing(
                  {
                    ...selectedItem,
                    stockQuantity: detailData.stockQuantity,
                    maxStock: detailData.maxStock,
                  },
                  56,
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={formStyles.label}>调整当前库存数量</label>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() =>
                        setDetailData({ ...detailData, stockQuantity: Math.max(0, detailData.stockQuantity - 10) })
                      }
                      style={qtyBtnStyle}
                    >
                      -10
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setDetailData({ ...detailData, stockQuantity: Math.max(0, detailData.stockQuantity - 1) })
                      }
                      style={qtyBtnStyle}
                    >
                      -1
                    </button>
                    <input
                      type="number"
                      min="0"
                      value={detailData.stockQuantity}
                      onChange={(e) =>
                        setDetailData({ ...detailData, stockQuantity: Math.max(0, Number(e.target.value)) })
                      }
                      style={{ ...formStyles.input, textAlign: 'center', padding: '10px 4px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setDetailData({ ...detailData, stockQuantity: detailData.stockQuantity + 1 })}
                      style={qtyBtnStyle}
                    >
                      +1
                    </button>
                    <button
                      type="button"
                      onClick={() => setDetailData({ ...detailData, stockQuantity: detailData.stockQuantity + 10 })}
                      style={qtyBtnStyle}
                    >
                      +10
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label style={formStyles.label}>最大库存量</label>
                <input
                  type="number"
                  min="1"
                  value={detailData.maxStock}
                  onChange={(e) => setDetailData({ ...detailData, maxStock: Math.max(1, Number(e.target.value)) })}
                  style={formStyles.input}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={closeDetail}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '6px',
                    background: '#f0f0f0',
                    color: '#555',
                    fontSize: '14px',
                    fontWeight: 500,
                  }}
                >
                  取消
                </button>
                <button
                  onClick={handleStockUpdate}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '6px',
                    background: '#45B7D1',
                    color: '#fff',
                    fontSize: '14px',
                    fontWeight: 600,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(1.2)')}
                  onMouseLeave={(e) => (e.currentTarget.style.filter = 'brightness(1)')}
                >
                  保存修改
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const qtyBtnStyle: React.CSSProperties = {
  padding: '10px 12px',
  borderRadius: '8px',
  background: '#e2e8f0',
  color: '#475569',
  fontWeight: 600,
  fontSize: '13px',
  minWidth: '40px',
};

const formStyles: Record<string, React.CSSProperties> = {
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 500,
    color: '#555',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1.5px solid #e5e7eb',
    fontSize: '14px',
    color: '#1a1a2e',
    background: '#fff',
    boxSizing: 'border-box',
  },
};
