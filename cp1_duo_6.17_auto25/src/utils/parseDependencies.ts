import JSZip from 'jszip';
import type { FileNode, DependencyEdge, ParseResult, FileType } from '../types';

const IGNORED_DIRS = ['node_modules', 'dist', 'build', '.git', '.next', 'out'];
const CODE_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx'];
const STYLE_EXTENSIONS = ['.css', '.scss', '.less', '.sass'];

const IMPORT_REGEX = /import\s+(?:[\w*\s{},]*\s+from\s+)?['"]([^'"]+)['"]/g;
const REQUIRE_REGEX = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
const DYNAMIC_IMPORT_REGEX = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

const ALIAS_MAP: Record<string, string> = {
  '@': 'src',
  '~': 'src',
  '@/': 'src/',
  '~/': 'src/'
};

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\.\//, '');
}

function getFileType(filePath: string): FileType {
  const lowerPath = filePath.toLowerCase();
  const ext = lowerPath.substring(lowerPath.lastIndexOf('.'));

  if (STYLE_EXTENSIONS.some(s => lowerPath.endsWith(s)) || lowerPath.includes('.style.') || lowerPath.includes('.module.')) {
    return 'style';
  }

  if (lowerPath.includes('vite.config') || 
      lowerPath.includes('webpack.config') || 
      lowerPath.includes('tsconfig') || 
      lowerPath.includes('package.json') || 
      lowerPath.includes('.eslintrc') ||
      lowerPath.includes('rollup.config') ||
      lowerPath.includes('jest.config') ||
      lowerPath.includes('babel.config')) {
    return 'config';
  }

  if ((ext === '.tsx' || ext === '.jsx') && (lowerPath.includes('components/') || lowerPath.includes('pages/') || lowerPath.includes('views/'))) {
    return 'component';
  }

  if ((ext === '.ts' || ext === '.js') && (lowerPath.includes('utils/') || lowerPath.includes('helpers/') || lowerPath.includes('lib/') || lowerPath.includes('hooks/'))) {
    return 'util';
  }

  if (ext === '.tsx' || ext === '.jsx') {
    return 'component';
  }

  return 'other';
}

function countLines(content: string): number {
  return content.split('\n').length;
}

function calculateRadius(lineCount: number): number {
  return Math.min(60, Math.max(20, Math.sqrt(lineCount) * 2));
}

function resolveImportPath(importPath: string, currentFilePath: string): string | null {
  if (importPath.startsWith('.') || importPath.startsWith('/')) {
    const currentDir = currentFilePath.substring(0, currentFilePath.lastIndexOf('/'));
    let resolved = importPath.startsWith('/') 
      ? importPath.substring(1) 
      : normalizePath(`${currentDir}/${importPath}`);

    const parts = resolved.split('/');
    const result: string[] = [];
    for (const part of parts) {
      if (part === '..') result.pop();
      else if (part !== '.') result.push(part);
    }
    return result.join('/');
  }

  for (const [alias, target] of Object.entries(ALIAS_MAP)) {
    if (importPath.startsWith(alias)) {
      return importPath.replace(alias, target);
    }
  }

  return null;
}

function resolveFullPath(basePath: string, codeFiles: string[]): string | null {
  const baseWithoutExt = basePath.replace(/\.(js|jsx|ts|tsx|css|scss|less)$/, '');
  const extensions = ['.tsx', '.ts', '.jsx', '.js', '/index.tsx', '/index.ts', '/index.jsx', '/index.js'];

  for (const ext of extensions) {
    const candidate = baseWithoutExt + ext;
    if (codeFiles.includes(candidate)) {
      return candidate;
    }
  }

  if (codeFiles.includes(basePath)) {
    return basePath;
  }

  return null;
}

function extractImports(content: string): string[] {
  const imports: string[] = [];
  let match;

  IMPORT_REGEX.lastIndex = 0;
  while ((match = IMPORT_REGEX.exec(content)) !== null) {
    imports.push(match[1]);
  }

  REQUIRE_REGEX.lastIndex = 0;
  while ((match = REQUIRE_REGEX.exec(content)) !== null) {
    imports.push(match[1]);
  }

  DYNAMIC_IMPORT_REGEX.lastIndex = 0;
  while ((match = DYNAMIC_IMPORT_REGEX.exec(content)) !== null) {
    imports.push(match[1]);
  }

  return [...new Set(imports)];
}

function shouldIgnorePath(filePath: string): boolean {
  const lowerPath = filePath.toLowerCase();
  return IGNORED_DIRS.some(dir => lowerPath.includes(`/${dir}/`) || lowerPath.startsWith(`${dir}/`));
}

function isCodeFile(filePath: string): boolean {
  return CODE_EXTENSIONS.some(ext => filePath.toLowerCase().endsWith(ext));
}

function calculateEdgeDepth(sourceNode: FileNode, targetNode: FileNode, allEdges: Map<string, DependencyEdge>): number {
  let maxDepth = 1;
  const visited = new Set<string>();
  const queue: { node: string; depth: number }[] = [{ node: sourceNode.id, depth: 1 }];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current.node)) continue;
    visited.add(current.node);

    if (current.node === targetNode.id) {
      maxDepth = Math.max(maxDepth, current.depth);
      continue;
    }

    const currentNodeId = current.node;
    for (const edge of allEdges.values()) {
      if (edge.source === currentNodeId && !visited.has(edge.target)) {
        queue.push({ node: edge.target, depth: current.depth + 1 });
      }
    }
  }

  return Math.min(maxDepth, 5);
}

export async function parseDependencies(zipFile: File): Promise<ParseResult> {
  const zip = await JSZip.loadAsync(zipFile);
  const files: Record<string, string> = {};
  const allFiles: string[] = [];

  for (const [path, file] of Object.entries(zip.files)) {
    if (file.dir) continue;
    const normalizedPath = normalizePath(path);
    if (shouldIgnorePath(normalizedPath)) continue;
    allFiles.push(normalizedPath);

    if (isCodeFile(normalizedPath)) {
      const content = await file.async('string');
      files[normalizedPath] = content;
    }
  }

  const codeFilePaths = Object.keys(files);
  const nodes: Map<string, FileNode> = new Map();
  const edges: Map<string, DependencyEdge> = new Map();

  for (const filePath of codeFilePaths) {
    const content = files[filePath];
    const type = getFileType(filePath);
    const lineCount = countLines(content);
    const name = filePath.substring(filePath.lastIndexOf('/') + 1);

    nodes.set(filePath, {
      id: filePath,
      name,
      path: filePath,
      type,
      lineCount,
      imports: [],
      importedBy: [],
      radius: calculateRadius(lineCount)
    });
  }

  for (const [filePath, content] of Object.entries(files)) {
    const sourceNode = nodes.get(filePath);
    if (!sourceNode) continue;

    const rawImports = extractImports(content);

    for (const rawImport of rawImports) {
      const resolvedBase = resolveImportPath(rawImport, filePath);
      if (!resolvedBase) continue;

      const fullPath = resolveFullPath(resolvedBase, codeFilePaths);
      if (!fullPath || !nodes.has(fullPath) || fullPath === filePath) continue;

      const targetNode = nodes.get(fullPath)!;

      if (!sourceNode.imports.includes(fullPath)) {
        sourceNode.imports.push(fullPath);
      }
      if (!targetNode.importedBy.includes(filePath)) {
        targetNode.importedBy.push(filePath);
      }

      const edgeId = `${filePath}->${fullPath}`;
      if (!edges.has(edgeId)) {
        edges.set(edgeId, {
          id: edgeId,
          source: filePath,
          target: fullPath,
          depth: 1
        });
      }
    }
  }

  const edgeArray = Array.from(edges.values());
  for (const edge of edgeArray) {
    const sourceNode = nodes.get(edge.source)!;
    const targetNode = nodes.get(edge.target)!;
    edge.depth = calculateEdgeDepth(sourceNode, targetNode, edges);
  }

  const nodeArray = Array.from(nodes.values());
  const fileTypes: Record<FileType, number> = {
    component: 0,
    util: 0,
    config: 0,
    style: 0,
    other: 0
  };

  for (const node of nodeArray) {
    fileTypes[node.type]++;
  }

  return {
    nodes: nodeArray,
    edges: edgeArray,
    stats: {
      totalFiles: nodeArray.length,
      totalDependencies: edges.size,
      fileTypes
    }
  };
}

export function parseImportPathsForTesting(content: string): string[] {
  return extractImports(content);
}

export function resolvePathForTesting(importPath: string, currentPath: string): string | null {
  return resolveImportPath(importPath, currentPath);
}
