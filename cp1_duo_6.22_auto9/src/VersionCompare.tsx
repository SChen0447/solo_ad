import { useState, useMemo, useCallback, useEffect } from 'react';
import * as Diff from 'diff';
import { RecipeVersion, Ingredient, Step } from './types';

interface Props {
  recipeId: string;
  versions: RecipeVersion[];
  onRestore: (version: RecipeVersion) => void;
  onBack: () => void;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function versionToText(v: RecipeVersion): string {
  const lines: string[] = [];
  lines.push(`# ${v.title}`);
  lines.push('');
  lines.push('## 食材');
  v.ingredients.forEach((ing: Ingredient) => {
    const sub = ing.substitute ? ` (可替代: ${ing.substitute})` : '';
    lines.push(`- ${ing.name}: ${ing.quantity} ${ing.unit}${sub}`);
  });
  lines.push('');
  lines.push('## 步骤');
  v.steps.forEach((s: Step, idx: number) => {
    lines.push(`${idx + 1}. ${s.description}`);
  });
  return lines.join('\n');
}

function renderDiff(textA: string, textB: string, side: 'a' | 'b') {
  const changes = Diff.diffWords(textA, textB);
  return changes.map((part, i) => {
    let className = '';
    if (side === 'a' && part.removed) {
      className = 'diff-remove';
    } else if (side === 'b' && part.added) {
      className = 'diff-add';
    }
    if (side === 'a' && part.added) return null;
    if (side === 'b' && part.removed) return null;
    return (
      <span key={i} className={className}>
        {part.value}
      </span>
    );
  });
}

export default function VersionCompare({ versions, onRestore, onBack }: Props) {
  const [selectedA, setSelectedA] = useState<string | null>(null);
  const [selectedB, setSelectedB] = useState<string | null>(null);
  const [fadeKey, setFadeKey] = useState(0);

  useEffect(() => {
    if (versions.length >= 1 && !selectedB) {
      setSelectedB(versions[0].id);
    }
    if (versions.length >= 2 && !selectedA) {
      setSelectedA(versions[1].id);
    }
  }, [versions, selectedA, selectedB]);

  const handleSelectVersion = useCallback((id: string) => {
    setFadeKey((k) => k + 1);
    setSelectedB((prevB) => {
      if (prevB === id) return prevB;
      setSelectedA((prevA) => {
        if (prevA === id) return prevA;
        return prevB;
      });
      return id;
    });
  }, []);

  const selectAsA = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedA(id);
    setFadeKey((k) => k + 1);
  }, []);

  const selectAsB = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedB(id);
    setFadeKey((k) => k + 1);
  }, []);

  const swap = useCallback(() => {
    setSelectedA((prevA) => {
      setSelectedB((prevB) => {
        setFadeKey((k) => k + 1);
        return prevA;
      });
      return selectedB;
    });
  }, [selectedB]);

  const versionA = useMemo(
    () => versions.find((v) => v.id === selectedA) || null,
    [versions, selectedA]
  );
  const versionB = useMemo(
    () => versions.find((v) => v.id === selectedB) || null,
    [versions, selectedB]
  );

  const textA = versionA ? versionToText(versionA) : '';
  const textB = versionB ? versionToText(versionB) : '';

  return (
    <div className="page-fade">
      <div className="page-header">
        <div>
          <button
            className="btn btn-sm btn-secondary"
            style={{ marginBottom: 12 }}
            onClick={onBack}
          >
            ← 返回列表
          </button>
          <h1 className="page-title">🕒 版本对比</h1>
          <div className="help-text">
            选择两个版本进行对比，点击左侧版本列表选择，或使用 A/B 按钮指定
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {versionA && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => onRestore(versionA)}
            >
              🔄 恢复版本 A
            </button>
          )}
          {versionB && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => onRestore(versionB)}
            >
              🔄 恢复版本 B
            </button>
          )}
          {versionA && versionB && (
            <button className="btn btn-sm btn-secondary" onClick={swap}>
              ⇄ 交换 A/B
            </button>
          )}
        </div>
      </div>

      <div className="version-compare-container">
        <aside className="version-sidebar scrollbar">
          <h3 className="section-title">📜 版本历史</h3>
          {versions.length === 0 ? (
            <div className="diff-empty">
              还没有保存的版本<br />
              在编辑器中保存后会出现在这里
            </div>
          ) : (
            <div className="version-list">
              {versions.map((v, idx) => {
                const isA = v.id === selectedA;
                const isB = v.id === selectedB;
                let cls = 'version-item';
                if (isA && isB) cls += ' selected-both';
                else if (isA) cls += ' selected-a';
                else if (isB) cls += ' selected-b';
                return (
                  <div
                    key={v.id}
                    className={cls}
                    onClick={() => handleSelectVersion(v.id)}
                  >
                    <div className="version-item-title">
                      {v.title || '(无标题)'}
                      {idx === 0 && (
                        <span
                          style={{
                            fontSize: 10,
                            marginLeft: 6,
                            padding: '1px 6px',
                            borderRadius: 4,
                            background: 'var(--color-primary)',
                            color: 'white',
                          }}
                        >
                          最新
                        </span>
                      )}
                      {isA && <span className="version-item-badge badge-a">A</span>}
                      {isB && <span className="version-item-badge badge-b">B</span>}
                    </div>
                    <div className="version-item-meta">{formatDate(v.createdAt)}</div>
                    {v.note && (
                      <div
                        className="version-item-meta"
                        style={{ marginTop: 4, fontStyle: 'italic' }}
                      >
                        📝 {v.note}
                      </div>
                    )}
                    <div
                      style={{
                        display: 'flex',
                        gap: 4,
                        marginTop: 8,
                      }}
                    >
                      <button
                        className={`btn btn-sm ${isA ? 'btn-danger' : 'btn-secondary'}`}
                        style={{ fontSize: 10, padding: '2px 8px' }}
                        onClick={(e) => selectAsA(e, v.id)}
                      >
                        设为 A
                      </button>
                      <button
                        className={`btn btn-sm ${isB ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ fontSize: 10, padding: '2px 8px' }}
                        onClick={(e) => selectAsB(e, v.id)}
                      >
                        设为 B
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </aside>

        <section className="version-main">
          <div className="version-panels" key={fadeKey}>
            <div className="version-panel fade-transition scrollbar">
              <span className="version-panel-label label-a">
                <strong>A</strong> 旧版本
                {versionA ? ` · ${formatDate(versionA.createdAt)}` : ''}
              </span>
              {versionA ? (
                <pre className="diff-content">{renderDiff(textA, textB, 'a')}</pre>
              ) : (
                <div className="diff-empty">
                  请在左侧选择一个版本作为 A
                </div>
              )}
            </div>

            <div className="version-panel fade-transition scrollbar">
              <span className="version-panel-label label-b">
                <strong>B</strong> 新版本
                {versionB ? ` · ${formatDate(versionB.createdAt)}` : ''}
              </span>
              {versionB ? (
                <pre className="diff-content">{renderDiff(textA, textB, 'b')}</pre>
              ) : (
                <div className="diff-empty">
                  请在左侧选择一个版本作为 B
                </div>
              )}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 16,
              justifyContent: 'center',
              fontSize: 12,
              color: 'var(--color-text-muted)',
            }}
          >
            <span>
              <span
                style={{
                  display: 'inline-block',
                  width: 12,
                  height: 12,
                  background: 'rgba(229, 57, 53, 0.15)',
                  border: '1px solid var(--color-danger)',
                  borderRadius: 2,
                  marginRight: 4,
                  verticalAlign: 'middle',
                }}
              ></span>
              删除
            </span>
            <span>
              <span
                style={{
                  display: 'inline-block',
                  width: 12,
                  height: 12,
                  background: 'rgba(76, 175, 80, 0.15)',
                  border: '1px solid var(--color-success)',
                  borderRadius: 2,
                  marginRight: 4,
                  verticalAlign: 'middle',
                }}
              ></span>
              新增
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}
