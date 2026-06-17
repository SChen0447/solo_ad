import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { Flower, BouquetFlower, Order, PageRoute, PackagingStyle } from '../../types';

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
  | { type: 'UPDATE_FLOWER_POSITION'; payload: