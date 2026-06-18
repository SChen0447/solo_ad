import type { ComponentProps, Snapshot, ComponentDiff } from '@/types/componentTypes';

export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => deepEqual(item, b[index]));
  }

  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a as Record<string, unknown>);
    const keysB = Object.keys(b as Record<string, unknown>);
    if (keysA.length !== keysB.length) return false;
    return keysA.every((key) =>
      deepEqual(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key]
      )
    );
  }

  return false;
}

export function compareSnapshots(snapshotA: Snapshot, snapshotB: Snapshot): ComponentDiff[] {
  const diffs: ComponentDiff[] = [];
  const componentMapA = new Map<string, ComponentProps>();
  const componentMapB = new Map<string, ComponentProps>();

  snapshotA.components.forEach((c) => componentMapA.set(c.id, c));
  snapshotB.components.forEach((c) => componentMapB.set(c.id, c));

  const allIds = new Set([...componentMapA.keys(), ...componentMapB.keys()]);

  allIds.forEach((id) => {
    const compA = componentMapA.get(id);
    const compB = componentMapB.get(id);

    if (compA && compB) {
      const allKeys = new Set([
        ...Object.keys(compA as Record<string, unknown>),
        ...Object.keys(compB as Record<string, unknown>),
      ]);

      allKeys.forEach((key) => {
        if (key === 'id') return;
        const valueA = (compA as Record<string, unknown>)[key];
        const valueB = (compB as Record<string, unknown>)[key];

        if (!deepEqual(valueA, valueB)) {
          diffs.push({
            componentId: id,
            componentType: compA.type,
            propName: key,
            valueA,
            valueB,
          });
        }
      });
    }
  });

  return diffs;
}

export function serializeSnapshot(components: ComponentProps[]): Snapshot {
  return {
    id: '',
    name: '',
    timestamp: Date.now(),
    components: JSON.parse(JSON.stringify(components)),
  };
}

export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}
