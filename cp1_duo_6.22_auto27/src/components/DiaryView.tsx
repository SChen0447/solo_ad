import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Plus, Trash2, Bold, Italic, ImageIcon, MapPin, Clock, Minus, ListChecks, CheckSquare } from 'lucide-react';
import { useAppStore } from '../store';
import type { DiaryEntry, Spot } from '../types';

function parseTodoProgress(html: string): { total: number; done: number } | null {
  if (!html) return null;
  const checkboxRegex = /class="todo-check"/g;
  const checkedRegex = /class="todo-check todo-checked"/g;
  const total = (html.match(checkboxRegex) || []).length;
  if (total === 0) return null;
  const done = (html.match(checkedRegex) || []).length;
  return { total, done };
}

interface DiaryItemProps {
  diary: DiaryEntry;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

const DiaryItem = React.memo(function DiaryItem({ diary, isSelected, onSelect, onDelete }: DiaryItemProps) {
  const formattedTime = useMemo(() => {
    const d = new Date(diary.createdAt);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }, [diary.createdAt]);

  const todoProgress = useMemo(() => parseTodoProgress(diary.content), [diary.content]);

  return (
    <div
      onClick={() => onSelect(diary.id)}
      style={{
        padding: '12px 16px',
        background: isSelected ? '#e8f4fd' : 'white',
        borderLeft: isSelected ? '3px solid #3498db' : '3px solid transparent',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        boxShadow: isSelected ? '0 2px 8px rgba(52,152,219,0.15)' : '0 1px 3px rgba(0,0,0,0.06)',
        borderRadius: 8,
        marginBottom: 8,
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
        }
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#2c3e50', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {diary.spotName}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#7f8c8d', marginBottom: 2 }}>
            <Clock size={11} />
            <span>{formattedTime}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#7f8c8d' }}>
            <MapPin size={11} />
            <span>{diary.lat.toFixed(4)}, {diary.lng.toFixed(4)}</span>
          </div>
          {todoProgress && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                marginTop: 6,
                padding: '2px 8px',
                borderRadius: 10,
                fontSize: 11,
                fontWeight: 500,
                background: todoProgress.done === todoProgress.total ? 'rgba(46, 204, 113, 0.15)' : 'rgba(52, 152, 219, 0.12)',
                color: todoProgress.done === todoProgress.total ? '#27ae60' : '#3498db',
              }}
            >
              <CheckSquare size={10} />
              {todoProgress.done}/{todoProgress.total} 已完成
            </div>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(diary.id); }}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#bdc3c7',
            padding: 4,
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#e74c3c'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#bdc3c7'; }}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
});

export default function DiaryView() {
  const {
    state,
    fetchDiaries,
    createDiary,
    updateDiary,
    deleteDiary,
    setCurrentDiary,
    uploadImage,
  } = useAppStore();

  const [showSpotPicker, setShowSpotPicker] = useState(false);
  const [contentKey, setContentKey] = useState(0);
  const [isFading, setIsFading] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentDiaryIdRef = useRef<string | null>(null);
  const fadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentTrip = useMemo(
    () => state.trips.find((t) => t.id === state.currentTripId),
    [state.trips, state.currentTripId]
  );

  const allSpots: Spot[] = useMemo(() => {
    if (!currentTrip) return [];
    return currentTrip.days.flatMap((day) => day.spots);
  }, [currentTrip]);

  const sortedDiaries = useMemo(
    () => [...state.diaries].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [state.diaries]
  );

  const currentDiary = useMemo(
    () => state.diaries.find((d) => d.id === state.currentDiaryId) ?? null,
    [state.diaries, state.currentDiaryId]
  );

  useEffect(() => {
    if (state.currentTripId) {
      fetchDiaries(state.currentTripId);
    }
  }, [state.currentTripId, fetchDiaries]);

  useEffect(() => {
    if (currentDiaryIdRef.current !== state.currentDiaryId) {
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
      }
      setIsFading(true);
      fadeTimeoutRef.current = setTimeout(() => {
        currentDiaryIdRef.current = state.currentDiaryId;
        setContentKey((k) => k + 1);
        setIsFading(false);
      }, 100);
    }
    return () => {
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
      }
    };
  }, [state.currentDiaryId]);

  useEffect(() => {
    if (editorRef.current && currentDiary) {
      if (editorRef.current.innerHTML !== currentDiary.content) {
        editorRef.current.innerHTML = currentDiary.content;
      }
    }
  }, [currentDiary]);

  const handleSelectDiary = useCallback((id: string) => {
    setCurrentDiary(id);
  }, [setCurrentDiary]);

  const handleDeleteDiary = useCallback(async (id: string) => {
    if (confirm('确定删除这篇日记吗？')) {
      await deleteDiary(id);
    }
  }, [deleteDiary]);

  const handleContentChange = useCallback(() => {
    if (!state.currentDiaryId) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (editorRef.current && state.currentDiaryId) {
        updateDiary(state.currentDiaryId, { content: editorRef.current.innerHTML });
      }
    }, 1000);
  }, [state.currentDiaryId, updateDiary]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleBold = useCallback(() => {
    document.execCommand('bold');
    editorRef.current?.focus();
  }, []);

  const handleItalic = useCallback(() => {
    document.execCommand('italic');
    editorRef.current?.focus();
  }, []);

  const handleInsertImage = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const url = await uploadImage(file);
        document.execCommand('insertHTML', false, `<img src="${url}" style="max-width:100%;border-radius:8px;margin:8px 0">`);
        handleContentChange();
      } catch (err) {
        console.error('Image upload failed', err);
      }
    };
    input.click();
  }, [uploadImage, handleContentChange]);

  const handleInsertHr = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    document.execCommand(
      'insertHTML',
      false,
      '<hr style="border:none;border-top:2px solid #e8dcc8;margin:12px 0;" />'
    );
    handleContentChange();
  }, [handleContentChange]);

  const handleInsertTodo = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    const todoHtml =
      '<div class="todo-item" style="display:flex;align-items:flex-start;gap:8px;padding:4px 0;">' +
        '<span class="todo-check" contenteditable="false" style="' +
          'display:inline-flex;align-items:center;justify-content:center;' +
          'width:18px;height:18px;min-width:18px;border:2px solid #bdc3c7;border-radius:4px;' +
          'cursor:pointer;margin-top:3px;font-size:11px;color:transparent;' +
          'transition:all 0.2s;' +
        '" onclick="this.classList.toggle(\'todo-checked\');this.style.background=this.classList.contains(\'todo-checked\')?\'#3498db\':\'transparent\';this.style.borderColor=this.classList.contains(\'todo-checked\')?\'#3498db\':\'#bdc3c7\';this.style.color=this.classList.contains(\'todo-checked\')?\'white\':\'transparent\';">&#10003;</span>' +
        '<span style="flex:1;line-height:1.6;">待办事项</span>' +
      '</div>';
    document.execCommand('insertHTML', false, todoHtml);
    handleContentChange();
  }, [handleContentChange]);

  const handleEditorClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('todo-check')) {
        e.preventDefault();
        e.stopPropagation();
        const isChecked = target.classList.contains('todo-checked');
        if (isChecked) {
          target.classList.remove('todo-checked');
          target.style.background = 'transparent';
          target.style.borderColor = '#bdc3c7';
          target.style.color = 'transparent';
        } else {
          target.classList.add('todo-checked');
          target.style.background = '#3498db';
          target.style.borderColor = '#3498db';
          target.style.color = 'white';
        }
        const todoItem = target.closest('.todo-item');
        if (todoItem) {
          const textSpan = todoItem.querySelector('span:last-child') as HTMLSpanElement | null;
          if (textSpan) {
            textSpan.style.textDecoration = isChecked ? 'none' : 'line-through';
            textSpan.style.color = isChecked ? '#2c3e50' : '#95a5a6';
          }
        }
        setTimeout(() => handleContentChange(), 50);
      }
    },
    [handleContentChange]
  );

  const handleCreateDiary = useCallback(async (spot: Spot) => {
    if (!state.currentTripId) return;
    await createDiary(state.currentTripId, {
      spotId: spot.id,
      spotName: spot.name,
      lat: spot.lat,
      lng: spot.lng,
      content: '',
    });
    setShowSpotPicker(false);
  }, [state.currentTripId, createDiary]);

  const toolbarBtnStyle: React.CSSProperties = {
    background: 'white',
    border: '1px solid #e8dcc8',
    borderRadius: 6,
    padding: '6px 10px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 14,
    color: '#2c3e50',
    transition: 'all 0.2s',
  };

  return (
    <div style={{ display: 'flex', height: '100%', background: '#faf3e0', flexDirection: 'row' }}>
      <style>{`
        @media (max-width: 767px) {
          .diary-layout { flex-direction: column !important; }
          .diary-left { width: 100% !important; min-width: unset !important; max-height: 40vh; border-right: none !important; border-bottom: 1px solid #e8dcc8; }
          .diary-right { width: 100% !important; }
        }
        .diary-editor hr {
          border: none;
          border-top: 2px solid #e8dcc8;
          margin: 12px 0;
        }
        .diary-editor .todo-item {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 4px 0;
        }
        .diary-editor .todo-check {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          min-width: 18px;
          border: 2px solid #bdc3c7;
          border-radius: 4px;
          cursor: pointer;
          margin-top: 3px;
          font-size: 11px;
          color: transparent;
          transition: all 0.2s;
          background: transparent;
          line-height: 1;
        }
        .diary-editor .todo-check:hover {
          border-color: #3498db;
        }
        .diary-editor .todo-check.todo-checked {
          background: #3498db;
          border-color: #3498db;
          color: white;
        }
        .diary-editor .todo-item.todo-done > span:last-child {
          text-decoration: line-through;
          color: #95a5a6;
        }
      `}</style>
      <div
        className="diary-left"
        style={{
          width: '30%',
          minWidth: 300,
          borderRight: '1px solid #e8dcc8',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
          background: '#faf3e0',
          padding: 16,
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#2c3e50' }}>日记列表</h3>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowSpotPicker(!showSpotPicker)}
              style={{
                background: '#3498db',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                padding: '6px 14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 13,
                fontWeight: 600,
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#2980b9'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#3498db'; }}
            >
              <Plus size={14} /> 新建日记
            </button>
            {showSpotPicker && allSpots.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: 4,
                  background: 'white',
                  borderRadius: 8,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                  zIndex: 50,
                  minWidth: 200,
                  maxHeight: 240,
                  overflowY: 'auto',
                  padding: 4,
                }}
              >
                {allSpots.map((spot) => (
                  <div
                    key={spot.id}
                    onClick={() => handleCreateDiary(spot)}
                    style={{
                      padding: '8px 12px',
                      cursor: 'pointer',
                      borderRadius: 6,
                      fontSize: 13,
                      color: '#2c3e50',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#f0f0f0'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <MapPin size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                    {spot.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4 }}>
          {sortedDiaries.length === 0 && (
            <div style={{ textAlign: 'center', color: '#7f8c8d', fontSize: 13, padding: '24px 0' }}>
              暂无日记，点击新建开始记录
            </div>
          )}
          {sortedDiaries.map((diary) => (
            <DiaryItem
              key={diary.id}
              diary={diary}
              isSelected={diary.id === state.currentDiaryId}
              onSelect={handleSelectDiary}
              onDelete={handleDeleteDiary}
            />
          ))}
        </div>
      </div>

      <div
        className="diary-right"
        style={{
          width: '70%',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
          background: '#faf3e0',
          padding: 16,
          boxSizing: 'border-box',
        }}
      >
        {currentDiary ? (
          <div
            key={contentKey}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              opacity: isFading ? 0 : 1,
              transition: 'opacity 0.3s ease-in-out',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#2c3e50' }}>
                {currentDiary.spotName}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#7f8c8d' }}>
                <MapPin size={12} />
                <span>{currentDiary.lat.toFixed(4)}, {currentDiary.lng.toFixed(4)}</span>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                gap: 6,
                marginBottom: 12,
                padding: '8px 10px',
                background: 'white',
                borderRadius: 8,
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                flexWrap: 'wrap' as const,
              }}
            >
              <button onClick={handleBold} style={toolbarBtnStyle} title="加粗">
                <Bold size={14} />
              </button>
              <button onClick={handleItalic} style={toolbarBtnStyle} title="斜体">
                <Italic size={14} />
              </button>
              <div style={{ width: 1, background: '#e8dcc8', margin: '0 2px' }} />
              <button onClick={handleInsertHr} style={toolbarBtnStyle} title="插入分隔线">
                <Minus size={14} />
              </button>
              <button onClick={handleInsertTodo} style={toolbarBtnStyle} title="插入待办事项">
                <ListChecks size={14} />
              </button>
              <div style={{ width: 1, background: '#e8dcc8', margin: '0 2px' }} />
              <button onClick={handleInsertImage} style={toolbarBtnStyle} title="插入图片">
                <ImageIcon size={14} />
              </button>
            </div>

            <div
              ref={editorRef}
              contentEditable
              onInput={handleContentChange}
              onClick={handleEditorClick}
              className="diary-editor"
              style={{
                flex: 1,
                background: 'white',
                borderRadius: 8,
                padding: 16,
                overflowY: 'auto',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                fontSize: 14,
                lineHeight: 1.8,
                color: '#2c3e50',
                outline: 'none',
                minHeight: 200,
              }}
              suppressContentEditableWarning
            />
          </div>
        ) : (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
            }}
          >
            <div style={{ fontSize: 48 }}>📝</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#2c3e50' }}>选择一篇日记开始编辑</div>
            <div style={{ fontSize: 13, color: '#7f8c8d' }}>从左侧列表选择已有日记，或新建一篇</div>
          </div>
        )}
      </div>
    </div>
  );
}
