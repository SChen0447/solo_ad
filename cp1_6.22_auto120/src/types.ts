export type ReadingStatus = 'unread' | 'reading' | 'read';

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  coverUrl: string;
  status: ReadingStatus;
  bookLists: string[];
  addedAt: string;
}

export interface BookList {
  id: string;
  name: string;
  coverUrl: string;
  bookIds: string[];
  createdAt: string;
}

export interface ReadingChallenge {
  id: string;
  name: string;
  monthlyGoal: number;
  totalMinutesGoal: number;
  startDate: string;
  endDate: string;
}

export interface DailyReading {
  date: string;
  minutes: number;
  challengeId: string;
}

export interface ChallengeProgress {
  challenge: ReadingChallenge;
  booksCompleted: number;
  totalMinutesRead: number;
  monthlyProgress: number;
  totalMinutesProgress: number;
  dailyReadings: DailyReading[];
}
