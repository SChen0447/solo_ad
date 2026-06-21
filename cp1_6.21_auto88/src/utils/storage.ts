import type {
  Service,
  Customer,
  Pet,
  Appointment,
  ServiceRecord,
  DashboardStats,
} from '../types';

const API_BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: '请求失败' }));
    throw new Error(error.error || '请求失败');
  }

  return response.json();
}

export const api = {
  getServices: (): Promise<Service[]> => request<Service[]>('/services'),

  createService: (service: Omit<Service, 'id'>): Promise<Service> =>
    request<Service>('/services', {
      method: 'POST',
      body: JSON.stringify(service),
    }),

  updateService: (id: string, service: Partial<Service>): Promise<Service> =>
    request<Service>(`/services/${id}`, {
      method: 'PUT',
      body: JSON.stringify(service),
    }),

  deleteService: (id: string): Promise<void> =>
    request<void>(`/services/${id}`, { method: 'DELETE' }),

  getCustomers: (): Promise<Customer[]> => request<Customer[]>('/customers'),

  getCustomer: (id: string): Promise<Customer> =>
    request<Customer>(`/customers/${id}`),

  createCustomer: (customer: Omit<Customer, 'id'>): Promise<Customer> =>
    request<Customer>('/customers', {
      method: 'POST',
      body: JSON.stringify(customer),
    }),

  updateCustomer: (id: string, customer: Partial<Customer>): Promise<Customer> =>
    request<Customer>(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(customer),
    }),

  addPet: (customerId: string, pet: Omit<Pet, 'id'>): Promise<Pet> =>
    request<Pet>(`/customers/${customerId}/pets`, {
      method: 'POST',
      body: JSON.stringify(pet),
    }),

  updatePet: (
    customerId: string,
    petId: string,
    pet: Partial<Pet>
  ): Promise<Pet> =>
    request<Pet>(`/customers/${customerId}/pets/${petId}`, {
      method: 'PUT',
      body: JSON.stringify(pet),
    }),

  getAppointments: (params?: {
    date?: string;
    customerId?: string;
  }): Promise<Appointment[]> => {
    const query = new URLSearchParams();
    if (params?.date) query.append('date', params.date);
    if (params?.customerId) query.append('customerId', params.customerId);
    const queryStr = query.toString();
    return request<Appointment[]>(
      `/appointments${queryStr ? `?${queryStr}` : ''}`
    );
  },

  getAppointment: (id: string): Promise<Appointment> =>
    request<Appointment>(`/appointments/${id}`),

  createAppointment: (
    appointment: Omit<Appointment, 'id' | 'status'>
  ): Promise<Appointment> =>
    request<Appointment>('/appointments', {
      method: 'POST',
      body: JSON.stringify(appointment),
    }),

  updateAppointment: (
    id: string,
    appointment: Partial<Appointment>
  ): Promise<Appointment> =>
    request<Appointment>(`/appointments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(appointment),
    }),

  deleteAppointment: (id: string): Promise<void> =>
    request<void>(`/appointments/${id}`, { method: 'DELETE' }),

  getPetServiceRecords: (petId: string): Promise<ServiceRecord[]> =>
    request<ServiceRecord[]>(`/pets/${petId}/service-records`),

  getDashboardStats: (): Promise<DashboardStats> =>
    request<DashboardStats>('/dashboard/stats'),
};

export const getServiceColor = (category: string): string => {
  const colors: Record<string, string> = {
    wash: '#4FC3F7',
    cut: '#BA68C8',
    spa: '#FFB74D',
  };
  return colors[category] || '#90A4AE';
};

export const getServiceBgColor = (category: string): string => {
  const colors: Record<string, string> = {
    wash: '#E1F5FE',
    cut: '#F3E5F5',
    spa: '#FFF3E0',
  };
  return colors[category] || '#ECEFF1';
};

export const getCoatBgColor = (coatColor: string): string => {
  const colors: Record<string, string> = {
    light: '#FFFEF7',
    dark: '#F5F6F8',
    mixed: '#F8F9FA',
  };
  return colors[coatColor] || '#FFFFFF';
};

export const getBreedIcon = (breed: string): string => {
  const icons: Record<string, string> = {
    泰迪: '🐩',
    博美: '🐕',
    金毛: '🦮',
    比熊: '🐶',
    柯基: '🐕‍🦺',
    萨摩耶: '🐺',
  };
  return icons[breed] || '🐾';
};

export const formatTime = (time: string): string => {
  return time;
};

export const addMinutes = (time: string, minutes: number): string => {
  const [h, m] = time.split(':').map(Number);
  const totalMinutes = h * 60 + m + minutes;
  const newH = Math.floor(totalMinutes / 60) % 24;
  const newM = totalMinutes % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
};

export const getTimeSlots = (
  startHour: number = 9,
  endHour: number = 18,
  slotMinutes: number = 30
): string[] => {
  const slots: string[] = [];
  let totalMinutes = startHour * 60;
  const endTotal = endHour * 60;
  while (totalMinutes < endTotal) {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    totalMinutes += slotMinutes;
  }
  return slots;
};
