import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useResumeStore } from '../store/resumeStore';
import {
  Block,
  PersonalInfoData,
  ExperienceItem,
  EducationItem,
  SkillItem,
  ProjectItem,
  BlockData,
} from '../types';

export const EditSidebar: React.FC = () => {
  const { resume, selectedBlockId, toggleSidebar, isSidebarOpen, updateBlock } = useResumeStore();
  const [isClosing, setIsClosing] = useState(false);

  const selectedBlock = resume.blocks.find((b) => b.id === selectedBlockId);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      toggleSidebar(false);
      setIsClosing(false);
    }, 280);
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSidebarOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isSidebarOpen]);

  if (!isSidebarOpen || !selectedBlock) return null;

  const updateData = (data: BlockData) => {
    updateBlock(selectedBlock.id, data);
  };

  return (
    <>
      <div className="edit-sidebar-overlay" onClick={handleOverlayClick} />
      <aside className={`edit-sidebar ${isClosing ? 'fade-out' : ''}`}>
        <div className="edit-sidebar-header">
          <h3 className="edit-sidebar-title">编辑 {selectedBlock.title}</h3>
          <button className="edit-sidebar-close" onClick={handleClose} title="关闭">
            ✕
          </button>
        </div>
        <div className="edit-sidebar-content scrollbar">
          <EditForm block={selectedBlock} onUpdate={updateData} />
        </div>
      </aside>
    </>
  );
};

interface EditFormProps {
  block: Block;
  onUpdate: (data: BlockData) => void;
}

const EditForm: React.FC<EditFormProps> = ({ block, onUpdate }) => {
  switch (block.type) {
    case 'personal':
      return <PersonalForm data={block.data as PersonalInfoData} onUpdate={onUpdate} />;
    case 'experience':
      return (
        <ItemListForm
          type="experience"
          data={block.data as { items: ExperienceItem[] }}
          onUpdate={onUpdate}
        />
      );
    case 'education':
      return (
        <ItemListForm
          type="education"
          data={block.data as { items: EducationItem[] }}
          onUpdate={onUpdate}
        />
      );
    case 'skills':
      return (
        <SkillForm
          data={block.data as { items: SkillItem[] }}
          onUpdate={onUpdate}
        />
      );
    case 'projects':
      return (
        <ItemListForm
          type="projects"
          data={block.data as { items: ProjectItem[] }}
          onUpdate={onUpdate}
        />
      );
    default:
      return null;
  }
};

const PersonalForm: React.FC<{
  data: PersonalInfoData;
  onUpdate: (d: PersonalInfoData) => void;
}> = ({ data, onUpdate }) => {
  const change = (key: keyof PersonalInfoData, value: string) =>
    onUpdate({ ...data, [key]: value });

  return (
    <>
      <div className="form-group">
        <label className="form-label">姓名</label>
        <input
          className="form-input"
          value={data.name}
          onChange={(e) => change('name', e.target.value)}
          placeholder="你的姓名"
        />
      </div>
      <div className="form-group">
        <label className="form-label">职位头衔</label>
        <input
          className="form-input"
          value={data.title}
          onChange={(e) => change('title', e.target.value)}
          placeholder="例如：前端工程师"
        />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">邮箱</label>
          <input
            type="email"
            className="form-input"
            value={data.email}
            onChange={(e) => change('email', e.target.value)}
            placeholder="your@email.com"
          />
        </div>
        <div className="form-group">
          <label className="form-label">电话</label>
          <input
            className="form-input"
            value={data.phone}
            onChange={(e) => change('phone', e.target.value)}
            placeholder="138-0000-0000"
          />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">所在城市</label>
        <input
          className="form-input"
          value={data.location}
          onChange={(e) => change('location', e.target.value)}
          placeholder="例如：北京"
        />
      </div>
      <div className="form-group">
        <label className="form-label">个人简介</label>
        <textarea
          className="form-textarea"
          value={data.summary}
          onChange={(e) => change('summary', e.target.value)}
          placeholder="简要介绍你的背景、优势和职业目标...（支持Markdown）"
        />
      </div>
    </>
  );
};

type ListItem = ExperienceItem | EducationItem | ProjectItem;

interface ItemListFormProps<T extends ListItem> {
  type: 'experience' | 'education' | 'projects';
  data: { items: T[] };
  onUpdate: (d: { items: T[] }) => void;
}

const ItemListForm = <T extends ListItem>({
  type,
  data,
  onUpdate,
}: ItemListFormProps<T>) => {
  const updateItem = (idx: number, field: keyof T, value: string) => {
    const items = [...data.items];
    items[idx] = { ...items[idx], [field]: value } as T;
    onUpdate({ items });
  };

  const addItem = () => {
    const baseId = uuidv4();
    let newItem: ListItem;
    switch (type) {
      case 'experience':
        newItem = {
          id: baseId,
          company: '',
          position: '',
          startDate: '',
          endDate: '',
          description: '',
        };
        break;
      case 'education':
        newItem = {
          id: baseId,
          school: '',
          degree: '',
          major: '',
          startDate: '',
          endDate: '',
          description: '',
        };
        break;
      case 'projects':
        newItem = {
          id: baseId,
          name: '',
          role: '',
          startDate: '',
          endDate: '',
          description: '',
          link: '',
        };
        break;
    }
    onUpdate({ items: [...data.items, newItem as T] });
  };

  const removeItem = (idx: number) => {
    onUpdate({ items: data.items.filter((_, i) => i !== idx) });
  };

  return (
    <>
      {data.items.map((item, idx) => (
        <div key={item.id} className="sub-item">
          <button
            className="sub-item-remove"
            onClick={() => removeItem(idx)}
            title="删除此项"
          >
            ✕
          </button>
          {type === 'experience' && (
            <ExperienceFields
              item={item as ExperienceItem}
              update={(f, v) => updateItem(idx, f as keyof T, v)}
            />
          )}
          {type === 'education' && (
            <EducationFields
              item={item as EducationItem}
              update={(f, v) => updateItem(idx, f as keyof T, v)}
            />
          )}
          {type === 'projects' && (
            <ProjectFields
              item={item as ProjectItem}
              update={(f, v) => updateItem(idx, f as keyof T, v)}
            />
          )}
        </div>
      ))}
      <button className="btn-add-item" onClick={addItem}>
        <span>＋</span> 添加{type === 'experience' ? '工作经历' : type === 'education' ? '教育经历' : '项目'}
      </button>
    </>
  );
};

const ExperienceFields: React.FC<{
  item: ExperienceItem;
  update: (f: keyof ExperienceItem, v: string) => void;
}> = ({ item, update }) => (
  <>
    <div className="form-row">
      <div className="form-group">
        <label className="form-label">公司</label>
        <input
          className="form-input"
          value={item.company}
          onChange={(e) => update('company', e.target.value)}
          placeholder="公司名称"
        />
      </div>
      <div className="form-group">
        <label className="form-label">职位</label>
        <input
          className="form-input"
          value={item.position}
          onChange={(e) => update('position', e.target.value)}
          placeholder="你的职位"
        />
      </div>
    </div>
    <div className="form-row">
      <div className="form-group">
        <label className="form-label">开始时间</label>
        <input
          type="month"
          className="form-input"
          value={item.startDate}
          onChange={(e) => update('startDate', e.target.value)}
        />
      </div>
      <div className="form-group">
        <label className="form-label">结束时间</label>
        <input
          className="form-input"
          value={item.endDate}
          onChange={(e) => update('endDate', e.target.value)}
          placeholder="至今 / 2024-01"
        />
      </div>
    </div>
    <div className="form-group">
      <label className="form-label">工作描述</label>
      <textarea
        className="form-textarea"
        value={item.description}
        onChange={(e) => update('description', e.target.value)}
        placeholder="描述你的职责和成就，支持Markdown语法..."
      />
    </div>
  </>
);

const EducationFields: React.FC<{
  item: EducationItem;
  update: (f: keyof EducationItem, v: string) => void;
}> = ({ item, update }) => (
  <>
    <div className="form-row">
      <div className="form-group">
        <label className="form-label">学校</label>
        <input
          className="form-input"
          value={item.school}
          onChange={(e) => update('school', e.target.value)}
          placeholder="学校名称"
        />
      </div>
      <div className="form-group">
        <label className="form-label">学位</label>
        <input
          className="form-input"
          value={item.degree}
          onChange={(e) => update('degree', e.target.value)}
          placeholder="本科/硕士/博士"
        />
      </div>
    </div>
    <div className="form-group">
      <label className="form-label">专业</label>
      <input
        className="form-input"
        value={item.major}
        onChange={(e) => update('major', e.target.value)}
        placeholder="所学专业"
      />
    </div>
    <div className="form-row">
      <div className="form-group">
        <label className="form-label">入学时间</label>
        <input
          type="month"
          className="form-input"
          value={item.startDate}
          onChange={(e) => update('startDate', e.target.value)}
        />
      </div>
      <div className="form-group">
        <label className="form-label">毕业时间</label>
        <input
          type="month"
          className="form-input"
          value={item.endDate}
          onChange={(e) => update('endDate', e.target.value)}
        />
      </div>
    </div>
    <div className="form-group">
      <label className="form-label">描述</label>
      <textarea
        className="form-textarea"
        value={item.description}
        onChange={(e) => update('description', e.target.value)}
        placeholder="主修课程、成绩、获奖等..."
      />
    </div>
  </>
);

const ProjectFields: React.FC<{
  item: ProjectItem;
  update: (f: keyof ProjectItem, v: string) => void;
}> = ({ item, update }) => (
  <>
    <div className="form-row">
      <div className="form-group">
        <label className="form-label">项目名称</label>
        <input
          className="form-input"
          value={item.name}
          onChange={(e) => update('name', e.target.value)}
          placeholder="项目名称"
        />
      </div>
      <div className="form-group">
        <label className="form-label">担任角色</label>
        <input
          className="form-input"
          value={item.role}
          onChange={(e) => update('role', e.target.value)}
          placeholder="你的角色"
        />
      </div>
    </div>
    <div className="form-row">
      <div className="form-group">
        <label className="form-label">开始时间</label>
        <input
          type="month"
          className="form-input"
          value={item.startDate}
          onChange={(e) => update('startDate', e.target.value)}
        />
      </div>
      <div className="form-group">
        <label className="form-label">结束时间</label>
        <input
          className="form-input"
          value={item.endDate}
          onChange={(e) => update('endDate', e.target.value)}
          placeholder="至今"
        />
      </div>
    </div>
    <div className="form-group">
      <label className="form-label">项目链接</label>
      <input
        type="url"
        className="form-input"
        value={item.link || ''}
        onChange={(e) => update('link', e.target.value)}
        placeholder="https://..."
      />
    </div>
    <div className="form-group">
      <label className="form-label">项目描述</label>
      <textarea
        className="form-textarea"
        value={item.description}
        onChange={(e) => update('description', e.target.value)}
        placeholder="描述项目背景、你的贡献和成果..."
      />
    </div>
  </>
);

const SkillForm: React.FC<{
  data: { items: SkillItem[] };
  onUpdate: (d: { items: SkillItem[] }) => void;
}> = ({ data, onUpdate }) => {
  const updateItem = (idx: number, field: keyof SkillItem, value: string | number) => {
    const items = [...data.items];
    items[idx] = { ...items[idx], [field]: value } as SkillItem;
    onUpdate({ items });
  };

  const addSkill = () => {
    onUpdate({
      items: [...data.items, { id: uuidv4(), name: '', level: 80 }],
    });
  };

  const removeSkill = (idx: number) => {
    onUpdate({ items: data.items.filter((_, i) => i !== idx) });
  };

  return (
    <>
      {data.items.map((skill, idx) => (
        <div key={skill.id} className="sub-item">
          <button
            className="sub-item-remove"
            onClick={() => removeSkill(idx)}
            title="删除此技能"
          >
            ✕
          </button>
          <div className="form-group">
            <label className="form-label">技能名称</label>
            <input
              className="form-input"
              value={skill.name}
              onChange={(e) => updateItem(idx, 'name', e.target.value)}
              placeholder="例如：React"
            />
          </div>
          <div className="form-group">
            <label className="form-label">熟练度 ({skill.level}%)</label>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={skill.level}
              onChange={(e) => updateItem(idx, 'level', parseInt(e.target.value, 10))}
              style={{ width: '100%' }}
            />
          </div>
        </div>
      ))}
      <button className="btn-add-item" onClick={addSkill}>
        <span>＋</span> 添加技能
      </button>
    </>
  );
};
