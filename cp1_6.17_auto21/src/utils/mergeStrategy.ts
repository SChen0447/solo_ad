import { v4 as uuidv4 } from 'uuid';
import type { Op, ConflictLog, MergeResult, DiffResult } from '../types';
import { diffLines, Change } from 'diff';

function opsOverlap(op1: Op, op2: Op): boolean {
  const op1End = op1.type === 'insert' && op1.text ? op1.from + op1.text.length : op1.to;
  const op2End = op2.type === 'insert' && op2.text ? op2.from + op2.text.length : op2.to;
  
  return !(op1End <= op2.from || op2End <= op1.from);
}

function applyOpToCode(code: string, op: Op): string {
  if (op.type === 'insert') {
    return code.slice(0, op.from) + (op.text || '') + code.slice(op.from);
  } else if (op.type === 'delete') {
    return code.slice(0, op.from) + code.slice(op.to);
  } else if (op.type === 'replace') {
    return code.slice(0, op.from) + (op.text || '') + code.slice(op.to);
  }
  return code;
}

export function mergeOperations(
  localOps: Op[],
  remoteOps: Op[],
  baseCode: string
): MergeResult {
  const conflicts: ConflictLog[] = [];
  const mergedOps: Op[] = [];
  
  const allOps = [...localOps, ...remoteOps].sort((a, b) => a.timestamp - b.timestamp);
  
  let appliedOps: Op[] = [];
  
  for (const op of allOps) {
    const overlappingOps = appliedOps.filter((applied) => opsOverlap(applied, op));
    
    if (overlappingOps.length > 0) {
      for (const overlappingOp of overlappingOps) {
        const isLocal = localOps.includes(op);
        const isOverlappingLocal = localOps.includes(overlappingOp);
        
        let resolvedBy: 'local' | 'remote';
        if (op.timestamp >= overlappingOp.timestamp) {
          resolvedBy = isLocal ? 'local' : 'remote';
        } else {
          resolvedBy = isOverlappingLocal ? 'local' : 'remote';
        }
        
        conflicts.push({
          id: uuidv4(),
          timestamp: Date.now(),
          position: Math.min(op.from, overlappingOp.from),
          localOp: isLocal ? op : overlappingOp,
          remoteOp: isLocal ? overlappingOp : op,
          resolvedBy,
        });
      }
      
      const hasNewerOverlap = overlappingOps.some(
        (o) => o.timestamp > op.timestamp
      );
      
      if (!hasNewerOverlap) {
        mergedOps.push(op);
        appliedOps.push(op);
      }
    } else {
      mergedOps.push(op);
      appliedOps.push(op);
    }
  }
  
  let mergedCode = baseCode;
  const sortedMergedOps = [...mergedOps].sort((a, b) => b.from - a.from);
  for (const op of sortedMergedOps) {
    mergedCode = applyOpToCode(mergedCode, op);
  }
  
  return {
    mergedOps,
    conflicts,
    mergedCode,
  };
}

export function computeDiff(oldCode: string, newCode: string): DiffResult[] {
  const changes = diffLines(oldCode, newCode);
  const results: DiffResult[] = [];
  
  let newLineNumber = 1;
  let oldLineNumber = 1;
  
  for (const change of changes) {
    const lines = change.value.split('\n');
    if (lines[lines.length - 1] === '') {
      lines.pop();
    }
    
    for (const line of lines) {
      if (change.added) {
        results.push({
          type: 'added',
          value: line,
          lineNumber: newLineNumber,
        });
        newLineNumber++;
      } else if (change.removed) {
        results.push({
          type: 'removed',
          value: line,
          lineNumber: -1,
          oldLineNumber,
        });
        oldLineNumber++;
      } else {
        const nextChange = changes[changes.indexOf(change) + 1];
        const prevChange = changes[changes.indexOf(change) - 1];
        
        if (nextChange && nextChange.added && prevChange && prevChange.removed) {
          results.push({
            type: 'modified',
            value: line,
            lineNumber: newLineNumber,
            oldLineNumber,
          });
        } else {
          results.push({
            type: 'unchanged',
            value: line,
            lineNumber: newLineNumber,
            oldLineNumber,
          });
        }
        newLineNumber++;
        oldLineNumber++;
      }
    }
  }
  
  return results;
}

export function applyDiff(
  currentCode: string,
  targetCode: string
): { code: string; ops: Op[]; conflicts: ConflictLog[] } {
  const differences = diffLines(currentCode, targetCode);
  const ops: Op[] = [];
  let position = 0;
  let currentCodeCopy = currentCode;
  
  for (const change of differences) {
    if (change.removed) {
      const endPos = position + change.value.length;
      ops.push({
        type: 'delete',
        from: position,
        to: endPos,
        timestamp: Date.now(),
        userId: 'merge',
      });
      currentCodeCopy = currentCodeCopy.slice(0, position) + currentCodeCopy.slice(endPos);
    } else if (change.added) {
      ops.push({
        type: 'insert',
        from: position,
        to: position,
        text: change.value,
        timestamp: Date.now(),
        userId: 'merge',
      });
      currentCodeCopy = currentCodeCopy.slice(0, position) + change.value + currentCodeCopy.slice(position);
      position += change.value.length;
    } else {
      position += change.value.length;
    }
  }
  
  const { conflicts } = mergeOperations([], ops, currentCode);
  
  return {
    code: currentCodeCopy,
    ops,
    conflicts,
  };
}

export function formatConflictMessage(conflicts: ConflictLog[]): string {
  if (conflicts.length === 0) return '';
  if (conflicts.length === 1) {
    return `检测到1处冲突，已采用${conflicts[0].resolvedBy === 'local' ? '本地' : '远程'}版本`;
  }
  return `检测到${conflicts.length}处冲突，已自动采用最新版本`;
}
