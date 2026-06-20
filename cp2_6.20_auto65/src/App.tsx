import { useState, useEffect, useCallback } from 'react';
import type { Member, Drink, Topping, OrderItem, Order, Recommendation } from './types';
import Menu from './Menu';
import OrderQueue from './OrderQueue';

const levelColors: Record<string, string> = {
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#FFD700',
  platinum: '#E5E4E2',
  diamond: '#B9F2FF',
};

const levelNames: Record<string, string> = {
  bronze: '青铜',
  silver: '白银',
  gold: '黄金',
  platinum: '铂金',
  diamond: '钻石',
};

const nextLevelThresholds: Record<string, number> = {
  bronze: 100,
  silver: 200,
  gold: 500,
  platinum: 1000,
  diamond: Infinity,
};

export default function App() {
  const [member, setMember] = useState<Member | null>(null);
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [toppings, setToppings] = useState<Topping[]>([]);
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [queueLength, setQueueLength] = useState(0);
  const [showCartModal, setShowCartModal] = useState(false);
  const [showOrderPanel, setShowOrderPanel] = useState(false);
  const [loginForm, setLoginForm] = useState({ nickname: '', email: '' });
  const [isRegister, setIsRegister] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [queueBounce, setQueueBounce] = useState(false);

  useEffect(() => {
    fetch('/api/drinks')
      .then((r) => r.json())
      .then((data) => {
        setDrinks(data.drinks);
        setToppings(data.toppings);
      })
      .catch(() => {});
  }, []);

  const fetchQueue = useCallback(() => {
    fetch('/api/orders/queue')
      .then((r) => r.json())
      .then((data) => {
        setActiveOrders(data.orders);
        if (data.queueLength !== queueLength) {
          setQueueLength(data.queueLength);
          setQueueBounce(true);
          setTimeout(() => setQueueBounce(false), 300);
        }
      })
      .catch(() => {});
  }, [queueLength]);

  useEffect(() => {
    fetchQueue();
    const timer = setInterval(fetchQueue, 2000);
    return () => clearInterval(timer);
  }, [fetchQueue]);

  useEffect(() => {
    if (!member) return;
    fetch(`/api/members/${member.id}/recommendations`)
      .then((r) => r.json())
      .then((data) => setRecommendations(data.recommendations))
      .catch(() => {});
  }, [member, cart]);

  const handleAuth = async () => {
    setLoginError('');
    if (!loginForm.email.trim()) {
      setLoginError('请输入邮箱');
      return;
    }
    if (isRegister && !loginForm.nickname.trim()) {
      setLoginError('请输入昵称');
      return;
    }

    const url = isRegister ? '/api/members/register' : '/api/members/login';
    const body = isRegister
      ? JSON.stringify(loginForm)
      : JSON.stringify({ email: loginForm.email });

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error);
        return;
      }
      setMember(data.member);
      setLoginForm({ nickname: '', email: '' });
    } catch {
      setLoginError('网络错误，请重试');
    }
  };

  const addToCart = (drink: Drink, selectedToppings: Topping[]) => {
    const existingIndex = cart.findIndex(
      (item) =>
        item.drink.id === drink.id &&
        JSON.stringify(item.toppings.map((t) => t.id).sort()) ===
          JSON.stringify(selectedToppings.map((t) => t.id).sort())
    );

    if (existingIndex >= 0) {
      const newCart = [...cart];
      newCart[existingIndex].quantity += 1;
      const toppingsPrice = selectedToppings.reduce((s, t) => s + t.price, 0);
      newCart[existingIndex].subtotal = (drink.price + toppingsPrice) * newCart[existingIndex].quantity;
      setCart(newCart);
    } else {
      const toppingsPrice = selectedToppings.reduce((s, t) => s + t.price, 0);
      setCart([
        ...cart,
        {
          drink,
          toppings: selectedToppings,
          quantity: 1,
          subtotal: drink.price + toppingsPrice,
        },
      ]);
    }
  };

  const removeFromCart = (index: number) => {
    const newCart = cart.filter((_, i) => i !== index);
    setCart(newCart);
  };

  const submitOrder = async () => {
    if (cart.length === 0) return;
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: member?.id || null,
          items: cart,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setCart([]);
        setShowCartModal(false);
        setQueueLength(data.queueLength);
        setQueueBounce(true);
        setTimeout(() => setQueueBounce(false), 300);
        if (member) {
          const updated = await fetch(`/api/members/${member.id}`).then((r) => r.json());
          if (updated.member) setMember(updated.member);
        }
        fetchQueue();
      }
    } catch {
      // ignore
    }
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (!member) {
    return (
      <div style={styles.authPage}>
        <div style={styles.authCard}>
          <div style={styles.authLogo}>☕</div>
          <h1 style={styles.authTitle}>温馨咖啡馆</h1>
          <p style={styles.authSubtitle}>{isRegister ? '加入会员，享专属优惠' : '欢迎回来'}</p>

          {isRegister && (
            <input
              style={styles.authInput}
              placeholder="请输入昵称"
              value={loginForm.nickname}
              onChange={(e) => setLoginForm({ ...loginForm, nickname: e.target.value })}
            />
          )}
          <input
            style={styles.authInput}
            placeholder="请输入邮箱"
            type="email"
            value={loginForm.email}
            onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
          />

          {loginError && <p style={styles.authError}>{loginError}</p>}

          <button style={styles.authButton} onClick={handleAuth}>
            {isRegister ? '注册并登录' : '登录'}
          </button>

          <p style={styles.authToggle}>
            {isRegister ? '已有账号？' : '还没有账号？'}
            <span style={styles.authToggleLink} onClick={() => setIsRegister(!isRegister)}>
              {isRegister ? '去登录' : '立即注册'}
            </span>
          </p>

          <p style={styles.authGuest}>
            <span style={styles.authToggleLink} onClick={() => setMember({
              id: '', nickname: '游客', email: '', totalSpent: 0, level: 'bronze',
              orderHistory: [], createdAt: Date.now(),
            })}>
              游客模式逛逛 →
            </span>
          </p>
        </div>
      </div>
    );
  }

  const progressForLevel = () => {
    const nextThreshold = nextLevelThresholds[member.level];
    if (nextThreshold === Infinity) return 1;
    const prevThreshold =
      member.level === 'bronze'
        ? 0
        : Object.entries(nextLevelThresholds).find(
            ([, v]) => v === nextThreshold
          )
        ? Object.values(nextLevelThresholds)[
            Math.max(
              0,
              Object.keys(nextLevelThresholds).indexOf(member.level) - 1
            )
          ]
        : 0;
    const progress =
      (member.totalSpent - prevThreshold) / (nextThreshold - prevThreshold);
    return Math.min(1, Math.max(0, progress));
  };

  const nextThreshold = nextLevelThresholds[member.level];

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.logo}>☕</span>
          <span style={styles.brandName}>温馨咖啡馆</span>
        </div>

        <div style={styles.headerCenter}>
          <div style={styles.queueBadge}>
            <span style={styles.queueLabel}>当前排队</span>
            <span
              style={{
                ...styles.queueNumber,
                animation: queueBounce ? 'numberBounce 0.3s ease-out' : undefined,
              }}
            >
              {queueLength}
            </span>
            <span style={styles.queueLabel}>人</span>
          </div>
        </div>

        <div style={styles.headerRight}>
          <div style={styles.memberInfo}>
            <svg width="56" height="56" viewBox="0 0 56 56" style={styles.avatarSvg}>
              <circle
                cx="28"
                cy="28"
                r="25"
                fill="none"
                stroke="#E8D5B7"
                strokeWidth="6"
              />
              <circle
                cx="28"
                cy="28"
                r="25"
                fill="none"
                stroke={levelColors[member.level]}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${progressForLevel() * 157} 157`}
                transform="rotate(-90 28 28)"
                style={{ animation: 'fillProgress 0.5s ease-out' }}
              />
              <text
                x="28"
                y="33"
                textAnchor="middle"
                fontSize="22"
                fill={levelColors[member.level]}
                fontWeight="bold"
              >
                {member.nickname.charAt(0)}
              </text>
            </svg>
            <div style={styles.memberText}>
              <div style={styles.memberName}>{member.nickname}</div>
              <div style={styles.memberLevel}>
                {levelNames[member.level]}会员 · 累计 ¥{member.totalSpent}
                {nextThreshold !== Infinity && (
                  <span style={styles.nextLevel}>
                    {' '}· 再消费¥{nextThreshold - member.totalSpent}升级
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            style={styles.logoutButton}
            onClick={() => {
              setMember(null);
              setCart([]);
            }}
          >
            退出
          </button>
        </div>
      </header>

      <div style={styles.mainContent}>
        <div style={styles.menuSection}>
          <Menu
            drinks={drinks}
            toppings={toppings}
            onAddToCart={addToCart}
            recommendations={member.id ? recommendations : []}
          />
        </div>

        <div
          style={{
            ...styles.orderSection,
            ...(showOrderPanel ? styles.orderSectionExpanded : {}),
          }}
        >
          <div
            style={styles.orderPanel}
            onClick={() => window.innerWidth < 768 && setShowOrderPanel(true)}
          >
            <div style={styles.orderPanelHeader}>
              <h3 style={styles.orderPanelTitle}>🛒 订单摘要</h3>
              {cartCount > 0 && (
                <span style={styles.cartCountBadge}>{cartCount}</span>
              )}
            </div>

            <div style={styles.orderPanelBody}>
              {cart.length === 0 ? (
                <div style={styles.emptyCart}>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>☕</div>
                  <p style={styles.emptyCartText}>购物车还是空的</p>
                  <p style={styles.emptyCartHint}>从左侧菜单选择饮品开始下单吧</p>
                </div>
              ) : (
                <>
                  {cart.map((item, index) => (
                    <div key={index} style={styles.cartItem}>
                      <div style={styles.cartItemInfo}>
                        <span style={styles.cartItemEmoji}>{item.drink.image}</span>
                        <div style={styles.cartItemDetails}>
                          <div style={styles.cartItemName}>
                            {item.drink.name}
                            {item.quantity > 1 && (
                              <span style={styles.cartItemQty}>×{item.quantity}</span>
                            )}
                          </div>
                          {item.toppings.length > 0 && (
                            <div style={styles.cartItemToppings}>
                              {item.toppings.map((t) => t.name).join('、')}
                            </div>
                          )}
                        </div>
                      </div>
                      <div style={styles.cartItemRight}>
                        <span style={styles.cartItemPrice}>¥{item.subtotal}</span>
                        <button
                          style={styles.removeItemBtn}
                          onClick={() => removeFromCart(index)}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                  <div style={styles.cartTotal}>
                    <span>合计</span>
                    <span style={styles.cartTotalPrice}>¥{cartTotal}</span>
                  </div>
                  <button
                    style={styles.submitOrderBtn}
                    onClick={() => setShowCartModal(true)}
                  >
                    加入订单
                  </button>
                </>
              )}

              <div style={{ ...styles.queueSection, marginTop: cart.length > 0 ? '20px' : '0' }}>
                <OrderQueue orders={activeOrders} />
              </div>
            </div>

            {window.innerWidth < 768 && showOrderPanel && (
              <button
                style={styles.closePanelBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowOrderPanel(false);
                }}
              >
                关闭
              </button>
            )}
          </div>

          {window.innerWidth < 768 && !showOrderPanel && cartCount > 0 && (
            <div style={styles.mobileOrderBar}>
              <span>🛒 {cartCount}件商品</span>
              <span style={styles.mobileOrderTotal}>¥{cartTotal}</span>
              <button
                style={styles.mobileOrderBtn}
                onClick={() => setShowCartModal(true)}
              >
                下单
              </button>
            </div>
          )}
        </div>
      </div>

      {showCartModal && (
        <div style={styles.modalOverlay} onClick={() => setShowCartModal(false)}>
          <div
            style={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={styles.modalHeader}>
              <h3>确认订单</h3>
              <button style={styles.modalClose} onClick={() => setShowCartModal(false)}>
                ✕
              </button>
            </div>
            <div style={styles.modalBody}>
              {cart.map((item, index) => (
                <div key={index} style={styles.modalItem}>
                  <span>{item.drink.image} {item.drink.name}</span>
                  {item.toppings.length > 0 && (
                    <span style={styles.modalItemToppings}>
                      + {item.toppings.map((t) => t.name).join('、')}
                    </span>
                  )}
                  <span style={styles.modalItemRight}>
                    ×{item.quantity} · ¥{item.subtotal}
                  </span>
                </div>
              ))}
              <div style={styles.modalTotal}>
                <span>总计</span>
                <span style={styles.modalTotalPrice}>¥{cartTotal}</span>
              </div>
            </div>
            <button style={styles.confirmOrderBtn} onClick={submitOrder}>
              确认下单
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: '100vh',
    backgroundColor: '#FAF0E6',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 24px',
    backgroundColor: '#FFF8E7',
    boxShadow: '0 2px 8px rgba(62, 39, 35, 0.08)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  logo: { fontSize: '28px' },
  brandName: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#3E2723',
  },
  headerCenter: {
    display: 'flex',
    alignItems: 'center',
  },
  queueBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 20px',
    backgroundColor: '#6F4E37',
    borderRadius: '20px',
    color: 'white',
  },
  queueLabel: { fontSize: '13px' },
  queueNumber: {
    fontSize: '22px',
    fontWeight: 'bold',
    minWidth: '28px',
    textAlign: 'center',
    display: 'inline-block',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  memberInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  avatarSvg: {
    display: 'block',
  },
  memberText: {
    display: 'flex',
    flexDirection: 'column',
  },
  memberName: {
    fontWeight: 'bold',
    color: '#3E2723',
    fontSize: '14px',
  },
  memberLevel: {
    fontSize: '11px',
    color: '#8D6E63',
  },
  nextLevel: { color: '#6F4E37', fontWeight: 'bold' },
  logoutButton: {
    padding: '6px 14px',
    borderRadius: '6px',
    backgroundColor: 'transparent',
    color: '#8D6E63',
    fontSize: '13px',
    border: '1px solid #D7CCC8',
  },
  mainContent: {
    display: 'flex',
    minHeight: 'calc(100vh - 72px)',
    position: 'relative',
  },
  menuSection: {
    width: '70%',
    padding: '24px',
    paddingBottom: window.innerWidth < 768 ? '80px' : '24px',
    overflowY: 'auto',
  },
  orderSection: {
    width: '30%',
    position: 'sticky',
    top: '72px',
    height: 'calc(100vh - 72px)',
  },
  orderSectionExpanded: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100vh',
    zIndex: 200,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  orderPanel: {
    backgroundColor: '#FFF8E7',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    borderLeft: '1px solid #EFEBE9',
  },
  orderPanelHeader: {
    padding: '16px 20px',
    borderBottom: '1px solid #EFEBE9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orderPanelTitle: {
    fontSize: '16px',
    color: '#3E2723',
  },
  cartCountBadge: {
    backgroundColor: '#6F4E37',
    color: 'white',
    borderRadius: '10px',
    padding: '2px 8px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  orderPanelBody: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
  },
  emptyCart: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    color: '#A1887F',
  },
  emptyCartText: {
    fontSize: '15px',
    color: '#5D4037',
    marginBottom: '4px',
  },
  emptyCartHint: {
    fontSize: '12px',
    color: '#A1887F',
  },
  cartItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '12px',
    backgroundColor: 'white',
    borderRadius: '8px',
    marginBottom: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  cartItemInfo: {
    display: 'flex',
    gap: '10px',
    flex: 1,
  },
  cartItemEmoji: { fontSize: '24px' },
  cartItemDetails: { flex: 1 },
  cartItemName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#3E2723',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  cartItemQty: {
    fontSize: '12px',
    color: '#6F4E37',
    fontWeight: 'bold',
  },
  cartItemToppings: {
    fontSize: '11px',
    color: '#8D6E63',
    marginTop: '3px',
  },
  cartItemRight: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '6px',
  },
  cartItemPrice: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#6F4E37',
  },
  removeItemBtn: {
    backgroundColor: 'transparent',
    color: '#A1887F',
    fontSize: '14px',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  cartTotal: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 4px',
    borderTop: '1px dashed #D7CCC8',
    marginTop: '8px',
    fontSize: '14px',
    color: '#5D4037',
  },
  cartTotalPrice: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#6F4E37',
  },
  submitOrderBtn: {
    width: '100%',
    padding: '14px',
    backgroundColor: '#6F4E37',
    color: 'white',
    borderRadius: '6px',
    fontSize: '15px',
    fontWeight: 'bold',
    marginTop: '12px',
  },
  queueSection: {
    borderTop: '1px solid #EFEBE9',
    paddingTop: '16px',
  },
  closePanelBtn: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    padding: '8px 16px',
    borderRadius: '6px',
    backgroundColor: '#D7CCC8',
    color: '#3E2723',
  },
  mobileOrderBar: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50px',
    backgroundColor: '#FFF8E7',
    borderTop: '1px solid #D7CCC8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px',
    zIndex: 150,
  },
  mobileOrderTotal: {
    fontWeight: 'bold',
    color: '#6F4E37',
  },
  mobileOrderBtn: {
    padding: '8px 24px',
    backgroundColor: '#6F4E37',
    color: 'white',
    borderRadius: '6px',
    fontWeight: 'bold',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    zIndex: 300,
  },
  modalContent: {
    width: '100%',
    maxWidth: '600px',
    backgroundColor: 'white',
    borderRadius: '16px 16px 0 0',
    padding: '20px',
    animation: 'slideUp 0.3s ease-out',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  modalClose: {
    backgroundColor: 'transparent',
    fontSize: '20px',
    color: '#8D6E63',
    padding: '4px 10px',
    borderRadius: '4px',
  },
  modalBody: {
    maxHeight: '50vh',
    overflowY: 'auto',
  },
  modalItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
    borderBottom: '1px solid #EFEBE9',
    flexWrap: 'wrap',
    gap: '4px',
  },
  modalItemToppings: {
    fontSize: '12px',
    color: '#8D6E63',
    width: '100%',
    marginLeft: '28px',
  },
  modalItemRight: {
    fontSize: '14px',
    color: '#6F4E37',
    fontWeight: '600',
  },
  modalTotal: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 0',
    fontSize: '16px',
    color: '#3E2723',
  },
  modalTotalPrice: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#6F4E37',
  },
  confirmOrderBtn: {
    width: '100%',
    padding: '16px',
    backgroundColor: '#6F4E37',
    color: 'white',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    marginTop: '8px',
  },
  authPage: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #FAF0E6 0%, #E8D5B7 100%)',
    padding: '20px',
  },
  authCard: {
    width: '100%',
    maxWidth: '400px',
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '40px 32px',
    boxShadow: '0 8px 32px rgba(62, 39, 35, 0.12)',
    animation: 'fadeIn 0.3s ease-out',
  },
  authLogo: {
    fontSize: '56px',
    textAlign: 'center',
    marginBottom: '8px',
  },
  authTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#3E2723',
    marginBottom: '8px',
  },
  authSubtitle: {
    fontSize: '14px',
    textAlign: 'center',
    color: '#8D6E63',
    marginBottom: '28px',
  },
  authInput: {
    width: '100%',
    padding: '14px 16px',
    border: '1px solid #D7CCC8',
    borderRadius: '8px',
    fontSize: '14px',
    marginBottom: '12px',
    color: '#3E2723',
    backgroundColor: '#FFFBF5',
    transition: 'all 0.2s ease-out',
  },
  authError: {
    fontSize: '13px',
    color: '#D84315',
    marginBottom: '12px',
    textAlign: 'center',
  },
  authButton: {
    width: '100%',
    padding: '14px',
    backgroundColor: '#6F4E37',
    color: 'white',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: 'bold',
    marginBottom: '16px',
  },
  authToggle: {
    fontSize: '13px',
    textAlign: 'center',
    color: '#8D6E63',
    marginBottom: '8px',
  },
  authToggleLink: {
    color: '#6F4E37',
    fontWeight: 'bold',
    marginLeft: '4px',
    cursor: 'pointer',
  },
  authGuest: {
    fontSize: '13px',
    textAlign: 'center',
    marginTop: '12px',
    paddingTop: '16px',
    borderTop: '1px solid #EFEBE9',
  },
};
