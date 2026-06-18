import React, { useState } from 'react';
import { useInventoryStore } from '../../store/useInventoryStore';
import { usePlayerStore } from '../../store/usePlayerStore';
import { Item } from '../modules/player/types';

const InventoryPanel: React.FC = () => {
  const { inventoryState, useItem } = useInventoryStore();
  const { restoreHealth, restoreHunger } = usePlayerStore();
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const handleItemClick = (item: Item) => {
    setSelectedItemId(item.id);
  };

  const handleUseItem = () => {
    if (!selectedItemId) return;
    
    const result = useItem(selectedItemId);
    if (result) {
      restoreHealth(result.healthRestore);
      restoreHunger(result.hungerRestore);
    }
  };

  const renderItem = (item: Item, index: number) => {
    const isSelected = selectedItemId === item.id;
    return (
      <div
        key={item.id}
        className={`inventory-slot ${isSelected ? 'selected' : ''}`}
        onClick={() => handleItemClick(item)}
      >
        <span className="item-icon">{item.icon}</span>
        {item.quantity > 1 && (
          <span className="item-quantity">{item.quantity}</span>
        )}
      </div>
    );
  };

  const renderEmptySlots = () => {
    const emptyCount = inventoryState.maxSlots - inventoryState.items.length;
    const slots = [];
    for (let i = 0; i < emptyCount; i++) {
      slots.push(
        <div key={`empty-${i}`} className="inventory-slot empty">
          <span className="empty-slot-icon">+</span>
        </div>
      );
    }
    return slots;
  };

  const selectedItem = inventoryState.items.find((i) => i.id === selectedItemId);

  return (
    <div className="panel inventory-panel">
      <h2 className="panel-title">背包</h2>
      
      <div className="inventory-grid">
        {inventoryState.items.map((item, index) => renderItem(item, index))}
        {renderEmptySlots()}
      </div>

      <div className="inventory-info">
        <p>
          格子: {inventoryState.items.length}/{inventoryState.maxSlots}
        </p>
        <p>
          重量系数: {(inventoryState.weightMultiplier * 100).toFixed(0)}%
        </p>
      </div>

      {selectedItem && (
        <div className="item-detail">
          <h3 className="item-name">{selectedItem.name}</h3>
          <p className="item-type">
            类型: {selectedItem.type === 'food' ? '食物' : '水源'}
          </p>
          <p className="item-effect">
            恢复健康: +{selectedItem.healthRestore}
          </p>
          <p className="item-effect">
            恢复饥饿: +{selectedItem.hungerRestore}
          </p>
          <p className="item-quantity-info">
            数量: {selectedItem.quantity}
          </p>
          <button className="use-item-btn" onClick={handleUseItem}>
            使用
          </button>
        </div>
      )}
    </div>
  );
};

export default InventoryPanel;
