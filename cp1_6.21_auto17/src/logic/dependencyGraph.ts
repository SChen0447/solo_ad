import { Task, Dependency, GraphAnalysisResult, TaskScheduleInfo } from '@/types';

interface AdjacencyList {
  [key: string]: string[];
}

interface ReverseAdjacencyList {
  [key: string]: string[];
}

function buildAdjacencyLists(tasks: Task[], dependencies: Dependency[]): {
  adjacency: AdjacencyList;
  reverseAdjacency: ReverseAdjacencyList;
  inDegree: Map<string, number>;
} {
  const adjacency: AdjacencyList = {};
  const reverseAdjacency: ReverseAdjacencyList = {};
  const inDegree = new Map<string, number>();

  tasks.forEach((task) => {
    adjacency[task.id] = [];
    reverseAdjacency[task.id] = [];
    inDegree.set(task.id, 0);
  });

  dependencies.forEach((dep) => {
    if (adjacency[dep.fromTaskId] && adjacency[dep.toTaskId]) {
      adjacency[dep.fromTaskId].push(dep.toTaskId);
      reverseAdjacency[dep.toTaskId].push(dep.fromTaskId);
      inDegree.set(dep.toTaskId, (inDegree.get(dep.toTaskId) || 0) + 1);
    }
  });

  return { adjacency, reverseAdjacency, inDegree };
}

function detectCycle(
  tasks: Task[],
  adjacency: AdjacencyList
): { hasCycle: boolean; cyclePath: string[] } {
  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;
  const color = new Map<string, number>();
  const parent = new Map<string, string | null>();
  let cyclePath: string[] = [];
  let foundCycle = false;

  tasks.forEach((t) => {
    color.set(t.id, WHITE);
    parent.set(t.id, null);
  });

  function dfs(u: string): void {
    if (foundCycle) return;
    color.set(u, GRAY);

    for (const v of adjacency[u] || []) {
      if (color.get(v) === GRAY) {
        foundCycle = true;
        const path: string[] = [v];
        let cur: string | null = u;
        while (cur && cur !== v) {
          path.unshift(cur);
          cur = parent.get(cur) || null;
        }
        path.unshift(v);
        cyclePath = path;
        return;
      }
      if (color.get(v) === WHITE) {
        parent.set(v, u);
        dfs(v);
        if (foundCycle) return;
      }
    }
    color.set(u, BLACK);
  }

  for (const task of tasks) {
    if (color.get(task.id) === WHITE) {
      dfs(task.id);
      if (foundCycle) break;
    }
  }

  return { hasCycle: foundCycle, cyclePath };
}

function topologicalSort(
  tasks: Task[],
  inDegree: Map<string, number>,
  adjacency: AdjacencyList
): string[] {
  const queue: string[] = [];
  const result: string[] = [];
  const degree = new Map(inDegree);

  tasks.forEach((t) => {
    if ((degree.get(t.id) || 0) === 0) {
      queue.push(t.id);
    }
  });

  while (queue.length > 0) {
    const u = queue.shift()!;
    result.push(u);

    for (const v of adjacency[u] || []) {
      degree.set(v, (degree.get(v) || 0) - 1);
      if ((degree.get(v) || 0) === 0) {
        queue.push(v);
      }
    }
  }

  return result;
}

export function analyzeDependencyGraph(
  tasks: Task[],
  dependencies: Dependency[]
): GraphAnalysisResult {
  const { adjacency, reverseAdjacency, inDegree } = buildAdjacencyLists(
    tasks,
    dependencies
  );

  const { hasCycle, cyclePath } = detectCycle(tasks, adjacency);

  const scheduleInfo = new Map<string, TaskScheduleInfo>();
  const taskMap = new Map<string, Task>();
  tasks.forEach((t) => taskMap.set(t.id, t));

  tasks.forEach((t) => {
    scheduleInfo.set(t.id, {
      taskId: t.id,
      earliestStart: t.startDay,
      earliestFinish: t.startDay + t.estimatedHours / 8,
      latestStart: Infinity,
      latestFinish: Infinity,
      floatTime: 0,
      isCritical: false,
    });
  });

  if (hasCycle) {
    return {
      scheduleInfo,
      criticalPath: [],
      projectDuration: 0,
      hasCycle: true,
      cyclePath,
    };
  }

  const topoOrder = topologicalSort(tasks, inDegree, adjacency);

  topoOrder.forEach((taskId) => {
    const info = scheduleInfo.get(taskId)!;
    const predecessors = reverseAdjacency[taskId] || [];

    if (predecessors.length > 0) {
      let maxFinish = info.earliestStart;
      predecessors.forEach((predId) => {
        const predInfo = scheduleInfo.get(predId);
        if (predInfo && predInfo.earliestFinish > maxFinish) {
          maxFinish = predInfo.earliestFinish;
        }
      });
      info.earliestStart = maxFinish;
      info.earliestFinish = info.earliestStart + (taskMap.get(taskId)!.estimatedHours / 8);
    }
  });

  let projectDuration = 0;
  topoOrder.forEach((taskId) => {
    const info = scheduleInfo.get(taskId)!;
    if (info.earliestFinish > projectDuration) {
      projectDuration = info.earliestFinish;
    }
  });

  const reverseTopo = [...topoOrder].reverse();

  reverseTopo.forEach((taskId) => {
    const info = scheduleInfo.get(taskId)!;
    const successors = adjacency[taskId] || [];

    if (successors.length === 0) {
      info.latestFinish = projectDuration;
      info.latestStart = info.latestFinish - (taskMap.get(taskId)!.estimatedHours / 8);
    } else {
      let minStart = Infinity;
      successors.forEach((succId) => {
        const succInfo = scheduleInfo.get(succId);
        if (succInfo && succInfo.latestStart < minStart) {
          minStart = succInfo.latestStart;
        }
      });
      info.latestFinish = minStart;
      info.latestStart = info.latestFinish - (taskMap.get(taskId)!.estimatedHours / 8);
    }

    info.floatTime = info.latestStart - info.earliestStart;
    info.isCritical = Math.abs(info.floatTime) < 0.001;
  });

  const criticalPath: string[] = [];
  const visited = new Set<string>();

  function findCriticalPath(taskId: string): void {
    if (visited.has(taskId)) return;
    visited.add(taskId);
    criticalPath.push(taskId);

    const successors = adjacency[taskId] || [];
    for (const succId of successors) {
      const succInfo = scheduleInfo.get(succId);
      const curInfo = scheduleInfo.get(taskId)!;
      if (succInfo && succInfo.isCritical) {
        const isAdjacent =
          Math.abs(succInfo.earliestStart - curInfo.earliestFinish) < 0.001;
        if (isAdjacent) {
          findCriticalPath(succId);
          break;
        }
      }
    }
  }

  const criticalStarts = topoOrder.filter((id) => {
    const info = scheduleInfo.get(id)!;
    const preds = reverseAdjacency[id] || [];
    const hasCriticalPred = preds.some((p) => scheduleInfo.get(p)?.isCritical);
    return info.isCritical && !hasCriticalPred;
  });

  if (criticalStarts.length > 0) {
    findCriticalPath(criticalStarts[0]);
  }

  return {
    scheduleInfo,
    criticalPath,
    projectDuration,
    hasCycle: false,
    cyclePath: [],
  };
}

export function validateDependencyAddition(
  tasks: Task[],
  existingDeps: Dependency[],
  newFromId: string,
  newToId: string
): { valid: boolean; reason?: string } {
  if (newFromId === newToId) {
    return { valid: false, reason: '不能将任务连接到自身' };
  }

  const testDeps = [
    ...existingDeps,
    { id: 'test-dep', fromTaskId: newFromId, toTaskId: newToId },
  ];

  const result = analyzeDependencyGraph(tasks, testDeps);

  if (result.hasCycle) {
    return { valid: false, reason: '检测到循环依赖，请检查连接关系' };
  }

  const exists = existingDeps.some(
    (d) => d.fromTaskId === newFromId && d.toTaskId === newToId
  );
  if (exists) {
    return { valid: false, reason: '该依赖关系已存在' };
  }

  return { valid: true };
}
