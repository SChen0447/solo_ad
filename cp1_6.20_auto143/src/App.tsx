import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import DropSimulator from './components/DropSimulator';
import CraftingPanel from './components/CraftingPanel';
import {
  Item,
  Monster,
  RARITY_COLORS,
  RARITY_LABELS,
  Rarity,
} from './types';

type Page = 'drop' | 'craft';
type TaskStatus = 'idle' | 'running' | 'success' | 'error';

interface Task {
  id: string;
  type: 'simulate' | 'craft' | 'upgrade';
  status: TaskStatus;
  message: string;
  timestamp: number;
}

const MAX_INVENTORY = 60;

const DEFAULT_MONSTERS: Monster[] = [
  { id: 'slime', name: '史莱姆', icon: '🟢' },
  { id: 'goblin', name: '哥布林', icon: '👺' },
  { id: 'wolf', name: '狼人', icon: '🐺' },
  { id: 'dragon', name: '龙', icon: '🐉' },
  { id: 'skeleton', name: '骷髅兵', icon: '💀' },
  { id: 'golem', name: '石像鬼', icon: '🗿' },
];

const genId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

const App: React.FC = () => {
  const [page, setPage] = useState<Page>('drop');
  const [selectedMonster, setSelectedMonster] = useState<string>('slime');
  const [monsters, setMonsters] = useState<Monster[]>(DEFAULT_MONSTERS);
  const [inventory, setInventory] = useState<Item[]>([]);
  const [gold, setGold] = useState<number>(500);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [hoveredItem, setHoveredItem] = useState<{
    item: Item;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    axios
      .get('/api/monsters')
      .then((res) => {
        if (res.data.success && res.data.monsters) {
          setMonsters(res.data.monsters);
        }
      })
      .catch(() => {});
  }, []);

  const addTask = useCallback((task: Omit<Task, 'id' | 'timestamp'>) => {
    const newTask: Task = {
      ...task,
      id: genId(),
      timestamp: Date.now(),
    };
    setTasks((prev) => [newTask, ...prev].slice(0, 10));
    return newTask.id;
  }, []);

  const updateTask = useCallback((id: string, updates: Partial<Task>) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    );
  }, []);

  const addItemsToInventory = useCallback((items: Item[]) => {
    setInventory((prev) => {
      const stamped: Item[] = items.map((it) => ({
        ...it,
        id: genId(),
        createdAt: Date.now(),
      }));
      const merged = [...prev, ...stamped];
      if (merged.length > MAX_INVENTORY) {
        const overflow = merged.length - MAX_INVENTORY;
        return merged.slice(overflow);
      }
      return merged;
    });
    let goldGained = 0;
    items.forEach((it) => {
      if (it.name === '金币袋') {
        goldGained += 50 * it.quantity;
      }
    });
    if (goldGained > 0) {
      setGold((g) => g + goldGained);
    }
  }, []);

  const removeInventoryItem = useCallback((itemId: string): Item | null => {
    let removed: Item | null = null;
    setInventory((prev) => {
      const idx = prev.findIndex((it) => it.id === itemId);
      if (idx === -1) return prev;
      removed = prev[idx];
      return [...prev.slice(0, idx), ...prev.slice(idx + 1)];
    });
    return removed;
  }, []);

  const consumeMaterialsByName = useCallback(
    (required: Record<string, number>): boolean => {
      const remaining: Record<string, number> = { ...required };
      setInventory((prev) => {
        const next: Item[] = [];
        for (const it of prev) {
          const need = remaining[it.name] || 0;
          if (need > 0) {
            if (it.quantity <= need) {
              remaining[it.name] = need - it.quantity;
            } else {
              remaining[it.name] = 0;
              next.push({ ...it, quantity: it.quantity - need });
            }
          } else {
            next.push(it);
          }
        }
        return next;
      });
      const leftover = Object.values(remaining).reduce((a, b) => a + b, 0);
      return leftover === 0;
    },
    [],
  );

  const addEquipmentToInventory = useCallback((equip: Item) => {
    setInventory((prev) => {
      const merged = [...prev, { ...equip, id: genId(), createdAt: Date.now() }];
      if (merged.length > MAX_INVENTORY) {
        return merged.slice(merged.length - MAX_INVENTORY);
      }
      return merged;
    });
  }, []);

  const updateInventoryItem = useCallback((itemId: string, newItem: Item) => {
    setInventory((prev) =>
      prev.map((it) => (it.id === itemId ? { ...newItem, id: itemId } : it)),
    );
  }, []);

  const spendGold = useCallback(
    (amount: number): boolean => {
      if (gold < amount) return false;
      setGold((g) => g - amount);
      return true;
    },
    [gold],
  );

  const renderInventory = useMemo(() => {
    const slots = Array.from({ length: MAX_INVENTORY }, (_, i) => inventory[i] || null);
    return slots.map((item, i) => {
      const borderColor = item ? RARITY_COLORS[item.rarity as Rarity] : undefined;
      return (
        <div
          key={i}
          className={`inventory-slot ${!item ? 'slot-empty' : ''}`}
          style={item ? { borderColor } : undefined}
          draggable={!!item}
          onDragStart={(e) => {
            if (!item) return;
            e.dataTransfer.setData(
              'application/json',
              JSON.stringify({ source: 'inventory', itemId: item.id, item }),
            );
            e.dataTransfer.effectAllowed = 'move';
            (e.currentTarget as HTMLDivElement).classList.add('dragging');
          }}
          onDragEnd={(e) => {
            (e.currentTarget as HTMLDivElement).classList.remove('dragging');
          }}
          onMouseEnter={(e) => {
            if (!item) return;
            setHoveredItem({ item, x: e.clientX + 12, y: e.clientY + 12 });
          }}
          onMouseMove={(e) => {
            if (!item) return;
            setHoveredItem({ item, x: e.clientX + 12, y: e.clientY + 12 });
          }}
          onMouseLeave={() => setHoveredItem(null)}
        >
          {item && (
            <>
              <span>{item.icon}</span>
              {item.quantity > 1 && (
                <span className="item-quantity">{item.quantity}</span>
              )}
              {item.level !== undefined && item.level > 0 && (
                <span className="item-level">+{item.level}</span>
              )}
            </>
          )}
        </div>
      );
    });
  }, [inventory]);

  return (
    <div className="app-layout">
      <div className="top-nav">
        <button
          className={`nav-btn ${page === 'drop' ? 'active' : ''}`}
          onClick={() => setPage('drop')}
        >
          <span className="nav-btn-icon">⚔️</span>
          <span>掉落</span>
        </button>
        <button
          className={`nav-btn ${page === 'craft' ? 'active' : ''}`}
          onClick={() => setPage('craft')}
        >
          <span className="nav-btn-icon">🔨</span>
          <span>合成</span>
        </button>
        <div className="gold-display">💰 {gold}</div>
      </div>

      <aside className="sidebar">
        <div className="app-title">
          <span>💎</span>
          <span>宝藏生成器</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            className={`nav-btn ${page === 'drop' ? 'active' : ''}`}
            onClick={() => setPage('drop')}
            style={{ flex: 1 }}
          >
            <span className="nav-btn-icon">⚔️</span>
            <span>掉落模拟</span>
          </button>
          <button
            className={`nav-btn ${page === 'craft' ? 'active' : ''}`}
            onClick={() => setPage('craft')}
            style={{ flex: 1 }}
          >
            <span className="nav-btn-icon">🔨</span>
            <span>合成升级</span>
          </button>
        </div>

        <div className="gold-display">💰 金币: {gold}</div>

        <div className="sidebar-section">
          <div className="section-title">怪物列表</div>
          <div className="monster-list">
            {monsters.map((m) => (
              <motion.div
                key={m.id}
                className={`monster-item ${selectedMonster === m.id ? 'selected' : ''}`}
                onClick={() => {
                  setSelectedMonster(m.id);
                  if (page !== 'drop') setPage('drop');
                }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <span className="monster-icon">{m.icon}</span>
                <span className="monster-name">{m.name}</span>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="sidebar-section" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>背包</span>
            <span>{inventory.length}/{MAX_INVENTORY}</span>
          </div>
          <div
            style={{
              overflowY: 'auto',
              paddingRight: '4px',
              flex: 1,
              minHeight: 0,
            }}
          >
            <div className="inventory-grid">{renderInventory}</div>
          </div>
        </div>

        {tasks.length > 0 && (
          <div className="sidebar-section">
            <div className="section-title">任务日志</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '140px', overflowY: 'auto' }}>
              {tasks.slice(0, 5).map((t) => (
                <div
                  key={t.id}
                  style={{
                    fontSize: '12px',
                    padding: '6px 8px',
                    background: 'rgba(255,255,255,0.04)',
                    borderRadius: '6px',
                    borderLeft: `3px solid ${
                      t.status === 'success'
                        ? '#7ee787'
                        : t.status === 'error'
                        ? '#ff6b6b'
                        : t.status === 'running'
                        ? '#ffa726'
                        : '#666'
                    }`,
                    lineHeight: 1.4,
                  }}
                >
                  {t.message}
                </div>
              ))}
            </div>
          </div>
        )}
      </aside>

      <main className="main-content">
        <AnimatePresence mode="wait">
          {page === 'drop' ? (
            <motion.div
              key="drop"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              <DropSimulator
                selectedMonster={selectedMonster}
                monsters={monsters}
                onSelectMonster={setSelectedMonster}
                onAddItems={addItemsToInventory}
                addTask={addTask}
                updateTask={updateTask}
              />
            </motion.div>
          ) : (
            <motion.div
              key="craft"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              <CraftingPanel
                inventory={inventory}
                gold={gold}
                onRemoveItem={removeInventoryItem}
                onAddEquipment={addEquipmentToInventory}
                onUpdateItem={updateInventoryItem}
                onConsumeMaterials={consumeMaterialsByName}
                onSpendGold={spendGold}
                addTask={addTask}
                updateTask={updateTask}
                hoveredItem={hoveredItem}
                onHoverItem={setHoveredItem}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {hoveredItem && (
        <div
          className="tooltip"
          style={{
            left: Math.min(hoveredItem.x, window.innerWidth - 260),
            top: Math.min(hoveredItem.y, window.innerHeight - 200),
          }}
        >
          <div
            className="tooltip-name"
            style={{ color: RARITY_COLORS[hoveredItem.item.rarity as Rarity] }}
          >
            {hoveredItem.item.name}
            {hoveredItem.item.level && hoveredItem.item.level > 0
              ? ` +${hoveredItem.item.level}`
              : ''}
          </div>
          <div
            className="tooltip-rarity"
            style={{ color: RARITY_COLORS[hoveredItem.item.rarity as Rarity] }}
          >
            {RARITY_LABELS[hoveredItem.item.rarity as Rarity]}
            {hoveredItem.item.type ? ` · ${typeLabel(hoveredItem.item.type)}` : ''}
          </div>
          <div className="tooltip-desc">{hoveredItem.item.description}</div>
          {hoveredItem.item.attributes &&
            Object.keys(hoveredItem.item.attributes).length > 0 && (
              <div className="tooltip-attrs">
                {Object.entries(hoveredItem.item.attributes).map(([k, v]) => (
                  <div key={k}>
                    {k}: {v}
                  </div>
                ))}
              </div>
            )}
        </div>
      )}
    </div>
  );
};

function typeLabel(t: string): string {
  const map: Record<string, string> = {
    weapon: '武器',
    armor: '护甲',
    consumable: '消耗品',
    accessory: '饰品',
    material: '材料',
  };
  return map[t] || t;
}

export default App;
