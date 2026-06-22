import { useEffect, useState, useCallback } from 'react';
import type { Product, Order, User, MergedOrderItem, CartItem, Stats, PickupFilter } from './types';
import ProductList from './components/ProductList';
import OrderBoard from './components/OrderBoard';
import MergeView from './components/MergeView';

const App = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [mergedOrders, setMergedOrders] = useState<MergedOrderItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [stats, setStats] = useState<Stats>({ totalOrders: 0, totalProducts: 0, totalAmount: 0, pickedRate: 0 });
  const [pickupFilter, setPickupFilter] = useState<PickupFilter>('all');
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [popupQty, setPopupQty] = useState(1);
  const [adminForm, setAdminForm] = useState({ name: '', price: '', stock: '', category: '水果' });

  const fetchAll = useCallback(async () => {
    try {
      const [u, p, o, m, s] = await Promise.all([
        fetch('/api/users').then(r => r.json()),
        fetch('/api/products').then(r => r.json()),
        currentUser ? fetch(`/api/orders?userId=${currentUser.id}`).then(r => r.json()) : Promise.resolve([]),
        fetch('/api/merged-orders').then(r => r.json()),
        fetch('/api/stats').then(r => r.json()),
      ]);
      setUsers(u);
      setProducts(p);
      setOrders(o);
      setMergedOrders(m);
      setStats(s);
      if (!currentUser && u.length > 0) setCurrentUser(u[0]);
    } catch (e) {
      console.error('fetch error', e);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (currentUser) {
      fetch(`/api/orders?userId=${currentUser.id}`).then(r => r.json()).then(setOrders);
    }
  }, [currentUser]);

  const addToCart = (product: Product, qty: number) => {
    setCart(prev => {
      const found = prev.find(c => c.productId === product.id);
      if (found) {
        const newQty = Math.min(found.quantity + qty, product.stock);
        return prev.map(c => c.productId === product.id ? { ...c, quantity: newQty } : c);
      }
      return [...prev, { productId: product.id, productName: product.name, quantity: qty, unitPrice: product.price, stock: product.stock }];
    });
    setSelectedProduct(null);
  };

  const updateCartQty = (productId: string, qty: number) => {
    setCart(prev => prev.map(c => c.productId === productId ? { ...c, quantity: Math.max(1, Math.min(qty, c.stock)) } : c));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(c => c.productId !== productId));
  };

  const cartTotal = cart.reduce((s, c) => s + c.unitPrice * c.quantity, 0);

  const submitOrder = async () => {
    if (!currentUser || cart.length === 0) return;
    await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUser.id,
        userName: currentUser.name,
        items: cart.map(c => ({ productId: c.productId, quantity: c.quantity })),
      }),
    });
    setCart([]);
    fetchAll();
  };

  const cancelOrder = async (orderId: string) => {
    await fetch(`/api/orders/${orderId}`, { method: 'DELETE' });
    fetchAll();
  };

  const modifyOrder = async (orderId: string, items: { productId: string; quantity: number }[]) => {
    await fetch(`/api/orders/${orderId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    });
    fetchAll();
  };

  const markPicked = async (productId: string, userId: string, picked: boolean) => {
    await fetch('/api/pickup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, userId, picked }),
    });
    fetchAll();
  };

  const addProduct = async () => {
    if (!adminForm.name || !adminForm.price || !adminForm.stock) return;
    await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: adminForm.name,
        price: Number(adminForm.price),
        stock: Number(adminForm.stock),
        category: adminForm.category,
      }),
    });
    setAdminForm({ name: '', price: '', stock: '', category: '水果' });
    fetchAll();
  };

  const updateStock = async (productId: string, stock: number) => {
    await fetch(`/api/products/${productId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stock }),
    });
    fetchAll();
  };

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setPopupQty(1);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-left">
          <h1 className="app-title">🛒 社区团购订单管理</h1>
          <label className="admin-toggle">
            <input type="checkbox" checked={isAdmin} onChange={e => setIsAdmin(e.target.checked)} />
            <span>管理员模式</span>
          </label>
        </div>
        <div className="header-right">
          <span className="user-label">当前用户：</span>
          <select
            className="user-select"
            value={currentUser?.id || ''}
            onChange={e => {
              const u = users.find(x => x.id === e.target.value);
              if (u) { setCurrentUser(u); setCart([]); }
            }}
          >
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
      </header>

      <main className="main-layout">
        <aside className="left-panel panel">
          <div className="panel-title">🧺 购物车</div>
          {cart.length === 0 ? (
            <div className="empty-tip">购物车是空的<br/>去中间选商品吧～</div>
          ) : (
            <>
              <div className="cart-list">
                {cart.map(c => (
                  <div key={c.productId} className="cart-item">
                    <div className="cart-item-info">
                      <div className="cart-item-name">{c.productName}</div>
                      <div className="cart-item-price">¥{c.unitPrice.toFixed(2)} × {c.quantity} = <b>¥{(c.unitPrice * c.quantity).toFixed(2)}</b></div>
                    </div>
                    <div className="cart-item-actions">
                      <input
                        type="number"
                        className="qty-input-sm"
                        min={1}
                        max={c.stock}
                        value={c.quantity}
                        onChange={e => updateCartQty(c.productId, Number(e.target.value))}
                      />
                      <button className="btn-danger-sm" onClick={() => removeFromCart(c.productId)}>×</button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="cart-total">
                <span>合计：</span>
                <span className="cart-total-amount">¥{cartTotal.toFixed(2)}</span>
              </div>
              <button className="btn-primary btn-submit" onClick={submitOrder}>📦 提交订单</button>
            </>
          )}

          <div className="panel-title mt-24">📋 {currentUser?.name}的订单</div>
          <OrderBoard orders={orders} userId={currentUser?.id || ''} onCancel={cancelOrder} onModify={modifyOrder} products={products} />
        </aside>

        <section className="center-panel">
          {isAdmin && (
            <div className="admin-form panel">
              <div className="panel-title">➕ 新增商品</div>
              <div className="admin-form-row">
                <input placeholder="商品名称" value={adminForm.name} onChange={e => setAdminForm({ ...adminForm, name: e.target.value })} />
                <input placeholder="单价" type="number" value={adminForm.price} onChange={e => setAdminForm({ ...adminForm, price: e.target.value })} />
                <input placeholder="库存" type="number" value={adminForm.stock} onChange={e => setAdminForm({ ...adminForm, stock: e.target.value })} />
                <select value={adminForm.category} onChange={e => setAdminForm({ ...adminForm, category: e.target.value })}>
                  <option>水果</option><option>零食</option><option>日用品</option><option>食品</option>
                </select>
                <button className="btn-primary" onClick={addProduct}>添加</button>
              </div>
            </div>
          )}
          <ProductList
            products={products}
            onProductClick={handleProductClick}
            isAdmin={isAdmin}
            onUpdateStock={updateStock}
          />
        </section>

        <aside className="right-panel panel">
          <div className="panel-title-row">
            <div className="panel-title">📊 合并订单</div>
            <div className="filter-tabs">
              <button className={pickupFilter === 'all' ? 'filter-btn active' : 'filter-btn'} onClick={() => setPickupFilter('all')}>全部</button>
              <button className={pickupFilter === 'unpicked' ? 'filter-btn active' : 'filter-btn'} onClick={() => setPickupFilter('unpicked')}>未取</button>
              <button className={pickupFilter === 'picked' ? 'filter-btn active' : 'filter-btn'} onClick={() => setPickupFilter('picked')}>已取</button>
            </div>
          </div>
          <MergeView mergedOrders={mergedOrders} onMarkPicked={markPicked} filter={pickupFilter} />
        </aside>
      </main>

      <footer className="stats-bar">
        <div className="stat-card fade-in">
          <div className="stat-label">总订单数</div>
          <div className="stat-value">{stats.totalOrders}</div>
        </div>
        <div className="stat-card fade-in">
          <div className="stat-label">商品种类</div>
          <div className="stat-value">{stats.totalProducts}</div>
        </div>
        <div className="stat-card fade-in">
          <div className="stat-label">总金额</div>
          <div className="stat-value">¥{stats.totalAmount.toFixed(2)}</div>
        </div>
        <div className="stat-card stat-progress fade-in">
          <div className="stat-label">取货完成 {Math.round(stats.pickedRate * 100)}%</div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${stats.pickedRate * 100}%` }} />
          </div>
        </div>
      </footer>

      {selectedProduct && (
        <div className="modal-mask" onClick={() => setSelectedProduct(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-title">{selectedProduct.name}</div>
            <div className="modal-info">
              <div>单价：¥{selectedProduct.price.toFixed(2)}</div>
              <div>库存：{selectedProduct.stock} 件</div>
            </div>
            <div className="modal-qty">
              <button className="qty-btn" onClick={() => setPopupQty(Math.max(1, popupQty - 1))}>−</button>
              <input
                type="number"
                className="qty-input"
                min={1}
                max={selectedProduct.stock}
                value={popupQty}
                onChange={e => setPopupQty(Math.max(1, Math.min(Number(e.target.value), selectedProduct.stock)))}
              />
              <button className="qty-btn" onClick={() => setPopupQty(Math.min(selectedProduct.stock, popupQty + 1))}>+</button>
            </div>
            <div className="modal-subtotal">小计：¥{(selectedProduct.price * popupQty).toFixed(2)}</div>
            <div className="modal-actions">
              <button className="btn-default" onClick={() => setSelectedProduct(null)}>取消</button>
              <button className="btn-primary" onClick={() => addToCart(selectedProduct, popupQty)}>确认加入</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
