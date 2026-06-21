import { useState } from 'react';
import { Skill, ProjectRequirementSkill, categoryColors, categoryNames } from '../types';

interface ProjectFormProps {
  skills: Skill[];
  onSubmit: (requirementId: number, name: string) => void;
}

interface SelectedSkill extends ProjectRequirementSkill {
  name: string;
  category: string;
}

function ProjectForm({ skills, onSubmit }: ProjectFormProps) {
  const [projectName, setProjectName] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<SelectedSkill[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const categories = ['all', 'frontend', 'backend', 'database', 'testing', 'devops'];

  const filteredSkills = categoryFilter === 'all'
    ? skills
    : skills.filter(s => s.category === categoryFilter);

  const toggleSkill = (skill: Skill) => {
    const exists = selectedSkills.find(s => s.skillId === skill.id);
    if (exists) {
      setSelectedSkills(selectedSkills.filter(s => s.skillId !== skill.id));
    } else {
      setSelectedSkills([...selectedSkills, {
        skillId: skill.id,
        name: skill.name,
        category: skill.category,
        minProficiency: 60,
        weight: 1,
      }]);
    }
  };

  const updateSkillProficiency = (skillId: number, value: number) => {
    setSelectedSkills(selectedSkills.map(s =>
      s.skillId === skillId ? { ...s, minProficiency: value } : s
    ));
  };

  const updateSkillWeight = (skillId: number, value: number) => {
    setSelectedSkills(selectedSkills.map(s =>
      s.skillId === skillId ? { ...s, weight: value } : s
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim() || selectedSkills.length === 0) {
      alert('请填写项目名称并选择至少一个技能');
      return;
    }

    try {
      const res = await fetch('/api/project-requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: projectName,
          skills: selectedSkills.map(s => ({
            skillId: s.skillId,
            minProficiency: s.minProficiency,
            weight: s.weight,
          })),
        }),
      });

      const data = await res.json();
      if (data.id) {
        onSubmit(data.id, projectName);
      }
    } catch (error) {
      console.error('Failed to create project requirement:', error);
      alert('创建失败，请重试');
    }
  };

  const resetForm = () => {
    setProjectName('');
    setSelectedSkills([]);
    setCategoryFilter('all');
  };

  return (
    <div className="glass-strong" style={styles.container}>
      <form onSubmit={handleSubmit}>
        <div style={styles.formGroup}>
          <label style={styles.label}>项目名称</label>
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="请输入项目名称"
            style={styles.input}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>
            选择技能标签
            <span style={styles.labelHint}>（点击标签选择/取消）</span>
          </label>

          <div style={styles.categoryFilter}>
            {categories.map(cat => (
              <button
                key={cat}
                type="button"
                style={{
                  ...styles.filterBtn,
                  ...(categoryFilter === cat ? styles.filterBtnActive : {}),
                }}
                onClick={() => setCategoryFilter(cat)}
              >
                {cat === 'all' ? '全部' : categoryNames[cat]}
              </button>
            ))}
          </div>

          <div style={styles.skillsGrid}>
            {filteredSkills.map(skill => {
              const isSelected = selectedSkills.some(s => s.skillId === skill.id);
              return (
                <button
                  key={skill.id}
                  type="button"
                  style={{
                    ...styles.skillTag,
                    backgroundColor: isSelected
                      ? categoryColors[skill.category]?.bg || '#6b7280'
                      : 'rgba(255, 255, 255, 0.1)',
                    borderColor: isSelected
                      ? categoryColors[skill.category]?.bg || '#6b7280'
                      : 'rgba(255, 255, 255, 0.2)',
                    color: isSelected ? '#ffffff' : '#e2e8f0',
                    transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                  }}
                  onClick={() => toggleSkill(skill)}
                >
                  <span style={styles.skillTagCheck}>
                    {isSelected ? '✓' : '+'}
                  </span>
                  {skill.name}
                </button>
              );
            })}
          </div>
        </div>

        {selectedSkills.length > 0 && (
          <div style={styles.formGroup}>
            <label style={styles.label}>
              技能要求配置
              <span style={styles.labelHint}>
                （已选择 {selectedSkills.length} 个技能）
              </span>
            </label>

            <div style={styles.selectedSkillsContainer}>
              {selectedSkills.map(skill => (
                <div key={skill.skillId} style={styles.selectedSkillItem}>
                  <div style={styles.selectedSkillHeader}>
                    <span
                      style={{
                        ...styles.categoryIndicator,
                        backgroundColor: categoryColors[skill.category]?.bg || '#6b7280',
                      }}
                    />
                    <span style={styles.selectedSkillName}>{skill.name}</span>
                    <span style={styles.selectedSkillCategory}>
                      {categoryNames[skill.category]}
                    </span>
                    <button
                      type="button"
                      style={styles.removeBtn}
                      onClick={() => setSelectedSkills(selectedSkills.filter(s => s.skillId !== skill.skillId))}
                    >
                      ✕
                    </button>
                  </div>

                  <div style={styles.sliderGroup}>
                    <div style={styles.sliderLabel}>
                      <span>最低熟练度要求</span>
                      <span style={styles.sliderValue}>{skill.minProficiency}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={skill.minProficiency}
                      onChange={(e) => updateSkillProficiency(skill.skillId, parseInt(e.target.value))}
                    />
                  </div>

                  <div style={styles.sliderGroup}>
                    <div style={styles.sliderLabel}>
                      <span>重要度权重</span>
                      <span style={styles.sliderValue}>{skill.weight}</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="1"
                      value={skill.weight}
                      onChange={(e) => updateSkillWeight(skill.skillId, parseInt(e.target.value))}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={styles.actions}>
          <button
            type="button"
            style={{ ...styles.btn, ...styles.btnSecondary }}
            onClick={resetForm}
          >
            重置
          </button>
          <button
            type="submit"
            style={styles.btn}
            disabled={!projectName.trim() || selectedSkills.length === 0}
          >
            计算匹配度 →
          </button>
        </div>
      </form>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '32px',
    animation: 'fadeIn 0.5s ease',
  },
  formGroup: {
    marginBottom: '32px',
  },
  label: {
    display: 'block',
    fontSize: '16px',
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: '16px',
  },
  labelHint: {
    fontSize: '13px',
    fontWeight: '400',
    color: '#94a3b8',
    marginLeft: '8px',
  },
  input: {
    fontSize: '16px',
  },
  categoryFilter: {
    display: 'flex',
    gap: '8px',
    marginBottom: '20px',
    flexWrap: 'wrap',
  },
  filterBtn: {
    padding: '8px 16px',
    borderRadius: '20px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    background: 'rgba(255, 255, 255, 0.05)',
    color: '#94a3b8',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.25s ease',
  },
  filterBtnActive: {
    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4), rgba(139, 92, 246, 0.4))',
    borderColor: 'rgba(59, 130, 246, 0.6)',
    color: '#e2e8f0',
  },
  skillsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: '12px',
  },
  skillTag: {
    padding: '12px 16px',
    borderRadius: '12px',
    border: '1px solid',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.25s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    justifyContent: 'center',
  },
  skillTagCheck: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
  },
  selectedSkillsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  selectedSkillItem: {
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '16px',
    padding: '20px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  selectedSkillHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
  },
  categoryIndicator: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  selectedSkillName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#e2e8f0',
  },
  selectedSkillCategory: {
    fontSize: '12px',
    padding: '4px 10px',
    borderRadius: '12px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#94a3b8',
  },
  removeBtn: {
    marginLeft: 'auto',
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    border: 'none',
    background: 'rgba(239, 68, 68, 0.2)',
    color: '#f87171',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.25s ease',
  },
  sliderGroup: {
    marginBottom: '12px',
  },
  sliderLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
    fontSize: '13px',
    color: '#94a3b8',
  },
  sliderValue: {
    fontWeight: '600',
    color: '#60a5fa',
  },
  actions: {
    display: 'flex',
    gap: '16px',
    justifyContent: 'flex-end',
    marginTop: '32px',
  },
  btn: {
    padding: '14px 32px',
    borderRadius: '12px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.25s ease',
    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
    color: 'white',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)',
  },
  btnSecondary: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    boxShadow: 'none',
  },
};

export default ProjectForm;
