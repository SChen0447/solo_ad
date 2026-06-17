import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CSVLink } from 'react-csv';

interface EditableTableProps {
  data: string[][];
  onCellUpdate: (rowIndex: number, colIndex: number, value: string) => void;
  onAddRow: () => void;
  onDeleteRow: (rowIndex: number) => void;
  isProcessing: boolean;
}

interface EditingCell {
  row: number;
  col: number;
}

export default function EditableTable({
  data,
  onCellUpdate,
  onAddRow,
  onDeleteRow,
  isProcessing
}: EditableTableProps) {
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editValue, setEditValue] = useState('');
  const [exportLoading, setExportLoading] = useState(false);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [triggerDownload, setTriggerDownload] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const csvLinkRef = useRef<any>(null);

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  const startEditing = (row: number, col: number, currentValue: string) => {
    setEditingCell({ row, col });
    setEditValue(currentValue);
  };

  const confirmEditing = () => {
    if (editingCell) {
      onCellUpdate(editingCell.row, editingCell.col, editValue);
      setEditingCell(null);
      setEditValue('');
    }
  };

  const cancelEditing = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      confirmEditing();
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  const handleExportClick = (event: any, done?: () => void) => {
    if (event && event.preventDefault) {
      event.preventDefault();
    }
    if (data.length === 0) {
      if (done) done();
      return;
    }

    setExportLoading(true);
    setCsvData(data);

    setTimeout(() => {
      setExportLoading(false);
      setTriggerDownload(true);
      if (done) done();
    }, 500);
  };

  useEffect(() => {
    if (triggerDownload && csvLinkRef.current) {
      csvLinkRef.current.link.click();
      setTriggerDownload(false);
    }
  }, [triggerDownload]);

  if (data.length === 0) {
    return (
      <div className="right-panel">
        <div className="table-toolbar">
          <h2 style={{ fontSize: '16px', fontWeight: 600, flex: 1 }}>识别结果</h2>
          <motion.button
            className="btn-secondary"
            disabled
            style={{ flex: 0, padding: '10px 20px' }}
          >
            <span>📥</span>
            导出CSV
          </motion.button>
        </div>
        <motion.div
          className="table-wrapper"
          animate={{ opacity: isProcessing ? 0.5 : 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="empty-state">
            <motion.div
              className="empty-state-icon"
              animate={isProcessing ? { y: [0, -10, 0], transition: { repeat: Infinity, duration: 1.5 } } : {}}
            >
              {isProcessing ? '⏳' : '📋'}
            </motion.div>
            <motion.div
              className="empty-state-text"
              key={isProcessing ? 'processing' : 'empty'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {isProcessing ? '正在识别表格数据，请稍候...' : '上传文件后点击"开始识别"查看表格数据'}
            </motion.div>
          </div>
        </motion.div>
      </div>
    );
  }

  const headers = data[0] || [];
  const rows = data.slice(1);

  return (
    <div className="right-panel">
      <div className="table-toolbar">
        <h2 style={{ fontSize: '16px', fontWeight: 600, flex: 1 }}>
          识别结果
          <span style={{
            fontSize: '12px',
            color: '#888',
            marginLeft: '10px',
            fontWeight: 400
          }}>
            共 {rows.length} 行 × {headers.length} 列
          </span>
        </h2>
        <CSVLink
          data={csvData.length > 0 ? csvData : data}
          filename={`表格数据_${new Date().toISOString().slice(0, 10)}.csv`}
          className="btn-primary"
          onClick={handleExportClick}
          ref={csvLinkRef}
          style={{
            flex: 0,
            padding: '10px 20px',
            textDecoration: 'none',
            pointerEvents: exportLoading ? 'none' : 'auto',
            display: 'inline-flex'
          }}
          target="_blank"
        >
          {exportLoading ? (
            <>
              <span className="btn-loading" />
              导出中
            </>
          ) : (
            <>
              <span>📥</span>
              导出CSV
            </>
          )}
        </CSVLink>
      </div>

      <motion.div
        className="table-wrapper"
        key="table-wrapper"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '50px', textAlign: 'center' }}>#</th>
                {headers.map((header, idx) => (
                  <th key={idx}>{header}</th>
                ))}
                <th style={{ width: '80px', textAlign: 'center' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false} mode="popLayout">
                {rows.map((row, rowIndex) => (
                  <motion.tr
                    key={`row-${rowIndex}`}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{
                      opacity: 0,
                      rotateX: 90,
                      transformOrigin: 'center left',
                      transition: { duration: 0.3 }
                    }}
                    transition={{
                      type: 'spring',
                      stiffness: 400,
                      damping: 30,
                      delay: rowIndex * 0.02
                    }}
                  >
                    <td style={{
                      textAlign: 'center',
                      color: '#666',
                      fontWeight: 500,
                      userSelect: 'none'
                    }}>
                      {rowIndex + 1}
                    </td>
                    {row.map((cell, colIndex) => {
                      const isEditing = editingCell?.row === rowIndex + 1 && editingCell?.col === colIndex;
                      return (
                        <td key={colIndex}>
                          {isEditing ? (
                            <div className="table-cell editing">
                              <input
                                ref={inputRef}
                                type="text"
                                className="table-cell-input"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                onBlur={confirmEditing}
                              />
                            </div>
                          ) : (
                            <motion.div
                              className="table-cell"
                              onClick={() => startEditing(rowIndex + 1, colIndex, cell)}
                              whileHover={{ scale: 1.01 }}
                              transition={{ duration: 0.1 }}
                            >
                              {cell || <span style={{ color: '#555' }}>—</span>}
                            </motion.div>
                          )}
                        </td>
                      );
                    })}
                    <td style={{ textAlign: 'center' }}>
                      <motion.button
                        className="row-action-btn row-delete-btn"
                        onClick={() => onDeleteRow(rowIndex + 1)}
                        title="删除行"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        🗑️
                      </motion.button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
        <motion.button
          className="add-row-btn"
          onClick={onAddRow}
          whileHover={{ letterSpacing: '1px' }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.2 }}
        >
          <span>＋</span>
          添加一行
        </motion.button>
      </motion.div>
    </div>
  );
}
