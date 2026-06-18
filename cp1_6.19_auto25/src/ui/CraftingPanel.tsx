import { useState, useRef, useCallback } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { RECIPES } from '@/game/crafting';
import {
  Crystal,
  ELEMENT_COLORS,
  ELEMENT_NAMES,
  ELEMENT_DESCS,
  CRAFT_SLOT_SIZE,
  CRAFT_SLOT_COUNT,
} from '@/types';

export default function CraftingPanel() {
  const craftingSlots = useGameStore((s) => s.craftingSlots);
  const craftResult = useGameStore((s) => s.craftResult);
  const showCraftResult = useGameStore((s) => s.showCraftResult);
  const showCraftingPanel = useGameStore((s) => s.showCraftingPanel);
  const matchedRecipe = useGameStore((s) => s.matchedRecipe);
  const inventory = useGameStore((s) => s.inventory);
  const setCraftingSlot = useGameStore((s) => s.setCraftingSlot);
  const returnCrystalToInventory = useGameStore((s) => s.returnCrystalToInventory);
  const performCraft = useGameStore((s) => s.performCraft);

  const [draggedCrystal, setDraggedCrystal] = useState<Crystal | null>(null);
  const [dragFromSlot, setDragFromSlot] = useState<number | null>(null);
  const [hoveredInventory, setHoveredInventory] = useState<string | null>(null);
  const [hoveredSlot, setHoveredSlot] = useState<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const allSlotsFilled = craftingSlots.every((s) => s !== null);
  const canCraft = allSlotsFilled && matchedRecipe !== null;

  const handleInventoryDragStart = useCallback((e: React.DragEvent, crystal: Crystal) => {
    setDraggedCrystal(crystal);
    setDragFromSlot(null);
    e.dataTransfer.setData('text/plain', crystal.id);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleSlotDragStart = useCallback((e: React.DragEvent, slotIndex: number) => {
    const crystal = craftingSlots[slotIndex];
    if (!crystal) return;
    setDraggedCrystal(crystal);
    setDragFromSlot(slotIndex);
    e.dataTransfer.setData('text/plain', crystal.id);
    e.dataTransfer.effectAllowed = 'move';
  }, [craftingSlots]);

  const handleSlotDrop = useCallback((e: React.DragEvent, slotIndex: number) => {
    e.preventDefault();
    if (!draggedCrystal) return;

    if (dragFromSlot !== null) {
      const existingInSlot = craftingSlots[slotIndex];
      const newSlots = [...craftingSlots];
      newSlots[dragFromSlot] = existingInSlot;
      newSlots[slotIndex] = draggedCrystal;
      for (let i = 0; i < CRAFT_SLOT_COUNT; i++) {
        setCraftingSlot(i, newSlots[i]);
      }
    } else {
      if (craftingSlots[slotIndex] !== null) {
        returnCrystalToInventory(slotIndex);
      }
      setCraftingSlot(slotIndex, draggedCrystal);
    }

    setDraggedCrystal(null);
    setDragFromSlot(null);
  }, [draggedCrystal, dragFromSlot, craftingSlots, setCraftingSlot, returnCrystalToInventory]);

  const handleSlotDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleSlotDoubleClick = useCallback((slotIndex: number) => {
    returnCrystalToInventory(slotIndex);
  }, [returnCrystalToInventory]);

  if (!showCraftingPanel) return null;

  return (
    <div
      ref={panelRef}
      style={{
        position: 'absolute',
        bottom: 10,
        right: 10,
        width: 340,
        background: 'rgba(26, 26, 46, 0.92)',
        borderRadius: 12,
        padding: 16,
        fontFamily: '"Press Start 2P", monospace',
        color: '#e0e0e0',
        fontSize: 10,
        border: '2px solid #3a3a5e',
        backgroundImage: `repeating-linear-gradient(
          90deg,
          rgba(60, 40, 20, 0.15) 0px,
          rgba(60, 40, 20, 0.05) 2px,
          transparent 2px,
          transparent 8px
        )`,
        zIndex: 20,
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: 12, fontSize: 12, color: '#ffd700' }}>
        炼金合成台
      </div>

      <div
        style={{
          display: 'flex',
          gap: 8,
          justifyContent: 'center',
          marginBottom: 12,
        }}
      >
        {craftingSlots.map((crystal, i) => (
          <div
            key={i}
            draggable={!!crystal}
            onDragStart={(e) => handleSlotDragStart(e, i)}
            onDrop={(e) => handleSlotDrop(e, i)}
            onDragOver={handleSlotDragOver}
            onDoubleClick={() => handleSlotDoubleClick(i)}
            onMouseEnter={() => setHoveredSlot(i)}
            onMouseLeave={() => setHoveredSlot(null)}
            style={{
              width: CRAFT_SLOT_SIZE,
              height: CRAFT_SLOT_SIZE,
              border: crystal
                ? `2px solid ${ELEMENT_COLORS[crystal.element]}`
                : '2px dashed #e0e0e0',
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: crystal
                ? `rgba(${hexToRgb(ELEMENT_COLORS[crystal.element])}, 0.2)`
                : 'rgba(255,255,255,0.05)',
              cursor: crystal ? 'grab' : 'pointer',
              position: 'relative',
              transition: 'all 0.15s ease',
              transform: hoveredSlot === i ? 'scale(1.05)' : 'scale(1)',
            }}
          >
            {crystal && (
              <div
                style={{
                  width: 24,
                  height: 24,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {getElementSymbol(crystal.element)}
              </div>
            )}
            {crystal && hoveredSlot === i && (
              <div
                style={{
                  position: 'absolute',
                  bottom: -20,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  fontSize: 7,
                  color: ELEMENT_COLORS[crystal.element],
                  whiteSpace: 'nowrap',
                  background: 'rgba(0,0,0,0.7)',
                  padding: '2px 4px',
                  borderRadius: 3,
                }}
              >
                {ELEMENT_NAMES[crystal.element]}
              </div>
            )}
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 4,
          marginBottom: 12,
          fontSize: 7,
        }}
      >
        {RECIPES.map((recipe, i) => (
          <div
            key={i}
            style={{
              padding: '4px 6px',
              background: matchedRecipe?.resultName === recipe.resultName
                ? `rgba(${hexToRgb(recipe.color)}, 0.3)`
                : 'rgba(255,255,255,0.05)',
              borderRadius: 4,
              border: matchedRecipe?.resultName === recipe.resultName
                ? `1px solid ${recipe.color}`
                : '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span style={{ color: recipe.color }}>★</span>
            <span>{recipe.resultName}</span>
            <span style={{ color: '#888', fontSize: 6 }}>
              {'★'.repeat(recipe.rarity)}
            </span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
        <button
          onClick={canCraft ? performCraft : undefined}
          style={{
            padding: '8px 20px',
            background: canCraft ? '#ff8c00' : '#555',
            color: canCraft ? '#fff' : '#999',
            border: 'none',
            borderRadius: 8,
            fontFamily: '"Press Start 2P", monospace',
            fontSize: 10,
            cursor: canCraft ? 'pointer' : 'not-allowed',
            transition: 'all 0.15s ease',
            transform: 'scale(1)',
          }}
          onMouseDown={(e) => {
            if (canCraft) {
              (e.target as HTMLElement).style.transform = 'scale(0.95)';
            }
          }}
          onMouseUp={(e) => {
            (e.target as HTMLElement).style.transform = 'scale(1)';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLElement).style.transform = 'scale(1)';
          }}
        >
          合成
        </button>
        {allSlotsFilled && !canCraft && (
          <span style={{ color: '#ff6666', fontSize: 8 }}>配方未知</span>
        )}
      </div>

      {showCraftResult && craftResult && (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            background: `rgba(${hexToRgb(craftResult.color)}, 0.15)`,
            border: `1px solid ${craftResult.color}`,
            borderRadius: 8,
            textAlign: 'center',
            animation: 'fadeIn 0.3s ease',
          }}
        >
          <div style={{ fontSize: 14, color: craftResult.color, marginBottom: 4 }}>
            {craftResult.name}
          </div>
          <div style={{ color: '#ffd700', fontSize: 10 }}>
            {'★'.repeat(craftResult.rarity)}{'☆'.repeat(3 - craftResult.rarity)}
          </div>
        </div>
      )}

      {inventory.length > 0 && (
        <div style={{ marginTop: 12, borderTop: '1px solid #3a3a5e', paddingTop: 8 }}>
          <div style={{ fontSize: 8, marginBottom: 6, color: '#888' }}>
            库存结晶 (拖拽到合成槽)
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(6, 1fr)',
              gap: 4,
              maxHeight: 120,
              overflowY: 'auto',
            }}
          >
            {inventory.map((crystal) => (
              <div
                key={crystal.id}
                draggable
                onDragStart={(e) => handleInventoryDragStart(e, crystal)}
                onMouseEnter={() => setHoveredInventory(crystal.id)}
                onMouseLeave={() => setHoveredInventory(null)}
                style={{
                  width: 36,
                  height: 36,
                  border: `2px solid ${ELEMENT_COLORS[crystal.element]}`,
                  borderRadius: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: `rgba(${hexToRgb(ELEMENT_COLORS[crystal.element])}, 0.15)`,
                  cursor: 'grab',
                  position: 'relative',
                  transition: 'all 0.15s ease',
                  transform: hoveredInventory === crystal.id ? 'scale(1.1)' : 'scale(1)',
                }}
              >
                {getElementSymbol(crystal.element)}
                {hoveredInventory === crystal.id && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: -28,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      fontSize: 6,
                      color: ELEMENT_COLORS[crystal.element],
                      whiteSpace: 'nowrap',
                      background: 'rgba(0,0,0,0.85)',
                      padding: '2px 4px',
                      borderRadius: 3,
                      zIndex: 30,
                    }}
                  >
                    {ELEMENT_NAMES[crystal.element]}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function getElementSymbol(element: Crystal['element']): React.ReactNode {
  const colors = ELEMENT_COLORS;
  const size = 16;
  switch (element) {
    case 'fire':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16">
          <polygon points="8,1 14,13 2,13" fill={colors.fire} />
        </svg>
      );
    case 'water':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16">
          <circle cx="8" cy="8" r="6" fill={colors.water} />
        </svg>
      );
    case 'earth':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16">
          <rect x="3" y="3" width="10" height="10" fill={colors.earth} />
        </svg>
      );
    case 'wind':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16">
          <polygon points="8,1 15,8 8,15 1,8" fill={colors.wind} />
        </svg>
      );
  }
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}
