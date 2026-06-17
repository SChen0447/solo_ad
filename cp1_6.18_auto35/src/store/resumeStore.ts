import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import {
  Block,
  BlockType,
  Resume,
  Theme,
  THEMES,
  PersonalInfoData,
  ExperienceItem,
  EducationItem,
  SkillItem,
  ProjectItem,
  BlockData,
  BuilderModule,
  BUILDER_MODULES
} from '../types';

interface DeletedBlock {
  block: Block;
  index: number;
}

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  action?: { label: string; onClick: () => void };
}

interface ResumeState {
  resume: Resume;
  currentTheme: Theme;
  selectedBlockId: string | null;
  isSidebarOpen: boolean;
  toasts: Toast[];
  lastDeleted: DeletedBlock | null;
  isExporting: boolean;
  isThemePanelOpen: boolean;
  isMobileMenuOpen: boolean;

  setSelectedBlock: (blockId: string | null) => void;
  toggleSidebar: (open?: boolean) => void;
  addBlock: (type: BlockType, index?: number) => void;
  removeBlock: (blockId: string) => void;
  undoDelete: () => void;
  reorderBlocks: (sourceIndex: number, destinationIndex: number) => void;
  updateBlock: (blockId: string, data: BlockData) => void;
  setTheme: (themeId: string) => void;
  toggleThemePanel: (open?: boolean) => void;
  toggleMobileMenu: (open?: boolean) => void;
  setExporting: (exporting: boolean) => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (toastId: string) => void;
  getResumeById: (id: string) => Resume | null;
  generateShareLink: () => string;
}

const createDefaultBlock = (type: BlockType): Block => {
  const moduleInfo: BuilderModule | undefined = BUILDER_MODULES.find(m => m.type === type);
  const title = moduleInfo ? moduleInfo.title : '未命名模块';

  let data: BlockData;
  switch (type) {
    case 'personal':
      data = {
        name: '你的姓名',
        title: '职位头衔',
        email: 'your@email.com',
        phone: '138-0000-0000',
        location: '所在城市',
        summary: '在这里写一段简短的个人简介，突出你的核心优势和职业目标...'
      } as PersonalInfoData;
      break;
    case 'experience':
      data = {
        items: [
          {
            id: uuidv4(),
            company: '示例公司名称',
            position: '职位名称',
            startDate: '2022-01',
            endDate: '至今',
            description: '- 描述你在该岗位的主要职责和成就\n- 使用项目符号突出关键成果\n- 量化数据会更有说服力'
          } as ExperienceItem
        ]
      };
      break;
    case 'education':
      data = {
        items: [
          {
            id: uuidv4(),
            school: '示例大学名称',
            degree: '本科/硕士/博士',
            major: '所学专业',
            startDate: '2018-09',
            endDate: '2022-06',
            description: '主修课程、GPA、获奖情况等'
          } as EducationItem
        ]
      };
      break;
    case 'skills':
      data = {
        items: [
          { id: uuidv4(), name: '技能1', level: 90 },
          { id: uuidv4(), name: '技能2', level: 80 },
          { id: uuidv4(), name: '技能3', level: 70 }
        ] as SkillItem[]
      };
      break;
    case 'projects':
      data = {
        items: [
          {
            id: uuidv4(),
            name: '项目名称',
            role: '担任角色',
            startDate: '2023-01',
            endDate: '2023-06',
            description: '- 项目背景和目标\n- 你的具体贡献\n- 取得的成果',
            link: 'https://'
          } as ProjectItem
        ]
      };
      break;
    default:
      data = { name: '', title: '', email: '', phone: '', location: '', summary: '' } as PersonalInfoData;
  }

  return {
    id: uuidv4(),
    type,
    title,
    data
  };
};

const createDefaultResume = (): Resume => {
  const now = new Date().toISOString();
  return {
    id: uuidv4(),
    title: '我的简历',
    themeId: 'blue-gray',
    blocks: [
      createDefaultBlock('personal'),
      createDefaultBlock('experience'),
      createDefaultBlock('education'),
      createDefaultBlock('skills')
    ],
    createdAt: now,
    updatedAt: now
  };
};

const loadResumeFromStorage = (): Resume | null => {
  try {
    const saved = localStorage.getItem('current_resume');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // ignore
  }
  return null;
};

const saveResumeToStorage = (resume: Resume) => {
  try {
    localStorage.setItem('current_resume', JSON.stringify(resume));
    const allResumes = JSON.parse(localStorage.getItem('all_resumes') || '{}');
    allResumes[resume.id] = resume;
    localStorage.setItem('all_resumes', JSON.stringify(allResumes));
  } catch {
    // ignore
  }
};

export const useResumeStore = create<ResumeState>((set, get) => {
  const initialResume = loadResumeFromStorage() || createDefaultResume();
  const initialTheme = THEMES.find(t => t.id === initialResume.themeId) || THEMES[0];

  return {
    resume: initialResume,
    currentTheme: initialTheme,
    selectedBlockId: null,
    isSidebarOpen: false,
    toasts: [],
    lastDeleted: null,
    isExporting: false,
    isThemePanelOpen: false,
    isMobileMenuOpen: false,

    setSelectedBlock: (blockId) => {
      set({ selectedBlockId: blockId, isSidebarOpen: blockId !== null });
    },

    toggleSidebar: (open) => {
      const next = typeof open === 'boolean' ? open : !get().isSidebarOpen;
      set({ isSidebarOpen: next });
      if (!next) {
        set({ selectedBlockId: null });
      }
    },

    addBlock: (type, index) => {
      const newBlock = createDefaultBlock(type);
      set(state => {
        const blocks = [...state.resume.blocks];
        const insertIndex = typeof index === 'number' ? index : blocks.length;
        blocks.splice(insertIndex, 0, newBlock);
        const updatedResume = {
          ...state.resume,
          blocks,
          updatedAt: new Date().toISOString()
        };
        saveResumeToStorage(updatedResume);
        return {
          resume: updatedResume,
          selectedBlockId: newBlock.id,
          isSidebarOpen: true
        };
      });
    },

    removeBlock: (blockId) => {
      set(state => {
        const index = state.resume.blocks.findIndex(b => b.id === blockId);
        if (index === -1) return state;
        const block = state.resume.blocks[index];
        const blocks = state.resume.blocks.filter(b => b.id !== blockId);
        const updatedResume = {
          ...state.resume,
          blocks,
          updatedAt: new Date().toISOString()
        };
        saveResumeToStorage(updatedResume);

        const toastId = uuidv4();
        const newToast: Toast = {
          id: toastId,
          message: '模块已删除',
          type: 'info',
          action: {
            label: '撤销',
            onClick: () => {
              get().undoDelete();
              get().removeToast(toastId);
            }
          }
        };

        setTimeout(() => {
          if (get().toasts.find(t => t.id === toastId)) {
            get().removeToast(toastId);
            set({ lastDeleted: null });
          }
        }, 3000);

        return {
          resume: updatedResume,
          lastDeleted: { block, index },
          selectedBlockId: state.selectedBlockId === blockId ? null : state.selectedBlockId,
          isSidebarOpen: state.selectedBlockId === blockId ? false : state.isSidebarOpen,
          toasts: [...state.toasts, newToast]
        };
      });
    },

    undoDelete: () => {
      set(state => {
        if (!state.lastDeleted) return state;
        const { block, index } = state.lastDeleted;
        const blocks = [...state.resume.blocks];
        blocks.splice(index, 0, block);
        const updatedResume = {
          ...state.resume,
          blocks,
          updatedAt: new Date().toISOString()
        };
        saveResumeToStorage(updatedResume);
        return {
          resume: updatedResume,
          lastDeleted: null
        };
      });
    },

    reorderBlocks: (sourceIndex, destinationIndex) => {
      set(state => {
        const blocks = [...state.resume.blocks];
        const [removed] = blocks.splice(sourceIndex, 1);
        blocks.splice(destinationIndex, 0, removed);
        const updatedResume = {
          ...state.resume,
          blocks,
          updatedAt: new Date().toISOString()
        };
        saveResumeToStorage(updatedResume);
        return { resume: updatedResume };
      });
    },

    updateBlock: (blockId, data) => {
      set(state => {
        const blocks = state.resume.blocks.map(block =>
          block.id === blockId ? { ...block, data } : block
        );
        const updatedResume = {
          ...state.resume,
          blocks,
          updatedAt: new Date().toISOString()
        };
        saveResumeToStorage(updatedResume);
        return { resume: updatedResume };
      });
    },

    setTheme: (themeId) => {
      const theme = THEMES.find(t => t.id === themeId);
      if (!theme) return;
      set(state => {
        const updatedResume = {
          ...state.resume,
          themeId,
          updatedAt: new Date().toISOString()
        };
        saveResumeToStorage(updatedResume);
        return {
          currentTheme: theme,
          resume: updatedResume,
          isThemePanelOpen: false
        };
      });
    },

    toggleThemePanel: (open) => {
      const next = typeof open === 'boolean' ? open : !get().isThemePanelOpen;
      set({ isThemePanelOpen: next });
    },

    toggleMobileMenu: (open) => {
      const next = typeof open === 'boolean' ? open : !get().isMobileMenuOpen;
      set({ isMobileMenuOpen: next });
    },

    setExporting: (exporting) => {
      set({ isExporting: exporting });
    },

    addToast: (toast) => {
      const id = uuidv4();
      const newToast: Toast = { ...toast, id };
      set(state => ({ toasts: [...state.toasts, newToast] }));
      if (!toast.action) {
        setTimeout(() => {
          get().removeToast(id);
        }, 3000);
      }
      return id;
    },

    removeToast: (toastId) => {
      set(state => ({
        toasts: state.toasts.filter(t => t.id !== toastId)
      }));
    },

    getResumeById: (id) => {
      try {
        const allResumes = JSON.parse(localStorage.getItem('all_resumes') || '{}');
        return allResumes[id] || null;
      } catch {
        return null;
      }
    },

    generateShareLink: () => {
      const { resume } = get();
      const baseUrl = window.location.origin;
      return `${baseUrl}/preview/${resume.id}`;
    }
  };
});
