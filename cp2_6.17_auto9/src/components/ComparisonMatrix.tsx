import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { Project, TechOption, Dimension, VoteRecord } from '../types';

interface ComparisonMatrixProps {
  project: Project;
  dimensions: Dimension[];
  readOnly?: boolean;
  onUpdateOptions?: (options: TechOption[]) => void;
  onVote?: (optionId: string, vote: 'support' | 'oppose' | 'abstain') => void;
}

const DEFAULT_NOTES: Record<string, string[]> = {
  performance: ['极差', '较差', '一般', '良好', '优秀'],
  learningCurve: ['极陡峭', '较难', '中等', '较易', '极易上手'],
  community: ['几乎无', '较小', '一般', '活跃', '非常活跃'],
  ecosystem: ['不完善', '较匮乏', '一般', '丰富', '极丰富'],
  deployment: ['极复杂', '较复杂', '一般', '较简单', '极简单'],
};

const StarRating = ({
  value,
  onChange,
  disabled,
  onHover,
  hovered,
}: {
  value: number;
  onChange?: (v: number) => void;
  disabled?: boolean;
  onHover?: (v: number | null) => void;
  hovered?: number | null;
}) => {
  const displayValue = hovered !== undefined && hovered !== null ? hovered : value;

  return (
    <div className="star-rating">
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={`star ${i <= displayValue ? 'filled' : ''} ${disabled ? 'disabled' : ''}`}
          style={{ color: i <= displayValue ? '#f59e0b' : '#d1d5db' }}
          onMouseEnter={() => !disabled && onHover?.(i)}
          onMouseLeave={() => !disabled && onHover?.(null)}
          onClick={() => !disabled && onChange?.(i)}
        >
          ★
        </span>
      ))}
    </div>
  );
};

const Tooltip = ({ text, position }: { text: string; position: { x: number; y: number } }) => {
  return (
    <div
      className="tooltip-bubble"
      style={{ left: position.x, top: position.y }}
    >
      {text}
    </div>
  );
};

const OptionCard = ({
  option,
  expanded,
  onToggle,
  onRemove,
  canRemove,
  vote,
  onVote,
  readOnly,
}: {
  option: TechOption;
  expanded: boolean;
  onToggle: () => void;
  onRemove?: () => void;
  canRemove: boolean;
  vote?: VoteRecord['vote'];
  onVote?: (v: 'support' | 'oppose' | 'abstain') => void;
  readOnly?: boolean;
}) => {
  return (
    <div
      className="option-card-list"
      style={{
        background: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}
    >
      <div className="option-card-list-header" onClick={onToggle}>
        <div className="option-list-title">
          <strong>{option.name || '未命名方案'}</strong>
          {option.version && <span className="version-tag">v{option.version}</span>}
        </div>
        <div className="option-list-actions">
          <span className="expand-icon">{expanded ? '▲' : '▼'}</span>
          {!readOnly && canRemove && (
            <button
              className="btn-remove-small"
              onClick={(e) => {
                e.stopPropagation();
                onRemove?.();
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="option-card-list-body">
          {option.tags.length > 0 && (
            <div className="info-section">
              <div className="info-label">适用场景</div>
              <div className="tag-list">
                {option.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="tag-pill"
                    style={{
                      background: '#e0e7ff',
                      color: '#4338ca',
                      borderRadius: '999px',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {option.advantages.length > 0 && (
            <div className="info-section">
              <div className="info-label">优势</div>
              <ul className="info-list adv">
                {option.advantages.map((a, i) => (
                  <li key={i}>✓ {a}</li>
                ))}
              </ul>
            </div>
          )}

          {option.disadvantages.length > 0 && (
            <div className="info-section">
              <div className="info-label">劣势</div>
              <ul className="info-list dis">
                {option.disadvantages.map((d, i) => (
                  <li key={i}>✗ {d}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="vote-section">
            <div className="info-label">投票</div>
            <div className="vote-buttons">
              <button
                className={`vote-btn support ${vote === 'support' ? 'active' : ''}`}
                onClick={() => onVote?.('support')}
              >
                👍 支持
              </button>
              <button
                className={`vote-btn oppose ${vote === 'oppose' ? 'active' : ''}`}
                onClick={() => onVote?.('oppose')}
              >
                👎 反对
              </button>
              <button
                className={`vote-btn abstain ${vote === 'abstain' ? 'active' : ''}`}
                onClick={() => onVote?.('abstain')}
              >
                ➖ 弃权
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function ComparisonMatrix({
  project,
  dimensions,
  readOnly = false,
  onUpdateOptions,
  onVote,
}: ComparisonMatrixProps) {
  const [expandedOptions, setExpandedOptions] = useState<Record<string, boolean>>({});
  const [hoveredStar, setHoveredStar] = useState<Record<string, number | null>>({});
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [options, setOptions] = useState<TechOption[]>(project.options);
  const [editedNote, setEditedNote] = useState<string | null>(null);
  const noteInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const initial: Record<string, boolean> = {};
    project.options.forEach((o) => (initial[o.id] = true));
    setExpandedOptions(initial);
  }, [project.options.length]);

  useEffect(() => {
    setOptions(project.options);
  }, [project.options]);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (editedNote && noteInputRef.current) {
      noteInputRef.current.focus();
    }
  }, [editedNote]);

  const isCompact = windowWidth < 900;
  const isMobile = windowWidth < 768;

  const toggleExpand = useCallback((id: string) => {
    setExpandedOptions((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const handleRatingChange = useCallback(
    (optionIdx: number, dimKey: string, rating: number) => {
      if (readOnly) return;
      setOptions((prev) => {
        const updated = [...prev];
        updated[optionIdx] = {
          ...updated[optionIdx],
          ratings: { ...updated[optionIdx].ratings, [dimKey]: rating },
        };
        return updated;
      });
    },
    [readOnly]
  );

  const handleRatingNoteChange = useCallback(
    (optionIdx: number, dimKey: string, note: string) => {
      if (readOnly) return;
      setOptions((prev) => {
        const updated = [...prev];
        updated[optionIdx] = {
          ...updated[optionIdx],
          ratingNotes: { ...updated[optionIdx].ratingNotes, [dimKey]: note },
        };
        return updated;
      });
    },
    [readOnly]
  );

  const handleSave = useCallback(() => {
    if (!readOnly && onUpdateOptions) {
      onUpdateOptions(options);
    }
  }, [options, onUpdateOptions, readOnly]);

  const handleRemoveOption = useCallback(
    (optionId: string) => {
      if (readOnly || options.length <= 1) return;
      setOptions((prev) => prev.filter((o) => o.id !== optionId));
      const newOptions = options.filter((o) => o.id !== optionId);
      setTimeout(() => onUpdateOptions?.(newOptions), 0);
    },
    [readOnly, options, onUpdateOptions]
  );

  const isDirty = useMemo(() => {
    return JSON.stringify(options) !== JSON.stringify(project.options);
  }, [options, project.options]);

  const voteMap = useMemo(() => {
    const map: Record<string, VoteRecord['vote']> = {};
    project.votes.forEach((v) => (map[v.optionId] = v.vote));
    return map;
  }, [project.votes]);

  const handleTooltipShow = useCallback(
    (e: React.MouseEvent, text: string) => {
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      setTooltip({
        text,
        x: rect.left + rect.width / 2,
        y: rect.top - 8,
      });
    },
    []
  );

  const renderCell = (optionIdx: number, dim: Dimension) => {
    const option = options[optionIdx];
    const rating = option.ratings[dim.key] || 0;
    const note = option.ratingNotes[dim.key] || DEFAULT_NOTES[dim.key]?.[rating - 1] || '';
    const cellKey = `${option.id}-${dim.key}`;
    const isEditingNote = editedNote === cellKey;

    return (
      <div
        className="matrix-cell"
        key={cellKey}
        onMouseEnter={(e) => note && handleTooltipShow(e, note)}
        onMouseLeave={() => setTooltip(null)}
      >
        <StarRating
          value={rating}
          hovered={hoveredStar[cellKey] ?? null}
          disabled={readOnly}
          onHover={(v) => setHoveredStar((prev) => ({ ...prev, [cellKey]: v }))}
          onChange={(v) => handleRatingChange(optionIdx, dim.key, v)}
        />
        {!isEditingNote ? (
          <div
            className="cell-note"
            onClick={() => !readOnly && setEditedNote(cellKey)}
            title={readOnly ? note : '点击编辑说明'}
          >
            {note || <span className="note-placeholder">{readOnly ? '-' : '点击添加说明'}</span>}
          </div>
        ) : (
          <textarea
            ref={noteInputRef}
            className="cell-note-input"
            value={note}
            onChange={(e) => handleRatingNoteChange(optionIdx, dim.key, e.target.value)}
            onBlur={() => setEditedNote(null)}
            rows={2}
            placeholder="输入简要说明..."
          />
        )}
      </div>
    );
  };

  if (isMobile) {
    return (
      <div className="comparison-layout mobile">
        {!readOnly && isDirty && (
          <div className="save-bar">
            <button className="btn-primary ripple" onClick={handleSave}>
              保存更改
            </button>
          </div>
        )}

        {readOnly && (
          <div className="project-header-share">
            <h2>{project.name}</h2>
            <p className="project-desc-share">{project.description}</p>
          </div>
        )}

        <div className="options-list-panel" style={{ background: '#f8fafc' }}>
          {options.map((opt, idx) => (
            <OptionCard
              key={opt.id}
              option={opt}
              expanded={!!expandedOptions[opt.id]}
              onToggle={() => toggleExpand(opt.id)}
              onRemove={() => handleRemoveOption(opt.id)}
              canRemove={options.length > 1}
              vote={voteMap[opt.id]}
              onVote={(v) => onVote?.(opt.id, v)}
              readOnly={readOnly}
            />
          ))}
        </div>

        <div className="matrix-panel-card">
          <div className="matrix-scroll-wrapper">
            <div className="matrix-container" style={{ minWidth: options.length * 200 }}>
              <div className="matrix-header-row">
                <div className="matrix-corner-cell">维度</div>
                {options.map((opt) => (
                  <div key={opt.id} className="matrix-header-cell">
                    {opt.name || '方案'}
                  </div>
                ))}
              </div>
              {dimensions.map((dim) => (
                <div key={dim.key} className="matrix-row">
                  <div className="matrix-label-cell">{dim.label}</div>
                  {options.map((_, idx) => (
                    <div key={`${dim.key}-${idx}`} className="matrix-data-cell">
                      {renderCell(idx, dim)}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {tooltip && <Tooltip text={tooltip.text} position={{ x: tooltip.x, y: tooltip.y }} />}
      </div>
    );
  }

  return (
    <div className={`comparison-layout ${isCompact ? 'compact' : ''}`}>
      {!readOnly && isDirty && (
        <div className="save-bar">
          <button className="btn-primary ripple" onClick={handleSave}>
            保存更改
          </button>
        </div>
      )}

      {readOnly && (
        <div className="project-header-share">
          <h2>{project.name}</h2>
          <p className="project-desc-share">{project.description}</p>
        </div>
      )}

      <div className="left-panel" style={{ width: isCompact ? '100%' : 350, background: '#f8fafc' }}>
        <div className="panel-title">方案列表</div>
        <div className="options-list-panel-inner">
          {options.map((opt, idx) => (
            <OptionCard
              key={opt.id}
              option={opt}
              expanded={!!expandedOptions[opt.id]}
              onToggle={() => toggleExpand(opt.id)}
              onRemove={() => handleRemoveOption(opt.id)}
              canRemove={options.length > 1}
              vote={voteMap[opt.id]}
              onVote={(v) => onVote?.(opt.id, v)}
              readOnly={readOnly}
            />
          ))}
        </div>
      </div>

      <div className="right-panel">
        {isCompact ? (
          <div className="stacked-cards-mode">
            {options.map((opt) => (
              <div
                key={opt.id}
                className="stacked-option-card"
                style={{
                  background: '#ffffff',
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                }}
              >
                <div className="stacked-card-header">
                  <strong>{opt.name || '未命名方案'}</strong>
                  {opt.version && <span className="version-tag">v{opt.version}</span>}
                </div>
                <div className="matrix-scroll-wrapper">
                  <table className="stacked-matrix-table" style={{ minWidth: 600 }}>
                    <thead>
                      <tr>
                        {dimensions.map((d) => (
                          <th key={d.key}>{d.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        {dimensions.map((dim) => {
                          const optIdx = options.findIndex((o) => o.id === opt.id);
                          return (
                            <td key={dim.key}>{renderCell(optIdx, dim)}</td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="matrix-scroll-wrapper">
            <div
              className="matrix-container"
              style={{
                gridTemplateColumns: `140px repeat(${options.length}, minmax(160px, 1fr))`,
              }}
            >
              <div className="matrix-corner-cell">维度 / 方案</div>
              {options.map((opt) => (
                <div key={opt.id} className="matrix-header-cell">
                  <div className="header-cell-title">{opt.name || '未命名方案'}</div>
                  {opt.version && <div className="header-cell-version">v{opt.version}</div>}
                </div>
              ))}

              {dimensions.map((dim) => (
                <>
                  <div key={`label-${dim.key}`} className="matrix-label-cell">
                    {dim.label}
                  </div>
                  {options.map((_, idx) => (
                    <div
                      key={`${dim.key}-cell-${idx}`}
                      className="matrix-data-cell"
                    >
                      {renderCell(idx, dim)}
                    </div>
                  ))}
                </>
              ))}
            </div>
          </div>
        )}
      </div>

      {tooltip && <Tooltip text={tooltip.text} position={{ x: tooltip.x, y: tooltip.y }} />}
    </div>
  );
}
