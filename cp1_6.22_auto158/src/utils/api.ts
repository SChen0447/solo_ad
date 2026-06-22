export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  date: string;
  note: string;
}

export interface Budget {
  id: string;
  category: string;
  limit: number;
  month: string;
}

export interface CategoryItem {
  key: string;
  emoji: string;
}

export interface Categories {
  expense: CategoryItem[];
  income: CategoryItem[];
}

const BASE_URL = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  try {
    const response = await fetch(`${BASE_URL}${url}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return (await response.json()) as T;
  } catch (error) {
      console.error('API Request Error:', error);
      throw error;
    }
}

export const api = {
  getTransactions: (params?: {
    category?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
    sort?: string;
  }) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) query.append(key, value);
      });
    }
    const queryString = query.toString();
    return request<Transaction[]>(`/transactions${queryString ? `?${queryString}` : ''}`);
  },

  addTransaction: (data: Omit<Transaction, 'id'>) =>
    request<Transaction>('/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateTransaction: (id: string, data: Partial<Transaction>) =>
    request<Transaction>(`/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteTransaction: (id: string) =>
    request<Transaction>(`/transactions/${id}`, {
      method: 'DELETE',
    }),

  getBudgets: () => request<Budget[]>('/budgets'),

  getBudgetsByMonth: (month: string) => request<Budget[]>(`/budgets/${month}`),

  addBudget: (data: Omit<Budget, 'id'>) =>
    request<Budget>('/budgets', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateBudget: (id: string, limit: number) =>
    request<Budget>(`/budgets/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ limit }),
    }),

  getCategories: () => request<Categories>('/categories'),
};
