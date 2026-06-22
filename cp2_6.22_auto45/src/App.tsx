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
import AnimatedNumber from './components/AnimatedNumber';

const API_BASE = '/api';

const App = () => {
  /* ───── 全局状态（数据流向：← fetch API → 向下props冒泡给子组件） ─────
   *
   *  State ← 数据源                    → 消费方（子组件 props）
   *  ────────────────────────────────────────────────────────────────────────
   *  users     ← GET /api/users          → 顶部用户下拉切换
   *  currentUser ← 用户选择              → 购物车隔离 / 订单过滤 / 提交订单
   *  products  ← GET /api/products       → ProductList 展示 / CartPanel 单价
   *  orders    ← GET /api/orders?userId  → OrderBoard 历史订单
   *  mergedOrders ← GET /api/merged-orders → MergeView 聚合展示 + 取货标记
   *  cart      ← 前端内存（setCart）     → CartPanel 显示 / 修改 / 移除
   *  stats     ← GET /api/stats          → 底部 AnimatedNumber 统计栏
   *  pickupFilter ← 本地 UI 交互         → MergeView 过滤显示
   *  isAdmin   ← 本地 checkbox           → 显示新增商品表单 + 库存调整
   *  selectedProduct ← ProductList 点击  → 控制 QtyPickerModal 显示/隐藏
   *  adminForm ← 本地受控表单            → POST /api/products 新增商品
   *  statsKey  ← fetchAll() 自增         → footer key 重挂载 + fadeIn 动画
   */
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
  const [adminForm, setAdminForm] = useState({ name: '', price: '', stock: '', category: '水果' });
  const [statsKey, setStatsKey] = useState(0);

  /* ───── 拉取所有数据（并发 5 个 API → 更新全部 state） ─────
   *
   *  调用链：
   *    useEffect 挂载 / currentUser 变化 → fetchAll()
   *    submitOrder / cancelOrder / markPicked 等写操作成功后 → fetchAll() 刷新
   *
   *  并发请求：
   *    GET /api/users          → setUsers()
   *    GET /api/products       → setProducts()
   *    GET /api/orders?uid=x   → setOrders()（仅当已选用户）
   *    GET /api/merged-orders  → setMergedOrders()
   *    GET /api/stats          → setStats() + statsKey++ 触发统计栏重挂载动画
   */
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
      setStatsKey((k) => k + 1);
      if (!currentUser && u.length > 0) setCurrentUser(u[0]);
    } catch (e) {
      console.error('[fetchAll] error:', e);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  /* 用户切换 effect：拉取该用户的历史订单
   *  数据流：顶部 <select> onChange → setCurrentUser → 触发本 effect
   *       → GET /api/orders?userId=xxx → setOrders → OrderBoard 重新渲染 */
  useEffect(() => {
    if (currentUser) {
      fetch(`${API_BASE}/orders?userId=${currentUser.id}`)
        .then((r) => r.json())
        .then(setOrders);
    }
  }, [currentUser]);

  /* ───── 购物车操作（全部为前端内存 state，未提交到后端） ─────
   *
   *  完整数据流：QtyPickerModal → addToCart → setCart
   *                ↕ (双向)
   *              CartPanel  → onUpdateQty / onRemove / onSubmit
   *                                  ↓
   *                          setCart（修改） / POST /api/orders（提交）
   */

  // QtyPickerModal 确认按钮 → 加入购物车（已存在则累加数量，上限为库存）
  // 触发点：用户点击商品卡片 → 弹浮层 → 点击"加入购物车"
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

  // CartPanel 修改数量 → 若 qty ≤ 0 则过滤移除，否则 clamp 到 [1, stock]
  // 数据流向：CartPanel 减号/输入 → onUpdateQty → setCart → 触发 re-render
  const updateCartQty = (productId: string, qty: number) => {
    setCart((prev) =>
      prev
        .map((c) =>
          c.productId === productId
            ? { ...c, quantity: Math.min(Math.max(0, qty), c.stock) } // 先允许 0
            : c,
        )
        .filter((c) => c.quantity > 0), // 数量为 0 的商品自动移除
    );
  };

  // CartPanel 移除商品（×按钮）→ 从 cart 中过滤掉
  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((c) => c.productId !== productId));
  };

  // CartPanel 提交订单 → 购物车 → 后端生成 Order 记录
  // 数据流：CartPanel 📦 按钮 → POST /api/orders → setCart([]) → fetchAll() 刷新
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

  /* ───── 订单操作（OrderBoard 组件冒泡上来的回调） ───── */

  // 取消订单 → 软删除（status='cancelled'）→ 刷新
  const cancelOrder = async (orderId: string) => {
    await fetch(`${API_BASE}/orders/${orderId}`, { method: 'DELETE' });
    fetchAll();
  };

  // 修改订单项数量 → PUT 更新 → 刷新
  const modifyOrder = async (orderId: string, items: { productId: string; quantity: number }[]) => {
    await fetch(`${API_BASE}/orders/${orderId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    });
    fetchAll();
  };

  /* ───── 取货操作（MergeView 按用户粒度标记） ─────
   *
   *  数据流：
   *    MergeView 每行"标记取货"按钮 → onClick → markPicked(pid, uid, !isPicked)
   *      → POST /api/pickup { productId, userId, picked }
   *        → 后端更新 pickups Map + pickupTimes Map（记录 ISO 时间戳）
   *          → fetchAll() 刷新 mergedOrders → MergeView 重新渲染（opacity 0.5 + ✓ + 时间戳）
   */
  const markPicked = async (productId: string, userId: string, picked: boolean) => {
    await fetch(`${API_BASE}/pickup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, userId, picked }),
    });
    fetchAll();
  };

  /* ───── 商品管理（管理员模式 isAdmin=true 时生效） ───── */

  // 新增商品 → POST /api/products → 清空表单 → 刷新
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

  // 调整商品库存 → PUT /api/products/:id → 刷新
  // 触发点：ProductList 管理员模式下的 📝 库存输入框 onChange
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

      {/* ─── 底部统计栏：4 项指标 + 取货进度条 ─── */}
      {/* 数据流向：
          GET /api/stats → stats state → AnimatedNumber 逐帧递增（0.3s easeOutCubic）
                              ↘ progress-fill width 过渡（0.6s ease-out） */}
      <footer className="stats-bar" key={statsKey}>
        <div className="stat-card fade-in">
          <div className="stat-label">总订单数</div>
          <div className="stat-value">
            <AnimatedNumber value={stats.totalOrders} duration={300} />
          </div>
        </div>
        <div className="stat-card fade-in">
          <div className="stat-label">商品种类</div>
          <div className="stat-value">
            <AnimatedNumber value={stats.totalProducts} duration={300} />
          </div>
        </div>
        <div className="stat-card fade-in">
          <div className="stat-label">总金额</div>
          <div className="stat-value">
            <AnimatedNumber value={stats.totalAmount} prefix="¥" decimals={2} duration={300} />
          </div>
        </div>
        <div className="stat-card stat-progress fade-in">
          <div className="stat-label">
            取货完成 <AnimatedNumber value={Math.round(stats.pickedRate * 100)} suffix="%" duration={300} />
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${stats.pickedRate * 100}%`,
                transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
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
