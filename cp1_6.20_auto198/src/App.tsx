import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RunePanel } from '@/casting/RunePanel';
import { CastingScene } from '@/casting/CastingScene';
import { DisplayBoard } from '@/display/DisplayBoard';
import { Workbench } from '@/display/Workbench';
import { gameApi } from '@/api/gameApi';
import { RuneType, MagicItem, CombinationRule } from '@/types';
import './App.css';

function App() {
  const [gold, setGold] = useState(500);
  const [items, setItems] = useState<MagicItem[]>([]);
  const [selectedRunes, setSelectedRunes] = useState<RuneType[]>([]);
  const [craftedItem, setCraftedItem] = useState<MagicItem | null>(null);
  const [isCasting, setIsCasting] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [combinationRules, setCombinationRules] = useState<CombinationRule[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const [rules, inventory] = await Promise.all([
        gameApi.fetchRuneCombination(),
        gameApi.fetchInventory(),
      ]);
      setCombinationRules(rules);
      setItems(inventory.items);
      setGold(inventory.gold);
    };
    loadData();

    const handleResize = () => {
      setSidebarCollapsed(window.innerWidth < 1200);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    gameApi.saveGame(items, gold);
  }, [items, gold]);

  const showMessage = useCallback((msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 2000);
  }, []);

  const handleRuneClick = useCallback((rune: RuneType) => {
    if (selectedRunes.length < 3) {
      setSelectedRunes(prev => [...prev, rune]);
    }
  }, [selectedRunes.length]);

  const handleRuneRemove = useCallback((index: number) => {
    setSelectedRunes(prev => prev.filter((_, i) => i !== index));
    setCraftedItem(null);
  }, []);

  const handleRuneDragStart = useCallback((rune: RuneType) => {
    // 拖拽开始的视觉反馈
  }, []);

  const handleDropRune = useCallback((rune: RuneType) => {
    if (selectedRunes.length < 3) {
      setSelectedRunes(prev => [...prev, rune]);
    }
  }, [selectedRunes.length]);

  const handleCraft = useCallback(async () => {
    if (selectedRunes.length === 0 || isCasting) return;
    if (gold < 50) {
      showMessage('金币不足！');
      return;
    }

    setIsCasting(true);
    setGold(prev => prev - 50);
    
    try {
      const result = await gameApi.craftItem(selectedRunes);
      if (result.success && result.item) {
        setCraftedItem(result.item);
        setItems(prev => [...prev, result.item!]);
        showMessage(`铸造成功：${result.item.name}！`);
      }
    } catch (error) {
      showMessage('铸造失败，请重试');
      setGold(prev => prev + 50);
    } finally {
      setTimeout(() => {
        setIsCasting(false);
      }, 1500);
    }
  }, [selectedRunes, isCasting, gold, showMessage]);

  const handleClearRunes = useCallback(() => {
    setSelectedRunes([]);
    setCraftedItem(null);
  }, []);

  const handleItemDragStart = useCallback((item: MagicItem) => {
    setSelectedItemId(item.id);
  }, []);

  const handleItemDragEnd = useCallback(() => {
    // 拖拽结束
  }, []);

  const handleItemClick = useCallback((item: MagicItem) => {
    setSelectedItemId(prev => prev === item.id ? null : item.id);
  }, []);

  const handleUpgrade = useCallback(async (item1Id: string, item2Id: string) => {
    if (isUpgrading) return null;
    
    setIsUpgrading(true);
    try {
      const result = await gameApi.upgradeItem(item1Id, item2Id, items);
      if (result.success && result.item) {
        setItems(prev => {
          const filtered = prev.filter(i => i.id !== item1Id && i.id !== item2Id);
          return [...filtered, result.item!];
        });
        showMessage(`融合成功：${result.item.name}！`);
        return result.item;
      } else {
        showMessage(result.message || '融合失败');
        return null;
      }
    } catch (error) {
      showMessage('融合失败，请重试');
      return null;
    } finally {
      setIsUpgrading(false);
    }
  }, [isUpgrading, items, showMessage]);

  const handleReset = useCallback(() => {
    if (confirm('确定要重置游戏吗？所有进度将丢失！')) {
      localStorage.removeItem('magic_workshop_inventory');
      setItems([]);
      setGold(500);
      setSelectedRunes([]);
      setCraftedItem(null);
      showMessage('游戏已重置');
    }
  }, [showMessage]);

  return (
    <div className="app-container">
      {/* 顶部工具条 */}
      <header className="toolbar">
        <div className="toolbar-left">
          <button
            className="toggle-sidebar-btn"
            onClick={() => setSidebarCollapsed(prev => !prev)}
            title={sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'}
          >
            ☰
          </button>
          <h1 className="game-title">
            <span className="title-icon">✨</span>
            魔法符文工坊
          </h1>
        </div>
        
        <div className="toolbar-center">
          <div className="gold-display">
            <span className="gold-icon">💰</span>
            <span className="gold-amount">{gold}</span>
            <span className="gold-label">金币</span>
          </div>
        </div>

        <div className="toolbar-right">
          <button
            className="settings-btn"
            onClick={() => setShowSettings(prev => !prev)}
            title="设置"
          >
            ⚙️
          </button>
        </div>
      </header>

      {/* 设置面板 */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            className="settings-panel"
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ duration: 0.3 }}
          >
            <h3>设置</h3>
            <button className="reset-btn" onClick={handleReset}>
              重置游戏
            </button>
            <button
              className="close-settings-btn"
              onClick={() => setShowSettings(false)}
            >
              关闭
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="main-content">
        {/* 左侧符文架 */}
        <aside
          className={`sidebar left-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}
        >
          <RunePanel
            selectedRunes={selectedRunes}
            onRuneDragStart={handleRuneDragStart}
            onRuneClick={handleRuneClick}
            onRuneRemove={handleRuneRemove}
          />
        </aside>

        {/* 中央3D渲染区域 */}
        <main className="center-area">
          <div className="casting-section">
            <CastingScene
              selectedRunes={selectedRunes}
              onDropRune={handleDropRune}
              isCasting={isCasting}
              craftedItem={craftedItem}
            />
            
            {/* 铸造按钮区域 */}
            <div className="cast-controls">
              <motion.button
                className="cast-button"
                onClick={handleCraft}
                disabled={selectedRunes.length === 0 || isCasting || gold < 50}
                whileHover={selectedRunes.length > 0 && !isCasting && gold >= 50 ? { scale: 1.05 } : {}}
                whileTap={selectedRunes.length > 0 && !isCasting && gold >= 50 ? { scale: 0.95 } : {}}
                transition={{ duration: 0.2 }}
              >
                {isCasting ? '铸造中...' : `🔨 铸造 (-50金币)`}
              </motion.button>
              
              {selectedRunes.length > 0 && (
                <button
                  className="clear-button"
                  onClick={handleClearRunes}
                >
                  清空
                </button>
              )}
            </div>
          </div>

          {/* 工作台区域 */}
          <Workbench
            items={items}
            onUpgrade={handleUpgrade}
            isUpgrading={isUpgrading}
          />
        </main>

        {/* 右侧物品栏 */}
        <aside
          className={`sidebar right-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}
        >
          <DisplayBoard
            items={items}
            onItemDragStart={handleItemDragStart}
            onItemDragEnd={handleItemDragEnd}
            onItemClick={handleItemClick}
            selectedItemId={selectedItemId}
          />
        </aside>
      </div>

      {/* 消息提示 */}
      <AnimatePresence>
        {message && (
          <motion.div
            className="toast-message"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
