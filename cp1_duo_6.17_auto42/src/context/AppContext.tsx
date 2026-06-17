import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { Material, Schedule } from '../types';
import { materialApi, scheduleApi, tagApi } from '../api';

interface AppContextType {
  materials: Material[];
  schedules: Schedule[];
  tags: string[];
  selectedSchedule: Schedule | null;
  selectedMaterialId: string | null;
  loading: boolean;
  fetchMaterials: () => Promise<void>;
  fetchSchedules: () => Promise<void>;
  fetchTags: () => Promise<void>;
  setSelectedSchedule: (schedule: Schedule | null) => void;
  setSelectedMaterialId: (id: string | null) => void;
  refreshAll: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchMaterials = useCallback(async () => {
    try {
      setLoading(true);
      const data = await materialApi.list();
      setMaterials(data);
    } catch (err) {
      console.error('获取素材列表失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSchedules = useCallback(async () => {
    try {
      setLoading(true);
      const data = await scheduleApi.list();
      setSchedules(data);
    } catch (err) {
      console.error('获取排期列表失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTags = useCallback(async () => {
    try {
      const data = await tagApi.list();
      setTags(data);
    } catch (err) {
      console.error('获取标签列表失败:', err);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchMaterials(), fetchSchedules(), fetchTags()]);
    setLoading(false);
  }, [fetchMaterials, fetchSchedules, fetchTags]);

  return (
    <AppContext.Provider
      value={{
        materials,
        schedules,
        tags,
        selectedSchedule,
        selectedMaterialId,
        loading,
        fetchMaterials,
        fetchSchedules,
        fetchTags,
        setSelectedSchedule,
        setSelectedMaterialId,
        refreshAll,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
