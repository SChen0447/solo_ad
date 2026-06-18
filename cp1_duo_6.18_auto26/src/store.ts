import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { encryptContent, decryptContent, generateKeyFromDate, hashDate } from './modules/encryption';
import { getRemainingTime, validateTargetDate } from './modules/timeManager';

export interface Capsule {
  id: string;
  title: string;
  recipient: string;
  encryptedContent: string;
  targetDate: string;
  createdAt: string;
  reminderType: 'browser' | 'email';
  email?: string;
  isUnlocked: boolean;
  encryptionKeyHash: string;
}

interface CapsuleFormData {
  targetDate: Date | null;
  recipient: string;
  title: string;
  content: string;
  reminderType: 'browser' | 'email';
  email: string;
}

interface AppState {
  capsules: Capsule[];
  currentCapsule: Capsule | null;
  isModalOpen: boolean;
  isPreviewOpen: boolean;
  celebratingCapsuleId: string | null;
  formData: CapsuleFormData;
  currentStep: number;
  addCapsule: (capsule: Omit<Capsule, 'id' | 'createdAt' | 'isUnlocked' | 'encryptionKeyHash'>) => Promise<void>;
  unlockCapsule: (id: string) => Promise<string | null>;
  setCurrentCapsule: (capsule: Capsule | null) => void;
  setModalOpen: (open: boolean) => void;
  setPreviewOpen: (open: boolean) => void;
  setCelebratingCapsuleId: (id: string | null) => void;
  setFormData: (data: Partial<CapsuleFormData>) => void;
  setCurrentStep: (step: number) => void;
  resetForm: () => void;
  checkAndUnlockExpired: () => void;
}

const initialFormData: CapsuleFormData = {
  targetDate: null,
  recipient: '',
  title: '',
  content: '',
  reminderType: 'browser',
  email: '',
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      capsules: [],
      currentCapsule: null,
      isModalOpen: false,
      isPreviewOpen: false,
      celebratingCapsuleId: null,
      formData: initialFormData,
      currentStep: 1,

      addCapsule: async (capsuleData) => {
        if (!capsuleData.targetDate || !validateTargetDate(new Date(capsuleData.targetDate))) {
          throw new Error('目标日期必须至少是明天');
        }

        const targetDate = new Date(capsuleData.targetDate);
        const key = await generateKeyFromDate(targetDate);
        const encrypted = await encryptContent(capsuleData.content || '', key);

        const newCapsule: Capsule = {
          id: Date.now().toString(36) + Math.random().toString(36).substr(2),
          title: capsuleData.title,
          recipient: capsuleData.recipient,
          encryptedContent: encrypted,
          targetDate: capsuleData.targetDate,
          createdAt: new Date().toISOString(),
          reminderType: capsuleData.reminderType,
          email: capsuleData.email,
          isUnlocked: false,
          encryptionKeyHash: hashDate(targetDate),
        };

        set((state) => ({
          capsules: [...state.capsules, newCapsule],
        }));
      },

      unlockCapsule: async (id: string) => {
        const capsule = get().capsules.find(c => c.id === id);
        if (!capsule) return null;

        const remaining = getRemainingTime(new Date(capsule.targetDate));
        if (remaining.total > 0) return null;

        try {
          const key = await generateKeyFromDate(new Date(capsule.targetDate));
          const content = await decryptContent(capsule.encryptedContent, key);
          
          set((state) => ({
            capsules: state.capsules.map(c =>
              c.id === id ? { ...c, isUnlocked: true } : c
            ),
          }));
          
          return content;
        } catch {
          return null;
        }
      },

      setCurrentCapsule: (capsule) => set({ currentCapsule: capsule }),
      setModalOpen: (open) => set({ isModalOpen: open, currentStep: open ? 1 : 0 }),
      setPreviewOpen: (open) => set({ isPreviewOpen: open }),
      setCelebratingCapsuleId: (id) => set({ celebratingCapsuleId: id }),

      setFormData: (data) =>
        set((state) => ({
          formData: { ...state.formData, ...data },
        })),

      setCurrentStep: (step) => set({ currentStep: step }),

      resetForm: () => set({ formData: initialFormData, currentStep: 1 }),

      checkAndUnlockExpired: () => {
        const { capsules } = get();
        capsules.forEach((capsule) => {
          if (!capsule.isUnlocked) {
            const remaining = getRemainingTime(new Date(capsule.targetDate));
            if (remaining.total <= 0) {
              set((state) => ({
                capsules: state.capsules.map(c =>
                  c.id === capsule.id ? { ...c, isUnlocked: true } : c
                ),
                celebratingCapsuleId: capsule.id,
              }));

              if (capsule.reminderType === 'browser' && 'Notification' in window) {
                if (Notification.permission === 'granted') {
                  new Notification('时间胶囊已解锁', {
                    body: `给 ${capsule.recipient} 的信已经可以阅读了！`,
                  });
                }
              }

              setTimeout(() => {
                set({ celebratingCapsuleId: null });
              }, 3000);
            }
          }
        });
      },
    }),
    {
      name: 'time-capsule-storage',
      partialize: (state) => ({
        capsules: state.capsules,
      }),
    }
  )
);
