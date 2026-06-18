import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useProducts } from '../hooks/useProducts';
import { ProductService } from '../modules/product/ProductService';
import { Product } from '../types';

const statusLabels: Record<string, { text: string; color: string }> = {
  active: { text: '在售', color: '#27ae60' },
  sold: { text: '已售罄', color: '#f39c12' },
  removed: { text: '已下架', color: '#95a5a6' }
};

const categoryLabels: Record<string, string> = {
  ebook: '电子书',
  course: '课程码',
  software: '软件激活码',
  other: '其他'
};

export const MyListings = () => {
  const { myProducts, fetchMyProducts, loading } = useProducts();
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    category: '',
    price: '',
    stock: '',
    negotiable: false
  });
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    fetchMyProducts();
  }, [fetchMyProducts]);

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setEditForm({
      title: product.title,
      description: product.description,
      category: product.category,
      price: product.price.toString(),
      stock: product.stock.toString(),
      negotiable: product.negotiable
    });
  };

  const handleSaveEdit = async () => {
    if (!editingProduct) return;

    setSaving(true);
    try {
      await ProductService.updateProduct(editingProduct.id, {
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        category: editForm.category,
        price: parseFloat(editForm.price),
        stock: parseInt(editForm.stock),
        negotiable: editForm.negotiable
      });

      toast.success('商品信息更新成功！');
      setEditingProduct(null);
      fetchMyProducts();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '更新失败');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (productId: string) => {
    if (!window.confirm('确定要下架此商品吗？')) return;

    setRemovingId(productId);
    try {
      await ProductService.removeProduct(productId);
      toast.success('商品已下架');
      fetchMyProducts();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '操作失败');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <>
      <Helmet>
        <title>我的发布 - 虚拟商品二手交易平台</title>
      </Helmet>

      <div className="my-listings-page">
        <div className="page-header">
          <h1>我的发布</h1>
          <Link to="/publish" className="btn btn-primary">
            ➕ 发布新商品
          </Link>
        </div>

        {loading && myProducts.length === 0 ? (
          <div className="loading-screen">加载中...</div>
        ) : (
          <>
            {editingProduct && (
              <div className="modal-overlay" onClick={() => setEditingProduct(null)}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                  <h2>编辑商品</h2>
                  <div className="form-group">
                    <label>商品标题</label>
                    <input
                      type="text"
                      value={editForm.title}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>商品分类</label>
                    <select
                      value={editForm.category}
                      onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    >
                      <option value="ebook">电子书</option>
                      <option value="course">课程码</option>
                      <option value="software">软件激活码</option>
                      <option value="other">其他</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>商品描述</label>
                    <textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      rows={4}
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>售价（元）</label>
                      <input
                        type="number"
                        value={editForm.price}
                        onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                        min="0.01"
                        step="0.01"
                      />
                    </div>
                    <div className="form-group">
                      <label>库存数量</label>
                      <input
                        type="number"
                        value={editForm.stock}
                        onChange={(e) => setEditForm({ ...editForm, stock: e.target.value })}
                        min="0"
                      />
                    </div>
                  </div>
                  <div className="form-group checkbox-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={editForm.negotiable}
                        onChange={(e) => setEditForm({ ...editForm, negotiable: e.target.checked })}
                      />
                      <span>支持议价</span>
                    </label>
                  </div>
                  <div className="modal-actions">
                    <button
                      className="btn btn-outline"
                      onClick={() => setEditingProduct(null)}
                    >
                      取消
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={handleSaveEdit}
                      disabled={saving}
                    >
                      {saving ? '保存中...' : '保存'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {myProducts.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📦</div>
                <h3>您还没有发布任何商品</h3>
                <p>点击上方按钮发布您的第一个商品</p>
                <Link to="/publish" className="btn btn-primary">
                  立即发布
                </Link>
              </div>
            ) : (
              <div className="my-listings-grid">
                {myProducts.map((product) => (
                  <div key={product.id} className="my-listing-card">
                    <div className="my-listing-header">
                      <span
                        className="status-badge"
                        style={{ backgroundColor: statusLabels[product.status].color }}
                      >
                        {statusLabels[product.status].text}
                      </span>
                      <span className="category-tag">{categoryLabels[product.category]}</span>
                    </div>
                    <Link to={`/product/${product.id}`} className="my-listing-title">
                      {product.title}
                    </Link>
                    <p className="my-listing-desc">
                      {product.description.length > 60
                        ? product.description.substring(0, 60) + '...'
                        : product.description}
                    </p>
                    <div className="my-listing-footer">
                      <div className="my-listing-stats">
                        <span className="price">¥{product.price}</span>
                        <span className="stock">库存: {product.stock}</span>
                      </div>
                      <div className="my-listing-actions">
                        {product.status === 'active' && (
                          <>
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => handleEdit(product)}
                            >
                              编辑
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleRemove(product.id)}
                              disabled={removingId === product.id}
                            >
                              {removingId === product.id ? '处理中...' : '下架'}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};
