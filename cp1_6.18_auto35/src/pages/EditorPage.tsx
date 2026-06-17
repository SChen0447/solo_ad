import React, { useRef } from 'react';
import { ExportBar } from '../components/ExportBar';
import { BuilderPanel } from '../components/BuilderPanel';
import { CanvasArea } from '../components/CanvasArea';
import { EditSidebar } from '../components/EditSidebar';
import { ThemeSwitcher } from '../components/ThemeSwitcher';
import { ToastContainer } from '../components/ToastContainer';

export const EditorPage: React.FC = () => {
  const canvasRef = useRef<HTMLDivElement>(null);

  return (
    <div className="app-container">
      <ExportBar />
      <div className="main-layout">
        <BuilderPanel />
        <CanvasArea canvasRef={canvasRef} />
      </div>
      <EditSidebar />
      <ThemeSwitcher />
      <ToastContainer />
    </div>
  );
};
