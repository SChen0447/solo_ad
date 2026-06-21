import { useState, useCallback } from 'react';
import ControlPanel from './components/ControlPanel';
import GridPreview from './components/GridPreview';
import {
  GridConfig,
  GridItemConfig,
  defaultGridConfig,
  createDefaultItems
} from './utils/gridStyles';

const ITEM_COUNT = 4;

export default function App() {
  const [panelOpen, setPanelOpen] = useState(false);
  const [gridConfig, setGridConfig] = useState<GridConfig>(defaultGridConfig);
  const [itemsConfig, setItemsConfig] = useState<GridItemConfig[]>(
    createDefaultItems(ITEM_COUNT)
  );
  const [selectedItem, setSelectedItem] = useState<number | null>(null);
  const [resetAnimation, setResetAnimation] = useState(false);

  const handleGridConfigChange = useCallback((key: keyof GridConfig, value: string | number) => {
    setGridConfig(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleItemConfigChange = useCallback((index: number, key: keyof GridItemConfig, value: string) => {
    setItemsConfig(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [key]: value };
      return next;
    });
  }, []);

  const handleItemSelect = useCallback((index: number | null) => {
    setSelectedItem(index);
  }, []);

  const handleReset = useCallback(() => {
    setGridConfig(defaultGridConfig);
    setItemsConfig(createDefaultItems(ITEM_COUNT));
    setSelectedItem(null);
    setResetAnimation(true);
    setTimeout(() => setResetAnimation(false), 300);
  }, []);

  const togglePanel = useCallback(() => {
    setPanelOpen(prev => !prev);
  }, []);

  return (
    <div style={styles.app}>
      <ControlPanel
        isOpen={panelOpen}
        onToggle={togglePanel}
        gridConfig={gridConfig}
        onGridConfigChange={handleGridConfigChange}
        itemsConfig={itemsConfig}
        onItemConfigChange={handleItemConfigChange}
        selectedItem={selectedItem}
        onReset={handleReset}
      />
      <div
        style={{
          ...styles.previewWrapper,
          marginLeft: panelOpen ? 0 : 0,
          transform: resetAnimation ? 'scale(1.1)' : 'scale(1)',
          transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
        }}
      >
        <GridPreview
          gridConfig={gridConfig}
          itemsConfig={itemsConfig}
          selectedItem={selectedItem}
          onItemSelect={handleItemSelect}
        />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    display: 'flex',
    width: '100vw',
    height: '100vh',
    backgroundColor: '#f8f9fa',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    overflow: 'hidden',
    position: 'relative'
  },
  previewWrapper: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden'
  }
};
