import * as Diff from 'diff';
import type { DiffLine, DiffLineType } from '../types';

interface Change {
  value: string;
  added?: boolean;
  removed?: boolean;
}

export function computeDiff(oldCode: string, newCode: string): DiffLine[] {
  const changes: Change[] = Diff.diffLines(oldCode, newCode);
  const result: DiffLine[] = [];
  let lineNumber = 0;
  let oldLineNumber = 0;
  let newLineNumber = 0;

  const processed: Array<{
    type: DiffLineType;
    content: string;
    oldLine: number | null;
    newLine: number | null;
  }> = [];

  for (const change of changes) {
    const lines = change.value.replace(/\n$/, '').split('\n');
    for (const line of lines) {
      let type: DiffLineType = 'context';
      if (change.added) type = 'add';
      else if (change.removed) type = 'remove';

      oldLineNumber++;
      newLineNumber++;
      let oLine: number | null = null;
      let nLine: number | null = null;

      if (type === 'remove') {
        oLine = oldLineNumber;
        newLineNumber--;
        nLine = null;
      } else if (type === 'add') {
        nLine = newLineNumber;
        oldLineNumber--;
        oLine = null;
      } else {
        oLine = oldLineNumber;
        nLine = newLineNumber;
      }

      processed.push({ type, content: line, oldLine: oLine, newLine: nLine });
    }
  }

  const merged = mergeConsecutiveRemoveAdd(processed);

  let blockStartIdx = -1;
  for (let i = 0; i < merged.length; i++) {
    const item = merged[i];
    lineNumber++;
    const diffLine: DiffLine = {
      lineNumber,
      oldLineNumber: item.oldLine,
      newLineNumber: item.newLine,
      content: item.content,
      type: item.type,
    };

    if (item.type !== 'context') {
      if (blockStartIdx === -1) {
        blockStartIdx = result.length;
      }
    } else {
      if (blockStartIdx !== -1) {
        markBlock(result, blockStartIdx, result.length - 1);
        blockStartIdx = -1;
      }
    }

    result.push(diffLine);
  }

  if (blockStartIdx !== -1) {
    markBlock(result, blockStartIdx, result.length - 1);
  }

  return result;
}

function mergeConsecutiveRemoveAdd(
  items: Array<{
    type: DiffLineType;
    content: string;
    oldLine: number | null;
    newLine: number | null;
  }>
) {
  const result: typeof items = [];
  let i = 0;
  while (i < items.length) {
    if (items[i].type === 'remove') {
      const removeBlock: typeof items = [];
      while (i < items.length && items[i].type === 'remove') {
        removeBlock.push(items[i]);
        i++;
      }
      const addBlock: typeof items = [];
      while (i < items.length && items[i].type === 'add') {
        addBlock.push(items[i]);
        i++;
      }
      const maxLen = Math.max(removeBlock.length, addBlock.length);
      for (let j = 0; j < maxLen; j++) {
        if (j < removeBlock.length && j < addBlock.length) {
          result.push({
            type: 'modify',
            content: `${removeBlock[j].content} → ${addBlock[j].content}`,
            oldLine: removeBlock[j].oldLine,
            newLine: addBlock[j].newLine,
          });
        } else if (j < removeBlock.length) {
          result.push(removeBlock[j]);
        } else {
          result.push(addBlock[j]);
        }
      }
    } else {
      result.push(items[i]);
      i++;
    }
  }
  return result;
}

function markBlock(lines: DiffLine[], startIdx: number, endIdx: number) {
  const first = lines[startIdx];
  const last = lines[endIdx];
  const range =
    first.lineNumber === last.lineNumber
      ? `第${first.lineNumber}行`
      : `第${first.lineNumber}-${last.lineNumber}行`;

  lines[startIdx] = { ...lines[startIdx], blockStart: true, blockRange: range };
  lines[endIdx] = { ...lines[endIdx], blockEnd: true };
}

export function highlightCode(code: string, _language?: string): string {
  return escapeHtml(code);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
