import { useState } from 'react';
import { Member, categoryColors } from '../types';

interface MemberCardProps {
  member: Member;
  onClick: () => void;
}

function MemberCard({ member, onClick }: MemberCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const displaySkills = member.skills.slice(0, 5);

  const getProficiencyColor = (proficiency: number) => {
    const ratio = proficiency / 100;
    const r = Math.round(239 + (34 - 239) * ratio);
    const g = Math.round(68 + (197 - 68) * ratio);
    const b = Math.round(68 + (94 - 68) * ratio);
    return `rgb(${r}, ${g}, ${b})`;
  };

  const getGradientStyle = () => {
    if (displaySkills.length === 0) {
      return 'linear-gradient(135deg, #dbeafe 0%, #e9d5ff 100%)';
    }
    const mainCategory = displaySkills[0].category;
    const colorMap: Record<string, string> = {
      frontend: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 50%, #ddd6fe 100%)',
      backend: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 50%, #ddd6fe 100%)',
      database: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 50%, #ddd6fe 100%)',
      testing: 'linear-gradient(135deg, #fef9c3 0%, #fef08a 50%, #ddd6fe 100%)',
      devops: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 50%, #ddd6fe 100%)',
    };
    return colorMap[mainCategory] || 'linear-gradient(135deg, #dbeafe 0%, #e9d5ff 100%)';
  };

  return (
    <div
      style={{
        ...styles.card,
        background: getGradientStyle(),
        transform: isHovered ? 'translateY(-8px)' : 'translateY(0)',
        boxShadow: isHovered
          ? '0 20px 40px rgba(0, 0, 0, 0.3)'
          : '0 4px 20px rgba(0, 0, 0, 0.15)',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      <div style={styles.header}>
        <div style={styles.avatar}>
          {member.name.charAt(0).toUpperCase()}
        </div>
        <div style={styles.headerInfo}>
          <h3 style={styles.name}>{member.name}</h3>
          <p style={styles.projectCount}>
            <span style={styles.projectIcon}>📋</span>
            {member.currentProjectCount} 个进行中项目
          </p>
        </div>
      </div>

      <div style={styles.tagsContainer}>
        {displaySkills.map(skill => (
          <span
            key={skill.skillId}
            style={{
              ...styles.tag,
              backgroundColor: categoryColors[skill.category]?.bg || '#6b7280',
              color: categoryColors[skill.category]?.text || '#ffffff',
            }}
          >
            {skill.skillName}
          </span>
        ))}
      </div>

      <div style={styles.progressContainer}>
        {displaySkills.map(skill => (
          <div key={skill.skillId} style={styles.progressItem}>
            <div style={styles.progressLabel}>
              <span style={styles.progressSkillName}>{skill.skillName}</span>
              <span style={styles.progressValue}>{skill.proficiency}%</span>
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
          </div>
        ))}
      </div>

      {member.skills.length > 5 && (
        <p style={styles.moreText}>还有 {member.skills.length - 5} 项技能...</p>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    borderRadius: '20px',
    padding: '24px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    animation: 'fadeIn 0.5s ease',
    minHeight: '320px',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '20px',
  },
  avatar: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    fontWeight: '700',
    color: 'white',
    boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)',
    border: '3px solid rgba(255, 255, 255, 0.5)',
  },
  headerInfo: {
    flex: 1,
  },
  name: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '4px',
  },
  projectCount: {
    fontSize: '13px',
    color: '#475569',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  projectIcon: {
    fontSize: '14px',
  },
  tagsContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '16px',
  },
  tag: {
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
  },
  progressContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    flex: 1,
  },
  progressItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  progressLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressSkillName: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#334155',
  },
  progressValue: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#64748b',
  },
  progressBarBg: {
    height: '8px',
    borderRadius: '4px',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.5s ease',
  },
  moreText: {
    marginTop: '12px',
    fontSize: '12px',
    color: '#64748b',
    fontStyle: 'italic',
  },
};

export default MemberCard;
