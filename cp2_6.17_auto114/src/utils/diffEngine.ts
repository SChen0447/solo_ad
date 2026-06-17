import * as Diff from 'diff';

export type DiffOperation = 'added' | 'removed' | 'modified' | 'unchanged';

export interface DiffLine {
  oldLineNumber: number | null;
  newLineNumber: number | null;
  operation: DiffOperation;
  text: string;
}

export function computeDiff(original: string, modified: string): DiffLine[] {
  const changes = Diff.diffLines(original, modified);
  const result: DiffLine[] = [];
  let oldLine = 1;
  let newLine = 1;

  for (let i = 0; i < changes.length; i++) {
    const change = changes[i];
    const lines = change.value.replace(/\n$/, '').split('\n');

    if (change.removed && i + 1 < changes.length && changes[i + 1].added) {
      const nextChange = changes[i + 1];
      const addedLines = nextChange.value.replace(/\n$/, '').split('\n');
      const maxLen = Math.max(lines.length, addedLines.length);

      for (let j = 0; j < maxLen; j++) {
        const hasOld = j < lines.length;
        const hasNew = j < addedLines.length;
        result.push({
          oldLineNumber: hasOld ? oldLine++ : null,
          newLineNumber: hasNew ? newLine++ : null,
          operation: hasOld && hasNew ? 'modified' : hasOld ? 'removed' : 'added',
          text: hasNew ? addedLines[j] : lines[j],
        });
      }
      i++;
    } else if (change.removed) {
      for (const line of lines) {
        result.push({ oldLineNumber: oldLine++, newLineNumber: null, operation: 'removed', text: line });
      }
    } else if (change.added) {
      for (const line of lines) {
        result.push({ oldLineNumber: null, newLineNumber: newLine++, operation: 'added', text: line });
      }
    } else {
      for (const line of lines) {
        result.push({ oldLineNumber: oldLine++, newLineNumber: newLine++, operation: 'unchanged', text: line });
      }
    }
  }

  return result;
}
