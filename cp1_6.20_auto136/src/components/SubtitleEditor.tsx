import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface Subtitle {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
}

interface SubtitleEditorProps {
  subtitles: Subtitle[];
  currentTime: number;
  videoDuration: number;
  selectedSubtitleId: string | null;
  onAddSubtitle: (subtitle: Subtitle, showToast?: (msg: string) => void) => void;
  onDeleteSubtitle: (id: string, showToast?: (msg: string) => void) => void;
  onUpdateSubtitle: (id: string, updates: Partial<Subtitle>) => void;
  onSelectSubtitle: (id: string | null) => void;
  showToast: (msg: string) => void;
}

const formatSrtTime = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds - Math.floor(seconds)) * 1000);
  const pad = (n: number, len = 2) => n.toString().padStart(len, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms, 3)}`;
};

const formatTimeShort = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds - Math.floor(seconds)) * 1000);
  const pad = (n: number, len = 2) => n.toString().padStart(len, '0');
  return `${pad(m)}:${pad(s)}.${pad(ms, 3)}`;
};

const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

const lerpColor = (t: number): string => {
  const clamped = Math.max(0, Math.min(1, t));
  const r1 = 124, g1 = 58, b1 = 237;
  const r2 = 79, g2 = 70, b2 = 229;
  const r = Math.round(r1 + (r2 - r1) * clamped);
  const g = Math.round(g1 + (g2 - g1) * clamped);
  const b = Math.round(b1 + (b2 - b1) * clamped);
  return `rgb(${r}, ${g}, ${b})`;
};

const SubtitleEditor = ({
  subtitles,
  currentTime,
  videoDuration,
  selectedSubtitleId,
  onAddSubtitle,
  onDeleteSubtitle,
  onUpdateSubtitle,
  onSelectSubtitle,
  showToast,
}: SubtitleEditorProps) => {
  const [inputText, setInputText] = useState('');
  const trackRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{
    id: string | null;
    startX: number;
    startStartTime: number;
    duration: number;
    rafId: number | null;
  }>({ id: null, startX: 0, startStartTime: 0, duration: 0, rafId: null });

  const selectedSubtitle = useMemo(
    () => subtitles.find((s) => s.id === selectedSubtitleId) || null,
    [subtitles, selectedSubtitleId]
  );

  const sortedSubtitles = useMemo(
    () => [...subtitles].sort((a, b) => a.startTime - b.startTime),
    [subtitles]
  );

  const handleAddSubtitle = useCallback(() => {
    if (videoDuration <= 0) {
      showToast('请先录制视频');
      return;
    }
    const duration = 3;
    const startTime = Math.min(currentTime, Math.max(0, videoDuration - duration));
    const endTime = Math.min(startTime + duration, videoDuration);
    const newSubtitle: Subtitle = {
      id: generateId(),
      startTime,
      endTime,
      text: inputText.trim() || '请输入字幕文本',
    };
    onAddSubtitle(newSubtitle, showToast);
    onSelectSubtitle(newSubtitle.id);
    setInputText('');
  }, [videoDuration, currentTime, inputText, onAddSubtitle, onSelectSubtitle, showToast]);

  const handleExportSrt = useCallback(() => {
    if (subtitles.length === 0) {
      showToast('暂无可导出的字幕');
      return;
    }
    const sorted = [...subtitles].sort((a, b) => a.startTime - b.startTime);
    const lines: string[] = [];
    sorted.forEach((sub, idx) => {
      lines.push((idx + 1).toString());
      lines.push(`${formatSrtTime(sub.startTime)} --> ${formatSrtTime(sub.endTime)}`);
      lines.push(sub.text);
      lines.push('');
    });
    const content = lines.join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subtitles_${Date.now()}.srt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('字幕已导出');
  }, [subtitles, showToast]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (videoDuration <= 0) return;
      const activeEl = document.activeElement;
      const isInputActive =
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement;

      if ((e.key === 'n' || e.key === 'N') && !isInputActive) {
        e.preventDefault();
        handleAddSubtitle();
      }

      if (
        (e.key === 'Delete' || e.key === 'Backspace') &&
        !isInputActive &&
        selectedSubtitleId
      ) {
        e.preventDefault();
        onDeleteSubtitle(selectedSubtitleId, showToast);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [videoDuration, handleAddSubtitle, selectedSubtitleId, onDeleteSubtitle, showToast]);

  const handleTrackMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (videoDuration <= 0) return;
      if ((e.target as HTMLElement).closest('[data-subtitle-block]')) return;
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / rect.width;
      const time = Math.max(0, Math.min(videoDuration, ratio * videoDuration));
      const duration = Math.min(3, Math.max(0.5, videoDuration - time));
      const newSub: Subtitle = {
        id: generateId(),
        startTime: time,
        endTime: time + duration,
        text: '双击编辑字幕',
      };
      onAddSubtitle(newSub);
      onSelectSubtitle(newSub.id);
    },
    [videoDuration, onAddSubtitle, onSelectSubtitle]
  );

  const handleBlockMouseDown = useCallback(
    (e: React.MouseEvent, sub: Subtitle) => {
      e.stopPropagation();
      onSelectSubtitle(sub.id);

      if (videoDuration <= 0) return;

      const duration = sub.endTime - sub.startTime;
      dragStateRef.current = {
        id: sub.id,
        startX: e.clientX,
        startStartTime: sub.startTime,
        duration,
        rafId: null,
      };

      const handleMouseMove = (ev: MouseEvent) => {
        const state = dragStateRef.current;
        if (!state.id) return;
        const track = trackRef.current;
        if (!track) return;

        if (state.rafId !== null) cancelAnimationFrame(state.rafId);

        state.rafId = requestAnimationFrame(() => {
          const rect = track.getBoundingClientRect();
          const deltaX = ev.clientX - state.startX;
          const deltaTime = (deltaX / rect.width) * videoDuration;
          let newStart = state.startStartTime + deltaTime;
          newStart = Math.max(0, Math.min(videoDuration - state.duration, newStart));
          const newEnd = newStart + state.duration;
          onUpdateSubtitle(state.id!, { startTime: newStart, endTime: newEnd });
          state.rafId = null;
        });
      };

      const handleMouseUp = () => {
        if (dragStateRef.current.rafId !== null) {
          cancelAnimationFrame(dragStateRef.current.rafId);
        }
        dragStateRef.current = {
          id: null,
          startX: 0,
          startStartTime: 0,
          duration: 0,
          rafId: null,
        };
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [videoDuration, onSelectSubtitle, onUpdateSubtitle]
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
        className="editor-layout"
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            flex: 1,
            minWidth: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                字幕轨道
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {subtitles.length} 条字幕 · 总时长 {formatTimeShort(videoDuration)}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                当前: {formatTimeShort(currentTime)}
              </span>
            </div>
          </div>

          <div
            style={{
              position: 'relative',
              padding: '12px 16px',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: 10,
              border: '1px solid var(--divider)',
            }}
          >
            <div
              ref={trackRef}
              onMouseDown={handleTrackMouseDown}
              style={{
                position: 'relative',
                width: '100%',
                height: 40,
                backgroundColor: '#1e1e2e',
                borderRadius: 8,
                overflowX: 'auto',
                overflowY: 'hidden',
                cursor: videoDuration > 0 ? 'crosshair' : 'not-allowed',
                opacity: videoDuration > 0 ? 1 : 0.5,
                minWidth: 400,
              }}
            >
              <div style={{ position: 'relative', width: '100%', height: '100%', minWidth: '100%' }}>
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
                  <div
                    key={i}
                    style={{
                      position: 'absolute',
                      left: `${ratio * 100}%`,
                      top: 0,
                      bottom: 0,
                      width: 1,
                      backgroundColor: 'rgba(255,255,255,0.08)',
                      zIndex: 0,
                    }}
                  />
                ))}

                {videoDuration > 0 && (
                  <motion.div
                    animate={{ left: `${(currentTime / videoDuration) * 100}%` }}
                    transition={{ type: 'tween', ease: 'linear', duration: 0.05 }}
                    style={{
                      position: 'absolute',
                      top: -4,
                      bottom: -4,
                      width: 2,
                      backgroundColor: '#e63946',
                      zIndex: 10,
                      pointerEvents: 'none',
                      boxShadow: '0 0 8px rgba(230, 57, 70, 0.6)',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        top: -6,
                        left: -5,
                        width: 0,
                        height: 0,
                        borderLeft: '5px solid transparent',
                        borderRight: '5px solid transparent',
                        borderTop: '6px solid #e63946',
                      }}
                    />
                  </motion.div>
                )}

                {sortedSubtitles.map((sub, idx) => {
                  const total = videoDuration || 1;
                  const left = (sub.startTime / total) * 100;
                  const width = Math.max(2, ((sub.endTime - sub.startTime) / total) * 100);
                  const isSelected = sub.id === selectedSubtitleId;
                  const colorT = sortedSubtitles.length > 1 ? idx / (sortedSubtitles.length - 1) : 0;

                  return (
                    <div
                      key={sub.id}
                      data-subtitle-block
                      onMouseDown={(e) => handleBlockMouseDown(e, sub)}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectSubtitle(sub.id);
                      }}
                      style={{
                        position: 'absolute',
                        left: `${left}%`,
                        top: 4,
                        bottom: 4,
                        width: `${width}%`,
                        background: `linear-gradient(180deg, ${lerpColor(colorT)}, ${lerpColor(
                          colorT + 0.1
                        )})`,
                        borderRadius: 6,
                        cursor: isSelected ? 'grabbing' : 'grab',
                        zIndex: isSelected ? 5 : 2,
                        padding: '4px 8px',
                        overflow: 'hidden',
                        border: isSelected
                          ? '2px solid rgba(255,255,255,0.6)'
                          : '2px solid transparent',
                        boxShadow: isSelected
                          ? '0 2px 12px rgba(124, 58, 237, 0.5)'
                          : '0 1px 4px rgba(0,0,0,0.3)',
                        marginRight: 2,
                        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                      }}
                      title={`${formatTimeShort(sub.startTime)} - ${formatTimeShort(
                        sub.endTime
                      )}\n${sub.text}`}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          color: 'white',
                          fontWeight: 500,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          lineHeight: '24px',
                          textShadow: '0 1px 2px rgba(0,0,0,0.4)',
                        }}
                      >
                        {sub.text || '(空字幕)'}
                      </div>
                    </div>
                  );
                })}

                {subtitles.length === 0 && videoDuration > 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      color: 'var(--text-secondary)',
                      pointerEvents: 'none',
                    }}
                  >
                    点击轨道或按 N 键在当前时间点添加字幕
                  </div>
                )}
              </div>
            </div>

            {videoDuration > 0 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: 8,
                  fontSize: 10,
                  color: 'var(--text-secondary)',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                }}
              >
                <span>{formatTimeShort(0)}</span>
                <span>{formatTimeShort(videoDuration / 4)}</span>
                <span>{formatTimeShort(videoDuration / 2)}</span>
                <span>{formatTimeShort((videoDuration * 3) / 4)}</span>
                <span>{formatTimeShort(videoDuration)}</span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddSubtitle();
              }}
              placeholder="输入字幕内容后点击添加，或留空创建空字幕..."
              style={{
                flex: 1,
                minWidth: 0,
                padding: '12px 16px',
                backgroundColor: '#2a2a3c',
                border: '1px solid #3a3a4e',
                borderRadius: 8,
                color: 'var(--text-primary)',
                fontSize: 14,
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#7c3aed';
                e.currentTarget.style.boxShadow = '0 0 8px rgba(124,58,237,0.3)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#3a3a4e';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleAddSubtitle}
              style={{
                padding: '12px 24px',
                backgroundColor: '#16a34a',
                color: 'white',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              添加字幕
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleExportSrt}
              style={{
                padding: '12px 24px',
                background:
                  'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                color: 'white',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: subtitles.length > 0 ? '0 2px 12px rgba(124, 58, 237, 0.3)' : 'none',
                opacity: subtitles.length > 0 ? 1 : 0.5,
                cursor: subtitles.length > 0 ? 'pointer' : 'not-allowed',
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              导出 SRT
            </motion.button>
          </div>
        </div>

        <div
          style={{
            width: 280,
            minWidth: 280,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
          className="edit-panel"
        >
          <div
            style={{
              padding: 16,
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: 10,
              border: '1px solid var(--divider)',
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                marginBottom: 12,
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>字幕编辑</span>
              <AnimatePresence>
                {selectedSubtitle && (
                  <motion.span
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    style={{
                      fontSize: 11,
                      color: 'var(--accent-primary)',
                      fontWeight: 500,
                      padding: '2px 8px',
                      backgroundColor: 'rgba(124, 58, 237, 0.1)',
                      borderRadius: 4,
                    }}
                  >
                    已选中
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            <AnimatePresence mode="wait">
              {selectedSubtitle ? (
                <motion.div
                  key="editor"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      开始时间
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max={selectedSubtitle.endTime}
                      value={selectedSubtitle.startTime.toFixed(2)}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        const newStart = Math.max(
                          0,
                          Math.min(selectedSubtitle.endTime - 0.1, val)
                        );
                        onUpdateSubtitle(selectedSubtitle.id, { startTime: newStart });
                      }}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: '#2a2a3c',
                        border: '1px solid #3a3a4e',
                        borderRadius: 6,
                        color: 'var(--text-primary)',
                        fontSize: 13,
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = '#7c3aed';
                        e.currentTarget.style.boxShadow = '0 0 6px rgba(124,58,237,0.3)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = '#3a3a4e';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      结束时间
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min={selectedSubtitle.startTime}
                      max={videoDuration}
                      value={selectedSubtitle.endTime.toFixed(2)}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        const newEnd = Math.max(
                          selectedSubtitle.startTime + 0.1,
                          Math.min(videoDuration, val)
                        );
                        onUpdateSubtitle(selectedSubtitle.id, { endTime: newEnd });
                      }}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: '#2a2a3c',
                        border: '1px solid #3a3a4e',
                        borderRadius: 6,
                        color: 'var(--text-primary)',
                        fontSize: 13,
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = '#7c3aed';
                        e.currentTarget.style.boxShadow = '0 0 6px rgba(124,58,237,0.3)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = '#3a3a4e';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />
                  </div>

                  <div
                    style={{
                      padding: '8px 12px',
                      backgroundColor: 'rgba(124, 58, 237, 0.08)',
                      borderRadius: 6,
                      fontSize: 11,
                      color: 'var(--text-secondary)',
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                      textAlign: 'center',
                    }}
                  >
                    时长 {(selectedSubtitle.endTime - selectedSubtitle.startTime).toFixed(2)}s
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      字幕文本
                    </label>
                    <textarea
                      value={selectedSubtitle.text}
                      onChange={(e) =>
                        onUpdateSubtitle(selectedSubtitle.id, { text: e.target.value })
                      }
                      rows={4}
                      placeholder="输入字幕内容..."
                      style={{
                        padding: '10px 12px',
                        backgroundColor: '#2a2a3c',
                        border: '1px solid #3a3a4e',
                        borderRadius: 6,
                        color: 'var(--text-primary)',
                        fontSize: 13,
                        lineHeight: 1.5,
                        minHeight: 80,
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = '#7c3aed';
                        e.currentTarget.style.boxShadow = '0 0 6px rgba(124,58,237,0.3)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = '#3a3a4e';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onDeleteSubtitle(selectedSubtitle.id, showToast)}
                    style={{
                      padding: '10px 16px',
                      backgroundColor: 'rgba(230, 57, 70, 0.1)',
                      color: '#e63946',
                      border: '1px solid rgba(230, 57, 70, 0.2)',
                      borderRadius: 6,
                      fontSize: 13,
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      marginTop: 4,
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                    </svg>
                    删除字幕
                  </motion.button>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '32px 16px',
                    gap: 10,
                    color: 'var(--text-secondary)',
                    textAlign: 'center',
                  }}
                >
                  <svg
                    width="36"
                    height="36"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ opacity: 0.5 }}
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="8" y1="13" x2="16" y2="13" />
                    <line x1="8" y1="17" x2="13" y2="17" />
                  </svg>
                  <div style={{ fontSize: 13 }}>选择字幕块进行编辑</div>
                  <div style={{ fontSize: 11, opacity: 0.7 }}>
                    点击轨道上的字幕块或在视频定位后按 N 键添加
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div
            style={{
              padding: 16,
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: 10,
              border: '1px solid var(--divider)',
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 12,
                color: 'var(--text-primary)',
              }}
            >
              快捷键
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { key: 'Space', desc: '播放/暂停' },
                { key: 'N', desc: '添加字幕 (当前时间点)' },
                { key: 'Delete', desc: '删除选中字幕' },
              ].map((item) => (
                <div
                  key={item.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: 12,
                  }}
                >
                  <span style={{ color: 'var(--text-secondary)' }}>{item.desc}</span>
                  <kbd
                    style={{
                      padding: '2px 8px',
                      backgroundColor: '#2a2a3c',
                      border: '1px solid #3a3a4e',
                      borderRadius: 4,
                      fontSize: 11,
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                      color: 'var(--text-primary)',
                      boxShadow: '0 1px 0 rgba(0,0,0,0.3)',
                    }}
                  >
                    {item.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .editor-layout {
            flex-direction: column !important;
          }
          .edit-panel {
            width: 100% !important;
            min-width: unset !important;
          }
        }
      `}</style>
    </div>
  );
};

export default SubtitleEditor;
