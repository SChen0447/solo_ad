import { diffLines, Change } from 'diff';
import { DiffLine, DiffResult, DiffLineType } from '../types';

export function computeDiff(oldCode: string, newCode: string): DiffResult {
  const changes = diffLines(oldCode, newCode);
  
  const leftLines: DiffLine[] = [];
  const rightLines: DiffLine[] = [];
  
  let leftLineNum = 1;
  let rightLineNum = 1;
  
  for (const change of changes) {
    const lines = change.value.split('\n');
    if (lines[lines.length - 1] === '') {
      lines.pop();
    }
    
    if (change.added) {
      for (const line of lines) {
        rightLines.push({
          type: 'added',
          content: line,
          lineNumber: rightLineNum++,
        });
        leftLines.push({
          type: 'unchanged',
          content: '',
          lineNumber: -1,
        });
      }
    } else if (change.removed) {
      for (const line of lines) {
        leftLines.push({
          type: 'removed',
          content: line,
          lineNumber: leftLineNum++,
        });
        rightLines.push({
          type: 'unchanged',
          content: '',
          lineNumber: -1,
        });
      }
    } else {
      for (const line of lines) {
        leftLines.push({
          type: 'unchanged',
          content: line,
          lineNumber: leftLineNum++,
        });
        rightLines.push({
          type: 'unchanged',
          content: line,
          lineNumber: rightLineNum++,
        });
      }
    }
  }
  
  return { leftLines, rightLines };
}

export function getLineDiffType(change: Change): DiffLineType {
  if (change.added) return 'added';
  if (change.removed) return 'removed';
  return 'unchanged';
}
