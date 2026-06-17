import { useState, useCallback } from 'react';
import axios from 'axios';
import type { TestResult } from '../App';

export function useTestRunner() {
  const [running, setRunning] = useState(false);

  const runTest = useCallback(async (componentPath: string, states: string[]): Promise<TestResult[]> => {
    setRunning(true);
    try {
      const res = await axios.post('/api/test', { componentPath, states });
      return res.data.results as TestResult[];
    } catch (err) {
      console.error('Test run failed:', err);
      return [];
    } finally {
      setRunning(false);
    }
  }, []);

  return { running, runTest };
}
