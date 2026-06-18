import React, { useMemo } from 'react';
import { Variant, DiffResult } from './types';
import { computeDiff } from './utils/diff';

interface DiffPanelProps {
  variantA: Variant | null;
  variantB: Variant | null;
  visible: boolean;
}

export const DiffPanel: React.FC<DiffPanelProps> = React.memo(({ variantA, variantB, visible }) => {
  const diffs = useMemo((): DiffResult[] => {
    if (!variantA || !variantB) return [];
    return computeDiff(variantA, variantB);
  }, [variantA, variantB]);

  if (!visible || !variantA || !variantB) {
    return null;
  }

  return (
    <div className="diff-panel">
      <h3 className="diff-title">
        差异对比 ({variantA.name} → {variantB.name})
        <span className="diff-count">{diffs.length} 处变更</span>
      </h3>
      <div className="diff-list">
        {diffs.length === 0 ? (
          <div className="diff-empty">两个版本完全相同，没有差异</div>
        ) : (
          diffs.map((diff, index) => (
            <div
              key={diff.field}
              className={`diff-item diff-${diff.type}`}
              style={{ animationDelay: `${index * 0.2}s` }}
            >
              <div className="diff-field">
                <span className="diff-field-label">{diff.fieldLabel}</span>
              </div>
              <div className="diff-values">
                <div className="diff-old">
                  <span className="diff-arrow">←</span>
                  {typeof diff.oldValue === 'string' && diff.oldValue.startsWith('#') ? (
                    <span className="diff-color">
                      <span
                        className="diff-color-swatch"
                        style={{ backgroundColor: diff.oldValue }}
                      />
                      {diff.oldValue}
                    </span>
                  ) : (
                    String(diff.oldValue)
                  )}
                </div>
                <div className="diff-new">
                  <span className="diff-arrow">→</span>
                  {typeof diff.newValue === 'string' && diff.newValue.startsWith('#') ? (
                    <span className="diff-color">
                      <span
                        className="diff-color-swatch"
                        style={{ backgroundColor: diff.newValue }}
                      />
                      {diff.newValue}
                    </span>
                  ) : (
                    String(diff.newValue)
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
});

DiffPanel.displayName = 'DiffPanel';
