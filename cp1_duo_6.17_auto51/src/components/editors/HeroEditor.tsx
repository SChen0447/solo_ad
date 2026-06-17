import { useState, useMemo, useRef, useEffect } from 'react';
import { Hero, Skill } from '../../types';
import { CLASS_COLORS, CLASS_NAMES } from '../../data/heroes';
import { SKILLS } from '../../data/skills';
import { useAppStore } from '../../store/gameStore';
import './HeroEditor.css';

interface HeroEditorProps {
  hero: Hero;
  onClose?: () => void;
}

export default function HeroEditor({ hero, onClose }: HeroEditorProps) {
  const { updateHero } = useAppStore();
  const [showSkillModal, setShowSkillModal] = useState(false);
  const [selectedSkillSlot, setSelectedSkillSlot] = useState<number>(-1);
  const [skillSearch, setSkillSearch] = useState('');
  const [skillTypeFilter, setSkillTypeFilter] = useState<string>('all');
  const [savedSlot, setSavedSlot] = useState<number>(-1);
  const initialValues = useRef<Record<string, number>>({
    maxHp: hero.maxHp,
    attack: hero.attack,
    defense: hero.defense,
    speed: hero.speed,
  });

  const classColor = CLASS_COLORS[hero.heroClass];

  const statVariance = (base: number) => {
    const v = base * 0.2;
    return { min: Math.round(base - v), max: Math.round(base + v) };
  };

  const hasSignificantChange = (stat: string, current: number): boolean => {
    const initial = initialValues.current[stat] || current;
    if (initial === 0) return current > 0;
    const change = Math.abs((current - initial) / initial);
    return change > 0.1;
  };

  const handleStatChange = (stat: keyof Hero, value: number) => {
    updateHero(hero.id, { [stat]: value } as Partial<Hero>);
  };

  const filteredSkills = useMemo(() => {
    return SKILLS.filter((s) => {
      if (skillTypeFilter !== 'all' && s.type !== skillTypeFilter) return false;
      if (skillSearch && !s.name.toLowerCase().includes(skillSearch.toLowerCase())) return false;
      return true;
    });
  }, [skillSearch, skillTypeFilter]);

  const handleSkillSelect = (skill: Skill) => {
    if (selectedSkillSlot >= 0 && selectedSkillSlot < 3) {
      const newSkills = [...hero.skills];
      newSkills[selectedSkillSlot] = skill;
      updateHero(hero.id, { skills: newSkills });
      setSavedSlot(selectedSkillSlot);
      setTimeout(() => setSavedSlot(-1), 2000);
    }
    setShowSkillModal(false);
    setSelectedSkillSlot(-1);
  };

  const openSkillModal = (slot: number) => {
    setSelectedSkillSlot(slot);
    setShowSkillModal(true);
  };

  const atkVar = statVariance(hero.attack);
  const defVar = statVariance(hero.defense);

  const StatRow = ({
    label,
    stat,
    value,
    showVariance,
  }: {
    label: string;
    stat: string;
    value: number;
    showVariance?: { min: number; max: number };
  }) => {
    const isChanged = hasSignificantChange(stat, value);
    return (
      <div className="stat-row">
        <div className="stat-label">{label}</div>
        <div className="stat-value-row">
          <div className={`stat-value ${isChanged ? 'changed' : ''}`}>
            {value}
            {showVariance && (
              <span className="stat-variance">
                ({showVariance.min} ~ {showVariance.max})
              </span>
            )}
          </div>
          <div className={`stat-number-tag ${isChanged ? 'highlight' : ''}`}>
            {value}
          </div>
        </div>
        <input
          type="range"
          min="0"
          max="999"
          value={value}
          onChange={(e) => handleStatChange(stat as keyof Hero, parseInt(e.target.value))}
          className="stat-slider"
        />
      </div>
    );
  };

  return (
    <div className="hero-editor">
      <div className="hero-editor-header">
        <div
          className="hero-editor-avatar"
          style={{ boxShadow: `0 0 20px ${classColor}50`, borderColor: classColor }}
        >
          <span className="hero-avatar-emoji">{hero.avatar}</span>
        </div>
        <div className="hero-editor-info">
          <div className="hero-editor-name" style={{ color: classColor }}>{hero.name}</div>
          <div className="hero-editor-class">{CLASS_NAMES[hero.heroClass]}</div>
        </div>
        {onClose && (
          <button className="hero-editor-close" onClick={onClose}>×</button>
        )}
      </div>

      <div className="hero-stats">
        <StatRow label="生命值" stat="maxHp" value={hero.maxHp} />
        <StatRow label="攻击力" stat="attack" value={hero.attack} showVariance={atkVar} />
        <StatRow label="防御力" stat="defense" value={hero.defense} showVariance={defVar} />
        <StatRow label="速度" stat="speed" value={hero.speed} />
      </div>

      <div className="skills-section">
        <div className="skills-title">技能</div>
        <div className="skill-slots">
          {hero.skills.map((skill, idx) => (
            <div
              key={idx}
              className="skill-slot"
              onClick={() => openSkillModal(idx)}
              style={{ borderColor: skill ? classColor : '#444' }}
            >
              {skill ? (
                <>
                  <span className="skill-icon">{skill.icon}</span>
                  <span className="skill-name">{skill.name}</span>
                  <span className="skill-cd">CD: {skill.cooldown}</span>
                </>
              ) : (
                <span className="skill-empty">+ 添加技能</span>
              )}
              {savedSlot === idx && (
                <span className="skill-saved-checkmark">✓</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {showSkillModal && (
        <div className="skill-modal-overlay" onClick={() => setShowSkillModal(false)}>
          <div className="skill-modal" onClick={(e) => e.stopPropagation()}>
            <div className="skill-modal-header">
              <h3>选择技能</h3>
              <button onClick={() => setShowSkillModal(false)}>×</button>
            </div>
            <div className="skill-modal-filters">
              <input
                type="text"
                placeholder="搜索技能..."
                value={skillSearch}
                onChange={(e) => setSkillSearch(e.target.value)}
                className="skill-search"
              />
              <select
                value={skillTypeFilter}
                onChange={(e) => setSkillTypeFilter(e.target.value)}
                className="skill-filter-select"
              >
                <option value="all">全部类型</option>
                <option value="damage">伤害</option>
                <option value="heal">治疗</option>
                <option value="buff">增益</option>
                <option value="debuff">减益</option>
              </select>
            </div>
            <div className="skill-list">
              {filteredSkills.map((skill) => (
                <div
                  key={skill.id}
                  className="skill-card"
                  onClick={() => handleSkillSelect(skill)}
                >
                  <div className="skill-card-icon">{skill.icon}</div>
                  <div className="skill-card-info">
                    <div className="skill-card-name">{skill.name}</div>
                    <div className="skill-card-desc">{skill.description}</div>
                    <div className="skill-card-stats">
                      <span>伤害: {skill.damage > 0 ? Math.round(skill.damage * 100) + '%' : '—'}</span>
                      <span>冷却: {skill.cooldown}回合</span>
                      <span>范围: {skill.range}格</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
