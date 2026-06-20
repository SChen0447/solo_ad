import { useState } from 'react';
import type { Drink, Topping, Recommendation } from './types';

interface MenuProps {
  drinks: Drink[];
  toppings: Topping[];
  onAddToCart: (drink: Drink, toppings: Topping[]) => void;
  recommendations: Recommendation[];
}

export default function Menu({ drinks, toppings, onAddToCart, recommendations }: MenuProps) {
  const [expandedDrink, setExpandedDrink] = useState<string | null>(null);
  const [selectedToppings, setSelectedToppings] = useState<Record<string, string[]>>({});

  const toggleTopping = (drinkId: string, toppingId: string) => {
    const current = selectedToppings[drinkId] || [];
    if (current.includes(toppingId)) {
      setSelectedToppings({
        ...selectedToppings,
        [drinkId]: current.filter((t) => t !== toppingId),
      });
    } else {
      setSelectedToppings({
        ...selectedToppings,
        [drinkId]: [...current, toppingId],
      });
    }
  };

  const handleAddToCart = (drink: Drink) => {
    const drinkToppingIds = selectedToppings[drink.id] || [];
    const drinkToppings = toppings.filter((t) => drinkToppingIds.includes(t.id));
    onAddToCart(drink, drinkToppings);
    setExpandedDrink(null);
  };

  const handleRecommendationClick = (rec: Recommendation) => {
    onAddToCart(rec.drink, []);
  };

  return (
    <div style={styles.menuContainer}>
      <h2 style={styles.menuTitle}>☕ 精选饮品</h2>
      <p style={styles.menuSubtitle}>从左侧挑选你喜欢的饮品，支持多种加料定制</p>

      <div style={styles.drinksGrid}>
        {drinks.map((drink) => {
          const isExpanded = expandedDrink === drink.id;
          const drinkToppingIds = selectedToppings[drink.id] || [];
          const drinkToppings = toppings.filter((t) => drinkToppingIds.includes(t.id));
          const toppingsTotal = drinkToppings.reduce((s, t) => s + t.price, 0);

          return (
            <div
              key={drink.id}
              style={{
                ...styles.drinkCard,
                ...(isExpanded ? styles.drinkCardExpanded : {}),
              }}
            >
              <div style={styles.drinkEmoji}>{drink.image}</div>
              <div style={styles.drinkContent}>
                <div style={styles.drinkHeader}>
                  <h3 style={styles.drinkName}>{drink.name}</h3>
                  <span style={styles.drinkPrice}>¥{drink.price}</span>
                </div>
                <p style={styles.drinkDesc}>{drink.description}</p>
                <div style={styles.drinkTags}>
                  {drink.tags.map((tag) => (
                    <span key={tag} style={styles.tag}>
                      {tag}
                    </span>
                  ))}
                </div>
                <button
                  style={styles.addToppingsBtn}
                  onClick={() => setExpandedDrink(isExpanded ? null : drink.id)}
                >
                  {isExpanded ? '收起加料 ▲' : '加料定制 ▼'}
                </button>

                {isExpanded && (
                  <div style={styles.toppingsPanel}>
                    <div style={styles.toppingsList}>
                      {toppings.map((topping) => {
                        const isSelected = drinkToppingIds.includes(topping.id);
                        return (
                          <div
                            key={topping.id}
                            style={{
                              ...styles.toppingTag,
                              ...(isSelected ? styles.toppingTagSelected : {}),
                            }}
                            onClick={() => toggleTopping(drink.id, topping.id)}
                          >
                            <span>{topping.name}</span>
                            <span style={styles.toppingPrice}>+¥{topping.price}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div style={styles.addDrinkRow}>
                      <span style={styles.selectedTotal}>
                        {drinkToppings.length > 0
                          ? `合计 ¥${drink.price + toppingsTotal}`
                          : `基础价 ¥${drink.price}`}
                      </span>
                      <button style={styles.addDrinkBtn} onClick={() => handleAddToCart(drink)}>
                        加入订单
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {recommendations.length > 0 && (
        <div style={styles.recommendationCard}>
          <div style={styles.recHeader}>
            <span style={styles.recIcon}>✨</span>
            <span style={styles.recTitle}>为你推荐</span>
          </div>
          <p style={styles.recSubtitle}>根据你的口味偏好精选</p>
          {recommendations.map((rec, idx) => (
            <div
              key={idx}
              style={styles.recItem}
              onClick={() => handleRecommendationClick(rec)}
            >
              <span style={styles.recEmoji}>{rec.drink.image}</span>
              <div style={styles.recItemInfo}>
                <div style={styles.recItemName}>{rec.drink.name}</div>
                <div style={styles.recItemReason}>{rec.reason}</div>
              </div>
              <span style={styles.recItemPrice}>¥{rec.drink.price}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  menuContainer: {
    position: 'relative',
  },
  menuTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#3E2723',
    marginBottom: '6px',
  },
  menuSubtitle: {
    fontSize: '13px',
    color: '#8D6E63',
    marginBottom: '24px',
  },
  drinksGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '20px',
  },
  drinkCard: {
    width: '200px',
    backgroundColor: '#FDF5E6',
    borderRadius: '8px',
    padding: '16px',
    transition: 'all 0.2s ease-out',
    boxShadow: '0 2px 8px rgba(62, 39, 35, 0.06)',
    cursor: 'default',
  },
  drinkCardExpanded: {
    transform: 'translateY(-4px)',
    boxShadow: '0 8px 24px rgba(62, 39, 35, 0.15)',
  },
  drinkEmoji: {
    fontSize: '48px',
    textAlign: 'center',
    marginBottom: '12px',
  },
  drinkContent: {},
  drinkHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px',
  },
  drinkName: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#3E2723',
  },
  drinkPrice: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#6F4E37',
  },
  drinkDesc: {
    fontSize: '12px',
    color: '#6D4C41',
    lineHeight: '1.5',
    marginBottom: '10px',
    minHeight: '36px',
  },
  drinkTags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginBottom: '12px',
  },
  tag: {
    fontSize: '11px',
    padding: '3px 8px',
    backgroundColor: '#EFEBE9',
    color: '#5D4037',
    borderRadius: '10px',
  },
  addToppingsBtn: {
    width: '100%',
    padding: '8px 12px',
    backgroundColor: '#EFEBE9',
    color: '#5D4037',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '500',
  },
  toppingsPanel: {
    marginTop: '12px',
    padding: '12px',
    backgroundColor: 'white',
    borderRadius: '6px',
    animation: 'slideDown 0.2s ease-out',
  },
  toppingsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '12px',
  },
  toppingTag: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    backgroundColor: '#EFEBE9',
    borderRadius: '4px',
    fontSize: '13px',
    color: '#5D4037',
    cursor: 'pointer',
    transition: 'all 0.2s ease-out',
  },
  toppingTagSelected: {
    backgroundColor: '#6F4E37',
    color: 'white',
    transform: 'translateX(10px)',
  },
  toppingPrice: {
    fontSize: '12px',
    opacity: 0.8,
  },
  addDrinkRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedTotal: {
    fontSize: '13px',
    color: '#5D4037',
    fontWeight: '500',
  },
  addDrinkBtn: {
    padding: '8px 16px',
    backgroundColor: '#6F4E37',
    color: 'white',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 'bold',
  },
  recommendationCard: {
    position: 'fixed',
    bottom: '24px',
    right: 'calc(30% + 24px)',
    width: '280px',
    background: 'linear-gradient(135deg, #E8D5B7 0%, #F5E6CC 100%)',
    borderRadius: '12px',
    padding: '16px',
    boxShadow: '0 8px 24px rgba(62, 39, 35, 0.12)',
    animation: 'fadeIn 0.3s ease-out',
    zIndex: 50,
  },
  recHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '4px',
  },
  recIcon: { fontSize: '18px' },
  recTitle: {
    fontSize: '15px',
    fontWeight: 'bold',
    color: '#3E2723',
  },
  recSubtitle: {
    fontSize: '11px',
    color: '#6D4C41',
    marginBottom: '12px',
  },
  recItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px',
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: '8px',
    marginBottom: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease-out',
  },
  recEmoji: { fontSize: '28px' },
  recItemInfo: { flex: 1 },
  recItemName: {
    fontSize: '13px',
    fontWeight: 'bold',
    color: '#3E2723',
    marginBottom: '2px',
  },
  recItemReason: {
    fontSize: '11px',
    color: '#6D4C41',
  },
  recItemPrice: {
    fontSize: '13px',
    fontWeight: 'bold',
    color: '#6F4E37',
  },
};
