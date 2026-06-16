import { create } from 'zustand';
import { get as idbGet, set as idbSet, del as idbDel, clear as idbClear } from 'idb-keyval';
import { Invoice, SearchFilters } from '../types/invoice';

interface InvoiceState {
  invoices: Invoice[];
  selectedInvoiceId: string | null;
  selectedIds: string[];
  filters: SearchFilters;
  isLoading: boolean;
  addInvoice: (invoice: Invoice) => void;
  removeInvoice: (id: string) => void;
  clearAllInvoices: () => void;
  updateInvoice: (id: string, updates: Partial<Invoice>) => void;
  selectInvoice: (id: string | null) => void;
  toggleSelected: (id: string) => void;
  selectAll: (ids: string[]) => void;
  setFilters: (filters: Partial<SearchFilters>) => void;
  getFilteredInvoices: () => Invoice[];
  loadFromStorage: () => Promise<void>;
  saveToStorage: () => Promise<void>;
  setLoading: (loading: boolean) => void;
}

const STORAGE_KEY = 'invoice-store';

export const useInvoiceStore = create<InvoiceState>((set, get) => ({
  invoices: [],
  selectedInvoiceId: null,
  selectedIds: [],
  filters: {
    keyword: '',
    dateFrom: '',
    dateTo: '',
    amountMin: '',
    amountMax: '',
  },
  isLoading: false,

  addInvoice: (invoice) => {
    set((state) => ({
      invoices: [invoice, ...state.invoices],
      selectedInvoiceId: invoice.id,
    }));
    get().saveToStorage();
  },

  removeInvoice: (id) => {
    set((state) => {
      const newInvoices = state.invoices.filter((inv) => inv.id !== id);
      const newSelectedIds = state.selectedIds.filter((sid) => sid !== id);
      const newSelectedId =
        state.selectedInvoiceId === id
          ? newInvoices.length > 0
            ? newInvoices[0].id
            : null
          : state.selectedInvoiceId;
      return {
        invoices: newInvoices,
        selectedIds: newSelectedIds,
        selectedInvoiceId: newSelectedId,
      };
    });
    get().saveToStorage();
  },

  clearAllInvoices: () => {
    set({ invoices: [], selectedInvoiceId: null, selectedIds: [] });
    get().saveToStorage();
  },

  updateInvoice: (id, updates) => {
    set((state) => ({
      invoices: state.invoices.map((inv) =>
        inv.id === id ? { ...inv, ...updates } : inv
      ),
    }));
    get().saveToStorage();
  },

  selectInvoice: (id) => {
    set({ selectedInvoiceId: id });
  },

  toggleSelected: (id) => {
    set((state) => ({
      selectedIds: state.selectedIds.includes(id)
        ? state.selectedIds.filter((sid) => sid !== id)
        : [...state.selectedIds, id],
    }));
  },

  selectAll: (ids) => {
    set({ selectedIds: ids });
  },

  setFilters: (filters) => {
    set((state) => ({
      filters: { ...state.filters, ...filters },
    }));
  },

  getFilteredInvoices: () => {
    const { invoices, filters } = get();
    return invoices.filter((inv) => {
      if (
        filters.keyword &&
        !inv.invoice_number.toLowerCase().includes(filters.keyword.toLowerCase()) &&
        !inv.buyer_name.toLowerCase().includes(filters.keyword.toLowerCase()) &&
        !inv.seller_name.toLowerCase().includes(filters.keyword.toLowerCase())
      ) {
        return false;
      }

      if (filters.dateFrom && inv.invoice_date < filters.dateFrom) {
        return false;
      }
      if (filters.dateTo && inv.invoice_date > filters.dateTo) {
        return false;
      }

      if (filters.amountMin && inv.total_amount_tax < parseFloat(filters.amountMin)) {
        return false;
      }
      if (filters.amountMax && inv.total_amount_tax > parseFloat(filters.amountMax)) {
        return false;
      }

      return true;
    });
  },

  loadFromStorage: async () => {
    try {
      const data = await idbGet(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data as unknown as string) as Invoice[];
        set({ invoices: parsed });
        if (parsed.length > 0) {
          set({ selectedInvoiceId: parsed[0].id });
        }
      }
    } catch (e) {
      console.error('Failed to load from storage:', e);
    }
  },

  saveToStorage: async () => {
    try {
      await idbSet(STORAGE_KEY, JSON.stringify(get().invoices));
    } catch (e) {
      console.error('Failed to save to storage:', e);
    }
  },

  setLoading: (loading) => {
    set({ isLoading: loading });
  },
}));
