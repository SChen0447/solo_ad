export type ShiftType = 'morning' | 'afternoon' | 'night';

export interface Person {
  id: string;
  name: string;
  availableDays: number[];
  preferredShifts: ShiftType[];
  maxDaysPerWeek: number;
  maxNightDaysPerWeek: number;
}

export interface ShiftCell {
  personId: string | null;
  shiftType: ShiftType;
  note?: string;
}

export interface DaySchedule {
  [key: string]: ShiftCell;
}

export interface RosterData {
  [dayIndex: number]: DaySchedule;
}

export interface ValidationResult {
  valid: boolean;
  message: string;
}

export interface ContextMenuPosition {
  x: number;
  y: number;
}

export interface SwapState {
  active: boolean;
  sourceDay: number | null;
  sourceShift: string | null;
}
