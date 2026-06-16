import { AlertTriangle, AlertCircle, Info, Scale, Lightbulb, ChevronRight } from 'lucide-react';
import type { RiskClause } from '../types';

interface RiskPanelProps {
  risk: RiskClause | null;
  allRisks: RiskClause[];
  onRiskSelect: (risk: RiskClause) => void;
}

export default function RiskPanel({ risk, allRisks, onRiskSelect }: RiskPanelProps) {
  const getSeverityInfo = (severity: RiskClause['severity']) => {
    switch (severity) {
      case 'high':
        return { label: '高风险', color: 'var(--danger)', bg: 'rgba(245, 63, 63, 0.1)', icon: AlertTriangle };
      case 'medium':
        return { label: '中风险', color: 'var(--warning)', bg: 'rgba(255, 125, 0, 0.1)', icon: AlertCircle };
      case 'low':
        return { label: '低风险', color: '#A38500', bg: 'rgba(250, 204, 21, 0.15)', icon: Info };
    }
  };

  const getTypeLabel = (type: RiskClause['type']) => {
    const labels: Record<string, string> = {
      penalty: '违约金条款',
      termination: '解约权条款',
      disclaimer: '免责条款',
      other: '其他风险'
    };
    return labels[type] || '其他风险';
  };

  const groupedRisks = allRisks.reduce((acc, r) => {
    if (!acc[r.severity]) acc[r.severity] = [];
    acc[r.severity].push(r);
    return acc;
  }, {} as Record<string, RiskClause[]>);

  const severityOrder: ('high' | 'medium' | 'low')[] = ['high', 'medium', 'low'];

  return (
    <div className="risk-panel">
      <div className="risk-panel-header">
        <h3>风险检测结果</h3>
        <span className="risk-total">共 {allRisks.length} 项风险</span>
      </div>

      <div className="risk-list">
        {severityOrder.map(severity => {
          const risks = groupedRisks[severity] || [];
          if (risks.length === 0) return null;
          const info = getSeverityInfo(severity);
          const Icon = info.icon;

          return (
            <div key={severity} className="risk-group">
              <div className="risk-group-header">
                <div className="risk-group-title">
                  <Icon size={16} style={{ color: info.color }} />
                  <span style={{ color: info.color }}>{info.label}</span>
                </div>
                <span className="risk-group-count">{risks.length}项</span>
              </div>
              <div className="risk-group-items">
                {risks.map(r => (
                  <div
                    key={r.id}
                    className={`risk-item ${risk?.id === r.id ? 'active' : ''}`}
                    onClick={() => onRiskSelect(r)}
                  >
                    <span className="risk-item-text">{r.text.substring(0, 50)}{r.text.length > 50 ? '...' : ''}</span>
                    <ChevronRight size={14} className="risk-item-arrow" />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {risk && (
        <div className="risk-detail fade-in">
          <div className="risk-detail-header">
            <div className="risk-detail-title">
              {(() => {
                const info = getSeverityInfo(risk.severity);
                const Icon = info.icon;
                return (
                  <>
                    <div className="risk-badge" style={{ background: info.bg, color: info.color }}>
                      <Icon size={14} />
                      <span>{info.label}</span>
                    </div>
                    <span className="risk-type">{getTypeLabel(risk.type)}</span>
                  </>
                );
              })()}
            </div>
          </div>

          <div className="risk-detail-section">
            <div className="risk-detail-content">
              <h4><AlertCircle size={16} /> 风险描述</h4>
              <p>{risk.description}</p>
            </div>

            <div className="risk-detail-section">
              <h4><Scale size={16} /> 风险原文</h4>
              <div className="risk-original-text">{risk.text}</div>
            </div>

            <div className="risk-detail-section">
              <h4><Lightbulb size={16} /> 修改建议</h4>
              <div className="risk-suggestion">{risk.suggestion}</div>
            </div>

            <div className="risk-detail-section">
              <h4><Info size={16} /> 法律依据</h4>
              <p className="risk-legal">{risk.legalBasis}</p>
            </div>
          </div>
        </div>
      )}

      {!risk && allRisks.length > 0 && (
        <div className="risk-empty">
          <AlertCircle size={32} className="risk-empty-icon" />
          <p>点击左侧高亮条款<br />查看风险详情</p>
        </div>
      )}

      {allRisks.length === 0 && (
        <div className="risk-empty success">
          <Info size={32} className="risk-empty-icon" />
          <p>未检测到明显风险条款</p>
        </div>
      )}

      <style>{`
        .risk-panel {
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
        }

        .risk-panel-header {
          padding: 20px 24px 16px;
          border-bottom: 1px solid var(--border);
        }

        .risk-panel-header h3 {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 4px;
        }

        .risk-total {
          font-size: 12px;
          color: var(--text-tertiary);
        }

        .risk-list {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          border-bottom: 1px solid var(--border);
        }

        .risk-group {
          margin-bottom: 16px;
        }

        .risk-group:last-child {
          margin-bottom: 0;
        }

        .risk-group-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .risk-group-title {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 600;
        }

        .risk-group-count {
          font-size: 12px;
          color: var(--text-tertiary);
          background: var(--bg-secondary);
          padding: 2px 8px;
          border-radius: 10px;
        }

        .risk-group-items {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .risk-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          background: var(--bg-secondary);
          border-radius: 6px;
          cursor: pointer;
          transition: var(--transition);
          border: 1px solid transparent;
        }

        .risk-item:hover {
          background: var(--bg-tertiary);
        }

        .risk-item.active {
          background: rgba(22, 93, 255, 0.08);
          border-color: var(--primary);
        }

        .risk-item-text {
          font-size: 12px;
          color: var(--text-secondary);
          line-height: 1.5;
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .risk-item-arrow {
          color: var(--text-tertiary);
          flex-shrink: 0;
          margin-left: 8px;
        }

        .risk-detail {
          flex: 1;
          overflow-y: auto;
          padding: 20px 24px;
        }

        .risk-detail-header {
          margin-bottom: 20px;
        }

        .risk-detail-title {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .risk-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
        }

        .risk-type {
          font-size: 12px;
          color: var(--text-tertiary);
          padding: 4px 10px;
          background: var(--bg-secondary);
          border-radius: 4px;
        }

        .risk-detail-content {
          margin-bottom: 20px;
        }

        .risk-detail-content h4 {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 12px;
        }

        .risk-detail-content p {
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.7;
        }

        .risk-original-text {
          padding: 12px 16px;
          background: var(--bg-secondary);
          border-radius: 6px;
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.6;
          border-left: 3px solid var(--warning);
        }

        .risk-suggestion {
          padding: 12px 16px;
          background: rgba(0, 180, 42, 0.06);
          border-radius: 6px;
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.6;
          border-left: 3px solid var(--success);
        }

        .risk-legal {
          font-size: 12px;
          color: var(--text-tertiary);
          line-height: 1.7;
          padding: 12px 16px;
          background: var(--bg-secondary);
          border-radius: 6px;
          border-left: 3px solid var(--primary);
        }

        .risk-empty {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 40px 24px;
          text-align: center;
        }

        .risk-empty-icon {
          color: var(--text-tertiary);
          opacity: 0.6;
        }

        .risk-empty p {
          font-size: 13px;
          color: var(--text-tertiary);
          line-height: 1.6;
        }

        .risk-empty.success .risk-empty-icon {
          color: var(--success);
        }
      `}</style>
    </div>
  );
}
