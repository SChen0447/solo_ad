import React, { useState, useRef, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import {
  useLyricStore,
  formatTimestamp,
  parseTimestamp,
  ImportMode,
} from '../../store';
import { ILyricWord, IProject } from '../shared/types';
import { audioEngine } from '../audio/AudioEngine';
import { synthEngine } from '../audio/SynthEngine';

interface TimestampEditorProps {
  value: number;
  onCommit: (ms: number) => void;
}

const TimestampEditor: React.FC<TimestampEditorProps> = ({ value, onCommit }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(formatTimestamp(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) {
      setDraft(formatTimestamp(value));
    }
  }, [value, editing]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commit = () => {
    const parsed = parseTimestamp(draft);
    if (parsed !== null) {
      onCommit(parsed);
    }
    setEditing(false);
  };

  return (
    <span
      className="lf-timestamp"
      onClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
    >
      {editing ? (
        <input
          ref={inputRef}
          className="lf-timestamp-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') setEditing(false);
          }}
        />
      ) : (
        <span title="点击编辑">{formatTimestamp(value)}</span>
      )}
    </span>
  );
};

const WordChip: React.FC<{
  word: ILyricWord;
  isSelected: boolean;
  onSelect: () => void;
  onDragStart?: (e: React.MouseEvent) => void;
}> = ({ word, isSelected, onSelect, onDragStart }) => {
  const updateWordPitch = useLyricStore((s) => s.updateWordPitch);
  const updateWordVolume = useLyricStore((s) => s.updateWordVolume);
  const updateWordPreset = useLyricStore((s) => s.updateWordPreset);
  const presets = useLyricStore((s) => s.synthPresets);
  const updateWordStartTime = useLyricStore((s) => s.updateWordStartTime);

  return (
    <div
      className={`lf-word ${isSelected ? 'lf-word--selected' : ''}`}
      onClick={onSelect}
      onMouseDown={onDragStart}
    >
      <div className="lf-word-text">
        <span className="lf-word-drag">⋮⋮</span>
        <TimestampEditor
          value={word.startTime}
          onCommit={(ms) => updateWordStartTime(word.id, ms)}
        />
        <span className="lf-word-content">{word.text}</span>
      </div>
      <div className="lf-word-controls">
        <div className="lf-word-control">
          <label>音高</label>
          <input
            type="range"
            min={-12}
            max={12}
            step={1}
            value={word.pitchOffset}
            onChange={(e) => updateWordPitch(word.id, parseInt(e.target.value, 10))}
            onClick={(e) => e.stopPropagation()}
          />
          <span>{word.pitchOffset > 0 ? '+' : ''}{word.pitchOffset}</span>
        </div>
        <div className="lf-word-control">
          <label>音量</label>
          <input
            type="range"
            min={0}
            max={2}
            step={0.01}
            value={word.volumeGain}
            onChange={(e) => updateWordVolume(word.id, parseFloat(e.target.value))}
            onClick={(e) => e.stopPropagation()}
          />
          <span>{Math.round(word.volumeGain * 100)}%</span>
        </div>
        <div className="lf-word-control">
          <label>音色</label>
          <select
            value={word.synthPresetId}
            onChange={(e) => updateWordPreset(word.id, e.target.value)}
            onClick={(e) => e.stopPropagation()}
          >
            {presets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

const LineCard: React.FC<{
  lineId: string;
  isActive: boolean;
}> = ({ lineId, isActive }) => {
  const line = useLyricStore((s) => s.lines.find((l) => l.id === lineId));
  const setSelectedLine = useLyricStore((s) => s.setSelectedLine);
  const setSelectedWord = useLyricStore((s) => s.setSelectedWord);
  const selectedWordId = useLyricStore((s) => s.selectedWordId);
  const removeLine = useLyricStore((s) => s.removeLine);
  const updateLineText = useLyricStore((s) => s.updateLineText);
  const [textValue, setTextValue] = useState(line?.words.map((w) => w.text).join(' ') ?? '');
  const draggingWord = useRef<{ id: string; startX: number; startTime: number } | null>(null);

  useEffect(() => {
    setTextValue(line?.words.map((w) => w.text).join(' ') ?? '');
  }, [line?.id, line?.words.length]);

  if (!line) return null;

  const handleWordDragStart = (word: ILyricWord, e: React.MouseEvent) => {
    e.stopPropagation();
    draggingWord.current = {
      id: word.id,
      startX: e.clientX,
      startTime: word.startTime,
    };
    const onMove = (ev: MouseEvent) => {
      if (!draggingWord.current) return;
      const updateWordStartTime = useLyricStore.getState().updateWordStartTime;
      const dx = ev.clientX - draggingWord.current.startX;
      const msPerPixel = 10;
      const newTime = Math.max(0, draggingWord.current.startTime + dx * msPerPixel);
      updateWordStartTime(draggingWord.current.id, newTime);
    };
    const onUp = () => {
      draggingWord.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <div
      className={`lf-line-card ${isActive ? 'lf-line-card--active' : ''}`}
      onClick={() => setSelectedLine(line.id)}
    >
      <div className="lf-line-header">
        <span className="lf-line-number">#{line.lineNumber}</span>
        <div className="lf-line-actions">
          <input
            className="lf-line-textinput"
            placeholder="输入歌词文本..."
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            onBlur={() => updateLineText(line.id, textValue)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                updateLineText(line.id, textValue);
              }
            }}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="lf-btn lf-btn--danger lf-btn--sm"
            onClick={(e) => {
              e.stopPropagation();
              removeLine(line.id);
            }}
          >
            删除
          </button>
        </div>
      </div>
      <div className="lf-word-row">
        {line.words.map((w) => (
          <WordChip
            key={w.id}
            word={w}
            isSelected={selectedWordId === w.id}
            onSelect={() => {
              setSelectedWord(w.id);
              setSelectedLine(line.id);
            }}
            onDragStart={(e) => handleWordDragStart(w, e)}
          />
        ))}
        {line.words.length === 0 && (
          <div className="lf-empty-hint">此段落暂无单词。请在上方输入歌词文本后回车。</div>
        )}
      </div>
    </div>
  );
};

export const EditorPanel: React.FC = () => {
  const lines = useLyricStore((s) => s.lines);
  const selectedLineId = useLyricStore((s) => s.selectedLineId);
  const addLine = useLyricStore((s) => s.addLine);
  const insertTimestampAtCurrentPosition = useLyricStore((s) => s.insertTimestampAtCurrentPosition);
  const exportProject = useLyricStore((s) => s.exportProject);
  const importProject = useLyricStore((s) => s.importProject);
  const metadata = useLyricStore((s) => s.metadata);
  const setMetadata = useLyricStore((s) => s.setMetadata);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const unsub = audioEngine.onStateChange((ev) => setCurrentTime(ev.currentTime));
    return unsub;
  }, []);

  const handleExport = () => {
    const project = exportProject();
    const json = JSON.stringify(project, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${metadata.title || 'project'}.lyricforge.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (file: File) => {
    try {
      const text = await file.text();
      const project: IProject = JSON.parse(text);
      const mode: ImportMode = window.confirm(
        '点击确定覆盖当前项目，点击取消追加到尾部。'
      )
        ? 'overwrite'
        : 'append';
      importProject(project, mode);
    } catch (err) {
      alert('导入失败：无效的项目文件');
      console.error(err);
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="lf-editor">
        <div className="lf-editor-toolbar">
          <div className="lf-meta">
            <input
              className="lf-meta-input"
              placeholder="标题"
              value={metadata.title}
              onChange={(e) => setMetadata({ title: e.target.value })}
            />
            <label className="lf-meta-label">
              BPM
              <input
                type="number"
                className="lf-meta-input lf-meta-input--sm"
                value={metadata.bpm}
                min={40}
                max={300}
                onChange={(e) => setMetadata({ bpm: parseInt(e.target.value, 10) })}
              />
            </label>
            <label className="lf-meta-label">
              调号
              <input
                className="lf-meta-input lf-meta-input--sm"
                value={metadata.key}
                onChange={(e) => setMetadata({ key: e.target.value })}
              />
            </label>
          </div>
          <div className="lf-toolbar-actions">
            <div className="lf-current-time">
              <span className="lf-ct-label">当前播放：</span>
              <span className="lf-timestamp">{formatTimestamp(currentTime)}</span>
            </div>
            <button
              className="lf-btn lf-btn--primary"
              onClick={() => insertTimestampAtCurrentPosition()}
            >
              插入暂停标记
            </button>
            <button className="lf-btn lf-btn--ghost" onClick={() => addLine()}>
              + 添加段落
            </button>
            <button className="lf-btn lf-btn--ghost" onClick={handleExport}>
              导出项目
            </button>
            <button
              className="lf-btn lf-btn--ghost"
              onClick={() => fileInputRef.current?.click()}
            >
              导入项目
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImportFile(file);
                e.target.value = '';
              }}
            />
          </div>
        </div>
        <div className="lf-lines">
          {lines.map((line) => (
            <LineCard
              key={line.id}
              lineId={line.id}
              isActive={selectedLineId === line.id}
            />
          ))}
          {lines.length === 0 && (
            <div className="lf-empty">
              <div className="lf-empty-title">还没有歌词段落</div>
              <div className="lf-empty-sub">点击右上角「添加段落」开始创作</div>
              <button className="lf-btn lf-btn--primary lf-btn--lg" onClick={() => {
                addLine('Hello world this is LyricForge');
                addLine('Create your own vocal melody');
              }}>
                加载示例歌词
              </button>
            </div>
          )}
        </div>
      </div>
    </DndProvider>
  );
};
