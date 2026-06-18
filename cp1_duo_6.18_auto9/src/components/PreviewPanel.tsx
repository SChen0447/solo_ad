import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAppStore } from '../store';
import { TypesetRenderer, RenderConfig } from '../TypesetRenderer';

interface ColumnRenderer {
  id: string;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  renderer: TypesetRenderer | null;
}

export const PreviewPanel: React.FC<{ onExport: () => void }> = ({ onExport }) => {
  const {
    columns,
    typesetParams,
    testText,
    currentFont,
    addColumn,
    removeColumn,
    selectColumn,
    selectedColumnId,
  } = useAppStore();

  const handleAddColumn = useCallback(() => {
    if (columns.length >= 4) {
      return;
    }
    addColumn();
  }, [columns.length, addColumn]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [columnRenderers, setColumnRenderers] = useState<Map<string, ColumnRenderer>>(new Map());
  const [containerWidth, setContainerWidth] = useState(800);
  const [containerHeight, setContainerHeight] = useState(600);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerWidth(rect.width);
        setContainerHeight(rect.height - 60);
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);

    const resizeObserver = new ResizeObserver(updateSize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', updateSize);
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    const newRenderers = new Map<string, ColumnRenderer>();

    columns.forEach((column) => {
      const existing = columnRenderers.get(column.id);
      if (existing) {
        newRenderers.set(column.id, existing);
      } else {
        newRenderers.set(column.id, {
          id: column.id,
          canvasRef: React.createRef<HTMLCanvasElement>(),
          renderer: null,
        });
      }
    });

    columnRenderers.forEach((renderer, id) => {
      if (!columns.find((c) => c.id === id)) {
        renderer.renderer?.destroy();
      }
    });

    setColumnRenderers(newRenderers);
  }, [columns]);

  const renderColumn = useCallback(
    (columnId: string, width: number, height: number) => {
      const columnRenderer = columnRenderers.get(columnId);
      if (!columnRenderer?.canvasRef.current) return;

      const column = columns.find((c) => c.id === columnId);
      if (!column) return;

      const params = typesetParams.find((p) => p.id === column.paramsId);
      if (!params) return;

      if (!columnRenderer.renderer) {
        columnRenderer.renderer = new TypesetRenderer(columnRenderer.canvasRef.current);
      }

      const config: RenderConfig = {
        text: testText,
        params,
        font: currentFont,
        width,
        height,
        padding: 24,
      };

      columnRenderer.renderer.render(config);
    },
    [columns, typesetParams, testText, currentFont, columnRenderers]
  );

  useEffect(() => {
    const columnWidth = (containerWidth - (columns.length - 1) * 2) / columns.length;
    const columnHeight = containerHeight - 40;

    columns.forEach((column) => {
      renderColumn(column.id, columnWidth, columnHeight);
    });
  }, [columns, containerWidth, containerHeight, renderColumn]);

  const columnWidth = columns.length > 0 
    ? (containerWidth - (columns.length - 1) * 2) / columns.length 
    : containerWidth;
  const columnHeight = containerHeight - 40;

  const getColumnConfig = useCallback((): RenderConfig[] => {
    return columns.map((column) => {
      const params = typesetParams.find((p) => p.id === column.paramsId);
      return {
        text: testText,
        params: params!,
        font: currentFont,
        width: columnWidth,
        height: 400,
        padding: 24,
      };
    });
  }, [columns, typesetParams, testText, currentFont, columnWidth]);

  useEffect(() => {
    (window as unknown as { getColumnConfigs: () => RenderConfig[] }).getColumnConfigs = getColumnConfig;
  }, [getColumnConfig]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.title}>预览区域</span>
          <span style={styles.columnCount}>{columns.length}/4 列</span>
        </div>
        <div style={styles.headerActions}>
          <button
            onClick={handleAddColumn}
            disabled={columns.length >= 4}
            style={{
              ...styles.button,
              ...styles.addButton,
              opacity: columns.length >= 4 ? 0.5 : 1,
              cursor: columns.length >= 4 ? 'not-allowed' : 'pointer',
            }}
          >
            + Add Column
          </button>
          <button onClick={onExport} style={{ ...styles.button, ...styles.exportButton }}>
            📥 导出 PNG
          </button>
        </div>
      </div>

      <div ref={containerRef} style={styles.previewContainer}>
        {columns.map((column, index) => {
          const columnRenderer = columnRenderers.get(column.id);
          const isSelected = selectedColumnId === column.id;
          const params = typesetParams.find((p) => p.id === column.paramsId);

          return (
            <div key={column.id} style={styles.columnWrapper}>
              <div
                style={{
                  ...styles.columnHeader,
                  backgroundColor: isSelected ? '#e8f4fd' : 'transparent',
                  borderBottom: isSelected ? '2px solid #4a90d9' : '2px solid transparent',
                }}
                onClick={() => selectColumn(column.id)}
              >
                <span style={styles.columnTitle}>Column {index + 1}</span>
                {params && (
                  <span style={styles.columnParams}>
                    {params.fontSize}px · {params.fontWeight} · {params.lineHeight}lh
                  </span>
                )}
                {columns.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeColumn(column.id);
                    }}
                    style={styles.removeButton}
                  >
                    ×
                  </button>
                )}
              </div>
              <div style={styles.canvasWrapper}>
                <canvas
                  ref={columnRenderer?.canvasRef}
                  style={{
                    ...styles.canvas,
                    width: columnWidth,
                    height: columnHeight,
                  }}
                />
              </div>
              {index < columns.length - 1 && <div style={styles.columnDivider} />}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #f0f0f0',
    flexShrink: 0,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  title: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#333',
  },
  columnCount: {
    fontSize: '12px',
    color: '#999',
    backgroundColor: '#f5f5f5',
    padding: '2px 8px',
    borderRadius: '12px',
  },
  headerActions: {
    display: 'flex',
    gap: '12px',
  },
  button: {
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: 500,
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  addButton: {
    backgroundColor: '#4a90d9',
    color: 'white',
  },
  exportButton: {
    backgroundColor: '#f5a623',
    color: 'white',
  },
  previewContainer: {
    display: 'flex',
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    minHeight: 0,
  },
  columnWrapper: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    position: 'relative',
    minWidth: 0,
  },
  columnHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 16px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    flexShrink: 0,
    gap: '8px',
  },
  columnTitle: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#666',
  },
  columnParams: {
    fontSize: '11px',
    color: '#999',
    flex: 1,
    textAlign: 'right',
    marginRight: '8px',
  },
  removeButton: {
    width: '20px',
    height: '20px',
    border: 'none',
    borderRadius: '50%',
    backgroundColor: 'transparent',
    color: '#999',
    fontSize: '16px',
    lineHeight: 1,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
  canvasWrapper: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 12px 12px 12px',
    minHeight: 0,
  },
  canvas: {
    borderRadius: '8px',
    backgroundColor: 'white',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  },
  columnDivider: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '2px',
    borderRight: '2px dashed #e0e0e0',
    pointerEvents: 'none',
  },
};
