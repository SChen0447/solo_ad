import { useState } from 'react';
import ProductList from './components/ProductList';
import PreviewArea from './components/PreviewArea';
import ConfigPanel from './components/ConfigPanel';
import styles from './styles/App.module.css';

export default function App() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const toggleDrawer = () => {
    setDrawerOpen((prev) => !prev);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
  };

  return (
    <div className={styles.app}>
      <div className={styles.header}>
        <button
          className={styles.hamburger}
          onClick={toggleDrawer}
          aria-label="菜单"
        >
          <span className={styles.hamburgerIcon}></span>
        </button>
        <span className={styles.headerTitle}>促销活动页面生成器</span>
      </div>

      <div
        className={`${styles.overlay} ${drawerOpen ? styles.show : ''}`}
        onClick={closeDrawer}
      />

      <div className={`${styles.leftPanel} ${drawerOpen ? styles.open : ''}`}>
        <ProductList />
        <ConfigPanel />
      </div>

      <div className={styles.rightPanel}>
        <PreviewArea />
      </div>
    </div>
  );
}
