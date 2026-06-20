import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Item,
  Equipment,
  CraftResult,
  UpgradeResult,
  RecipeSummary,
  Rarity,
  RARITY_COLORS,
  RARITY_LABELS,
} from '../types';

interface CraftingPanelProps {
  inventory: Item[];
  gold: number;
  onRemoveItem: (itemId: string) => Item | null;
  onAddEquipment: (equip: Item) => void;
  onUpdateItem: (itemId: string, newItem: Item) => void;
  onConsumeMaterials: (required: Record<string, number>) => boolean;
  onSpendGold: (amount: number) => boolean;
  addTask: (task: {
    type: 'simulate' | 'craft' | 'upgrade';
    status: 'idle' | 'running' | 'success' | 'error';
    message: string;
  }) => string;
  updateTask: (
    id: string,
    updates: Partial<{
      status: 'idle' | 'running' | 'success' | 'error';
      message: string;
    }>,
  ) => void;
  hoveredItem: { item: Item; x: number; y: number } | null;
  onHoverItem: (info: { item: Item; x: number; y: number } | null) => void;
}

interface ParticleDef {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  vx: number;
  vy: number;
}

const CRAFT_SLOTS = 9;

const typeLabel = (t: string): string => {
  const map: Record<string, string> = {
    weapon: '武器',
    armor: '护甲',
    consumable: '消耗品',
    accessory: '饰品',
    material: '材料',
  };
  return map[t] || t;
};

const CraftingPanel: React.FC<CraftingPanelProps> = ({
  inventory,
  gold,
  onRemoveItem,
  onAddEquipment,
  onUpdateItem,
  onConsumeMaterials,
  onSpendGold,
  addTask,
  updateTask,
  hoveredItem,
  onHoverItem,
}) => {
  const [craftSlots, setCraftSlots] = useState<(Item | null)[]>(() =>
    Array.from({ length: CRAFT_SLOTS }, () => null),
  );
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [craftResult, setCraftResult] = useState<CraftResult | null>(null);
  const [crafting, setCrafting] = useState<boolean>(false);
  const [recipes, setRecipes] = useState<Record<string, RecipeSummary>>({});
  const [selectedEquipment, setSelectedEquipment] = useState<{
    item: Equipment;
    originalId: string;
  } | null>(null);
  const [upgradeLoading, setUpgradeLoading] = useState<boolean>(false);
  const [upgradeMsg, setUpgradeMsg] = useState<string>('');
  const [particles, setParticles] = useState<ParticleDef[]>([]);
  const [showSuccessBurst, setShowSuccessBurst] = useState<boolean>(false);
  const particleIdRef = useRef<number>(0);
  const resultAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    axios
      .get('/api/recipes')
      .then((res) => {
        if (res.data.success && res.data.recipes) {
          setRecipes(res.data.recipes);
        }
      })
      .catch(() => {});
  }, []);

  const triggerParticles = useCallback(() => {
    if (!resultAreaRef.current) return;
    const rect = resultAreaRef.current.getBoundingClientRect();
    const containerRect = resultAreaRef.current
      .closest('.crafting-zone')
      ?.getBoundingClientRect();
    if (!containerRect) return;

    const centerX = rect.left - containerRect.left + rect.width / 2;
    const centerY = rect.top - containerRect.top + rect.height / 2;
    const colors = ['#ffa726', '#ab47bc', '#4fc3f7', '#7ee787', '#e94560', '#ffd700'];
    const newParticles: ParticleDef[] = [];
    const count = 28;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 60 + Math.random() * 90;
      newParticles.push({
        id: particleIdRef.current++,
        x: centerX,
        y: centerY,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 4 + Math.random() * 6,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
      });
    }
    setParticles(newParticles);
    setShowSuccessBurst(true);

    setTimeout(() => {
      setParticles([]);
      setShowSuccessBurst(false);
    }, 900);
  }, []);

  const handleSlotDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== idx) setDragOverIndex(idx);
  };

  const handleSlotDragLeave = () => setDragOverIndex(null);

  const handleSlotDrop = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIndex(null);
    try {
      const raw = e.dataTransfer.getData('application/json');
      if (!raw) return;
      const data = JSON.parse(raw);
      if (!data.item) return;

      const item: Item = data.item;

      setCraftSlots((prev) => {
        const next = [...prev];
        const existing = next[idx];
        if (data.source === 'craft' && data.slotIndex !== undefined && data.slotIndex !== idx) {
          next[data.slotIndex] = existing;
        } else if (existing && data.source === 'inventory') {
          return prev;
        }
        if (data.source === 'inventory' && data.itemId) {
          onRemoveItem(data.itemId);
        }
        next[idx] = item;
        return next;
      });
    } catch (e) {
      console.error('drop error', e);
    }
  };

  const handleSlotDragStart = (e: React.DragEvent, idx: number) => {
    const item = craftSlots[idx];
    if (!item) return;
    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({ source: 'craft', slotIndex: idx, item }),
    );
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleSlotClick = (idx: number) => {
    const item = craftSlots[idx];
    if (!item) return;
    setCraftSlots((prev) => {
      const next = [...prev];
      next[idx] = null;
      return next;
    });
    onAddEquipment(item);
  };

  const clearCraftSlots = useCallback(() => {
    craftSlots.forEach((item) => {
      if (item) onAddEquipment(item);
    });
    setCraftSlots(Array.from({ length: CRAFT_SLOTS }, () => null));
    setCraftResult(null);
  }, [craftSlots, onAddEquipment]);

  const handleCraft = useCallback(async () => {
    const materials = craftSlots.filter((s) => s !== null) as Item[];
    if (materials.length === 0) {
      setCraftResult({ success: false, reason: '请先将材料拖入合成槽' });
      return;
    }

    const taskId = addTask({
      type: 'craft',
      status: 'running',
      message: `正在尝试合成 ${materials.length} 件材料...`,
    });
    setCrafting(true);

    try {
      const res = await axios.post('/api/craft', { materials });
      if (res.data.success && res.data.data) {
        const data: CraftResult = res.data.data;
        setCraftResult(data);

        if (data.success && data.result) {
          onConsumeMaterialsByName(materials);
          setCraftSlots(Array.from({ length: CRAFT_SLOTS }, () => null));
          onAddEquipment(data.result);
          triggerParticles();
          updateTask(taskId, {
            status: 'success',
            message: `🔨 合成成功：${data.result.name}！`,
          });
        } else {
          updateTask(taskId, {
            status: 'error',
            message: `❌ 合成失败：${data.reason || '未知配方'}`,
          });
        }
      } else {
        throw new Error(res.data.error || '合成失败');
      }
    } catch (e: any) {
      const msg = e?.response?.data?.error || e.message || '未知错误';
      setCraftResult({ success: false, reason: msg });
      updateTask(taskId, { status: 'error', message: `❌ 合成失败: ${msg}` });
    } finally {
      setCrafting(false);
    }
  }, [craftSlots, addTask, updateTask, onConsumeMaterialsByName, onAddEquipment, triggerParticles]);

  const onConsumeMaterialsByName = (mats: Item[]) => {
    const counts: Record<string, number> = {};
    mats.forEach((m) => {
      counts[m.name] = (counts[m.name] || 0) + m.quantity;
    });
    onConsumeMaterials(counts);
  };

  const handleSelectEquipmentForUpgrade = (item: Item) => {
    if (!item.type || !['weapon', 'armor', 'accessory'].includes(item.type) || !item.id) return;
    if (!item.attributes || Object.keys(item.attributes).length === 0) return;
    setSelectedEquipment({
      item: {
        ...item,
        level: item.level ?? 0,
        attributes: item.attributes,
        type: item.type as 'weapon' | 'armor' | 'accessory',
      },
      originalId: item.id,
    });
    setUpgradeMsg('');
  };

  const calculateUpgradeCost = (level: number) => ({
    gold: (level + 1) * 100,
    rate: Math.max(0.05, 0.5 - level * 0.1),
  });

  const handleUpgrade = useCallback(async () => {
    if (!selectedEquipment) return;
    const cost = calculateUpgradeCost(selectedEquipment.item.level);

    const mats: Item[] = [
      { name: '龙鳞', icon: '🛡️', rarity: 'rare', description: '', quantity: 1 },
      { name: '星尘', icon: '✨', rarity: 'legendary', description: '', quantity: 1 },
    ];
    const reqCounts: Record<string, number> = { 龙鳞: 1, 星尘: 1 };

    const haveCounts: Record<string, number> = {};
    inventory.forEach((it) => {
      haveCounts[it.name] = (haveCounts[it.name] || 0) + it.quantity;
    });
    const missing = Object.keys(reqCounts).filter((k) => (haveCounts[k] || 0) < reqCounts[k]);
    if (missing.length > 0) {
      setUpgradeMsg(`缺少材料：${missing.join('、')}（需要龙鳞 + 星尘）`);
      return;
    }
    if (gold < cost.gold) {
      setUpgradeMsg(`金币不足，需要 ${cost.gold} 金币`);
      return;
    }

    const taskId = addTask({
      type: 'upgrade',
      status: 'running',
      message: `正在升级 ${selectedEquipment.item.name}（成功率 ${(cost.rate * 100).toFixed(0)}%）...`,
    });
    setUpgradeLoading(true);

    try {
      const res = await axios.post('/api/upgrade', {
        equipment: selectedEquipment.item,
        materials: mats,
        gold: cost.gold,
      });

      if (res.data.success && res.data.data) {
        const data: UpgradeResult = res.data.data;

        if (data.success) {
          onConsumeMaterials(reqCounts);
          onSpendGold(cost.gold);
          onUpdateItem(selectedEquipment.originalId, data.equipment as Item);
          setSelectedEquipment({
            item: data.equipment,
            originalId: selectedEquipment.originalId,
          });
          triggerParticles();
          setUpgradeMsg(`✅ 升级成功！当前等级 +${data.equipment.level}`);
          updateTask(taskId, {
            status: 'success',
            message: `⬆️ ${data.equipment.name} 升级至 +${data.equipment.level}！`,
          });
        } else {
          onConsumeMaterials(reqCounts);
          onSpendGold(cost.gold);
          setUpgradeMsg(`❌ ${data.reason || '升级失败，材料已消耗'}`);
          updateTask(taskId, {
            status: 'error',
            message: `⬇️ ${selectedEquipment.item.name} 升级失败（成功率 ${(cost.rate * 100).toFixed(0)}%）`,
          });
        }
      }
    } catch (e: any) {
      setUpgradeMsg(`错误：${e.message}`);
    } finally {
      setUpgradeLoading(false);
    }
  }, [
    selectedEquipment,
    gold,
    inventory,
    addTask,
    updateTask,
    onConsumeMaterials,
    onSpendGold,
    onUpdateItem,
    triggerParticles,
  ]);

  const equipmentsInInventory = inventory.filter(
    (it) => it.type && ['weapon', 'armor', 'accessory'].includes(it.type) && it.attributes,
  );

  const renderCraftSlot = (idx: number) => {
    const item = craftSlots[idx];
    const rColor = item ? RARITY_COLORS[item.rarity as Rarity] : undefined;
    const isOver = dragOverIndex === idx;
    return (
      <div
        key={idx}
        className={`craft-slot ${item ? 'filled' : ''} ${isOver ? 'drag-over' : ''}`}
        style={
          {
            borderColor: isOver ? '#e94560' : rColor,
            ['--r-color' as any]: rColor,
          } as React.CSSProperties
        }
        onDragOver={(e) => handleSlotDragOver(e, idx)}
        onDragLeave={handleSlotDragLeave}
        onDrop={(e) => handleSlotDrop(e, idx)}
        onDragStart={(e) => handleSlotDragStart(e, idx)}
        onClick={() => handleSlotClick(idx)}
        draggable={!!item}
        onMouseEnter={(e) => {
          if (item) {
            onHoverItem({ item, x: e.clientX + 12, y: e.clientY + 12 });
          }
        }}
        onMouseMove={(e) => {
          if (item) {
            onHoverItem({ item, x: e.clientX + 12, y: e.clientY + 12 });
          }
        }}
        onMouseLeave={() => onHoverItem(null)}
      >
        {item && (
          <>
            <span>{item.icon}</span>
            {item.quantity > 1 && (
              <span className="item-quantity">{item.quantity}</span>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div>
      <h1 className="page-title">
        <span className="page-title-icon">🔨</span>
        合成与升级
      </h1>

      <div className="crafting-layout">
        <div className="crafting-zone" style={{ position: 'relative', overflow: 'visible' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)' }}>
            ⚙️ 合成台
          </h2>

          <div className="crafting-grid">{Array.from({ length: CRAFT_SLOTS }, (_, i) => renderCraftSlot(i))}</div>

          <div className="craft-actions">
            <motion.button
              className="btn"
              onClick={handleCraft}
              disabled={crafting || craftSlots.every((s) => !s)}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              {crafting ? '⏳ 合成中...' : '🔥 开始合成'}
            </motion.button>
            <motion.button
              className="btn btn-secondary"
              onClick={clearCraftSlots}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              ↩️ 退还材料
            </motion.button>
          </div>

          <div className="result-area" ref={resultAreaRef}>
            <AnimatePresence mode="wait">
              {craftResult?.success && craftResult.result ? (
                <motion.div
                  key="craft-ok"
                  className="result-equipment"
                  initial={{ scale: 0.3, opacity: 0, rotate: -20 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                  style={
                    {
                      borderColor: craftResult.rarity_color || '#e94560',
                      ['--r-color' as any]: craftResult.rarity_color || '#e94560',
                    } as React.CSSProperties
                  }
                >
                  <div className="success-msg">✨ 合成成功！</div>
                  <div className="result-icon" style={{ position: 'relative' }}>
                    {craftResult.result.icon}
                    {craftResult.result.level && craftResult.result.level > 0 && (
                      <span className="equipment-badge">+{craftResult.result.level}</span>
                    )}
                  </div>
                  <div
                    style={{
                      fontWeight: 700,
                      color: craftResult.rarity_color || '#fff',
                    }}
                  >
                    {craftResult.result.name}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: craftResult.rarity_color,
                      opacity: 0.9,
                    }}
                  >
                    {RARITY_LABELS[craftResult.result.rarity as Rarity]} ·{' '}
                    {typeLabel(craftResult.result.type || '')}
                  </div>
                  {craftResult.result.attributes &&
                    Object.keys(craftResult.result.attributes).length > 0 && (
                      <div className="attr-list">
                        {Object.entries(craftResult.result.attributes).map(([k, v]) => (
                          <div key={k}>
                            {k}: {v}
                          </div>
                        ))}
                      </div>
                    )}
                </motion.div>
              ) : craftResult && !craftResult.success ? (
                <motion.div
                  key="craft-err"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  style={{ width: '100%' }}
                >
                  <div className="error-msg">❌ {craftResult.reason}</div>
                  {craftResult.close_matches && craftResult.close_matches.length > 0 && (
                    <div
                      style={{
                        fontSize: 11,
                        textAlign: 'center',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      相关配方参考：{craftResult.close_matches.join('、')}
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{ color: 'var(--text-secondary)', fontSize: 13 }}
                >
                  🎯 将材料拖入上方合成槽
                  <br />
                  <span style={{ fontSize: 11, opacity: 0.7 }}>
                    点击合成槽中的物品可退还至背包
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {showSuccessBurst && (
            <div className="particles-container" aria-hidden>
              {particles.map((p) => (
                <motion.div
                  key={p.id}
                  className="particle"
                  initial={{ x: p.x, y: p.y, opacity: 1, scale: 1 }}
                  animate={{
                    x: p.x + p.vx,
                    y: p.y + p.vy + 80,
                    opacity: 0,
                    scale: 0.2,
                  }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  style={{
                    width: p.size,
                    height: p.size,
                    background: p.color,
                    boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
                  }}
                />
              ))}
            </div>
          )}

          <div className="upgrade-section">
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent)' }}>
              ⬆️ 装备升级
            </h3>

            {equipmentsInInventory.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center' }}>
                暂无可升级装备（合成武器/护甲/饰品后可升级）
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 8,
                  justifyContent: 'center',
                  maxWidth: 360,
                }}
              >
                {equipmentsInInventory.slice(0, 12).map((it) => {
                  const rColor = RARITY_COLORS[it.rarity as Rarity];
                  const isSel = selectedEquipment?.originalId === it.id;
                  return (
                    <motion.div
                      key={it.id}
                      whileTap={{ scale: 0.92 }}
                      onClick={() => handleSelectEquipmentForUpgrade(it)}
                      style={{
                        width: 54,
                        height: 54,
                        borderRadius: 8,
                        background: 'var(--bg-primary)',
                        border: `2px solid ${isSel ? 'var(--accent)' : rColor}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 26,
                        cursor: 'pointer',
                        position: 'relative',
                        transition: 'all 0.2s',
                        boxShadow: isSel ? '0 0 12px rgba(233,69,96,0.4)' : 'none',
                      }}
                      onMouseEnter={(e) =>
                        onHoverItem({ item: it, x: e.clientX + 12, y: e.clientY + 12 })
                      }
                      onMouseMove={(e) =>
                        onHoverItem({ item: it, x: e.clientX + 12, y: e.clientY + 12 })
                      }
                      onMouseLeave={() => onHoverItem(null)}
                    >
                      {it.icon}
                      {it.level && it.level > 0 && (
                        <span className="item-level">+{it.level}</span>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}

            {selectedEquipment && (
              <div
                style={{
                  width: '100%',
                  maxWidth: 360,
                  background: 'var(--bg-primary)',
                  borderRadius: 10,
                  padding: 14,
                  border: `1px solid ${RARITY_COLORS[selectedEquipment.item.rarity]}55`,
                }}
              >
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div
                    style={{
                      fontSize: 42,
                      position: 'relative',
                      lineHeight: 1,
                    }}
                  >
                    {selectedEquipment.item.icon}
                    {selectedEquipment.item.level > 0 && (
                      <span className="equipment-badge" style={{ top: -10, right: -10 }}>
                        +{selectedEquipment.item.level}
                      </span>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontWeight: 700,
                        color: RARITY_COLORS[selectedEquipment.item.rarity],
                      }}
                    >
                      {selectedEquipment.item.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                      {RARITY_LABELS[selectedEquipment.item.rarity]} ·{' '}
                      {typeLabel(selectedEquipment.item.type)}
                    </div>
                    <div className="attr-list" style={{ marginTop: 4 }}>
                      {Object.entries(selectedEquipment.item.attributes).map(([k, v]) => (
                        <div key={k}>
                          {k}: {v}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="upgrade-info" style={{ marginTop: 12 }}>
                  升级需要：🛡️ 龙鳞 x1 + ✨ 星尘 x1 +{' '}
                  <span style={{ color: '#ffd700', fontWeight: 600 }}>
                    💰 {calculateUpgradeCost(selectedEquipment.item.level).gold}
                  </span>
                  <br />
                  成功率：
                  <span className="upgrade-rate">
                    {(calculateUpgradeCost(selectedEquipment.item.level).rate * 100).toFixed(0)}%
                  </span>
                  （成功属性+10%，失败消耗材料保留装备）
                </div>
                {upgradeMsg && (
                  <div
                    style={{
                      fontSize: 12,
                      marginTop: 8,
                      textAlign: 'center',
                      padding: '6px',
                      borderRadius: 6,
                      background: upgradeMsg.includes('成功')
                        ? 'rgba(126,231,135,0.1)'
                        : 'rgba(255,107,107,0.1)',
                      color: upgradeMsg.includes('成功') ? '#7ee787' : '#ff6b6b',
                    }}
                  >
                    {upgradeMsg}
                  </div>
                )}
                <motion.button
                  className="btn"
                  style={{ width: '100%', marginTop: 10 }}
                  onClick={handleUpgrade}
                  disabled={upgradeLoading}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  {upgradeLoading ? '⏳ 升级中...' : '⬆️ 立即升级'}
                </motion.button>
              </div>
            )}
          </div>
        </div>

        <div className="recipes-panel">
          <h2
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: 'var(--accent)',
              marginBottom: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            📜 合成配方大全
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 400 }}>
              （共 {Object.keys(recipes).length} 种）
            </span>
          </h2>
          {Object.keys(recipes).length === 0 ? (
            <div className="empty-hint" style={{ padding: '40px 20px' }}>
              <div className="empty-hint-icon">📜</div>
              加载配方中...
            </div>
          ) : (
            <div className="recipes-list">
              {Object.entries(recipes).map(([name, r]) => {
                const rColor = RARITY_COLORS[r.result.rarity as Rarity];
                return (
                  <div key={name} className="recipe-card">
                    <div className="recipe-header">
                      <span className="recipe-icon">{r.result.icon}</span>
                      <span
                        className="recipe-name"
                        style={{ color: rColor }}
                      >
                        {name}
                      </span>
                    </div>
                    <div className="recipe-materials">
                      {Object.entries(r.materials).map(([m, c]) => (
                        <span key={m} className="recipe-mat">
                          {m} x{c}
                        </span>
                      ))}
                    </div>
                    <div
                      style={{
                        marginTop: 8,
                        fontSize: 11,
                        color: rColor,
                        display: 'flex',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span>{RARITY_LABELS[r.result.rarity as Rarity]}</span>
                      <span>{typeLabel(r.result.type)}</span>
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
};

export default CraftingPanel;
