import { useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PreviewPanel from './PreviewPanel';
import ExportButton from './ExportButton';
import { ResumeData, TemplateId, WorkExperience, Work } from '../types';
import { TEMPLATES } from '../templates';
import { generateId } from '../utils';

interface EditPageProps {
  resumeData: ResumeData;
  setResumeData: (data: ResumeData) => void;
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#f0f2f5',
    display: 'flex',
    flexDirection: 'column',
  },
  toolbar: {
    height: '60px',
    background: '#1a202c',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  toolbarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  logo: {
    color: '#ffffff',
    fontSize: '18px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  templateSelect: {
    padding: '7px 12px',
    borderRadius: '6px',
    background: '#2d3748',
    color: '#ffffff',
    border: '1px solid #4a5568',
    fontSize: '13px',
    cursor: 'pointer',
    outline: 'none',
  },
  content: {
    flex: 1,
    display: 'flex',
    height: 'calc(100vh - 60px)',
  },
  formPanel: {
    width: '360px',
    background: '#edf2f7',
    padding: '24px',
    overflowY: 'auto',
    flexShrink: 0,
  },
  previewPanel: {
    flex: 1,
    background: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px',
    overflow: 'auto',
  },
  formGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    color: '#2d3748',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '9px 12px',
    border: '1px solid #cbd5e0',
    borderRadius: '6px',
    fontSize: '13px',
    outline: 'none',
    background: '#ffffff',
    transition: 'border-color 0.2s ease',
  },
  textarea: {
    width: '100%',
    padding: '9px 12px',
    border: '1px solid #cbd5e0',
    borderRadius: '6px',
    fontSize: '13px',
    outline: 'none',
    resize: 'vertical',
    minHeight: '68px',
    background: '#ffffff',
    fontFamily: 'inherit',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#2d3748',
  },
  addBtn: {
    padding: '5px 12px',
    background: '#38b2ac',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.2s ease',
  },
  itemCard: {
    background: '#ffffff',
    borderRadius: '8px',
    padding: '14px',
    marginBottom: '10px',
    border: '1px solid #e2e8f0',
    position: 'relative',
  },
  removeBtn: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    background: '#fed7d7',
    color: '#c53030',
    border: 'none',
    fontSize: '13px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 600,
  },
  itemRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
    marginBottom: '8px',
  },
  skillTags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginTop: '8px',
  },
  skillTag: {
    padding: '4px 10px',
    background: '#e2e8f0',
    borderRadius: '14px',
    fontSize: '12px',
    color: '#2d3748',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  skillTagRemove: {
    cursor: 'pointer',
    color: '#718096',
    fontWeight: 700,
    fontSize: '14px',
    lineHeight: 1,
  },
  backBtn: {
    color: '#a0aec0',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
};

export default function EditPage({ resumeData, setResumeData }: EditPageProps) {
  const navigate = useNavigate();
  const { templateId } = useParams<{ templateId: string }>();
  const [skillInput, setSkillInput] = useState('');
  const previewWrapRef = useRef<HTMLDivElement>(null);

  const currentTemplate = useMemo(() => {
    const found = TEMPLATES.find((t) => t.id === templateId);
    return found || TEMPLATES[0];
  }, [templateId]);

  const updateField = <K extends keyof ResumeData>(key: K, value: ResumeData[K]) => {
    setResumeData({ ...resumeData, [key]: value });
  };

  const addExperience = () => {
    const newExp: WorkExperience = {
      id: generateId(),
      company: '',
      position: '',
      period: '',
      description: '',
    };
    updateField('experiences', [...resumeData.experiences, newExp]);
  };

  const removeExperience = (id: string) => {
    updateField(
      'experiences',
      resumeData.experiences.filter((e) => e.id !== id)
    );
  };

  const updateExperience = (id: string, field: keyof WorkExperience, value: string) => {
    updateField(
      'experiences',
      resumeData.experiences.map((e) =>
        e.id === id ? { ...e, [field]: value } : e
      )
    );
  };

  const addSkill = () => {
    const skill = skillInput.trim();
    if (skill && !resumeData.skills.includes(skill)) {
      updateField('skills', [...resumeData.skills, skill]);
      setSkillInput('');
    }
  };

  const removeSkill = (skill: string) => {
    updateField(
      'skills',
      resumeData.skills.filter((s) => s !== skill)
    );
  };

  const addWork = () => {
    const newWork: Work = {
      id: generateId(),
      title: '',
      description: '',
      thumbnailUrl: '',
    };
    updateField('works', [...resumeData.works, newWork]);
  };

  const removeWork = (id: string) => {
    updateField(
      'works',
      resumeData.works.filter((w) => w.id !== id)
    );
  };

  const updateWork = (id: string, field: keyof Work, value: string) => {
    updateField(
      'works',
      resumeData.works.map((w) =>
        w.id === id ? { ...w, [field]: value } : w
      )
    );
  };

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    navigate(`/edit/${e.target.value}`, { replace: true });
  };

  const getHtmlContent = () => {
    const container = previewWrapRef.current?.querySelector('[data-preview-container]');
    if (!container) return '';
    const styles = `
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; }
      </style>
    `;
    return styles + container.outerHTML;
  };

  return (
    <div style={styles.page}>
      <div style={styles.toolbar}>
        <div style={styles.toolbarLeft}>
          <button style={styles.backBtn} onClick={() => navigate('/')}>
            ← 返回
          </button>
          <div style={styles.logo} onClick={() => navigate('/')}>
            简历与作品集生成器
          </div>
          <select
            style={styles.templateSelect}
            value={currentTemplate.id}
            onChange={handleTemplateChange}
          >
            {TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <ExportButton getHtmlContent={getHtmlContent} fileName={resumeData.name || 'resume'} />
      </div>

      <div style={styles.content}>
        <div style={styles.formPanel}>
          <div style={styles.formGroup}>
            <label style={styles.label}>姓名</label>
            <input
              style={styles.input}
              value={resumeData.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="请输入你的姓名"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>头像链接</label>
            <input
              style={styles.input}
              value={resumeData.avatarUrl}
              onChange={(e) => updateField('avatarUrl', e.target.value)}
              placeholder="输入头像图片 URL"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>个人简介</label>
            <textarea
              style={styles.textarea}
              value={resumeData.bio}
              onChange={(e) => updateField('bio', e.target.value)}
              placeholder="一段简短的自我介绍..."
            />
          </div>

          <div style={styles.formGroup}>
            <div style={styles.sectionHeader}>
              <span style={styles.sectionTitle}>工作经历</span>
              <button style={styles.addBtn} onClick={addExperience}>
                + 添加
              </button>
            </div>
            {resumeData.experiences.map((exp) => (
              <div key={exp.id} style={styles.itemCard}>
                <button style={styles.removeBtn} onClick={() => removeExperience(exp.id)}>
                  ×
                </button>
                <div style={styles.itemRow}>
                  <div>
                    <label style={{ ...styles.label, fontSize: '11px' }}>职位</label>
                    <input
                      style={styles.input}
                      value={exp.position}
                      onChange={(e) => updateExperience(exp.id, 'position', e.target.value)}
                      placeholder="职位名称"
                    />
                  </div>
                  <div>
                    <label style={{ ...styles.label, fontSize: '11px' }}>时间段</label>
                    <input
                      style={styles.input}
                      value={exp.period}
                      onChange={(e) => updateExperience(exp.id, 'period', e.target.value)}
                      placeholder="2023.01 - 至今"
                    />
                  </div>
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <label style={{ ...styles.label, fontSize: '11px' }}>公司</label>
                  <input
                    style={styles.input}
                    value={exp.company}
                    onChange={(e) => updateExperience(exp.id, 'company', e.target.value)}
                    placeholder="公司名称"
                  />
                </div>
                <div>
                  <label style={{ ...styles.label, fontSize: '11px' }}>描述</label>
                  <textarea
                    style={{ ...styles.textarea, minHeight: '52px' }}
                    value={exp.description}
                    onChange={(e) => updateExperience(exp.id, 'description', e.target.value)}
                    placeholder="工作内容描述..."
                  />
                </div>
              </div>
            ))}
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>技能标签</label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                style={styles.input}
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addSkill();
                  }
                }}
                placeholder="输入后按回车添加"
              />
              <button style={styles.addBtn} onClick={addSkill}>
                添加
              </button>
            </div>
            <div style={styles.skillTags}>
              {resumeData.skills.map((s) => (
                <span key={s} style={styles.skillTag}>
                  {s}
                  <span style={styles.skillTagRemove} onClick={() => removeSkill(s)}>
                    ×
                  </span>
                </span>
              ))}
            </div>
          </div>

          <div style={styles.formGroup}>
            <div style={styles.sectionHeader}>
              <span style={styles.sectionTitle}>作品展示</span>
              <button style={styles.addBtn} onClick={addWork}>
                + 添加
              </button>
            </div>
            {resumeData.works.map((work) => (
              <div key={work.id} style={styles.itemCard}>
                <button style={styles.removeBtn} onClick={() => removeWork(work.id)}>
                  ×
                </button>
                <div style={{ marginBottom: '8px' }}>
                  <label style={{ ...styles.label, fontSize: '11px' }}>作品名称</label>
                  <input
                    style={styles.input}
                    value={work.title}
                    onChange={(e) => updateWork(work.id, 'title', e.target.value)}
                    placeholder="作品名称"
                  />
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <label style={{ ...styles.label, fontSize: '11px' }}>缩略图 URL</label>
                  <input
                    style={styles.input}
                    value={work.thumbnailUrl}
                    onChange={(e) => updateWork(work.id, 'thumbnailUrl', e.target.value)}
                    placeholder="图片链接"
                  />
                </div>
                <div>
                  <label style={{ ...styles.label, fontSize: '11px' }}>作品描述</label>
                  <textarea
                    style={{ ...styles.textarea, minHeight: '52px' }}
                    value={work.description}
                    onChange={(e) => updateWork(work.id, 'description', e.target.value)}
                    placeholder="作品描述..."
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={styles.previewPanel} ref={previewWrapRef}>
          <PreviewPanel data={resumeData} template={currentTemplate} />
        </div>
      </div>
    </div>
  );
}
