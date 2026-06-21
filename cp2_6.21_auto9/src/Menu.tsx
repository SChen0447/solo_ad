import { useState } from 'react';
import type { Drink, Topping } from './types';

interface MenuProps {
  drinks: Drink[];
  toppings: Topping[];
  onAddToCart: (drink: Drink, selectedToppings: string[]) => void;
}

function Menu({ drinks, toppings, onAddToCart }: MenuProps) {
  const [expandedDrinkId, setExpandedDrinkId] = useState<string | null>(null);
  const [selectedToppings, setSelectedToppings] = useState<Record<string, string[]>>({});

  const toggleExpand = (drinkId: string) => {
    if (expandedDrinkId === drinkId) {
      setExpandedDrinkId(null);
    } else {
      setExpandedDrinkId(drinkId);
      if (!selectedToppings[drinkId]) {
        setSelectedToppings(prev => ({ ...prev, [drinkId]: [] }));
      }
    }
  };

  const toggleTopping = (drinkId: string, toppingId: string) => {
    setSelectedToppings(prev => {
      const drinkToppings = prev[drinkId] || [];
      const newToppings = drinkToppings.includes(toppingId)
        ? drinkToppings.filter(id => id !== toppingId)
        : [...drinkToppings, toppingId];
      return { ...prev, [drinkId]: newToppings };
    });
  };

  const handleAddToCart = (drink: Drink) => {
    onAddToCart(drink, selectedToppings[drink.id] || []);
  };

  return (
    <div className="menu-container">
      <h2 className="menu-title">饮品菜单</h2>
      <div className="drink-grid">
        {drinks.map(drink => (
          <div
            key={drink.id}
            className={`drink-card ${expandedDrinkId === drink.id ? 'expanded' : ''}`}
          >
            <div className="drink-card-inner">
              <div className="drink-icon">{drink.icon}</div>
              <h3 className="drink-name">{drink.name}</h3>
              <p className="drink-description">{drink.description}</p>
              <div className="drink-price">¥{drink.price}</div>
              <button
                className="topping-btn"
                onClick={() => toggleExpand(drink.id)}
              >
                {expandedDrinkId === drink.id ? '收起加料' : '➕ 加料'}
              </button>
            </div>

            <div
              className={`topping-panel ${expandedDrinkId === drink.id ? 'open' : ''}`}
            >
              <div className="topping-label">选择加料：</div>
              <div className="topping-list">
                {toppings.map(topping => (
                  <div
                    key={topping.id}
                    className={`topping-tag ${
                      selectedToppings[drink.id]?.includes(topping.id)
                        ? 'selected'
                        : ''
                    }`}
                    onClick={() => toggleTopping(drink.id, topping.id)}
                  >
                    <span>{topping.name}</span>
                    <span className="topping-price">+¥{topping.price}</span>
                  </div>
                ))}
              </div>
              <button
                className="add-order-btn"
                onClick={() => handleAddToCart(drink)}
              >
                加入订单
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Menu;
