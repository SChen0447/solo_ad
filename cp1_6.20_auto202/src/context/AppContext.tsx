import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppState, ChallengeRecord, EmotionRecord, DayRecord } from '../types';

interface AppContextType extends AppState {
  setCurrentPage: (page: 'challenge' | 'emotion' | 'calendar') => void;
  saveChallenge: (record: ChallengeRecord) => void;
  saveEmotion: (record: EmotionRecord) => void;
  getDayRecord: (date: string) => DayRecord | undefined;
  getMonthRecords: (year: number, month: number) => Record<string, DayRecord>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY = 'daily-color-challenge-data';

const formatDate = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const loadFromStorage = (): Record<string, DayRecord> => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
};

const saveToStorage = (records: Record<string, DayRecord>) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    console.error('Failed to save to localStorage');
  }
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [records, setRecords] = useState<Record<string, DayRecord>>(() => loadFromStorage());
  const [currentPage, setCurrentPage] = useState<'challenge' | 'emotion' | 'calendar'>('challenge');

  const today = formatDate(new Date());

  useEffect(() => {
    saveToStorage(records);
  }, [records]);

  const user = {
    name: '用户',
    totalScore: Object.values(records).reduce((sum, r) => sum + (r.challenge?.score || 0), 0),
  };

  const todayChallenge = records[today]?.challenge;
  const todayEmotion = records[today]?.emotion;

  const saveChallenge = (record: ChallengeRecord) => {
    setRecords(prev => ({
      ...prev,
      [record.date]: {
        ...prev[record.date],
        date: record.date,
        challenge: record,
      },
    }));
  };

  const saveEmotion = (record: EmotionRecord) => {
    setRecords(prev => ({
      ...prev,
      [record.date]: {
        ...prev[record.date],
        date: record.date,
        emotion: record,
      },
    }));
  };

  const getDayRecord = (date: string): DayRecord | undefined => {
    return records[date];
  };

  const getMonthRecords = (year: number, month: number): Record<string, DayRecord> => {
    const result: Record<string, DayRecord> = {};
    Object.entries(records).forEach(([date, record]) => {
      const [y, m] = date.split('-').map(Number);
      if (y === year && m === month + 1) {
        result[date] = record;
      }
    });
    return result;
  };

  return (
    <AppContext.Provider
      value={{
        user,
        todayChallenge,
        todayEmotion,
        records,
        currentPage,
        setCurrentPage,
        saveChallenge,
        saveEmotion,
        getDayRecord,
        getMonthRecords,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
