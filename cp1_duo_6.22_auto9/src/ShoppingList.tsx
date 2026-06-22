import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import CategoryIcon from './CategoryIcon';
import {
  Recipe,
  ShoppingItem,
  IngredientCategory,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
} from './types';

interface Props {
  recipes: Recipe[];
}

const STORAGE_KEY = 'recipe_collab_shopping_list';
const CONFETTI_COLORS = ['#E8833A', '#D2691E', '#8B4513', '#FFB74D', '#FFCC80'];

function parseQuantity(q: string): number {
  const n = parseFloat(q);
  return isNaN(n) ? 0 : n;
}

function formatAggregatedQty(quantities: number[]): string {
  const sum = quantities.reduce((a, b) => a + b, 0);
  if (sum === 0) return quantities.length > 0 ? '适量' : '';
  if (Number.isInteger(sum)) return sum.toString();
  return sum.toFixed(1).replace(/\.0$/, '');
}

function AutoExpandInput({
  value,
  onChange,
  placeholder,
  onKeyDown,
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}) {
  const measureRef = useRef<HTMLSpanElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (measureRef.current && inputRef.current) {
      const width = measureRef.current.offsetWidth;
      inputRef.current.style.width = `${Math.max(120, width + 30)}px`;
    }
  }, [value]);

  return (
    <div className="auto-expand-input-wrapper">
      <span ref={measureRef} className="auto-expand-input-measure">
        {value || placeholder}
      </span>
      <input
        ref={inputRef}
        type="text"
        className="input auto-expand-input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        style={{ minWidth: '120px' }}
      />
    </div>
  );
}

function AnimatedCheckbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="shopping-item-checkbox">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="checkbox-custom">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polyline
            points="5,12 10,17 19,7"
            fill="none"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </label>
  );
}

function Confetti({ count = 12 }: { count?: number }) {
  const pieces = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 500,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: 6 + Math.random() * 4,
    }));
  }, [count]);

  return (
    <div className="all-complete-confetti">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            backgroundColor: p.color,
            width: p.size,
            height: p.size,
            animationDelay: `${p.delay}ms`,
          }}
        />
      ))}
    </div>
  );
}

export default function ShoppingList({ recipes }: Props) {
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<Set<string>>(new Set());
  const [customItems, setCustomItems] = useState<ShoppingItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved) as { items: ShoppingItem[]; checked: Record<string, boolean> };
        return data.items || [];
      }
    } catch {
      /* ignore */
    }
    return [];
  });
  const [checkedMap, setCheckedMap] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved) as { items: ShoppingItem[]; checked: Record<string, boolean> };
        return data.checked || {};
      }
    } catch {
      /* ignore */
    }
    return {};
  });
  const [newCustomName, setNewCustomName] = useState('');
  const [newCustomQty, setNewCustomQty] = useState('');
  const [showCompleteBanner, setShowCompleteBanner] = useState(false);
  const [bannerKey, setBannerKey] = useState(0);
  const saveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ items: customItems, checked: checkedMap })
        );
      } catch {
        /* ignore */
      }
    }, 200);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [customItems, checkedMap]);

  const aggregatedItems = useMemo(() => {
    const map = new Map<string, { quantities: number[]; category: IngredientCategory }>();

    selectedRecipeIds.forEach((rid) => {
      const recipe = recipes.find((r) => r.id === rid);
      if (!recipe) return;
      recipe.ingredients.forEach((ing) => {
        if (!ing.name.trim()) return;
        const key = `${ing.name.toLowerCase()}|${ing.unit}|${ing.category}`;
        const existing = map.get(key);
        const qty = parseQuantity(ing.quantity);
        if (existing) {
          existing.quantities.push(qty);
        } else {
          map.set(key, {
            quantities: [qty],
            category: ing.category,
          });
        }
      });
    });

    const items: ShoppingItem[] = [];
    map.forEach((val, key) => {
      const [name, unit] = key.split('|') as [string, string, IngredientCategory];
      items.push({
        id: `agg_${key}`,
        name: name.charAt(0).toUpperCase() + name.slice(1),
        quantity: formatAggregatedQty(val.quantities),
        unit,
        category: val.category,
        checked: !!checkedMap[`agg_${key}`],
        isCustom: false,
      });
    });

    customItems.forEach((ci) => {
      items.push({
        ...ci,
        checked: !!checkedMap[ci.id],
      });
    });

    return items;
  }, [selectedRecipeIds, recipes, customItems, checkedMap]);

  const itemsByCategory = useMemo(() => {
    const grouped: Record<string, ShoppingItem[]> = {};
    CATEGORY_ORDER.forEach((c) => (grouped[c] = []));
    aggregatedItems.forEach((item) => {
      if (!grouped[item.category]) grouped[item.category] = [];
      grouped[item.category].push(item);
    });
    return grouped;
  }, [aggregatedItems]);

  const totalItems = aggregatedItems.length;
  const checkedItems = aggregatedItems.filter((i) => i.checked).length;
  const allComplete = totalItems > 0 && checkedItems === totalItems;

  useEffect(() => {
    if (allComplete) {
      setShowCompleteBanner(true);
      setBannerKey((k) => k + 1);
    } else {
      setShowCompleteBanner(false);
    }
  }, [allComplete]);

  const toggleRecipe = useCallback((id: string) => {
    setSelectedRecipeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleChecked = useCallback((id: string) => {
    setCheckedMap((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const addCustomItem = useCallback(() => {
    if (!newCustomName.trim()) return;
    const newItem: ShoppingItem = {
      id: uuidv4(),
      name: newCustomName.trim(),
      quantity: newCustomQty.trim() || '适量',
      unit: '',
      category: 'other',
      checked: false,
      isCustom: true,
    };
    setCustomItems((prev) => [...prev, newItem]);
    setNewCustomName('');
    setNewCustomQty('');
  }, [newCustomName, newCustomQty]);

  const removeCustomItem = useCallback((id: string) => {
    setCustomItems((prev) => prev.filter((i) => i.id !== id));
    setCheckedMap((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  return (
    <div className="page-fade shopping-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">🛒 购物清单</h1>
          <div className="help-text">
            选择菜谱后自动生成购物清单，{totalItems > 0 ? `已勾选 ${checkedItems}/${totalItems}` : '请先选择菜谱'}
          </div>
        </div>
        {totalItems > 0 && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setCheckedMap({})}
          >
            清空勾选
          </button>
        )}
      </div>

      {showCompleteBanner && (
        <div className="all-complete-banner" key={bannerKey}>
          <span className="all-complete-icon">🎉</span>
          <span className="all-complete-text">太棒了！所有物品都已准备齐全</span>
          <Confetti count={15} />
        </div>
      )}

      <div className="card">
        <h3 className="section-title" style={{ marginBottom: 16 }}>📋 选择菜谱</h3>
        {recipes.length === 0 ? (
          <div className="help-text" style={{ textAlign: 'center', padding: 20 }}>
            还没有菜谱，请先创建菜谱
          </div>
        ) : (
          <div className="recipe-selector">
            {recipes.map((r) => {
              const selected = selectedRecipeIds.has(r.id);
              return (
                <div
                  key={r.id}
                  className={`recipe-chip ${selected ? 'selected' : ''}`}
                  onClick={() => toggleRecipe(r.id)}
                >
                  {selected ? '✓' : '+'} {r.title}
                  <span style={{ fontSize: 11, opacity: 0.8 }}>
                    ({r.ingredients.length} 种食材)
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {aggregatedItems.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon">🛒</div>
          <div className="empty-state-title">清单是空的</div>
          <div>选择上方菜谱或添加自定义商品来开始吧</div>
        </div>
      ) : (
        <div className="shopping-categories">
          {CATEGORY_ORDER.map((cat) => {
            const items = itemsByCategory[cat];
            if (!items || items.length === 0) return null;
            return (
              <div key={cat} className="shopping-category">
                <div className="shopping-category-title">
                  <span className="category-icon-wrapper">
                    <CategoryIcon category={cat} size={20} />
                  </span>
                  {CATEGORY_LABELS[cat]}
                  <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--color-text-muted)' }}>
                    ({items.length})
                  </span>
                </div>
                <div className="shopping-items">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className={`shopping-item ${item.checked ? 'checked' : ''}`}
                    >
                      <AnimatedCheckbox
                        checked={item.checked}
                        onChange={() => toggleChecked(item.id)}
                      />
                      <div className="shopping-item-content">
                        <span className="shopping-item-text">{item.name}</span>
                        {item.isCustom && (
                          <span
                            style={{
                              fontSize: 10,
                              marginLeft: 6,
                              padding: '1px 6px',
                              borderRadius: 4,
                              background: 'var(--color-bg-alt)',
                              color: 'var(--color-text-muted)',
                            }}
                          >
                            自定义
                          </span>
                        )}
                      </div>
                      <span className="shopping-item-qty">
                        {item.quantity}
                        {item.unit ? ` ${item.unit}` : ''}
                      </span>
                      {item.isCustom && (
                        <button
                          className="btn btn-icon shopping-item-remove"
                          onClick={() => removeCustomItem(item.id)}
                          title="删除"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {cat === 'other' && (
                  <div className="add-custom-item">
                    <AutoExpandInput
                      value={newCustomName}
                      onChange={setNewCustomName}
                      placeholder="添加自定义商品..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') addCustomItem();
                      }}
                    />
                    <input
                      type="text"
                      className="input"
                      style={{ width: 100 }}
                      placeholder="数量"
                      value={newCustomQty}
                      onChange={(e) => setNewCustomQty(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') addCustomItem();
                      }}
                    />
                    <button className="btn btn-primary" onClick={addCustomItem}>
                      添加
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
