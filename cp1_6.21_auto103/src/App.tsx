import React, { useState, useEffect, useCallback } from 'react';
import { Project, TimeLog } from './types';
import { fetchProjects, fetchTimeLogs } from './api';
import Dashboard from './pages/Dashboard';

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [p, t] = await Promise.all([fetchProjects(), fetchTimeLogs()]);
      setProjects(p);
      setTimeLogs(t);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refreshProjects = useCallback(async () => {
    const p = await fetchProjects();
    setProjects(p);
  }, []);

  const refreshTimeLogs = useCallback(async () => {
    const t = await fetchTimeLogs();
    setTimeLogs(t);
  }, []);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        color: '#9CA3AF',
        fontSize: '1.25rem',
      }}>
        加载中...
      </div>
    );
  }

  return (
    <Dashboard
      projects={projects}
      timeLogs={timeLogs}
      refreshProjects={refreshProjects}
      refreshTimeLogs={refreshTimeLogs}
    />
  );
}
