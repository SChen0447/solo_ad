export interface FestivalEvent {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  stageCount: number;
  stages: Stage[];
  sessions: Session[];
}

export interface Stage {
  id: string;
  name: string;
  order: number;
}

export interface Session {
  id: string;
  eventId: string;
  bandName: string;
  stageId: string;
  startTime: string;
  duration: number;
  notes: string;
  color: string;
  lockedBy: string | null;
}

export interface User {
  username: string;
  color: string;
}
