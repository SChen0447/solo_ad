import React, { useState, useEffect, useCallback } from 'react';
import ExperimentList from './components/ExperimentList';
import StepPanel from './components/StepPanel';
import DataRecord from './components/DataRecord';
import ReportGenerator from './components/ReportGenerator';

export interface ExperimentInfo {
  id: string;
  name: string;
  date: string;
  leader: string;
  description: string;
  createdAt: string;
  progress?: { total: number; completed: number };
}

export interface StepInfo {
  id: string;
  experimentId: string;
  name: string;
  startTime: string;
  endTime: string;
  expectedResult: string;
  actualResult: string;
  attachments: { id: string; filename: string; originalName: string; mimetype: string; path: string }[];
  order: number;
  completed: boolean;
}

export interface RecordInfo {
  id: string;
  stepId: string;
  type: 'numeric' | 'text' | 'boolean' | 'enum';
  label: string;
  value: string;
  enumOptions?: string[];
  recordedAt: string;
}

const globalStyles = `
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes slideInBottom {
    from { opacity: 0; transform: translateY(40px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes highlightFlash {
    0% { background: rgba(255,179,0,0.3); }
    100% { background: transparent; }
  }
  @keyframes pulseGlow {
    0%, 100% { box-shadow: 0 0 4px rgba(255,179,0,0.3); }
    50% { box-shadow: 0 0 12px rgba(255,179,0,0.6); }
  }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: #1A1535; }
  ::-webkit-scrollbar-thumb { background: #4A3F80; border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: #5A4F90; }
  * { box-sizing: border-box; }
`;

export default function App() {
  const [experiments, setExperiments] = useState<ExperimentInfo[]>([]);
  const [selectedExpId, setSelectedExpId] = useState<string | null>(null);
  const [steps, setSteps] = useState<StepInfo[]>([]);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [records, setRecords] = useState<RecordInfo[]>([]);
  const [userName] = useState('研究员');

  const fetchExperiments = useCallback(async () => {
    try {
      const res = await fetch('/api/experiments');
      const data = await res.json();
      setExperiments(data);
    } catch (e) {
      console.error('Failed to fetch experiments', e);
    }
  }, []);

  useEffect(() => { fetchExperiments(); }, [fetchExperiments]);

  const fetchSteps = useCallback(async (expId: string) => {
    try {
      const res = await fetch(`/api/experiments/${expId}/steps`);
      const data = await res.json();
      setSteps(data);
      if (data.length > 0) {
        setSelectedStepId(data[0].id);
      } else {
        setSelectedStepId(null);
      }
    } catch (e) {
      console.error('Failed to fetch steps', e);
    }
  }, []);

  const fetchRecords = useCallback(async (stepId: string) => {
    try {
      const res = await fetch(`/api/steps/${stepId}/records`);
      const data = await res.json();
      setRecords(data);
    } catch (e) {
      console.error('Failed to fetch records', e);
    }
  }, []);

  useEffect(() => {
    if (selectedExpId) {
      fetchSteps(selectedExpId);
    } else {
      setSteps([]);
      setSelectedStepId(null);
    }
  }, [selectedExpId, fetchSteps]);

  useEffect(() => {
    if (selectedStepId) {
      fetchRecords(selectedStepId);
    } else {
      setRecords([]);
    }
  }, [selectedStepId, fetchRecords]);

  const selectedExperiment = experiments.find((e) => e.id === selectedExpId) || null;
  const selectedStep = steps.find((s) => s.id === selectedStepId) || null;

  return (
    <>
      <style>{globalStyles}</style>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <nav style={{
          height: 56,
          background: 'linear-gradient(90deg, #2F2860, #2A2355)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          borderBottom: '1px solid rgba(255,179,0,0.15)',
          flexShrink: 0,
          zIndex: 100,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, #FFB300, #FF8F00)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 700, color: '#1A1535',
            }}>L</div>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#FFB300', letterSpacing: 1 }}>LabFlow</span>
            <span style={{ fontSize: 12, color: '#8884A8', marginLeft: 4 }}>实验流程管理系统</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 13, color: '#B0AAC8' }}>{userName}</span>
            <button style={{
              background: 'transparent', border: '1px solid #E53935', color: '#E53935',
              padding: '4px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#E53935'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#E53935'; }}
            >退出</button>
          </div>
        </nav>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <div style={{
            width: 280, background: '#2F2860', flexShrink: 0,
            overflowY: 'auto', borderRight: '1px solid rgba(255,179,0,0.1)',
          }}>
            <ExperimentList
              experiments={experiments}
              selectedId={selectedExpId}
              onSelect={setSelectedExpId}
              onRefresh={fetchExperiments}
            />
          </div>

          <div style={{
            flex: 1, overflowY: 'auto', padding: 24,
            background: 'linear-gradient(180deg, #1A1535, #2A2355)',
          }}>
            {!selectedExperiment ? (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                height: '60vh', gap: 16, opacity: 0.6,
              }}>
                <div style={{ fontSize: 48, opacity: 0.3 }}>🧪</div>
                <div style={{ fontSize: 18, color: '#8884A8' }}>请选择或创建一个实验项目</div>
              </div>
            ) : (
              <div style={{ animation: 'fadeInUp 0.3s ease-out' }}>
                <div style={{
                  marginBottom: 24, padding: '20px 24px', background: '#2F2860',
                  borderRadius: 12, borderLeft: '3px solid #FFB300',
                }}>
                  <h2 style={{ margin: 0, fontSize: 22, color: '#E0E0E0', fontWeight: 600 }}>{selectedExperiment.name}</h2>
                  <div style={{ marginTop: 8, fontSize: 13, color: '#8884A8', display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                    <span>📅 {selectedExperiment.date}</span>
                    <span>👤 {selectedExperiment.leader}</span>
                    <span>📝 {selectedExperiment.description}</span>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <ReportGenerator experimentId={selectedExperiment.id} experiment={selectedExperiment} />
                  </div>
                </div>

                <StepPanel
                  experimentId={selectedExperiment.id}
                  steps={steps}
                  selectedStepId={selectedStepId}
                  onSelectStep={setSelectedStepId}
                  onStepsChange={() => fetchSteps(selectedExperiment.id)}
                />

                {selectedStep && (
                  <div style={{ marginTop: 16, animation: 'fadeInUp 0.2s ease-out' }}>
                    <DataRecord
                      stepId={selectedStep.id}
                      stepName={selectedStep.name}
                      records={records}
                      onRecordsChange={() => fetchRecords(selectedStep.id)}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
