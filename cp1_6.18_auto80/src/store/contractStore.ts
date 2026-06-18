import { create } from 'zustand';
import type {
  Contract,
  ContractFields,
  ContractStatus,
  TemplateType,
  VersionRecord,
} from '../types';

const API_BASE = '/api';

interface ContractState {
  contracts: Contract[];
  versions: VersionRecord[];
  currentContract: Contract | null;
  selectedVersion: VersionRecord | null;
  loading: boolean;
  error: string | null;
  statusFilter: ContractStatus | 'all';
  searchKeyword: string;

  fetchContracts: () => Promise<void>;
  fetchContract: (id: string) => Promise<Contract | null>;
  fetchVersions: (contractId: string) => Promise<void>;
  createContract: (data: {
    title: string;
    templateType: TemplateType;
    fields: ContractFields;
  }) => Promise<Contract | null>;
  updateContract: (
    id: string,
    data: Partial<Pick<Contract, 'title' | 'templateType' | 'fields'>>
  ) => Promise<Contract | null>;
  deleteContract: (id: string) => Promise<boolean>;
  signContract: (
    id: string,
    data: {
      signerA?: string;
      signerB?: string;
      signatureA?: string;
      signatureB?: string;
    }
  ) => Promise<VersionRecord | null>;
  setStatusFilter: (s: ContractStatus | 'all') => void;
  setSearchKeyword: (k: string) => void;
  setCurrentContract: (c: Contract | null) => void;
  setSelectedVersion: (v: VersionRecord | null) => void;
}

export const useContractStore = create<ContractState>((set, get) => ({
  contracts: [],
  versions: [],
  currentContract: null,
  selectedVersion: null,
  loading: false,
  error: null,
  statusFilter: 'all',
  searchKeyword: '',

  fetchContracts: async () => {
    set({ loading: true, error: null });
    try {
      const { statusFilter, searchKeyword } = get();
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (searchKeyword.trim()) params.set('q', searchKeyword.trim());
      const url = `${API_BASE}/contracts${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('获取合同列表失败');
      const data: Contract[] = await res.json();
      set({ contracts: data });
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },

  fetchContract: async (id) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_BASE}/contracts/${id}`);
      if (!res.ok) throw new Error('合同不存在');
      const data: Contract = await res.json();
      set({ currentContract: data });
      return data;
    } catch (err: any) {
      set({ error: err.message });
      return null;
    } finally {
      set({ loading: false });
    }
  },

  fetchVersions: async (contractId) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_BASE}/contracts/${contractId}/versions`);
      if (!res.ok) throw new Error('获取版本历史失败');
      const data: VersionRecord[] = await res.json();
      set({ versions: data, selectedVersion: data[data.length - 1] || null });
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },

  createContract: async (data) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_BASE}/contracts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('创建合同失败');
      const created: Contract = await res.json();
      await get().fetchContracts();
      return created;
    } catch (err: any) {
      set({ error: err.message });
      return null;
    } finally {
      set({ loading: false });
    }
  },

  updateContract: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_BASE}/contracts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('更新合同失败');
      const updated: Contract = await res.json();
      set({ currentContract: updated });
      await get().fetchContracts();
      return updated;
    } catch (err: any) {
      set({ error: err.message });
      return null;
    } finally {
      set({ loading: false });
    }
  },

  deleteContract: async (id) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_BASE}/contracts/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('删除合同失败');
      await get().fetchContracts();
      return true;
    } catch (err: any) {
      set({ error: err.message });
      return false;
    } finally {
      set({ loading: false });
    }
  },

  signContract: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_BASE}/contracts/${id}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('签署合同失败');
      const version: VersionRecord = await res.json();
      await get().fetchVersions(id);
      await get().fetchContract(id);
      return version;
    } catch (err: any) {
      set({ error: err.message });
      return null;
    } finally {
      set({ loading: false });
    }
  },

  setStatusFilter: (s) => {
    set({ statusFilter: s });
    get().fetchContracts();
  },

  setSearchKeyword: (k) => {
    set({ searchKeyword: k });
  },

  setCurrentContract: (c) => set({ currentContract: c }),
  setSelectedVersion: (v) => set({ selectedVersion: v }),
}));
