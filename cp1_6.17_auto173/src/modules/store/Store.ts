import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { Flower, BouquetFlower, Order, PageRoute, PackagingStyle } from '../types';

interface AppState {
  flowers: Flower[];
  bouquet: BouquetFlower[];
  currentPage: PageRoute;
  currentOrder: Order | null;
  selectedPackaging: PackagingStyle | null;
  isLoading: boolean;
}

type Action =
  | { type: 'SET_FLOWERS'; payload: Flower[] }
  | { type: 'ADD_FLOWER_TO_BOUQUET'; payload: BouquetFlower }
  | { type: 'REMOVE_FLOWER_FROM_BOUQUET'; payload: string }
  | { type: 'UPDATE_FLOWER_POSITION'; payload: { instanceId: string; position: { x: number; y: number } } }
  | { type: 'UPDATE_FLOWER_TRANSFORM'; payload: { instanceId: string; rotation: number; scale: number } }
  | { type: 'SET_CURRENT_PAGE'; payload: PageRoute }
  | { type: 'SET_CURRENT_ORDER'; payload: Order | null }
  | { type: 'SET_SELECTED_PACKAGING'; payload: PackagingStyle | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'CLEAR_BOUQUET' }
  | { type: 'UPDATE_FLOWER_STOCK'; payload: { flowerId: number; stock: number } };

const initialState: AppState = {
  flowers: [],
  bouquet: [],
  currentPage: 'editor',
  currentOrder: null,
  selectedPackaging: null,
  isLoading: false,
};

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_FLOWERS':
      return { ...state, flowers: action.payload };
    case 'ADD_FLOWER_TO_BOUQUET':
      return { ...state, bouquet: [...state.bouquet, action.payload] };
    case 'REMOVE_FLOWER_FROM_BOUQUET':
      return {
        ...state,
        bouquet: state.bouquet.filter(f => f.instanceId !== action.payload),
      };
    case 'UPDATE_FLOWER_POSITION':
      return {
        ...state,
        bouquet: state.bouquet.map(f =>
          f.instanceId === action.payload.instanceId
            ? { ...f, position: action.payload.position }
            : f
        ),
      };
    case 'UPDATE_FLOWER_TRANSFORM':
      return {
        ...state,
        bouquet: state.bouquet.map(f =>
          f.instanceId === action.payload.instanceId
            ? { ...f, rotation: action.payload.rotation, scale: action.payload.scale }
            : f
        ),
      };
    case 'SET_CURRENT_PAGE':
      return { ...state, currentPage: action.payload };
    case 'SET_CURRENT_ORDER':
      return { ...state, currentOrder: action.payload };
    case 'SET_SELECTED_PACKAGING':
      return { ...state, selectedPackaging: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'CLEAR_BOUQUET':
      return { ...state, bouquet: [] };
    case 'UPDATE_FLOWER_STOCK':
      return {
        ...state,
        flowers: state.flowers.map(f =>
          f.id === action.payload.flowerId
            ? { ...f, stock: action.payload.stock }
            : f
        ),
      };
    default:
      return state;
  }
}

interface StoreContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <StoreContext.Provider value={{ state, dispatch }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};

export const packagingStyles: PackagingStyle[] = [
  { id: 'kraft', name: '简约牛皮纸', price: 10, description: '自然简约风格' },
  { id: 'pink', name: '甜美粉色纱网', price: 10, description: '浪漫甜美风格' },
  { id: 'vintage', name: '复古报纸', price: 10, description: '文艺复古风格' },
];
