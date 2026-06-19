import React, { useState, useEffect, useCallback } from 'react';
import ExperimentList from './components/ExperimentList';
import StepPanel from './components/StepPanel';
import DataRecord from './components/DataRecord';
import ReportGenerator from './components/ReportGenerator';
import type { Experiment, Step, DataRecord as DataRecordType, Attachment } from '../types';

interface AppState {
  experiments: Experiment[];
  selectedExperimentId: string | null;
  selectedStepId: string | null;
  steps: Step[];
  records: DataRecordType[];
  isCreatingExperiment: boolean;
  loading: boolean;
  highlightedExperimentId: string | null;
  activePanel: 'steps' | 'records' | 'report';
  conclusion: string;
}

export default function App() {
  const [state, setState] = useState<AppState>({
    experiments: [],
    selectedExperimentId: null,
    selectedStepId: null,
    steps: [],
    records: [],
    isCreatingExperiment: false,
    loading: true,
    highlightedExperimentId: null,
    activePanel: 'steps',
    conclusion: ''
  });

  const [newExperiment, setNewExperiment] = useState({
    name: '',
    date: new Date().toISOString().split('T')[0],
    leader: '',
    description: ''
  });

  const api = {
    get: async (url: string) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    post: async (url: string, body: unknown) => {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    put: async (url: string, body: unknown) => {
      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    delete: async (url: string) => {
      const res = await fetch(url, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    }
  };

  const loadExperiments = useCallback(async () => {
    try {
      const exps = await api.get('/api/experiments');
      setState(prev => ({ ...prev, experiments: exps, loading: false, selectedExperimentId: prev.selectedExperimentId || exps[0]?.id || null }));
    } catch (err) {
      console.error('Failed to load experiments:', err);
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    loadExperiments();
  }, [loadExperiments]);

  useEffect(() => {
    if (state.selectedExperimentId) {
      api.get(`/api/experiments/${state.selectedExperimentId}/steps`)
        .then(steps => {
          setState(prev => ({
            ...prev,
            steps,
            selectedStepId: prev.selectedStepId && steps.some((s: Step) => s.id === prev.selectedStepId)
              ? prev.selectedStepId
              : steps[0]?.id || null
          }));
        })
        .catch(err => console.error('Failed to load steps:', err));
    }
  }, [state.selectedExperimentId]);

  useEffect(() => {
    if (state.selectedStepId) {
      api.get(`/api/steps/${state.selectedStepId}/records`)
        .then(records => setState(prev => ({ ...prev, records })))
        .catch(err => console.error('Failed to load records:', err));
    }
  }, [state.selectedStepId]);

  const handleCreateExperiment = async () => {
    if (!newExperiment.name || !newExperiment.leader) return;
    try {
      const exp = await api.post('/api/experiments', newExperiment);
      setState(prev => ({
        ...prev,
        experiments: [...prev.experiments, exp],
        selectedExperimentId: exp.id,
        isCreatingExperiment: false,
        highlightedExperimentId: exp.id
      }));
      setNewExperiment({ name: '', date: new Date().toISOString().split('T')[0], leader: '', description: '' });
      setTimeout(() => setState(prev => ({ ...prev, highlightedExperimentId: null })), 1000);
    } catch (err) {
      console.error('Failed to create experiment:', err);
    }
  };

  const handleDeleteExperiment = async (id: string) => {
    if (!confirm('确定要删除这个实验项目吗？')) return;
    try {
      await api.delete(`/api/experiments/${id}`);
      setState(prev => ({
        ...prev,
        experiments: prev.experiments.filter(e => e.id !== id),
        selectedExperimentId: prev.selectedExperimentId === id
          ? prev.experiments.filter(e => e.id !== id)[0]?.id || null
          : prev.selectedExperimentId
      }));
    } catch (err) {
      console.error('Failed to delete experiment:', err);
    }
  };

  const handleReorderExperiments = async (ids: string[]) => {
    try {
      await api.put('/api/experiments/reorder', { ids });
      const ordered = ids.map(id => state.experiments.find(e => e.id === id)!).filter(Boolean);
      setState(prev => ({ ...prev, experiments: ordered }));
    } catch (err) {
      console.error('Failed to reorder experiments:', err);
    }
  };

  const handleAddStep = async () => {
    if (!state.selectedExperimentId) return;
    try {
      const step = await api.post(`/api/experiments/${state.selectedExperimentId}/steps`, {
        name: `新步骤 ${state.steps.length + 1}`,
        startTime: new Date().toISOString().slice(0, 16),
        endTime: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
        expectedResult: '',
        actualResult: ''
      });
      setState(prev => ({ ...prev, steps: [...prev.steps, step] }));
    } catch (err) {
      console.error('Failed to create step:', err);
    }
  };

  const handleUpdateStep = async (stepId: string, data: Partial<Step>) => {
    try {
      const updated = await api.put(`/api/steps/${stepId}`, data);
      setState(prev => ({
        ...prev,
        steps: prev.steps.map(s => s.id === stepId ? updated : s)
      }));
    } catch (err) {
      console.error('Failed to update step:', err);
    }
  };

  const handleDeleteStep = async (stepId: string) => {
    try {
      await api.delete(`/api/steps/${stepId}`);
      setState(prev => ({
        ...prev,
        steps: prev.steps.filter(s => s.id !== stepId),
        selectedStepId: prev.selectedStepId === stepId
          ? prev.steps.filter(s => s.id !== stepId)[0]?.id || null
          : prev.selectedStepId
      }));
    } catch (err) {
      console.error('Failed to delete step:', err);
    }
  };

  const handleBatchDeleteSteps = async (stepIds: string[]) => {
    try {
      await api.post('/api/steps/batch-delete', { ids: stepIds });
      setState(prev => ({
        ...prev,
        steps: prev.steps.filter(s => !stepIds.includes(s.id)),
        selectedStepId: prev.selectedStepId && stepIds.includes(prev.selectedStepId)
          ? prev.steps.filter(s => !stepIds.includes(s.id))[0]?.id || null
          : prev.selectedStepId
      }));
    } catch (err) {
      console.error('Failed to batch delete steps:', err);
    }
  };

  const handleReorderSteps = async (ids: string[]) => {
    if (!state.selectedExperimentId) return;
    try {
      await api.put(`/api/experiments/${state.selectedExperimentId}/steps/reorder`, { ids });
      const ordered = ids.map(id => state.steps.find(s => s.id === id)!).filter(Boolean);
      setState(prev => ({ ...prev, steps: ordered }));
    } catch (err) {
      console.error('Failed to reorder steps:', err);
    }
  };

  const handleUploadAttachment = async (stepId: string, file: File): Promise<Attachment | null> => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`/api/steps/${stepId}/attachments`, {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const attachment = await res.json();
      setState(prev => ({
        ...prev,
        steps: prev.steps.map(s => s.id === stepId
          ? { ...s, attachments: [...s.attachments, attachment] }
          : s)
      }));
      return attachment;
    } catch (err) {
      console.error('Failed to upload attachment:', err);
      return null;
    }
  };

  const handleAddRecord = async (type: DataRecordType['type'], value: string, enumOptions?: string[]) => {
    if (!state.selectedStepId) return;
    try {
      const record = await api.post(`/api/steps/${state.selectedStepId}/records`, {
        type,
        value,
        enumOptions
      });
      setState(prev => ({ ...prev, records: [...prev.records, record] }));
    } catch (err) {
      console.error('Failed to create record:', err);
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    try {
      await api.delete(`/api/records/${recordId}`);
      setState(prev => ({
        ...prev,
        records: prev.records.filter(r => r.id !== recordId)
      }));
    } catch (err) {
      console.error('Failed to delete record:', err);
    }
  };

  const getProgress = (expId: string) => {
    const expSteps = state.steps.filter(s => s.experimentId === expId);
    if (expSteps.length === 0) return 0;
    const completed = expSteps.filter(s => s.completed).length;
    return Math.round((completed / expSteps.length) * 100);
  };

  const selectedExperiment = state.experiments.find(e => e.id === state.selectedExperimentId);
  const selectedStep = state.steps.find(s => s.id === state.selectedStepId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw' }}>
      <header style={{
        height: '56px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        background: 'var(--color-primary)',
        borderBottom: '1px solid var(--color-border)',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '32px', height: '32px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, var(--color-secondary), #FFD54F)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: '700', color: '#1A1535',
            fontFamily: "'JetBrains Mono', monospace"
          }}>
            L
          </div>
          <h1 style={{ fontSize: '18px', color: 'var(--color-secondary)' }}>LabFlow</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ color: 'var(--color-text-muted)' }}>研究员：李明</span>
          <button style={{
            padding: '6px 16px',
            background: 'var(--color-danger)',
            color: 'white',
            borderRadius: '6px',
            fontSize: '13px'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-danger-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--color-danger)')}>
            退出
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', flex: '1', minHeight: 0 }}>
        <aside style={{
          width: '280px',
          background: 'var(--color-card)',
          borderRight: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0
        }}>
          <div style={{
            padding: '16px',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h2 style={{ fontSize: '14px', color: 'var(--color-text)' }}>实验项目</h2>
            <button onClick={() => setState(prev => ({ ...prev, isCreatingExperiment: true }))}
              style={{
                padding: '6px 12px',
                background: 'var(--color-secondary)',
                color: '#1A1535',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600'
              }}>
              + 新建
            </button>
          </div>
          <ExperimentList
            experiments={state.experiments}
            selectedId={state.selectedExperimentId}
            highlightedId={state.highlightedExperimentId}
            getProgress={getProgress}
            onSelect={(id) => setState(prev => ({ ...prev, selectedExperimentId: id, selectedStepId: null }))}
            onDelete={handleDeleteExperiment}
            onReorder={handleReorderExperiments}
          />
        </aside>

        <main style={{ flex: '1', padding: '16px', overflow: 'auto' }}>
          {state.loading ? (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              height: '100%', color: 'var(--color-text-muted)'
            }}>
              加载中...
            </div>
          ) : !selectedExperiment ? (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column', height: '100%',
              color: 'var(--color-text-muted)', gap: '16px'
            }}>
              <div style={{ fontSize: '48px' }}>🧪</div>
              <p>请选择或创建一个实验项目开始</p>
            </div>
          ) : (
            <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
              <div style={{
                background: 'var(--color-card)',
                borderRadius: '12px',
                padding: '24px',
                marginBottom: '16px',
                animation: 'slideUpIn 0.3s ease-out'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <h2 style={{ fontSize: '20px', color: 'var(--color-secondary)', marginBottom: '8px' }}>
                      {selectedExperiment.name}
                    </h2>
                    <div style={{ display: 'flex', gap: '24px', color: 'var(--color-text-muted)', fontSize: '13px' }}>
                      <span>📅 {selectedExperiment.date}</span>
                      <span>👤 {selectedExperiment.leader}</span>
                    </div>
                    <p style={{ marginTop: '12px', color: 'var(--color-text)' }}>
                      {selectedExperiment.description}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      onClick={() => setState(prev => ({ ...prev, activePanel: prev.activePanel === 'steps' ? 'steps' : 'steps' }))}
                      style={{
                        padding: '8px 16px',
                        background: state.activePanel === 'steps' ? 'var(--color-secondary)' : 'var(--color-card-light)',
                        color: state.activePanel === 'steps' ? '#1A1535' : 'var(--color-text)',
                        borderRadius: '8px',
                        fontWeight: '500'
                      }}>
                      步骤管理
                    </button>
                    <button
                      onClick={() => setState(prev => ({ ...prev, activePanel: selectedStep ? 'records' : 'steps' }))}
                      disabled={!selectedStep}
                      style={{
                        padding: '8px 16px',
                        background: state.activePanel === 'records' ? 'var(--color-secondary)' : 'var(--color-card-light)',
                        color: state.activePanel === 'records' ? '#1A1535' : 'var(--color-text)',
                        borderRadius: '8px',
                        fontWeight: '500',
                        opacity: selectedStep ? 1 : 0.5,
                        cursor: selectedStep ? 'pointer' : 'not-allowed'
                      }}>
                      数据记录
                    </button>
                    <button
                      onClick={() => setState(prev => ({ ...prev, activePanel: 'report' }))}
                      style={{
                        padding: '8px 16px',
                        background: state.activePanel === 'report' ? 'var(--color-secondary)' : 'var(--color-card-light)',
                        color: state.activePanel === 'report' ? '#1A1535' : 'var(--color-text)',
                        borderRadius: '8px',
                        fontWeight: '500'
                      }}>
                      生成报告
                    </button>
                  </div>
                </div>
              </div>

              {state.activePanel === 'steps' && (
                <StepPanel
                  steps={state.steps}
                  selectedStepId={state.selectedStepId}
                  onSelectStep={(id) => setState(prev => ({ ...prev, selectedStepId: id }))}
                  onAddStep={handleAddStep}
                  onUpdateStep={handleUpdateStep}
                  onDeleteStep={handleDeleteStep}
                  onBatchDelete={handleBatchDeleteSteps}
                  onReorderSteps={handleReorderSteps}
                  onUploadAttachment={handleUploadAttachment}
                />
              )}

              {state.activePanel === 'records' && selectedStep && (
                <DataRecord
                  key={selectedStep.id}
                  step={selectedStep}
                  records={state.records}
                  onAddRecord={handleAddRecord}
                  onDeleteRecord={handleDeleteRecord}
                />
              )}

              {state.activePanel === 'report' && (
                <ReportGenerator
                  experiment={selectedExperiment}
                  steps={state.steps}
                  recordsByStep={state.steps.reduce((acc, s) => ({ ...acc, [s.id]: state.records.filter(r => r.stepId === s.id) }), {} as Record<string, DataRecordType[]>)}
                  conclusion={state.conclusion}
                  onConclusionChange={(text) => setState(prev => ({ ...prev, conclusion: text }))}
                />
              )}
            </div>
          )}
        </main>
      </div>

      {state.isCreatingExperiment && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          zIndex: 1000,
          animation: 'fadeIn 0.2s ease-out'
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setState(prev => ({ ...prev, isCreatingExperiment: false }));
          }
        }}>
          <div style={{
            width: '100%',
            maxWidth: '500px',
            background: 'var(--color-card)',
            borderRadius: '16px 16px 0 0',
            padding: '32px',
            marginBottom: 0,
            animation: 'slideUpIn 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 -4px 30px rgba(0, 0, 0, 0.5)'
          }}>
            <h3 style={{
              fontSize: '20px',
              color: 'var(--color-secondary)',
              marginBottom: '24px'
            }}>
              创建新实验项目
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                  项目名称 *
                </label>
                <input
                  type="text"
                  value={newExperiment.name}
                  onChange={(e) => setNewExperiment(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="请输入实验项目名称"
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                    实验日期 *
                  </label>
                  <input
                    type="date"
                    value={newExperiment.date}
                    onChange={(e) => setNewExperiment(prev => ({ ...prev, date: e.target.value }))}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                    负责人 *
                  </label>
                  <input
                    type="text"
                    value={newExperiment.leader}
                    onChange={(e) => setNewExperiment(prev => ({ ...prev, leader: e.target.value }))}
                    placeholder="请输入负责人"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                  项目描述
                </label>
                <textarea
                  value={newExperiment.description}
                  onChange={(e) => setNewExperiment(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="请简要描述实验目的和内容"
                  rows={3}
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button
                  onClick={() => setState(prev => ({ ...prev, isCreatingExperiment: false }))}
                  style={{
                    padding: '10px 24px',
                    background: 'var(--color-card-light)',
                    color: 'var(--color-text)',
                    borderRadius: '8px'
                  }}>
                  取消
                </button>
                <button
                  onClick={handleCreateExperiment}
                  disabled={!newExperiment.name || !newExperiment.leader}
                  style={{
                    padding: '10px 24px',
                    background: 'var(--color-secondary)',
                    color: '#1A1535',
                    borderRadius: '8px',
                    fontWeight: '600',
                    opacity: newExperiment.name && newExperiment.leader ? 1 : 0.5,
                    cursor: newExperiment.name && newExperiment.leader ? 'pointer' : 'not-allowed'
                  }}>
                  创建实验
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
