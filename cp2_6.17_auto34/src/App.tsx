import { useState, useEffect, useCallback, useMemo } from 'react';
import ColorWheel from './ColorWheel';
import CoffeeCup from './CoffeeCup';
import {
  generateColorSchemes,
  formatHex,
  withAlpha,
  lightenColor,
} from './colorUtils';
import './styles.css';

function App() {
  const colorSchemes = useMemo(() => generateColorSchemes(), []);
  const [rotation, setRotation] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectedColor = colorSchemes[selectedIndex];

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--accent-color',
      selectedColor.hex
    );
    document.body.style.backgroundColor = withAlpha(selectedColor.hex, 0.15);
  }, [selectedColor]);

  const handleRotationChange = useCallback((newRotation: number) => {
    setRotation(newRotation);
  }, []);

  const handleSelect = useCallback((index: number) => {
    const boundedIndex = ((index % 12) + 12) % 12;
    setSelectedIndex(boundedIndex);
  }, []);

  const handleRotationEnd = useCallback((_finalRotation: number) => {}, []);

  return (
    <div className="app-container">
      <div className="wheel-section">
        <div className="wheel-wrapper">
          <div className="pointer" />
          <ColorWheel
            colors={colorSchemes}
            rotation={rotation}
            selectedIndex={selectedIndex}
            onRotationChange={handleRotationChange}
            onSelect={handleSelect}
            onRotationEnd={handleRotationEnd}
          />
        </div>
        <button className="action-button">复制色值</button>
      </div>

      <div className="preview-panel">
        <div className="color-name">{selectedColor.name}</div>
        <CoffeeCup
          cupColor={selectedColor.hex}
          cupColorDark={lightenColor(selectedColor.hex, -10)}
        />
        <div className="color-hex">{formatHex(selectedColor.hex)}</div>
      </div>
    </div>
  );
}

export default App;
