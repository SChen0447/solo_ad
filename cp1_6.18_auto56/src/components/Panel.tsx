import React, { useCallback } from 'react';
import {
  type ComponentType,
  type PlacedComponent,
  COMPONENT_DEFS,
  getDefaultParams,
} from '@/modules/ComponentRegistry';
import { v4 as uuidv4 } from 'uuid';

interface PanelProps {
  placedComponents: PlacedComponent[];
  onAddComponent: (comp: PlacedComponent) => void;
  onRemoveComponent: (id: string) => void;
  onUpdateParam: (id: string, key: string, value: number) => void;
  onMoveComponent: (id: string, gridX: number, gridY: number) => void;
}

export const Panel: React.FC<PanelProps> = React.memo(({
  placedComponents,
  onAddComponent,
  onRemoveComponent,
  onUpdateParam,
  onMoveComponent,
}) => {
  const handleDragStart = useCallback((e: React.DragEvent, type: ComponentType) => {
    e.dataTransfer.setData('componentType', type);
    e.dataTransfer.effectAllowed = 'copy';
  }, []);

  const handleParamChange = useCallback((id: string, key: string, value: number) => {
    onUpdateParam(id, key, value);
  }, [onUpdateParam]);

  const handleDragStartPlaced = useCallback((e: React.DragEvent, comp: PlacedComponent) => {
    e.dataTransfer.setData('placedComponentId', comp.id);
    e.dataTransfer.setData('componentType', comp.type);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handlePanelDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handlePanelDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const placedId = e.dataTransfer.getData('placedComponentId');
    if (placedId) {
      onRemoveComponent(placedId);
    }
  }, [onRemoveComponent]);

  const createComponentAtGrid = useCallback((type: ComponentType, gridX: number, gridY: number) => {
    onAddComponent({
      id: uuidv4(),
      type,
      gridX,
      gridY,
      params: getDefaultParams(type),
    });
  }, [onAddComponent]);

  return (
    <div
      style={{
        width: 250,
        minWidth: 250,
        height: '100vh',
        background: '#1a1a2e',
        borderRight: '1px solid rgba(255,255,255,0.1)',
        overflowY: 'auto',
        padding: '12px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
      onDragOver={handlePanelDragOver}
      onDrop={handlePanelDrop}
    >
      <div style={{
        fontSize: 14,
        fontWeight: 700,
        color: '#e0e0e0',
        textTransform: 'uppercase',
        letterSpacing: 2,
        marginBottom: 4,
        textAlign: 'center',
        textShadow: '0 0 10px rgba(155,93,229,0.5)',
      }}>
        组件库
      </div>

      {COMPONENT_DEFS.map((def) => (
        <div
          key={def.type}
          draggable
          onDragStart={(e) => handleDragStart(e, def.type)}
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8,
            padding: '10px 12px',
            cursor: 'grab',
            transition: 'all 0.3s ease-out',
            backdropFilter: 'blur(8px)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = `0 4px 16px ${def.glowColor}`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{
              fontSize: 20,
              filter: `drop-shadow(0 0 6px ${def.color})`,
            }}>
              {def.icon}
            </span>
            <span style={{
              color: def.color,
              fontWeight: 600,
              fontSize: 13,
              textShadow: `0 0 8px ${def.glowColor}`,
            }}>
              {def.name}
            </span>
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', lineHeight: 1.4 }}>
            拖拽到画布放置
          </div>
        </div>
      ))}

      {placedComponents.length > 0 && (
        <>
          <div style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'rgba(255,255,255,0.5)',
            textTransform: 'uppercase',
            letterSpacing: 1.5,
            marginTop: 8,
            marginBottom: 2,
            textAlign: 'center',
          }}>
            已放置组件
          </div>

          {placedComponents.map((comp) => {
            const def = COMPONENT_DEFS.find((d) => d.type === comp.type);
            if (!def) return null;
            return (
              <div
                key={comp.id}
                draggable
                onDragStart={(e) => handleDragStartPlaced(e, comp)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: `1px solid ${def.color}33`,
                  borderRadius: 8,
                  padding: '8px 10px',
                  transition: 'all 0.3s ease-out',
                  backdropFilter: 'blur(8px)',
                  boxShadow: `0 0 8px ${def.glowColor}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 14, filter: `drop-shadow(0 0 4px ${def.color})` }}>
                      {def.icon}
                    </span>
                    <span style={{ color: def.color, fontWeight: 600, fontSize: 12 }}>
                      {def.name}
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>
                      ({comp.gridX},{comp.gridY})
                    </span>
                  </div>
                  <button
                    onClick={() => onRemoveComponent(comp.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'rgba(255,255,255,0.4)',
                      cursor: 'pointer',
                      fontSize: 14,
                      padding: '0 4px',
                      lineHeight: 1,
                      transition: 'color 0.2s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#ef476f'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; }}
                  >
                    ×
                  </button>
                </div>
                {def.params.map((paramDef) => (
                  <div key={paramDef.key} style={{ marginBottom: 4 }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 10,
                      color: 'rgba(255,255,255,0.5)',
                      marginBottom: 2,
                    }}>
                      <span>{paramDef.label}</span>
                      <span style={{ color: def.color }}>{comp.params[paramDef.key]?.toFixed(1)}</span>
                    </div>
                    <input
                      type="range"
                      min={paramDef.min}
                      max={paramDef.max}
                      step={paramDef.step}
                      value={comp.params[paramDef.key] ?? paramDef.default}
                      onChange={(e) => handleParamChange(comp.id, paramDef.key, parseFloat(e.target.value))}
                      style={{
                        width: '100%',
                        height: 4,
                        appearance: 'none',
                        background: `linear-gradient(to right, ${def.color}, ${def.color}55)`,
                        borderRadius: 2,
                        outline: 'none',
                        cursor: 'pointer',
                      }}
                    />
                  </div>
                ))}
              </div>
            );
          })}
        </>
      )}

      <div style={{ flex: 1 }} />

      <div style={{
        fontSize: 10,
        color: 'rgba(255,255,255,0.25)',
        textAlign: 'center',
        lineHeight: 1.6,
        borderTop: '1px solid rgba(255,255,255,0.05)',
        paddingTop: 8,
      }}>
        A/D 移动 · W 跳跃<br/>
        空格 激活组件 · 拖回面板回收
      </div>
    </div>
  );
});

Panel.displayName = 'Panel';
