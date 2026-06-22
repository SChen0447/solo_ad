import { Activity, ConflictInfo } from '../types';

const CONFLICT_THRESHOLD_MINUTES = 10;

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function detectConflict(
  activity1: Activity,
  activity2: Activity
): ConflictInfo {
  if (activity1.date !== activity2.date) {
    return {
      hasConflict: false,
      overlappingMinutes: 0,
      conflictingActivityId: '',
      conflictingActivityTitle: ''
    };
  }

  const start1 = timeToMinutes(activity1.startTime);
  const end1 = timeToMinutes(activity1.endTime);
  const start2 = timeToMinutes(activity2.startTime);
  const end2 = timeToMinutes(activity2.endTime);

  const overlapStart = Math.max(start1, start2);
  const overlapEnd = Math.min(end1, end2);
  const overlappingMinutes = Math.max(0, overlapEnd - overlapStart);

  const hasConflict = overlappingMinutes > CONFLICT_THRESHOLD_MINUTES;

  return {
    hasConflict,
    overlappingMinutes,
    conflictingActivityId: hasConflict ? activity2.id : '',
    conflictingActivityTitle: hasConflict ? activity2.title : ''
  };
}

export function detectConflictsWithList(
  newActivity: Activity,
  existingActivities: Activity[]
): ConflictInfo[] {
  const conflicts: ConflictInfo[] = [];
  
  for (const existing of existingActivities) {
    if (existing.id === newActivity.id) continue;
    
    const conflict = detectConflict(newActivity, existing);
    if (conflict.hasConflict) {
      conflicts.push(conflict);
    }
  }
  
  return conflicts;
}
