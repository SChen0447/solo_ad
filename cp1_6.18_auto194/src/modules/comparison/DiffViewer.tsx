import React from 'react';
import { useAppStore } from '@/store/useAppStore';
import { ComponentRenderer } from '@/modules/renderer/ComponentRenderer';
import { compareSnapshots } from './SnapshotManager';
import type { ComponentDiff } from '@/types/componentTypes';

export const DiffViewer: React.FC = () => {
  const showDiffViewer = useAppStore((s) => s.showDiffViewer);
  const setShowDiffViewer = useAppStore((s) => s.setShowDiffViewer);
  const diffSnapshotA = useAppStore((s) => s.diffSnapshotA);
  const diffSnapshotB = useAppStore((s) => s.diffSnapshotB);
  const snapshots = useAppStore((s) => s.snapshots);

  const snapshotA = React.useMemo(
    () => snapshots.find((s) => s.id === diffSnapshotA),
    [snapshots, diffSnapshotA]
  );

  const snapshotB = React.useMemo(
    () => snapshots.find((s) => s.id === diffSnapshotB),
    [snapshots, diffSnapshotB]
  );

  const diffs: ComponentDiff[] = React.useMemo(() => {
    if (snapshotA && snapshotB) {
      return compareSnapshots(snapshotA, snapshotB);
    }
    return [];
  }, [snapshotA, snapshotB]);

  if (!showDiffViewer) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        padding: '32px',
        boxSizing: 'border-box',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
        }}
      >
        <h2
          style={{
            margin: 0,
            color: '#ffffff',
            fontSize: '22px',
            fontWeight: 700,
          }}
        >
          快照对比视图
          {diffs.length > 0 && (
            <span
              style={{
                marginLeft: '12px',
                fontSize: '14px',
                fontWeight: 400,
                color: '#ffd700',
              }}
            >
              发现 {diffs.length} 处差异
            </span>
          )}
        </h2>
        <button
          onClick={() => setShowDiffViewer(false)}
          style={{
            padding: '8px 20px',
            backgroundColor: '#3a3a3a',
            color: '#ffffff',
            border: '1px solid #555',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'background-color 0.2s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#4a4a4a')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#3a3a3a')}
        >
          关闭
        </button>
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          gap: '24px',
          justifyContent: 'center',
          alignItems: 'flex-start',
          overflow: 'auto',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div
            style={{
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '3px',
                backgroundColor: 'rgba(255, 0, 0, 0.6)',
                border: '1px dashed #ff6666',
              }}
            />
            <span style={{ color: '#ffffff', fontSize: '14px', fontWeight: 600 }}>
              快照 A: {snapshotA?.name || '未选择'}
            </span>
          </div>
          <div
            style={{
              border: '2px solid #ffd700',
              borderRadius: '8px',
              overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
            }}
          >
            {snapshotA ? (
              <ComponentRenderer
                components={snapshotA.components}
                diffs={diffs}
                diffSide="A"
                containerWidth={960}
                containerHeight={540}
              />
            ) : (
              <div
                style={{
                  width: '960px',
                  height: '540px',
                  backgroundColor: '#2d2d2d',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#666',
                  fontSize: '16px',
                }}
              >
                请在左侧选择快照 A
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div
            style={{
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '3px',
                backgroundColor: 'rgba(0, 255, 0, 0.6)',
                border: '1px dashed #66ff66',
              }}
            />
            <span style={{ color: '#ffffff', fontSize: '14px', fontWeight: 600 }}>
              快照 B: {snapshotB?.name || '未选择'}
            </span>
          </div>
          <div
            style={{
              border: '2px solid #ffd700',
              borderRadius: '8px',
              overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
            }}
          >
            {snapshotB ? (
              <ComponentRenderer
                components={snapshotB.components}
                diffs={diffs}
                diffSide="B"
                containerWidth={960}
                containerHeight={540}
              />
            ) : (
              <div
                style={{
                  width: '960px',
                  height: '540px',
                  backgroundColor: '#2d2d2d',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#666',
                  fontSize: '16px',
                }}
              >
                请在左侧选择快照 B
              </div>
            )}
          </div>
        </div>
      </div>

      {diffs.length > 0 && (
        <div
          style={{
            marginTop: '20px',
            padding: '16px',
            backgroundColor: '#252525',
            border: '1px solid #3a3a3a',
            borderRadius: '8px',
            maxHeight: '150px',
            overflowY: 'auto',
          }}
        >
          <h4
            style={{
              margin: '0 0 12px',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            差异详情
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {diffs.slice(0, 20).map((diff, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  fontSize: '12px',
                  padding: '6px 10px',
                  backgroundColor: '#2a2a2a',
                  borderRadius: '4px',
                }}
              >
                <span style={{ color: '#888', fontFamily: 'monospace' }}>
                  {diff.componentId.slice(0, 8)}
                </span>
                <span
                  style={{
                    color: '#ffd700',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                  }}
                >
                  {diff.componentType}
                </span>
                <span style={{ color: '#666' }}>→</span>
                <span style={{ color: '#ff6b6b' }}>{diff.propName}</span>
                <span style={{ color: '#666' }}>:</span>
                <span style={{ color: '#ff6666' }}>
                  {JSON.stringify(diff.valueA).slice(0, 30)}
                </span>
                <span style={{ color: '#666' }}>→</span>
                <span style={{ color: '#66ff66' }}>
                  {JSON.stringify(diff.valueB).slice(0, 30)}
                </span>
              </div>
            ))}
            {diffs.length > 20 && (
              <div style={{ color: '#888', fontSize: '12px', textAlign: 'center' }}>
                还有 {diffs.length - 20} 处差异...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
