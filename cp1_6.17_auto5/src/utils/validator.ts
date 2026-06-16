import { Person, RosterData, ValidationResult, ShiftType, ShiftCell, DaySchedule } from '../types';

export function validateAssignment(
  personId: string,
  dayIndex: number,
  shiftType: ShiftType,
  roster: RosterData,
  people: Person[]
): ValidationResult {
  const person = people.find(p => p.id === personId);
  if (!person) {
    return { valid: false, message: '未找到该人员' };
  }

  if (!person.availableDays.includes(dayIndex)) {
    return { valid: false, message: `${person.name} 当天不可用` };
  }

  const daySchedule = roster[dayIndex];
  if (daySchedule) {
    for (const shift of Object.values(daySchedule) as ShiftCell[]) {
      if (shift.personId === personId) {
        return { valid: false, message: `${person.name} 当天已有排班` };
      }
    }
  }

  let assignedDays = 0;
  let assignedNightDays = 0;
  for (const day of Object.values(roster) as (DaySchedule | undefined)[]) {
    if (!day) continue;
    for (const shift of Object.values(day) as ShiftCell[]) {
      if (shift.personId === personId) {
        assignedDays++;
        if (shift.shiftType === 'night') {
          assignedNightDays++;
        }
      }
    }
  }

  if (assignedDays >= person.maxDaysPerWeek) {
    return { valid: false, message: `${person.name} 已达到每周最大排班天数` };
  }

  if (shiftType === 'night' && assignedNightDays >= person.maxNightDaysPerWeek) {
    return { valid: false, message: `${person.name} 已达到每周最大夜班天数` };
  }

  return { valid: true, message: '' };
}

export function validateSwap(
  day1: number,
  shift1: string,
  day2: number,
  shift2: string,
  roster: RosterData,
  people: Person[]
): ValidationResult {
  const cell1 = roster[day1]?.[shift1];
  const cell2 = roster[day2]?.[shift2];

  if (!cell1 || !cell2) {
    return { valid: false, message: '无效的排班格子' };
  }

  const personId1 = cell1.personId;
  const personId2 = cell2.personId;

  if (personId1 && personId2) {
    const result1 = validateSwapPerson(personId1, day2, cell2.shiftType, roster, people, day1);
    const result2 = validateSwapPerson(personId2, day1, cell1.shiftType, roster, people, day2);

    if (!result1.valid) return result1;
    if (!result2.valid) return result2;
  } else if (personId1) {
    const result = validateSwapPerson(personId1, day2, cell2.shiftType, roster, people, day1);
    if (!result.valid) return result;
  } else if (personId2) {
    const result = validateSwapPerson(personId2, day1, cell1.shiftType, roster, people, day2);
    if (!result.valid) return result;
  } else {
    return { valid: false, message: '两个格子都没有人员' };
  }

  return { valid: true, message: '' };
}

function validateSwapPerson(
  personId: string,
  targetDay: number,
  targetShiftType: ShiftType,
  roster: RosterData,
  people: Person[],
  excludeDay: number
): ValidationResult {
  const person = people.find(p => p.id === personId);
  if (!person) {
    return { valid: false, message: '未找到该人员' };
  }

  if (!person.availableDays.includes(targetDay)) {
    return { valid: false, message: `${person.name} 目标日期不可用` };
  }

  const daySchedule = roster[targetDay];
  if (daySchedule) {
    for (const [shiftKey, shift] of Object.entries(daySchedule) as [string, ShiftCell][]) {
      if (shift.personId === personId && !(targetDay === excludeDay && shiftKey === '')) {
        return { valid: false, message: `${person.name} 目标当天已有排班` };
      }
    }
  }

  let assignedDays = 0;
  let assignedNightDays = 0;

  for (const [dayIdxStr, day] of Object.entries(roster) as [string, DaySchedule | undefined][]) {
    const dayIdx = parseInt(dayIdxStr);
    if (!day) continue;
    for (const shift of Object.values(day) as ShiftCell[]) {
      if (shift.personId === personId) {
        if (dayIdx !== excludeDay) {
          assignedDays++;
          if (shift.shiftType === 'night') {
            assignedNightDays++;
          }
        }
      }
    }
  }

  assignedDays++;

  if (assignedDays > person.maxDaysPerWeek) {
    return { valid: false, message: `${person.name} 超出每周最大排班天数` };
  }

  if (targetShiftType === 'night') {
    assignedNightDays++;
    if (assignedNightDays > person.maxNightDaysPerWeek) {
      return { valid: false, message: `${person.name} 超出每周最大夜班天数` };
    }
  }

  return { valid: true, message: '' };
}

export function getPersonStats(personId: string, roster: RosterData): { days: number; nightDays: number } {
  let days = 0;
  let nightDays = 0;

  for (const day of Object.values(roster) as (DaySchedule | undefined)[]) {
    if (!day) continue;
    for (const shift of Object.values(day) as ShiftCell[]) {
      if (shift.personId === personId) {
        days++;
        if (shift.shiftType === 'night') {
          nightDays++;
        }
      }
    }
  }

  return { days, nightDays };
}
