import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Filter,
  ChevronDown,
  ChevronUp,
  Zap,
  Calendar,
  Layers,
  Highlighter,
  X,
  ArrowRight,
} from 'lucide-react';
import { usePipelineStore } from '../stores/pipelineStore';
import { ExecutionRecord, NodeExecutionLog, NodeType } from '../types';

interface ExecutionLogViewerProps {
  isOpen: boolean;
  onClose: () => void;
}

const ExecutionLogViewer: React.FC<ExecutionLogViewerProps> = ({ isOpen, onClose }) => {
  const {
    executions,
    pipelines,
    loadExecutions,
    highlightExecutionPath,
    clearHighlight,
    currentExecutionId,
  } = usePipelineStore();

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterNodeType, setFilterNodeType] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadExecutions();
    }
  }, [isOpen, loadExecutions]);

  const nodeTypes = useMemo(() => {
    const types = new Set<NodeType>();
    executions.forEach(e => {
      e.nodeLogs.forEach(log => types.add(log.nodeType));
    });
    return Array.from(types);
  }, [executions]);

  const filteredExecutions = useMemo(() => {
    return executions.filter(exec => {
      if (filterStatus !== 'all' && exec.status !== filterStatus) return false;
      if (filterNodeType !== 'all') {
        const hasNodeType = exec.nodeLogs.some(log => log.nodeType === filterNodeType);
        if (!hasNodeType) return false;
      }
      if (filterDate) {
        const execDate = new Date(exec.startTime).toISOString().split('T')[0];
        if (execDate !== filterDate) return false;
      }
      return true;
    });
  }, [executions, filterStatus, filterNodeType, filterDate]);

  const formatDuration = (ms?: number) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(date