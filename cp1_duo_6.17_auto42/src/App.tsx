import React, { useState, useEffect } from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import CalendarView from './components/CalendarView';
import MaterialEditor from './components/MaterialEditor';
import MaterialList from './components/MaterialList';
import PlatformPreview from './components/PlatformPreview';
import { useApp } from './context/AppContext';
import type { Material } from './types';

const App: React.FC = () => {
  const { refreshAll, selectedSchedule, materials } = useApp();
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    if (selectedSchedule) {
      const material = materials.find((m) => m.id === selectedSchedule.materialId);
      setSelectedMaterial(material || null);
    } else {
      setSelectedMaterial(null);
    }
  }, [selectedSchedule, materials]);

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">内容排期管理</div>
        <nav className="sidebar-nav">
          <NavLink to="/calendar" className="nav-item">
            <span className="nav-icon">📅</span>
            <span>排期日历</span>
          </NavLink>
          <NavLink to="/materials" className="nav-item">
            <span className="nav-icon">📝</span>
            <span>素材管理</span>
          </NavLink>
          <NavLink to="/editor" className="nav-item">
            <span className="nav-icon">✏️</span>
            <span>素材编辑</span>
          </NavLink>
        </nav>
      </aside>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Navigate to="/calendar" replace />} />
          <Route path="/calendar" element={
            <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <CalendarView />
              </div>
              {selectedMaterial && (
                <div style={{ width: 400, flexShrink: 0, borderLeft: '1px solid var(--border-color)', overflowY: 'auto' }}>
                  <PlatformPreview material={selectedMaterial} />
                </div>
              )}
            </div>
          } />
          <Route path="/materials" element={<MaterialList />} />
          <Route path="/editor/:id?" element={<MaterialEditor />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;
