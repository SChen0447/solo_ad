import axios from 'axios';
import type { Cell } from './ecosystemLogic';

export const saveState = async (grid: Cell[][], speciesCounts: object): Promise<void> => {
  await axios.post('/api/save', {
    grid,
    speciesCounts,
  });
};

export const loadState = async (): Promise<{ grid: Cell[][]; speciesCounts: object }> => {
  const response = await axios.get('/api/load');
  return {
    grid: response.data.grid,
    speciesCounts: response.data.speciesCounts,
  };
};
