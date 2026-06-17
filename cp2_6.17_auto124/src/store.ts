import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { Questionnaire, SurveyResponse, Answer, Question } from './types';

interface SurveyStore {
  questionnaires: Questionnaire[];
  responses: SurveyResponse[];
  addQuestionnaire: (title: string, description: string, questions: Question[]) => string;
  updateQuestionnaireStatus: (id: string, status: 'active' | 'closed') => void;
  deleteQuestionnaire: (id: string) => void;
  addResponse: (questionnaireId: string, answers: Answer[]) => void;
}

export const useSurveyStore = create<SurveyStore>((set) => ({
  questionnaires: [
    {
      id: 'demo-1',
      title: '用户体验满意度调查',
      description: '帮助我们了解您对我们产品的使用感受，持续改进服务质量。',
      status: 'active',
      createdAt: new Date().toISOString(),
      questions: [
        { id: 'q1', type: 'single', title: '您对产品的整体满意度如何？', required: true, order: 0, options: [{ label: '非常满意', value: 'very_satisfied' }, { label: '满意', value: 'satisfied' }, { label: '一般', value: 'neutral' }, { label: '不满意', value: 'unsatisfied' }] },
        { id: 'q2', type: 'scale', title: '请为产品易用性打分', required: true, order: 1 },
        { id: 'q3', type: 'multiple', title: '您最常使用的功能有哪些？', required: false, order: 2, options: [{ label: '数据统计', value: 'stats' }, { label: '图表分析', value: 'charts' }, { label: '报告导出', value: 'export' }, { label: '团队协作', value: 'collab' }] },
      ],
    },
    {
      id: 'demo-2',
      title: '团队协作需求调研',
      description: '了解团队成员对协作工具的需求和偏好，为工具选型提供参考。',
      status: 'closed',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      questions: [
        { id: 'q4', type: 'single', title: '您目前使用的主要协作工具是？', required: true, order: 0, options: [{ label: '企业微信', value: 'wework' }, { label: '钉钉', value: 'dingtalk' }, { label: '飞书', value: 'feishu' }, { label: '其他', value: 'other' }] },
        { id: 'q5', type: 'scale', title: '协作效率评分', required: true, order: 1 },
      ],
    },
  ],
  responses: [
    {
      id: 'resp-1',
      questionnaireId: 'demo-1',
      answers: [
        { questionId: 'q1', value: 'satisfied' },
        { questionId: 'q2', value: '4' },
        { questionId: 'q3', value: ['stats', 'charts'] },
      ],
      createdAt: new Date().toISOString(),
    },
    {
      id: 'resp-2',
      questionnaireId: 'demo-1',
      answers: [
        { questionId: 'q1', value: 'very_satisfied' },
        { questionId: 'q2', value: '5' },
        { questionId: 'q3', value: ['export'] },
      ],
      createdAt: new Date().toISOString(),
    },
    {
      id: 'resp-3',
      questionnaireId: 'demo-1',
      answers: [
        { questionId: 'q1', value: 'neutral' },
        { questionId: 'q2', value: '3' },
        { questionId: 'q3', value: ['stats', 'collab'] },
      ],
      createdAt: new Date().toISOString(),
    },
    {
      id: 'resp-4',
      questionnaireId: 'demo-2',
      answers: [
        { questionId: 'q4', value: 'feishu' },
        { questionId: 'q5', value: '4' },
      ],
      createdAt: new Date().toISOString(),
    },
    {
      id: 'resp-5',
      questionnaireId: 'demo-2',
      answers: [
        { questionId: 'q4', value: 'dingtalk' },
        { questionId: 'q5', value: '3' },
      ],
      createdAt: new Date().toISOString(),
    },
  ],
  addQuestionnaire: (title, description, questions) => {
    const id = uuidv4();
    const newQ: Questionnaire = {
      id,
      title,
      description,
      questions,
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ questionnaires: [newQ, ...state.questionnaires] }));
    return id;
  },
  updateQuestionnaireStatus: (id, status) => {
    set((state) => ({
      questionnaires: state.questionnaires.map((q) =>
        q.id === id ? { ...q, status } : q
      ),
    }));
  },
  deleteQuestionnaire: (id) => {
    set((state) => ({
      questionnaires: state.questionnaires.filter((q) => q.id !== id),
    }));
  },
  addResponse: (questionnaireId, answers) => {
    const newResponse: SurveyResponse = {
      id: uuidv4(),
      questionnaireId,
      answers,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ responses: [...state.responses, newResponse] }));
  },
}));
