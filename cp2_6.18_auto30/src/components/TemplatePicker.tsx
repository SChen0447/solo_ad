import { useGradientStore } from '@/store/gradientStore';
import type { PresetTemplate } from '@/types';
import styles from './TemplatePicker.module.css';

const PRESET_TEMPLATES: PresetTemplate[] = [
  { name: '日落', colors: ['#ff7e5f', '#feb47b', '#ff6a88', '#ff99ac'], gradientType: 'linear' },
  { name: '海洋', colors: ['#00b4db', '#0083b0', '#4facfe', '#00f2fe'], gradientType: 'linear' },
  { name: '森林', colors: ['#11998e', '#38ef7d', '#56ab2f', '#a8e063'], gradientType: 'linear' },
  { name: '极光', colors: ['#ee9ca7', '#ffdde1', '#fbc2eb', '#a18cd1'], gradientType: 'linear' },
  { name: '火焰', colors: ['#f12711', '#f5af19', '#f093fb', '#f5576c'], gradientType: 'linear' },
  { name: '星河', colors: ['#a18cd1', '#fbc2eb', '#667eea', '#764ba2'], gradientType: 'linear' },
];

let nextId = 1000;
function genId(): string {
  return `gs-${Date.now()}-${nextId++}`;
}

export default function TemplatePicker() {
  const loadScheme = useGradientStore((s) => s.loadScheme);

  const handleClick = (template: PresetTemplate) => {
    const positions = template.colors.map((_, i, arr) =>
      Math.round((i / (arr.length - 1)) * 100)
    );
    loadScheme({
      id: genId(),
      name: template.name,
      colorStops: template.colors.map((color, i) => ({
        id: genId(),
        color,
        position: positions[i],
      })),
      gradientType: template.gradientType,
      angle: 135,
    });
  };

  return (
    <div className={styles.wrapper}>
      <h3 className={styles.title}>预设模板</h3>
      <div className={styles.row}>
        {PRESET_TEMPLATES.map((t) => (
          <div
            key={t.name}
            className={styles.card}
            style={{
              background: `linear-gradient(135deg, ${t.colors.join(', ')})`,
            }}
            onClick={() => handleClick(t)}
          >
            <span className={styles.cardName}>{t.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
