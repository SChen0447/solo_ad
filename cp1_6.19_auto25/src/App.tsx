import GameCanvas from '@/ui/GameCanvas';
import CraftingPanel from '@/ui/CraftingPanel';
import InventoryPanel from '@/ui/InventoryPanel';
import StatusBar from '@/ui/StatusBar';
import { useGameStore } from '@/store/useGameStore';

export default function App() {
  const showCraftingPanel = useGameStore((s) => s.showCraftingPanel);

  return (
    <div
      style={{
        width: 800,
        height: 600,
        position: 'relative',
        margin: '0 auto',
        overflow: 'hidden',
        background: '#2d4a22',
      }}
    >
      <GameCanvas />
      <StatusBar />
      <InventoryPanel />
      {showCraftingPanel && <CraftingPanel />}
      <div
        style={{
          position: 'absolute',
          bottom: 6,
          left: 10,
          fontFamily: '"Press Start 2P", monospace',
          fontSize: 7,
          color: 'rgba(255,255,255,0.3)',
          zIndex: 5,
        }}
      >
        WASD:移动 | I:库存 | 靠近炼金台合成
      </div>
    </div>
  );
}
