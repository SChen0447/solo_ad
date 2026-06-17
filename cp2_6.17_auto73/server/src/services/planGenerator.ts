import { v4 as uuidv4 } from 'uuid';

export interface Task {
  id: string;
  planId: string;
  date: string;
  title: string;
  estimatedMinutes: number;
  completed: boolean;
}

export interface Plan {
  id: string;
  userId: string;
  goalName: string;
  goalDescription: string;
  dailyHours: number;
  duration: number;
  tasks: Task[];
  createdAt: string;
  progress: number;
}

export interface User {
  id: string;
  username: string;
  password: string;
  nickname: string;
  avatar: string;
  reminderEnabled: boolean;
}

export const users: User[] = [];
export const plans: Plan[] = [];
export const tasks: Task[] = [];

export function generatePlanTasks(goalName: string, goalDescription: string, dailyHours: number, duration: number, planId: string): Task[] {
  const generatedTasks: Task[] = [];
  const totalMinutes = dailyHours * 60;

  const phases = [
    { name: '基础概念学习', weight: 0.15 },
    { name: '核心知识掌握', weight: 0.20 },
    { name: '实践练习', weight: 0.25 },
    { name: '深入理解', weight: 0.20 },
    { name: '综合应用', weight: 0.10 },
    { name: '复习巩固', weight: 0.10 },
  ];

  const startDate = new Date();

  let currentPhaseIdx = 0;
  let phaseDayCount = 0;

  for (let day = 0; day < duration; day++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + day);
    const dateStr = date.toISOString().split('T')[0];

    const phaseDays = Math.max(1, Math.round(phases[currentPhaseIdx].weight * duration));
    if (phaseDayCount >= phaseDays && currentPhaseIdx < phases.length - 1) {
      currentPhaseIdx++;
      phaseDayCount = 0;
    }

    const phase = phases[currentPhaseIdx].name;

    const tasksPerDay = Math.max(2, Math.min(5, Math.floor(totalMinutes / 30)));
    const minutesPerTask = Math.floor(totalMinutes / tasksPerDay);

    const isReviewDay = (day + 1) % 7 === 0;

    for (let t = 0; t < tasksPerDay; t++) {
      let title: string;

      if (isReviewDay) {
        const reviewTypes = [
          `复习本周${phase}要点`,
          `整理本周学习笔记`,
          `完成本周知识点自测`,
        ];
        title = `Day${day + 1}: ${reviewTypes[t % reviewTypes.length]}`;
      } else {
        const taskTemplates = [
          `阅读${phase}相关资料并做笔记`,
          `完成${phase}核心概念梳理`,
          `观看${phase}教学视频并记录要点`,
          `练习${phase}相关习题`,
          `总结${phase}知识框架`,
          `完成${phase}实践项目练习`,
          `分析${phase}典型案例`,
          `撰写${phase}学习心得`,
        ];
        title = `Day${day + 1}: ${taskTemplates[(day * tasksPerDay + t) % taskTemplates.length]}`;
      }

      generatedTasks.push({
        id: uuidv4(),
        planId,
        date: dateStr,
        title,
        estimatedMinutes: isReviewDay ? Math.floor(minutesPerTask * 0.8) : minutesPerTask,
        completed: false,
      });
    }

    phaseDayCount++;
  }

  return generatedTasks;
}

export function calculateProgress(planId: string): number {
  const planTasks = tasks.filter(t => t.planId === planId);
  if (planTasks.length === 0) return 0;
  const completed = planTasks.filter(t => t.completed).length;
  return Math.round((completed / planTasks.length) * 100);
}
