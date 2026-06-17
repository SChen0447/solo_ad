import * as Diff from 'diff';

export type DiffLineStatus = 'added' | 'removed' | 'changed' | 'unchanged';

export interface DiffLine {
  lineNumber: number;
  status: DiffLineStatus;
  text: string;
  leftText?: string;
  rightText?: string;
  leftLineNumber?: number;
  rightLineNumber?: number;
}

export interface DiffResult {
  leftLines: DiffLine[];
  rightLines: DiffLine[];
}

export function compare(textA: string, textB: string): DiffResult {
  const changes = Diff.diffLines(textA, textB);

  const leftLines: DiffLine[] = [];
  const rightLines: DiffLine[] = [];
  let leftLineNum = 0;
  let rightLineNum = 0;

  for (const change of changes) {
    const lines = (change.value.endsWith('\n')
      ? change.value.slice(0, -1)
      : change.value
    ).split('\n');

    if (lines.length === 1 && lines[0] === '') {
      continue;
    }

    if (change.added) {
      for (const line of lines) {
        rightLineNum++;
        rightLines.push({
          lineNumber: rightLineNum,
          status: 'added',
          text: line,
          rightLineNumber: rightLineNum,
        });
      }
    } else if (change.removed) {
      for (const line of lines) {
        leftLineNum++;
        leftLines.push({
          lineNumber: leftLineNum,
          status: 'removed',
          text: line,
          leftLineNumber: leftLineNum,
        });
      }
    } else {
      for (const line of lines) {
        leftLineNum++;
        rightLineNum++;
        leftLines.push({
          lineNumber: leftLineNum,
          status: 'unchanged',
          text: line,
          leftLineNumber: leftLineNum,
        });
        rightLines.push({
          lineNumber: rightLineNum,
          status: 'unchanged',
          text: line,
          rightLineNumber: rightLineNum,
        });
      }
    }
  }

  alignChangedLines(leftLines, rightLines);

  return { leftLines, rightLines };
}

function alignChangedLines(leftLines: DiffLine[], rightLines: DiffLine[]): void {
  const maxLen = Math.max(leftLines.length, rightLines.length);
  const leftRemovedIndices: number[] = [];
  const rightAddedIndices: number[] = [];

  for (let i = 0; i < leftLines.length; i++) {
    if (leftLines[i].status === 'removed') {
      leftRemovedIndices.push(i);
    }
  }
  for (let i = 0; i < rightLines.length; i++) {
    if (rightLines[i].status === 'added') {
      rightAddedIndices.push(i);
    }
  }

  const pairCount = Math.min(leftRemovedIndices.length, rightAddedIndices.length);
  for (let p = 0; p < pairCount; p++) {
    const li = leftRemovedIndices[p];
    const ri = rightAddedIndices[p];
    leftLines[li].status = 'changed';
    rightLines[ri].status = 'changed';
    leftLines[li].leftText = leftLines[li].text;
    leftLines[li].rightText = rightLines[ri].text;
    rightLines[ri].leftText = leftLines[li].text;
    rightLines[ri].rightText = rightLines[ri].text;
  }
}

export function getMergedCode(leftCode: string, rightCode: string): string {
  const { leftLines, rightLines } = compare(leftCode, rightCode);
  const result: string[] = [];

  let ri = 0;
  for (const leftLine of leftLines) {
    if (leftLine.status === 'unchanged') {
      result.push(leftLine.text);
    } else if (leftLine.status === 'changed') {
      while (ri < rightLines.length && rightLines[ri].status !== 'changed') {
        if (rightLines[ri].status === 'added') {
          result.push(rightLines[ri].text);
        }
        ri++;
      }
      if (ri < rightLines.length && rightLines[ri].status === 'changed') {
        result.push(rightLines[ri].text);
        ri++;
      }
    }
  }

  while (ri < rightLines.length) {
    if (rightLines[ri].status === 'added' || rightLines[ri].status === 'changed') {
      result.push(rightLines[ri].text);
    }
    ri++;
  }

  return result.join('\n');
}
