import { useEffect, useState } from 'react';
import { useAppStore } from '../store/AppStore';
import { getBuildingById } from '../scene/BuildingFactory';
import {
  analyzeSunlight,
  formatDuration,
  getLongestContinuousShadow,
  formatTime,
} from '../analysis/SunlightAnalyzer';

export function InfoPanel() {
  const { selectedBuildingId, month, day } = useAppStore();
  const building = selectedBuildingId ? getBuildingById(selectedBuildingId) : null;
  const [sunlightResult, setSunlightResult] = useState<any>(null);

  useEffect(() => {
    if (selectedBuildingId) {
      const result = analyzeSunlight(selectedBuildingId, month, day);
      setSunlightResult(result);
    } else {
      setSunlightResult(null);
    }
  }, [selectedBuildingId, month, day]);

  const longestShadow = sunlightResult
    ? getLongestContinuousShadow(sunlightResult.timeline)
    : null;

  const handleResetCamera = () => {
    if ((window as any).resetCamera) {
      (window as any).resetCamera();
    }
  };

  const renderTimeline = () => {
    if (!sunlightResult) return null;

    const segments = sunlightResult.timeline;
    const totalHours = 14;

    return (
      <div style={styles.timelineContainer}>
        <div style={styles.timelineLabels}>
          <span>6:00</span>
          <span>12:00</span>
          <span>20:00</span>
        </div>
        <div style={styles.timelineBar}>
          {segments.map((segment: any, index: number) => {
            const width = (0.25 / totalHours) * 100;
            const left = ((segment.hour - 6) / totalHours) * 100;
            return (
              <div
                key={index}
                style={{
                  ...styles.timelineSegment,
                  left: `${left}%`,
                  width: `${width}%`,
                  background: segment.isSunlit
                    ? 'linear-gradient(to top, #ffb74d, #ffd54f)'
                    : 'linear-gradient(to top, #5c6bc0, #7986cb)',
                }}
              />
            );
          })}
        </div>
        <div style={styles.timelineLegend}>
          <div style={styles.legendItem}>
            <div style={{ ...styles.legendDot, background: '#ffd54f' }} />
            <span>日照</span>
          </div>
          <div style={styles.legendItem}>
            <div style={{ ...styles.legendDot, background: '#7986cb' }} />
            <span>阴影</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={styles.container}>
      <div style={styles.panel}>
        {building ? (
          <>
            <div style={styles.header}>
              <div
                style={{
                  ...styles.colorBlock,
                  backgroundColor: building.color,
                }}
              />
              <div style={styles.buildingName}>{building.name}</div>
            </div>

            <div style={styles.divider} />

            <div style={styles.section}>
              <div style={styles.sectionTitle}>日照分析</div>
              
              <div style={styles.dataRow}>
                <span style={styles.dataLabel}>日照总时长</span>
                <span style={styles.dataValue}>
                  {sunlightResult
                    ? formatDuration(sunlightResult.totalMinutes)
                    : '--'}
                </span>
              </div>

              <div style={styles.dataRow}>
                <span style={styles.dataLabel}>最长连续阴影区域</span>
                <span style={styles.dataValue}>
                  {sunlightResult
                    ? `${sunlightResult.longestShadowArea.toFixed(2)} ㎡`
                    : '--'}
                </span>
              </div>

              {longestShadow && longestShadow.durationMinutes > 0 && (
                <div style={styles.dataRow}>
                  <span style={styles.dataLabel}>最长阴影时段</span>
                  <span style={styles.dataValue}>
                    {formatTime(longestShadow.startHour)} - {formatTime(longestShadow.endHour)}
                  </span>
                </div>
              )}
            </div>

            <div style={styles.divider} />

            <div style={styles.section}>
              <div style={styles.sectionTitle}>全天时间轴</div>
              {renderTimeline()}
            </div>

            <div style={styles.buttonContainer}>
              <button style={styles.resetButton} onClick={handleResetCamera}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                <span>重置视角</span>
              </button>
            </div>
          </>
        ) : (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>🏢</div>
            <div style={styles.emptyText}>点击建筑查看详细分析</div>
            <div style={styles.emptyHint}>
              选择场景中的任意建筑，即可查看其日照时长和阴影分析数据
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    top: '50%',
    right: 20,
    transform: 'translateY(-50%)',
    zIndex: 100,
    width: 300,
    pointerEvents: 'none',
  },
  panel: {
    padding: '24px 20px',
    background: 'rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderRadius: 16,
    border: '1px solid rgba(255, 255, 255, 0.2)',
    pointerEvents: 'auto',
    maxHeight: '80vh',
    overflowY: 'auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  colorBlock: {
    width: 24,
    height: 24,
    borderRadius: 6,
    flexShrink: 0,
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
  },
  buildingName: {
    fontSize: 18,
    fontWeight: 600,
    color: '#ffffff',
  },
  divider: {
    height: 1,
    background: 'rgba(255, 255, 255, 0.15)',
    margin: '16px 0',
  },
  section: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dataRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  dataLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  dataValue: {
    fontSize: 14,
    fontWeight: 700,
    color: '#4fc3f7',
  },
  timelineContainer: {
    marginTop: 8,
  },
  timelineLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 6,
  },
  timelineBar: {
    position: 'relative',
    height: 12,
    borderRadius: 6,
    background: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  timelineSegment: {
    position: 'absolute',
    top: 0,
    height: '100%',
    transition: 'background 0.3s',
  },
  timelineLegend: {
    display: 'flex',
    gap: 16,
    marginTop: 10,
    justifyContent: 'center',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  buttonContainer: {
    marginTop: 20,
    display: 'flex',
    justifyContent: 'center',
  },
  resetButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 24px',
    background: '#2196f3',
    color: '#ffffff',
    border: 'none',
    borderRadius: 50,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
    transition: 'all 0.2s',
    boxShadow: '0 4px 12px rgba(33, 150, 243, 0.4)',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 600,
    color: '#ffffff',
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 1.5,
  },
};
