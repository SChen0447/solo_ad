import React, { useReducer, useCallback, useEffect, useRef } from 'react';
import ColorEditor from './ColorEditor';
import { ColorItem, ColorAction } from './types';

interface ColorEditorPanelProps {
  initialColors: ColorItem[];
  onColorsChange: (colors: ColorItem[]) => void;
}

function colorReducer(state: ColorItem[], action: ColorAction): ColorItem[] {
  switch (action.type) {
    case 'SET_COLOR':
      return state.map(c =>
        c.id === action.payload.id ? { ...c, value: action.payload.value } : c
      );
    case 'TOGGLE_LOCK':
      return state.map(c =>
        c.id === action.payload.id ? { ...c, locked: !c.locked } : c
      );
    case 'SET_ALL_COLORS':
      return state.map(c => {
        const newColor = action.payload.find(nc => nc.id === c.id);
        if (newColor) {
          return c.locked ? c : { ...newColor, locked: c.locked };
        }
        return c;
      });
    default:
      return state;
  }
}

const ColorEditorPanel: React.FC<ColorEditorPanelProps> = ({ initialColors, onColorsChange }) => {
  const [colors, dispatch] = useReducer(colorReducer, initialColors);
  const debounceRef = useRef<number | null>(null);
  const eventDebounceRef = useRef<number | null>(null);

  const handleColorChange = useCallback((id: string, value: string) => {
    dispatch({ type: 'SET_COLOR', payload: { id, value } });
  }, []);

  const handleToggleLock = useCallback((id: string) => {
    dispatch({ type: 'TOGGLE_LOCK', payload: { id } });
  }, []);

  useEffect(() => {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }
    debounceRef.current = window.setTimeout(() => {
      onColorsChange(colors);
    }, 0);
    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, [colors, onColorsChange]);

  useEffect(() => {
    if (eventDebounceRef.current) {
      window.clearTimeout(eventDebounceRef.current);
    }
    eventDebounceRef.current = window.setTimeout(() => {
      const event = new CustomEvent('palette-colors-updated', {
        detail: colors,
      });
      window.dispatchEvent(event);
    }, 30);
    return () => {
      if (eventDebounceRef.current) {
        window.clearTimeout(eventDebounceRef.current);
      }
    };
  }, [colors]);

  useEffect(() => {
    const handleSetAllColors = (e: Event) => {
      const customEvent = e as CustomEvent<ColorItem[]>;
      dispatch({ type: 'SET_ALL_COLORS', payload: customEvent.detail });
    };
    window.addEventListener('palette-set-colors', handleSetAllColors);
    return () => window.removeEventListener('palette-set-colors', handleSetAllColors);
  }, []);

  return (
    <div style={{
      backgroundColor: '#f5f5f5',
      padding: '16px',
      overflowY: 'auto',
      height: '100%',
      boxSizing: 'border-box',
    }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#333' }}>调色编辑器</h3>
      {colors.map(color => (
        <ColorEditor
          key={color.id}
          color={color}
          onChange={handleColorChange}
          onToggleLock={handleToggleLock}
        />
      ))}
    </div>
  );
};

export default ColorEditorPanel;
