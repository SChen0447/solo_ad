import { diffLines } from 'diff';
import { Conflict, User } from '../types';

export function detectConflicts(
  originalCode: string,
  localCode: string,
  remoteCode: string,
  remoteUser: User
): Conflict[] {
  const conflicts: Conflict[] = [];
  
  const localChanges = diffLines(originalCode, localCode);
  const remoteChanges = diffLines(originalCode, remoteCode);
  
  let localLineNum = 1;
  let remoteLineNum = 1;
  let origLineNum = 1;
  
  const modifiedLocal: { line: number; content: string 
}[] = [];
  const modifiedRemote: { line: number; content: string 
}[] = [];
  
  for (const change of localChanges) {
    const lines = change.value.split('\n').filter(l => l !== '' || change.value === '\n');
    if (change.added) {
      for (const line of lines) {
        if (line !== '' || lines.length > 1) {
          modifiedLocal.push({ line: localLineNum, content: line });
          localLineNum++;
        }
      }
    } else if (change.removed) {
      for (const line of lines) {
        if (line !== '' || lines.length > 1) {
          modifiedLocal.push({ line: localLineNum, content: line });
        }
      }
    } else {
      localLineNum += lines.filter(l => l !== '' || lines.length > 1).length;
    }
  }
  
  for (const change of remoteChanges) {
    const lines = change.value.split('\n').filter(l => l !== '' || change.value === '\n');
    if (change.added || change.removed) {
      for (const line of lines) {
        if (line !== '' || lines.length > 1) {
          modifiedRemote.push({ line: remoteLineNum, content: line });
          if (!change.removed) remoteLineNum++;
        }
      }
    } else {
      remoteLineNum += lines.filter(l => l !== '' || lines.length > 1).length;
    }
  }
  
  const originalLines = originalCode.split('\n');
  const localLines = localCode.split('\n');
  const remoteLines = remoteCode.split('\n');
  
  const maxLines = Math.max(localLines.length, remoteLines.length);
  
  for (let i = 0; i < maxLines; i++) {
    const localLine = localLines[i] || '';
    const remoteLine = remoteLines[i] || '';
    const origLine = originalLines[i] || '';
    
    const localChanged = localLine !== origLine;
    const remoteChanged = remoteLine !== origLine;
    
    if (localChanged && remoteChanged && localLine !== remoteLine) {
      conflicts.push({
        lineNumber: i + 1,
        originalCode: origLine,
        modifiedCode: localLine,
        userId: remoteUser.id,
        userName: remoteUser.name,
      });
    }
  }
  
  return conflicts;
}

export function generateVersionSummary(code: string, maxLength: number = 50): string {
  const trimmed = code.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return trimmed.substring(0, maxLength) + '...';
}

export const USER_COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
  '#FFEAA7',
  '#DDA0DD',
  '#98D8C8',
  '#F7DC6F',
  '#BB8FCE',
  '#85C1E9',
];

export function getRandomColor(): string {
  return USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];
}
