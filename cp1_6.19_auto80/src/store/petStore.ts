import { create } from 'zustand';

export interface Pet {
  id: string;
  name: string;
  species: 'cat' | 'dog' | 'rabbit';
  avatar: string;
  hunger: number;
  hygiene: number;
  happiness: number;
  health: number;
  createdAt: number;
}

export interface InteractionLog {
  id: string;
  message: string;
  timestamp: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  effect: 'hunger' | 'hygiene' | 'happiness';
  value: number;
  price: number;
  quantity: number;
}

interface PetState {
  pets: Pet[];
  coins: number;
  inventory: InventoryItem[];
  interactionLogs: InteractionLog[];
  loading: boolean;
  fetchPets: () => Promise<void>;
  createPet: (name: string, species: 'cat' | 'dog' | 'rabbit') => Promise<void>;
  updatePetStatus: (id: string, updates: Partial<Pet>) => Promise<void>;
  interactPets: (pet1Id: string, pet2Id: string) => Promise<void>;
  buyItem: (itemId: string) => Promise<void>;
  useItem: (itemId: string, petId: string) => Promise<void>;
  addInteractionLog: (message: string) => void;
  decayPetStats: () => void;
}

const API_BASE = '/api/pets';

const SHOP_ITEMS: Omit<InventoryItem, 'quantity'>[] = [
  { id: 'premium-food', name: '高级饲料', effect: 'hunger', value: 30, price: 10 },
  { id: 'cleaning-kit', name: '清洁套装', effect: 'hygiene', value: 25, price: 8 },
  { id: 'fun-toy', name: '趣味玩具', effect: 'happiness', value: 20, price: 5 },
];

export const usePetStore = create<PetState>((set, get) => ({
  pets: [],
  coins: 100,
  inventory: SHOP_ITEMS.map((item) => ({ ...item, quantity: 0 })),
  interactionLogs: [],
  loading: false,

  fetchPets: async () => {
    set({ loading: true });
    try {
      const res = await fetch(API_BASE);
      const pets = await res.json();
      set({ pets, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  createPet: async (name, species) => {
    try {
      const res = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, species, avatar: species }),
      });
      const newPet = await res.json();
      set((state) => ({ pets: [...state.pets, newPet] }));
    } catch {}
  },

  updatePetStatus: async (id, updates) => {
    try {
      const res = await fetch(`${API_BASE}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const updatedPet = await res.json();
      set((state) => ({
        pets: state.pets.map((p) => (p.id === id ? updatedPet : p)),
      }));
    } catch {}
  },

  interactPets: async (pet1Id, pet2Id) => {
    const state = get();
    const pet1 = state.pets.find((p) => p.id === pet1Id);
    const pet2 = state.pets.find((p) => p.id === pet2Id);
    if (!pet1 || !pet2) return;

    const newHappiness1 = Math.min(100, pet1.happiness + 5);
    const newHappiness2 = Math.min(100, pet2.happiness + 5);

    await state.updatePetStatus(pet1Id, { happiness: newHappiness1 });
    await state.updatePetStatus(pet2Id, { happiness: newHappiness2 });

    state.addInteractionLog(`${pet1.name}和${pet2.name}一起玩了`);
  },

  buyItem: async (itemId) => {
    const state = get();
    const item = state.inventory.find((i) => i.id === itemId);
    if (!item) return;
    if (state.coins < item.price) return;

    set((state) => ({
      coins: state.coins - item.price,
      inventory: state.inventory.map((i) =>
        i.id === itemId ? { ...i, quantity: i.quantity + 1 } : i
      ),
    }));
  },

  useItem: async (itemId, petId) => {
    const state = get();
    const item = state.inventory.find((i) => i.id === itemId);
    const pet = state.pets.find((p) => p.id === petId);
    if (!item || item.quantity <= 0 || !pet) return;

    const field = item.effect as keyof Pick<Pet, 'hunger' | 'hygiene' | 'happiness'>;
    const newValue = Math.min(100, pet[field] + item.value);

    set((state) => ({
      inventory: state.inventory.map((i) =>
        i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i
      ),
    }));

    await state.updatePetStatus(petId, { [field]: newValue });
  },

  addInteractionLog: (message) => {
    const log: InteractionLog = {
      id: Date.now().toString(),
      message,
      timestamp: Date.now(),
    };
    set((state) => ({ interactionLogs: [...state.interactionLogs, log] }));
    setTimeout(() => {
      set((state) => ({
        interactionLogs: state.interactionLogs.filter((l) => l.id !== log.id),
      }));
    }, 3000);
  },

  decayPetStats: () => {
    const state = get();
    state.pets.forEach(async (pet) => {
      const newHunger = Math.max(0, pet.hunger - 2);
      const newHygiene = Math.max(0, pet.hygiene - 1);
      const newHappiness = Math.max(0, pet.happiness - 1);

      let healthDelta = 0;
      if (newHunger > 80 || newHunger < 20 || newHygiene < 30 || newHappiness < 30) {
        healthDelta = -5;
      }
      const newHealth = Math.max(0, Math.min(100, pet.health + healthDelta));

      await state.updatePetStatus(pet.id, {
        hunger: newHunger,
        hygiene: newHygiene,
        happiness: newHappiness,
        health: newHealth,
      });
    });
  },
}));
