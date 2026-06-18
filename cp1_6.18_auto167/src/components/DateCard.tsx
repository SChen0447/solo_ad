import { useState, useRef, useEffect } from 'react';
import { useTimelineStore } from '@/core/store';
import { getMoodColor, getMoodLabel } from '@/core/stats';
import type { MoodLevel, Entry } from '@/types';

function EntryItem({ entry, onDelete }: { entry: Entry; onDelete: (id: string) => void }) {
  const [preview, setPreview] = useState<string | null>(null);

  return (
    <div
      style={{
        padding: '14px 16px',
        borderRadius: 12,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.06)',
        marginBottom: 10,
        transition: 'background 0.25s ease',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>{entry.time}</span>
        <button
          onClick={() => onDelete(entry.id)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#64748b',
            cursor: 'pointer',
            fontSize: 14,
            padding: '2px 6px',
            borderRadius: 4,
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}
        >
          ✕
        </button>
      </div>
      <div style={{ fontSize: 14, color: '#e0e6ed', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{entry.text}</div>
      {entry.images && entry.images.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          {entry.images.slice(0, 3).map((img, i) => (
            <img
              key={i}
              src={img}
              alt=""
              onClick={() => setPreview(img)}
              style={{
                width: 80,
                height: 80,
                objectFit: 'cover',
                borderRadius: 8,
                cursor: 'pointer',
                border: '1px solid rgba(255,255,255,0.1)',
                transition: 'transform 0.25s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            />
          ))}
        </div>
      )}
      {preview && (
        <div
          onClick={() => setPreview(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'zoom-out',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <img src={preview} alt="" style={{ maxWidth: '90%', maxHeight: '90%', borderRadius: 12 }} />
        </div>
      )}
    </div>
  );
}

function MoodPicker({ date, currentMood }: { date: string; currentMood: MoodLevel | null }) {
  const setMood = useTimelineStore((s) => s.setMood);
  const levels: MoodLevel[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
      {levels.map((l) => {
        const color = getMoodColor(l);
        const active = currentMood === l;
        return (
          <button
            key={l}
            onClick={() => setMood(date, l)}
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: color,
              border: active ? '2px solid #fff' : '2px solid transparent',
              cursor: 'pointer',
              opacity: active ? 1 : 0.6,
              transform: active ? 'scale(1.15)' : 'scale(1)',
              transition: 'all 0.25s ease',
              boxShadow: active ? `0 0 12px ${color}` : 'none',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '1';
              e.currentTarget.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              if (!active) {
                e.currentTarget.style.opacity = '0.6';
                e.currentTarget.style.transform = 'scale(1)';
              }
            }}
            title={`${l} - ${getMoodLabel(l)}`}
          />
        );
      })}
    </div>
  );
}

export default function DateCard() {
  const selectedDate = useTimelineStore((s) => s.selectedDate);
  const selectDate = useTimelineStore((s) => s.selectDate);
  const addEntry = useTimelineStore((s) => s.addEntry);
  const deleteEntry = useTimelineStore((s) => s.deleteEntry);
  const getEntriesForDate = useTimelineStore((s) => s.getEntriesForDate);
  const getDateNode = useTimelineStore((s) => s.getDateNode);

  const [text, setText] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const entries = selectedDate ? getEntriesForDate(selectedDate) : [];
  const node = selectedDate ? getDateNode(selectedDate) : null;
  const moodColor = node ? getMoodColor(node.mood) : '#64748b';
  const moodLabel = node ? getMoodLabel(node.mood) : '';

  useEffect(() => {
    setText('');
    setImages([]);
  }, [selectedDate]);

  const handleSubmit = () => {
    if (!selectedDate || !text.trim()) return;
    addEntry(selectedDate, text, images);
    setText('');
    setImages([]);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const remaining = 3 - images.length;
    Array.from(files).slice(0, remaining).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setImages((prev) => [...prev, ev.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  if (!selectedDate || !node) return null;

  return (
    <div
      className="date-card-panel"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        height: '50vh',
        background: 'rgba(26, 35, 50, 0.92)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 -10px 40px rgba(0,0,0,0.4)',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        animation: 'slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      <div
        style={{
          padding: '16px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <h2 style={{ margin: 0, fontSize: 22, color: '#e0e6ed', fontWeight: 700 }}>{selectedDate}</h2>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '4px 12px',
                borderRadius: 20,
                background: 'rgba(255,255,255,0.06)',
                border: `1px solid ${moodColor}66`,
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: moodColor,
                  boxShadow: `0 0 8px ${moodColor}`,
                }}
              />
              <span style={{ fontSize: 13, color: moodColor, fontWeight: 600 }}>
                {node.mood ? `${node.mood}/10 · ${moodLabel}` : moodLabel}
              </span>
            </div>
          </div>
          <MoodPicker date={selectedDate} currentMood={node.mood} />
        </div>
        <button
          onClick={() => selectDate(null)}
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: '#e0e6ed',
            width: 36,
            height: 36,
            borderRadius: '50%',
            cursor: 'pointer',
            fontSize: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.25s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.3)';
            e.currentTarget.style.borderColor = '#ef4444';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
          }}
        >
          ✕
        </button>
      </div>

      <div
        ref={listRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 24px',
        }}
      >
        {entries.length === 0 ? (
          <div
            style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              fontSize: 14,
            }}
          >
            今天还没有记录，写下点什么吧 ✨
          </div>
        ) : (
          entries.map((e) => <EntryItem key={e.id} entry={e} onDelete={deleteEntry} />)
        )}
      </div>

      <div
        style={{
          padding: '12px 24px 20px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(26, 35, 50, 0.6)',
        }}
      >
        {images.length > 0 && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            {images.map((img, i) => (
              <div key={i} style={{ position: 'relative' }}>
                <img src={img} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8 }} />
                <button
                  onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                  style={{
                    position: 'absolute',
                    top: -6,
                    right: -6,
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: '#ef4444',
                    border: 'none',
                    color: '#fff',
                    fontSize: 10,
                    cursor: 'pointer',
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageUpload}
            style={{ display: 'none' }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={images.length >= 3}
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: images.length >= 3 ? '#475569' : '#e0e6ed',
              cursor: images.length >= 3 ? 'not-allowed' : 'pointer',
              fontSize: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.25s ease',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              if (images.length < 3) e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
            }}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
          >
            📷
          </button>
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="记录今天的心情和事件..."
            style={{
              flex: 1,
              height: 44,
              padding: '0 16px',
              borderRadius: 12,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#e0e6ed',
              fontSize: 14,
              outline: 'none',
              transition: 'all 0.25s ease',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = moodColor;
              e.currentTarget.style.boxShadow = `0 0 0 3px ${moodColor}22`;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={!text.trim()}
            style={{
              height: 44,
              padding: '0 20px',
              borderRadius: 12,
              background: text.trim() ? moodColor : 'rgba(100,116,139,0.4)',
              border: 'none',
              color: text.trim() ? '#fff' : '#475569',
              cursor: text.trim() ? 'pointer' : 'not-allowed',
              fontSize: 14,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.25s ease',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              if (text.trim()) e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            发送
          </button>
        </div>
      </div>
    </div>
  );
}
