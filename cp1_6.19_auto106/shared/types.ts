export interface Member {
  id: string;
  username: string;
  online: boolean;
  isOwner: boolean;
}

export interface Location {
  name: string;
  lat: number;
  lng: number;
}

export interface Schedule {
  id: string;
  tripId: string;
  dayKey: string;
  time: string;
  title: string;
  location: Location;
  notes?: string;
  budget: number;
}

export interface Expense {
  id: string;
  tripId: string;
  scheduleId?: string;
  description: string;
  amount: number;
  paidBy: string;
  splitAmong: string[];
}

export interface Trip {
  id: string;
  name: string;
  ownerId: string;
  members: Member[];
  schedules: Schedule[];
  expenses: Expense[];
}

export interface Settlement {
  memberId: string;
  username: string;
  paid: number;
  owed: number;
  balance: number;
}

export type ClientMessage =
  | { type: 'JOIN_TRIP'; tripId: string; username: string }
  | { type: 'LEAVE_TRIP'; tripId: string }
  | { type: 'ADD_SCHEDULE'; tripId: string; schedule: Schedule }
  | { type: 'UPDATE_SCHEDULE'; tripId: string; schedule: Schedule }
  | { type: 'DELETE_SCHEDULE'; tripId: string; scheduleId: string }
  | { type: 'REORDER_SCHEDULES'; tripId: string; dayKey: string; order: string[] }
  | { type: 'ADD_EXPENSE'; tripId: string; expense: Expense }
  | { type: 'INVITE_MEMBER'; tripId: string; username: string };

export type ServerMessage =
  | { type: 'TRIP_STATE'; trip: Trip }
  | { type: 'SCHEDULE_ADDED'; schedule: Schedule }
  | { type: 'SCHEDULE_UPDATED'; schedule: Schedule }
  | { type: 'SCHEDULE_DELETED'; scheduleId: string }
  | { type: 'SCHEDULES_REORDERED'; dayKey: string; order: string[] }
  | { type: 'EXPENSE_ADDED'; expense: Expense }
  | { type: 'MEMBER_JOINED'; member: Member }
  | { type: 'MEMBER_LEFT'; memberId: string }
  | { type: 'MEMBER_STATUS_CHANGED'; memberId: string; online: boolean };
