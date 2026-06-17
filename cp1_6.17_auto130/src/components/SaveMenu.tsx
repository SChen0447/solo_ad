import { useState, useEffect } from 'react';
import { SaveData } from '../types';
import { gameEngine } from '../utils/gameEngine';
import './SaveMenu.css';

interface SaveMenuProps {
  onLoad: (slot: number) => void;
  onBack: () => void;
}

const SaveMenu = ({ onLoad, onBack }: SaveMenuProps) => {
  const [saves, setSaves] = useState<SaveData[]>([]);
  const [flippingSlot, setFlippingSlot] = useState<number | null>(null);

  useEffect(() => {
    loadSaves();
  }, []);

  const loadSaves = async () => {
    const savesList = await gameEngine.loadSaves();
    setSaves(savesList);
  };

  const handleLoad = (slot: number) => {
    setFlippingSlot(slot);
    setTimeout(() => {
      onLoad(slot);
    }, 600);
  };

  const getSaveBySlot = (slot: number): SaveData | undefined => {
    return saves.find((s) => s.slot === slot);
  };

  return (
    <div className="save-menu">
      <div className="save-menu-content">
        <h2 className="save-menu-title">读取存档</h2>

        <div className="save-cards">
          {[1, 2, 3].map((slot) => {
            const save = getSaveBySlot(slot);
            const isFlipping = flippingSlot === slot;

            return (
              <div
                key={slot}
                className={`save-card-container ${isFlipping ? 'flipping' : ''}`}
                onClick={() => save && handleLoad(slot)}
              >
                <div className="save-card glass-card">
                  <div className="save-card-inner">
                    <div className="save-slot-label">存档位 {slot}</div>
                    {save ? (
                      <div className="save-info">
                        <div className="save-stats">
                          <span>已通关: {save.clearedRooms.length} / 9</span>
                          <span>图腾: {save.totems.length} 张</span>
                        </div>
                        <div className="save-date">
                          {new Date(save.updatedAt).toLocaleString('zh-CN')}
                        </div>
                      </div>
                    ) : (
                      <div className="save-empty">
                        <span>空存档</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button className="btn-secondary back-btn" onClick={onBack}>
          ← 返回主菜单
        </button>
      </div>
    </div>
  );
};

export default SaveMenu;
