import { useEffect, useState, useRef } from 'react';
import { ResumeData, TemplateConfig, Work } from '../types';
import { debounce, hashStringToColor } from '../utils';

interface PreviewPanelProps {
  data: ResumeData;
  template: TemplateConfig;
}

export default function PreviewPanel({ data, template }: PreviewPanelProps) {
  const [displayData, setDisplayData] = useState(data);
  const [selectedWork, setSelectedWork] = useState<Work | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const debouncedUpdate = debounce((newData: ResumeData) => {
      setDisplayData(newData);
    }, 500);
    debouncedUpdate(data);
  }, [data]);

  const isDark = template.id === 'tech';
  const textColor = isDark ? '#f7fafc' : '#2d3748';
  const subTextColor = isDark ? '#cbd5e0' : '#718096';
  const cardBg = isDark ? 'rgba(255,255,255,0.05)' : '#ffffff';

  const styles: Record<string, React.CSSProperties> = {
    wrapper: {
      width: '100%',
      maxWidth: '800px',
      margin: '0 auto',
      aspectRatio: '4 / 3',
      background: template.primaryColor,
      borderRadius: '12px',
      overflow: 'auto',
      padding: '32px',
      transition: 'background 0.3s ease',
      boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      gap: '20px',
      marginBottom: '24px',
    },
    avatar: {
      width: '80px',
      height: '80px',
      borderRadius: '50%',
      objectFit: 'cover',
      border: `3px solid ${template.secondaryColor}`,
      flexShrink: 0,
    },
    nameSection: {
      flex: 1,
    },
    name: {
      fontSize: '28px',
      fontWeight: 700,
      color: textColor,
      marginBottom: '6px',
    },
    bio: {
      fontSize: '13px',
      color: subTextColor,
      lineHeight: 1.6,
    },
    section: {
      marginBottom: '20px',
    },
    sectionTitle: {
      fontSize: '15px',
      fontWeight: 600,
      color: template.secondaryColor,
      marginBottom: '10px',
      paddingBottom: '6px',
      borderBottom: `2px solid ${template.secondaryColor}`,
      display: 'inline-block',
    },
    skills: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '8px',
    },
    skillTag: {
      padding: '4px 14px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: 500,
      color: '#ffffff',
      cursor: 'pointer',
      transition: 'transform 0.2s ease',
    },
    expItem: {
      background: cardBg,
      borderRadius: '10px',
      padding: '14px 16px',
      marginBottom: '10px',
      boxShadow: isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.04)',
    },
    expHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '6px',
    },
    expPosition: {
      fontSize: '14px',
      fontWeight: 600,
      color: textColor,
    },
    expPeriod: {
      fontSize: '11px',
      color: subTextColor,
      flexShrink: 0,
      marginLeft: '12px',
    },
    expCompany: {
      fontSize: '12px',
      color: template.secondaryColor,
      fontWeight: 500,
      marginBottom: '4px',
    },
    expDesc: {
      fontSize: '12px',
      color: subTextColor,
      lineHeight: 1.6,
    },
    worksGrid: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '12px',
    },
    workCard: {
      width: '180px',
      borderRadius: '12px',
      overflow: 'hidden',
      cursor: 'pointer',
      position: 'relative',
      transition: 'transform 0.3s ease',
      boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.3)' : '0 4px 16px rgba(0,0,0,0.08)',
    },
    workThumb: {
      width: '100%',
      height: '130px',
      objectFit: 'cover',
      display: 'block',
    },
    workOverlay: {
      position: 'absolute',
      inset: 0,
      background: 'rgba(0,0,0,0.65)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      opacity: 0,
      transition: 'opacity 0.3s ease',
    },
    workTitle: {
      color: '#ffffff',
      fontSize: '14px',
      fontWeight: 600,
      textAlign: 'center',
      padding: '0 12px',
    },
    workBtn: {
      padding: '5px 16px',
      background: template.secondaryColor,
      color: '#ffffff',
      border: 'none',
      borderRadius: '16px',
      fontSize: '11px',
      fontWeight: 500,
      cursor: 'pointer',
    },
    modalOverlay: {
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      animation: 'fadeIn 0.2s ease',
    },
    modalContent: {
      position: 'relative',
      maxWidth: '90vw',
      maxHeight: '90vh',
    },
    modalImg: {
      maxWidth: '90vw',
      maxHeight: '80vh',
      borderRadius: '12px',
      display: 'block',
    },
    modalClose: {
      position: 'absolute',
      top: '-40px',
      right: 0,
      width: '32px',
      height: '32px',
      borderRadius: '50%',
      background: 'rgba(255,255,255,0.9)',
      border: 'none',
      cursor: 'pointer',
      fontSize: '18px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalInfo: {
      marginTop: '16px',
      textAlign: 'center',
      color: '#ffffff',
    },
    modalTitle: {
      fontSize: '18px',
      fontWeight: 600,
      marginBottom: '6px',
    },
    modalDesc: {
      fontSize: '13px',
      color: 'rgba(255,255,255,0.7)',
      maxWidth: '500px',
      margin: '0 auto',
      lineHeight: 1.6,
    },
  };

  return (
    <>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
      <div ref={panelRef} style={styles.wrapper} data-preview-container>
        <div style={styles.header}>
          {displayData.avatarUrl && (
            <img src={displayData.avatarUrl} alt="avatar" style={styles.avatar} />
          )}
          <div style={styles.nameSection}>
            <div style={styles.name}>{displayData.name || '你的姓名'}</div>
            <div style={styles.bio}>{displayData.bio || '一段简短的个人简介...'}</div>
          </div>
        </div>

        <div style={styles.section}>
          <div style={styles.sectionTitle}>技能专长</div>
          <div style={styles.skills}>
            {displayData.skills.map((skill, idx) => (
              <span
                key={idx}
                style={{
                  ...styles.skillTag,
                  background: hashStringToColor(skill),
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLElement).style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.transform = 'scale(1)';
                }}
              >
                {skill}
              </span>
            ))}
          </div>
        </div>

        <div style={styles.section}>
          <div style={styles.sectionTitle}>工作经历</div>
          {displayData.experiences.map((exp) => (
            <div key={exp.id} style={styles.expItem}>
              <div style={styles.expHeader}>
                <div style={styles.expPosition}>{exp.position || '职位'}</div>
                <div style={styles.expPeriod}>{exp.period}</div>
              </div>
              <div style={styles.expCompany}>{exp.company || '公司名称'}</div>
              <div style={styles.expDesc}>{exp.description || '工作描述...'}</div>
            </div>
          ))}
        </div>

        <div style={styles.section}>
          <div style={styles.sectionTitle}>作品集</div>
          <div style={styles.worksGrid}>
            {displayData.works.map((work) => (
              <WorkCard
                key={work.id}
                work={work}
                accentColor={template.secondaryColor}
                onClick={() => setSelectedWork(work)}
              />
            ))}
          </div>
        </div>
      </div>

      {selectedWork && (
        <div style={styles.modalOverlay} onClick={() => setSelectedWork(null)}>
          <div
            style={{ ...styles.modalContent, animation: 'scaleIn 0.2s ease' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button style={styles.modalClose} onClick={() => setSelectedWork(null)}>
              ✕
            </button>
            <img src={selectedWork.thumbnailUrl} alt={selectedWork.title} style={styles.modalImg} />
            <div style={styles.modalInfo}>
              <div style={styles.modalTitle}>{selectedWork.title}</div>
              <div style={styles.modalDesc}>{selectedWork.description}</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

interface WorkCardProps {
  work: Work;
  accentColor: string;
  onClick: () => void;
}

function WorkCard({ work, accentColor, onClick }: WorkCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '180px',
        borderRadius: '12px',
        overflow: 'hidden',
        cursor: 'pointer',
        position: 'relative',
        transition: 'transform 0.3s ease',
        transform: hovered ? 'scale(1.05)' : 'scale(1)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
      }}
    >
      <img
        src={work.thumbnailUrl}
        alt={work.title}
        style={{ width: '100%', height: '130px', objectFit: 'cover', display: 'block' }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.65)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
      >
        <div
          style={{
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 600,
            textAlign: 'center',
            padding: '0 12px',
          }}
        >
          {work.title}
        </div>
        <button
          style={{
            padding: '5px 16px',
            background: accentColor,
            color: '#ffffff',
            border: 'none',
            borderRadius: '16px',
            fontSize: '11px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          查看详情
        </button>
      </div>
    </div>
  );
}
