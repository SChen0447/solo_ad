import { tasks, plans, calculateProgress, Task } from './planGenerator';

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

export function reorderTasks(planId: string, date: string, taskIds: string[]): boolean {
  const dateTasks = tasks.filter(t => t.planId === planId && t.date === date);
  const otherTasks = tasks.filter(t => !(t.planId === planId && t.date === date));

  const reordered: Task[] = [];
  for (const tid of taskIds) {
    const task = dateTasks.find(t => t.id === tid);
    if (!task) return false;
    reordered.push(task);
  }

  const missingFromNewOrder = dateTasks.filter(t => !taskIds.includes(t.id));
  if (missingFromNewOrder.length > 0) return false;

  const idx = tasks.findIndex(t => t.planId === planId && t.date === date);
  if (idx === -1) return false;

  const newTasks = otherTasks.concat(reordered);
  tasks.length = 0;
  tasks.push(...newTasks);

  return true;
}
