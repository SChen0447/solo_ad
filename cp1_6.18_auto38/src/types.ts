export interface Member {
  id: string;
  name: string;
  color: string;
  isOwner: boolean;
  createdAt: string;
}

export interface Medicine {
  id: string;
  name: string;
  specification: string;
  quantity: number;
  expiryDate: string;
  usage: string;
  memberIds: string[];
  createdBy: string;
  createdAt: string;
  dosageSchedule?: {
    timesPerDay?: number;
    intervalHours?: number;
    startTime?: string;
    dosageAmount?: string;
  };
}

export type ReminderType = 'expiry' | 'medication';
export type ReminderStatus = 'pending' | 'completed';
export type ExpirySeverity = 'near' | 'expired';

export interface Reminder {
  id: string;
  type: ReminderType;
  medicineId: string;
  medicineName: string;
  severity?: ExpirySeverity;
  dosageAmount?: string;
  scheduledTime: string;
  status: ReminderStatus;
  message: string;
  createdAt: string;
}

export interface Stats {
  medicinesCount: number;
  pendingRemindersCount: number;
  expiredCount: number;
}
