import { useState, useMemo, useEffect, useCallback } from 'react';
import type { Note, Language } from './types';
import NoteArea from './note/NoteArea';
import FlashCard from './flashcard/FlashCard';
import StatsPanel from './stats/StatsPanel';
import { loadNotes, saveNotes, generateId, getReviewedToday, saveReviewedToday, getStreak, updateStreak } from './storage';

type Tab = 'note' | 'flashcard' | 'stats';

export default function App() {
  const [tab, setTab] = useState<Tab>('note');
  const [notes, setNotes] = useState<Note[]>(() => loadNotes());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [reviewedToday, setReviewedToday] = useState<Set<string>>(() => getReviewedToday());

  useEffect(() => {
    saveNotes(notes);
  }, [notes]);

  useEffect(() => {
    saveReviewedToday(reviewedToday);
  }, [reviewedToday]);

  const dueNotes = useMemo(() => {
    const now = Date.now();
    return notes.filter(n => n.nextReviewAt <= now && !reviewedToday.has(n.id));
  }, [notes, reviewedToday]);

  const streak = getStreak();

  const addNote = useCallback((word: string, meaning: string, example1: string, example2: string, language: Language) => {
    const now = Date.now();
    const newNote: Note = {
      id: generateId(),
      word,
      meaning,
      example1,
      example2,
      language,
      createdAt: now,
      nextReviewAt: now + 86400000,
      intervalDays: 1,
      reviewCount: 0
    };
    setNotes(prev => [newNote, ...prev]);
  }, []);

  const updateNote = useCallback((id: string, word: string, meaning: string, example1: string, example2: string, language: Language) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, word, meaning, example1, example2, language } : n));
  }, []);

  const deleteNote = useCallback((id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
  }, []);

  const handleReview = useCallback((noteId: string, known: boolean) => {
    setNotes(prev => prev.map(n => {
      if (n.id !== noteId) return n;
      let newInterval: number;
      if (known) {
        newInterval = n.reviewCount === 0 ? 3 : n.reviewCount === 1 ? 7 : n.reviewCount === 2 ? 14 : n.intervalDays * 2;
      } else {
        newInterval = 1;
      }
      return {
        ...n,
        intervalDays: newInterval,
        nextReviewAt: Date.now() + newInterval * 86400000,
        reviewCount: known ? n.reviewCount + 1 : 0,
        lastReviewedAt: Date.now()
      };
    }));
    setReviewedToday(prev => {
      const next = new Set(prev);
      next.add(noteId);
      return next;
    });
    updateStreak();
  }, []);

  const switchTab = (t: Tab) => {
    setTab(t);
    setMobileMenuOpen(false);
  };

  return (
    <div className="app-container">
      <nav className="navbar">
        <button className="hamburger" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="菜单">
          <span></span>
          <span></span>
          <span></span>
        </button>
        <button className={`nav-tab ${tab === 'note' ? 'active' : ''}`} onClick={() => switchTab('note')}>笔记</button>
        <button className={`nav-tab ${tab === 'flashcard' ? 'active' : ''}`} onClick={() => switchTab('flashcard')}>复习</button>
        <button className={`nav-tab ${tab === 'stats' ? 'active' : ''}`} onClick={() => switchTab('stats')}>统计</button>
      </nav>
      {mobileMenuOpen && (
        <div className="mobile-menu">
          <button className={`nav-tab ${tab === 'note' ? 'active' : ''}`} onClick={() => switchTab('note')}>笔记</button>
          <button className={`nav-tab ${tab === 'flashcard' ? 'active' : ''}`} onClick={() => switchTab('flashcard')}>复习</button>
          <button className={`nav-tab ${tab === 'stats' ? 'active' : ''}`} onClick={() => switchTab('stats')}>统计</button>
        </div>
      )}
      <div key={tab} className="page-content">
        {tab === 'note' && <NoteArea notes={notes} onAdd={addNote} onUpdate={updateNote} onDelete={deleteNote} />}
        {tab === 'flashcard' && <FlashCard dueNotes={dueNotes} onReview={handleReview} />}
        {tab === 'stats' && <StatsPanel notes={notes} streak={streak} dueCount={dueNotes.length} reviewedTodayCount={reviewedToday.size} />}
      </div>
    </div>
  );
}
