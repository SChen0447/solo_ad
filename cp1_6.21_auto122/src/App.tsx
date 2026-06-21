import { useState, useCallback } from 'react';
import { Menu, X } from 'lucide-react';
import CurveLibrary from './components/CurveLibrary';
import AnimationPreview from './components/AnimationPreview';
import ParamPanel from './components/ParamPanel';
import { CURVES, exportCss, type EasingCurve, type AnimationParams } from './utils/exportCss';
import styles from './App.module.css';

export default function App() {
  const [selectedCurve, setSelectedCurve] = useState<EasingCurve>(CURVES[0]);
  const [params, setParams] = useState<AnimationParams>({
    duration: 1.0,
    delay: 0,
    iterationCount: 'infinite',
  });
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleCurveSelect = useCallback((curve: EasingCurve) => {
    setSelectedCurve(curve);
  }, []);

  const handleParamsChange = useCallback((newParams: AnimationParams) => {
    setParams(newParams);
  }, []);

  const handleExport = useCallback(async () => {
    await exportCss(selectedCurve, params);
  }, [selectedCurve, params]);

  const toggleDrawer = useCallback(() => {
    setDrawerOpen(prev => !prev);
  }, []);

  const handleOverlayClick = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  return (
    <div className={styles.app}>
      <button
        className={styles.menuButton}
        onClick={toggleDrawer}
        aria-label="切换菜单"
      >
        {drawerOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <aside
        className={`${styles.sidebar} ${drawerOpen ? styles.drawerOpen : ''}`}
      >
        <div className={styles.sidebarHeader}>
          <h1 className={styles.logo}>
            <span className={styles.logoGradient}>CSS</span>
            动画调试器
          </h1>
        </div>
        <CurveLibrary
          selectedId={selectedCurve.id}
          onSelect={handleCurveSelect}
        />
      </aside>

      {drawerOpen && (
        <div
          className={styles.drawerOverlay}
          onClick={handleOverlayClick}
        />
      )}

      <main className={styles.mainContent}>
        <AnimationPreview
          curve={selectedCurve}
          params={params}
        />
        <ParamPanel
          params={params}
          onChange={handleParamsChange}
          onExport={handleExport}
        />
      </main>
    </div>
  );
}
