import { useNavigate } from 'react-router-dom';
import { TEMPLATES } from '../templates';
import { TemplateConfig } from '../types';

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 24px',
  },
  header: {
    textAlign: 'center',
    marginBottom: '48px',
  },
  title: {
    fontSize: '42px',
    fontWeight: 700,
    color: '#ffffff',
    marginBottom: '12px',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: '16px',
    color: 'rgba(255,255,255,0.85)',
    fontWeight: 400,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, 260px)',
    gap: '32px',
    justifyContent: 'center',
    maxWidth: '900px',
  },
  card: {
    width: '260px',
    height: '180px',
    borderRadius: '16px',
    cursor: 'pointer',
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
  },
  cardHover: {
    transform: 'translateY(-10px)',
    boxShadow: '0 14px 40px rgba(0,0,0,0.25)',
  },
  thumbnail: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  footer: {
    padding: '12px 16px',
    background: 'rgba(255,255,255,0.95)',
    borderTop: '1px solid rgba(0,0,0,0.06)',
  },
  name: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#1a202c',
    marginBottom: '2px',
  },
  desc: {
    fontSize: '12px',
    color: '#718096',
  },
  mockContent: {
    width: '100%',
    height: '100%',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '12px',
  },
  mockAvatar: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    marginBottom: '6px',
  },
  mockName: {
    width: '60px',
    height: '6px',
    borderRadius: '3px',
    marginBottom: '4px',
  },
  mockLine: {
    width: '90px',
    height: '4px',
    borderRadius: '2px',
    opacity: 0.5,
  },
  mockTags: {
    display: 'flex',
    gap: '4px',
    marginTop: '8px',
  },
  mockTag: {
    width: '20px',
    height: '8px',
    borderRadius: '4px',
  },
};

export default function TemplateSelect() {
  const navigate = useNavigate();

  const handleSelect = (templateId: string) => {
    navigate(`/edit/${templateId}`);
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>选择你的简历模板</h1>
        <p style={styles.subtitle}>多种风格，一键生成属于你的专属个人主页</p>
      </div>
      <div style={styles.grid}>
        {TEMPLATES.map((tpl) => (
          <TemplateCard
            key={tpl.id}
            template={tpl}
            onClick={() => handleSelect(tpl.id)}
          />
        ))}
      </div>
    </div>
  );
}

function TemplateCard({
  template,
  onClick,
}: {
  template: TemplateConfig;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const cardStyle = {
    ...styles.card,
    ...(hovered ? styles.cardHover : {}),
  };

  return (
    <div
      style={cardStyle}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ ...styles.thumbnail, background: template.primaryColor }}>
        <div style={{ ...styles.mockContent, background: template.primaryColor }}>
          <div
            style={{
              ...styles.mockAvatar,
              background: template.secondaryColor,
            }}
          />
          <div
            style={{
              ...styles.mockName,
              background: template.secondaryColor,
            }}
          />
          <div
            style={{
              ...styles.mockLine,
              background: template.secondaryColor,
            }}
          />
          <div style={styles.mockTags}>
            <div
              style={{
                ...styles.mockTag,
                background: template.secondaryColor,
                opacity: 0.7,
              }}
            />
            <div
              style={{
                ...styles.mockTag,
                background: template.secondaryColor,
                opacity: 0.5,
              }}
            />
            <div
              style={{
                ...styles.mockTag,
                background: template.secondaryColor,
                opacity: 0.3,
              }}
            />
          </div>
        </div>
      </div>
      <div style={styles.footer}>
        <div style={styles.name}>{template.name}</div>
        <div style={styles.desc}>{template.description}</div>
      </div>
    </div>
  );
}
