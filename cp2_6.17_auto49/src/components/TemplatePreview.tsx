import { ColorInfo } from '../types';

interface TemplatePreviewProps {
  colors: ColorInfo[];
}

export default function TemplatePreview({ colors }: TemplatePreviewProps) {
  const primary = colors[0]?.hex ?? '#264653';
  const secondary = colors[1]?.hex ?? '#2a9d8f';
  const tertiary = colors[2]?.hex ?? '#e9c46a';
  const quaternary = colors[3]?.hex ?? '#f4a261';
  const quinary = colors[4]?.hex ?? '#e76f51';

  return (
    <div
      style={{
        ...styles.preview,
        background: primary,
        transition: 'background 0.4s ease',
      }}
    >
      <header
        style={{
          ...styles.header,
          background: secondary,
          transition: 'background 0.4s ease',
        }}
      >
        <div style={styles.headerTitle}>My Website</div>
        <nav style={styles.nav}>
          <span style={styles.navItem}>首页</span>
          <span style={styles.navItem}>关于</span>
          <span style={styles.navItem}>联系</span>
        </nav>
      </header>

      <div style={styles.cardsContainer}>
        {[
          { title: '设计系统', desc: '统一的设计语言，让团队协作更高效。' },
          { title: '色彩理论', desc: '理解色彩搭配，创造视觉和谐。' },
          { title: '前端实践', desc: '将设计稿完美还原为交互界面。' },
        ].map((card, i) => (
          <div
            key={i}
            style={{
              ...styles.card,
              borderColor: tertiary,
              transition: 'border-color 0.4s ease',
            }}
          >
            <h3
              style={{
                ...styles.cardTitle,
                color: quaternary,
                transition: 'color 0.4s ease',
              }}
            >
              {card.title}
            </h3>
            <p
              style={{
                ...styles.cardDesc,
                color: quinary,
                transition: 'color 0.4s ease',
              }}
            >
              {card.desc}
            </p>
          </div>
        ))}
      </div>

      <footer
        style={{
          ...styles.footer,
          background: primary,
          transition: 'background 0.4s ease',
        }}
      >
        <span style={styles.footerText}>© 2024 Color Palette Extractor</span>
      </footer>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  preview: {
    flex: 1,
    borderRadius: '12px',
    padding: '0',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    minHeight: '500px',
  },
  header: {
    height: '80px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
  },
  headerTitle: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#fff',
  },
  nav: {
    display: 'flex',
    gap: '20px',
  },
  navItem: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.85)',
    cursor: 'pointer',
  },
  cardsContainer: {
    flex: 1,
    display: 'flex',
    gap: '16px',
    padding: '24px',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  card: {
    flex: '1 1 280px',
    minWidth: '280px',
    background: '#fff',
    borderRadius: '12px',
    border: '2px solid #e9c46a',
    padding: '20px',
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: 600,
    marginBottom: '8px',
  },
  cardDesc: {
    fontSize: '14px',
    lineHeight: 1.6,
  },
  footer: {
    height: '60px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.8)',
  },
};
