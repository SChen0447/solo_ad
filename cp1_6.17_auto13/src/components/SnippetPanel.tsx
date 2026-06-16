import { useState } from 'react';
import { Droppable, Draggable, DragDropContext, DropResult } from 'react-beautiful-dnd';
import { Snippet } from '../utils/markdownExporter';

interface SnippetPanelProps {
  snippets: Snippet[];
  onSnippetsReorder: (newSnippets: Snippet[]) => void;
  onSnippetClick: (snippet: Snippet) => void;
  onSnippetDelete: (id: string) => void;
  onAddSnippet: (data: Omit<Snippet, 'id' | 'timestamp'>) => void;
}

export default function SnippetPanel({
  snippets,
  onSnippetsReorder,
  onSnippetClick,
  onSnippetDelete,
  onAddSnippet
}: SnippetPanelProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(snippets);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    onSnippetsReorder(items);
  };

  const handleNativeDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  };

  const handleNativeDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragOver(false);
  };

  const handleNativeDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    try {
      const jsonData = e.dataTransfer.getData('application/json');
      if (jsonData) {
        const data = JSON.parse(jsonData);
        if (data.code && data.startLine && data.endLine) {
          onAddSnippet({
            code: data.code,
            startLine: data.startLine,
            endLine: data.endLine,
            language: data.language || 'javascript'
          });
          return;
        }
      }

      const plainText = e.dataTransfer.getData('text/plain');
      if (plainText) {
        onAddSnippet({
          code: plainText,
          startLine: 0,
          endLine: 0,
          language: 'javascript'
        });
      }
    } catch {
      const plainText = e.dataTransfer.getData('text/plain');
      if (plainText) {
        onAddSnippet({
          code: plainText,
          startLine: 0,
          endLine: 0,
          language: 'javascript'
        });
      }
    }
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const truncateCode = (code: string, maxLength: number = 120) => {
    if (code.length <= maxLength) return code;
    return code.slice(0, maxLength) + '...';
  };

  return (
    <div className="snippet-panel">
      <div
        className={`drop-zone ${isDragOver ? 'drag-over' : ''}`}
        onDragOver={handleNativeDragOver}
        onDragLeave={handleNativeDragLeave}
        onDrop={handleNativeDrop}
      >
        <div className="snippet-header">
          <h3>
            <span className="header-icon">📋</span>
            代码片段
            <span className="snippet-count">{snippets.length}</span>
          </h3>
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="snippets">
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`snippets-list ${snapshot.isDraggingOver ? 'is-dragging-over' : ''}`}
              >
                {snippets.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">📎</div>
                    <p>在左侧选中代码后拖拽到此处</p>
                    <p className="empty-hint">选中文字 → 拖拽 → 释放保存</p>
                  </div>
                ) : (
                  snippets.map((snippet, index) => (
                    <Draggable
                      key={snippet.id}
                      draggableId={snippet.id}
                      index={index}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`snippet-card ${snapshot.isDragging ? 'dragging' : ''}`}
                          onClick={() => onSnippetClick(snippet)}
                        >
                          <div className="snippet-card-header">
                            <span className="snippet-index">#{index + 1}</span>
                            <span className="snippet-meta">
                              {snippet.startLine > 0
                                ? `第 ${snippet.startLine}-${snippet.endLine} 行`
                                : '未指定行'}
                            </span>
                            <span className="snippet-time">
                              {formatTime(snippet.timestamp)}
                            </span>
                            <button
                              className="delete-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSnippetDelete(snippet.id);
                              }}
                              title="删除片段"
                            >
                              ×
                            </button>
                          </div>
                          <pre className="snippet-code">
                            <code>{truncateCode(snippet.code)}</code>
                          </pre>
                        </div>
                      )}
                    </Draggable>
                  ))
                )}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        {isDragOver && (
          <div className="drop-overlay">
            <span className="drop-text">🖱️ 松开鼠标保存片段</span>
          </div>
        )}
      </div>
      <style>{`
        .snippet-panel {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 0;
        }
        .drop-zone {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: #181825;
          border: 2px dashed #45475a;
          border-radius: 8px;
          padding: 16px;
          transition: all 0.3s ease;
          min-height: 0;
          position: relative;
          overflow: hidden;
        }
        .drop-zone.drag-over {
          border-color: #f9c74f;
          background: rgba(249, 199, 79, 0.08);
        }
        .snippet-header {
          margin-bottom: 16px;
          flex-shrink: 0;
        }
        .snippet-header h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #cdd6f4;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .header-icon {
          font-size: 18px;
        }
        .snippet-count {
          background: #313244;
          color: #a6adc8;
          font-size: 12px;
          font-weight: 500;
          padding: 2px 10px;
          border-radius: 12px;
          margin-left: 8px;
        }
        .snippets-list {
          flex: 1;
          overflow-y: auto;
          padding-right: 4px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          animation: fade-in 0.3s ease;
        }
        .snippets-list::-webkit-scrollbar {
          width: 6px;
        }
        .snippets-list::-webkit-scrollbar-track {
          background: transparent;
        }
        .snippets-list::-webkit-scrollbar-thumb {
          background: #45475a;
          border-radius: 3px;
        }
        .empty-state {
          text-align: center;
          padding: 48px 24px;
          color: #6c7086;
        }
        .empty-icon {
          font-size: 48px;
          margin-bottom: 16px;
          opacity: 0.6;
        }
        .empty-state p {
          margin: 0;
          font-size: 14px;
        }
        .empty-hint {
          font-size: 12px !important;
          margin-top: 8px !important;
          opacity: 0.7;
        }
        .snippet-card {
          background: #1e1e2e;
          border: 1px solid #313244;
          border-radius: 8px;
          padding: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
          animation: fade-in 0.3s ease;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }
        .snippet-card:hover {
          border-color: #f9c74f;
          box-shadow: 0 4px 16px rgba(249, 199, 79, 0.15);
          transform: translateY(-1px);
        }
        .snippet-card.dragging {
          opacity: 0.8;
          border-color: #89b4fa;
          box-shadow: 0 8px 24px rgba(137, 180, 250, 0.3);
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .snippet-card-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 10px;
          font-size: 12px;
        }
        .snippet-index {
          background: #f9c74f;
          color: #1e1e2e;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 11px;
        }
        .snippet-meta {
          color: #a6adc8;
          flex: 1;
        }
        .snippet-time {
          color: #6c7086;
          font-variant-numeric: tabular-nums;
        }
        .delete-btn {
          background: transparent;
          border: none;
          color: #6c7086;
          font-size: 20px;
          line-height: 1;
          cursor: pointer;
          padding: 0 4px;
          border-radius: 4px;
          transition: all 0.2s ease;
        }
        .delete-btn:hover {
          background: rgba(243, 139, 168, 0.2);
          color: #f38ba8;
        }
        .snippet-code {
          margin: 0;
          padding: 10px 12px;
          background: #11111b;
          border-radius: 6px;
          font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
          font-size: 12px;
          line-height: 1.6;
          color: #cdd6f4;
          white-space: pre-wrap;
          word-break: break-all;
          max-height: 120px;
          overflow: hidden;
        }
        .snippet-code code {
          background: transparent;
          padding: 0;
        }
        .drop-overlay {
          position: absolute;
          inset: 0;
          background: rgba(249, 199, 79, 0.12);
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          animation: fade-in 0.2s ease;
        }
        .drop-text {
          background: #f9c74f;
          color: #1e1e2e;
          font-weight: 600;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 14px;
          box-shadow: 0 4px 16px rgba(249, 199, 79, 0.4);
        }
      `}</style>
    </div>
  );
}
