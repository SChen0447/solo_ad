import type { Note, Annotation, DiffItem, DiffReport } from '../../types';

interface ScoreSnapshot {
  notes: Note[];
  annotations: Annotation[];
  measures: number;
}

function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return false;
  if (typeof a !== 'object') return false;

  const keysA = Object.keys(a).filter(k => k !== 'updatedAt' && k !== 'updatedBy');
  const keysB = Object.keys(b).filter(k => k !== 'updatedAt' && k !== 'updatedBy');
  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!deepEqual(a[key], b[key])) return false;
  }
  return true;
}

function getPitchLabel(pitch: number): string {
  const names = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const octave = Math.floor(pitch / 7) + 4;
  const name = names[pitch % 7];
  return `${name}${octave}`;
}

export default class DiffAnalyzer {
  compare(oldVersion: ScoreSnapshot, newVersion: ScoreSnapshot): DiffReport {
    const items: DiffItem[] = [];
    let totalChanges = 0;

    const noteChanges = this.compareNotes(oldVersion.notes, newVersion.notes);
    if (noteChanges.children && noteChanges.children.length > 0) {
      items.push(noteChanges);
      totalChanges += noteChanges.children.length;
    }

    const annotationChanges = this.compareAnnotations(oldVersion.annotations, newVersion.annotations);
    if (annotationChanges.children && annotationChanges.children.length > 0) {
      items.push(annotationChanges);
      totalChanges += annotationChanges.children.length;
    }

    if (oldVersion.measures !== newVersion.measures) {
      items.push({
        id: 'measure-change',
        type: 'measure_changed',
        category: 'structure',
        label: `小节数: ${oldVersion.measures} → ${newVersion.measures}`,
        oldValue: oldVersion.measures,
        newValue: newVersion.measures,
      });
      totalChanges += 1;
    }

    return { items, totalChanges };
  }

  private compareNotes(oldNotes: Note[], newNotes: Note[]): DiffItem {
    const children: DiffItem[] = [];
    const oldMap = new Map(oldNotes.map(n => [n.id, n]));
    const newMap = new Map(newNotes.map(n => [n.id, n]));

    for (const note of newNotes) {
      if (!oldMap.has(note.id)) {
        children.push({
          id: `note-added-${note.id}`,
          type: 'note_added',
          category: 'notes',
          label: `新增音符: ${getPitchLabel(note.pitch)} (第${note.measure + 1}小节)`,
          newValue: note,
          measure: note.measure,
        });
      } else {
        const oldNote = oldMap.get(note.id)!;
        if (!deepEqual(oldNote, note)) {
          const changes: string[] = [];
          if (oldNote.pitch !== note.pitch) {
            changes.push(`${getPitchLabel(oldNote.pitch)}→${getPitchLabel(note.pitch)}`);
          }
          if (oldNote.duration !== note.duration) {
            changes.push(`时值: ${oldNote.duration}→${note.duration}`);
          }
          if (oldNote.measure !== note.measure) {
            changes.push(`小节: ${oldNote.measure + 1}→${note.measure + 1}`);
          }
          if (oldNote.accidental !== note.accidental) {
            changes.push(`临时记号: ${oldNote.accidental || '无'}→${note.accidental || '无'}`);
          }
          children.push({
            id: `note-modified-${note.id}`,
            type: 'note_modified',
            category: 'notes',
            label: `修改音符: ${changes.join(', ') || '位置变化'}`,
            oldValue: oldNote,
            newValue: note,
            measure: note.measure,
          });
        }
      }
    }

    for (const note of oldNotes) {
      if (!newMap.has(note.id)) {
        children.push({
          id: `note-removed-${note.id}`,
          type: 'note_removed',
          category: 'notes',
          label: `删除音符: ${getPitchLabel(note.pitch)} (第${note.measure + 1}小节)`,
          oldValue: note,
          measure: note.measure,
        });
      }
    }

    return {
      id: 'notes-group',
      type: 'note_added',
      category: 'notes',
      label: `音符变更 (${children.length})`,
      children,
    };
  }

  private compareAnnotations(oldAnns: Annotation[], newAnns: Annotation[]): DiffItem {
    const children: DiffItem[] = [];
    const oldMap = new Map(oldAnns.map(a => [a.id, a]));
    const newMap = new Map(newAnns.map(a => [a.id, a]));

    for (const ann of newAnns) {
      if (!oldMap.has(ann.id)) {
        children.push({
          id: `ann-added-${ann.id}`,
          type: 'annotation_added',
          category: 'annotations',
          label: `新增批注 [${ann.shape}]: ${ann.userName} - ${ann.text || '(无文字)'}`,
          newValue: ann,
        });
      } else {
        const oldAnn = oldMap.get(ann.id)!;
        if (!deepEqual(oldAnn, ann)) {
          const changes: string[] = [];
          if (oldAnn.text !== ann.text) {
            changes.push(`文字: "${oldAnn.text}"→"${ann.text}"`);
          }
          if (oldAnn.shape !== ann.shape) {
            changes.push(`形状: ${oldAnn.shape}→${ann.shape}`);
          }
          if (Math.abs(oldAnn.x - ann.x) > 1 || Math.abs(oldAnn.y - ann.y) > 1) {
            changes.push('位置');
          }
          children.push({
            id: `ann-modified-${ann.id}`,
            type: 'annotation_modified',
            category: 'annotations',
            label: `修改批注: ${changes.join(', ') || '样式变化'}`,
            oldValue: oldAnn,
            newValue: ann,
          });
        }
      }
    }

    for (const ann of oldAnns) {
      if (!newMap.has(ann.id)) {
        children.push({
          id: `ann-removed-${ann.id}`,
          type: 'annotation_removed',
          category: 'annotations',
          label: `删除批注 [${ann.shape}]: ${ann.userName} - ${ann.text || '(无文字)'}`,
          oldValue: ann,
        });
      }
    }

    return {
      id: 'annotations-group',
      type: 'annotation_added',
      category: 'annotations',
      label: `批注变更 (${children.length})`,
      children,
    };
  }
}
