import React, { useState, useRef, useCallback } from 'react';
import { StepInfo } from '../App';

interface Props {
  experimentId: string;
  steps: StepInfo[];
  selectedStepId: string | null;
  onSelectStep: (id: string | null) => void;
  onStepsChange: () => void;
}

export default function StepPanel({ experimentId, steps, selectedStepId, onSelectStep, onStepsChange }: Props) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStep, setNewStep] = useState({ name: '', startTime: '', endTime: '', expectedResult: '', actualResult: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<StepInfo>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTargetStepId, setUploadTargetStepId] = useState<string | null>(null);

  const handleAddStep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStep.name) return;
    try {
      await fetch(`/api/experiments/${experimentId}/steps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStep),
      });
      setNewStep({ name: '', startTime: '', endTime: '', expectedResult: '', actualResult: '' });
      setShowAddForm(false);
      onStepsChange();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateStep = async (id: string) => {
    try {
      await fetch(`/api/steps/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      });
      setEditingId(null);
      setEditData({});
      onStepsChange();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleComplete = async (step: StepInfo) => {
    try {
      await fetch(`/api/steps/${step.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !step.completed }),
      });
      onStepsChange();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteStep = async (id: string) => {
    if (!confirm('确定删除此步骤？')) return;
    await fetch(`/api/steps/${id}`, { method: 'DELETE' });
    if (selectedStepId === id) onSelectStep(null);
    onStepsChange();
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`确定删除选中的 ${selectedIds.size} 个步骤？`)) return;
    await fetch('/api/steps/batch-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: Array.from(selectedIds) }),
    });
    if (selectedIds.has(selectedStepId || '')) onSelectStep(null);
    setSelectedIds(new Set());
    onStepsChange();
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const handleDragStart = (idx: number) => setDragIdx(idx);

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIdx(idx);
  };

  const handleDrop = useCallback(async (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === targetIdx) { setDragIdx(null); setDragOverIdx(null); return; }
    const reordered = [...steps];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(targetIdx, 0, moved);
    const stepIds = reordered.map((s) => s.id);
    try {
      await fetch(`/api/experiments/${experimentId}/steps/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stepIds }),
      });
      onStepsChange();
    } catch (err) {
      console.error(err);
    }
    setDragIdx(null);
    setDragOverIdx(null);
  }, [dragIdx, steps, experimentId, onStepsChange]);

  const handleDragEnd = () => { setDragIdx(null); setDragOverIdx(null); };

  const handleUploadClick = (stepId: string) => {
    setUploadTargetStepId(stepId);
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTargetStepId) return;
    setUploading(uploadTargetStepId);
    setUploadProgress(0);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `/api/steps/${uploadTargetStepId}/attachments`);
      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable) setUploadProgress(Math.round((ev.loaded / ev.total) * 100));
      };
      xhr.onload = () => {
        setUploading(null);
        setUploadProgress(0);
        if (fileInputRef.current) fileInputRef.current.value = '';
        onStepsChange();
      };
      xhr.onerror = () => { setUploading(null); };
      xhr.send(formData);
    } catch (err) {
      console.error(err);
      setUploading(null);
    }
  };

  const isImage = (mimetype: string) => mimetype.startsWith('image/');

  return (
    <div>
      <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileChange} accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" />

      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 16,
      }}>
        <h3 style={{ margin: 0, fontSize: 16, color: '#B0AAC8', fontWeight: 600 }}>实验步骤</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          {selectedIds.size > 0 && (
            <button onClick={handleBatchDelete} style={{
              padding: '6px 14px', borderRadius: 6, background: '#E53935',
              color: '#fff', border: 'none', fontSize: 12, cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >删除选中 ({selectedIds.size})</button>
          )}
          <button onClick={() => setShowAddForm(!showAddForm)} style={{
            padding: '6px 14px', borderRadius: 6,
            background: '#FFB300', color: '#1A1535', border: 'none',
            fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >{showAddForm ? '取消' : '+ 添加步骤'}</button>
        </div>
      </div>

      {showAddForm && (
        <div style={{
          background: '#2F2860', borderRadius: 12, padding: 24,
          marginBottom: 16, border: '1px solid rgba(255,179,0,0.15)',
          animation: 'slideInBottom 0.35s ease-out',
        }}>
          <form onSubmit={handleAddStep}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: '#8884A8', display: 'block', marginBottom: 4 }}>步骤名称 *</label>
                <input value={newStep.name} onChange={(e) => setNewStep({ ...newStep, name: e.target.value })} style={inputStyle} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: 11, color: '#8884A8', display: 'block', marginBottom: 4 }}>开始时间</label>
                  <input type="datetime-local" value={newStep.startTime} onChange={(e) => setNewStep({ ...newStep, startTime: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#8884A8', display: 'block', marginBottom: 4 }}>结束时间</label>
                  <input type="datetime-local" value={newStep.endTime} onChange={(e) => setNewStep({ ...newStep, endTime: e.target.value })} style={inputStyle} />
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: '#8884A8', display: 'block', marginBottom: 4 }}>预期结果</label>
                <textarea value={newStep.expectedResult} onChange={(e) => setNewStep({ ...newStep, expectedResult: e.target.value })} style={{ ...inputStyle, resize: 'vertical', minHeight: 48 }} rows={2} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#8884A8', display: 'block', marginBottom: 4 }}>实际结果</label>
                <textarea value={newStep.actualResult} onChange={(e) => setNewStep({ ...newStep, actualResult: e.target.value })} style={{ ...inputStyle, resize: 'vertical', minHeight: 48 }} rows={2} />
              </div>
            </div>
            <div style={{ marginTop: 12, textAlign: 'right' }}>
              <button type="submit" style={btnPrimaryStyle}>添加</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {steps.map((step, idx) => {
          const isSelected = selectedStepId === step.id;
          const isEditing = editingId === step.id;
          const isDragging = dragIdx === idx;
          const isDragOver = dragOverIdx === idx;

          return (
            <div
              key={step.id}
              draggable={!isEditing}
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={(e) => handleDrop(e, idx)}
              onDragEnd={handleDragEnd}
              onClick={() => onSelectStep(step.id)}
              style={{
                background: '#2F2860',
                borderRadius: 12,
                padding: 24,
                border: isSelected ? '1px solid rgba(255,179,0,0.3)' : '1px solid rgba(255,255,255,0.05)',
                borderLeft: isSelected ? '3px solid #FFB300' : '3px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.2s',
                transform: isDragging ? 'scale(0.95)' : 'inherit',
                boxShadow: isDragging ? '-4px 2px 12px rgba(0,0,0,0.4)' : isDragOver ? '0 0 0 2px rgba(255,179,0,0.3)' : 'none',
                animation: `fadeInUp 0.3s ease-out ${idx * 0.1}s both`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <input
                  type="checkbox"
                  checked={selectedIds.has(step.id)}
                  onChange={() => toggleSelect(step.id)}
                  onClick={(e) => e.stopPropagation()}
                  style={{ cursor: 'pointer', accentColor: '#FFB300' }}
                />

                <div style={{ cursor: 'grab', color: '#6B6590', fontSize: 12, padding: '4px 2px' }} title="拖拽排序">⠿</div>

                {step.completed && (
                  <span style={{ color: '#4CAF50', fontSize: 16 }}>✓</span>
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  {isEditing ? (
                    <input value={editData.name || step.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} style={{ ...inputStyle, fontWeight: 600 }} />
                  ) : (
                    <div style={{ fontSize: 14, fontWeight: 600, color: step.completed ? '#8884A8' : '#E0E0E0', textDecoration: step.completed ? 'line-through' : 'none' }}>
                      {step.name}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: '#6B6590', marginTop: 2 }}>
                    {step.startTime && `⏱ ${new Date(step.startTime).toLocaleString('zh-CN')}`}
                    {step.endTime && ` → ${new Date(step.endTime).toLocaleString('zh-CN')}`}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={(e) => { e.stopPropagation(); handleToggleComplete(step); }} style={iconBtnStyle} title={step.completed ? '标记未完成' : '标记完成'}>
                    {step.completed ? '↩' : '✓'}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleUploadClick(step.id); }} style={iconBtnStyle} title="上传附件">📎</button>
                  <button onClick={(e) => {
                    e.stopPropagation();
                    if (isEditing) { handleUpdateStep(step.id); }
                    else { setEditingId(step.id); setEditData({ name: step.name, expectedResult: step.expectedResult, actualResult: step.actualResult }); }
                  }} style={iconBtnStyle} title={isEditing ? '保存' : '编辑'}>
                    {isEditing ? '💾' : '✏'}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteStep(step.id); }} style={{ ...iconBtnStyle, color: '#E53935' }} title="删除">🗑</button>
                </div>
              </div>

              {isEditing && (
                <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <label style={{ fontSize: 11, color: '#8884A8', display: 'block', marginBottom: 3 }}>预期结果</label>
                    <textarea value={editData.expectedResult || ''} onChange={(e) => setEditData({ ...editData, expectedResult: e.target.value })} style={{ ...inputStyle, resize: 'vertical', minHeight: 40 }} rows={2} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: '#8884A8', display: 'block', marginBottom: 3 }}>实际结果</label>
                    <textarea value={editData.actualResult || ''} onChange={(e) => setEditData({ ...editData, actualResult: e.target.value })} style={{ ...inputStyle, resize: 'vertical', minHeight: 40 }} rows={2} />
                  </div>
                </div>
              )}

              {!isEditing && (step.expectedResult || step.actualResult) && (
                <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {step.expectedResult && (
                    <div style={{ fontSize: 12, color: '#8884A8' }}>
                      <span style={{ color: '#6B6590' }}>预期:</span> {step.expectedResult}
                    </div>
                  )}
                  {step.actualResult && (
                    <div style={{ fontSize: 12, color: '#8884A8' }}>
                      <span style={{ color: '#6B6590' }}>实际:</span> {step.actualResult}
                    </div>
                  )}
                </div>
              )}

              {uploading === step.id && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ height: 4, borderRadius: 2, background: '#1A1535', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${uploadProgress}%`,
                      background: 'linear-gradient(90deg, #FFB300, #FF8F00)',
                      borderRadius: 2, transition: 'width 0.3s',
                    }} />
                  </div>
                  <div style={{ fontSize: 10, color: '#8884A8', marginTop: 2 }}>上传中 {uploadProgress}%</div>
                </div>
              )}

              {step.attachments.length > 0 && (
                <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {step.attachments.map((att) => (
                    <div key={att.id} style={{
                      borderRadius: 6, overflow: 'hidden',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}>
                      {isImage(att.mimetype) ? (
                        <img src={att.path} alt={att.originalName} style={{ width: 64, height: 48, objectFit: 'cover', display: 'block' }} />
                      ) : (
                        <div style={{
                          width: 64, height: 48, background: '#1A1535',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 10, color: '#8884A8', padding: 4, textAlign: 'center',
                        }}>
                          📄 {att.originalName.slice(-10)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {steps.length === 0 && (
          <div style={{ textAlign: 'center', padding: 32, color: '#6B6590', fontSize: 13 }}>
            暂无步骤，点击上方按钮添加
          </div>
        )}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '6px 10px', borderRadius: 6,
  background: '#1A1535', border: '1px solid #4A3F80', color: '#E0E0E0',
  fontSize: 12, outline: 'none',
};

const btnPrimaryStyle: React.CSSProperties = {
  padding: '6px 16px', borderRadius: 6,
  background: '#FFB300', color: '#1A1535', border: 'none',
  fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
};

const iconBtnStyle: React.CSSProperties = {
  background: 'transparent', border: 'none', color: '#8884A8',
  fontSize: 14, cursor: 'pointer', padding: '2px 4px', transition: 'all 0.2s',
  borderRadius: 4,
};
