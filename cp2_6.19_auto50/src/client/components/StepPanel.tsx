import React, { useState, useRef } from 'react';
import type { Step, Attachment } from '../../types';

interface StepPanelProps {
  steps: Step[];
  selectedStepId: string | null;
  onSelectStep: (id: string) => void;
  onAddStep: () => void;
  onUpdateStep: (stepId: string, data: Partial<Step>) => void;
  onDeleteStep: (stepId: string) => void;
  onBatchDelete: (stepIds: string[]) => void;
  onReorderSteps: (ids: string[]) => void;
  onUploadAttachment: (stepId: string, file: File) => Promise<Attachment | null>;
}

export default function StepPanel({
  steps,
  selectedStepId,
  onSelectStep,
  onAddStep,
  onUpdateStep,
  onDeleteStep,
  onBatchDelete,
  onReorderSteps,
  onUploadAttachment
}: StepPanelProps) {
  const [selectedStepIds, setSelectedStepIds] = useState<Set<string>>(new Set());
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [uploadingStepId, setUploadingStepId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTargetStepId, setUploadTargetStepId] = useState<string | null>(null);

  const toggleSelect = (stepId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelected = new Set(selectedStepIds);
    if (newSelected.has(stepId)) {
      newSelected.delete(stepId);
    } else {
      newSelected.add(stepId);
    }
    setSelectedStepIds(newSelected);
  };

  const handleBatchDelete = () => {
    if (selectedStepIds.size === 0) return;
    if (!confirm(`确定要删除选中的 ${selectedStepIds.size} 个步骤吗？`)) return;
    onBatchDelete(Array.from(selectedStepIds));
    setSelectedStepIds(new Set());
  };

  const handleDragStart = (e: React.DragEvent, stepId: string) => {
    setDraggedId(stepId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', stepId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (!draggedId) return;
    const draggedIndex = steps.findIndex(s => s.id === draggedId);
    if (draggedIndex === targetIndex) {
      setDraggedId(null);
      return;
    }
    const newSteps = [...steps];
    const [draggedStep] = newSteps.splice(draggedIndex, 1);
    newSteps.splice(targetIndex, 0, draggedStep);
    onReorderSteps(newSteps.map(s => s.id));
    setDraggedId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  const triggerUpload = (stepId: string) => {
    setUploadTargetStepId(stepId);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTargetStepId) return;
    setUploadingStepId(uploadTargetStepId);
    setUploadProgress(prev => ({ ...prev, [uploadTargetStepId]: 0 }));
    for (let i = 0; i <= 100; i += 20) {
      await new Promise(resolve => setTimeout(resolve, 150));
      setUploadProgress(prev => ({ ...prev, [uploadTargetStepId]: Math.min(i, 100) }));
    }
    await onUploadAttachment(uploadTargetStepId, file);
    setUploadingStepId(null);
    setUploadProgress(prev => ({ ...prev, [uploadTargetStepId]: 0 }));
    if (fileInputRef.current) fileInputRef.current.value = '';
    setUploadTargetStepId(null);
  };

  const isImage = (mimetype: string) => mimetype.startsWith('image/');

  return (
    <div style={{ position: 'relative', paddingBottom: selectedStepIds.size > 0 ? '70px' : '0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
      <h3 style={{ fontSize: '16px', color: 'var(--color-text)' }}>
        实验步骤 ({steps.length})
      </h3>
      <button
        onClick={onAddStep}
        style={{
          padding: '8px 16px',
          background: 'var(--color-secondary)',
          color: '#1A1535',
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: '600'
        }}>
        + 添加步骤
      </button>
    </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf,.doc,.docx,.txt"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {steps.length === 0 ? (
        <div style={{
          background: 'var(--color-card)',
          borderRadius: '12px',
          padding: '48px 24px',
          textAlign: 'center',
          color: 'var(--color-text-muted)'
        }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>📋</div>
          <p>暂无实验步骤，点击上方"添加步骤"按钮创建</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {steps.map((step, index) => (
            <div
              key={step.id}
              draggable
              onDragStart={(e) => handleDragStart(e, step.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              onClick={() => onSelectStep(step.id)}
              style={{
                background: 'var(--color-card)',
                borderRadius: '12px',
                padding: '24px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                border: selectedStepId === step.id ? '2px solid var(--color-secondary)' : '2px solid transparent',
                transform: draggedId === step.id ? 'scale(0.95)' : 'none',
                boxShadow: draggedId === step.id ? '-8px 0 20px rgba(255, 179, 0, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.2)',
                animation: `slideUpIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                animationDelay: `${index * 0.05 + 's'
              }}
              onMouseEnter={(e) => {
                if (draggedId !== step.id) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.3)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = draggedId === step.id ? 'scale(0.95)' : 'none';
                e.currentTarget.style.boxShadow = draggedId === step.id ? '-8px 0 20px rgba(255, 179, 0, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.2)';
              }}
            >
              <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    checked={selectedStepIds.has(step.id)}
                    onChange={(e) => toggleSelect(step.id, e as unknown as React.MouseEvent)}
                    onClick={(e) => e.stopPropagation()}
                    style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#FFB300' }}
                  />
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: step.completed ? 'var(--color-success)' : 'var(--color-card-light)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '700',
                    color: step.completed ? 'white' : 'var(--color-text-muted)',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '13px'
                  }}>
                    {index + 1}
                  </div>
                </div>
                <div style={{ flex: '1' }}>
                  <input
                    type="text"
                    value={step.name}
                    onChange={(e) => onUpdateStep(step.id, { name: e.target.value })}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="步骤名称"
                    style={{
                      width: '100%',
                      fontSize: '15px',
                      fontWeight: '600',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: '1px solid transparent',
                      padding: '4px 0',
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => (e.target.style.borderBottomColor = 'var(--color-secondary)')}
                    onBlur={(e) => (e.target.style.borderBottomColor = 'transparent')}
                  />
                  <div style={{ display: 'flex', gap: '16px', marginTop: '6px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                    <span>开始: {step.startTime ? new Date(step.startTime).toLocaleString('zh-CN') : '-'}</span>
                    <span>结束: {step.endTime ? new Date(step.endTime).toLocaleString('zh-CN') : '-'}</span>
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                  <div style={{ flex: '1' }}>
                    <label style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>预期结果</label>
                    <textarea
                      value={step.expectedResult}
                      onChange={(e) => onUpdateStep(step.id, { expectedResult: e.target.value })}
                      onClick={(e) => e.stopPropagation()}
                      placeholder="输入预期结果..."
                      rows={2}
                      style={{ width: '100%', fontSize: '13px' }}
                    />
                  </div>
                  <div style={{ flex: '1' }}>
                    <label style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>实际结果</label>
                    <textarea
                      value={step.actualResult}
                      onChange={(e) => onUpdateStep(step.id, { actualResult: e.target.value })}
                      onClick={(e) => e.stopPropagation()}
                      placeholder="输入实际结果..."
                      rows={2}
                      style={{ width: '100%', fontSize: '13px' }}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px', alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                    <input
                      type="checkbox"
                      checked={step.completed}
                      onChange={(e) => {
                        e.stopPropagation();
                        onUpdateStep(step.id, { completed: e.target.checked });
                      }}
                      onClick={(e) => e.stopPropagation()}
                      style={{ accentColor: '#4CAF50' }}
                    />
                    标记为已完成
                  </label>
                </div>
                <div style={{ marginTop: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerUpload(step.id);
                    }}
                    disabled={uploadingStepId === step.id}
                    style={{
                      padding: '6px 14px',
                      background: 'var(--color-card-light)',
                      color: 'var(--color-text)',
                      borderRadius: '6px',
                      fontSize: '12px'
                    }}>
                    {uploadingStepId === step.id ? '上传中...' : '📎 上传附件'}
                  </button>
                  {uploadingStepId === step.id && uploadProgress[step.id] > 0 && (
                    <div style={{
                      flex: '1',
                      height: '8px',
                      background: 'var(--color-bg-start)',
                      borderRadius: '4px',
                      overflow: 'hidden',
                      minWidth: '120px'
                    }}>
                      <div style={{
                        height: '100%',
                        background: 'var(--color-secondary)',
                        transition: 'width 0.15s ease-out',
                        width: `${uploadProgress[step.id]}%'
                      }} />
                    </div>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('确定要删除这个步骤吗？')) {
                        onDeleteStep(step.id);
                      }
                    }}
                    style={{
                      padding: '6px 14px',
                      background: 'rgba(229, 57, 53, 0.1)',
                      color: 'var(--color-danger)',
                      borderRadius: '6px',
                      fontSize: '12px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--color-danger)';
                      e.currentTarget.style.color = 'white';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(229, 57, 53, 0.1)';
                      e.currentTarget.style.color = 'var(--color-danger)';
                    }}
                  >
                    删除
                  </button>
                </div>
                {step.attachments.length > 0 && (
                  <div style={{
                    marginTop: '16px',
                    display: 'flex',
                    gap: '8px',
                    flexWrap: 'wrap'
                  }}>
                    {step.attachments.map(att => (
                      <div key={att.id} style={{
                        position: 'relative',
                        animation: 'fadeIn 0.3s ease-out'
                      }}>
                        {isImage(att.mimetype) ? (
                          <img
                            src={att.url}
                            alt={att.originalName}
                            style={{
                              width: '80px',
                              height: '80px',
                              objectFit: 'cover',
                              borderRadius: '8px',
                              border: '1px solid var(--color-border)'
                            }}
                            title={att.originalName}
                          />
                        ) : (
                          <div style={{
                            width: '80px',
                            height: '80px',
                            background: 'var(--color-card-light)',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '24px'
                          }}>
                            📄
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedStepIds.size > 0 && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '300px',
          right: '24px',
          background: 'var(--color-card)',
          padding: '16px 24px',
          borderRadius: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.3)',
          animation: 'slideUpIn 0.3s ease-out',
          zIndex: 100
        }}>
          <span style={{ color: 'var(--color-text-muted)' }}>
            已选择 {selectedStepIds.size} 个步骤
          </span>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => setSelectedStepIds(new Set())}
              style={{
                padding: '8px 16px',
                background: 'var(--color-card-light)',
                color: 'var(--color-text)',
                borderRadius: '8px',
                fontSize: '13px'
              }}>
              取消选择
            </button>
            <button
              onClick={handleBatchDelete}
              style={{
                padding: '8px 16px',
                background: 'var(--color-danger)',
                color: 'white',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '500'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-danger-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--color-danger)')}
            >
              删除选中
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
