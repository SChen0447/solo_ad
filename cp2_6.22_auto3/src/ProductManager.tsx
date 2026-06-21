import { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Edit2, Trash2, X, Package } from 'lucide-react';
import { api } from './api';
import type { Product } from './types';

type SortKey = 'default' | 'price-asc' | 'price-desc' | 'stock-asc' | 'stock-desc';

export default function ProductManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('default');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    stock: '',
    description: '',
    imageUrl: '',
  });
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  const loadProducts = async () => {
    try {
      const data = await api.getProducts();
      setProducts(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
    const t = setTimeout(() => setLoaded(true), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const id = setInterval(loadProducts, 3000);
    return () => clearInterval(id);
  }, []);

  const filteredProducts = useMemo(() => {
    let list = products.filter((p) =>
      p.name.toLowerCase().includes(searchText.toLowerCase())
    );
    switch (sortKey) {
      case 'price-asc':
        list = [...list].sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        list = [...list].sort((a, b) => b.price - a.price);
        break;
      case 'stock-asc':
        list = [...list].sort((a, b) => a.stock - b.stock);
        break;
      case 'stock-desc':
        list = [...list].sort((a, b) => b.stock - a.stock);
        break;
    }
    return list;
  }, [products, searchText, sortKey]);

  const openCreate = () => {
    setEditing(null);
    setFormData({ name: '', price: '', stock: '', description: '', imageUrl: '' });
    setError('');
    setShowForm(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setFormData({
      name: p.name,
      price: String(p.price),
      stock: String(p.stock),
      description: p.description,
      imageUrl: p.imageUrl,
    });
    setError('');
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) return setError('请输入商品名称');
    if (!formData.price || isNaN(Number(formData.price))) return setError('请输入有效价格');
    if (!formData.stock || isNaN(Number(formData.stock))) return setError('请输入有效库存');
    try {
      const payload = {
        name: formData.name.trim(),
        price: Number(formData.price),
        stock: Number(formData.stock),
        description: formData.description.trim(),
        imageUrl: formData.imageUrl.trim(),
      };
      if (editing) {
        await api.updateProduct(editing.id, payload);
      } else {
        await api.createProduct(payload);
      }
      setShowForm(false);
      loadProducts();
    } catch (e: any) {
      setError(e.message || '操作失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除该商品吗？')) return;
    try {
      await api.deleteProduct(id);
      loadProducts();
    } catch (e: any) {
      alert(e.message || '删除失败');
    }
  };

  return (
    <div style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.4s' }}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>商品管理</h1>
          <p style={styles.subtitle}>管理您的摊位商品，添加、编辑或删除商品信息</p>
        </div>
        <button style={styles.addBtn} onClick={openCreate}>
          <Plus size={18} />
          <span>新增商品</span>
        </button>
      </div>

      <div style={styles.toolbar}>
        <div style={styles.searchWrap}>
          <Search size={16} color="#9CA3AF" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            style={styles.searchInput}
            placeholder="搜索商品名称..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
        <select
          style={styles.sortSelect}
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
        >
          <option value="default">默认排序</option>
          <option value="price-asc">价格从低到高</option>
          <option value="price-desc">价格从高到低</option>
          <option value="stock-asc">库存从少到多</option>
          <option value="stock-desc">库存从多到少</option>
        </select>
      </div>

      {loading ? (
        <div style={styles.empty}>加载中...</div>
      ) : filteredProducts.length === 0 ? (
        <div style={styles.empty}>
          <Package size={48} color="#D1D5DB" />
          <p style={{ marginTop: 16, color: '#6B7280' }}>暂无商品，点击上方按钮添加</p>
        </div>
      ) : (
        <div style={styles.grid}>
          {filteredProducts.map((p, idx) => (
            <div
              key={p.id}
              style={{
                ...styles.card,
                opacity: loaded ? 1 : 0,
                transform: loaded ? 'translateY(0)' : 'translateY(20px)',
                transition: `all 0.35s ease-out ${0.05 * idx}s`,
              }}
              className="product-card"
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-8px)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 12px 24px rgba(0,0,0,0.12)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 8px rgba(0,0,0,0.06)';
              }}
            >
              <div style={styles.cardImageWrap}>
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt={p.name} style={styles.cardImage} />
                ) : (
                  <div style={styles.cardImageFallback}>
                    <Package size={40} color="#9CA3AF" />
                  </div>
                )}
              </div>
              <div style={styles.cardBody}>
                <div style={styles.cardName}>{p.name}</div>
                <div style={styles.cardPrice}>¥{p.price.toFixed(2)}</div>
                <div style={styles.cardStock}>库存：{p.stock} 件</div>
                <div style={styles.cardActions}>
                  <button style={styles.editBtn} onClick={() => openEdit(p)}>
                    <Edit2 size={14} />
                    编辑
                  </button>
                  <button style={styles.deleteBtn} onClick={() => handleDelete(p.id)}>
                    <Trash2 size={14} />
                    删除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div style={styles.modalMask} onClick={() => setShowForm(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>{editing ? '编辑商品' : '新增商品'}</h2>
              <button style={styles.modalClose} onClick={() => setShowForm(false)}>
                <X size={18} />
              </button>
            </div>
            <div style={styles.formBody}>
              <label style={styles.formLabel}>
                商品名称 *
                <input
                  style={styles.formInput}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="请输入商品名称"
                />
              </label>
              <div style={{ display: 'flex', gap: 12 }}>
                <label style={{ ...styles.formLabel, flex: 1 }}>
                  价格 (¥) *
                  <input
                    style={styles.formInput}
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0.00"
                  />
                </label>
                <label style={{ ...styles.formLabel, flex: 1 }}>
                  库存 *
                  <input
                    style={styles.formInput}
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    placeholder="0"
                  />
                </label>
              </div>
              <label style={styles.formLabel}>
                商品描述
                <textarea
                  style={{ ...styles.formInput, height: 80, resize: 'vertical' }}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="请输入商品描述"
                />
              </label>
              <label style={styles.formLabel}>
                图片 URL
                <input
                  style={styles.formInput}
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="https://..."
                />
              </label>
              {error && <div style={styles.formError}>{error}</div>}
            </div>
            <div style={styles.modalFooter}>
              <button style={styles.cancelBtn} onClick={() => setShowForm(false)}>取消</button>
              <button style={styles.submitBtn} onClick={handleSubmit}>
                {editing ? '保存修改' : '创建商品'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 700,
    color: '#111827',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  addBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '10px 20px',
    background: 'linear-gradient(135deg, #6366F1 0%, #A855F7 100%)',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
  },
  toolbar: {
    display: 'flex',
    gap: 12,
    marginBottom: 24,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  searchWrap: {
    position: 'relative',
    flex: 1,
    maxWidth: 360,
  },
  searchInput: {
    width: '100%',
    padding: '10px 14px 10px 40px',
    border: '1px solid #E5E7EB',
    borderRadius: 12,
    fontSize: 14,
    outline: 'none',
    backgroundColor: '#FFFFFF',
    transition: 'all 0.2s',
  },
  sortSelect: {
    padding: '10px 14px',
    border: '1px solid #E5E7EB',
    borderRadius: 12,
    fontSize: 14,
    backgroundColor: '#FFFFFF',
    cursor: 'pointer',
    outline: 'none',
    color: '#374151',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, 240px)',
    gap: 20,
    justifyContent: 'flex-start',
  },
  card: {
    width: 240,
    height: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    border: '1px solid #E5E7EB',
    boxShadow: '0 4px 8px rgba(0,0,0,0.06)',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'all 0.3s ease-out',
    display: 'flex',
    flexDirection: 'column',
  },
  cardImageWrap: {
    width: '100%',
    height: 160,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  cardImage: {
    width: '100%',
    height: 160,
    objectFit: 'cover',
    borderRadius: '16px 16px 0 0',
    display: 'block',
  },
  cardImageFallback: {
    width: '100%',
    height: 160,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  cardBody: {
    padding: '14px 16px 16px',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  cardName: {
    fontSize: 18,
    fontWeight: 700,
    color: '#1F2937',
    marginBottom: 8,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  cardPrice: {
    fontSize: 20,
    fontWeight: 700,
    color: '#10B981',
    marginBottom: 6,
  },
  cardStock: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  cardActions: {
    marginTop: 'auto',
    display: 'flex',
    gap: 8,
  },
  editBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: '7px 10px',
    backgroundColor: '#EEF2FF',
    color: '#6366F1',
    border: 'none',
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  deleteBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: '7px 10px',
    backgroundColor: '#FEF2F2',
    color: '#EF4444',
    border: 'none',
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 20px',
    color: '#6B7280',
  },
  modalMask: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(17,24,39,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    animation: 'fadeIn 0.2s',
  },
  modal: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
    margin: 20,
    animation: 'modalIn 0.25s ease-out',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #F3F4F6',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: '#111827',
  },
  modalClose: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#6B7280',
    padding: 4,
    borderRadius: 8,
    transition: 'all 0.2s',
  },
  formBody: {
    padding: 24,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  formLabel: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    fontSize: 13,
    fontWeight: 600,
    color: '#374151',
  },
  formInput: {
    padding: '10px 14px',
    border: '1px solid #E5E7EB',
    borderRadius: 10,
    fontSize: 14,
    outline: 'none',
    transition: 'all 0.2s',
    fontFamily: 'inherit',
  },
  formError: {
    padding: '10px 14px',
    backgroundColor: '#FEF2F2',
    color: '#EF4444',
    borderRadius: 10,
    fontSize: 13,
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 12,
    padding: '16px 24px 24px',
  },
  cancelBtn: {
    padding: '10px 20px',
    backgroundColor: '#F3F4F6',
    color: '#374151',
    border: 'none',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  submitBtn: {
    padding: '10px 24px',
    background: 'linear-gradient(135deg, #6366F1 0%, #A855F7 100%)',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
};

const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
  @keyframes modalIn { from { opacity: 0; transform: translateY(20px) scale(0.96) } to { opacity: 1; transform: translateY(0) scale(1) } }
  .product-card:hover button:first-child { background: #E0E7FF; }
  .product-card:hover button:last-child { background: #FEE2E2; }
  input:focus, select:focus, textarea:focus { border-color: #6366F1; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
  button:hover { opacity: 0.9; }
`;
if (!document.querySelector('style[data-market]')) {
  styleSheet.setAttribute('data-market', '1');
  document.head.appendChild(styleSheet);
}
