import React, { useState } from 'react';
import {
  CanvasElement,
  PaperSize,
  BaseStyle,
  TextStyle,
  BorderStyle,
  PRESET_COLORS,
  Template,
  ElementType,
} from '../types';

interface ToolPanelProps {
  selectedElement: CanvasElement | null;
  paperSize: PaperSize;
  templates: Template[];
  onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
  onUpdateElementStyle: (id: string, styleUpdates: Partial<BaseStyle | TextStyle>) => void;
  onAddElement: (type: ElementType, x: number, y: number) => void;
  onLoadTemplate: (tpl: Template) => void;
  onDeleteTemplate: (id: string) => void;
}

type TabType = 'style' | 'layout' | 'templates' | 'elements';

export const ToolPanel: React.FC<ToolPanelProps> = ({
  selectedElement,
  paperSize,
  templates,
  onUpdateElement,
  onUpdateElementStyle,
  onAddElement,
  onLoadTemplate,
  onDeleteTemplate,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('elements');
  const [slideKey, setSlideKey] = useState(0);

  const switchTab = (tab: TabType) => {
    setActiveTab(tab);
    setSlideKey((k) => k + 1);
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
    fontWeight: 500,
  };

  const rowStyle: React.CSSProperties = {
    marginBottom: 14,
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '6px 10px',
    border: '1px solid #D1D5DB',
    borderRadius: 6,
    fontSize: 13,
    outline: 'none',
    transition: 'border-color 0.15s',
    boxSizing: 'border-box',
    background: '#FFFFFF',
  };

  const ColorSwatch: React.FC<{ color: string; selected?: boolean; onClick: () => void }> = ({
    color,
    selected,
    onClick,
  }) => (
    <div
      onClick={onClick}
      style={{
        width: 22,
        height: 22,
        borderRadius: 4,
        background: color,
        border: selected ? '2px solid #3B82F6' : '1px solid #E5E7EB',
        cursor: 'pointer',
        boxSizing: 'border-box',
        transition: 'transform 0.15s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
      onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
    />
  );

  const renderElementsTab = () => (
    <div key={slideKey} style={{ animation: 'slideIn 0.25s ease-out' }}>
      <div style={rowStyle}>
        <div style={{ ...labelStyle, marginBottom: 8 }}>添加元素</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {([
            { type: 'rect' as ElementType, label: '矩形区块', icon: '▭' },
            { type: 'text' as ElementType, label: '文本框', icon: 'T' },
            { type: 'line' as ElementType, label: '装饰线条', icon: '─' },
            { type: 'date' as ElementType, label: '日期标签', icon: '📅' },
          ]).map((item) => (
            <button
              key={item.type}
              onClick={() => onAddElement(item.type, 40, 40)}
              style={{
                padding: '14px 10px',
                border: '1px solid #D1D5DB',
                borderRadius: 8,
                background: '#FFFFFF',
                cursor: 'pointer',
                fontSize: 13,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#3B82F6';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(59,130,246,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#D1D5DB';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <span style={{ fontSize: 20 }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div style={rowStyle}>
        <div style={{ ...labelStyle, marginBottom: 8 }}>纸张尺寸</div>
        <div style={{ color: '#374151', fontSize: 14, fontWeight: 600 }}>{paperSize}</div>
      </div>
      {!selectedElement && (
        <div
          style={{
            padding: 16,
            background: '#FFFFFF',
            borderRadius: 8,
            border: '1px dashed #D1D5DB',
            color: '#9CA3AF',
            fontSize: 12,
            textAlign: 'center',
          }}
        >
          点击画布上的元素以编辑属性
        </div>
      )}
    </div>
  );

  const renderStyleTab = () => {
    if (!selectedElement) {
      return (
        <div
          style={{
            padding: 40,
            color: '#9CA3AF',
            fontSize: 13,
            textAlign: 'center',
          }}
        >
          请先选择一个元素
        </div>
      );
    }
    const style = selectedElement.style;
    const isText = selectedElement.type === 'text' || selectedElement.type === 'date';
    return (
      <div key={slideKey} style={{ animation: 'slideIn 0.25s ease-out' }}>
        {selectedElement.type !== 'line' && (
          <div style={rowStyle}>
            <div style={labelStyle}>背景填充色</div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
              {PRESET_COLORS.slice(0, 20).map((c) => (
                <ColorSwatch
                  key={c}
                  color={c}
                  selected={(style as BaseStyle).backgroundColor === c}
                  onClick={() => onUpdateElementStyle(selectedElement.id, { backgroundColor: c } as Partial<BaseStyle>)}
                />
              ))}
            </div>
            <input
              type="color"
              value={(style as BaseStyle).backgroundColor === 'transparent' ? '#FFFFFF' : (style as BaseStyle).backgroundColor}
              onChange={(e) =>
                onUpdateElementStyle(selectedElement.id, { backgroundColor: e.target.value } as Partial<BaseStyle>)
              }
              style={{ ...inputStyle, height: 32, padding: 2 }}
            />
          </div>
        )}

        <div style={rowStyle}>
          <div style={labelStyle}>边框颜色</div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
            {PRESET_COLORS.slice(0, 20).map((c) => (
              <ColorSwatch
                key={c}
                color={c}
                selected={style.borderColor === c}
                onClick={() => onUpdateElementStyle(selectedElement.id, { borderColor: c } as Partial<BaseStyle>)}
              />
            ))}
          </div>
          <input
            type="color"
            value={style.borderColor}
            onChange={(e) => onUpdateElementStyle(selectedElement.id, { borderColor: e.target.value } as Partial<BaseStyle>)}
            style={{ ...inputStyle, height: 32, padding: 2 }}
          />
        </div>

        <div style={rowStyle}>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={labelStyle}>边框宽度 (1-5px)</div>
              <input
                type="number"
                min={1}
                max={5}
                value={style.borderWidth}
                onChange={(e) =>
                  onUpdateElementStyle(selectedElement.id, {
                    borderWidth: Math.max(1, Math.min(5, parseInt(e.target.value) || 1)),
                  } as Partial<BaseStyle>)
                }
                style={inputStyle}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div style={labelStyle}>圆角 (0-20px)</div>
              <input
                type="number"
                min={0}
                max={20}
                value={(style as BaseStyle).borderRadius}
                onChange={(e) =>
                  onUpdateElementStyle(selectedElement.id, {
                    borderRadius: Math.max(0, Math.min(20, parseInt(e.target.value) || 0)),
                  } as Partial<BaseStyle>)
                }
                style={inputStyle}
              />
            </div>
          </div>
        </div>

        <div style={rowStyle}>
          <div style={labelStyle}>边框样式</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['solid', 'dashed', 'dotted'] as BorderStyle[]).map((s) => (
              <button
                key={s}
                onClick={() => onUpdateElementStyle(selectedElement.id, { borderStyle: s } as Partial<BaseStyle>)}
                style={{
                  flex: 1,
                  padding: '8px 4px',
                  border: style.borderStyle === s ? '2px solid #3B82F6' : '1px solid #D1D5DB',
                  borderRadius: 6,
                  background: '#FFFFFF',
                  cursor: 'pointer',
                  fontSize: 12,
                  transition: 'all 0.15s',
                }}
              >
                {s === 'solid' ? '实线' : s === 'dashed' ? '虚线' : '圆点'}
              </button>
            ))}
          </div>
        </div>

        {isText && (
          <>
            <div style={rowStyle}>
              <div style={labelStyle}>文本内容</div>
              <textarea
                value={(style as TextStyle).content}
                onChange={(e) =>
                  onUpdateElementStyle(selectedElement.id, { content: e.target.value } as Partial<TextStyle>)
                }
                rows={3}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>
            <div style={rowStyle}>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={labelStyle}>字号</div>
                  <input
                    type="number"
                    min={8}
                    max={72}
                    value={(style as TextStyle).fontSize}
                    onChange={(e) =>
                      onUpdateElementStyle(selectedElement.id, {
                        fontSize: Math.max(8, parseInt(e.target.value) || 14),
                      } as Partial<TextStyle>)
                    }
                    style={inputStyle}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={labelStyle}>字间距 (-2~8)</div>
                  <input
                    type="number"
                    min={-2}
                    max={8}
                    value={(style as TextStyle).letterSpacing}
                    onChange={(e) =>
                      onUpdateElementStyle(selectedElement.id, {
                        letterSpacing: Math.max(-2, Math.min(8, parseInt(e.target.value) || 0)),
                      } as Partial<TextStyle>)
                    }
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>
            <div style={rowStyle}>
              <div style={labelStyle}>字体颜色</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                {PRESET_COLORS.slice(0, 20).map((c) => (
                  <ColorSwatch
                    key={c}
                    color={c}
                    selected={(style as TextStyle).fontColor === c}
                    onClick={() =>
                      onUpdateElementStyle(selectedElement.id, { fontColor: c } as Partial<TextStyle>)
                    }
                  />
                ))}
              </div>
              <input
                type="color"
                value={(style as TextStyle).fontColor}
                onChange={(e) =>
                  onUpdateElementStyle(selectedElement.id, { fontColor: e.target.value } as Partial<TextStyle>)
                }
                style={{ ...inputStyle, height: 32, padding: 2 }}
              />
            </div>
          </>
        )}
      </div>
    );
  };

  const renderLayoutTab = () => {
    if (!selectedElement) {
      return (
        <div
          style={{
            padding: 40,
            color: '#9CA3AF',
            fontSize: 13,
            textAlign: 'center',
          }}
        >
          请先选择一个元素
        </div>
      );
    }
    return (
      <div key={slideKey} style={{ animation: 'slideIn 0.25s ease-out' }}>
        <div style={rowStyle}>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={labelStyle}>X 位置</div>
              <input
                type="number"
                value={selectedElement.x}
                onChange={(e) =>
                  onUpdateElement(selectedElement.id, { x: parseInt(e.target.value) || 0 })
                }
                style={inputStyle}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div style={labelStyle}>Y 位置</div>
              <input
                type="number"
                value={selectedElement.y}
                onChange={(e) =>
                  onUpdateElement(selectedElement.id, { y: parseInt(e.target.value) || 0 })
                }
                style={inputStyle}
              />
            </div>
          </div>
        </div>
        <div style={rowStyle}>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={labelStyle}>宽度</div>
              <input
                type="number"
                min={20}
                value={selectedElement.width}
                onChange={(e) =>
                  onUpdateElement(selectedElement.id, {
                    width: Math.max(20, parseInt(e.target.value) || 20),
                  })
                }
                style={inputStyle}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div style={labelStyle}>高度</div>
              <input
                type="number"
                min={20}
                value={selectedElement.height}
                onChange={(e) =>
                  onUpdateElement(selectedElement.id, {
                    height: Math.max(20, parseInt(e.target.value) || 20),
                  })
                }
                style={inputStyle}
              />
            </div>
          </div>
        </div>
        <div style={rowStyle}>
          <div style={labelStyle}>旋转角度 (Ctrl+滚轮调节)</div>
          <input
            type="number"
            value={selectedElement.rotation}
            onChange={(e) =>
              onUpdateElement(selectedElement.id, {
                rotation: ((parseInt(e.target.value) || 0) % 360 + 360) % 360,
              })
            }
            style={inputStyle}
          />
        </div>
        <div style={rowStyle}>
          <div style={labelStyle}>快捷旋转</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
            {[0, 45, 90, 135, 180, 270].map((deg) => (
              <button
                key={deg}
                onClick={() => onUpdateElement(selectedElement.id, { rotation: deg })}
                style={{
                  padding: '8px 4px',
                  border: selectedElement.rotation === deg ? '2px solid #3B82F6' : '1px solid #D1D5DB',
                  borderRadius: 6,
                  background: '#FFFFFF',
                  cursor: 'pointer',
                  fontSize: 12,
                  transition: 'all 0.15s',
                }}
              >
                {deg}°
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderTemplatesTab = () => (
    <div key={slideKey} style={{ animation: 'slideIn 0.25s ease-out' }}>
      <div style={{ ...labelStyle, marginBottom: 10 }}>我的模板 ({templates.length})</div>
      {templates.length === 0 ? (
        <div
          style={{
            padding: 30,
            background: '#FFFFFF',
            borderRadius: 8,
            border: '1px dashed #D1D5DB',
            color: '#9CA3AF',
            fontSize: 12,
            textAlign: 'center',
          }}
        >
          点击顶部"保存模板"按钮保存当前布局
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {templates.map((tpl) => (
            <div
              key={tpl.id}
              style={{
                width: '100%',
                borderRadius: 8,
                background: '#FFFFFF',
                boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.12)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.06)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div onClick={() => onLoadTemplate(tpl)}>
                <img
                  src={tpl.thumbnail}
                  alt={tpl.name}
                  style={{ width: '100%', display: 'block', aspectRatio: '200/280', objectFit: 'cover' }}
                />
                <div style={{ padding: '8px 10px', fontSize: 12, color: '#374151', fontWeight: 500 }}>
                  {tpl.name}
                </div>
                <div style={{ padding: '0 10px 8px', fontSize: 10, color: '#9CA3AF' }}>
                  {tpl.paperSize} · {tpl.elements.length} 元素
                </div>
              </div>
              <div style={{ padding: '0 8px 8px', display: 'flex', gap: 4 }}>
                <button
                  onClick={() => onLoadTemplate(tpl)}
                  style={{
                    flex: 1,
                    padding: '4px 8px',
                    border: 'none',
                    borderRadius: 4,
                    background: '#3B82F6',
                    color: '#fff',
                    fontSize: 11,
                    cursor: 'pointer',
                  }}
                >
                  加载
                </button>
                <button
                  onClick={() => onDeleteTemplate(tpl.id)}
                  style={{
                    padding: '4px 8px',
                    border: '1px solid #D1D5DB',
                    borderRadius: 4,
                    background: '#fff',
                    color: '#EF4444',
                    fontSize: 11,
                    cursor: 'pointer',
                  }}
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const tabButtonStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '10px 4px',
    border: 'none',
    background: 'transparent',
    fontSize: 12,
    fontWeight: active ? 600 : 400,
    color: active ? '#3B82F6' : '#6B7280',
    cursor: 'pointer',
    borderBottom: active ? '2px solid #3B82F6' : '2px solid transparent',
    transition: 'all 0.15s',
  });

  return (
    <div
      style={{
        width: 280,
        background: '#F3F4F6',
        borderTopLeftRadius: 12,
        borderBottomLeftRadius: 12,
        boxShadow: 'inset 2px 0 8px rgba(0,0,0,0.04)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', background: '#FFFFFF', borderBottom: '1px solid #E5E7EB' }}>
        <button style={tabButtonStyle(activeTab === 'elements')} onClick={() => switchTab('elements')}>
          元素
        </button>
        <button style={tabButtonStyle(activeTab === 'style')} onClick={() => switchTab('style')}>
          样式
        </button>
        <button style={tabButtonStyle(activeTab === 'layout')} onClick={() => switchTab('layout')}>
          布局
        </button>
        <button style={tabButtonStyle(activeTab === 'templates')} onClick={() => switchTab('templates')}>
          模板
        </button>
      </div>
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 16,
        }}
      >
        {activeTab === 'elements' && renderElementsTab()}
        {activeTab === 'style' && renderStyleTab()}
        {activeTab === 'layout' && renderLayoutTab()}
        {activeTab === 'templates' && renderTemplatesTab()}
      </div>
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(16px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};
