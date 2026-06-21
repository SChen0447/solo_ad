export interface Service {
  id: string;
  name: string;
  category: 'wash' | 'cut' | 'spa';
  price: number;
  duration: number;
  description: string;
}

export interface Pet {
  id: string;
  name: string;
  breed: string;
  weight: number;
  birthday: string;
  allergies: string;
  notes: string;
  coatColor: 'light' | 'dark' | 'mixed';
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  pets: Pet[];
}

export interface Appointment {
  id: string;
  customerId: string;
  petId: string;
  serviceId: string;
  date: string;
  startTime: string;
  status: 'pending' | 'completed' | 'cancelled';
}

export interface ServiceRecord {
  id: string;
  petId: string;
  serviceId: string;
  date: string;
  notes: string;
  service?: Service;
}

export interface DashboardStats {
  todayAppointments: number;
  weekRevenue: number;
  pendingCount: number;
  totalCustomers: number;
  todayAppointmentsGrowth: number;
  weekRevenueGrowth: number;
  pendingCountGrowth: number;
  totalCustomersGrowth: number;
}
