import type { Commit, Contributor, ModuleInfo, FileChange, FilterState } from './types';

export const CONTRIBUTORS: Contributor[] = [
  { name: 'Alice Chen', color: '#e94560' },
  { name: 'Bob Wang', color: '#5c7cfa' },
  { name: 'Carol Li', color: '#533483' },
  { name: 'David Zhang', color: '#00b4d8' },
  { name: 'Eva Liu', color: '#06d6a0' },
  { name: 'Frank Wu', color: '#ff922b' },
];

export const MODULES: ModuleInfo[] = [
  { path: 'src/components', label: 'Components' },
  { path: 'src/utils', label: 'Utils' },
  { path: 'src/hooks', label: 'Hooks' },
  { path: 'src/services', label: 'Services' },
  { path: 'src/styles', label: 'Styles' },
];

const COMMIT_MESSAGES = [
  'feat: add new user profile component',
  'fix: resolve memory leak in data fetching',
  'refactor: extract shared utility functions',
  'docs: update API documentation',
  'chore: upgrade dependencies to latest versions',
  'feat: implement dark mode toggle',
  'fix: correct date formatting in scheduler',
  'refactor: simplify state management logic',
  'test: add unit tests for auth module',
  'feat: add pagination to data table',
  'fix: handle edge case in file upload',
  'style: improve button hover animations',
  'perf: optimize rendering of large lists',
  'feat: add search functionality',
  'fix: resolve CSS specificity issues',
  'refactor: consolidate API client code',
  'chore: update ESLint configuration',
  'feat: implement notification system',
  'fix: prevent double submission on forms',
  'docs: add contributing guidelines',
  'feat: add drag-and-drop support',
  'refactor: migrate to TypeScript strict mode',
  'fix: resolve race condition in async handler',
  'test: add integration tests for checkout',
  'feat: implement autocomplete component',
  'style: normalize spacing across components',
  'perf: reduce bundle size by code splitting',
  'fix: correct timezone handling in scheduler',
  'chore: configure CI pipeline',
  'feat: add export to CSV functionality',
];

const FILE_NAMES: Record<string, string[]> = {
  'src/components': [
    'Button.tsx', 'Modal.tsx', 'DataTable.tsx', 'Sidebar.tsx',
    'Header.tsx', 'Card.tsx', 'Dropdown.tsx', 'Tooltip.tsx',
    'Avatar.tsx', 'Badge.tsx', 'Tabs.tsx', 'Form.tsx',
  ],
  'src/utils': [
    'format.ts', 'validators.ts', 'helpers.ts', 'constants.ts',
    'calculations.ts', 'parsers.ts', 'transformers.ts', 'cache.ts',
  ],
  'src/hooks': [
    'useAuth.ts', 'useFetch.ts', 'useDebounce.ts', 'useTheme.ts',
    'useLocalStorage.ts', 'useMediaQuery.ts', 'useIntersection.ts',
  ],
  'src/services': [
    'api.ts', 'auth.ts', 'storage.ts', 'analytics.ts',
    'notifications.ts', 'websocket.ts', 'logger.ts',
  ],
  'src/styles': [
    'globals.css', 'variables.css', 'animations.css', 'themes.css',
    'typography.css', 'layout.css',
  ],
};

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateFileChanges(): FileChange[] {
  const numFiles = randInt(1, 8);
  const files: FileChange[] = [];
  const usedPaths = new Set<string>();

  for (let i = 0; i < numFiles; i++) {
    const mod = randPick(MODULES);
    const fileName = randPick(FILE_NAMES[mod.path]);
    const fullPath = `${mod.path}/${fileName}`;

    if (usedPaths.has(fullPath)) continue;
    usedPaths.add(fullPath);

    const additions = randInt(0, 120);
    const deletions = randInt(0, 60);
    files.push({ path: fullPath, additions, deletions });
  }

  return files;
}

export function generateCommits(count: number = 120): Commit[] {
  const now = Date.now();
  const sixMonthsAgo = now - 180 * 24 * 60 * 60 * 1000;
  const commits: Commit[] = [];

  for (let i = 0; i < count; i++) {
    const files = generateFileChanges();
    const additions = files.reduce((sum, f) => sum + f.additions, 0);
    const deletions = files.reduce((sum, f) => sum + f.deletions, 0);
    const timestamp = sixMonthsAgo + Math.random() * (now - sixMonthsAgo);

    commits.push({
      id: `commit-${i.toString().padStart(4, '0')}`,
      author: randPick(CONTRIBUTORS).name,
      timestamp,
      message: randPick(COMMIT_MESSAGES),
      files,
      additions,
      deletions,
    });
  }

  return commits.sort((a, b) => a.timestamp - b.timestamp);
}

export function filterCommits(commits: Commit[], filters: FilterState): Commit[] {
  return commits.filter((commit) => {
    if (filters.authors.length > 0 && !filters.authors.includes(commit.author)) {
      return false;
    }
    if (commit.timestamp < filters.dateRange[0] || commit.timestamp > filters.dateRange[1]) {
      return false;
    }
    if (filters.modules.length > 0) {
      const commitModules = new Set(
        commit.files.map((f) => {
          const mod = MODULES.find((m) => f.path.startsWith(m.path));
          return mod ? mod.path : '';
        })
      );
      const hasMatch = filters.modules.some((m) => commitModules.has(m));
      if (!hasMatch) return false;
    }
    return true;
  });
}

export function getModuleStats(commit: Commit): Record<string, { additions: number; deletions: number }> {
  const stats: Record<string, { additions: number; deletions: number }> = {};
  for (const mod of MODULES) {
    stats[mod.path] = { additions: 0, deletions: 0 };
  }
  for (const file of commit.files) {
    const mod = MODULES.find((m) => file.path.startsWith(m.path));
    if (mod) {
      stats[mod.path].additions += file.additions;
      stats[mod.path].deletions += file.deletions;
    }
  }
  return stats;
}
