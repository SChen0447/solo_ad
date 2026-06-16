import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import type { Recipe, DayOfWeek, MealSlot, ShoppingGroups, ShoppingItem } from './types';

interface MealPlannerProps {
  recipes: Recipe[];
  mealPlan: Map<string, number | null>;
  setMeal: (day: DayOfWeek, slot: MealSlot, recipeId: number | null) => void;
  swapMeals: (fromKey: string, toKey: string) => void;
}

const DAYS: { key: DayOfWeek; label: string }[] = [
  { key: 'monday', label: '周一' },
  { key: 'tuesday', label: '周二' },
  { key: 'wednesday', label: '周三' },
  { key: 'thursday', label: '周四' },
  { key: 'friday', label: '周五' },
  { key: 'saturday', label: '周六' },
  { key: 'sunday', label: '周日' },
];

const SLOTS: { key: MealSlot; label: string; emoji: string }[] = [
  { key: 'breakfast', label: '早餐', emoji: '🌅' },
  { key: 'lunch', label: '午餐', emoji: '☀️' },
  { key: 'dinner', label: '晚餐', emoji: '🌙' },
];

const PRESET_TAGS = ['素食', '高蛋白', '快手', '健康', '低卡', '家常', '硬菜', '早餐', '下饭', '宴客', '海鲜', '川菜', '西餐', '养生'];
const CONFETTI_COLORS = ['#ff7f50', '#ffa07a', '#ffd700', '#98fb98', '#87ceeb', '#dda0dd', '#ff69b4', '#f0e68c'];

function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getContrastColor(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 140 ? '#333333' : '#ffffff';
}

export default function MealPlanner({ recipes, mealPlan, setMeal, swapMeals }: MealPlannerProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [activeCell, setActiveCell] = useState<{ day: DayOfWeek; slot: MealSlot } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [flashCell, setFlashCell] = useState<string | null>(null);
  const [flipCells, setFlipCells] = useState<Set<string>>(new Set());
  const [shoppingOpen, setShoppingOpen] = useState(false);
  const [shoppingGroups, setShoppingGroups] = useState<ShoppingGroups>({});
  const [shoppingChecked, setShoppingChecked] = useState<Map<string, boolean>>(new Map());
  const [shoppingLoading, setShoppingLoading] = useState(false);
  const [confetti, setConfetti] = useState<{ id: number; x: number; y: number; color: string; tx: number; ty: number }[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const confettiIdRef = useRef(0);

  const dragState = useRef<{
    isDragging: boolean;
    startX: number;
    startY: number;
    fromKey: string | null;
    startTime: number;
    longPressTimer: ReturnType<typeof setTimeout> | null;
    dragStarted: boolean;
    ghostEl: HTMLDivElement | null;
    currentOverKey: string | null;
  }>({
    isDragging: false,
    startX: 0,
    startY: 0,
    fromKey: null,
    startTime: 0,
    longPressTimer: null,
    dragStarted: false,
    ghostEl: null,
    currentOverKey: null,
  });

  const allTags = useMemo(() => {
    const s = new Set<string>();
    recipes.forEach((r) => r.tags.forEach((t) => s.add(t)));
    PRESET_TAGS.forEach((t) => s.add(t));
    return Array.from(s);
  }, [recipes]);

  const recipesMap = useMemo(() => {
    const m = new Map<number, Recipe>();
    recipes.forEach((r) => m.set(r.id, r));
    return m;
  }, [recipes]);

  const filteredRecipes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return recipes.filter((r) => {
      const matchQ =
        !q ||
        r.name.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.tags.some((t) => t.toLowerCase().includes(q)) ||
        r.ingredients.some((i) => i.name.toLowerCase().includes(q));
      const matchTags =
        filterTags.length === 0 || filterTags.every((t) => r.tags.includes(t));
      return matchQ && matchTags;
    });
  }, [recipes, searchQuery, filterTags]);

  const getRecipe = useCallback(
    (day: DayOfWeek, slot: MealSlot) => {
      const id = mealPlan.get(`${day}-${slot}`);
      return id ? recipesMap.get(id) : undefined;
    },
    [mealPlan, recipesMap]
  );

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  const triggerFlip = (keys: string[]) => {
    setFlipCells(new Set(keys));
    setTimeout(() => setFlipCells(new Set()), 320);
  };

  const triggerFlash = (key: string) => {
    setFlashCell(key);
    setTimeout(() => setFlashCell(null), 500);
  };

  const triggerConfetti = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const dots = [];
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI * 2 * i) / 10 + Math.random() * 0.5;
      const dist = 30 + Math.random() * 30;
      dots.push({
        id: ++confettiIdRef.current,
        x: centerX,
        y: centerY,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        tx: Math.cos(angle) * dist,
        ty: Math.sin(angle) * dist,
      });
    }
    setConfetti(dots);
    setTimeout(() => setConfetti([]), 550);
  };

  const openPicker = (day: DayOfWeek, slot: MealSlot) => {
    if (dragState.current.dragStarted) return;
    setActiveCell({ day, slot });
    setSearchQuery('');
    setFilterTags([]);
    setPickerOpen(true);
  };

  const handleSelectRecipe = (recipe: Recipe) => {
    if (!activeCell) return;
    setMeal(activeCell.day, activeCell.slot, recipe.id);
    triggerFlip([`${activeCell.day}-${activeCell.slot}`]);
    triggerFlash(`${activeCell.day}-${activeCell.slot}`);
    setPickerOpen(false);
    showToast(`✅ 已安排「${recipe.name}」到 ${DAYS.find((d) => d.key === activeCell.day)?.label} ${SLOTS.find((s) => s.key === activeCell.slot)?.label}`);
  };

  const clearCell = (day: DayOfWeek, slot: MealSlot) => {
    const key = `${day}-${slot}`;
    if (mealPlan.get(key)) {
      setMeal(day, slot, null);
      triggerFlip([key]);
      showToast('🗑️ 已移除该餐食安排');
    }
  };

  const handlePointerDown = (e: React.PointerEvent, key: string) => {
    if (!mealPlan.get(key)) return;
    const recipe = recipesMap.get(mealPlan.get(key)!);
    if (!recipe) return;

    dragState.current.startX = e.clientX;
    dragState.current.startY = e.clientY;
    dragState.current.fromKey = key;
    dragState.current.startTime = Date.now();
    dragState.current.dragStarted = false;
    dragState.current.isDragging = true;
    dragState.current.currentOverKey = null;

    dragState.current.longPressTimer = setTimeout(() => {
      if (dragState.current.isDragging) {
        dragState.current.dragStarted = true;
        createGhost(e.clientX, e.clientY, recipe);
      }
    }, 200);
  };

  const createGhost = (x: number, y: number, recipe: Recipe) => {
    const el = document.createElement('div');
    const color = recipe.dominantColor || '#ff7f50';
    el.className = 'dragging-ghost';
    el.style.cssText = `
      position: fixed;
      z-index: 10000;
      pointer-events: none;
      width: 140px;
      padding: 12px;
      border-radius: 12px;
      background: ${hexToRgba(color, 0.92)};
      color: ${getContrastColor(color)};
      box-shadow: 0 12px 32px rgba(0,0,0,0.25);
      backdrop-filter: blur(8px);
      transform: translate(-50%, -50%) rotate(3deg);
    `;
    el.innerHTML = `
      <div style="font-size:13px;font-weight:600;margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${recipe.name}</div>
      <div style="font-size:11px;opacity:0.85">⏱️ ${recipe.prepTime + recipe.cookTime}分钟</div>
    `;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    document.body.appendChild(el);
    dragState.current.ghostEl = el;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragState.current.isDragging) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;

    if (!dragState.current.dragStarted && Math.hypot(dx, dy) > 6) {
      if (Date.now() - dragState.current.startTime < 200) {
        if (dragState.current.longPressTimer) clearTimeout(dragState.current.longPressTimer);
        dragState.current.isDragging = false;
        return;
      }
    }

    if (dragState.current.ghostEl) {
      dragState.current.ghostEl.style.left = `${e.clientX}px`;
      dragState.current.ghostEl.style.top = `${e.clientY}px`;
    }

    if (dragState.current.dragStarted) {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const cellEl = el?.closest('[data-meal-key]') as HTMLElement | null;
      const newKey = cellEl?.dataset.mealKey || null;

      if (newKey !== dragState.current.currentOverKey) {
        document.querySelectorAll('.drop-indicator').forEach((e) => e.classList.remove('drop-indicator'));
        if (newKey && newKey !== dragState.current.fromKey) {
          cellEl?.classList.add('drop-indicator');
        }
        dragState.current.currentOverKey = newKey;
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragState.current.longPressTimer) {
      clearTimeout(dragState.current.longPressTimer);
      dragState.current.longPressTimer = null;
    }

    const wasDragging = dragState.current.dragStarted;
    const fromKey = dragState.current.fromKey;
    const toKey = dragState.current.currentOverKey;

    document.querySelectorAll('.drop-indicator').forEach((e) => e.classList.remove('drop-indicator'));
    if (dragState.current.ghostEl) {
      dragState.current.ghostEl.remove();
      dragState.current.ghostEl = null;
    }

    dragState.current.isDragging = false;
    dragState.current.dragStarted = false;
    dragState.current.fromKey = null;
    dragState.current.currentOverKey = null;

    if (wasDragging && fromKey && toKey && fromKey !== toKey) {
      swapMeals(fromKey, toKey);
      triggerFlip([fromKey, toKey]);
      triggerFlash(toKey);
    }
  };

  useEffect(() => {
    const cancelDrag = () => {
      if (dragState.current.longPressTimer) clearTimeout(dragState.current.longPressTimer);
      document.querySelectorAll('.drop-indicator').forEach((e) => e.classList.remove('drop-indicator'));
      if (dragState.current.ghostEl) dragState.current.ghostEl.remove();
      dragState.current = {
        isDragging: false,
        startX: 0,
        startY: 0,
        fromKey: null,
        startTime: 0,
        longPressTimer: null,
        dragStarted: false,
        ghostEl: null,
        currentOverKey: null,
      };
    };
    window.addEventListener('pointercancel', cancelDrag);
    window.addEventListener('blur', cancelDrag);
    return () => {
      window.removeEventListener('pointercancel', cancelDrag);
      window.removeEventListener('blur', cancelDrag);
      cancelDrag();
    };
  }, []);

  const generateShoppingList = async () => {
    const ids: number[] = [];
    mealPlan.forEach((id) => id && ids.push(id));
    if (ids.length === 0) {
      showToast('⚠️ 请先安排至少一道食谱再生成购物清单~');
      return;
    }
    setShoppingLoading(true);
    try {
      const res = await axios.post('/api/shopping-list', { recipeIds: ids });
      setShoppingGroups(res.data.groups || {});
      setShoppingChecked(new Map());
      setShoppingOpen(true);
    } catch (err) {
      console.error('生成购物清单失败:', err);
      showToast('❌ 生成购物清单失败，请稍后重试');
    } finally {
      setShoppingLoading(false);
    }
  };

  const toggleShoppingCheck = (key: string, element: HTMLElement | null) => {
    const prev = shoppingChecked.get(key) || false;
    const next = new Map(shoppingChecked);
    next.set(key, !prev);
    setShoppingChecked(next);
    if (!prev && element) {
      triggerConfetti(element);
    }
  };

  const totalScheduled = useMemo(() => {
    let c = 0;
    mealPlan.forEach((id) => id && c++);
    return c;
  }, [mealPlan]);

  return (
    <div
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {toast && (
        <div style={toastStyle}>
          <span>{toast}</span>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#333', margin: 0, marginBottom: '4px' }}>
            📅 本周排餐计划
          </h2>
          <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>
            已安排 <b style={{ color: '#ff7f50' }}>{totalScheduled}</b> / {DAYS.length * SLOTS.length} 餐
            <span style={{ margin: '0 8px', color: '#ddd' }}>|</span>
            点击格子添加食谱 · 长按拖拽交换
          </p>
        </div>
        <button
          className="coral-gradient-btn"
          onClick={generateShoppingList}
          disabled={shoppingLoading}
          style={{
            padding: '12px 28px',
            fontSize: '15px',
            opacity: shoppingLoading ? 0.7 : 1,
          }}
        >
          {shoppingLoading ? '⏳ 生成中...' : '🛒 生成购物清单'}
        </button>
      </div>

      <div style={gridContainerStyle}>
        <div style={gridHeaderRowStyle}>
          <div style={{ ...gridCellStyle, background: 'transparent', border: 'none', minHeight: '0' }} />
          {DAYS.map((d, idx) => (
            <div key={d.key} style={{
              ...gridHeaderCellStyle,
              ...(idx >= 5 ? { background: 'linear-gradient(180deg, #fff0e6, #fffaf0)' } : {}),
            }}>
              <div style={{ fontSize: '15px', fontWeight: 700, color: idx >= 5 ? '#ff7f50' : '#333' }}>
                {d.label}
              </div>
            </div>
          ))}
        </div>

        {SLOTS.map((slot) => (
          <div key={slot.key} style={gridRowStyle}>
            <div style={gridSlotHeaderStyle}>
              <span style={{ fontSize: '16px', marginRight: '4px' }}>{slot.emoji}</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#666' }}>{slot.label}</span>
            </div>
            {DAYS.map((day) => {
              const key = `${day.key}-${slot.key}`;
              const recipe = getRecipe(day.key, slot.key);
              const hasRecipe = !!recipe;
              const color = recipe?.dominantColor || '#ffffff';
              const textColor = hasRecipe ? getContrastColor(color) : '#999';
              const isFlash = flashCell === key;
              const isFlip = flipCells.has(key);

              return (
                <div
                  key={key}
                  data-meal-key={key}
                  className={[
                    'meal-cell',
                    hasRecipe ? 'has-recipe' : '',
                    isFlash ? 'border-flash' : '',
                    isFlip ? 'page-flip' : '',
                  ].join(' ')}
                  style={{
                    ...gridCellStyle,
                    ...(hasRecipe
                      ? {
                          background: `linear-gradient(135deg, ${hexToRgba(color, 0.9)}, ${hexToRgba(color, 0.75)})`,
                          color: textColor,
                          border: `2px solid ${hexToRgba(color, 0.4)}`,
                        }
                      : {}),
                  }}
                  onClick={() => openPicker(day.key, slot.key)}
                  onPointerDown={(e) => handlePointerDown(e, key)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    clearCell(day.key, slot.key);
                  }}
                >
                  {recipe ? (
                    <>
                      <div style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                        width: '100%',
                        height: '100%',
                      }}>
                        <img
                          src={recipe.coverUrl}
                          alt={recipe.name}
                          style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '10px',
                            objectFit: 'cover',
                            flexShrink: 0,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                          }}
                          loading="lazy"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                          }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: '14px',
                            fontWeight: 700,
                            marginBottom: '4px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            lineHeight: 1.3,
                          }}>
                            {recipe.name}
                          </div>
                          <div style={{
                            fontSize: '11px',
                            opacity: 0.85,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            {recipe.description || `⏱️ ${recipe.prepTime + recipe.cookTime}分钟`}
                          </div>
                          <div style={{
                            display: 'flex',
                            gap: '4px',
                            marginTop: '6px',
                            flexWrap: 'wrap',
                          }}>
                            {recipe.tags.slice(0, 2).map((t) => (
                              <span key={t} style={{
                                fontSize: '10px',
                                padding: '2px 6px',
                                background: hexToRgba(hasRecipe ? '#ffffff' : '#ff7f50', 0.25),
                                borderRadius: '6px',
                                fontWeight: 500,
                              }}>{t}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '100%',
                      gap: '6px',
                    }}>
                      <span style={{ fontSize: '28px', opacity: 0.4 }}>➕</span>
                      <span style={{ fontSize: '12px', color: '#bbb' }}>点击安排食谱</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div style={{
        marginTop: '16px',
        display: 'flex',
        gap: '20px',
        flexWrap: 'wrap',
        padding: '12px 16px',
        background: '#fff',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        fontSize: '12px',
        color: '#888',
      }}>
        <span>💡 <b style={{ color: '#666' }}>操作提示：</b></span>
        <span>🖱️ 点击空白格选择食谱</span>
        <span>📋 右键点击可移除已安排的食谱</span>
        <span>✋ 长按食谱格子并拖拽可与其他格子交换</span>
      </div>

      {pickerOpen && activeCell && (
        <RecipePickerModal
          recipes={filteredRecipes}
          allTags={allTags}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filterTags={filterTags}
          toggleTag={(t) =>
            setFilterTags((prev) =>
              prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
            )
          }
          clearTags={() => setFilterTags([])}
          onSelect={handleSelectRecipe}
          onClose={() => setPickerOpen(false)}
          dayLabel={DAYS.find((d) => d.key === activeCell.day)?.label || ''}
          slotLabel={SLOTS.find((s) => s.key === activeCell.slot)?.label || ''}
        />
      )}

      {shoppingOpen && (
        <ShoppingListModal
          groups={shoppingGroups}
          checked={shoppingChecked}
          onToggle={toggleShoppingCheck}
          confetti={confetti}
          onClose={() => setShoppingOpen(false)}
        />
      )}
    </div>
  );
}

function RecipePickerModal({
  recipes,
  allTags,
  searchQuery,
  setSearchQuery,
  filterTags,
  toggleTag,
  clearTags,
  onSelect,
  onClose,
  dayLabel,
  slotLabel,
}: {
  recipes: Recipe[];
  allTags: string[];
  searchQuery: string;
  setSearchQuery: (s: string) => void;
  filterTags: string[];
  toggleTag: (t: string) => void;
  clearTags: () => void;
  onSelect: (r: Recipe) => void;
  onClose: () => void;
  dayLabel: string;
  slotLabel: string;
}) {
  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={pickerModalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px',
          borderBottom: '1px solid #f0f0f0',
          background: 'linear-gradient(135deg, #fffaf0, #fff0e6)',
        }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#333', margin: 0, marginBottom: '4px' }}>
              🍽️ 选择食谱
            </h2>
            <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>
              为 <b style={{ color: '#ff7f50' }}>{dayLabel} {slotLabel}</b> 安排一道美味吧
            </p>
          </div>
          <button onClick={onClose} style={modalCloseStyle}>×</button>
        </div>

        <div style={{ padding: '16px 24px', borderBottom: '1px solid #f5f5f5' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '12px',
            flexWrap: 'wrap',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center',
              background: '#fff',
              border: '2px solid #ffe4d6',
              borderRadius: '12px',
              padding: '0 14px',
              height: '42px',
              flex: 1,
              minWidth: '240px',
              maxWidth: '400px',
            }}>
              <span style={{ marginRight: '8px' }}>🔍</span>
              <input
                type="text"
                placeholder="搜索食谱名、食材或标签..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  flex: 1, border: 'none', background: 'transparent',
                  fontSize: '14px', height: '38px', color: '#333',
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    background: '#f0f0f0', color: '#999',
                    width: '22px', height: '22px', borderRadius: '50%',
                    fontSize: '14px', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >×</button>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '16px',
                  fontSize: '12px',
                  transition: 'all 0.2s',
                  cursor: 'pointer',
                  border: filterTags.includes(tag) ? '1.5px solid transparent' : '1.5px solid #ffe4d6',
                  background: filterTags.includes(tag)
                    ? 'linear-gradient(135deg, #ff7f50, #e66a3d)'
                    : '#fff',
                  color: filterTags.includes(tag) ? '#fff' : '#666',
                }}
              >
                {tag}
              </button>
            ))}
            {filterTags.length > 0 && (
              <button
                onClick={clearTags}
                style={{
                  padding: '5px 12px',
                  background: 'transparent',
                  color: '#ff7f50',
                  fontSize: '12px',
                  textDecoration: 'underline',
                }}
              >清除筛选</button>
            )}
          </div>
        </div>

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 24px 24px',
        }}>
          <div style={{ fontSize: '13px', color: '#888', marginBottom: '12px' }}>
            共 <b style={{ color: '#ff7f50' }}>{recipes.length}</b> 个食谱可选
          </div>

          {recipes.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '60px 20px',
              color: '#999', fontSize: '14px',
            }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🤷</div>
              <div>暂无匹配的食谱</div>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '14px',
            }}>
              {recipes.map((recipe) => {
                const color = recipe.dominantColor || '#ff7f50';
                return (
                  <div
                    key={recipe.id}
                    onClick={() => onSelect(recipe)}
                    className="recipe-card-hover"
                    style={{
                      background: '#fff',
                      borderRadius: '14px',
                      overflow: 'hidden',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{
                      position: 'relative',
                      width: '100%',
                      paddingTop: '60%',
                      overflow: 'hidden',
                    }}>
                      <img
                        src={recipe.coverUrl}
                        alt={recipe.name}
                        className="card-image"
                        style={{
                          position: 'absolute', top: 0, left: 0,
                          width: '100%', height: '100%',
                          objectFit: 'cover',
                        }}
                        loading="lazy"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src =
                            `https://placehold.co/400x240/${color.replace('#', '')}/ffffff?text=${encodeURIComponent(recipe.name)}`;
                        }}
                      />
                      <div style={{
                        position: 'absolute', bottom: '8px', right: '8px',
                        background: 'rgba(0,0,0,0.6)', color: '#fff',
                        padding: '3px 8px', borderRadius: '10px',
                        fontSize: '11px', backdropFilter: 'blur(4px)',
                      }}>
                        ⏱️ {recipe.prepTime + recipe.cookTime}分钟
                      </div>
                    </div>
                    <div style={{ padding: '12px 14px' }}>
                      <div style={{
                        fontSize: '15px', fontWeight: 700,
                        color: '#333', marginBottom: '4px',
                        overflow: 'hidden', textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>{recipe.name}</div>
                      <div style={{
                        fontSize: '12px', color: '#999',
                        marginBottom: '8px',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        lineHeight: 1.5,
                        minHeight: '36px',
                      }}>{recipe.description}</div>
                      <div style={{
                        display: 'flex', flexWrap: 'wrap', gap: '4px',
                      }}>
                        {recipe.tags.slice(0, 3).map((t) => (
                          <span key={t} style={{
                            padding: '2px 8px',
                            background: '#fff5ef',
                            color: '#ff7f50',
                            borderRadius: '8px',
                            fontSize: '10px',
                            fontWeight: 500,
                          }}>{t}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ShoppingItemRow({
  item,
  itemKey,
  isChecked,
  onToggle,
  onTriggerConfetti,
}: {
  item: ShoppingItem;
  itemKey: string;
  isChecked: boolean;
  onToggle: (key: string, el: HTMLElement | null) => void;
  onTriggerConfetti: (el: HTMLElement) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [localConfetti, setLocalConfetti] = useState<
    { id: number; x: number; y: number; color: string; tx: number; ty: number }[]
  >([]);
  const localIdRef = useRef(0);

  const triggerLocalConfetti = () => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const w = rect.width;
    const h = rect.height;
    const cx = w / 2;
    const cy = h / 2;
    const dots = [];
    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI * 2 * i) / 10 + Math.random() * 0.5;
      const dist = 30 + Math.random() * 30;
      dots.push({
        id: ++localIdRef.current,
        x: cx,
        y: cy,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        tx: Math.cos(angle) * dist,
        ty: Math.sin(angle) * dist,
      });
    }
    setLocalConfetti(dots);
    setTimeout(() => setLocalConfetti([]), 550);
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        borderBottom: '1px solid #f0f0f0',
        background: '#fff',
        transition: 'background 0.2s',
      }}
    >
      <label style={{
        position: 'relative',
        width: '22px',
        height: '22px',
        flexShrink: 0,
        cursor: 'pointer',
      }}>
        <input
          type="checkbox"
          checked={isChecked}
          onChange={(e) => {
            e.stopPropagation();
            const label = e.currentTarget.parentElement;
            if (!isChecked) {
              if (label) {
                label.classList.remove('checkbox-animate');
                void label.offsetWidth;
                label.classList.add('checkbox-animate');
              }
              triggerLocalConfetti();
              if (containerRef.current) {
                onTriggerConfetti(containerRef.current);
              }
            }
            onToggle(itemKey, containerRef.current);
          }}
          style={{
            position: 'absolute',
            opacity: 0,
            width: '100%',
            height: '100%',
            cursor: 'pointer',
          }}
        />
        <div style={{
          width: '22px',
          height: '22px',
          borderRadius: '6px',
          border: isChecked ? '2px solid #52c41a' : '2px solid #ddd',
          background: isChecked
            ? 'linear-gradient(135deg, #52c41a, #389e0d)'
            : '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
          pointerEvents: 'none',
          boxShadow: isChecked ? '0 2px 8px rgba(82, 196, 26, 0.3)' : 'none',
        }}>
          {isChecked && (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M11 4L5.5 10L3 7"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
      </label>

      <span style={{
        flex: 1,
        fontSize: '14px',
        color: isChecked ? '#999' : '#333',
        transition: 'all 0.3s ease',
      }} className={isChecked ? 'strikethrough' : ''}>
        {item.name}
      </span>

      <span style={{
        padding: '4px 12px',
        background: isChecked ? '#f5f5f5' : '#fff5ef',
        color: isChecked ? '#bbb' : '#ff7f50',
        borderRadius: '10px',
        fontSize: '12px',
        fontWeight: 600,
        transition: 'all 0.3s ease',
      }}>
        {item.amount}
      </span>

      {localConfetti.map((c) => (
        <span
          key={c.id}
          className="confetti-dot"
          style={{
            left: `${c.x}px`,
            top: `${c.y}px`,
            background: c.color,
            ['--tx' as any]: `${c.tx}px`,
            ['--ty' as any]: `${c.ty}px`,
          }}
        />
      ))}
    </div>
  );
}

function ShoppingListModal({
  groups,
  checked,
  onToggle,
  onClose,
}: {
  groups: ShoppingGroups;
  checked: Map<string, boolean>;
  onToggle: (key: string, el: HTMLElement | null) => void;
  onClose: () => void;
}) {
  const groupEntries = Object.entries(groups);
  const totalItems = groupEntries.reduce((acc, [, items]) => acc + items.length, 0);
  const checkedCount = Array.from(checked.values()).filter(Boolean).length;
  const progress = totalItems ? (checkedCount / totalItems) * 100 : 0;

  const handleTriggerConfetti = useCallback((_el: HTMLElement) => {}, []);

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={shoppingModalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px',
          borderBottom: '1px solid #f0f0f0',
          background: 'linear-gradient(135deg, #fffaf0, #fff0e6)',
        }}>
          <div style={{ flex: 1, marginRight: '16px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#333', margin: 0, marginBottom: '8px' }}>
              🛒 购物清单
            </h2>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              fontSize: '13px', color: '#888',
            }}>
              <div style={{
                flex: 1, maxWidth: '240px', height: '6px',
                background: '#f0f0f0', borderRadius: '3px', overflow: 'hidden',
              }}>
                <div style={{
                  width: `${progress}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #ff7f50, #ffa07a)',
                  borderRadius: '3px',
                  transition: 'width 0.3s ease',
                }} />
              </div>
              <span>
                已购 <b style={{ color: '#52c41a' }}>{checkedCount}</b> / {totalItems}
              </span>
            </div>
          </div>
          <button onClick={onClose} style={modalCloseStyle}>×</button>
        </div>

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px 24px 24px',
        }}>
          {groupEntries.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '80px 20px',
              color: '#999', fontSize: '14px',
            }}>
              <div style={{ fontSize: '56px', marginBottom: '12px' }}>📭</div>
              <div>购物清单为空</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {groupEntries.map(([category, items]) => (
                <div key={category}>
                  <div style={{
                    display: 'flex', alignItems: 'center',
                    gap: '8px', marginBottom: '12px',
                    paddingBottom: '8px',
                    borderBottom: '2px solid #ffe4d6',
                  }}>
                    <span style={{ fontSize: '18px' }}>{categoryIcon(category)}</span>
                    <h3 style={{
                      fontSize: '15px', fontWeight: 700,
                      color: '#333', margin: 0, flex: 1,
                    }}>{category}</h3>
                    <span style={{
                      fontSize: '12px', color: '#999',
                      background: '#fff5ef',
                      padding: '2px 10px',
                      borderRadius: '10px',
                    }}>{items.length}项</span>
                  </div>

                  <div style={{
                    background: '#fafafa',
                    borderRadius: '12px',
                    overflow: 'hidden',
                  }}>
                    {items.map((item: ShoppingItem, idx: number) => {
                      const itemKey = `${category}-${item.name}`;
                      const isChecked = checked.get(itemKey) || false;
                      return (
                        <ShoppingItemRow
                          key={item.name}
                          item={item}
                          itemKey={itemKey}
                          isChecked={isChecked}
                          onToggle={onToggle}
                          onTriggerConfetti={handleTriggerConfetti}
                          style={idx === items.length - 1 ? { borderBottom: 'none' } : {}}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #f0f0f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
        }}>
          <div style={{ fontSize: '13px', color: '#888' }}>
            💡 勾选已购买的食材，完成全部采购就可以享受美餐啦！
          </div>
          <button
            className="coral-gradient-btn"
            onClick={onClose}
            style={{ padding: '10px 24px' }}
          >
            完成购物
          </button>
        </div>
      </div>
    </div>
  );
}

function categoryIcon(cat: string) {
  const map: Record<string, string> = {
    '蔬菜类': '🥬',
    '肉类蛋奶': '🥩',
    '主食谷物': '🍚',
    '调味料': '🧂',
    '乳制品': '🥛',
    '水果类': '🍎',
    '油及其他': '🫒',
    '其他食材': '📦',
  };
  return map[cat] || '📦';
}

const toastStyle: React.CSSProperties = {
  position: 'fixed',
  top: '80px',
  left: '50%',
  transform: 'translateX(-50%)',
  background: '#fff',
  color: '#333',
  padding: '12px 24px',
  borderRadius: '12px',
  boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
  zIndex: 10000,
  fontSize: '14px',
  maxWidth: '90%',
};

const gridContainerStyle: React.CSSProperties = {
  background: '#f7f7f7',
  borderRadius: '20px',
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.04)',
  overflowX: 'auto',
};

const gridHeaderRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `90px repeat(${DAYS.length}, minmax(140px, 1fr))`,
  gap: '10px',
};

const gridRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `90px repeat(${DAYS.length}, minmax(140px, 1fr))`,
  gap: '10px',
};

const gridHeaderCellStyle: React.CSSProperties = {
  padding: '12px 10px',
  textAlign: 'center',
  borderRadius: '12px',
  background: '#fff',
  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
};

const gridSlotHeaderStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '10px',
  background: '#fff',
  borderRadius: '12px',
  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  minHeight: '100px',
};

const gridCellStyle: React.CSSProperties = {
  minHeight: '120px',
  padding: '16px',
  background: '#fff',
  borderRadius: '12px',
  cursor: 'pointer',
  border: '2px dashed transparent',
  display: 'flex',
  alignItems: 'center',
  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  userSelect: 'none',
  touchAction: 'none',
};

const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: '20px',
  backdropFilter: 'blur(4px)',
};

const pickerModalStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: '20px',
  width: '100%',
  maxWidth: '1000px',
  maxHeight: '92vh',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
};

const shoppingModalStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: '20px',
  width: '100%',
  maxWidth: '560px',
  maxHeight: '92vh',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
};

const modalCloseStyle: React.CSSProperties = {
  width: '36px',
  height: '36px',
  borderRadius: '50%',
  background: '#f0f0f0',
  color: '#666',
  fontSize: '22px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.2s',
  flexShrink: 0,
};
