import React, { useState, useCallback, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import AnnotationEngine from './annotationEngine/AnnotationEngine';
import TemplateManager from './templateManager/TemplateManager';
import type { Annotation, AnnotationType, HistoryEntry } from './types';
import { MAX_HISTORY_STEPS } from './types';

type ToolType = AnnotationType | null;

const ArrowIcon: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="19" x2="19" y2="5" />
    <polyline points="12 5 19 5 19 12" />
  </svg>
);

const RectIcon: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="5" width="18" height="14" rx="2" />
  </svg>
);

const CircleIcon: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="12" rx="9" ry="7" />
  </svg>
);

const UndoIcon: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7v6h6" />
    <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6.7 3L3 13" />
  </svg>
);

const RedoIcon: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 7v6h-6" />
    <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6.7 3L21 13" />
  </svg>
);

const EyeIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const App: React.FC = () => {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [activeTool, setActiveTool] = useState<ToolType>(null);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isNarrowViewport, setIsNarrowViewport] = useState(false);
  const historyLockRef = useRef(false);

  useEffect(() => {
    const checkViewport = () => {
      setIsNarrowViewport(window.innerWidth < 1024);
    };
    checkViewport();
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, []);

  const snapshot = useCallback((): Annotation[] => {
    return JSON.parse(JSON.stringify(annotations));
  }, [annotations]);

  const pushHistory = useCallback((type: HistoryEntry['type'], prev: Annotation[], next: Annotation[]) => {
    if (historyLockRef.current) return;

    const newEntry: HistoryEntry = {
      type,
      previous: { annotations: prev },
      next: { annotations: next },
    };

    setHistory((prevHistory) => {
      const truncated = prevHistory.slice(0, historyIndex + 1);
      const updated = [...truncated, newEntry];
      if (updated.length > MAX_HISTORY_STEPS) {
        return updated.slice(-MAX_HISTORY_STEPS);
      }
      return updated;
    });
    setHistoryIndex((prevIdx) => {
      const baseIdx = prevIdx < 0 ? -1 : prevIdx;
      const newIdx = baseIdx + 1;
      return newIdx >= MAX_HISTORY_STEPS ? MAX_HISTORY_STEPS - 1 : newIdx;
    });
  }, [historyIndex]);

  const handleAnnotationChange = useCallback((newAnnotation: Annotation) => {
    const prev = snapshot();
    const existingIdx = prev.findIndex((a) => a.id === newAnnotation.id);
    let next: Annotation[];
    let actionType: HistoryEntry['type'];

    if (existingIdx >= 0) {
      next = [...prev];
      next[existingIdx] = newAnnotation;
      actionType = 'modify';
    } else {
      next = [...prev, newAnnotation];
      actionType = 'add';
    }

    historyLockRef.current = true;
    setAnnotations(next);
    historyLockRef.current = false;

    pushHistory(actionType, prev, next);
    setActiveTool(null);
  }, [snapshot, pushHistory]);

  const handleDeleteAnnotation = useCallback((annotationId: string) => {
    const prev = snapshot();
    const target = prev.find((a) => a.id === annotationId);
    if (!target) return;

    const next = prev.filter((a) => a.id !== annotationId);
    historyLockRef.current = true;
    setAnnotations(next);
    historyLockRef.current = false;
    pushHistory('delete', prev, next);
    setSelectedAnnotationId(null);
  }, [snapshot, pushHistory]);

  const handleApplyTemplate = useCallback((templateAnnotations: Annotation[]) => {
    const prev = snapshot();
    const next = JSON.parse(JSON.stringify(templateAnnotations));

    historyLockRef.current = true;
    setAnnotations(next);
    historyLockRef.current = false;
    pushHistory('add', prev, next);
  }, [snapshot, pushHistory]);

  const canUndo = historyIndex >= 0 && history.length > 0;
  const canRedo = historyIndex < history.length - 1;

  const handleUndo = useCallback(() => {
    if (!canUndo) return;
    const entry = history[historyIndex];
    if (!entry) return;
    historyLockRef.current = true;
    setAnnotations(entry.previous.annotations);
    historyLockRef.current = false;
    setHistoryIndex((prev) => prev - 1);
  }, [canUndo, history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (!canRedo) return;
    const entry = history[historyIndex + 1];
    if (!entry) return;
    historyLockRef.current = true;
    setAnnotations(entry.next.annotations);
    historyLockRef.current = false;
    setHistoryIndex((prev) => prev + 1);
  }, [canRedo, history, historyIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  const toolbarWidth = isNarrowViewport ? 48 : 60;
  const iconSize = isNarrowViewport ? 20 : 24;

  const tools: { type: AnnotationType; icon: React.ReactNode; label: string }[] = [
    { type: 'arrow', icon: <ArrowIcon size={iconSize} />, label: '箭头' },
    { type: 'rect', icon: <RectIcon size={iconSize} />, label: '矩形' },
    { type: 'circle', icon: <CircleIcon size={iconSize} />, label: '圆圈' },
  ];

  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        backgroundColor: '#1A1A2E',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: toolbarWidth,
          height: '100%',
          backgroundColor: '#16213E',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: isNarrowViewport ? '12px 6px' : '16px 8px',
          gap: isNarrowViewport ? 8 : 12,
          flexShrink: 0,
          borderRight: '1px solid #0F3460',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            width: '100%',
          }}
        >
          <button
            onClick={handleUndo}
            disabled={!canUndo}
            title="撤销 (Ctrl+Z)"
            style={{
              width: isNarrowViewport ? 36 : 44,
              height: isNarrowViewport ? 36 : 44,
              borderRadius: 8,
              border: 'none',
              backgroundColor: 'transparent',
              color: canUndo ? '#FFFFFF' : '#FFFFFF',
              opacity: canUndo ? 1 : 0.4,
              cursor: canUndo ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              if (canUndo) {
                e.currentTarget.style.backgroundColor = '#0F3460';
                e.currentTarget.style.color = '#FF3366';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = canUndo ? '#FFFFFF' : '#FFFFFF';
            }}
          >
            <UndoIcon size={iconSize} />
          </button>
          <button
            onClick={handleRedo}
            disabled={!canRedo}
            title="重做 (Ctrl+Y)"
            style={{
              width: isNarrowViewport ? 36 : 44,
              height: isNarrowViewport ? 36 : 44,
              borderRadius: 8,
              border: 'none',
              backgroundColor: 'transparent',
              color: canRedo ? '#FFFFFF' : '#FFFFFF',
              opacity: canRedo ? 1 : 0.4,
              cursor: canRedo ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              if (canRedo) {
                e.currentTarget.style.backgroundColor = '#0F3460';
                e.currentTarget.style.color = '#FF3366';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = canRedo ? '#FFFFFF' : '#FFFFFF';
            }}
          >
            <RedoIcon size={iconSize} />
          </button>
        </div>

        <div
          style={{
            width: '60%',
            height: 1,
            backgroundColor: '#0F3460',
            margin: `${isNarrowViewport ? 4 : 8}px 0`,
          }}
        />

        {tools.map(({ type, icon, label }) => {
          const isActive = activeTool === type;
          return (
            <button
              key={type}
              onClick={() => setActiveTool(isActive ? null : type)}
              title={label}
              style={{
                width: isNarrowViewport ? 36 : 44,
                height: isNarrowViewport ? 36 : 44,
                borderRadius: 8,
                border: 'none',
                backgroundColor: isActive ? '#0F3460' : 'transparent',
                color: isActive ? '#FF3366' : '#FFFFFF',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = '#0F3460';
                  e.currentTarget.style.color = '#FF3366';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#FFFFFF';
                }
              }}
            >
              {icon}
            </button>
          );
        })}
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            overflow: 'auto',
          }}
        >
          <AnnotationEngine
            annotations={annotations}
            activeTool={activeTool}
            onAnnotationChange={handleAnnotationChange}
            showAnnotations={showAnnotations}
            selectedAnnotationId={selectedAnnotationId}
            onSelectAnnotation={setSelectedAnnotationId}
            onDeleteAnnotation={handleDeleteAnnotation}
          />
        </div>

        <div
          style={{
            padding: '12px 24px 20px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 16,
            flexShrink: 0,
          }}
        >
          <AnimatePresence mode="wait">
            <motion.button
              key={showAnnotations ? 'on' : 'off'}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              onClick={() => setShowAnnotations((prev) => !prev)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 24px',
                borderRadius: 12,
                border: 'none',
                backgroundColor: showAnnotations ? '#FF3366' : '#16213E',
                color: '#FFFFFF',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
                fontFamily: 'system-ui',
                boxShadow: showAnnotations
                  ? '0 4px 16px rgba(255,51,102,0.3)'
                  : '0 2px 8px rgba(0,0,0,0.3)',
                transition: 'all 0.3s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {showAnnotations ? <EyeIcon /> : <EyeOffIcon />}
              <span>{showAnnotations ? '批注视图' : '原始视图'}</span>
            </motion.button>
          </AnimatePresence>

          {annotations.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                backgroundColor: '#16213E',
                color: '#888',
                fontSize: 12,
                fontFamily: 'system-ui',
              }}
            >
              共 {annotations.length} 个批注
            </motion.div>
          )}
        </div>
      </div>

      <TemplateManager
        currentAnnotations={annotations}
        onApplyTemplate={handleApplyTemplate}
      />
    </div>
  );
};

export default App;
