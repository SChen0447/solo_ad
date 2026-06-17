import * as Diff from 'diff';

export type DiffOperation = 'added' | 'removed' | 'modified' | 'unchanged';

export interface CharSegment {
  text: string;
  operation: 'added' | 'removed' | 'unchanged';
  startIndex: number;
  endIndex: number;
}

export interface DiffLine {
  oldLineNumber: number | null;
  newLineNumber: number | null;
  operation: DiffOperation;
  text: string;
  charDiff: CharSegment[];
}

function computeCharDiff(oldText: string, newText: string): {
  oldSegments: CharSegment[];
  newSegments: CharSegment[];
} {
  const changes = Diff.diffChars(oldText, newText);
  const oldSegments: CharSegment[] = [];
  const newSegments: CharSegment[] = [];
  let oldIdx = 0;
  let newIdx = 0;

  for (const c of changes) {
    if (c.removed) {
      oldSegments.push({
        text: c.value,
        operation: 'removed',
        startIndex: oldIdx,
        endIndex: oldIdx + c.value.length,
      });
      oldIdx += c.value.length;
    } else if (c.added) {
      newSegments.push({
        text: c.value,
        operation: 'added',
        startIndex: newIdx,
        endIndex: newIdx + c.value.length,
      });
      newIdx += c.value.length;
    } else {
      oldSegments.push({
        text: c.value,
        operation: 'unchanged',
        startIndex: oldIdx,
        endIndex: oldIdx + c.value.length,
      });
      newSegments.push({
        text: c.value,
        operation: 'unchanged',
        startIndex: newIdx,
        endIndex: newIdx + c.value.length,
      });
      oldIdx += c.value.length;
      newIdx += c.value.length;
    }
  }

  return { oldSegments, newSegments };
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
        const oldText = hasOld ? lines[j] : '';
        const newText = hasNew ? addedLines[j] : '';

        if (hasOld && hasNew) {
          const { oldSegments, newSegments } = computeCharDiff(oldText, newText);
          result.push({
            oldLineNumber: oldLine++,
            newLineNumber: null,
            operation: 'modified',
            text: oldText,
            charDiff: oldSegments,
          });
          result.push({
            oldLineNumber: null,
            newLineNumber: newLine++,
            operation: 'modified',
            text: newText,
            charDiff: newSegments,
          });
        } else if (hasOld) {
          result.push({
            oldLineNumber: oldLine++,
            newLineNumber: null,
            operation: 'removed',
            text: oldText,
            charDiff: [{ text: oldText, operation: 'removed', startIndex: 0, endIndex: oldText.length }],
          });
        } else {
          result.push({
            oldLineNumber: null,
            newLineNumber: newLine++,
            operation: 'added',
            text: newText,
            charDiff: [{ text: newText, operation: 'added', startIndex: 0, endIndex: newText.length }],
          });
        }
      }
      i++;
    } else if (change.removed) {
      for (const line of lines) {
        result.push({
          oldLineNumber: oldLine++,
          newLineNumber: null,
          operation: 'removed',
          text: line,
          charDiff: [{ text: line, operation: 'removed', startIndex: 0, endIndex: line.length }],
        });
      }
    } else if (change.added) {
      for (const line of lines) {
        result.push({
          oldLineNumber: null,
          newLineNumber: newLine++,
          operation: 'added',
          text: line,
          charDiff: [{ text: line, operation: 'added', startIndex: 0, endIndex: line.length }],
        });
      }
    } else {
      for (const line of lines) {
        result.push({
          oldLineNumber: oldLine++,
          newLineNumber: newLine++,
          operation: 'unchanged',
          text: line,
          charDiff: [{ text: line, operation: 'unchanged', startIndex: 0, endIndex: line.length }],
        });
      }
    }
  }

  return result;
}
