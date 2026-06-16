import { useMemo } from 'react';
import type { RiskClause } from '../types';

interface DocViewerProps {
  content: string;
  risks: RiskClause[];
  selectedRisk: RiskClause | null;
  onRiskClick: (risk: RiskClause) => void;
}

export default function DocViewer({ content, risks, selectedRisk, onRiskClick }: DocViewerProps) {
  const renderContent = useMemo(() => {
    if (!content) return null;

    const sortedRisks = [...risks].sort((a, b) => a.startIndex - b.startIndex);
    const segments: { text: string; risk?: RiskClause }[] = [];
    let lastIndex = 0;

    const overlapRiskIds = new Set<string>();
    for (let i = 0; i < sortedRisks.length; i++) {
      for (let j = i + 1; j < sortedRisks.length; j++) {
        if (sortedRisks[j].startIndex < sortedRisks[i].endIndex) {
          overlapRiskIds.add(sortedRisks[j].id);
        }
      }
    }

    const filteredRisks = sortedRisks.filter(r => !overlapRiskIds.has(r.id));

    for (const risk of filteredRisks) {
      if (risk.startIndex > lastIndex) {
        segments.push({ text: content.substring(lastIndex, risk.startIndex) });
      }
      segments.push({
        text: content.substring(risk.startIndex, risk.endIndex),
        risk
      });
      lastIndex = risk.endIndex;
    }

    if (lastIndex < content.length) {
      segments.push({ text: content.substring(lastIndex) });
    }

    return segments.map((segment, index) => {
      if (!segment.risk) {
        return <span key={index}>{segment.text}</span>;
      }

      const isSelected = selectedRisk?.id === segment.risk.id;
      const severityClass = `risk-highlight risk-${segment.risk.severity}${isSelected ? ' selected' : ''}`;

      return (
        <span
          key={index}
          className={severityClass}
          onClick={() => onRiskClick(segment.risk!)}
          title={`${segment.risk.type} - ${segment.risk.severity}风险`}
        >
          {segment.text}
        </span>
      );
    });
  }, [content, risks, selectedRisk, onRiskClick]);

  const riskStats = useMemo(() => {
    const high = risks.filter(r => r.severity === 'high').length;
    const medium = risks.filter(r => r.severity === 'medium').length;
    const low = risks.filter(r => r.severity === 'low').length;
    return { high, medium, low, total: risks.length };
  }, [risks]);

  return (
    <div className="doc-viewer">
      <div className="doc-header">
        <div className="doc-title">
          <h2>合同原文</h2>
          <div className="risk-summary">
            <span className="risk-count high">
              <span className="dot" /> 高风险 {riskStats.high}
            </span>
            <span className="risk-count medium">
              <span className="dot" /> 中风险 {riskStats.medium}
            </span>
            <span className="risk-count low">
              <span className="dot" /> 低风险 {riskStats.low}
            </span>
          </div>
        </div>
      </div>
      <div className="doc-content">
        <div className="doc-text">
          {renderContent}
        </div>
      </div>

      <style>{`
        .doc-viewer {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: var(--bg-primary);
          margin: 24px;
          border-radius: 12px;
          box-shadow: var(--shadow-sm);
          overflow: hidden;
          background-image:
            linear-gradient(rgba(22, 93, 255, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(22, 93, 255, 0.03) 1px, transparent 1px);
          background-size: 20px 20px;
        }

        .doc-header {
          padding: 20px 24px;
          border-bottom: 1px solid var(--border);
          background: var(--bg-primary);
        }

        .doc-title {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .doc-title h2 {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .risk-summary {
          display: flex;
          gap: 16px;
        }

        .risk-count {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 500;
          padding: 4px 12px;
          border-radius: 12px;
        }

        .risk-count.high {
          background: rgba(245, 63, 63, 0.1);
          color: var(--danger);
        }

        .risk-count.medium {
          background: rgba(255, 125, 0, 0.1);
          color: var(--warning);
        }

        .risk-count.low {
          background: rgba(250, 204, 21, 0.15);
          color: #A38500;
        }

        .risk-count .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
        }

        .doc-content {
          flex: 1;
          overflow-y: auto;
          padding: 0;
        }

        .doc-text {
          padding: 24px 32px;
          font-size: 16px;
          line-height: 1.8;
          color: var(--text-primary);
          white-space: pre-wrap;
          word-break: break-word;
          font-family: 'Noto Serif SC', Georgia, serif;
        }

        .risk-highlight {
          cursor: pointer;
          padding: 2px 4px;
          margin: 0 -2px;
          border-radius: 4px;
          transition: var(--transition);
          position: relative;
        }

        .risk-highlight::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 2px;
          border-radius: 1px;
          transform: scaleX(0.8);
          opacity: 0;
          transition: var(--transition);
        }

        .risk-highlight:hover {
          transform: scale(1.01);
        }

        .risk-highlight:hover::after {
          transform: scaleX(1);
          opacity: 1;
        }

        .risk-high {
          background: var(--risk-high);
        }

        .risk-high::after {
          background: var(--danger);
        }

        .risk-high:hover,
        .risk-high.selected {
          background: rgba(245, 63, 63, 0.4);
        }

        .risk-medium {
          background: var(--risk-medium);
        }

        .risk-medium::after {
          background: var(--warning);
        }

        .risk-medium:hover,
        .risk-medium.selected {
          background: rgba(255, 125, 0, 0.4);
        }

        .risk-low {
          background: var(--risk-low);
        }

        .risk-low::after {
          background: #EAB308;
        }

        .risk-low:hover,
        .risk-low.selected {
          background: rgba(250, 204, 21, 0.5);
        }

        .risk-highlight.selected {
          box-shadow: 0 0 0 2px var(--primary);
        }

        @media (max-width: 1280px) {
          .doc-viewer {
            margin: 16px;
          }

          .doc-text {
            padding: 20px;
            font-size: 15px;
          }
        }
      `}</style>
    </div>
  );
}
