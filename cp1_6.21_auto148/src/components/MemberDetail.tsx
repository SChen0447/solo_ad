import { Member, Skill, categoryColors, categoryNames } from '../types';

interface MemberDetailProps {
  member: Member;
  skills: Skill[];
}

function MemberDetail({ member }: MemberDetailProps) {
  const getProficiencyColor = (proficiency: number) => {
    const ratio = proficiency / 100;
    const r = Math.round(239 + (34 - 239) * ratio);
    const g = Math.round(68 + (197 - 68) * ratio);
    const b = Math.round(68 + (94 - 68) * ratio);
    return `rgb(${r}, ${g}, ${b})`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="glass-strong" style={styles.container}>
      <div style={styles.header}>
        <div style={styles.avatar}>
          {member.name.charAt(0).toUpperCase()}
        </div>
        <div style={styles.headerInfo}>
          <h2 style={styles.name}>{member.name}</h2>
          <p style={styles.info}>
            <span style={styles.infoBadge}>当前项目: {member.currentProjectCount}</span>
            <span style={styles.infoBadge}>技能标签: {member.skills.length}</span>
            <span style={styles.infoBadge}>参与项目: {member.projects.length}</span>
          </p>
        </div>
      </div>

      <div style={styles.content}>
        <div style={styles.leftPanel}>
          <h3 style={styles.sectionTitle}>技能详情</h3>
          <div style={styles.skillsList}>
            {member.skills.map(skill => (
              <div key={skill.skillId} style={styles.skillItem}>
                <div style={styles.skillHeader}>
                  <div style={styles.skillNameRow}>
                    <span
                      style={{
                        ...styles.categoryDot,
                        backgroundColor: categoryColors[skill.category]?.bg || '#6b7280',
                      }}
                    />
                    <span style={styles.skillName}>{skill.skillName}</span>
                    <span style={styles.categoryTag}>
                      {categoryNames[skill.category] || skill.category}
                    </span>
                  </div>
                  <span style={styles.skillValue}>{skill.proficiency}%</span>
                </div>
                <div style={styles.progressBarBg}>
                  <div
                    style={{
                      ...styles.progressBarFill,
                      width: `${skill.proficiency}%`,
                      backgroundColor: getProficiencyColor(skill.proficiency),
                    }}
                  />
                </div>
                <p style={styles.updateDate}>
                  最近更新: {formatDate(skill.lastUpdated)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div style={styles.divider} />

        <div style={styles.rightPanel}>
          <h3 style={styles.sectionTitle}>参与项目</h3>
          <div style={styles.projectsList}>
            {member.projects.map(project => (
              <div key={project.id} style={styles.projectItem}>
                <div style={styles.projectIcon}>📁</div>
                <div style={styles.projectInfo}>
                  <h4 style={styles.projectName}>{project.name}</h4>
                  <p style={styles.projectRole}>{project.role}</p>
                </div>
              </div>
            ))}
            {member.projects.length === 0 && (
              <p style={styles.emptyText}>暂无参与项目</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '32px',
    animation: 'fadeIn 0.5s ease',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
    marginBottom: '32px',
    paddingBottom: '24px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  },
  avatar: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '32px',
    fontWeight: '700',
    color: 'white',
    boxShadow: '0 4px 20px rgba(59, 130, 246, 0.4)',
    border: '3px solid rgba(255, 255, 255, 0.3)',
  },
  headerInfo: {
    flex: 1,
  },
  name: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: '12px',
  },
  info: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  infoBadge: {
    padding: '6px 14px',
    borderRadius: '20px',
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    fontSize: '13px',
    color: '#93c5fd',
    fontWeight: '500',
  },
  content: {
    display: 'flex',
    gap: '32px',
    minHeight: '400px',
  },
  leftPanel: {
    flex: 1.5,
  },
  divider: {
    width: '1px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  rightPanel: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  skillsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  skillItem: {
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    transition: 'all 0.25s ease',
  },
  skillHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  skillNameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  categoryDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
  },
  skillName: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#e2e8f0',
  },
  categoryTag: {
    fontSize: '11px',
    padding: '3px 8px',
    borderRadius: '6px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#94a3b8',
  },
  skillValue: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#34d399',
  },
  progressBarBg: {
    height: '10px',
    borderRadius: '5px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    marginBottom: '8px',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: '5px',
    transition: 'width 0.5s ease',
  },
  updateDate: {
    fontSize: '12px',
    color: '#64748b',
  },
  projectsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  projectItem: {
    display: 'flex',
    gap: '14px',
    padding: '16px',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    transition: 'all 0.25s ease',
  },
  projectIcon: {
    fontSize: '24px',
  },
  projectInfo: {
    flex: 1,
  },
  projectName: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: '4px',
  },
  projectRole: {
    fontSize: '13px',
    color: '#94a3b8',
  },
  emptyText: {
    color: '#64748b',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: '40px',
  },
};

export default MemberDetail;
