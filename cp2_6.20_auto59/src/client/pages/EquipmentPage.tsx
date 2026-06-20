import { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Edit2, Trash2, X, Guitar, Piano, Drum, Volume2, MoreHorizontal, Calendar, Hash } from 'lucide-react';

interface Equipment {
  id: string;
  name: string;
  brand: string;
  quantity: number;
  purchaseYear: number;
  notes: string;
  imageUrl: string;
  category: 'guitar' | 'bass' | 'drums' | 'keyboard' | 'audio' | 'other';
  usageFrequency: number;
}

type CategoryFilter = 'all' | Equipment['category'];
type SortOption = 'brand-asc' | 'brand-desc' | 'year-asc' | 'year-desc';

const CATEGORY_OPTIONS: { value: CategoryFilter; label: string; icon: any }[] = [
  { value: 'all', label: '全部', icon: MoreHorizontal },
  { value: 'guitar', label: '吉他/贝斯', icon: Guitar },
  { value: 'bass', label: '贝斯', icon: Guitar },
  { value: 'drums', label: '鼓', icon: Drum },
  { value: 'keyboard', label: '键盘', icon: Piano },
  { value: 'audio', label: '音响', icon: Volume2 },
  { value: 'other', label: '其他', icon: MoreHorizontal },
];

const CATEGORY_LABEL: Record<string, string> = {
  guitar: '吉他',
  bass: '贝斯',
  drums: '鼓组',
  keyboard: '键盘',
  audio: '音响设备',
  other: '其他',
};

export default function EquipmentPage() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('brand-asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Equipment | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [fadeKey, setFadeKey] = useState(0);

  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    quantity: 1,
    purchaseYear: new Date().getFullYear(),
    notes: '',
    imageUrl: '',
    category: 'other' as Equipment['category'],
    usageFrequency: 50,
  });

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    fetchEquipment();
  }, []);

  useEffect(() => {
    setFadeKey((k) => k + 1);
  }, [category, sortBy, searchQuery]);

  const fetchEquipment = async () => {
    try {
      const res = await fetch('/api/equipment');
      const data = await res.json();
      setEquipment(data);
    } catch (err) {
      console.error('获取设备清单失败', err);
    }
  };

  const filteredList = useMemo(() => {
    let list = [...equipment];

    if (category === 'guitar') {
      list = list.filter((e) => e.category === 'guitar' || e.category === 'bass');
    } else if (category !== 'all') {
      list = list.filter((e) => e.category === category);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.brand.toLowerCase().includes(q) ||
          e.notes.toLowerCase().includes(q),
      );
    }

    list.sort((a, b) => {
      switch (sortBy) {
        case 'brand-asc':
          return a.brand.localeCompare(b.brand, 'zh');
        case 'brand-desc':
          return b.brand.localeCompare(a.brand, 'zh');
        case 'year-asc':
          return a.purchaseYear - b.purchaseYear;
        case 'year-desc':
          return b.purchaseYear - a.purchaseYear;
        default:
          return 0;
      }
    });

    return list;
  }, [equipment, category, sortBy, searchQuery]);

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      brand: '',
      quantity: 1,
      purchaseYear: new Date().getFullYear(),
      notes: '',
      imageUrl: '',
      category: 'other',
      usageFrequency: 50,
    });
    setIsAddModalOpen(true);
  };

  const openEditModal = (item: Equipment) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      brand: item.brand,
      quantity: item.quantity,
      purchaseYear: item.purchaseYear,
      notes: item.notes,
      imageUrl: item.imageUrl,
      category: item.category,
      usageFrequency: item.usageFrequency,
    });
    setIsAddModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.brand.trim()) return;

    try {
      if (editingItem) {
        const res = await fetch(`/api/equipment/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        const updated = await res.json();
        setEquipment((prev) => prev.map((it) => (it.id === updated.id ? updated : it)));
      } else {
        const res = await fetch('/api/equipment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        const created = await res.json();
        setEquipment((prev) => [...prev, created]);
      }
      setIsAddModalOpen(false);
    } catch (err) {
      console.error('提交失败', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这件设备吗？')) return;
    try {
      await fetch(`/api/equipment/${id}`, { method: 'DELETE' });
      setEquipment((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      console.error('删除失败', err);
    }
  };

  const renderModal = () => {
    return (
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
            width: '500px',
            maxWidth: '94vw',
            background: '#fff',
            borderRadius: '12px',
            padding: '28px 28px 24px',
            zIndex: 201,
            color: '#1a1a2e',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
            animation: 'scaleIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#16213e' }}>
              {editingItem ? '编辑设备' : '添加设备'}
            </h3>
            <button
              onClick={() => setIsAddModalOpen(false)}
              style={{ padding: '4px', borderRadius: '6px' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f0f0')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <X size={20} color="#666" />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={formStyles.label}>设备名称 *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="如：Stratocaster 电吉他"
                    style={formStyles.input}
                    required
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={formStyles.label}>品牌 *</label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="如：Fender"
                    style={formStyles.input}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={formStyles.label}>
                    <Hash size={13} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '4px' }} />
                    数量
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                    style={formStyles.input}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={formStyles.label}>
                    <Calendar size={13} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '4px' }} />
                    购买年份
                  </label>
                  <input
                    type="number"
                    min="1990"
                    max="2030"
                    value={formData.purchaseYear}
                    onChange={(e) => setFormData({ ...formData, purchaseYear: Number(e.target.value) })}
                    style={formStyles.input}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={formStyles.label}>设备类型</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    style={formStyles.input}
                  >
                    {CATEGORY_OPTIONS.filter((c) => c.value !== 'all').map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.value === 'guitar' ? '吉他' : c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={formStyles.label}>
                  使用频次：{formData.usageFrequency}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={formData.usageFrequency}
                  onChange={(e) => setFormData({ ...formData, usageFrequency: Number(e.target.value) })}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={formStyles.label}>图片URL（可选）</label>
                <input
                  type="text"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="https://..."
                  style={formStyles.input}
                />
              </div>

              <div>
                <label style={formStyles.label}>备注</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="相关说明、配件信息等"
                  rows={2}
                  style={{ ...formStyles.input, resize: 'vertical' }}
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
                    transition: 'filter 0.15s',
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
                    background: '#45B7D1',
                    color: '#fff',
                    fontSize: '14px',
                    fontWeight: 600,
                    transition: 'filter 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(1.2)')}
                  onMouseLeave={(e) => (e.currentTarget.style.filter = 'brightness(1)')}
                >
                  {editingItem ? '保存修改' : '添加设备'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>设备清单</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            共 {equipment.reduce((s, e) => s + e.quantity, 0)} 件设备 · {equipment.length} 个品类
          </p>
        </div>
        <button
          onClick={openAddModal}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            background: 'var(--accent-3)',
            color: '#fff',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 600,
            transition: 'filter 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(1.2)')}
          onMouseLeave={(e) => (e.currentTarget.style.filter = 'brightness(1)')}
        >
          <Plus size={18} /> 添加设备
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
          alignItems: 'center',
          marginBottom: '24px',
          padding: '14px 16px',
          background: 'var(--bg-card)',
          borderRadius: '12px',
        }}
      >
        <div style={{ position: 'relative', minWidth: isMobile ? '100%' : '220px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索名称/品牌..."
            style={{
              width: '100%',
              padding: '9px 12px 9px 36px',
              borderRadius: '8px',
              border: '1.5px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.04)',
              color: '#fff',
              fontSize: '13px',
            }}
          />
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {CATEGORY_OPTIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setCategory(value)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '7px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 500,
                color: category === value ? '#fff' : 'var(--text-secondary)',
                background: category === value ? 'var(--bg-nav-hover)' : 'rgba(255,255,255,0.05)',
                border: category === value ? '1px solid rgba(69,183,209,0.4)' : '1px solid transparent',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                if (category !== value) e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
              }}
              onMouseLeave={(e) => {
                if (category !== value) e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
              }}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        <div style={{ marginLeft: 'auto', minWidth: isMobile ? '100%' : '160px' }}>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: '8px',
              border: '1.5px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.04)',
              color: '#fff',
              fontSize: '12px',
            }}
          >
            <option value="brand-asc">品牌：A → Z</option>
            <option value="brand-desc">品牌：Z → A</option>
            <option value="year-asc">年份：旧 → 新</option>
            <option value="year-desc">年份：新 → 旧</option>
          </select>
        </div>
      </div>

      <div
        key={fadeKey}
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: isMobile ? '12px' : '18px',
          animation: 'fadeIn 0.3s ease forwards',
        }}
      >
        {filteredList.length === 0 ? (
          <div
            style={{
              width: '100%',
              padding: '60px 20px',
              textAlign: 'center',
              color: 'var(--text-secondary)',
              fontSize: '14px',
              background: 'var(--bg-card)',
              borderRadius: '12px',
            }}
          >
            暂无符合条件的设备
          </div>
        ) : (
          filteredList.map((item) => {
            const cardWidth = isMobile ? '100%' : '220px';
            const usageColor = `linear-gradient(90deg, #6b7280 0%, #6b7280 ${Math.max(0, 100 - item.usageFrequency)}%, #10b981 ${100 - item.usageFrequency}%, #10b981 100%)`;
            const CatIcon = CATEGORY_OPTIONS.find((c) => c.value === item.category)?.icon || MoreHorizontal;

            return (
              <div
                key={item.id}
                style={{
                  width: cardWidth,
                  background: '#fff',
                  borderRadius: '10px',
                  border: '2px solid #e5e7eb',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  color: '#1a1a2e',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.25)';
                  e.currentTarget.style.borderColor = '#45B7D1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                  e.currentTarget.style.borderColor = '#e5e7eb';
                }}
              >
                <div
                  style={{
                    height: '96px',
                    background: 'linear-gradient(135deg, #16213e 0%, #533483 100%)',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <CatIcon size={36} color="rgba(255,255,255,0.7)" />
                  )}
                  <span
                    style={{
                      position: 'absolute',
                      top: '8px',
                      left: '8px',
                      background: 'rgba(69,183,209,0.95)',
                      color: '#fff',
                      fontSize: '10px',
                      fontWeight: 600,
                      padding: '3px 8px',
                      borderRadius: '10px',
                    }}
                  >
                    {CATEGORY_LABEL[item.category] || item.category}
                  </span>
                  <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '4px' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(item);
                      }}
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '6px',
                        background: 'rgba(255,255,255,0.9)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Edit2 size={13} color="#555" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(item.id);
                      }}
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '6px',
                        background: 'rgba(255,255,255,0.9)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Trash2 size={13} color="#ef4444" />
                    </button>
                  </div>
                </div>

                <div style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#16213e', lineHeight: 1.3 }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>
                    {item.brand} · {item.purchaseYear}年购入 · ×{item.quantity}
                  </div>
                  {item.notes && (
                    <div
                      style={{
                        fontSize: '11px',
                        color: '#888',
                        marginTop: '2px',
                        padding: '6px 8px',
                        background: '#f9fafb',
                        borderRadius: '6px',
                        lineHeight: 1.4,
                      }}
                    >
                      {item.notes}
                    </div>
                  )}
                </div>

                <div style={{ padding: '0 14px 14px' }}>
                  <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '5px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>使用频次</span>
                    <span style={{ fontWeight: 600 }}>{item.usageFrequency}%</span>
                  </div>
                  <div
                    style={{
                      height: '6px',
                      borderRadius: '3px',
                      background: usageColor,
                      transition: 'background 0.3s',
                    }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      {isAddModalOpen && renderModal()}
    </div>
  );
}

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
