export interface Volunteer {
  id: string;
  name: string;
  phone: string;
  signedUpAt: string;
}

export interface Material {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  eventId: string;
  claimed: number;
}

export interface Milestone {
  id: string;
  name: string;
  completed: boolean;
}

export interface Event {
  id: string;
  name: string;
  date: string;
  location: string;
  description: string;
  targetVolunteers: number;
  currentVolunteers: number;
  volunteers: Volunteer[];
  materials: Material[];
  milestones: Milestone[];
  isExpired: boolean;
  createdAt: string;
}

export interface MaterialClaim {
  id: string;
  materialId: string;
  materialName: string;
  quantity: number;
  claimant: string;
  claimedAt: string;
}
