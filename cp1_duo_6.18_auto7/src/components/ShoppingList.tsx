import { useRecipeStore } from '../store/recipeStore';
import { formatFraction } from '../utils/ingredientUtils';
import './ShoppingList.css';

export function ShoppingList() {
  const { shoppingGroups, toggleShoppingItem, toggleGroupCollapsed, clearShoppingList } =
    useRecipeStore();

  const totalItems = shoppingGroups.reduce((sum, g) => sum + g.items.length, 0);
  const completedItems = shoppingGroups.reduce(
    (sum, g) => sum + g.items.filter((i) => i.completed).length,
    0
  );

  if (shoppingGroups.length === 0) {
    return (
      <div className="shopping-list empty">
        <div className="empty-state">
          <h2>购物清单</h2>
          <p>还没有生成购物清单</p>
          <p className="hint">前往"食谱库"勾选食谱，然后点击"生成购物清单"</p>
        </div>
      </div>
    );
  }

  return (
    <div className="shopping-list">
      <div className="shopping-header">
        <div>
          <h2>购物清单</h2>
          <p className="progress-text">
            已完成 {completedItems} / {totalItems} 项
          </p>
        </div>
        <button className="btn btn-secondary" onClick={clearShoppingList}>
          清空清单
        </button>
      </div>

      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: totalItems > 0 ? `${(completedItems / totalItems) * 100}%` : '0%' }}
        />
      </div>

      <div className="shopping-groups">
        {shoppingGroups.map((group) => (
          <div
            key={group.category}
            className={`shopping-group ${group.collapsed ? 'collapsed' : ''}`}
          >
            <div
              className="group-header"
              onClick={() => toggleGroupCollapsed(group.category)}
            >
              <span className="group-arrow">{group.collapsed ? '▶' : '▼'}</span>
              <h3 className="group-title">{group.category}</h3>
              <span className="group-count">
                {group.items.filter((i) => i.completed).length}/{group.items.length}
              </span>
            </div>

            <div className="group-content">
              <ul className="item-list">
                {group.items.map((item) => (
                  <li
                    key={`${item.name}-${item.unit}`}
                    className={`shopping-item ${item.completed ? 'completed' : ''}`}
                  >
                    <label className="item-checkbox">
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={() => toggleShoppingItem(item.name, item.unit)}
                      />
                      <span className="checkmark" />
                    </label>
                    <span className="item-name">{item.name}</span>
                    <span className="item-amount">
                      {formatFraction(item.amount)} {item.unit}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
