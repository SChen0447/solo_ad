import React, { useState } from 'react';
import type { Experiment, Step, DataRecord } from '../../types';

interface ReportGeneratorProps {
  experiment: Experiment;
  steps: Step[];
  recordsByStep: Record<string, DataRecord[]>;
  conclusion: string;
  onConclusionChange: (text: string) => void;
}

function DNASpinner() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '20px',
      padding: '60px 20px'
    }}>
      <svg width="120" height="120" viewBox="0 0 120 120" style={{ animation: 'dnaRotate 1.5s linear infinite' }}>
        <defs>
          <linearGradient id="dnaGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FFB300" />
            <stop offset="100%" stopColor="#FFD54F" />
          </linearGradient>
          <linearGradient id="dnaGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7C4DFF" />
            <stop offset="100%" stopColor="#B388FF" />
          </linearGradient>
        </defs>

        <path
          d="M30,10 Q60,30 30,50 Q0,70 30,90 Q60,110 30,110"
          fill="none"
          stroke="url(#dnaGrad1)"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d="M90,10 Q60,30 90,50 Q120,70 90,90 Q60,110 90,110"
          fill="none"
          stroke="url(#dnaGrad2)"
          strokeWidth="4"
          strokeLinecap="round"
        />

        {[20, 35, 50, 65, 80, 95].map((y, i) => {
          const offset = Math.sin((i / 6) * Math.PI * 2) * 15;
          return (
            <line
              key={i}
              x1={30 + offset}
              y1={y}
              x2={90 - offset}
              y2={y}
              stroke={i % 2 === 0 ? '#FFB300' : '#7C4DFF'}
              strokeWidth="3"
              strokeLinecap="round"
            />
          );
        })}

        {[20, 35, 50, 65, 80, 95].map((y, i) => {
          const offset = Math.sin((i / 6) * Math.PI * 2) * 15;
          return (
            <React.Fragment key={`c-${i}`}>
              <circle cx={30 + offset} cy={y} r="6" fill={i % 2 === 0 ? '#FFB300' : '#7C4DFF'} />
              <circle cx={90 - offset} cy={y} r="6" fill={i % 2 === 0 ? '#7C4DFF' : '#FFB300'} />
            </React.Fragment>
          );
        })}
      </svg>
      <div style={{
        color: 'var(--color-secondary)',
        fontSize: '16px',
        fontWeight: '600',
        fontFamily: "'JetBrains Mono', monospace"
      }}>
        正在生成报告...
      </div>
    </div>
  );
}

export default function ReportGenerator({
  experiment,
  steps,
  conclusion,
  onConclusionChange
}: ReportGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    setGeneratedHtml(null);

    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      const res = await fetch(`/api/experiments/${experiment.id}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conclusion })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.open();
        newWindow.document.write(data.html);
        newWindow.document.close();
        setGeneratedHtml(data.html);
      }
    } catch (err) {
      console.error('Failed to generate report:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportPDF = () => {
    window.print();
  };

  const allNumericRecords = Object.values(steps).flatMap(s => 
    (s.id && steps.find(st => st.id === s.id)) 
      ? Object.values(steps).flatMap(step => 
          step.id ? (Object.values(steps).flatMap(ss => 
            ss.id ? [] : []
          )) : []
        )
      : []
  );

  const allRecords = steps.flatMap(s => s.id ? [] : []);

  return (
    <div style={{
      background: 'var(--color-card)',
      borderRadius: '12px',
      padding: '24px',
      animation: 'slideUpIn 0.3s ease-out'
    }}>
      <h3 style={{ fontSize: '16px', color: 'var(--color-secondary)', marginBottom: '8px' }}>
        📄 实验报告生成
      </h3>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', marginBottom: '24px' }}>
        系统将自动收集当前实验项目的所有步骤和数据记录，生成一份结构化的实验报告
      </p>

      {isGenerating ? (
        <DNASpinner />
      ) : (
        <>
          <div style={{
            background: 'var(--color-card-light)',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '20px'
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '16px',
              marginBottom: '20px'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: '24px',
                  fontWeight: '700',
                  color: 'var(--color-secondary)',
                  fontFamily: "'JetBrains Mono', monospace"
                }}>
                  {steps.length}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                  实验步骤
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: '24px',
                  fontWeight: '700',
                  color: '#4CAF50',
                  fontFamily: "'JetBrains Mono', monospace"
                }}>
                  {steps.filter(s => s.completed).length}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                  已完成
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: '24px',
                  fontWeight: '700',
                  color: '#2196F3',
                  fontFamily: "'JetBrains Mono', monospace"
                }}>
                  {steps.reduce((acc, s) => acc + (s.attachments?.length || 0), 0)}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                  附件
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: '24px',
                  fontWeight: '700',
                  color: '#9C27B0',
                  fontFamily: "'JetBrains Mono', monospace"
                }}>
                  {Object.values(steps).flatMap(s => s.id ? [] : []).length}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                  数据记录
                </div>
              </div>
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '13px',
                color: 'var(--color-text-muted)',
                marginBottom: '8px'
              }}>
                实验结论（可选）
              </label>
              <textarea
                value={conclusion}
                onChange={(e) => onConclusionChange(e.target.value)}
                placeholder="请在此处输入实验结论..."
                rows={5}
                style={{
                  width: '100%',
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
              <div style={{
                textAlign: 'right',
                fontSize: '12px',
                color: conclusion.length > 500 ? 'var(--color-danger)' : 'var(--color-text-muted)',
                marginTop: '6px'
              }}>
                {conclusion.length} / 1000 字
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              onClick={handleExportPDF}
              disabled={!generatedHtml}
              style={{
                padding: '10px 24px',
                background: 'var(--color-card-light)',
                color: 'var(--color-text)',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                opacity: generatedHtml ? 1 : 0.5,
                cursor: generatedHtml ? 'pointer' : 'not-allowed'
              }}>
              📤 导出 PDF
            </button>
            <button
              onClick={handleGenerateReport}
              style={{
                padding: '10px 24px',
                background: 'var(--color-secondary)',
                color: '#1A1535',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600'
              }}>
              📄 生成报告
            </button>
          </div>

          {generatedHtml && (
            <div style={{
              marginTop: '20px',
              padding: '16px',
              background: 'rgba(76, 175, 80, 0.1)',
              border: '1px solid var(--color-success)',
              borderRadius: '8px',
              color: 'var(--color-success)',
              fontSize: '13px',
              textAlign: 'center',
              animation: 'fadeIn 0.3s ease-out'
            }}>
              ✅ 报告已生成并在新标签页中打开
            </div>
          )}
        </>
      )}
    </div>
  );
}
