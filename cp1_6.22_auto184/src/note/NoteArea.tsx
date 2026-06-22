import { useState } from 'react';
import type { Note, Language } from '../types';
import { LANGUAGE_LABELS } from '../types';
import './NoteArea.css';

interface Props {
  notes: Note[];
  onAdd: (word: string, meaning: string, example1: string, example2: string, language: Language) => void;
  onUpdate: (id: string, word: string, meaning: string, example1: string, example2: string, language: Language) => void;
  onDelete: (id: string) => void;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function PencilIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9"/>
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6M14 11v6"/>
      <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>
    </svg>
  );
}

export default function NoteArea({ notes, onAdd, onUpdate, onDelete }: Props) {
  const [word, setWord] = useState('');
  const [meaning, setMeaning] = useState('');
  const [example1, setExample1] = useState('');
  const [example2, setExample2] = useState('');
  const [language, setLanguage] = useState<Language>('en');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editWord, setEditWord] = useState('');
  const [editMeaning, setEditMeaning] = useState('');
  const [editExample1, setEditExample1] = useState('');
  const [editExample2, setEditExample2] = useState('');
  const [editLanguage, setEditLanguage] = useState<Language>('en');

  const totalLen = word.length + meaning.length + example1.length + example2.length;
  const canSubmit = word.trim().length > 0 && meaning.trim().length > 0 && totalLen <= 300;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onAdd(word.trim(), meaning.trim(), example1.trim(), example2.trim(), language);
    setWord('');
    setMeaning('');
    setExample1('');
    setExample2('');
    setLanguage('en');
  };

  const startEdit = (note: Note) => {
    setEditingId(note.id);
    setEditWord(note.word);
    setEditMeaning(note.meaning);
    setEditExample1(note.example1);
    setEditExample2(note.example2);
    setEditLanguage(note.language);
  };

  const saveEdit = () => {
    if (!editingId) return;
    onUpdate(editingId, editWord.trim(), editMeaning.trim(), editExample1.trim(), editExample2.trim(), editLanguage);
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  return (
    <div className="note-area">
      <div className="note-input-card">
        <h2>记录新词汇</h2>
        <div className="note-form">
          <div className="form-row">
            <input
              className="note-input"
              type="text"
              placeholder="单词或短语"
              value={word}
              onChange={e => setWord(e.target.value)}
              maxLength={80}
            />
            <select
              className="note-select"
              value={language}
              onChange={e => setLanguage(e.target.value as Language)}
            >
              {Object.entries(LANGUAGE_LABELS).map(([code, label]) => (
                <option key={code} value={code}>{label}</option>
              ))}
            </select>
          </div>
          <input
            className="note-input"
            type="text"
            placeholder="中文释义"
            value={meaning}
            onChange={e => setMeaning(e.target.value)}
            maxLength={120}
          />
          <textarea
            className="note-textarea"
            placeholder="例句 1（可选）"
            value={example1}
            onChange={e => setExample1(e.target.value)}
            maxLength={150}
          />
          <textarea
            className="note-textarea"
            placeholder="例句 2（可选）"
            value={example2}
            onChange={e => setExample2(e.target.value)}
            maxLength={150}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: totalLen > 300 ? '#ef4444' : '#94a3b8' }}>
              {totalLen}/300
            </span>
            <button className="note-submit" onClick={handleSubmit} disabled={!canSubmit}>
              添加笔记
            </button>
          </div>
        </div>
      </div>

      {notes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📝</div>
          <div className="empty-state-text">还没有笔记，开始记录你的第一个词汇吧！</div>
        </div>
      ) : (
        <div className="notes-grid">
          {notes.map(note => (
            <div key={note.id} className="note-card">
              <div className="note-card-header">
                <span className="note-date">{formatDate(note.createdAt)}</span>
                <span className="note-lang-tag">{LANGUAGE_LABELS[note.language]}</span>
              </div>
              <button className="note-edit-btn" onClick={() => startEdit(note)} title="编辑" aria-label="编辑">
                <PencilIcon />
              </button>
              <button className="note-delete-btn" onClick={() => onDelete(note.id)} title="删除" aria-label="删除">
                <TrashIcon />
              </button>
              <div className="note-word">{note.word}</div>
              {note.meaning && <div className="note-meaning">{note.meaning}</div>}
              {note.example1 && <div className="note-example">{note.example1}</div>}
              {note.example2 && <div className="note-example">{note.example2}</div>}

              {editingId === note.id && (
                <div className="note-edit-form">
                  <div className="form-row">
                    <input
                      className="note-input"
                      type="text"
                      placeholder="单词或短语"
                      value={editWord}
                      onChange={e => setEditWord(e.target.value)}
                    />
                    <select
                      className="note-select"
                      value={editLanguage}
                      onChange={e => setEditLanguage(e.target.value as Language)}
                    >
                      {Object.entries(LANGUAGE_LABELS).map(([code, label]) => (
                        <option key={code} value={code}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <input
                    className="note-input"
                    type="text"
                    placeholder="中文释义"
                    value={editMeaning}
                    onChange={e => setEditMeaning(e.target.value)}
                  />
                  <textarea
                    className="note-textarea"
                    placeholder="例句 1"
                    value={editExample1}
                    onChange={e => setEditExample1(e.target.value)}
                  />
                  <textarea
                    className="note-textarea"
                    placeholder="例句 2"
                    value={editExample2}
                    onChange={e => setEditExample2(e.target.value)}
                  />
                  <div className="note-edit-actions">
                    <button className="note-edit-cancel" onClick={cancelEdit}>取消</button>
                    <button className="note-edit-save" onClick={saveEdit}>保存</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
