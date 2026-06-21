import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { Pet, Application, AdoptionRecord, MatchResult, ToastMessage, FollowUpRecord } from '../types';

interface AppContextType {
  pets: Pet[];
  applications: Application[];
  adoptionRecords: AdoptionRecord[];
  loading: boolean;
  toasts: ToastMessage[];
  loadPets: () => Promise<void>;
  loadApplications: () => Promise<void>;
  loadAdoptionRecords: () => Promise<void>;
  addPet: (pet: Omit<Pet, 'id' | 'createdAt'>) => Promise<void>;
  submitApplication: (app: Omit<Application, 'id' | 'status' | 'createdAt'>) => Promise<void>;
  updateApplicationStatus: (id: string, status: Application['status']) => Promise<void>;
  getMatches: (petId: string) => Promise<MatchResult[]>;
  confirmAdoption: (applicationId: string, petId: string) => Promise<void>;
  addFollowUp: (record: Omit<FollowUpRecord, 'id'>) => Promise<void>;
  addToast: (type: ToastMessage['type'], message: string) => void;
  removeToast: (id: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [pets, setPets] = useState<Pet[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [adoptionRecords, setAdoptionRecords] = useState<AdoptionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((type: ToastMessage['type'], message: string) => {
    const id = `toast_${Date.now()}`;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const loadPets = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/pets');
      const data = await res.json();
      setPets(data);
    } catch (err) {
      console.error('Failed to load pets:', err);
      addToast('error', '加载宠物列表失败');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  const loadApplications = useCallback(async () => {
    try {
      const res = await fetch('/api/applications');
      const data = await res.json();
      setApplications(data);
    } catch (err) {
      console.error('Failed to load applications:', err);
    }
  }, []);

  const loadAdoptionRecords = useCallback(async () => {
    try {
      const res = await fetch('/api/adoptions');
      const data = await res.json();
      setAdoptionRecords(data);
    } catch (err) {
      console.error('Failed to load adoption records:', err);
    }
  }, []);

  const addPet = useCallback(async (pet: Omit<Pet, 'id' | 'createdAt'>) => {
    try {
      setLoading(true);
      const res = await fetch('/api/pets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pet)
      });
      const newPet = await res.json();
      setPets(prev => [...prev, newPet]);
      addToast('success', '宠物信息添加成功');
    } catch (err) {
      console.error('Failed to add pet:', err);
      addToast('error', '添加宠物信息失败');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  const submitApplication = useCallback(async (app: Omit<Application, 'id' | 'status' | 'createdAt'>) => {
    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(app)
      });
      const newApp = await res.json();
      setApplications(prev => [...prev, newApp]);
      addToast('success', '申请提交成功，等待审核');
    } catch (err) {
      console.error('Failed to submit application:', err);
      addToast('error', '申请提交失败');
    }
  }, [addToast]);

  const updateApplicationStatus = useCallback(async (id: string, status: Application['status']) => {
    try {
      const res = await fetch(`/api/applications/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const updated = await res.json();
      setApplications(prev => prev.map(a => a.id === id ? updated : a));
      addToast('success', `申请已${status}`);
    } catch (err) {
      console.error('Failed to update application status:', err);
      addToast('error', '更新申请状态失败');
    }
  }, [addToast]);

  const getMatches = useCallback(async (petId: string): Promise<MatchResult[]> => {
    try {
      const res = await fetch(`/api/matches/${petId}`);
      return await res.json();
    } catch (err) {
      console.error('Failed to get matches:', err);
      return [];
    }
  }, []);

  const confirmAdoption = useCallback(async (applicationId: string, petId: string) => {
    try {
      await fetch('/api/adoptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId, petId })
      });
      await Promise.all([loadPets(), loadApplications(), loadAdoptionRecords()]);
      addToast('success', '领养确认成功');
    } catch (err) {
      console.error('Failed to confirm adoption:', err);
      addToast('error', '确认领养失败');
    }
  }, [addToast, loadPets, loadApplications, loadAdoptionRecords]);

  const addFollowUp = useCallback(async (record: Omit<FollowUpRecord, 'id'>) => {
    try {
      await fetch('/api/followups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record)
      });
      await loadAdoptionRecords();
      addToast('success', '回访记录添加成功');
    } catch (err) {
      console.error('Failed to add follow-up:', err);
      addToast('error', '添加回访记录失败');
    }
  }, [addToast, loadAdoptionRecords]);

  useEffect(() => {
    loadPets();
    loadApplications();
    loadAdoptionRecords();
  }, [loadPets, loadApplications, loadAdoptionRecords]);

  return (
    <AppContext.Provider value={{
      pets,
      applications,
      adoptionRecords,
      loading,
      toasts,
      loadPets,
      loadApplications,
      loadAdoptionRecords,
      addPet,
      submitApplication,
      updateApplicationStatus,
      getMatches,
      confirmAdoption,
      addFollowUp,
      addToast,
      removeToast
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
