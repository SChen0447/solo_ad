import { useState, useEffect, useCallback } from 'react';
import Menu from './Menu';
import OrderQueue from './OrderQueue';
import MemberPanel from './components/MemberPanel';
import OrderSummary from './components/OrderSummary';
import RecommendCard from './components/RecommendCard';
import LoginModal from './components/LoginModal';
import ConfirmModal from './components/ConfirmModal';
import type { Member, Drink, Topping, CartItem, QueueInfo, Recommendation } from './types';

function App() {
  const [member, setMember] = useState<Member | null>(null);
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [toppings, setToppings] = useState<Topping[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [queueInfo, setQueueInfo] = useState<QueueInfo | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [showLogin, setShowLogin] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [mobileOrderExpanded, setMobileOrderExpanded] = useState(false);
  const [queueBump, setQueueBump] = useState(false);

  useEffect(() => {
    fetch('/api/menu')
      .then(res => res.json())
      .then(data => setDrinks(data))
      .catch(err => console.error('Failed to load menu:', err));

    fetch('/api/toppings')
      .then(res => res.json())
      .then(data => setToppings(data))
      .catch(err => console.error('Failed to load toppings:', err));

    fetch('/api/orders/queue')
      .then(res => res.json())
      .then(data => setQueueInfo(data))
      .catch(err => console.error('Failed to load queue:', err));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      fetch('/api/orders/queue')
        .then(res => res.json())
        .then(data => {
          if (queueInfo && data.totalInQueue !== queueInfo.totalInQueue) {
            setQueueBump(true);
            setTimeout(() => setQueueBump(false), 300);
          }
          setQueueInfo(data);
        })
        .catch(err => console.error('Failed to load queue:', err));
    }, 5000);

    return () => clearInterval(interval);
  }, [queueInfo]);

  useEffect(() => {
    if (member) {
      fetch(`/api/recommendations/${member.id}`)
        .then(res => res.json())
        .then(data => setRecommendations(data))
        .catch(err => console.error('Failed to load recommendations:', err));
    }
  }, [member]);

  const handleLogin = useCallback((memberData: Member) => {
    setMember(memberData);
    setShowLogin(false);
  }, []);

  const handleLogout = useCallback(() => {
    setMember(null);
    setCart([]);
  }, []);

  const addToCart = useCallback((drink: Drink, selectedToppings: string[]) => {
    setCart(prev => {
      const toppingIds = selectedToppings.sort().join(',');
      const existingIndex = prev.findIndex(
        item => item.drinkId === drink.id && item.toppings.sort().join(',') === toppingIds
      );

      if (existingIndex >= 0) {
        const newCart = [...prev];
        newCart[existingIndex] = {
          ...newCart[existingIndex],
          quantity: newCart[existingIndex].quantity + 1,
        };
        return newCart;
      }

      const toppingList = toppings.filter(t => selectedToppings.includes(t.id));
      const totalPrice = drink.price + toppingList.reduce((sum, t) => sum + t.price, 0);

      return [
        ...prev,
        {
          drinkId: drink.id,
          drinkName: drink.name,
          price: totalPrice,
          basePrice: drink.price,
          toppings: selectedToppings,
          toppingNames: toppingList.map(t => t.name),
          quantity: 1,
        },
      ];
    });
  }, [toppings]);

  const removeFromCart = useCallback((index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleCheckout = useCallback(() => {
    if (!member) {
      setShowLogin(true);
      return;
    }
    if (cart.length === 0) return;
    setShowConfirm(true);
  }, [member, cart]);

  const confirmOrder = useCallback(async () => {
    if (!member || cart.length === 0) return;

    const items = cart.map(item => ({
      drinkId: item.drinkId,
      drinkName: item.drinkName,
      price: item.price,
      toppings: item.toppings,
    }));

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: member.id,
          items,
        }),
      });

      if (response.ok) {
        const order = await response.json();
        setQueueBump(true);
        setTimeout(() => setQueueBump(false), 300);

        const updatedMember = await fetch(`/api/members/${member.id}`).then(res => res.json());
        setMember(updatedMember);

        const queueData = await fetch('/api/orders/queue').then(res => res.json());
        setQueueInfo(queueData);

        const recData = await fetch(`/api/recommendations/${member.id}`).then(res => res.json());
        setRecommendations(recData);

        setCart([]);
        setShowConfirm(false);
        console.log('订单已提交:', order);
      }
    } catch (err) {
      console.error('Failed to place order:', err);
    }
  }, [member, cart]);

  const handleRecommendClick = useCallback((rec: Recommendation) => {
    const drink = drinks.find(d => d.id === rec.drinkId);
    if (drink) {
      addToCart(drink, []);
    }
  }, [drinks, addToCart]);

  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-left">
          <h1 className="app-title">☕ 暖阁咖啡</h1>
          {queueInfo && (
            <div className={`queue-badge ${queueBump ? 'bump' : ''}`}>
              <span className="queue-label">当前排队</span>
              <span className="queue-number">{queueInfo.totalInQueue}</span>
              <span className="queue-label">人</span>
            </div>
          )}
        </div>
        <div className="header-right">
          {member ? (
            <MemberPanel member={member} onLogout={handleLogout} />
          ) : (
            <button className="login-btn" onClick={() => setShowLogin(true)}>
              登录 / 注册
            </button>
          )}
        </div>
      </header>

      <main className="main-content">
        <section className="menu-section">
          <Menu
            drinks={drinks}
            toppings={toppings}
            onAddToCart={addToCart}
          />
        </section>

        <aside className="order-sidebar">
          <OrderSummary
            cart={cart}
            totalPrice={totalPrice}
            onRemove={removeFromCart}
            onCheckout={handleCheckout}
          />
          {queueInfo && <OrderQueue queueInfo={queueInfo} />}
        </aside>
      </main>

      {member && recommendations.length > 0 && (
        <RecommendCard
          recommendations={recommendations}
          onAdd={handleRecommendClick}
        />
      )}

      <div
        className={`mobile-order-bar ${mobileOrderExpanded ? 'expanded' : ''}`}
        onClick={() => setMobileOrderExpanded(!mobileOrderExpanded)}
      >
        <div className="mobile-bar-content">
          <span>🛒 购物车 ({totalItems})</span>
          <span className="mobile-total">¥{totalPrice}</span>
        </div>
        {mobileOrderExpanded && (
          <div className="mobile-order-panel">
            <OrderSummary
              cart={cart}
              totalPrice={totalPrice}
              onRemove={removeFromCart}
              onCheckout={handleCheckout}
            />
            {queueInfo && <OrderQueue queueInfo={queueInfo} />}
          </div>
        )}
      </div>

      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          onLogin={handleLogin}
        />
      )}

      {showConfirm && (
        <ConfirmModal
          cart={cart}
          totalPrice={totalPrice}
          onClose={() => setShowConfirm(false)}
          onConfirm={confirmOrder}
        />
      )}
    </div>
  );
}

export default App;
