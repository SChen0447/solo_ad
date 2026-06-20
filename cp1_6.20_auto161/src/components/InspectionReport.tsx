import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../utils/api';
import type { InspectionReport as IReport, PartKey, Grade } from '../types';
import { GradeBadge } from './InstrumentCard';

const PART_ORDER: PartKey[] = ['headstock', 'neck', 'body', 'bridge', 'accessories'];

const ScoreBar: React.FC<{ label: string; value: number; color?: string }> = ({ label, value, color = '#8B5E3C' }) => (
  <div style={{ marginBottom: 10 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
      <span style={{ fontSize: 12, color: '#8c7b6a' }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: '#5c554d' }}>{value}分</span>
    </div>
    <div className="progress-bar">
      <motion.div
        className="progress-fill"
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        style={{ background: color }}
      />
    </div>
  </div>
);

interface InspectionReportProps {
  reportId: string | null;
  reportData?: IReport;
  onRegenerate?: (r: IReport) => void;
  canRegenerate?: boolean;
  embedded?: boolean;
}

const InspectionReport: React.FC<InspectionReportProps> = ({ reportId, reportData, onRegenerate, canRegenerate = false, embedded = false }) => {
  const [report, setReport] = useState<IReport | null>(reportData || null);
  const [loading, setLoading] = useState(!reportData);
  const [regenLoading, setRegenLoading] = useState(false);
  const [activePart, setActivePart] = useState<PartKey>('body');

  useEffect(() => {
    if (reportData) {
      setReport(reportData);
      setLoading(false);
    } else if (reportId) {
      fetchReport();
    }
  }, [reportId, reportData]);

  const fetchReport = async () => {
    if (!reportId) return;
    setLoading(true);
    try {
      const r = await api.getReport(reportId);
      setReport(r);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!reportId) return;
    setRegenLoading(true);
    try {
      const r = await api.regenerateReport(reportId);
      setReport(r);
      if (onRegenerate) onRegenerate(r);
    } finally {
      setRegenLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: embedded ? 20 : 40, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div className="loading-spinner" />
        <div style={{ marginTop: 12, fontSize: 14, color: '#8c7b6a' }}>加载验机报告中...</div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📋</div>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>暂无验机报告</div>
        <div style={{ fontSize: 13 }}>请上传乐器照片以生成报告</div>
      </div>
    );
  }

  const grade = report.grade;
  const gradeLabels: Record<Grade, string> = {
    S: '收藏级',
    A: '专业级',
    B: '进阶级',
    C: '入门级',
    D: '建议验货',
  };

  return (
    <div style={{ width: '100%' }}>
      {!embedded && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card"
          style={{ padding: 24, marginBottom: 24, background: `linear-gradient(135deg, ${report.grade_color}15, #ffffff)` }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <GradeBadge grade={grade} size="lg" />
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#2d2a26', marginBottom: 4 }}>
                {report.instrument_type_name} · 验机报告
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <span className="tag" style={{ background: `${report.grade_color}20`, color: report.grade_color, fontWeight: 600 }}>
                  {gradeLabels[grade]}
                </span>
                <span style={{ fontSize: 13, color: '#8c7b6a' }}>
                  报告ID：{report.id}
                </span>
                <span style={{ fontSize: 13, color: '#8c7b6a' }}>
                  生成时间：{new Date(report.generated_at).toLocaleString('zh-CN')}
                </span>
                {report.used && <span className="tag" style={{ background: '#e8e0d6', color: '#8c7b6a' }}>已使用</span>}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 44, fontWeight: 900, color: report.grade_color, lineHeight: 1, letterSpacing: -2 }}>
                {report.overall_score}
              </div>
              <div style={{ fontSize: 12, color: '#8c7b6a', marginTop: 2 }}>综合评分</div>
            </div>
            {canRegenerate && !report.used && (
              <button
                className="wood-btn-outline"
                onClick={handleRegenerate}
                disabled={regenLoading}
                style={{ width: 140, height: 40, fontSize: 13 }}
              >
                {regenLoading ? '生成中...' : '🔄 重新生成'}
              </button>
            )}
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="card"
        style={{ padding: embedded ? 0 : 24, marginBottom: 24 }}
      >
        <div style={{ padding: embedded ? 16 : 0, paddingBottom: embedded ? 0 : undefined }}>
          <div className="section-title" style={{ marginBottom: 16 }}>
            <span>📊</span>
            <span>总体评估</span>
          </div>
          <p style={{ fontSize: 14, color: '#5c554d', lineHeight: 1.8, marginBottom: 20 }}>
            {report.summary}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
            <ScoreBar label="平均清晰度" value={Math.round(avg(PART_ORDER.map((k) => report.parts[k].clarity)))} color="#8B5E3C" />
            <ScoreBar label="平均完整性" value={Math.round(avg(PART_ORDER.map((k) => report.parts[k].completeness)))} color="#22C55E" />
            <ScoreBar label="角度标准度" value={Math.round(avg(PART_ORDER.map((k) => report.parts[k].angle_standard)))} color="#3B82F6" />
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="section-title">
          <span>🔍</span>
          <span>各部位检测详情</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 16 }}>
          {PART_ORDER.map((key, i) => {
            const part = report.parts[key];
            const isActive = activePart === key;
            return (
              <motion.button
                key={key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 + i * 0.04 }}
                onClick={() => setActivePart(key)}
                style={{
                  padding: '12px 10px',
                  borderRadius: 12,
                  border: `2px solid ${isActive ? part.score >= 85 ? '#22C55E' : part.score >= 70 ? '#3B82F6' : part.score >= 60 ? '#F97316' : '#EF4444' : 'transparent'}`,
                  background: isActive ? '#fff' : 'rgba(255,255,255,0.7)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: isActive ? '0 4px 16px rgba(0,0,0,0.1)' : '0 1px 4px rgba(0,0,0,0.05)',
                }}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
              >
                <div style={{ fontSize: 24, marginBottom: 4 }}>{partIcon(key)}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#2d2a26', marginBottom: 2 }}>{part.name}</div>
                <div style={{ fontSize: 11, color: '#8c7b6a' }}>{part.angle_label}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: partScoreColor(part.score), marginTop: 4 }}>
                  {part.score}
                </div>
              </motion.button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {report.parts[activePart] && (
            <motion.div
              key={activePart}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="card"
              style={{ padding: 20, overflow: 'hidden' }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 340px) 1fr', gap: 24 }}>
                <div>
                  <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
                    <img
                      src={report.parts[activePart].image}
                      alt={report.parts[activePart].name}
                      style={{ width: '100%', height: 240, objectFit: 'cover', display: 'block' }}
                    />
                    <div style={{ position: 'absolute', bottom: 10, left: 10, background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '4px 10px', borderRadius: 6, fontSize: 12 }}>
                      {report.parts[activePart].name} · {report.parts[activePart].angle_label}
                    </div>
                  </div>
                  <div style={{ fontSize: 14, color: '#5c554d', lineHeight: 1.7 }}>
                    <span style={{ fontWeight: 600 }}>描述：</span>
                    {report.parts[activePart].description}
                  </div>
                </div>
                <div>
                  <ScoreBar label="综合评分" value={report.parts[activePart].score} color={partScoreColor(report.parts[activePart].score)} />
                  <ScoreBar label="清晰度" value={report.parts[activePart].clarity} color="#8B5E3C" />
                  <ScoreBar label="完整性" value={report.parts[activePart].completeness} color="#22C55E" />
                  <ScoreBar label="角度标准" value={report.parts[activePart].angle_standard} color="#3B82F6" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function partIcon(p: PartKey): string {
  const map: Record<PartKey, string> = {
    headstock: '🎯',
    neck: '📏',
    body: '🎸',
    bridge: '🌉',
    accessories: '🎒',
  };
  return map[p];
}

function partScoreColor(s: number): string {
  if (s >= 85) return '#22C55E';
  if (s >= 70) return '#3B82F6';
  if (s >= 60) return '#F97316';
  return '#EF4444';
}

export default InspectionReport;
