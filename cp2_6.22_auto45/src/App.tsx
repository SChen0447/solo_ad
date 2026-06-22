/**
 * App.tsx — React 应用主组件（全局状态中心 + 路由/布局）
 *
 * ═══════════════════════════════════════════════════════════════════
 * 文件依赖 / Import 关系：
 *   React hooks  -> useEffect, useState, useCallback
 *   types.ts     -> Product / Order / User / MergedOrderItem / CartItem / Stats / PickupFilter
 *   components/ProductList.tsx    -> 商品网格展示（点击商品 → 弹出浮层）
 *   components/OrderBoard.tsx     -> 当前用户的历史订单
 *   components/MergeView.tsx      -> 按商品合并的订单视图 + 取货标记
 *   components/CartPanel.tsx      -> 左侧购物车面板（独立组件）
 *   components/QtyPickerModal.tsx -> 点击商品后的数量选择浮层
 *
 * ═══════════════════════════════════════════════════════════════════
 * 数据流向（HTTP API 调用链）：
 *    React App.tsx ──fetch──▶ Express server.ts :3000
 *       │                          │
 *       │  GET  /api/users         ├─ 返回预设用户（张三/李四/王五）
 *       │  GET  /api/products      ├─ 返回商品目录（10 种初始商品）
 *       │  POST /api/products      ├─ 管理员新增商品
 *       │  PUT  /api/products/:id  ├─ 调整商品库存
 *       │  GET  /api/orders        ├─ 按 userId 过滤返回当前用户订单
 *       │  POST /api/orders        ├─ 提交购物车生成订单记录
 *       │  PUT  /api/orders/:id    ├─ 修改订单项数量
 *       │  DELETE /api/orders/:id  ├─ 取消订单（软删除 status='cancelled'）
 *       │  GET  /api/merged-orders ├─ 后端按 productId 合并所有订单
 *       │  POST /api/pickup        ├─ 按 (productId, userId) 粒度标记取货
 *       │  GET  /api/stats         └─ 返回统计（订单数 / 种类 / 金额 / 取货率）
 *
 * ═══════════════════════════════════════════════════════════════════
 * Props 向下传递 / 回调向上冒泡：
 *   App (state)
 *    ├─ products          ──▶ ProductList (onProductClick → selectedProduct)
 *    ├─ cart              ──▶ CartPanel    (onUpdateQty / onRemove / onSubmit)
 *    ├─ orders + products ──▶ OrderBoard   (onCancel / onModify)
 *    ├─ mergedOrders      ──▶ MergeView    (onMarkPicked)
 *    └─ selectedProduct   ──▶ QtyPickerModal (onConfirm → addToCart)
 */

import { useEffect, useState, useCallback } from 'react';
import type { Product, Order, User, MergedOrderItem, CartItem, Stats, PickupFilter } from './types';
import ProductList from './components/ProductList';
import OrderBoard from './components/OrderBoard';
import MergeView from './components/MergeView';
import CartPanel from './components/CartPanel';
import QtyPickerModal from './components/QtyPickerModal';

const API_BASE = '/api';

const App = () => {
  /* ───── 全局状态 ───── */
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [mergedOrders, setMergedOrders] = useState<MergedOrderItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);                   // 当前用户的未提交购物车
  const [stats, setStats] = useState<Stats>({ totalOrders: 0, totalProducts: 0, totalAmount: 0, pickedRate: 0 });
  const [pickupFilter, setPickupFilter] = useState<PickupFilter>('all'); // 合并视图过滤
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null); // 数量浮层绑定
  const [adminForm, setAdminForm] = useState({ name: '', price: '', stock: '', category: '水果' });
  const [statsKey, setStatsKey] = useState(0);                      // 强制重新触发统计动画

  /* ───── 拉取所有数据 ───── */
  const fetchAll = useCallback(async () => {
    try {
      const [u, p, o, m, s] = await Promise.all([
        fetch(`${API_BASE}/users`).then((r) => r.json()),
        fetch(`${API_BASE}/products`).then((r) => r.json()),
        currentUser ? fetch(`${API_BASE}/orders?userId=${currentUser.id}`).then((r) => r.json()) : Promise.resolve([]),
        fetch(`${API_BASE}/merged-orders`).then((r) => r.json()),
        fetch(`${API_BASE}/stats`).then((r) => r.json()),
      ]);
      setUsers(u);
      setProducts(p);
      setOrders(o);
      setMergedOrders(m);
      setStats(s);
      setStatsKey((k) => k + 1); // 触发淡入动画
      if (!currentUser && u.length > 0) setCurrentUser(u[0]);
    } catch (e) {
      console.error('[fetchAll] error:', e);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (currentUser) {
      fetch(`${API_BASE}/orders?userId=${currentUser.id}`)
        .then((r) => r.json())
        .then(setOrders);
    }
  }, [currentUser]);

  /* ───── 购物车操作 ───── */

  // QtyPickerModal 确认按钮调用 → 加入购物车（仅前端状态，不提交）
  const addToCart = (product: Product, qty: number) => {
    setCart((prev) => {
      const found = prev.find((c) => c.productId === product.id);
      if (found) {
        const newQty = Math.min(found.quantity + qty, product.stock);
        return prev.map((c) => (c.productId === product.id ? { ...c, quantity: newQty } : c));
      }
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          quantity: qty,
          unitPrice: product.price,
          stock: product.stock,
        },
      ];
    });
    setSelectedProduct(null);
  };

  // CartPanel 修改数量 → 直接更新 cart state
  const updateCartQty = (productId: string, qty: number) => {
    setCart((prev) =>
      prev.map((c) =>
        c.productId === productId ? { ...c, quantity: Math.max(1, Math.min(qty, c.stock)) } : c,
      ),
    );
  };

  // CartPanel 移除商品 → 从 cart 中过滤掉
  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((c) => c.productId !== productId));
  };

  // CartPanel 提交订单按钮 → POST /api/orders → 清空购物车 → 刷新数据
  const submitOrder = async () => {
    if (!currentUser || cart.length === 0) return;
    await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUser.id,
        userName: currentUser.name,
        items: cart.map((c) => ({ productId: c.productId, quantity: c.quantity })),
      }),
    });
    setCart([]);
    fetchAll();
  };

  /* ───── 订单操作 ───── */

  const cancelOrder = async (orderId: string) => {
    await fetch(`${API_BASE}/orders/${orderId}`, { method: 'DELETE' });
    fetchAll();
  };

  const modifyOrder = async (orderId: string, items: { productId: string; quantity: number }[]) => {
    await fetch(`${API_BASE}/orders/${orderId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    });
    fetchAll();
  };

  /* ───── 取货操作（MergeView 按用户粒度标记） ───── */

  const markPicked = async (productId: string, userId: string, picked: boolean) => {
    await fetch(`${API_BASE}/pickup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, userId, picked }),
    });
    fetchAll();
  };

  /* ───── 商品管理（管理员） ───── */

  const addProduct = async () => {
    if (!adminForm.name || !adminForm.price || !adminForm.stock) return;
    await fetch(`${API_BASE}/products`, {
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
    await fetch(`${API_BASE}/products/${productId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stock }),
    });
    fetchAll();
  };

  /* ───── ProductList 点击商品 → 打开数量浮层 ───── */

  const handleProductClick = (product: Product) => {
    if (product.stock <= 0) return;
    setSelectedProduct(product);
  };

  /* ═══════════════════════════════════════════════════════ */

  return (
    <div className="app-container">
      {/* ─── 顶部导航：用户切换 + 管理员模式 ─── */}
      <header className="app-header">
        <div className="header-left">
          <h1 className="app-title">🛒 社区团购订单管理</h1>
          <label className="admin-toggle">
            <input
              type="checkbox"
              checked={isAdmin}
              onChange={(e) => setIsAdmin(e.target.checked)}
            />
            <span>管理员模式</span>
          </label>
        </div>
        <div className="header-right">
          <span className="user-label">当前用户：</span>
          <select
            className="user-select"
            value={currentUser?.id || ''}
            onChange={(e) => {
              const u = users.find((x) => x.id === e.target.value);
              if (u) {
                setCurrentUser(u);
                setCart([]); // 切换用户清空购物车
              }
            }}
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* ─── 三栏布局：左 购物车 + 订单 / 中 商品 / 右 合并视图 ─── */}
      <main className="main-layout">
        {/* 左栏：CartPanel 购物车（独立组件） + OrderBoard 历史订单 */}
        <aside className="left-panel panel">
          <CartPanel
            cartItems={cart}
            onUpdateQty={updateCartQty}
            onRemove={removeFromCart}
            onSubmit={submitOrder}
          />

          <div className="panel-title mt-24">📋 {currentUser?.name}的订单</div>
          <OrderBoard
            orders={orders}
            userId={currentUser?.id || ''}
            onCancel={cancelOrder}
            onModify={modifyOrder}
            products={products}
          />
        </aside>

        {/* 中栏：管理员新增商品表单 + 商品网格 */}
        <section className="center-panel">
          {isAdmin && (
            <div className="admin-form panel">
              <div className="panel-title">➕ 新增商品</div>
              <div className="admin-form-row">
                <input
                  placeholder="商品名称"
                  value={adminForm.name}
                  onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
                />
                <input
                  placeholder="单价"
                  type="number"
                  value={adminForm.price}
                  onChange={(e) => setAdminForm({ ...adminForm, price: e.target.value })}
                />
                <input
                  placeholder="库存"
                  type="number"
                  value={adminForm.stock}
                  onChange={(e) => setAdminForm({ ...adminForm, stock: e.target.value })}
                />
                <select
                  value={adminForm.category}
                  onChange={(e) => setAdminForm({ ...adminForm, category: e.target.value })}
                >
                  <option>水果</option>
                  <option>零食</option>
                  <option>日用品</option>
                  <option>食品</option>
                </select>
                <button className="btn-primary" onClick={addProduct}>
                  添加
                </button>
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

        {/* 右栏：合并视图（过滤标签 + 合并订单表格） */}
        <aside className="right-panel panel">
          <div className="panel-title-row">
            <div className="panel-title">📊 合并订单</div>
            <div className="filter-tabs">
              <button
                className={pickupFilter === 'all' ? 'filter-btn active' : 'filter-btn'}
                onClick={() => setPickupFilter('all')}
              >
                全部
              </button>
              <button
                className={pickupFilter === 'unpicked' ? 'filter-btn active' : 'filter-btn'}
                onClick={() => setPickupFilter('unpicked')}
              >
                未取
              </button>
              <button
                className={pickupFilter === 'picked' ? 'filter-btn active' : 'filter-btn'}
                onClick={() => setPickupFilter('picked')}
              >
                已取
              </button>
            </div>
          </div>
          <MergeView
            mergedOrders={mergedOrders}
            onMarkPicked={markPicked}
            filter={pickupFilter}
          />
        </aside>
      </main>

      {/* ─── 底部统计栏：4 项指标 + 取货进度条，变化时 0.3s 淡入 ─── */}
      <footer className="stats-bar" key={statsKey}>
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
            <div
              className="progress-fill"
              style={{ width: `${stats.pickedRate * 100}%` }}
            />
          </div>
        </div>
      </footer>

      {/* ─── 数量选择浮层（点击商品卡片触发） ─── */}
      {selectedProduct && (
        <QtyPickerModal
          product={selectedProduct}
          onConfirm={addToCart}
          onCancel={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
};

export default App;
