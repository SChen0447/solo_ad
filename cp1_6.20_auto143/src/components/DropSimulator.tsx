import React, { useState, useCallback } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Item,
  Monster,
  Rarity,
  RARITY_COLORS,
  RARITY_LABELS,
  SimulateResult,
} from '../types';

interface DropSimulatorProps {
  selectedMonster: string;
  monsters: Monster[];
  onSelectMonster: (id: string) => void;
  onAddItems: (items: Item[]) => void;
  addTask: (task: {
    type: 'simulate' | 'craft' | 'upgrade';
    status: 'idle' | 'running' | 'success' | 'error';
    message: string;
  }) => string;
  updateTask: (id: string, updates: Partial<{ status: 'idle' | 'running' | 'success' | 'error'; message: string }>) => void;
}

const DropSimulator: React.FC<DropSimulatorProps> = ({
  selectedMonster,
  monsters,
  onSelectMonster,
  onAddItems,
  addTask,
  updateTask,
}) => {
  const [count, setCount] = useState<number>(10);
  const [seed, setSeed] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<SimulateResult | null>(null);
  const [animatingKeys, setAnimatingKeys] = useState<Set<number>>(new Set());
  const [showAll, setShowAll] = useState<boolean>(false);

  const currentMonster = monsters.find((m) => m.id === selectedMonster) || monsters[0];

  const handleSimulate = useCallback(async () => {
    if (!selectedMonster || loading) return;

    const taskId = addTask({
      type: 'simulate',
      status: 'running',
      message: `正在模拟 ${currentMonster?.name} 掉落 x${count}...`,
    });

    setLoading(true);
    try {
      const res = await axios.post('/api/simulate', {
        monster_id: selectedMonster,
        count,
        seed: seed || undefined,
      });

      if (res.data.success && res.data.data) {
        const data: SimulateResult = res.data.data;
        setResult(data);

        const allKeys = new Set<number>();
        data.drops.forEach((_, i) => allKeys.add(i));
        setAnimatingKeys(allKeys);
        setShowAll(false);

        setTimeout(() => {
          onAddItems(data.drops);
          updateTask(taskId, {
            status: 'success',
            message: `✅ ${currentMonster?.name} 掉落 ${data.drops.length} 件物品完成！`,
          });
        }, 600);

        setTimeout(() => {
          setShowAll(true);
          setAnimatingKeys(new Set());
        }, Math.min(data.drops.length * 40 + 400, 2000));
      } else {
        throw new Error(res.data.error || '模拟失败');
      }
    } catch (e: any) {
      const msg = e?.response?.data?.error || e.message || '未知错误';
      updateTask(taskId, { status: 'error', message: `❌ 掉落模拟失败: ${msg}` });
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [selectedMonster, count, seed, loading, currentMonster, addTask, updateTask, onAddItems]);

  const dropsToRender = result?.drops || [];
  const displayDrops = showAll ? dropsToRender : dropsToRender;

  return (
    <div>
      <h1 className="page-title">
        <span className="page-title-icon">⚔️</span>
        掉落模拟器
      </h1>

      <div className="drop-config-panel">
        <div className="form-group" style={{ flex: 1, minWidth: 200 }}>
          <label className="form-label">目标怪物</label>
          <select
            className="form-input"
            value={selectedMonster}
            onChange={(e) => onSelectMonster(e.target.value)}
          >
            {monsters.map((m) => (
              <option key={m.id} value={m.id}>
                {m.icon} {m.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ minWidth: 120 }}>
          <label className="form-label">掉落次数 (1-100)</label>
          <input
            type="number"
            className="form-input"
            value={count}
            min={1}
            max={100}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (isNaN(v)) return;
              setCount(Math.max(1, Math.min(100, v)));
            }}
          />
        </div>

        <div className="form-group" style={{ flex: 1, minWidth: 180 }}>
          <label className="form-label">随机种子（可选，用于复现）</label>
          <input
            type="text"
            className="form-input"
            placeholder="例如: lucky123"
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
          />
        </div>

        <motion.button
          className="btn"
          onClick={handleSimulate}
          disabled={loading}
          whileTap={{ scale: 0.95 }}
          transition={{ duration: 0.2 }}
        >
          {loading ? '⏳ 模拟中...' : '🎲 开始掉落'}
        </motion.button>
      </div>

      <div className="drops-area">
        {result ? (
          <>
            <div className="drops-header">
              <div className="drops-meta">
                <span style={{ fontSize: 28 }}>{result.monster.icon}</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {result.monster.name}
                </span>
                <span>掉落 x{result.count}</span>
                {result.seed && <span>🔑 种子: {result.seed}</span>}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {['common', 'rare', 'epic', 'legendary'].map((r) => {
                  const cnt = result.drops.filter((d) => d.rarity === r).length;
                  return cnt > 0 ? (
                    <span
                      key={r}
                      style={{
                        fontSize: 12,
                        padding: '4px 10px',
                        borderRadius: 12,
                        background: `${RARITY_COLORS[r as Rarity]}22`,
                        color: RARITY_COLORS[r as Rarity],
                        fontWeight: 600,
                        border: `1px solid ${RARITY_COLORS[r as Rarity]}55`,
                      }}
                    >
                      {RARITY_LABELS[r as Rarity]}: {cnt}
                    </span>
                  ) : null;
                })}
              </div>
            </div>

            <div className="drops-grid">
              <AnimatePresence>
                {displayDrops.map((drop, idx) => {
                  const rColor = RARITY_COLORS[drop.rarity as Rarity];
                  const shouldAnimate = !showAll;
                  return (
                    <motion.div
                      key={`${drop.name}-${idx}-${drop.rarity}`}
                      className="drop-card"
                      style={
                        {
                          borderColor: rColor,
                          ['--r-color' as any]: rColor,
                          ['--r-color-10' as any]: `${rColor}22`,
                        } as React.CSSProperties
                      }
                      initial={
                        shouldAnimate
                          ? { opacity: 0, y: -80, rotate: -15, scale: 0.6 }
                          : { opacity: 1, y: 0, rotate: 0, scale: 1 }
                      }
                      animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{
                        duration: 0.35,
                        delay: shouldAnimate ? idx * 0.04 : 0,
                        type: 'spring',
                        stiffness: 260,
                        damping: 22,
                      }}
                      whileHover={{ y: -4, scale: 1.05 }}
                    >
                      <div className="drop-card-icon">{drop.icon}</div>
                      <div className="drop-card-name">{drop.name}</div>
                      <div
                        className="drop-card-rarity"
                        style={{
                          color: rColor,
                          background: `${rColor}22`,
                        }}
                      >
                        {RARITY_LABELS[drop.rarity as Rarity]}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </>
        ) : (
          <div className="empty-hint">
            <div className="empty-hint-icon">🎁</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>选择怪物并点击"开始掉落"</div>
            <div style={{ fontSize: 13, opacity: 0.7, maxWidth: 360 }}>
              设定掉落次数与随机种子后开始模拟。所有掉落物品会自动进入背包，可前往合成面板打造装备！
            </div>
            <div
              style={{
                display: 'flex',
                gap: 10,
                marginTop: 16,
                flexWrap: 'wrap',
                justifyContent: 'center',
              }}
            >
              {[
                { c: '#a0a0a0', l: '普通' },
                { c: '#4fc3f7', l: '稀有' },
                { c: '#ab47bc', l: '史诗' },
                { c: '#ffa726', l: '传说' },
              ].map((r) => (
                <span
                  key={r.l}
                  style={{
                    fontSize: 12,
                    padding: '4px 10px',
                    borderRadius: 12,
                    border: `1px solid ${r.c}`,
                    color: r.c,
                  }}
                >
                  {r.l}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DropSimulator;
