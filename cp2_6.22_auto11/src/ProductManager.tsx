import { useState, useMemo } from 'react'
import type { Product } from './types'
import { productApi, orderApi } from './api'

interface ProductManagerProps {
  products: Product[]
  onProductsChange: () => void
  delay?: number
}

type SortType = 'default' | 'price-asc' | 'price-desc' | 'stock-asc' | 'stock-desc'

function ProductManager({ products, onProductsChange, delay = 0 }: ProductManagerProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortType, setSortType] = useState<SortType>('default')
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    stock: '',
    description: '',
    imageUrl: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const filteredProducts = useMemo(() => {
    let result = [...products]

    if (searchTerm) {
      result = result.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    switch (sortType) {
      case 'price-asc':
        result.sort((a, b) => a.price - b.price)
        break
      case 'price-desc':
        result.sort((a, b) => b.price - a.price)
        break
      case 'stock-asc':
        result.sort((a, b) => a.stock - b.stock)
        break
      case 'stock-desc':
        result.sort((a, b) => b.stock - a.stock)
        break
    }

    return result
  }, [products, searchTerm, sortType])

  const handleAddClick = () => {
    setEditingProduct(null)
    setFormData({
      name: '',
      price: '',
      stock: '',
      description: '',
      imageUrl: '',
    })
    setError('')
    setShowModal(true)
  }

  const handleEditClick = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      price: String(product.price),
      stock: String(product.stock),
      description: product.description,
      imageUrl: product.imageUrl,
    })
    setError('')
    setShowModal(true)
  }

  const handleDeleteClick = async (id: string) => {
    if (!confirm('确定要删除这个商品吗？')) return
    try {
      await productApi.delete(id)
      onProductsChange()
    } catch (err) {
      console.error('删除商品失败:', err)
      alert('删除失败，请重试')
    }
  }

  const handleQuickOrder = async (product: Product) => {
    if (product.stock <= 0) {
      alert('库存不足')
      return
    }
    try {
      await orderApi.create({ productId: product.id, quantity: 1 })
      onProductsChange()
    } catch (err) {
      console.error('创建订单失败:', err)
      alert('创建订单失败')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      if (editingProduct) {
        await productApi.update(editingProduct.id, {
          name: formData.name,
          price: Number(formData.price),
          stock: Number(formData.stock),
          description: formData.description,
          imageUrl: formData.imageUrl,
        })
      } else {
        await productApi.create({
          name: formData.name,
          price: Number(formData.price),
          stock: Number(formData.stock),
          description: formData.description,
          imageUrl: formData.imageUrl,
        })
      }
      setShowModal(false)
      onProductsChange()
    } catch (err: any) {
      setError(err.message || '操作失败，请重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div style={{ animation: `fadeInUp 0.5s ease-out ${delay}s both` }}>
      <div style={headerStyle}>
        <div>
          <h2 style={titleStyle}>商品管理</h2>
          <p style={subtitleStyle}>共 {products.length} 件商品</p>
        </div>
        <button style={addButtonStyle} onClick={handleAddClick}>
          <span style={{ marginRight: '8px' }}>+</span>
          添加商品
        </button>
      </div>

      <div style={toolbarStyle}>
        <div style={searchBoxStyle}>
          <span style={{ color: '#9CA3AF' }}>🔍</span>
          <input
            type="text"
            placeholder="搜索商品名称..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={searchInputStyle}
          />
        </div>
        <select
          value={sortType}
          onChange={(e) => setSortType(e.target.value as SortType)}
          style={sortSelectStyle}
        >
          <option value="default">默认排序</option>
          <option value="price-asc">价格从低到高</option>
          <option value="price-desc">价格从高到低</option>
          <option value="stock-asc">库存从少到多</option>
          <option value="stock-desc">库存从多到少</option>
        </select>
      </div>

      <div className="product-grid" style={gridStyle}>
        {filteredProducts.map((product, index) => (
          <div
            key={product.id}
            className="product-card"
          >
            <img
              src={product.imageUrl}
              alt={product.name}
              style={cardImageStyle}
            />
            <div style={cardContentStyle}>
              <h3 style={cardTitleStyle} title={product.name}>{product.name}</h3>
              <div style={cardPriceStyle}>¥{product.price}</div>
              <div style={cardStockStyle}>库存: {product.stock} 件</div>
              <div style={cardActionsStyle}>
                <button
                  style={editButtonStyle}
                  onClick={() => handleEditClick(product)}
                >
                  编辑
                </button>
                <button
                  style={deleteButtonStyle}
                  onClick={() => handleDeleteClick(product.id)}
                >
                  删除
                </button>
              </div>
              <button
                style={{
                  ...quickOrderButtonStyle,
                  ...(product.stock <= 0 ? quickOrderButtonDisabledStyle : {}),
                }}
                onClick={() => handleQuickOrder(product)}
                disabled={product.stock <= 0}
              >
                快速下单
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div style={emptyStateStyle}>
          <span style={{ fontSize: '48px', marginBottom: '16px' }}>📦</span>
          <p style={{ color: '#6B7280', fontSize: '14px' }}>暂无商品，点击上方按钮添加</p>
        </div>
      )}

      {showModal && (
        <div style={modalOverlayStyle} onClick={() => setShowModal(false)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <h3 style={modalTitleStyle}>
              {editingProduct ? '编辑商品' : '添加商品'}
            </h3>
            {error && <div style={errorStyle}>{error}</div>}
            <form onSubmit={handleSubmit}>
              <div style={formGroupStyle}>
                <label style={labelStyle}>商品名称 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={inputStyle}
                  required
                  placeholder="请输入商品名称"
                />
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ ...formGroupStyle, flex: 1 }}>
                  <label style={labelStyle}>价格 (¥) *</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    style={inputStyle}
                    required
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>
                <div style={{ ...formGroupStyle, flex: 1 }}>
                  <label style={labelStyle}>库存 *</label>
                  <input
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    style={inputStyle}
                    required
                    min="0"
                    placeholder="0"
                  />
                </div>
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle}>商品描述</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={{ ...inputStyle, ...textareaStyle }}
                  rows={3}
                  placeholder="请输入商品描述"
                />
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle}>图片URL</label>
                <input
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  style={inputStyle}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              <div style={modalActionsStyle}>
                <button
                  type="button"
                  style={cancelButtonStyle}
                  onClick={() => setShowModal(false)}
                >
                  取消
                </button>
                <button
                  type="submit"
                  style={submitButtonStyle}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? '提交中...' : (editingProduct ? '保存修改' : '添加商品')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '24px',
}

const titleStyle: React.CSSProperties = {
  fontSize: '32px',
  fontWeight: 700,
  color: '#111827',
  marginBottom: '4px',
}

const subtitleStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#6B7280',
}

const addButtonStyle: React.CSSProperties = {
  padding: '12px 24px',
  background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
  color: '#FFFFFF',
  fontSize: '14px',
  fontWeight: 600,
  borderRadius: '12px',
  display: 'flex',
  alignItems: 'center',
  transition: 'all 0.2s ease-out',
  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
}

const toolbarStyle: React.CSSProperties = {
  display: 'flex',
  gap: '16px',
  marginBottom: '24px',
  flexWrap: 'wrap',
}

const searchBoxStyle: React.CSSProperties = {
  flex: 1,
  minWidth: '240px',
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '12px 16px',
  background: '#FFFFFF',
  borderRadius: '12px',
  border: '1px solid #E5E7EB',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
}

const searchInputStyle: React.CSSProperties = {
  flex: 1,
  border: 'none',
  fontSize: '14px',
  color: '#1F2937',
  background: 'transparent',
}

const sortSelectStyle: React.CSSProperties = {
  padding: '12px 16px',
  background: '#FFFFFF',
  borderRadius: '12px',
  border: '1px solid #E5E7EB',
  fontSize: '14px',
  color: '#1F2937',
  cursor: 'pointer',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
}

const gridStyle: React.CSSProperties = {
  gap: '24px',
}

const gridStyleWrapper: React.CSSProperties = {}

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '240px',
  height: '340px',
  background: '#FFFFFF',
  borderRadius: '16px',
  border: '1px solid #E5E7EB',
  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.06)',
  overflow: 'hidden',
  transition: 'all 0.3s ease-out',
  cursor: 'default',
  justifySelf: 'center',
  display: 'flex',
  flexDirection: 'column',
}

const cardImageStyle: React.CSSProperties = {
  width: '100%',
  height: '160px',
  objectFit: 'cover',
  borderTopLeftRadius: '16px',
  borderTopRightRadius: '16px',
}

const cardContentStyle: React.CSSProperties = {
  padding: '16px',
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
}

const cardTitleStyle: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: 700,
  color: '#1F2937',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}

const cardPriceStyle: React.CSSProperties = {
  fontSize: '20px',
  fontWeight: 600,
  color: '#10B981',
}

const cardStockStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#6B7280',
}

const cardActionsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  marginTop: 'auto',
}

const editButtonStyle: React.CSSProperties = {
  flex: 1,
  padding: '8px',
  background: '#EFF6FF',
  color: '#3B82F6',
  fontSize: '12px',
  fontWeight: 600,
  borderRadius: '8px',
  transition: 'all 0.2s ease-out',
}

const deleteButtonStyle: React.CSSProperties = {
  flex: 1,
  padding: '8px',
  background: '#FEF2F2',
  color: '#EF4444',
  fontSize: '12px',
  fontWeight: 600,
  borderRadius: '8px',
  transition: 'all 0.2s ease-out',
}

const quickOrderButtonStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px',
  background: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
  color: '#FFFFFF',
  fontSize: '12px',
  fontWeight: 600,
  borderRadius: '8px',
  transition: 'all 0.2s ease-out',
  marginTop: '8px',
}

const quickOrderButtonDisabledStyle: React.CSSProperties = {
  background: '#D1D5DB',
  cursor: 'not-allowed',
}

const emptyStateStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '64px 0',
}

const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  animation: 'fadeInUp 0.3s ease-out',
}

const modalStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '480px',
  background: '#FFFFFF',
  borderRadius: '16px',
  padding: '32px',
  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
  animation: 'slideUp 0.4s ease-out',
  maxHeight: '90vh',
  overflowY: 'auto',
}

const modalTitleStyle: React.CSSProperties = {
  fontSize: '20px',
  fontWeight: 700,
  color: '#111827',
  marginBottom: '24px',
}

const errorStyle: React.CSSProperties = {
  padding: '12px 16px',
  background: '#FEF2F2',
  color: '#EF4444',
  fontSize: '14px',
  borderRadius: '8px',
  marginBottom: '16px',
}

const formGroupStyle: React.CSSProperties = {
  marginBottom: '16px',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '14px',
  fontWeight: 500,
  color: '#374151',
  marginBottom: '8px',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  border: '1px solid #E5E7EB',
  borderRadius: '8px',
  fontSize: '14px',
  color: '#1F2937',
  transition: 'border-color 0.2s ease-out',
}

const textareaStyle: React.CSSProperties = {
  resize: 'vertical',
  minHeight: '80px',
}

const modalActionsStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '12px',
  marginTop: '24px',
}

const cancelButtonStyle: React.CSSProperties = {
  padding: '12px 24px',
  background: '#F3F4F6',
  color: '#374151',
  fontSize: '14px',
  fontWeight: 500,
  borderRadius: '8px',
  transition: 'all 0.2s ease-out',
}

const submitButtonStyle: React.CSSProperties = {
  padding: '12px 24px',
  background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
  color: '#FFFFFF',
  fontSize: '14px',
  fontWeight: 600,
  borderRadius: '8px',
  transition: 'all 0.2s ease-out',
}

export default ProductManager
