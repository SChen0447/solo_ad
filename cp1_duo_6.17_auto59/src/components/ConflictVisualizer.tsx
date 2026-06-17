import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { Conflict, DomNode, FixProposal } from '../types';
import { RepairGenerator } from '../services/repairGenerator';

interface ConflictVisualizerProps {
  htmlValue: string;
  cssValue: string;
  conflicts: Conflict[];
  selectedConflictId: string | null;
  onSelectConflict: (id: string | null) => void;
  fixProposal: FixProposal | null;
  onCopyFixedCss: (text: string) => void;
}

const ConflictVisualizer: React.FC<ConflictVisualizerProps> = ({
  htmlValue,
  cssValue,
  conflicts,
  selectedConflictId,
  onSelectConflict,
  fixProposal,
  onCopyFixedCss
}) => {
  const [activeTab, setActiveTab] = useState<'tree' | 'fix'>('tree');
  const [copied, setCopied] = useState(false);
  const flashingNodes = useRef<Set<string>>(new Set());
  const [, forceUpdate] = useState({});

  const domTree = useMemo(() => {
    return parseHtmlToTree(htmlValue, conflicts);
  }, [htmlValue, conflicts]);

  useEffect(() => {
    if (selectedConflictId) {
      const conflict = conflicts.find(c => c.id === selectedConflictId);
      if (conflict) {
        const key = conflict.element_key;
        flashingNodes.current.add(key);
        forceUpdate({});

        let count = 0;
        const flashInterval = setInterval(() => {
          count++;
          if (count >= 4) {
            clearInterval(flashInterval);
            flashingNodes.current.delete(key);
            forceUpdate({});
          }
        }, 300);

        setTimeout(() => {
          const el = document.querySelector(`[data-node-key="${key}"]`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 50);
      }
    }
  }, [selectedConflictId, conflicts]);

  const fixedCss = useMemo(() => {
    if (fixProposal) {
      return RepairGenerator.generateFixedCss(cssValue, fixProposal.modifications);
    }
    return '';
  }, [fixProposal, cssValue]);

  const handleCopy = async () => {
    if (fixedCss) {
      await RepairGenerator.copyToClipboard(fixedCss);
      setCopied(true);
      onCopyFixedCss(fixedCss);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="conflict-visualizer">
      <div className="visualizer-tabs">
        <button
          className={`tab-button ${activeTab === 'tree' ? 'active' : ''}`}
          onClick={() => setActiveTab('tree')}
        >
          🌳 DOM树可视化
        </button>
        <button
          className={`tab-button ${activeTab === 'fix' ? 'active' : ''}`}
          onClick={() => setActiveTab('fix')}
        >
          🔧 修复方案
          {conflicts.length > 0 && (
            <span className="conflict-badge">{conflicts.length}</span>
          )}
        </button>
      </div>

      <div className="visualizer-content">
        {activeTab === 'tree' && (
          <div className="dom-tree-panel">
            {conflicts.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">✨</div>
                <p className="empty-title">暂无冲突</p>
                <p className="empty-desc">点击左侧"检测冲突"按钮开始分析</p>
              </div>
            ) : (
              <>
                <div className="conflict-summary">
                  共发现 <strong>{conflicts.length}</strong> 处样式冲突
                </div>
                <div className="dom-tree">
                  {domTree.map((node, idx) => (
                    <DomTreeNode
                      key={idx}
                      node={node}
                      depth={0}
                      selectedConflictId={selectedConflictId}
                      onSelectConflict={onSelectConflict}
                      isFlashing={flashingNodes.current.has(node.elementKey)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'fix' && (
          <div className="fix-panel">
            {!fixProposal || fixProposal.modifications.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🛠️</div>
                <p className="empty-title">暂无修复方案</p>
                <p className="empty-desc">请先检测冲突以生成修复建议</p>
              </div>
            ) : (
              <>
                <div className="fix-header">
                  <span className="fix-title">📋 修复建议列表</span>
                  <button
                    className={`copy-button ${copied ? 'copied' : ''}`}
                    onClick={handleCopy}
                  >
                    {copied ? '✅ 已复制' : '📋 复制修复后的CSS'}
                  </button>
                </div>

                <div className="modifications-list">
                  {fixProposal.modifications.map((mod, idx) => (
                    <div key={idx} className="modification-item">
                      <div className="modification-header">
                        <span className="mod-selector">{mod.selector}</span>
                        <span className="mod-property">{mod.property}</span>
                      </div>
                      <div className="modification-values">
                        <span className="value-old">
                          <span className="del-line">{mod.property}: {mod.old_value};</span>
                        </span>
                        <span className="arrow">→</span>
                        <span className="value-new">
                          {mod.property}: {mod.new_value};
                        </span>
                      </div>
                      <div className="modification-reason">{mod.reason}</div>
                    </div>
                  ))}
                </div>

                <div className="diff-section">
                  <div className="diff-title">📝 Diff 预览</div>
                  <div className="diff-code">
                    {fixProposal.diff_blocks.map((block, idx) => (
                      <div
                        key={idx}
                        className={`diff-line ${block.type}`}
                      >
                        <span className="diff-sign">
                          {block.type === 'deletion' ? '-' : '+'}
                        </span>
                        <span className="diff-selector">{block.selector} {'{'}</span>
                        <span className="diff-content">
                          {block.type === 'deletion' ? (
                            <span className="del-line">
                              {block.property}: {block.value};
                            </span>
                          ) : (
                            <span className="add-line">
                              {block.property}: {block.value};
                            </span>
                          )}
                        </span>
                        <span>{'}'}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {fixedCss && (
                  <div className="fixed-css-section">
                    <div className="fixed-css-title">✅ 修复后的完整CSS</div>
                    <pre className="fixed-css-code">{fixedCss}</pre>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

interface DomTreeNodeProps {
  node: DomNode;
  depth: number;
  selectedConflictId: string | null;
  onSelectConflict: (id: string | null) => void;
  isFlashing: boolean;
}

const DomTreeNode: React.FC<DomTreeNodeProps> = ({
  node,
  depth,
  selectedConflictId,
  onSelectConflict,
  isFlashing
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const hasConflicts = node.conflicts.length > 0;

  return (
    <div className="dom-tree-node-wrapper" style={{ paddingLeft: depth * 20 }}>
      <div
        className={`dom-tree-node ${hasConflicts ? 'has-conflict' : ''} ${isFlashing ? 'flashing' : ''}`}
        data-node-key={node.elementKey}
      >
        {node.children.length > 0 && (
          <button
            className="expand-button"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        )}
        {node.children.length === 0 && <span className="expand-placeholder" />}

        <span className="node-tag">{'<'}{node.tag}</span>
        {node.id && <span className="node-id">#{node.id}</span>}
        {node.classes.length > 0 && (
          <span className="node-classes">.{node.classes.join('.')}</span>
        )}
        <span className="node-tag">{' />'}</span>

        {hasConflicts && (
          <div className="conflict-tags">
            {node.conflicts.slice(0, 3).map((conflict) => (
              <span
                key={conflict.id}
                className={`conflict-tag ${selectedConflictId === conflict.id ? 'selected' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectConflict(selectedConflictId === conflict.id ? null : conflict.id);
                }}
              >
                ⚠️ {conflict.property}
              </span>
            ))}
            {node.conflicts.length > 3 && (
              <span className="conflict-tag more">
                +{node.conflicts.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {hasConflicts && isExpanded && (
        <div className="conflict-details">
          {node.conflicts.map((conflict) => (
            <div
              key={conflict.id}
              className={`conflict-detail-item ${selectedConflictId === conflict.id ? 'selected' : ''}`}
              onClick={() => onSelectConflict(selectedConflictId === conflict.id ? null : conflict.id)}
            >
              <div className="conflict-property">属性: <strong>{conflict.property}</strong></div>
              <div className="conflict-selectors">
                <div className="selector-row">
                  <span className="selector-label">选择器1:</span>
                  <code className="selector-code">{conflict.selector1}</code>
                  <span className="selector-value">{conflict.value1}</span>
                  <span className="specificity-badge">
                    [{conflict.specificity1.join(',')}]
                  </span>
                </div>
                <div className="selector-row">
                  <span className="selector-label">选择器2:</span>
                  <code className="selector-code">{conflict.selector2}</code>
                  <span className="selector-value">{conflict.value2}</span>
                  <span className="specificity-badge">
                    [{conflict.specificity2.join(',')}]
                  </span>
                </div>
              </div>
              <div className="conflict-winner">
                ✅ 生效: <code>{conflict.winning_selector}</code> → <strong>{conflict.winning_value}</strong>
              </div>
            </div>
          ))}
        </div>
      )}

      {isExpanded && node.children.length > 0 && (
        <div className="node-children">
          {node.children.map((child, idx) => (
            <DomTreeNode
              key={idx}
              node={child}
              depth={depth + 1}
              selectedConflictId={selectedConflictId}
              onSelectConflict={onSelectConflict}
              isFlashing={isFlashing}
            />
          ))}
        </div>
      )}
    </div>
  );
};

function parseHtmlToTree(html: string, conflicts: Conflict[]): DomNode[] {
  const result: DomNode[] = [];
  if (!html) return result;

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const root = doc.body;

    const conflictsByElement = new Map<string, Conflict[]>();
    conflicts.forEach(c => {
      if (!conflictsByElement.has(c.element_key)) {
        conflictsByElement.set(c.element_key, []);
      }
      conflictsByElement.get(c.element_key)!.push(c);
    });

    const convertElement = (el: Element, idx: number): DomNode | null => {
      const tag = el.tagName.toLowerCase();
      if (['script', 'style', 'meta', 'link'].includes(tag)) {
        return null;
      }

      const id = el.id || '';
      const classes = Array.from(el.classList);
      const elementKey = `${tag}${id ? '#' + id : ''}${classes.length ? '.' + classes.join('.') : ''}-${idx}`;

      let matchedConflicts: Conflict[] = [];
      for (const [_key, cList] of conflictsByElement) {
        if (cList.some(c => {
          if (c.element_id && id && c.element_id === id) return true;
          if (c.element_tag === tag && c.element_classes.every(cls => classes.includes(cls))) return true;
          return false;
        })) {
          matchedConflicts = matchedConflicts.concat(cList);
        }
      }

      const children: DomNode[] = [];
      Array.from(el.children).forEach((child, childIdx) => {
        const converted = convertElement(child, childIdx);
        if (converted) children.push(converted);
      });

      return {
        tag,
        id,
        classes,
        children,
        conflicts: matchedConflicts,
        isExpanded: true,
        elementKey
      };
    };

    Array.from(root.children).forEach((child, idx) => {
      const converted = convertElement(child, idx);
      if (converted) result.push(converted);
    });
  } catch (e) {
  }

  return result;
}

export default ConflictVisualizer;
