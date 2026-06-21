import { useState, useCallback, useEffect, useRef } from 'react';

interface ScentNoteData {
  id: string;
  name: string;
  type: 'top' | 'middle' | 'base';
  ratio: number;
}

interface FormulaData {
  id?: string;
  name: string;
  author: string;
  avatar: string;
  notes: ScentNoteData[];
}

interface UsePerfumeFormulaReturn {
  notes: ScentNoteData[];
  addNote: (note: Omit<ScentNoteData, 'id' | 'ratio'>) => void;
  removeNote: (noteId: string) => void;
  updateRatio: (noteId: string, ratio: number) => void;
  clearNotes: () => void;
  formulaName: string;
  setFormulaName: (name: string) => void;
  saveFormula: () => Promise<FormulaData | null>;
  savedFormulas: FormulaData[];
  loadFormulas: () => Promise<void>;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function usePerfumeFormula(): UsePerfumeFormulaReturn {
  const [notes, setNotes] = useState<ScentNoteData[]>([]);
  const [formulaName, setFormulaName] = useState<string>('');
  const [savedFormulas, setSavedFormulas] = useState<FormulaData[]>([]);
  const loadedRef = useRef(false);

  const addNote = useCallback((note: Omit<ScentNoteData, 'id' | 'ratio'>) => {
    const newNote: ScentNoteData = {
      ...note,
      id: generateId(),
      ratio: 5,
    };
    setNotes(prev => [...prev, newNote]);
  }, []);

  const removeNote = useCallback((noteId: string) => {
    setNotes(prev => prev.filter(n => n.id !== noteId));
  }, []);

  const updateRatio = useCallback((noteId: string, ratio: number) => {
    const clamped = Math.min(10, Math.max(1, ratio));
    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, ratio: clamped } : n));
  }, []);

  const clearNotes = useCallback(() => {
    setNotes([]);
  }, []);

  const saveFormula = useCallback(async (): Promise<FormulaData | null> => {
    const formula: FormulaData = {
      name: formulaName,
      author: '匿名调香师',
      avatar: 'https://picsum.photos/seed/perfume/40/40',
      notes,
    };
    try {
      const res = await fetch('/api/formulas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formula),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }, [formulaName, notes]);

  const loadFormulas = useCallback(async () => {
    try {
      const res = await fetch('/api/formulas');
      if (!res.ok) return;
      const data = await res.json();
      setSavedFormulas(data);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    loadFormulas();
  }, [loadFormulas]);

  return {
    notes,
    addNote,
    removeNote,
    updateRatio,
    clearNotes,
    formulaName,
    setFormulaName,
    saveFormula,
    savedFormulas,
    loadFormulas,
  };
}
