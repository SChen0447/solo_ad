import React, { useState } from 'react';
import { motion } from 'framer-motion';
import type { PlanBookData, FinanceParams } from '../../types';
import { MARKET_POSITION_CONFIG } from '../../types';
import FinanceCharts from '../financeSimulator/FinanceCharts';
import ExportPDF from '../exportShare/ExportPDF';

interface PlanBookProps {
  data: PlanBookData;
}

const PlanBook: React.FC<PlanBookProps> = ({ data }) => {
  const { projectName, vision, marketPosition, targetUsers, chapters } = data;
  const posConfig = MARKET_POSITION_CONFIG[marketPosition];

  const [financeParams, setFinanceParams] = useState<FinanceParams>(
    data.financeParams || {
      initialInvestment: 100,
      monthlyFixedCost: 50000,
      monthlyGrowthRate: 5,
    }
  );

  const updateParam = <K extends keyof FinanceParams>(key: K, value: FinanceParams[K]) => {
    setFinanceParams(prev => ({ ...prev, [key]: value }));
  };

  const updatedData: PlanBookData = { ...data, financeParams };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div style={styles.header}>
        <h1 style={styles.projectName}>{projectName}</h1>
        <p style={styles.vision}>{vision}</p>
        <div style={styles.metaRow}>
          <span
            style={{
              ...styles.positionBadge,
              color: posConfig.color,
              backgroundColor: posConfig.bg,
            }}
          >
            {marketPosition}
          </span>
          {targetUsers.map(u => (
            <span key={u} style={styles.userTag}>{u}</span>
          ))}
        </div>
      </div>

      <div style={styles.chapters}>
        {chapters.map((ch, idx) => (
          <motion.div
            key={ch.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.08 }}
            style={{
              ...styles.card,
              borderTopColor: posConfig.color,
            }}
          >
            <h3 style={{ ...styles.cardTitle, color: posConfig.color }}>{ch.title}</h3>
            <div style={styles.cardContent}>
              {ch.content.split('\n').map((line, i) => (
                <p key={i} style={styles.paragraph}>{line}</p>
              ))}
            </div>

            {ch.title === '财务预测' && (
              <div style={styles.financeSection}>
                <div style={styles.paramGrid}>
                  <div style={styles.paramItem}>
                    <label style={styles.paramLabel}>
                      初始投资额：<strong>{financeParams.initialInvestment}万</strong>
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={500}
                      step={10}
                      value={financeParams.initialInvestment}
                      onChange={e => updateParam('initialInvestment', Number(e.target.value))}
                      style={styles.slider}
                    />
                    <div style={styles.sliderRange}>
                      <span>0</span><span>500万</span>
                    </div>
                  </div>

                  <div style={styles.paramItem}>
                    <label style={styles.paramLabel}>月固定成本（元）</label>
                    <input
                      type="number"
                      value={financeParams.monthlyFixedCost}
                      onChange={e => updateParam('monthlyFixedCost', Number(e.target.value))}
                      style={styles.numberInput}
                      min={0}
                    />
                  </div>

                  <div style={styles.paramItem}>
                    <label style={styles.paramLabel}>
                      预计月增长率：<strong>{financeParams.monthlyGrowthRate}%</strong>
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={20}
                      step={1}
                      value={financeParams.monthlyGrowthRate}
                      onChange={e => updateParam('monthlyGrowthRate', Number(e.target.value))}
                      style={styles.slider}
                    />
                    <div style={styles.sliderRange}>
                      <span>1%</span><span>20%</span>
                    </div>
                  </div>
                </div>

                <FinanceCharts params={financeParams} />
              </div>
            )}
          </motion.div>
        ))}
      </div>

      <ExportPDF planData={updatedData} />
    </motion.div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  header: {
    textAlign: 'center' as const,
    marginBottom: 32,
  },
  projectName: {
    fontSize: 28,
    fontWeight: 700,
    color: '#1e3a5f',
    marginBottom: 8,
  },
  vision: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  metaRow: {
    display: 'flex',
    justifyContent: 'center',
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  positionBadge: {
    padding: '4px 14px',
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 600,
  },
  userTag: {
    padding: '4px 12px',
    borderRadius: 20,
    fontSize: 12,
    backgroundColor: '#f4f6f9',
    color: '#1e3a5f',
    border: '1px solid #e2e8f0',
  },
  chapters: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 20,
    maxWidth: 600,
    margin: '0 auto',
  },
  card: {
    width: 600,
    maxWidth: '100%',
    margin: '0 auto',
    background: '#f9fafb',
    borderRadius: 12,
    padding: 24,
    borderTop: '4px solid',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    boxSizing: 'border-box' as const,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 12,
  },
  cardContent: {
    lineHeight: 1.8,
  },
  paragraph: {
    margin: '4px 0',
    fontSize: 14,
    color: '#374151',
  },
  financeSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTop: '1px solid #e5e7eb',
  },
  paramGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: 16,
    marginBottom: 24,
  },
  paramItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 6,
  },
  paramLabel: {
    fontSize: 13,
    fontWeight: 500,
    color: '#374151',
  },
  slider: {
    width: '100%',
    accentColor: '#f59e0b',
    cursor: 'pointer',
  },
  sliderRange: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 11,
    color: '#9ca3af',
  },
  numberInput: {
    width: '100%',
    padding: '8px 10px',
    fontSize: 14,
    border: '1.5px solid #d1d5db',
    borderRadius: 6,
    outline: 'none',
    transition: 'border-color 0.3s, box-shadow 0.3s',
    boxSizing: 'border-box' as const,
  },
};

export default PlanBook;
