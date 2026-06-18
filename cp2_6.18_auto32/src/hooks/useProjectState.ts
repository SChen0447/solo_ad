import { useReducer, useCallback } from 'react';
import { Project, Task, generateId, generateRandomColor, formatDate } from '../utils/helpers';

export type PageState =
  | { type: 'board' }
  | { type: 'detail'; projectId: string };

export interface AppState {
  projects: Project[];
  page: PageState;
}

type Action =
  | { type: 'GO_TO_BOARD' }
  | { type: 'GO_TO_DETAIL'; projectId: string }
  | { type: 'ADD_PROJECT'; name: string }
  | { type: 'ADD_TASK'; projectId: string }
  | { type: 'UPDATE_TASK'; projectId: string; taskId: string; patch: Partial<Task> }
  | { type: 'DELETE_TASK'; projectId: string; taskId: string }
  | { type: 'REORDER_TASKS'; projectId: string; fromIndex: number; toIndex: number };

function todayStr(): string {
  return formatDate(new Date());
}

function createSampleProjects(): Project[] {
  const p1Id = generateId();
  const p2Id = generateId();
  const p3Id = generateId();
  const today = todayStr();

  const members = ['张三', '李四', '王五', '赵六', '陈七'];

  const makeTask = (
    name: string,
    hours: number,
    completed: boolean,
    idx: number,
  ): Task => ({
    id: generateId(),
    name,
    estimatedHours: hours,
    completed,
    assignee: members[idx % members.length],
    color: generateRandomColor(),
    order: idx,
  });

  return [
    {
      id: p1Id,
      name: '官网新版改版',
      startDate: today,
      tasks: [
        makeTask('需求调研与竞品分析', 16, true, 0),
        makeTask('UI视觉设计稿', 24, true, 1),
        makeTask('前端页面开发', 40, false, 2),
        makeTask('接口联调测试', 20, false, 3),
        makeTask('上线部署与验证', 8, false, 4),
      ],
    },
    {
      id: p2Id,
      name: '移动App用户端开发',
      startDate: today,
      tasks: [
        makeTask('产品原型设计', 20, true, 0),
        makeTask('接口文档定义', 12, false, 1),
        makeTask('iOS端开发', 60, false, 2),
        makeTask('Android端开发', 60, false, 3),
        makeTask('兼容性测试', 24, false, 4),
        makeTask('应用商店上架', 8, false, 5),
      ],
    },
    {
      id: p3Id,
      name: '数据分析平台搭建',
      startDate: today,
      tasks: [
        makeTask('数据仓库设计', 32, false, 0),
        makeTask('ETL脚本开发', 40, false, 1),
        makeTask('看板UI开发', 28, false, 2),
        makeTask('权限系统对接', 16, false, 3),
      ],
    },
  ];
}

const initialState: AppState = {
  projects: createSampleProjects(),
  page: { type: 'board' },
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'GO_TO_BOARD':
      return { ...state, page: { type: 'board' } };
    case 'GO_TO_DETAIL':
      return { ...state, page: { type: 'detail', projectId: action.projectId } };
    case 'ADD_PROJECT': {
      const newProject: Project = {
        id: generateId(),
        name: action.name || '新项目',
        startDate: todayStr(),
        tasks: [],
      };
      return { ...state, projects: [...state.projects, newProject] };
    }
    case 'ADD_TASK': {
      const newTask: Task = {
        id: generateId(),
        name: '新任务',
        estimatedHours: 8,
        completed: false,
        assignee: '',
        color: generateRandomColor(),
        order: Date.now(),
      };
      return {
        ...state,
        projects: state.projects.map(p =>
          p.id === action.projectId ? { ...p, tasks: [...p.tasks, newTask] } : p,
        ),
      };
    }
    case 'UPDATE_TASK': {
      return {
        ...state,
        projects: state.projects.map(p =>
          p.id === action.projectId
            ? {
                ...p,
                tasks: p.tasks.map(t =>
                  t.id === action.taskId ? { ...t, ...action.patch } : t,
                ),
              }
            : p,
        ),
      };
    }
    case 'DELETE_TASK': {
      return {
        ...state,
        projects: state.projects.map(p =>
          p.id === action.projectId
            ? { ...p, tasks: p.tasks.filter(t => t.id !== action.taskId) }
            : p,
        ),
      };
    }
    case 'REORDER_TASKS': {
      return {
        ...state,
        projects: state.projects.map(p => {
          if (p.id !== action.projectId) return p;
          const newTasks = [...p.tasks];
          const [removed] = newTasks.splice(action.fromIndex, 1);
          newTasks.splice(action.toIndex, 0, removed);
          return { ...p, tasks: newTasks.map((t, i) => ({ ...t, order: i })) };
        }),
      };
    }
    default:
      return state;
  }
}

export function useProjectState() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const goToBoard = useCallback(() => dispatch({ type: 'GO_TO_BOARD' }), []);
  const goToDetail = useCallback(
    (projectId: string) => dispatch({ type: 'GO_TO_DETAIL', projectId }),
    [],
  );
  const addProject = useCallback((name: string) => dispatch({ type: 'ADD_PROJECT', name }), []);
  const addTask = useCallback(
    (projectId: string) => dispatch({ type: 'ADD_TASK', projectId }),
    [],
  );
  const updateTask = useCallback(
    (projectId: string, taskId: string, patch: Partial<Task>) =>
      dispatch({ type: 'UPDATE_TASK', projectId, taskId, patch }),
    [],
  );
  const deleteTask = useCallback(
    (projectId: string, taskId: string) => dispatch({ type: 'DELETE_TASK', projectId, taskId }),
    [],
  );
  const reorderTasks = useCallback(
    (projectId: string, fromIndex: number, toIndex: number) =>
      dispatch({ type: 'REORDER_TASKS', projectId, fromIndex, toIndex }),
    [],
  );

  return {
    state,
    goToBoard,
    goToDetail,
    addProject,
    addTask,
    updateTask,
    deleteTask,
    reorderTasks,
  };
}
