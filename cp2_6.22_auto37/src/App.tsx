import { useState, useEffect, useCallback } from 'react';
import ProductList from './components/ProductList';
import OrderBoard from './components/OrderBoard';
import MergeView from './components/MergeView';

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  soldCount: number;
}

interface CartItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  userId: string;
  userName: string;
  items: CartItem[];
  createdAt: string;
}

interface MergedItem {
  productId: string;
  productName: string;
  category: string;
  totalQuantity: number;
  totalAmount: number;
  buyers: { userId: string; userName: string; quantity: number }[];
  pickupStatus: { [userId: string]: { picked: boolean; pickedAt?: string } };
}

const USERS = [
  { id: 'user1', name: '张三' },
  { id: 'user2', name: '李四' },
  { id: 'user3', name: '王五' },
];

function App() {
  const [currentUser, setCurrentUser] = useState(USERS[0]);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [mergedOrders, setMergedOrders] = useState<MergedItem[]>([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: '',
    stock: '',
    category: '其他',
  });
  const [selectedCategory, setSelectedCategory] = useState('全部');

  const fetchProducts = useCallback(async () => {
    const res = await fetch('/api/products');
    const data = await res.json();
    setProducts(data);
  }, []);

  const fetchUserOrders = useCallback(async (userId: string) => {
    const res = await fetch(`/api/orders?userId=${userId}`);
    const data = await res.json();
    setUserOrders(data);
  }, []);

  const fetchMergedOrders = useCallback(async () => {
    const res = await fetch('/api/merged-orders');
    const data = await res.json();
    setMergedOrders(data);
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchMergedOrders();
  }, [fetchProducts, fetchMergedOrders]);

  useEffect(() => {
    fetchUserOrders(currentUser.id);
  }, [currentUser.id, fetchUserOrders]);

  const addToCart = (product: Product, quantity: number) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          quantity,
          price: product.price,
        },
      ];
    });
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((item) => item.productId !== productId));
    } else {
      setCart((prev) =>
        prev.map((item) =>
          item.productId === productId ? { ...item, quantity } : item
        )
      );
    }
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const submitOrder = async () => {
    if (cart.length === 0) return;
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUser.id,
        userName: currentUser.name,
        items: cart,
      }),
    });
    if (res.ok) {
      setCart([]);
      fetchProducts();
      fetchUserOrders(currentUser.id);
      fetchMergedOrders();
    }
  };

  const cancelOrder = async (orderId: string) => {
    const res = await fetch(`/api/orders/${orderId}`, { method: 'DELETE' });
    if (res.ok) {
      fetchProducts();
      fetchUserOrders(currentUser.id);
      fetchMergedOrders();
    }
  };

  const updatePickupStatus = async (
    productId: string,
    userId: string,
    picked: boolean
  ) => {
    const res = await fetch(`/api/merged-orders/${productId}/pickup`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, picked }),
    });
    if (res.ok) {
      fetchMergedOrders();
    }
  };

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.price || !newProduct.stock) return;
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProduct),
    });
    if (res.ok) {
      fetchProducts();
      setShowProductModal(false);
      setNewProduct({ name: '', price: '', stock: '', category: '其他' });
    }
  };

  const totalOrders = mergedOrders.reduce(
    (sum, item) => sum + item.buyers.length,
    0
  );
  const totalProductTypes = mergedOrders.length;
  const totalAmount = mergedOrders.reduce(
    (sum, item) => sum + item.totalAmount,
    0
  );
  const totalPickupItems = mergedOrders.reduce(
    (sum, item) => sum + Object.values(item.pickupStatus).filter((p) => p.picked).length,
    0
  );
  const totalBuyerEntries = mergedOrders.reduce(
    (sum, item) => sum + item.buyers.length,
    0
  );
  const pickupRate = totalBuyerEntries > 0 ? totalPickupItems / totalBuyerEntries : 0;

  const categories = ['全部', ...Array.from(new Set(products.map((p) => p.category)))];

  return (
    <div style={{ minHeight: '100vh', background: '#fffbeb' }}>
      <header
        style={{
          padding: '16px 32px',
          background: '#ffffff',
          borderBottom: '2px solid #d97706',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 2px 8px rgba(217, 119, 6, 0.1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 24, color: '#d97706' }}>🛒</span>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#d97706' }}>
            社区团购订单管理
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={() => setShowProductModal(true)}
            style={{
              padding: '8px 16px',
              background: '#d97706',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500,
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.background = '#b45309';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.background = '#d97706';
            }}
          >
            + 添加商品
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#78350f', fontSize: 14 }}>当前用户：</span>
            <select
              value={currentUser.id}
              onChange={(e) => {
                const user = USERS.find((u) => u.id === e.target.value);
                if (user) {
                  setCurrentUser(user);
                  setCart([]);
                }
              }}
              style={{
                padding: '8px 12px',
                border: '2px solid #fbbf24',
                borderRadius: 8,
                background: '#fffbeb',
                color: '#78350f',
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {USERS.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <div
        style={{
          display: 'flex',
          gap: 20,
          padding: 20,
          maxWidth: '1400px',
          margin: '0 auto',
        }}
      >
        <aside
          style={{
            width: 300,
            flexShrink: 0,
            background: '#fef3c7',
            borderRadius: 12,
            padding: 20,
            boxShadow: '0 4px 12px rgba(217, 119, 6, 0.1)',
            height: 'calc(100vh - 100px)',
            overflowY: 'auto',
          }}
        >
          <OrderBoard
            cart={cart}
            orders={userOrders}
            onUpdateQuantity={updateCartQuantity}
            onRemoveItem={removeFromCart}
            onSubmitOrder={submitOrder}
            onCancelOrder={cancelOrder}
          />
        </aside>

        <main style={{ flex: 1, minWidth: 0 }}>
          <ProductList
            products={products}
            selectedCategory={selectedCategory}
            categories={categories}
            onCategoryChange={setSelectedCategory}
            onAddToCart={addToCart}
          />
        </main>

        <aside
          style={{
            width: 400,
            flexShrink: 0,
            background: '#fffbeb',
            borderRadius: 12,
            height: 'calc(100vh - 100px)',
            overflowY: 'auto',
          }}
        >
          <MergeView
            mergedOrders={mergedOrders}
            onUpdatePickup={updatePickupStatus}
          />
        </aside>
      </div>

      <footer
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: '#ffffff',
          padding: '12px 32px',
          borderTop: '2px solid #d97706',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          boxShadow: '0 -2px 8px rgba(217, 119, 6, 0.1)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: 12,
              color: '#92400e',
              marginBottom: 4,
            }}
          >
            总订单数
          </div>
          <div
            key={`orders-${totalOrders}`}
            className="fade-in"
            style={{ fontSize: 20, fontWeight: 700, color: '#d97706' }}
          >
            {totalOrders}
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: 12,
              color: '#92400e',
              marginBottom: 4,
            }}
          >
            商品种类
          </div>
          <div
            key={`types-${totalProductTypes}`}
            className="fade-in"
            style={{ fontSize: 20, fontWeight: 700, color: '#d97706' }}
          >
            {totalProductTypes}
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: 12,
              color: '#92400e',
              marginBottom: 4,
            }}
          >
            总金额
          </div>
          <div
            key={`amount-${totalAmount}`}
            className="fade-in"
            style={{ fontSize: 20, fontWeight: 700, color: '#d97706' }}
          >
            ¥{totalAmount.toFixed(2)}
          </div>
        </div>

        <div style={{ textAlign: 'center', width: 200 }}>
          <div
            style={{
              fontSize: 12,
              color: '#92400e',
              marginBottom: 4,
            }}
          >
            取货完成度
          </div>
          <div
            style={{
              height: 20,
              background: '#fef3c7',
              borderRadius: 10,
              overflow: 'hidden',
            }}
          >
            <div
              key={`progress-${pickupRate}`}
              className="fade-in"
              style={{
                height: '100%',
                width: `${pickupRate * 100}%`,
                background: '#10b981',
                borderRadius: 10,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
          <div
            style={{
              fontSize: 12,
              color: '#065f46',
              marginTop: 2,
              fontWeight: 500,
            }}
          >
            {(pickupRate * 100).toFixed(1)}%
          </div>
        </div>
      </footer>

      {showProductModal && (
        <div className="modal-overlay" onClick={() => setShowProductModal(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ minWidth: 400 }}
          >
            <h2
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: '#d97706',
                marginBottom: 20,
              }}
            >
              添加新商品
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 14,
                    color: '#78350f',
                    marginBottom: 6,
                    fontWeight: 500,
                  }}
                >
                  商品名称
                </label>
                <input
                  type="text"
                  value={newProduct.name}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, name: e.target.value })
                  }
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '2px solid #fbbf24',
                    borderRadius: 8,
                    fontSize: 14,
                    outline: 'none',
                  }}
                  placeholder="请输入商品名称"
                />
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 14,
                      color: '#78350f',
                      marginBottom: 6,
                      fontWeight: 500,
                    }}
                  >
                    单价（元）
                  </label>
                  <input
                    type="number"
                    value={newProduct.price}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, price: e.target.value })
                    }
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '2px solid #fbbf24',
                      borderRadius: 8,
                      fontSize: 14,
                      outline: 'none',
                    }}
                    placeholder="0.00"
                  />
                </div>

                <div style={{ flex: 1 }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 14,
                      color: '#78350f',
                      marginBottom: 6,
                      fontWeight: 500,
                    }}
                  >
                    库存数量
                  </label>
                  <input
                    type="number"
                    value={newProduct.stock}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, stock: e.target.value })
                    }
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '2px solid #fbbf24',
                      borderRadius: 8,
                      fontSize: 14,
                      outline: 'none',
                    }}
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 14,
                    color: '#78350f',
                    marginBottom: 6,
                    fontWeight: 500,
                  }}
                >
                  商品分类
                </label>
                <select
                  value={newProduct.category}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, category: e.target.value })
                  }
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '2px solid #fbbf24',
                    borderRadius: 8,
                    fontSize: 14,
                    outline: 'none',
                    background: '#fffbeb',
                  }}
                >
                  {['水果', '蔬菜', '肉类', '蛋奶', '零食', '烘焙', '日用品', '其他'].map(
                    (cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 12,
                marginTop: 24,
              }}
            >
              <button
                onClick={() => setShowProductModal(false)}
                style={{
                  padding: '10px 20px',
                  border: '2px solid #d97706',
                  background: '#fff',
                  color: '#d97706',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 500,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#fef3c7';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#fff';
                }}
              >
                取消
              </button>
              <button
                onClick={handleAddProduct}
                style={{
                  padding: '10px 20px',
                  background: '#d97706',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 500,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.background = '#b45309';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.background = '#d97706';
                }}
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ height: 80 }} />
    </div>
  );
}

export default App;