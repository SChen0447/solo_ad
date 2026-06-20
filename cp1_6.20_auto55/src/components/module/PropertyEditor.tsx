import React, { useState, useEffect } from 'react';
import type { UIComponent, ComponentStyles, ComponentProps } from '../../types';

interface PropertyEditorProps {
  component: UIComponent | null;
  onUpdate: (updates: Partial<UIComponent>) => void;
  onDelete: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const PropertyEditor: React.FC<PropertyEditorProps> = ({
  component,
  onUpdate,
  onDelete,
  isCollapsed,
  onToggleCollapse,
}) => {
  const [activeTab, setActiveTab] = useState<'styles' | 'props' | 'layout'>('styles');
  const [localStyles, setLocalStyles] = useState<ComponentStyles>({});
  const [localProps, setLocalProps] = useState<ComponentProps>({});
  const [localName, setLocalName] = useState('');

  useEffect(() => {
    if (component) {
      setLocalStyles({ ...component.styles });
      setLocalProps({ ...component.props });
      setLocalName(component.name);
    }
  }, [component?.id]);

  if (isCollapsed) {
    return (
      <button className="panel-toggle-btn right" onClick={onToggleCollapse} title="属性面板">
        ⚙
      </button>
    );
  }

  if (!component) {
    return (
      <>
        <aside className="panel panel-right">
          <div className="panel-header">属性编辑</div>
          <div className="panel-content">
            <div className="empty-state">
              <div className="empty-state-icon">🎯</div>
              <div>请选择一个组件进行编辑</div>
            </div>
          </div>
        </aside>
        <button className="panel-toggle-btn right" onClick={onToggleCollapse} title="属性面板" style={{ display: 'none' }}>
          ⚙
        </button>
      </>
    );
  }

  const handleStyleChange = (key: string, value: string) => {
    const newStyles = { ...localStyles, [key]: value };
    setLocalStyles(newStyles);
    onUpdate({ styles: newStyles });
  };

  const handlePropChange = (key: string, value: string | boolean) => {
    const newProps = { ...localProps, [key]: value };
    setLocalProps(newProps);
    onUpdate({ props: newProps });
  };

  const handleNameChange = (value: string) => {
    setLocalName(value);
    onUpdate({ name: value });
  };

  const handleLayoutChange = (key: 'x' | 'y' | 'width' | 'height', value: number) => {
    onUpdate({ [key]: value });
  };

  const createRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = e.currentTarget;
    const circle = document.createElement('span');
    const diameter = Math.max(btn.clientWidth, btn.clientHeight);
    const radius = diameter / 2;
    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${e.clientX - btn.getBoundingClientRect().left - radius}px`;
    circle.style.top = `${e.clientY - btn.getBoundingClientRect().top - radius}px`;
    circle.classList.add('btn-ripple');
    const existingRipple = btn.getElementsByClassName('btn-ripple')[0];
    if (existingRipple) existingRipple.remove();
    btn.appendChild(circle);
    setTimeout(() => circle.remove(), 600);
  };

  return (
    <>
      <aside className="panel panel-right">
        <div className="panel-header">
          <span>属性编辑</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'normal' }}>
            {component.type}
          </span>
        </div>

        <div className="tabs">
          <button
            className={`tab ${activeTab === 'styles' ? 'active' : ''}`}
            onClick={() => setActiveTab('styles')}
          >
            样式
          </button>
          <button
            className={`tab ${activeTab === 'props' ? 'active' : ''}`}
            onClick={() => setActiveTab('props')}
          >
            属性
          </button>
          <button
            className={`tab ${activeTab === 'layout' ? 'active' : ''}`}
            onClick={() => setActiveTab('layout')}
          >
            布局
          </button>
        </div>

        <div className="panel-content">
          <div className="property-group">
            <div className="property-row">
              <label className="property-label">组件名称</label>
              <input
                className="property-input"
                type="text"
                value={localName}
                onChange={(e) => handleNameChange(e.target.value)}
              />
            </div>
          </div>

          {activeTab === 'styles' && (
            <>
              <div className="property-group">
                <div className="property-group-title">颜色</div>
                <div className="property-row">
                  <label className="property-label">背景色</label>
                  <input
                    className="property-color"
                    type="color"
                    value={localStyles.backgroundColor || '#45475a'}
                    onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
                  />
                  <input
                    className="property-input"
                    type="text"
                    value={localStyles.backgroundColor || ''}
                    onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
                    placeholder="#45475a"
                  />
                </div>
                <div className="property-row">
                  <label className="property-label">文字色</label>
                  <input
                    className="property-color"
                    type="color"
                    value={localStyles.color || '#cdd6f4'}
                    onChange={(e) => handleStyleChange('color', e.target.value)}
                  />
                  <input
                    className="property-input"
                    type="text"
                    value={localStyles.color || ''}
                    onChange={(e) => handleStyleChange('color', e.target.value)}
                    placeholder="#cdd6f4"
                  />
                </div>
                <div className="property-row">
                  <label className="property-label">边框</label>
                  <input
                    className="property-input"
                    type="text"
                    value={localStyles.border || ''}
                    onChange={(e) => handleStyleChange('border', e.target.value)}
                    placeholder="1px solid #585b70"
                  />
                </div>
              </div>

              <div className="property-group">
                <div className="property-group-title">圆角与阴影</div>
                <div className="property-row">
                  <label className="property-label">圆角</label>
                  <input
                    className="property-input"
                    type="text"
                    value={localStyles.borderRadius || ''}
                    onChange={(e) => handleStyleChange('borderRadius', e.target.value)}
                    placeholder="8px"
                  />
                </div>
                <div className="property-row">
                  <label className="property-label">阴影</label>
                  <input
                    className="property-input"
                    type="text"
                    value={localStyles.boxShadow || ''}
                    onChange={(e) => handleStyleChange('boxShadow', e.target.value)}
                    placeholder="0 4px 12px rgba(0,0,0,0.2)"
                  />
                </div>
              </div>

              <div className="property-group">
                <div className="property-group-title">文本</div>
                <div className="property-row">
                  <label className="property-label">字号</label>
                  <input
                    className="property-input"
                    type="text"
                    value={localStyles.fontSize || ''}
                    onChange={(e) => handleStyleChange('fontSize', e.target.value)}
                    placeholder="14px"
                  />
                </div>
                <div className="property-row">
                  <label className="property-label">字重</label>
                  <input
                    className="property-input"
                    type="text"
                    value={localStyles.fontWeight || ''}
                    onChange={(e) => handleStyleChange('fontWeight', e.target.value)}
                    placeholder="400"
                  />
                </div>
              </div>

              <div className="property-group">
                <div className="property-group-title">间距</div>
                <div className="property-row">
                  <label className="property-label">内边距</label>
                  <input
                    className="property-input"
                    type="text"
                    value={localStyles.padding || ''}
                    onChange={(e) => handleStyleChange('padding', e.target.value)}
                    placeholder="10px"
                  />
                </div>
                <div className="property-row">
                  <label className="property-label">外边距</label>
                  <input
                    className="property-input"
                    type="text"
                    value={localStyles.margin || ''}
                    onChange={(e) => handleStyleChange('margin', e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
            </>
          )}

          {activeTab === 'props' && (
            <div className="property-group">
              <div className="property-group-title">组件属性</div>
              {component.type === 'Button' && (
                <>
                  <div className="property-row">
                    <label className="property-label">按钮文字</label>
                    <input
                      className="property-input"
                      type="text"
                      value={String(localProps.text || '')}
                      onChange={(e) => handlePropChange('text', e.target.value)}
                      placeholder="按钮"
                    />
                  </div>
                  <div className="property-row">
                    <label className="property-label">样式变体</label>
                    <input
                      className="property-input"
                      type="text"
                      value={String(localProps.variant || '')}
                      onChange={(e) => handlePropChange('variant', e.target.value)}
                      placeholder="primary"
                    />
                  </div>
                </>
              )}
              {component.type === 'Input' && (
                <>
                  <div className="property-row">
                    <label className="property-label">占位符</label>
                    <input
                      className="property-input"
                      type="text"
                      value={String(localProps.placeholder || '')}
                      onChange={(e) => handlePropChange('placeholder', e.target.value)}
                      placeholder="请输入..."
                    />
                  </div>
                  <div className="property-row">
                    <label className="property-label">输入类型</label>
                    <input
                      className="property-input"
                      type="text"
                      value={String(localProps.type || '')}
                      onChange={(e) => handlePropChange('type', e.target.value)}
                      placeholder="text"
                    />
                  </div>
                </>
              )}
              {component.type === 'Card' && (
                <div className="property-row">
                  <label className="property-label">卡片标题</label>
                  <input
                    className="property-input"
                    type="text"
                    value={String(localProps.title || '')}
                    onChange={(e) => handlePropChange('title', e.target.value)}
                    placeholder="卡片标题"
                  />
                </div>
              )}
              {component.type === 'Modal' && (
                <>
                  <div className="property-row">
                    <label className="property-label">标题</label>
                    <input
                      className="property-input"
                      type="text"
                      value={String(localProps.title || '')}
                      onChange={(e) => handlePropChange('title', e.target.value)}
                      placeholder="模态框标题"
                    />
                  </div>
                  <div className="property-row">
                    <label className="property-label">显示关闭</label>
                    <input
                      type="checkbox"
                      checked={Boolean(localProps.showClose)}
                      onChange={(e) => handlePropChange('showClose', e.target.checked)}
                      style={{ width: 18, height: 18, cursor: 'pointer' }}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'layout' && (
            <div className="property-group">
              <div className="property-group-title">位置与尺寸</div>
              <div className="property-row">
                <label className="property-label">X 坐标</label>
                <input
                  className="property-input"
                  type="number"
                  value={component.x}
                  onChange={(e) => handleLayoutChange('x', parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="property-row">
                <label className="property-label">Y 坐标</label>
                <input
                  className="property-input"
                  type="number"
                  value={component.y}
                  onChange={(e) => handleLayoutChange('y', parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="property-row">
                <label className="property-label">宽度</label>
                <input
                  className="property-input"
                  type="number"
                  value={component.width}
                  onChange={(e) => handleLayoutChange('width', parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="property-row">
                <label className="property-label">高度</label>
                <input
                  className="property-input"
                  type="number"
                  value={component.height}
                  onChange={(e) => handleLayoutChange('height', parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
          )}

          <div style={{ marginTop: 24 }}>
            <button
              className="btn"
              style={{ width: '100%', background: 'var(--error)', color: 'white' }}
              onClick={(e) => {
                createRipple(e);
                onDelete();
              }}
            >
              删除组件
            </button>
          </div>
        </div>
      </aside>
      <button className="panel-toggle-btn right" onClick={onToggleCollapse} title="属性面板" style={{ display: 'none' }}>
        ⚙
      </button>
    </>
  );
};

export default PropertyEditor;
