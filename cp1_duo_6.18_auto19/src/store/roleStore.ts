import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { Role } from '../types';

const ROLES_KEY = 'rp_roles';

interface RoleState {
  roles: Role[];
  addRole: (sceneId: string, name: string, description: string, personality: string, appearance: string) => Role;
  updateRole: (roleId: string, updates: Partial<Role>) => void;
  deleteRole: (roleId: string) => void;
  getRolesByScene: (sceneId: string) => Role[];
  importRoles: (roles: Role[]) => void;
}

const loadFromStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to load from localStorage:', e);
  }
  return defaultValue;
};

const saveToStorage = <T>(key: string, value: T): void => {
  try {
    setTimeout(() => {
      localStorage.setItem(key, JSON.stringify(value));
    }, 0);
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
};

const avatarColors = [
  '#7c3aed', '#4da6ff', '#4caf50', '#ff9800', '#f44336',
  '#9c27b0', '#00bcd4', '#8bc34a', '#ff5722', '#607d8b'
];

const getRandomColor = (): string => {
  return avatarColors[Math.floor(Math.random() * avatarColors.length)];
};

export const useRoleStore = create<RoleState>((set, get) => ({
  roles: loadFromStorage<Role[]>(ROLES_KEY, []),

  addRole: (
    sceneId: string,
    name: string,
    description: string,
    personality: string,
    appearance: string
  ): Role => {
    const role: Role = {
      id: uuidv4(),
      sceneId,
      name,
      description,
      personality,
      appearance,
      avatarColor: getRandomColor(),
    };
    const newRoles = [...get().roles, role];
    set({ roles: newRoles });
    saveToStorage(ROLES_KEY, newRoles);
    return role;
  },

  updateRole: (roleId: string, updates: Partial<Role>) => {
    const newRoles = get().roles.map((r) =>
      r.id === roleId ? { ...r, ...updates } : r
    );
    set({ roles: newRoles });
    saveToStorage(ROLES_KEY, newRoles);
  },

  deleteRole: (roleId: string) => {
    const newRoles = get().roles.filter((r) => r.id !== roleId);
    set({ roles: newRoles });
    saveToStorage(ROLES_KEY, newRoles);
  },

  getRolesByScene: (sceneId: string): Role[] => {
    return get().roles.filter((r) => r.sceneId === sceneId);
  },

  importRoles: (roles: Role[]) => {
    const newRoles = [...get().roles, ...roles];
    set({ roles: newRoles });
    saveToStorage(ROLES_KEY, newRoles);
  },
}));
