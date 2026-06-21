export interface GreenEvent {
  id: string;
  name: string;
  date: string;
  location: string;
  maxParticipants: number;
  description: string;
  participantIds: string[];
}

export interface GrowthRecord {
  id: string;
  date: string;
  height: number;
  description: string;
  photoUrl: string;
}

export interface Tree {
  id: string;
  name: string;
  species: string;
  speciesColor: string;
  claimerId: string | null;
  claimerName: string | null;
  claimDate: string | null;
  x: number;
  y: number;
  growthRecords: GrowthRecord[];
}

export interface Volunteer {
  id: string;
  name: string;
  avatar: string;
  serviceHours: number;
  eventIds: string[];
  treeIds: string[];
}

export interface AppNotification {
  id: string;
  type: 'event' | 'tree' | 'achievement';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export interface Stats {
  totalEvents: number;
  totalTrees: number;
  totalVolunteers: number;
  monthlyEvents: { month: string; count: number }[];
  speciesDistribution: { species: string; color: string; count: number }[];
}

export const SPECIES_LIST = [
  { name: '银杏', color: '#F4D03F' },
  { name: '樟树', color: '#27AE60' },
  { name: '枫树', color: '#E74C3C' },
  { name: '柳树', color: '#2ECC71' },
  { name: '松树', color: '#1ABC9C' },
  { name: '桂花树', color: '#F39C12' },
  { name: '樱花树', color: '#E91E63' },
  { name: '梧桐', color: '#8D6E63' },
  { name: '柏树', color: '#00897B' },
  { name: '榆树', color: '#7CB342' },
];

export const CURRENT_USER_ID = 'v1';
