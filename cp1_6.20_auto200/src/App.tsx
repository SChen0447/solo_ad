import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CardEditor from './CardEditor';
import BattleSimulator from './BattleSimulator';
import CardDeck from './CardDeck';
import { Card, TabType, BattleCell, AttackState, THEME, SIZES, ANIMATION_CONFIG } from './types';
import { loadCardsFromStorage, saveCardsToStorage, createDefaultCard, generateId } from './utils';

const App = () => {
  const [activeTab, setActiveTab] = useState<TabType>('editor');
  const [cards, setCards] = useState<Card[]>([]);
  const [editingCard, setEditingCard] = useState<Card>(createDefaultCard());
  const [battleGrid, setBattleGrid] = useState<{ player: BattleCell[][]; enemy: BattleCell[][] }>({
    player: createEmptyGrid(),
    enemy: createEmptyGrid()
  });
  const [selectedAttacker, setSelectedAttacker] = useState<{ row: number; col: number } | null>(null);
  const [attackState, setAttackState] = useState<AttackState>({
    active: false,
    from: null,
    to: null
  });

  useEffect(() => {
    const saved = loadCardsFromStorage();
    if (saved.length > 0) {
      setCards(saved);
    }
  }, []);

  useEffect(() => {
    if (cards.length > 0) {
      saveCardsToStorage(cards);
    }
  }, [cards]);

  const handleSaveCard = useCallback((card: Card) => {
    const newCard = { ...card, id: generateId(), currentHp: card.hp };
    setCards(prev => [...prev, newCard]);
    setEditingCard(createDefaultCard());
  }, []);

  const handleDeleteCard = useCallback((cardId: string) => {
    setCards(prev => prev.filter(c => c.id !== cardId));
  }, []);

  const handlePlaceCard = useCallback(
    (card: Card, row: number, col: number, side: 'player' | 'enemy') => {
      setBattleGrid(prev => {
        const newGrid = { ...prev };
        const targetGrid = side === 'player' ? [...prev.player] : [...prev.enemy];
        const targetRow = [...targetGrid[row]];
        if (targetRow[col].card === null) {
          targetRow[col] = {
            ...targetRow[col],
            card: { ...card, currentHp: card.hp, position: { row, col }, side }
          };
          targetGrid[row] = targetRow;
          if (side === 'player') {
            newGrid.player = targetGrid;
          } else {
            newGrid.enemy = targetGrid;
          }
        }
        return newGrid;
      });
    },
    []
  );

  const handleRemoveFromBattle = useCallback(
    (row: number, col: number, side: 'player' | 'enemy') => {
      setBattleGrid(prev => {
        const newGrid = { ...prev };
        const targetGrid = side === 'player' ? [...prev.player] : [...prev.enemy];
        const targetRow = [...targetGrid[row]];
        targetRow[col] = { ...targetRow[col], card: null };
        targetGrid[row] = targetRow;
        if (side === 'player') {
          newGrid.player = targetGrid;
        } else {
          newGrid.enemy = targetGrid;
        }
        return newGrid;
      });
      setSelectedAttacker(null);
    },
    []
  );

  const handleAttack = useCallback(
    (targetRow: number, targetCol: number) => {
      if (!selectedAttacker) return;

      const attackerCell = battleGrid.player[selectedAttacker.row][selectedAttacker.col];
      const defenderCell = battleGrid.enemy[targetRow][targetCol];

      if (!attackerCell.card || !defenderCell.card) return;

      const attackerEl = document.getElementById(
        `card-player-${selectedAttacker.row}-${selectedAttacker.col}`
      );
      const defenderEl = document.getElementById(`card-enemy-${targetRow}-${targetCol}`);

      if (attackerEl && defenderEl) {
        const attackerRect = attackerEl.getBoundingClientRect();
        const defenderRect = defenderEl.getBoundingClientRect();
        const containerEl = document.getElementById('battle-container');
        const containerRect = containerEl?.getBoundingClientRect();

        if (containerRect) {
          setAttackState({
            active: true,
            from: {
              x: attackerRect.left + attackerRect.width / 2 - containerRect.left,
              y: attackerRect.top + attackerRect.height / 2 - containerRect.top
            },
            to: {
              x: defenderRect.left + defenderRect.width / 2 - containerRect.left,
              y: defenderRect.top + defenderRect.height / 2 - containerRect.top
            }
          });

          setTimeout(() => {
            setAttackState({ active: false, from: null, to: null });
          }, ANIMATION_CONFIG.attack.duration * 1000);
        }
      }

      setBattleGrid(prev => {
        const newEnemyGrid = [...prev.enemy];
        const targetRowCells = [...newEnemyGrid[targetRow]];
        const defender = targetRowCells[targetCol].card;
        if (defender) {
          const newHp = (defender.currentHp ?? defender.hp) - (attackerCell.card?.attack ?? 0);
          if (newHp <= 0) {
            targetRowCells[targetCol] = { ...targetRowCells[targetCol], card: null };
          } else {
            targetRowCells[targetCol] = {
              ...targetRowCells[targetCol],
              card: { ...defender, currentHp: newHp }
            };
          }
        }
        newEnemyGrid[targetRow] = targetRowCells;
        return { ...prev, enemy: newEnemyGrid };
      });

      setSelectedAttacker(null);
    },
    [selectedAttacker, battleGrid]
  );

  const tabs: { key: TabType; label: string }[] = [
    { key: 'editor', label: '卡牌编辑' },
    { key: 'battle', label: '战斗模拟' },
    { key: 'deck', label: '牌库管理' }
  ];

  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        backgroundColor: THEME.background,
        color: THEME.text
      }}
    >
      <div
        style={{
          width: SIZES.menuWidth,
          backgroundColor: '#16162A',
          borderRight: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '20px 16px',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <h1
          style={{
            fontSize: '22px',
            fontWeight: 700,
            marginBottom: '24px',
            color: THEME.accent,
            letterSpacing: '0.5px'
          }}
        >
          桌游卡牌生成器
        </h1>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '12px 16px',
                backgroundColor: activeTab === tab.key ? 'rgba(233, 69, 96, 0.15)' : 'transparent',
                border: 'none',
                borderRadius: '8px',
                color: THEME.text,
                fontSize: '15px',
                fontWeight: activeTab === tab.key ? 600 : 400,
                cursor: 'pointer',
                textAlign: 'left',
                borderBottom: activeTab === tab.key ? `2px solid ${THEME.accent}` : '2px solid transparent',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={e => {
                if (activeTab !== tab.key) {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                }
              }}
              onMouseLeave={e => {
                if (activeTab !== tab.key) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ marginTop: 'auto', paddingTop: '20px', opacity: 0.6, fontSize: '12px' }}>
          <p>已保存卡牌：{cards.length} 张</p>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: ANIMATION_CONFIG.tabSwitch.duration }}
            style={{ flex: 1, display: 'flex', overflow: 'hidden' }}
          >
            {activeTab === 'editor' && (
              <CardEditor
                card={editingCard}
                onChange={setEditingCard}
                onSave={handleSaveCard}
              />
            )}
            {activeTab === 'battle' && (
              <BattleSimulator
                cards={cards}
                battleGrid={battleGrid}
                selectedAttacker={selectedAttacker}
                attackState={attackState}
                onSelectAttacker={setSelectedAttacker}
                onPlaceCard={handlePlaceCard}
                onRemoveCard={handleRemoveFromBattle}
                onAttack={handleAttack}
              />
            )}
            {activeTab === 'deck' && (
              <CardDeck
                cards={cards}
                onDelete={handleDeleteCard}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

function createEmptyGrid(): BattleCell[][] {
  const grid: BattleCell[][] = [];
  for (let row = 0; row < 3; row++) {
    const rowCells: BattleCell[] = [];
    for (let col = 0; col < 3; col++) {
      rowCells.push({ row, col, card: null });
    }
    grid.push(rowCells);
  }
  return grid;
}

export default App;
