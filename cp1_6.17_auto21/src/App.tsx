import React, { useState, useCallback, useMemo } from 'react';
import {
  Undo2,
  Redo2,
  Save,
  Download,
  History,
  Users,
  Wifi,
  WifiOff,
  Clock,
  FileText,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import Editor from './components/Editor';
import DiffPanel from './components/DiffPanel';
import { useSocket } from './hooks/useSocket';
import { applyDiff, formatConflictMessage } from './utils/mergeStrategy';
import type { HistoryVersion, Snapshot, Op, User } from './types';

function App() {
  const {
    socketState,
    code,
    setCode,
    version,
    users,
    history,
    snapshots,
    conflictMessage,
    emitEdit,
    emitCursor,
    emitUndo,
    emitRedo,
    emitSaveSnapshot,
  } = useSocket();

  const [selectedHistoryVersion, setSelectedHistoryVersion] = useState<number | null>(null);
  const [showDiffPanel, setShowDiffPanel] = useState(false);
  const [snapshotName, setSnapshotName] = useState('');
  const [showSnapshotInput, setShowSnapshotInput] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'warning' | 'error' } | null>(null);
  const [localEditOps, setLocalEditOps] = useState<Op[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'warning' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const handleEdit = useCallback((ops: Op[]) => {
    setLocalEditOps(ops);
    emitEdit(ops);
  }, [emitEdit]);

  const handleCursorChange = useCallback((from: number, to: number) => {
    emitCursor(from, to);
  }, [emitCursor]);

  const handleCodeChange = useCallback((newCode: string) => {
    setCode(newCode);
  }, [setCode]);

  const handleUndo = useCallback(() => {
    emitUndo();
    showToast('已撤销上一步操作', 'success');
  }, [emitUndo, showToast]);

  const handleRedo = useCallback(() => {
    emitRedo();
    showToast('已重做操作', 'success');
  }, [emitRedo, showToast]);

  const handleHistorySelect = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const versionNum = parseInt(e.target.value, 10);
    if (!isNaN(versionNum)) {
      setSelectedHistoryVersion(versionNum);
      setShowDiffPanel(true);
    }
  }, []);

  const selectedVersionData = useMemo<HistoryVersion | undefined>(() => {
    if (selectedHistoryVersion === null) return undefined;
    return history.find((h) => h.version === selectedHistoryVersion);
  }, [selectedHistoryVersion, history]);

  const handleApplyDiff = useCallback(() => {
    if (!selectedVersionData) return;

    const result = applyDiff(code, selectedVersionData.code);
    
    if (result.conflicts.length > 0) {
      showToast(formatConflictMessage(result.conflicts), 'warning');
    } else {
      showToast('已成功应用历史版本差异', 'success');
    }

    emitEdit(result.ops);
    setShowDiffPanel(false);
    setSelectedHistoryVersion(null);
  }, [selectedVersionData, code, emitEdit, showToast]);

  const handleSaveSnapshot = useCallback(() => {
    if (!snapshotName.trim()) {
      showToast('请输入快照名称', 'warning');
      return;
    }
    emitSaveSnapshot(snapshotName.trim(), code);
    setSnapshotName('');
    setShowSnapshotInput(false);
    showToast('快照保存成功', 'success');
  }, [snapshotName, code, emitSaveSnapshot, showToast]);

  const handleRestoreSnapshot = useCallback((snapshot: Snapshot) => {
    const result = applyDiff(code, snapshot.code);
    emitEdit(result.ops);
    showToast(`已恢复快照: ${snapshot.name}`, 'success');
  }, [code, emitEdit, showToast]);

  const handleExportCode = useCallback((exportCode: string, name: string) => {
    const blob = new Blob([exportCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('导出成功', 'success');
  }, [showToast]);

  const formatTime =