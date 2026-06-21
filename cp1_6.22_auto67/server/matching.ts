export interface MatchingInput {
  participantIds: string[];
  exclusionPairs: [string, string][];
}

export interface MatchingResult {
  giverId: string;
  receiverId: string;
}

function fisherYatesShuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function isExcluded(
  giverId: string,
  receiverId: string,
  exclusionPairs: [string, string][]
): boolean {
  return exclusionPairs.some(
    ([a, b]) =>
      (a === giverId && b === receiverId) ||
      (a === receiverId && b === giverId)
  );
}

function tryMatchOnce(
  participantIds: string[],
  exclusionPairs: [string, string][]
): MatchingResult[] | null {
  const n = participantIds.length;
  if (n < 2) return null;

  const receivers = fisherYatesShuffle(participantIds);
  const result: MatchingResult[] = [];

  for (let i = 0; i < n; i++) {
    const giverId = participantIds[i];
    const receiverId = receivers[i];

    if (giverId === receiverId) {
      return null;
    }

    if (isExcluded(giverId, receiverId, exclusionPairs)) {
      return null;
    }

    result.push({ giverId, receiverId });
  }

  const uniqueReceivers = new Set(result.map((r) => r.receiverId));
  if (uniqueReceivers.size !== n) {
    return null;
  }

  return result;
}

function backtrackMatch(
  participantIds: string[],
  exclusionPairs: [string, string][]
): MatchingResult[] | null {
  const n = participantIds.length;
  const usedReceivers = new Set<string>();
  const assignments: MatchingResult[] = [];

  function backtrack(index: number): boolean {
    if (index === n) {
      return true;
    }

    const giverId = participantIds[index];
    const possibleReceivers = fisherYatesShuffle(
      participantIds.filter(
        (id) =>
          id !== giverId &&
          !usedReceivers.has(id) &&
          !isExcluded(giverId, id, exclusionPairs)
      )
    );

    for (const receiverId of possibleReceivers) {
      usedReceivers.add(receiverId);
      assignments.push({ giverId, receiverId });

      if (backtrack(index + 1)) {
        return true;
      }

      usedReceivers.delete(receiverId);
      assignments.pop();
    }

    return false;
  }

  if (backtrack(0)) {
    return assignments;
  }
  return null;
}

export function performMatching(input: MatchingInput): MatchingResult[] {
  const { participantIds, exclusionPairs } = input;
  const n = participantIds.length;

  if (n < 2) {
    throw new Error('至少需要2名参与者才能进行匹配');
  }

  const maxAttempts = Math.min(100, n * 10);
  for (let i = 0; i < maxAttempts; i++) {
    const result = tryMatchOnce(participantIds, exclusionPairs);
    if (result) {
      return result;
    }
  }

  const backtrackResult = backtrackMatch(participantIds, exclusionPairs);
  if (backtrackResult) {
    return backtrackResult;
  }

  throw new Error('无法找到满足所有约束条件的匹配方案，请调整排除规则');
}
