import React, { useState } from 'react';
import { eventBus, EditorEvent } from '../core/eventSystem';
import { CustomUnitType, EventType, MapEntity, EventBinding } from '../core/mapData';

interface ToolPanelProps {
  activeEntityType: string | null;
  activeEntityColor?: string;
  activeEntityName?: string;
  activeTerrain: 'grass' | 'wall' | 'water' | null;
  pathMode: boolean;
  pathEntityId: string | null;
  selectedEntityId: string | null;
  customUnitTypes: CustomUnitType[];
  entities: MapEntity[];
  events: EventBinding[];
  onSelectEntityType: (type: string | null, color?: string, name?: string) => void;
  onSelectTerrain: (t: 'grass' | 'wall' | 'water' | null) => void;
  onTogglePathMode: (on: boolean) => void;
  onSetPathEntity: (id: string | null) => void;
  onExport: () => void;
  exporting: boolean;
  collapsed: boolean;
}

const PRESET_COLORS = [
  '#4fc3f7', '#ef5350', '#ffd54f', '#66bb6a', '#ab47bc',
  '#ff7043', '#26c6da', '#ec407a', '#8d6e63', '#78909c',
];

const ToolPanel: React.FC<ToolPanelProps> = ({
  activeEntityType,
  activeEntityColor,
  activeEntityName,
  activeTerrain,
  pathMode,
  pathEntityId,
  selectedEntityId,
  customUnitTypes,
  entities,
  events,
  onSelectEntityType,
  onSelectTerrain,
  onTogglePathMode,
  onSetPathEntity,
  onExport,
  exporting,
  collapsed,
}) => {
  const [customName, setCustomName] = useState('');
  const [customColor, setCustomColor] = useState('#4fc3f7');
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [eventName, setEventName] = useState('');
  const [eventType, setEventType] = useState<EventType>('dialog');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const selectedEntity = entities.find((e) => e.id === selectedEntityId);
  const selectedEvent = selectedEntityId
    ? events.find((e) => e.entityId === selectedEntityId)
    : undefined;

  const handleAddCustomUnit = () => {
    if (!customName.trim()) return;
    eventBus.emit(EditorEvent.ADD_CUSTOM_UNIT_TYPE, {
      name: customName.trim(),
      color: customColor,
    });
    setCustomName('');
    setCustomColor('#4fc3f7');
    setShowCustomForm(false);
  };

  const handleSaveEvent = () => {
    if (!selectedEntityId || !eventName.trim()) return;
    eventBus.emit(EditorEvent.BIND_EVENT, {
      entityId: selectedEntityId,
      name: eventName.trim(),
      type: eventType,
    });
  };

  const handleClearAllPaths = () => {
    setShowClearConfirm(true);
  };

  const confirmClearPaths = () => {
    eventBus.emit(EditorEvent.CLEAR_ALL_PATHS);
    setShowClearConfirm(false);
  };

  const panelContent = (
    <>
      <div style={{ marginBottom: 16 }}>
        <button
          onClick={onExport}
          disabled={exporting}
          style={{
            width: '100%',
            padding: '10px 0',
            border: 'none',
            borderRadius: 8,
            background: '#e94560',
            color: '#fff',
            fontSize: 14,
            fontWeight: 700,
            cursor: exporting ? 'wait' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            transition: 'box-shadow 0.2s, transform 0.15s',
            boxShadow: exporting ? 'none' : '0 0 12px rgba(233,69,96,0.4)',
          }}
          onMouseDown={(e) => {
            (e.target as HTMLElement).style.transform = 'scale(0.95)';
          }}
          onMouseUp={(e) => {
            (e.target as HTMLElement).style.transform = 'scale(1)';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLElement).style.transform = 'scale(1)';
          }}
        >
          {exporting ? (
            <span
              style={{
                display: 'inline-block',
                width: 16,
                height: 16,
                border: '2px solid rgba(255,255,255,0.3)',
                borderTopColor: '#fff',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }}
            />
          ) : null}
          {exporting ? '导出中...' : '导出地图 JSON'}
        </button>
      </div>

      <Section title="单位选择">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <EntityButton
            label="角色"
            icon="circle"
            color="#4fc3f7"
            active={activeEntityType === 'player' && !activeEntityColor}
            onClick={() => onSelectEntityType('player')}
          />
          <EntityButton
            label="怪物"
            icon="square"
            color="#ef5350"
            active={activeEntityType === 'monster' && !activeEntityColor}
            onClick={() => onSelectEntityType('monster')}
          />
          <EntityButton
            label="宝箱"
            icon="diamond"
            color="#ffd54f"
            active={activeEntityType === 'chest' && !activeEntityColor}
            onClick={() => onSelectEntityType('chest')}
          />

          {customUnitTypes.map((cu) => (
            <EntityButton
              key={cu.id}
              label={cu.name}
              icon="square"
              color={cu.color}
              active={activeEntityType === 'custom' && activeEntityName === cu.name}
              onClick={() => onSelectEntityType('custom', cu.color, cu.name)}
            />
          ))}

          <button
            onClick={() => setShowCustomForm(!showCustomForm)}
            style={{
              padding: '8px 12px',
              border: '1px dashed rgba(255,255,255,0.25)',
              borderRadius: 8,
              background: 'transparent',
              color: 'rgba(255,255,255,0.6)',
              fontSize: 12,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            + 自定义单位
          </button>

          {showCustomForm && (
            <div
              style={{
                padding: 10,
                background: 'rgba(0,0,0,0.2)',
                borderRadius: 8,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="单位名称"
                maxLength={20}
                style={{
                  padding: '6px 10px',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 6,
                  background: 'rgba(255,255,255,0.06)',
                  color: '#fff',
                  fontSize: 12,
                  outline: 'none',
                }}
              />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCustomColor(c)}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 4,
                      border: customColor === c ? '2px solid #fff' : '1px solid rgba(255,255,255,0.15)',
                      background: c,
                      cursor: 'pointer',
                      transition: 'transform 0.1s',
                    }}
                    onMouseDown={(e) => {
                      (e.target as HTMLElement).style.transform = 'scale(0.9)';
                    }}
                    onMouseUp={(e) => {
                      (e.target as HTMLElement).style.transform = 'scale(1)';
                    }}
                  />
                ))}
                <label
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 4,
                    border: '1px solid rgba(255,255,255,0.15)',
                    background: `linear-gradient(135deg, red, yellow, lime, cyan, blue, magenta)`,
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <input
                    type="color"
                    value={customColor}
                    onChange={(e) => setCustomColor(e.target.value)}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      opacity: 0,
                      cursor: 'pointer',
                    }}
                  />
                </label>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 3,
                    background: customColor,
                    border: '1px solid rgba(255,255,255,0.2)',
                  }}
                />
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>
                  {customColor}
                </span>
              </div>
              <button
                onClick={handleAddCustomUnit}
                disabled={!customName.trim()}
                style={{
                  padding: '6px 0',
                  border: 'none',
                  borderRadius: 6,
                  background: customName.trim() ? '#4fc3f7' : 'rgba(255,255,255,0.1)',
                  color: customName.trim() ? '#fff' : 'rgba(255,255,255,0.3)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: customName.trim() ? 'pointer' : 'not-allowed',
                  transition: 'all 0.15s',
                }}
              >
                添加自定义单位
              </button>
            </div>
          )}
        </div>
      </Section>

      <Section title="地形笔刷">
        <div style={{ display: 'flex', gap: 6 }}>
          <TerrainButton
            label="草地"
            color="rgba(76,175,80,0.5)"
            active={activeTerrain === 'grass'}
            onClick={() => onSelectTerrain(activeTerrain === 'grass' ? null : 'grass')}
          />
          <TerrainButton
            label="墙壁"
            color="rgba(158,158,158,0.5)"
            active={activeTerrain === 'wall'}
            onClick={() => onSelectTerrain(activeTerrain === 'wall' ? null : 'wall')}
          />
          <TerrainButton
            label="水域"
            color="rgba(33,150,243,0.5)"
            active={activeTerrain === 'water'}
            onClick={() => onSelectTerrain(activeTerrain === 'water' ? null : 'water')}
          />
        </div>
      </Section>

      <Section title="路径绘制">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              fontSize: 13,
              color: 'rgba(255,255,255,0.8)',
            }}
          >
            <div
              onClick={() => onTogglePathMode(!pathMode)}
              style={{
                width: 36,
                height: 20,
                borderRadius: 10,
                background: pathMode ? '#4fc3f7' : 'rgba(255,255,255,0.15)',
                position: 'relative',
                transition: 'background 0.2s',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 8,
                  background: '#fff',
                  position: 'absolute',
                  top: 2,
                  left: pathMode ? 18 : 2,
                  transition: 'left 0.2s',
                }}
              />
            </div>
            路径绘制模式
          </label>

          {pathMode && (
            <select
              value={pathEntityId || ''}
              onChange={(e) => onSetPathEntity(e.target.value || null)}
              style={{
                padding: '6px 8px',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 6,
                background: 'rgba(255,255,255,0.06)',
                color: '#fff',
                fontSize: 12,
                outline: 'none',
              }}
            >
              <option value="">选择单位绑定路径</option>
              {entities.map((en) => (
                <option key={en.id} value={en.id}>
                  {en.type === 'custom' && en.name ? en.name : en.type} ({en.gridX},{en.gridY})
                </option>
              ))}
            </select>
          )}

          <button
            onClick={handleClearAllPaths}
            style={{
              padding: '6px 12px',
              border: '1px solid rgba(233,69,96,0.4)',
              borderRadius: 6,
              background: 'rgba(233,69,96,0.1)',
              color: '#e94560',
              fontSize: 12,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            清除所有路径点
          </button>
        </div>
      </Section>

      {selectedEntity && (
        <Section title="事件编辑器">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div
              style={{
                fontSize: 11,
                color: 'rgba(255,255,255,0.5)',
                marginBottom: 2,
              }}
            >
              绑定到：
              {selectedEntity.type === 'custom' && selectedEntity.name
                ? selectedEntity.name
                : selectedEntity.type}{' '}
              ({selectedEntity.gridX},{selectedEntity.gridY})
            </div>
            <input
              type="text"
              value={eventName || selectedEvent?.name || ''}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="事件名称，如 boss_dialog_1"
              style={{
                padding: '6px 10px',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 6,
                background: 'rgba(255,255,255,0.06)',
                color: '#fff',
                fontSize: 12,
                outline: 'none',
              }}
            />
            <select
              value={eventType || selectedEvent?.type || 'dialog'}
              onChange={(e) => setEventType(e.target.value as EventType)}
              style={{
                padding: '6px 8px',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 6,
                background: 'rgba(255,255,255,0.06)',
                color: '#fff',
                fontSize: 12,
                outline: 'none',
              }}
            >
              <option value="dialog">对话框</option>
              <option value="battle">战斗</option>
              <option value="teleport">传送门</option>
            </select>
            <button
              onClick={handleSaveEvent}
              disabled={!eventName.trim() && !selectedEvent?.name}
              style={{
                padding: '6px 0',
                border: 'none',
                borderRadius: 6,
                background:
                  eventName.trim() || selectedEvent?.name
                    ? '#66bb6a'
                    : 'rgba(255,255,255,0.1)',
                color:
                  eventName.trim() || selectedEvent?.name
                    ? '#fff'
                    : 'rgba(255,255,255,0.3)',
                fontSize: 12,
                fontWeight: 600,
                cursor:
                  eventName.trim() || selectedEvent?.name
                    ? 'pointer'
                    : 'not-allowed',
                transition: 'all 0.15s',
              }}
            >
              保存事件
            </button>
          </div>
        </Section>
      )}

      {showClearConfirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            animation: 'fadeIn 0.15s',
          }}
          onClick={() => setShowClearConfirm(false)}
        >
          <div
            style={{
              background: '#2d2d44',
              borderRadius: 12,
              padding: 24,
              minWidth: 280,
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              animation: 'scaleIn 0.2s',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                color: '#fff',
                fontSize: 15,
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              确认清除所有路径点？
            </div>
            <div
              style={{
                color: 'rgba(255,255,255,0.5)',
                fontSize: 13,
                marginBottom: 16,
              }}
            >
              此操作将清空当前地图上的所有路径点数据，且不可撤销。
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowClearConfirm(false)}
                style={{
                  padding: '6px 16px',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 6,
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                取消
              </button>
              <button
                onClick={confirmClearPaths}
                style={{
                  padding: '6px 16px',
                  border: 'none',
                  borderRadius: 6,
                  background: '#e94560',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                确认清除
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  if (collapsed) {
    return (
      <div
        style={{
          width: '100%',
          background: '#2d2d44',
          padding: '8px 12px',
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          alignItems: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {panelContent}
      </div>
    );
  }

  return (
    <div
      style={{
        width: 240,
        minWidth: 240,
        height: '100%',
        background: 'rgba(45,45,68,0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderRadius: 0,
        padding: '16px 14px',
        overflowY: 'auto',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      {panelContent}
    </div>
  );
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          color: 'rgba(255,255,255,0.45)',
          fontSize: 10,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: 1,
          marginBottom: 8,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function EntityButton({
  label,
  icon,
  color,
  active,
  onClick,
}: {
  label: string;
  icon: 'circle' | 'square' | 'diamond';
  color: string;
  active: boolean;
  onClick: () => void;
}) {
  const shape =
    icon === 'circle' ? (
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: color,
          border: active ? '2px solid #fff' : '1px solid rgba(255,255,255,0.2)',
        }}
      />
    ) : icon === 'diamond' ? (
      <div
        style={{
          width: 16,
          height: 16,
          background: color,
          transform: 'rotate(45deg)',
          border: active ? '2px solid #fff' : '1px solid rgba(255,255,255,0.2)',
        }}
      />
    ) : (
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: 3,
          background: color,
          border: active ? '2px solid #fff' : '1px solid rgba(255,255,255,0.2)',
        }}
      />
    );

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 12px',
        border: active ? '1px solid rgba(255,255,255,0.4)' : '1px solid rgba(255,255,255,0.08)',
        borderRadius: 8,
        background: active ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)',
        color: '#fff',
        fontSize: 13,
        cursor: 'pointer',
        transition: 'all 0.15s',
        width: '100%',
        textAlign: 'left',
      }}
    >
      {shape}
      {label}
    </button>
  );
}

function TerrainButton({
  label,
  color,
  active,
  onClick,
}: {
  label: string;
  color: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: '8px 0',
        border: active ? '1px solid rgba(255,255,255,0.4)' : '1px solid rgba(255,255,255,0.08)',
        borderRadius: 8,
        background: active ? color : 'rgba(255,255,255,0.03)',
        color: active ? '#fff' : 'rgba(255,255,255,0.6)',
        fontSize: 12,
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  );
}

export default ToolPanel;
