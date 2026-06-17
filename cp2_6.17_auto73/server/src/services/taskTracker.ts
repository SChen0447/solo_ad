import { tasks, plans, calculateProgress } from './planGenerator';

export function toggleTaskStatus(taskId: string, completed: boolean): { progress: number } | null {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return null;

  task.completed = completed;
  const progress = calculateProgress(task.planId);
  const plan = plans.find(p => p.id === task.planId);
  if (plan) plan.progress = progress;

  return { progress };
}

export function getTasksByPlan(planId: string) {
  return tasks.filter(t => t.planId === planId);
}
