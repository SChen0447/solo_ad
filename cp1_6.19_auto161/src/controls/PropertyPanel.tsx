import React, { useMemo } from 'react';
import { ComponentNode, NodePatch } from '../interfaces';
import './PropertyPanel.css';

interface PropertyPanelProps {
  selectedNode: ComponentNode | null;
  onUpdate: (id: string, patch: NodePatch) => void;
  isMobile: boolean;
  isOpen: boolean;
  onClose: () => void;
}

const COLOR_FIELDS = new Set([
  'color',
  'backgroundColor',
  'background',
  'borderColor',
  'outlineColor',
  'boxShadow',
]);

const NUMBER_FIELDS = new Set([
  'fontSize',
  'padding',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'margin',
  'marginTop',
  'marginRight',
  'marginBottom',
  'marginLeft',
  'width',
  'height',
  'minWidth',
  'minHeight',
  'maxWidth',
  'maxHeight',
  'gap',
  'borderRadius',
  'borderWidth',
  'outlineOffset',
  'top',
  'right',
  'bottom',
  'left',
  'zIndex',
  'opacity',
]);

const PropertyPanel: React.FC<PropertyPanelProps> = ({
  selectedNode,
  onUpdate,
  isMobile,
  isOpen,
  onClose,
}) => {
  const renderInput = (
    key: string,
    value: any,
    onChange: (v: any) => void,
    isStyle: boolean,
  ) => {
    const fieldKey = isStyle ? key : '';

    if (typeof value === 'boolean') {
      return (
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={value}
            onChange={(e) => onChange(e.target.checked)}
            style={{ width: 16, height: 16, cursor: 'pointer' }}
          />
          <span style={{ fontSize: 13, color: '#475569' }}>{value ? '启用' : '禁用'}</span>
        </label>
      );
    }

    if (isStyle && COLOR_FIELDS.has(fieldKey) && typeof value === 'string' && /^#|^rgb/i.test(value)) {
      return (
        <div className="pp-field-row">
          <input
            type="color"
            className="pp-field-input"
            value={value.startsWith('#') ? value : hexFromRgb(value) || '#000000'}
            onChange={(e) => onChange(e.target.value)}
          />
          <input
            type="text"
            className="pp-field-input"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      );
    }

    if (isStyle && NUMBER_FIELDS.has(fieldKey) && typeof value === 'string') {
      const { num, unit } = parseSize(value);
      return (
        <div className="pp-field-row">
          <input
            type="number"
            className="pp-field-input"
            value={num}
            onChange={(e) => onChange(`${e.target.value}${unit}`)}
          />
          <select
            className="pp-field-input"
            style={{ maxWidth: 70 }}
            value={unit}
            onChange={(e) => onChange(`${num}${e.target.value}`)}
          >
            <option value="px">px</option>
            <option value="%">%</option>
            <option value="em">em</option>
            <option value="rem">rem</option>
            <option value="vh">vh</option>
            <option value="vw">vw</option>
          </select>
        </div>
      );
    }

    if (typeof value === 'number') {
      return (
        <input
          type="number"
          className="pp-field-input"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      );
    }

    return (
      <input
        type="text"
        className="pp-field-input"
        value={value as any}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  };

  const containerClasses = [
    'pp-container',
    isMobile ? 'pp-mobile' : '',
    isMobile && isOpen ? 'pp-open' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const content = useMemo(() => {
    if (!selectedNode) {
      return (
        <div className="pp-empty">
          <div className="pp-empty-icon">✎</div>
          <div className="pp-empty-text">请选择一个组件</div>
          <div className="pp-empty-sub">点击左侧树节点或预览区域组件</div>
        </div>
      );
    }

    const propsEntries = Object.entries(selectedNode.props).filter(
      ([k]) => k !== 'children' && typeof k !== 'undefined',
    );
    const styleEntries = Object.entries(selectedNode.style);

    return (
      <>
        <div className="pp-section" style={{ animationDelay: '0ms' }}>
          <h4 className="pp-section-title">基本信息</h4>
          <div className="pp-field">
            <span className="pp-field-label">组件类型</span>
            <input type="text" className="pp-field-input" value={selectedNode.type} disabled />
          </div>
          <div className="pp-field">
            <span className="pp-field-label">唯一 ID</span>
            <div className="pp-id-row">{selectedNode.id}</div>
          </div>
        </div>

        {(typeof selectedNode.children === 'string' || selectedNode.props.children !== undefined) && (
          <div className="pp-section" style={{ animationDelay: '30ms' }}>
            <h4 className="pp-section-title">文本内容</h4>
            <div className="pp-field">
              <label className="pp-field-label">children</label>
              <textarea
                className="pp-field-input"
                rows={3}
                value={
                  typeof selectedNode.children === 'string'
                    ? selectedNode.children
                    : selectedNode.props.children || ''
                }
                onChange={(e) => {
                  const textVal = e.target.value;
                  onUpdate(selectedNode.id, {
                    props: { ...selectedNode.props, children: textVal },
                  });
                }}
                style={{ resize: 'vertical', minHeight: 70, fontFamily: 'inherit' }}
              />
            </div>
          </div>
        )}

        {propsEntries.length > 0 && (
          <div className="pp-section" style={{ animationDelay: '60ms' }}>
            <h4 className="pp-section-title">Props 属性</h4>
            {propsEntries.map(([key, val]) => (
              <div key={key} className="pp-field">
                <label className="pp-field-label">{key}</label>
                {renderInput(
                  key,
                  val,
                  (newVal) =>
                    onUpdate(selectedNode.id, {
                      props: { ...selectedNode.props, [key]: newVal },
                    }),
                  false,
                )}
              </div>
            ))}
          </div>
        )}

        <div className="pp-section" style={{ animationDelay: '90ms' }}>
          <h4 className="pp-section-title">Style 样式</h4>
          {styleEntries.length === 0 && (
            <div style={{ fontSize: 12, color: '#94A3B8', padding: '12px 0' }}>暂无样式字段</div>
          )}
          {styleEntries.map(([key, val]) => (
            <div key={key} className="pp-field">
              <label className="pp-field-label">{kebabToCamelDisplay(key)}</label>
              {renderInput(
                key,
                val,
                (newVal) =>
                  onUpdate(selectedNode.id, {
                    style: { ...selectedNode.style, [key]: newVal },
                  }),
                true,
              )}
            </div>
          ))}
          <button
            onClick={() => {
              const newKey = prompt('请输入样式字段名（camelCase，如 backgroundColor）：');
              if (!newKey) return;
              const defaultValue = prompt('请输入样式字段值：', '');
              if (defaultValue === null) return;
              onUpdate(selectedNode.id, {
                style: { ...selectedNode.style, [newKey]: defaultValue },
              });
            }}
            style={{
              width: '100%',
              padding: '8px',
              marginTop: 8,
              border: '1px dashed rgba(74,144,217,0.5)',
              background: 'rgba(74,144,217,0.05)',
              borderRadius: 7,
              color: '#4A90D9',
              fontSize: 12,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseOver={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(74,144,217,0.1)';
            }}
            onMouseOut={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(74,144,217,0.05)';
            }}
          >
            + 添加自定义样式字段
          </button>
        </div>
      </>
    );
  }, [selectedNode, onUpdate]);

  return (
    <div className={containerClasses}>
      <div className="pp-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h3 className="pp-title">属性面板</h3>
          {selectedNode && <span className="pp-type-tag">{selectedNode.type}</span>}
        </div>
        {isMobile && (
          <button className="pp-close-btn" onClick={onClose} title="关闭面板">
            ×
          </button>
        )}
      </div>
      <div className="pp-body">{content}</div>
    </div>
  );
};

function parseSize(s: string): { num: number; unit: string } {
  const match = /^([\d.\-]+)([a-z%]*)$/i.exec(s);
  if (!match) return { num: Number(s) || 0, unit: 'px' };
  return { num: Number(match[1]) || 0, unit: match[2] || 'px' };
}

function hexFromRgb(rgb: string): string | null {
  const match = /rgba?\((\d+),\s*(\d+),\s*(\d+)/i.exec(rgb);
  if (!match) return null;
  return (
    '#' +
    [match[1], match[2], match[3]]
      .map((x) => Math.max(0, Math.min(255, parseInt(x, 10))).toString(16).padStart(2, '0'))
      .join('')
  );
}

function kebabToCamelDisplay(s: string): string {
  return s.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
}

export default PropertyPanel;
