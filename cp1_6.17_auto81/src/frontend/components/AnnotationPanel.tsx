import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { HexColorPicker } from 'react-colorful';
import type { Component, ComponentType } from '../types';

interface AnnotationPanelProps {
  components: Component[];
  onUpdateComponent: (id: string, updates: Partial<Component>) => void;
  onDeleteComponent: (id: string) => void;
  onExport: () => void;
  onReorder: (startIndex: number, endIndex: number) => void;
}

const COMPONENT_TYPE_OPTIONS: ComponentType[] = ['button', 'icon', 'card', 'input', 'label'];

const TYPE_LABELS: Record<ComponentType, string> = {
  button: '按钮',
  icon: '图标',
  card: '卡片',
  input: '输入框',
  label: '标签'
};

interface PropertyRowProps {
  label: string;
  children: React.ReactNode;
}

const PropertyRow: React.FC<PropertyRowProps> = ({ label, children }) => (
  <div className="property-row">
    <label className="property-label">{label}</label>
    <div className="property-value">{children}</div>
  </div>
);

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ color, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="color-picker-wrapper">
      <button
        className="color-trigger"
        onClick={() => setIsOpen(!isOpen)}
        style={{ backgroundColor: color }}
      >
        <span className="color-hex">{color.toUpperCase()}</span>
      </button>
      {isOpen && (
        <div className="color-popover" onClick={(e) => e.stopPropagation()}>
          <HexColorPicker color={color} onChange={onChange} />
          <button className="color-close" onClick={() => setIsOpen(false)}>
            确定
          </button>
        </div>
      )}
    </div>
  );
};

interface NumberInputProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  unit?: string;
}

const NumberInput: React.FC<NumberInputProps> = ({
  value,
  min = 0,
  max = 10000,
  step = 1,
  onChange,
  unit = 'px'
}) => (
  <div className="number-input-wrapper">
    <button
      className="number-btn"
      onClick={() => onChange(Math.max(min, value - step))}
    >
      −
    </button>
    <input
      type="number"
      className="number-input"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => {
        const num = parseInt(e.target.value) || min;
        onChange(Math.min(max, Math.max(min, num)));
      }}
    />
    <button
      className="number-btn"
      onClick={() => onChange(Math.min(max, value + step))}
    >
      +
    </button>
    <span className="number-unit">{unit}</span>
  </div>
);

interface ComponentCardProps {
  component: Component;
  index: number;
  onUpdate: (updates: Partial<Component>) => void;
  onDelete: () => void;
}

const ComponentCard: React.FC<ComponentCardProps> = ({
  component,
  index,
  onUpdate,
  onDelete
}) => {
  return (
    <div
      className="component-card"
      style={{
        borderLeftColor: component.color,
        animation: `fadeIn 0.2s ease-out`
      }}
    >
      <div className="card-header">
        <div className="card-title">
          <span className="card-index">{index + 1}</span>
          <select
            className="type-select"
            value={component.type}
            onChange={(e) => onUpdate({ type: e.target.value as ComponentType })}
          >
            {COMPONENT_TYPE_OPTIONS.map((type) => (
              <option key={type} value={type}>
                {TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>
        <button
          className="delete-btn"
          onClick={onDelete}
          title="删除组件"
        >
          ×
        </button>
      </div>

      <div className="card-body">
        <PropertyRow label="主色">
          <ColorPicker
            color={component.color}
            onChange={(color) => onUpdate({ color })}
          />
        </PropertyRow>

        <PropertyRow label="尺寸">
          <div className="size-inputs">
            <NumberInput
              value={component.width}
              onChange={(width) => onUpdate({ width })}
            />
            <span className="size-separator">×</span>
            <NumberInput
              value={component.height}
              onChange={(height) => onUpdate({ height })}
            />
          </div>
        </PropertyRow>

        <PropertyRow label="圆角">
          <NumberInput
            value={component.borderRadius}
            max={100}
            onChange={(borderRadius) => onUpdate({ borderRadius })}
          />
        </PropertyRow>

        <PropertyRow label="位置">
          <div className="position-display">
            <span>X: {component.x}</span>
            <span>Y: {component.y}</span>
          </div>
        </PropertyRow>
      </div>
    </div>
  );
};

const AnnotationPanel: React.FC<AnnotationPanelProps> = ({
  components,
  onUpdateComponent,
  onDeleteComponent,
  onExport,
  onReorder
}) => {
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    onReorder(result.source.index, result.destination.index);
  };

  return (
    <div className="annotation-panel">
      <div className="panel-header">
        <h2 className="panel-title">
          属性 <span className="component-count">({components.length}个)</span>
        </h2>
        <button
          className="export-btn"
          onClick={onExport}
          disabled={components.length === 0}
        >
          导出 JSON
        </button>
      </div>

      <div className="panel-content">
        {components.length === 0 ? (
          <div className="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <p>暂无标注组件</p>
            <span className="hint">在左侧画布上框选区域开始标注</span>
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="components">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="components-list"
                >
                  {components.map((component, index) => (
                    <Draggable
                      key={component.id}
                      draggableId={component.id}
                      index={index}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          style={{
                            ...provided.draggableProps.style,
                            opacity: snapshot.isDragging ? 0.8 : 1,
                            transform: snapshot.isDragging
                              ? `${provided.draggableProps.style?.transform} rotate(2deg)`
                              : provided.draggableProps.style?.transform
                          }}
                        >
                          <ComponentCard
                            component={component}
                            index={index}
                            onUpdate={(updates) =>
                              onUpdateComponent(component.id, updates)
                            }
                            onDelete={() => onDeleteComponent(component.id)}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>
    </div>
  );
};

export default AnnotationPanel;
