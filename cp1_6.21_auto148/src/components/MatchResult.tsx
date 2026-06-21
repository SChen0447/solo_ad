import { useState, useEffect } from 'react';
import { MatchResult as MatchResultType, categoryColors } from '../types';

interface MatchResultProps {
  results: MatchResultType[];
  onBarClick: (memberId: number) => void;
}

const barColors = [
  'linear-gradient(180deg, #60a5fa, #3b82f6)',
  'linear-gradient(180deg, #34d399, #10b981)',
  'linear-gradient(180deg, #a78bfa, #8b5cf6)',
  'linear-gradient(180deg, #fbbf24, #f59e0b)',
  'linear-gradient(180deg, #f87171, #ef4444)',
];

function MatchResult({ results, onBarClick }: MatchResultProps) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const getRankBadge = (index: number) => {
    const badges = ['🥇', '🥈', '🥉', '4', '5'];
    return badges[index];
  };

  return (
    <div className="glass-strong" style={styles.container}>
      <div style={styles.chartContainer}>
        <div style={styles.yAxis}>
          {[100, 80, 60, 40, 20, 0].map(mark => (
            <div key={mark} style={styles.yAxisMark}>
              <span style={styles.yAxisLabel}>{mark}%</span>
              <div style={styles.gridLine} />
            </div>
          ))}
        </div>

        <div style={styles.barsContainer}>
          {results.map((result, index) => (
            <div key={result.memberId} style={styles.barColumn}>
              <div style={styles.barWrapper}>
                {result.matchPercentage < 50 && (
                  <div style={styles.warningBadge}>
                    ⚠️
                  </div>
                )}
                <div
                  style={{
                    ...styles.bar,
                    background: barColors[index % barColors.length],
                    height: animated ? `${result.matchPercentage}%` : '0%',
                    opacity: animated ? 1 : 0,
                  }}
                  onClick={() => onBarClick(result.memberId)}
                >
                  <span style={styles.barLabel}>
                    {result.matchPercentage}%
                  </span>
                </div>
              </div>

              <div style={styles.memberInfo}>
                <span style={styles.rankBadge}>{getRankBadge(index)}</span>
                <span style={styles.memberName}>{result.memberName}</span>
                {!result.meetsRequirements && (
                  <span style={styles.notMetBadge}>未达标</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={styles.legend}>
        <div style={styles.legendItem}>
          <div style={{ ...styles.legendColor, background: barColors[0] }} />
          <span>第一名</span>
        </div>
        <div style={styles.legendItem}>
          <div style={{ ...styles.legendColor, background: barColors[1] }} />
          <span>第二名</span>
        </div>
        <div style={styles.legendItem}>
          <div style={{ ...styles.legendColor, background: barColors[2] }} />
          <span>第三名</span>
        </div>
        <div style={styles.legendItem}>
          <div style={{ ...styles.legendColor, background: 'rgba(239, 68, 68, 0.3)', border: '1px dashed #ef4444' }} />
          <span>低于50%</span>
        </div>
      </div>

      <div style={styles.detailsSection}>
        <h3 style={styles.detailsTitle}>详细对比</h3>
        <div style={styles.detailsGrid}>
          {results.map((result, index) => (
            <div
              key={result.memberId}
              style={styles.detailCard}
              onClick={() => onBarClick(result.memberId)}
            >
              <div style={styles.detailCardHeader}>
                <span style={{ ...styles.rankBadge, fontSize: '24px' }}>{getRankBadge(index)}</span>
                <div>
                  <h4 style={styles.detailMemberName}>{result.memberName}</h4>
                  <p style={styles.detailMatchPercent}>
                    匹配度: <span style={{ color: result.matchPercentage >= 50 ? '#34d399' : '#f87171' }}>{result.matchPercentage}%</span>
                  </p>
                </div>
              </div>
              <div style={styles.skillDetails}>
                {result.details.map((detail, i) => (
                  <div key={i} style={styles.skillDetailRow}>
                    <div style={styles.skillDetailName}>
                      <span
                        style={{
                          ...styles.categoryDot,
                          backgroundColor: categoryColors[detail.category]?.bg || '#6b7280',
                        }}
                      />
                      {detail.skillName}
                    </div>
                    <div style={styles.skillDetailValues}>
                      <span style={detail.actual >= detail.required ? styles.valueMet : styles.valueNotMet}>
                        {detail.actual}%
                      </span>
                      <span style={styles.valueSeparator}>/</span>
                      <span style={styles.valueRequired}>{detail.required}%</span>
                      <span style={styles.weightBadge}>权重 {detail.weight}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '32px',
    animation: 'fadeIn 0.5s ease',
  },
  chartContainer: {
    display: 'flex',
    height: '400px',
    marginBottom: '32px',
    position: 'relative',
  },
  yAxis: {
    width: '60px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    paddingRight: '12px',
  },
  yAxisMark: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  yAxisLabel: {
    fontSize: '12px',
    color: '#94a3b8',
    width: '40px',
    textAlign: 'right',
  },
  gridLine: {
    flex: 1,
    height: '1px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    position: 'absolute',
    left: '60px',
    right: '0',
  },
  barsContainer: {
    flex: 1,
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    borderLeft: '1px solid rgba(255, 255, 255, 0.2)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
    paddingLeft: '20px',
    paddingBottom: '60px',
    position: 'relative',
  },
  barColumn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '80px',
  },
  barWrapper: {
    height: '300px',
    display: 'flex',
    alignItems: 'flex-end',
    position: 'relative',
    marginBottom: '16px',
  },
  bar: {
    width: '60px',
    borderRadius: '12px 12px 4px 4px',
    cursor: 'pointer',
    transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingTop: '10px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
    position: 'relative',
  },
  barLabel: {
    color: 'white',
    fontSize: '14px',
    fontWeight: '700',
    textShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
  },
  warningBadge: {
    position: 'absolute',
    top: '-30px',
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: '20px',
    zIndex: 10,
  },
  memberInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  rankBadge: {
    fontSize: '20px',
  },
  memberName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#e2e8f0',
    textAlign: 'center',
  },
  notMetBadge: {
    fontSize: '11px',
    padding: '3px 8px',
    borderRadius: '8px',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    color: '#f87171',
    border: '1px solid rgba(239, 68, 68, 0.3)',
  },
  legend: {
    display: 'flex',
    justifyContent: 'center',
    gap: '24px',
    padding: '16px',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    marginBottom: '32px',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: '#94a3b8',
  },
  legendColor: {
    width: '20px',
    height: '20px',
    borderRadius: '6px',
  },
  detailsSection: {},
  detailsTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: '20px',
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '20px',
  },
  detailCard: {
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '16px',
    padding: '20px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    cursor: 'pointer',
    transition: 'all 0.25s ease',
  },
  detailCardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '16px',
    paddingBottom: '12px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  },
  detailMemberName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: '4px',
  },
  detailMatchPercent: {
    fontSize: '13px',
    color: '#94a3b8',
  },
  skillDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  skillDetailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skillDetailName: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: '#cbd5e1',
  },
  categoryDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  skillDetailValues: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
  },
  valueMet: {
    color: '#34d399',
    fontWeight: '600',
  },
  valueNotMet: {
    color: '#f87171',
    fontWeight: '600',
  },
  valueSeparator: {
    color: '#64748b',
  },
  valueRequired: {
    color: '#94a3b8',
  },
  weightBadge: {
    fontSize: '11px',
    padding: '2px 6px',
    borderRadius: '6px',
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    color: '#93c5fd',
    marginLeft: '4px',
  },
};

export default MatchResult;
