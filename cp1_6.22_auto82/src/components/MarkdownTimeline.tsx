import React, { useState } from 'react';
import type { Markdown, MarkdownType } from '../../types';

interface MarkdownTimelineProps {
  markdowns: Markdown[];
  onAdd: (data: Omit<Markdown, 'id' | 'createdAt'>) => Promise<void>;
  onUpdate: (id: string, data: Partial<Omit<Markdown, 'id' | 'createdAt'>>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onSeek: (time: number) => void;
  currentTime: number;
  isVideoLoaded: boolean;
}

const formatTime = (seconds: number): string => {
  if (!isFinite(seconds) || seconds < 0) return '00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const typeColors: Record<MarkdownType, string> = {
  quiz: '#e53e3e',
  chapter: '#3182ce',
  note: '#38a169'
};

const typeLabels: Record<MarkdownType, string> = {
  quiz: '弹题',
  chapter: '章节',
  note: '备注'
};

const typeIcons: Record<MarkdownType, string> = {
  quiz: '?',
  chapter: '◆',
  note: '✎'
};

const MarkdownTimeline: React.FC<MarkdownTimelineProps> = ({
  markdowns,
  onAdd,
  onUpdate,
  onDelete,
  onSeek,
  currentTime,
  isVideoLoaded
}) => {
  const [showDialog, setShowDialog] = useState(false);
  const [dialogType, setDialogType] = useState<MarkdownType>('note');
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogQuestion, setDialogQuestion] = useState('');
  const [dialogOptions, setDialogOptions] = useState<string[]>(['', '', '', '']);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const openDialog = () => {
    if (!isVideoLoaded) {
      alert('请先加载视频');
      return;
    }
    setDialogType('note');
    setDialogTitle('');
    setDialogQuestion('');
    setDialogOptions(['', '', '', '']);
    setShowDialog(true);
  };

  const handleAddConfirm = async () => {
    if (!dialogTitle.trim()) {
      alert('请输入标题');
      return;
    }
    if (dialogType === 'quiz' && !dialogQuestion.trim()) {
      alert('请输入问题文本');
      return;
    }
    if (dialogType === 'quiz') {
      const validOptions = dialogOptions.filter((o) => o.trim() !== '');
      if (validOptions.length === 0) {
        alert('请至少输入一个选项');
        return;
      }
    }

    const data: Omit<Markdown, 'id' | 'createdAt'> = {
      type: dialogType,
      title: dialogTitle.trim(),
      timestamp: Math.round(currentTime)
    };

    if (dialogType === 'quiz') {
      data.question = dialogQuestion.trim();
      data.options = dialogOptions
        .filter((o) => o.trim() !== '')
        .map((text, i) => ({ id: `opt_${Date.now()}_${i}`, text: text.trim() }));
    }

    await onAdd(data);
    setShowDialog(false);
  };

  const handleDeleteClick = (id: string) => {
    setConfirmDeleteId(id);
  };

  const handleConfirmDelete = async () => {
    if (confirmDeleteId) {
      await onDelete(confirmDeleteId);
      setConfirmDeleteId(null);
    }
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);
    if (!draggedId) return;

    const draggedIndex = markdowns.findIndex((m) => m.id === draggedId);
    if (draggedIndex === -1 || draggedIndex === targetIndex) {
      setDraggedId(null);
      return;
    }

    const sortedMarkdowns = [...markdowns].sort((a, b) => a.timestamp - b.timestamp);
    let newTimestamp: number;

    if (targetIndex === 0) {
      newTimestamp = Math.max(0, sortedMarkdowns[0].timestamp - 5);
    } else if (targetIndex >= sortedMarkdowns.length - 1) {
      newTimestamp = sortedMarkdowns[sortedMarkdowns.length - 1].timestamp + 5;
    } else {
      const prev = sortedMarkdowns[targetIndex - 1];
      const next = sortedMarkdowns[targetIndex];
      newTimestamp = Math.round((prev.timestamp + next.timestamp) / 2);
    }

    await onUpdate(draggedId, { timestamp: newTimestamp });
    setDraggedId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverIndex(null);
  };

  const sortedMarkdowns = [...markdowns].sort((a, b) => a.timestamp - b.timestamp);

  return (
    <div className="timeline-panel">
      <div className="timeline-header">
        <h2 className="timeline-title">标记列表 ({sortedMarkdowns.length})</h2>
        <button
          className="add-marker-btn"
          onClick={openDialog}
          disabled={!isVideoLoaded}
        >
          + 添加标记
        </button>
      </div>

      <div className="timeline-current-time">
        当前位置：<span className="current-time-value">{formatTime(currentTime)}</span>
      </div>

      <div className="timeline-legend">
        <span className="legend-item">
          <span className="legend-dot" style={{ backgroundColor: typeColors.quiz }} />
          弹题
        </span>
        <span className="legend-item">
          <span className="legend-dot" style={{ backgroundColor: typeColors.chapter }} />
          章节
        </span>
        <span className="legend-item">
          <span className="legend-dot" style={{ backgroundColor: typeColors.note }} />
          备注
        </span>
      </div>

      <div className="timeline-list">
        {sortedMarkdowns.length === 0 ? (
          <div className="empty-timeline">
            暂无标记，点击"添加标记"按钮创建
          </div>
        ) : (
          sortedMarkdowns.map((md, index) => (
            <div
              key={md.id}
              className={`timeline-item ${draggedId === md.id ? 'dragging' : ''} ${dragOverIndex === index ? 'drag-over' : ''}`}
              draggable
              onDragStart={(e) => handleDragStart(e, md.id)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              onClick={() => onSeek(md.timestamp)}
            >
              <div
                className="item-type-badge"
                style={{ backgroundColor: typeColors[md.type] }}
              >
                {typeIcons[md.type]}
              </div>
              <div className="item-content">
                <div className="item-header-row">
                  <span className="item-type-label" style={{ color: typeColors[md.type] }}>
                    {typeLabels[md.type]}
                  </span>
                  <span className="item-timestamp">{formatTime(md.timestamp)}</span>
                </div>
                <div className="item-title" title={md.title}>
                  {md.title}
                </div>
                {md.type === 'quiz' && md.question && (
                  <div className="item-question">Q: {md.question}</div>
                )}
              </div>
              <button
                className="delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteClick(md.id);
                }}
                title="删除"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>

      {showDialog && (
        <div className="modal-overlay" onClick={() => setShowDialog(false)}>
          <div className="modal-dialog add-dialog" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">添加新标记</h3>

            <div className="form-group">
              <label>标记类型</label>
              <div className="type-selector">
                {(Object.keys(typeLabels) as MarkdownType[]).map((t) => (
                  <button
                    key={t}
                    className={`type-btn ${dialogType === t ? 'active' : ''}`}
                    style={{
                      borderColor: typeColors[t],
                      backgroundColor: dialogType === t ? typeColors[t] : 'transparent',
                      color: dialogType === t ? '#fff' : typeColors[t]
                    }}
                    onClick={() => setDialogType(t)}
                    type="button"
                  >
                    <span className="type-icon">{typeIcons[t]}</span>
                    {typeLabels[t]}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>标题 *</label>
              <input
                type="text"
                className="form-input"
                value={dialogTitle}
                onChange={(e) => setDialogTitle(e.target.value)}
                placeholder="输入标记标题"
                maxLength={50}
              />
            </div>

            {dialogType === 'quiz' && (
              <>
                <div className="form-group">
                  <label>问题文本 *</label>
                  <textarea
                    className="form-input form-textarea"
                    value={dialogQuestion}
                    onChange={(e) => setDialogQuestion(e.target.value)}
                    placeholder="输入题目内容"
                    rows={2}
                    maxLength={200}
                  />
                </div>
                <div className="form-group">
                  <label>选项（至少1个，最多4个）</label>
                  {dialogOptions.map((opt, i) => (
                    <input
                      key={i}
                      type="text"
                      className="form-input option-input"
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...dialogOptions];
                        newOpts[i] = e.target.value;
                        setDialogOptions(newOpts);
                      }}
                      placeholder={`选项 ${i + 1}`}
                      maxLength={100}
                    />
                  ))}
                </div>
              </>
            )}

            <div className="form-group">
              <label>时间位置</label>
              <div className="timestamp-preview">{formatTime(currentTime)}</div>
            </div>

            <div className="modal-actions">
              <button
                className="btn-secondary"
                type="button"
                onClick={() => setShowDialog(false)}
              >
                取消
              </button>
              <button
                className="btn-primary"
                type="button"
                onClick={handleAddConfirm}
              >
                确认添加
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteId && (
        <div className="modal-overlay" onClick={() => setConfirmDeleteId(null)}>
          <div className="modal-dialog confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title confirm-title">确认删除</h3>
            <p className="confirm-text">确定要删除这个标记吗？此操作不可撤销。</p>
            <div className="modal-actions">
              <button
                className="btn-secondary"
                type="button"
                onClick={() => setConfirmDeleteId(null)}
              >
                取消
              </button>
              <button
                className="btn-danger"
                type="button"
                onClick={handleConfirmDelete}
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarkdownTimeline;
