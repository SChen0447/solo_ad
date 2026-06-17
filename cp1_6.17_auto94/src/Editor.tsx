import React, { useState, useRef, useCallback, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { FormField, formApi } from './api';
import FormRenderer from './FormRenderer';
import { useNavigate } from 'react-router-dom';

interface ComponentTemplate {
  type: FormField['type'];
  label: string;
  icon: string;
  defaultOptions?: string[];
}

const COMPONENT_TEMPLATES: ComponentTemplate[] = [
  { type: 'text', label: '文本框', icon: '📝' },
  { type: 'radio', label: '单选按钮组', icon: '⭕', defaultOptions: ['选项1', '选项2', '选项3'] },
  { type: 'checkbox', label: '复选框组', icon: '☑️', defaultOptions: ['选项1', '选项2', '选项3'] },
  { type: 'select', label: '下拉选择器', icon: '📋', defaultOptions: ['选项1', '选项2', '选项3'] },
  { type: 'rating', label: '评分星标', icon: '⭐' },
  { type: 'file', label: '文件上传', icon: '📎' }
];

const styles: Record<string, React.CSSProperties> = {
  editorContainer: {
    display: 'flex',
    height: '100vh',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    background: '#f5f7fa'
  },
  sidebar: {
    width: 220,
    minWidth: 220,
    background: '#fafbfc',
    borderRight: '1px solid #e8ecf1',
    padding: 16,
    overflowY: 'auto' as const,
    flexShrink: 0
  },
  sidebarTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#2c3e50',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottom: '1px solid #e8ecf1'
  },
  compItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 14px',
    background: '#fff',
    border: '1px solid #e8ecf1',
    borderRadius: 10,
    marginBottom: 8,
    cursor: 'grab',
    transition: 'all 0.15s',
    userSelect: 'none' as const
  },
  compIcon: { fontSize: 18 },
  compLabel: { fontSize: 13, color: '#34495e', fontWeight: 500 },
  mainArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden' as const
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 24px',
    background: '#fff',
    borderBottom: '1px solid #e8ecf1',
    flexShrink: 0
  },
  formTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: '#2c3e50',
    padding: '6px 10px',
    border: 'none',
    outline: 'none',
    background: 'transparent',
    borderRadius: 6,
    fontFamily: 'inherit',
    width: 280
  },
  toolbarActions: { display: 'flex', gap: 8 },
  btn: {
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 500,
    borderRadius: 8,
    cursor: 'pointer',
    border: 'none',
    transition: 'all 0.15s',
    fontFamily: 'inherit',
    display: 'flex',
    alignItems: 'center',
    gap: 6
  },
  btnSecondary: {
    background: '#f0f3f7',
    color: '#34495e'
  },
  btnPrimary: {
    background: 'linear-gradient(135deg, #4A90D9 0%, #357abd 100%)',
    color: '#fff'
  },
  btnAccent: {
    background: 'linear-gradient(135deg, #F5A623 0%, #e09315 100%)',
    color: '#fff'
  },
  canvasWrap: {
    flex: 1,
    padding: 32,
    overflowY: 'auto' as const,
    background: '#f5f7fa'
  },
  canvas: {
    maxWidth: 680,
    margin: '0 auto',
    minHeight: 500,
    background: '#fff',
    borderRadius: 16,
    boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
    padding: 32
  },
  canvasTitle: {
    fontSize: 24,
    fontWeight: 700,
    color: '#2c3e50',
    textAlign: 'center' as const,
    marginBottom: 32,
    padding: 8
  },
  canvasHint: {
    textAlign: 'center' as const,
    color: '#95a5a6',
    fontSize: 14,
    padding: 80,
    border: '2px dashed #dfe6e9',
    borderRadius: 12
  },
  fieldWrap: {
    position: 'relative' as const,
    marginBottom: 16,
    padding: 12,
    border: '2px dashed transparent',
    borderRadius: 10,
    transition: 'all 0.15s'
  },
  fieldWrapSelected: {
    borderColor: '#4A90D9',
    background: '#f0f7ff'
  },
  fieldHandle: {
    position: 'absolute' as const,
    top: 4,
    right: 4,
    display: 'flex',
    gap: 4
  },
  handleBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    border: 'none',
    background: '#4A90D9',
    color: '#fff',
    cursor: 'pointer',
    fontSize: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0
  },
  widthControls: {
    display: 'flex',
    gap: 4,
    marginTop: 8,
    paddingTop: 8,
    borderTop: '1px dashed #d0d9e0'
  },
  widthBtn: {
    flex: 1,
    padding: '4px 0',
    fontSize: 11,
    border: '1px solid #e8ecf1',
    background: '#fff',
    borderRadius: 6,
    cursor: 'pointer',
    color: '#7f8c8d'
  },
  alignBtn: {
    flex: 1,
    padding: '4px 0',
    fontSize: 11,
    border: '1px solid #e8ecf1',
    background: '#fff',
    borderRadius: 6,
    cursor: 'pointer',
    color: '#7f8c8d'
  },
  previewOverlay: {
    position: 'fixed' as const,
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.6)',
    zIndex: 10000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'auto' as const
  },
  previewClose: {
    position: 'fixed' as const,
    top: 20,
    right: 20,
    zIndex: 10001,
    width: 40, height: 40,
    borderRadius: '50%',
    background: '#fff',
    border: 'none',
    cursor: 'pointer',
    fontSize: 18,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
  },
  inlineEdit: {
    fontSize: 14,
    fontWeight: 600,
    color: '#34495e',
    border: 'none',
    outline: 'none',
    background: '#fff',
    padding: '2px 6px',
    borderRadius: 4,
    fontFamily: 'inherit',
    marginBottom: 8,
    width: 'calc(100% - 80px)'
  },
  optEdit: {
    fontSize: 13,
    border: '1px solid #e8ecf1',
    outline: 'none',
    padding: '4px 8px',
    borderRadius: 6,
    fontFamily: 'inherit',
    background: '#fff'
  }
};

const Editor: React.FC = () => {
  const navigate = useNavigate();
  const [formTitle, setFormTitle] = useState('我的自定义表单');
  const [fields, setFields] = useState<FormField[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [formId, setFormId] = useState<string | null>(null);
  const [dragClone, setDragClone] = useState<{ template: ComponentTemplate; x: number; y: number } | null>(null);

  const selectedField = fields.find(f => f.id === selectedFieldId);

  const genId = () => `f_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  const addFieldFromTemplate = (template: ComponentTemplate, index?: number) => {
    const newField: FormField = {
      id: genId(),
      type: template.type,
      label: template.label,
      options: template.defaultOptions ? [...template.defaultOptions] : undefined,
      required: false,
      width: 100
    };
    setFields(prev => {
      if (index === undefined) return [...prev, newField];
      const newFields = [...prev];
      newFields.splice(index, 0, newField);
      return newFields;
    });
    setSelectedFieldId(newField.id);
  };

  const handleDragEnd = (result: DropResult) => {
    setDragClone(null);
    if (!result.destination) return;

    if (result.type === 'PALETTE') {
      const template = COMPONENT_TEMPLATES[parseInt(result.draggableId)];
      if (template) {
        addFieldFromTemplate(template, result.destination.index);
      }
      return;
    }

    if (result.type === 'FIELDS') {
      setFields(prev => {
        const newFields = [...prev];
        const [removed] = newFields.splice(result.source.index, 1);
        newFields.splice(result.destination!.index, 0, removed);
        return newFields;
      });
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    setDragClone(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null);
  }, []);

  useEffect(() => {
    if (dragClone) {
      window.addEventListener('mousemove', handleMouseMove);
      return () => window.removeEventListener('mousemove', handleMouseMove);
    }
  }, [dragClone, handleMouseMove]);

  const updateField = (id: string, patch: Partial<FormField>) => {
    setFields(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f));
  };

  const deleteField = (id: string) => {
    setFields(prev => prev.filter(f => f.id !== id));
    if (selectedFieldId === id) setSelectedFieldId(null);
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setSelectedFieldId(null);
      setEditingFieldId(null);
    }
  };

  const saveForm = async () => {
    try {
      if (formId) {
        await formApi.updateForm(formId, { title: formTitle, fields });
      } else {
        const res = await formApi.createForm({ title: formTitle, fields });
        setFormId(res.id);
      }
      alert(formId ? '更新成功！' : '保存成功！');
    } catch {
      alert('保存失败');
    }
  };

  const publishForm = async () => {
    await saveForm();
    if (formId) {
      const publicUrl = `${window.location.origin}/form/${formId}`;
      alert(`表单已发布！公开链接：${publicUrl}\n\n点击确定前往数据看板`);
      navigate(`/dashboard/${formId}`);
    }
  };

  const renderCanvasField = (field: FormField, index: number) => {
    const isSelected = selectedFieldId === field.id;
    const isEditing = editingFieldId === field.id;
    const width = field.width || 100;

    return (
      <Draggable key={field.id} draggableId={field.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            style={{
              ...provided.draggableProps.style,
              ...styles.fieldWrap,
              ...(isSelected ? styles.fieldWrapSelected : {}),
              ...(snapshot.isDragging ? { opacity: 0.5 } : {}),
              width: `${width}%`,
              marginLeft: width < 100 ? 'auto' : 0,
              marginRight: width < 100 ? 0 : 0
            }}
            onClick={e => { e.stopPropagation(); setSelectedFieldId(field.id); }}
            onDoubleClick={e => {
              e.stopPropagation();
              setSelectedFieldId(field.id);
              setEditingFieldId(field.id);
            }}
          >
            {isSelected && (
              <div style={styles.fieldHandle}>
                <button style={styles.handleBtn} onClick={e => { e.stopPropagation(); deleteField(field.id); }} title="删除">✕</button>
                <span {...provided.dragHandleProps} style={{ ...styles.handleBtn, cursor: 'grab' }}>⋮⋮</span>
              </div>
            )}

            {isEditing ? (
              <input
                style={styles.inlineEdit}
                value={field.label}
                onChange={e => updateField(field.id, { label: e.target.value })}
                onBlur={() => setEditingFieldId(null)}
                onKeyDown={e => { if (e.key === 'Enter') setEditingFieldId(null); }}
                autoFocus
                onClick={e => e.stopPropagation()}
              />
            ) : (
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#34495e', marginBottom: 8 }}>
                {field.label}
                {field.required && <span style={{ color: '#e74c3c', marginLeft: 4 }}>*</span>}
              </label>
            )}

            {field.type === 'text' && (
              <div style={{
                padding: '10px 14px',
                border: '2px solid #ecf0f1',
                borderRadius: 8,
                color: '#bdc3c7',
                fontSize: 13
              }}>
                请输入{field.label}
              </div>
            )}

            {(field.type === 'radio' || field.type === 'checkbox') && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {field.options?.map((opt, idx) => (
                  isEditing ? (
                    <input
                      key={idx}
                      style={styles.optEdit}
                      value={opt}
                      onChange={e => {
                        const newOpts = [...(field.options || [])];
                        newOpts[idx] = e.target.value;
                        updateField(field.id, { options: newOpts });
                      }}
                      onClick={e => e.stopPropagation()}
                    />
                  ) : (
                    <div key={idx} style={{
                      padding: '6px 12px',
                      border: `2px solid ${field.type === 'radio' ? '#4A90D9' : '#F5A623'}`,
                      borderRadius: 8,
                      fontSize: 13,
                      color: '#34495e',
                      opacity: idx === 0 ? 1 : 0.6
                    }}>
                      {field.type === 'radio' ? '◉' : '☑'} {opt}
                    </div>
                  )
                ))}
                {isEditing && (
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      updateField(field.id, { options: [...(field.options || []), `选项${(field.options?.length || 0) + 1}`] });
                    }}
                    style={{ ...styles.optEdit, cursor: 'pointer', borderStyle: 'dashed', color: '#4A90D9' }}
                  >
                    + 添加
                  </button>
                )}
              </div>
            )}

            {field.type === 'select' && (
              <div>
                {isEditing ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {field.options?.map((opt, idx) => (
                      <input
                        key={idx}
                        style={styles.optEdit}
                        value={opt}
                        onChange={e => {
                          const newOpts = [...(field.options || [])];
                          newOpts[idx] = e.target.value;
                          updateField(field.id, { options: newOpts });
                        }}
                        onClick={e => e.stopPropagation()}
                      />
                    ))}
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        updateField(field.id, { options: [...(field.options || []), `选项${(field.options?.length || 0) + 1}`] });
                      }}
                      style={{ ...styles.optEdit, cursor: 'pointer', borderStyle: 'dashed', color: '#4A90D9', alignSelf: 'flex-start' }}
                    >
                      + 添加
                    </button>
                  </div>
                ) : (
                  <div style={{
                    padding: '10px 14px',
                    border: '2px solid #ecf0f1',
                    borderRadius: 8,
                    color: '#bdc3c7',
                    fontSize: 13,
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}>
                    <span>请选择...</span>
                    <span>▼</span>
                  </div>
                )}
              </div>
            )}

            {field.type === 'rating' && (
              <div style={{ display: 'flex', gap: 6 }}>
                {[1, 2, 3, 4, 5].map(s => (
                  <span key={s} style={{ fontSize: 24, color: s <= 3 ? '#F5A623' : '#ecf0f1' }}>★</span>
                ))}
              </div>
            )}

            {field.type === 'file' && (
              <div style={{
                padding: 16,
                border: '2px dashed #4A90D9',
                borderRadius: 8,
                textAlign: 'center',
                color: '#4A90D9',
                fontSize: 13
              }}>
                📁 点击上传文件
              </div>
            )}

            {isSelected && (
              <div style={styles.widthControls}>
                {[25, 50, 75, 100].map(w => (
                  <button
                    key={w}
                    style={{
                      ...styles.widthBtn,
                      ...(width === w ? { background: '#4A90D9', color: '#fff', borderColor: '#4A90D9' } : {})
                    }}
                    onClick={e => { e.stopPropagation(); updateField(field.id, { width: w }); }}
                  >
                    {w}%
                  </button>
                ))}
                <button
                  style={{
                    ...styles.alignBtn,
                    ...(!field.required ? { background: '#F5A623', color: '#fff', borderColor: '#F5A623' } : {})
                  }}
                  onClick={e => { e.stopPropagation(); updateField(field.id, { required: !field.required }); }}
                  title="设置必填"
                >
                  {field.required ? '✓ 必填' : '设为必填'}
                </button>
              </div>
            )}
          </div>
        )}
      </Draggable>
    );
  };

  return (
    <div style={styles.editorContainer}>
      <DragDropContext onDragEnd={handleDragEnd}>
        <div style={styles.sidebar}>
          <div style={styles.sidebarTitle}>📦 组件面板</div>
          <Droppable droppableId="palette" type="PALETTE">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps}>
                {COMPONENT_TEMPLATES.map((tpl, idx) => (
                  <Draggable key={tpl.type} draggableId={String(idx)} index={idx}>
                    {(p) => (
                      <div
                        ref={p.innerRef}
                        {...p.draggableProps}
                        {...p.dragHandleProps}
                        style={{
                          ...p.draggableProps.style,
                          ...styles.compItem
                        }}
                      >
                        <span style={styles.compIcon}>{tpl.icon}</span>
                        <span style={styles.compLabel}>{tpl.label}</span>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
          <div style={{ marginTop: 24, fontSize: 12, color: '#95a5a6', lineHeight: 1.8 }}>
            💡 提示：<br />
            • 拖拽组件到画布<br />
            • 双击编辑标签<br />
            • 选中调整宽度
          </div>
        </div>

        <div style={styles.mainArea}>
          <div style={styles.toolbar}>
            <input
              style={styles.formTitle}
              value={formTitle}
              onChange={e => setFormTitle(e.target.value)}
              placeholder="输入表单标题"
            />
            <div style={styles.toolbarActions}>
              <button style={{ ...styles.btn, ...styles.btnSecondary }} onClick={() => navigate('/')}>
                🏠 首页
              </button>
              <button style={{ ...styles.btn, ...styles.btnSecondary }} onClick={() => setShowPreview(true)}>
                👁 预览
              </button>
              <button style={{ ...styles.btn, ...styles.btnPrimary }} onClick={saveForm}>
                💾 保存
              </button>
              <button style={{ ...styles.btn, ...styles.btnAccent }} onClick={publishForm}>
                🚀 发布
              </button>
            </div>
          </div>

          <div style={styles.canvasWrap} onClick={handleCanvasClick}>
            <div style={styles.canvas}>
              <div style={styles.canvasTitle}>{formTitle || '未命名表单'}</div>

              <Droppable droppableId="canvas" type="FIELDS">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    style={{
                      minHeight: 200,
                      borderRadius: 12,
                      background: snapshot.isDraggingOver ? 'rgba(74, 144, 217, 0.05)' : 'transparent',
                      transition: 'background 0.15s'
                    }}
                  >
                    {fields.length === 0 ? (
                      <div style={styles.canvasHint}>
                        👈 从左侧拖拽组件到此处开始创建表单
                      </div>
                    ) : (
                      fields.map((f, i) => renderCanvasField(f, i))
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          </div>
        </div>
      </DragDropContext>

      {showPreview && (
        <div style={styles.previewOverlay} onClick={() => setShowPreview(false)}>
          <button style={styles.previewClose} onClick={() => setShowPreview(false)}>✕</button>
          <div style={{ width: '100%', height: '100%' }} onClick={e => e.stopPropagation()}>
            <FormRenderer fields={fields} title={formTitle} preview={true} />
          </div>
        </div>
      )}

      {dragClone && (
        <div style={{
          position: 'fixed',
          top: dragClone.y,
          left: dragClone.x,
          pointerEvents: 'none',
          zIndex: 99999,
          opacity: 0.7,
          transform: 'translate(-50%, -50%)'
        }}>
          <div style={styles.compItem}>{dragClone.template.icon} {dragClone.template.label}</div>
        </div>
      )}
    </div>
  );
};

export default Editor;
