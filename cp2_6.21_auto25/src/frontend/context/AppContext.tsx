import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { Pet, Application, MatchResult, FollowUp, FollowUpReminder } from '../../../shared/types';

interface AppState {
  pets: Pet[];
  applications: Application[];
  followUps: FollowUp[];
  reminders: FollowUpReminder[];
  selectedPet: Pet | null;
  showDetail: boolean;
  showApplicationForm: boolean;
  loading: boolean;
}

interface AppContextType extends AppState {
  fetchPets: () => Promise<void>;
  fetchApplications: () => Promise<void>;
  fetchFollowUps: () => Promise<void>;
  fetchReminders: () => Promise<void>;
  addPet: (pet: Omit<Pet, 'id' | 'createdAt'>) => Promise<void>;
  submitApplication: (app: Omit<Application, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  updateApplicationStatus: (id: string, status: 'pending' | 'approved' | 'rejected') => Promise<void>;
  addFollowUp: (fu: Omit<FollowUp, 'id' | 'createdAt' | 'isArchived'>) => Promise<void>;
  getMatches: (petId: string) => Promise<MatchResult[]>;
  selectPet: (pet: Pet | null) => void;
  setShowDetail: (show: boolean) => void;
  setShowApplicationForm: (show: boolean) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function useAppContext(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [pets, setPets] = useState<Pet[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [reminders, setReminders] = useState<FollowUpReminder[]>([]);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchPets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/pets');
      const data = await res.json();
      setPets(data);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchApplications = useCallback(async () => {
    const res = await fetch('/api/applications');
    const data = await res.json();
    setApplications(data);
  }, []);

  const fetchFollowUps = useCallback(async () => {
    const res = await fetch('/api/followups');
    const data = await res.json();
    setFollowUps(data);
  }, []);

  const fetchReminders = useCallback(async () => {
    const res = await fetch('/api/followups/reminders');
    const data = await res.json();
    setReminders(data);
  }, []);

  const addPet = useCallback(async (pet: Omit<Pet, 'id' | 'createdAt'>) => {
    const res = await fetch('/api/pets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pet),
    });
    const newPet = await res.json();
    setPets((prev) => [...prev, newPet]);
  }, []);

  const submitApplication = useCallback(async (app: Omit<Application, 'id' | 'createdAt' | 'status'>) => {
    const res = await fetch('/api/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(app),
    });
    const newApp = await res.json();
    setApplications((prev) => [...prev, newApp]);
  }, []);

  const updateApplicationStatus = useCallback(async (id: string, status: 'pending' | 'approved' | 'rejected') => {
    const res = await fetch(`/api/applications/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const updated = await res.json();
    setApplications((prev) => prev.map((a) => (a.id === id ? updated : a)));
  }, []);

  const addFollowUp = useCallback(async (fu: Omit<FollowUp, 'id' | 'createdAt' | 'isArchived'>) => {
    const res = await fetch('/api/followups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fu),
    });
    const newFu = await res.json();
    setFollowUps((prev) => [...prev, newFu]);
  }, []);

  const getMatches = useCallback(async (petId: string): Promise<MatchResult[]> => {
    const res = await fetch(`/api/matches/${petId}`);
    return res.json();
  }, []);

  const selectPet = useCallback((pet: Pet | null) => {
    setSelectedPet(pet);
    if (pet) setShowDetail(true);
  }, []);

  useEffect(() => {
    fetchPets();
    fetchApplications();
    fetchFollowUps();
    fetchReminders();
  }, [fetchPets, fetchApplications, fetchFollowUps, fetchReminders]);

  return (
    <AppContext.Provider
      value={{
        pets,
        applications,
        followUps,
        reminders,
        selectedPet,
        showDetail,
        showApplicationForm,
        loading,
        fetchPets,
        fetchApplications,
        fetchFollowUps,
        fetchReminders,
        addPet,
        submitApplication,
        updateApplicationStatus,
        addFollowUp,
        getMatches,
        selectPet,
        setShowDetail,
        setShowApplicationForm,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
