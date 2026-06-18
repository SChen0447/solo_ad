import { useGradientStore } from '@/store/gradientStore';
import type { PresetTemplate } from '@/types';
import styles from './TemplatePicker.module.css';

const PRESET_TEMPLATES: PresetTemplate[] = [
  { name: '日落', colors: ['#ff7e5f', '#feb47b'], gradientType: 'linear' },
  { name: '海洋', colors: ['#00b4db', '#0083b0'], gradientType: 'linear' },
  { name: '森林', colors: ['#11998e', '#38ef7d'], gradientType: 'linear' },
  { name: '极光', colors: ['#ee9ca7', '#ffdde1'], gradientType: 'linear' },
  { name: '火焰', colors: ['#f12711', '#f5af19'], gradientType: 'linear' },
  { name: '星河', colors: ['#a18cd1', '#fbc2eb'], gradientType: 'linear' },
];

let nextId = 1;
function genId(): string {
  return `gs-${Date.now()}-${nextId++}`;
}

export default function TemplatePicker() {
  const loadScheme = useGradientStore((s) => s.loadScheme);

  const handleClick = (template: PresetTemplate) => {
    const [c1, c2] = template.colors;
    loadScheme({
      id: genId(),
      name: template.name,
      colorStops: [
        { id: genId(), color: c1, position: 0 },
        { id: genId(), color: c1, position: 33 },
        { id: genId(), color: c2, position: 66 },
        { id: genId(), color: c2, position: 100 },
      ],
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
              background: `linear-gradient(135deg, ${t.colors[0]}, ${t.colors[1]})`,
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
