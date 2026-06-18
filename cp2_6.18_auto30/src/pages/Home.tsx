import { Code2 } from 'lucide-react';
import { useGradientStore } from '@/store/gradientStore';
import PaletteEditor from '@/components/PaletteEditor';
import GradientPreview from '@/components/GradientPreview';
import AnimationController from '@/components/AnimationController';
import TemplatePicker from '@/components/TemplatePicker';
import FavoritesGrid from '@/components/FavoritesGrid';
import ExportModal from '@/components/ExportModal';
import styles from './Home.module.css';

export default function Home() {
  const currentScheme = useGradientStore((s) => s.currentScheme);
  const updateSchemeName = useGradientStore((s) => s.updateSchemeName);
  const setExportModalOpen = useGradientStore((s) => s.setExportModalOpen);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <div className={styles.brandLogo} />
          <div className={styles.brandText}>
            <h1 className={styles.brandTitle}>Gradient Studio</h1>
            <span className={styles.brandSub}>渐变动画调色板工作台</span>
          </div>
        </div>
        <div className={styles.actions}>
          <input
            type="text"
            className={styles.nameInput}
            value={currentScheme.name}
            onChange={(e) => updateSchemeName(e.target.value)}
            placeholder="方案名称..."
          />
          <button
            className={styles.exportBtn}
            onClick={() => setExportModalOpen(true)}
          >
            <Code2 size={16} /> 导出 CSS
          </button>
        </div>
      </header>

      <div className={styles.mainRow}>
        <div className={styles.leftCol}>
          <PaletteEditor />
          <TemplatePicker />
        </div>
        <div className={styles.rightCol}>
          <GradientPreview />
          <AnimationController />
          <FavoritesGrid />
        </div>
      </div>

      <ExportModal />
    </div>
  );
}
