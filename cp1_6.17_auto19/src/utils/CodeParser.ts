export type Language = 'javascript' | 'typescript' | 'python' | 'java';
export type CommentStyle = 'jsdoc' | 'sphinx' | 'javadoc';

export interface FunctionParam {
  name: string;
  type: string;
  defaultValue?: string;
}

export interface FunctionInfo {
  name: string;
  params: FunctionParam[];
  returnType: string;
  startLine: number;
  endLine: number;
  isClassMethod: boolean;
  className?: string;
}

export interface ClassInfo {
  name: string;
  methods: FunctionInfo[];
  startLine: number;
  endLine: number;
}

export interface ParseResult {
  language: Language;
  functions: FunctionInfo[];
  classes: ClassInfo[];
}

export function detectLanguage(code: string, filename?: string): Language {
  if (filename) {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'js') return 'javascript';
    if (ext === 'ts' || ext === 'tsx') return 'typescript';
    if (ext === 'py') return 'python';
    if (ext === 'java') return 'java';
  }

  if (/^\s*(def |class )/m.test(code) || /^\s*import\s+\w+/m.test(code) && code.includes(':')) {
    return 'python';
  }
  if (/public\s+(static\s+)?(class|interface|void|int|String|boolean)/.test(code) || /System\.out\.println/.test(code)) {
    return 'java';
  }
  if (/:\s*(string|number|boolean|any|void|Array|interface)\b/.test(code) || /^\s*(export\s+)?(interface|type)\s+\w+/.test(code)) {
    return 'typescript';
  }
  return 'javascript';
}

function inferParamType(defaultValue: string | undefined, paramName: string): string {
  if (defaultValue !== undefined) {
    const trimmed = defaultValue.trim();
    if (/^["']/.test(trimmed)) return 'string';
    if (/^\d/.test(trimmed)) return 'number';
    if (/^(true|false)$/.test(trimmed)) return 'boolean';
    if (/^\[/.test(trimmed)) return 'Array';
    if (/^\{/.test(trimmed)) return 'Object';
    if (/^null$/.test(trimmed)) return 'null';
  }
  if (paramName.startsWith('is') || paramName.startsWith('has') || paramName.startsWith('should')) {
    return 'boolean';
  }
  if (paramName.includes('count') || paramName.includes('num') || paramName.includes('index') || paramName.includes('size')) {
    return 'number';
  }
  if (paramName.includes('name') || paramName.includes('str') || paramName.includes('text') || paramName.includes('message')) {
    return 'string';
  }
  if (paramName.includes('list') || paramName.includes('arr') || paramName.endsWith('s')) {
    return 'Array';
  }
  return '*';
}

export function parseCode(code: string, language: Language): ParseResult {
  switch (language) {
    case 'javascript':
    case 'typescript':
      return parseJavaScript(code, language);
    case 'python':
      return parsePython(code);
    case 'java':
      return parseJava(code);
    default:
      return { language, functions: [], classes: [] };
  }
}

function parseJavaScript(code: string, language: Language): ParseResult {
  const functions: FunctionInfo[] = [];
  const classes: ClassInfo[] = [];
  const lines = code.split('\n');

  const classRegex = /^\s*(export\s+)?(class|interface)\s+(\w+)/;
  const funcRegex = /^\s*(export\s+)?(async\s+)?function\s+(\w+)\s*\(([^)]*)\)\s*(:\s*([\w<>\[\],\s|]+))?/;
  const arrowFuncRegex = /^\s*(export\s+)?(const|let|var)\s+(\w+)\s*=\s*(async\s+)?\(([^)]*)\)\s*(:\s*([\w<>\[\],\s|]+))?\s*=>/;
  const methodRegex = /^\s*(public\s+|private\s+|protected\s+)?(static\s+)?(async\s+)?(\w+)\s*\(([^)]*)\)\s*(:\s*([\w<>\[\],\s|]+))?\s*\{/;

  let currentClass: ClassInfo | null = null;
  let braceCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const openBraces = (line.match(/\{/g) || []).length;
    const closeBraces = (line.match(/\}/g) || []).length;

    const classMatch = line.match(classRegex);
    if (classMatch && braceCount === 0) {
      currentClass = {
        name: classMatch[3],
        methods: [],
        startLine: i + 1,
        endLine: 0
      };
      classes.push(currentClass);
    }

    const funcMatch = line.match(funcRegex);
    if (funcMatch && braceCount === 0) {
      const params = parseJsParams(funcMatch[4]);
      const returnType = funcMatch[6]?.trim() || inferReturnFromBody(lines, i);
      const funcInfo: FunctionInfo = {
        name: funcMatch[3],
        params,
        returnType,
        startLine: i + 1,
        endLine: findFunctionEnd(lines, i),
        isClassMethod: false
      };
      functions.push(funcInfo);
    }

    const arrowMatch = line.match(arrowFuncRegex);
    if (arrowMatch && braceCount === 0) {
      const params = parseJsParams(arrowMatch[5]);
      const returnType = arrowMatch[7]?.trim() || inferReturnFromBody(lines, i);
      const funcInfo: FunctionInfo = {
        name: arrowMatch[3],
        params,
        returnType,
        startLine: i + 1,
        endLine: findFunctionEnd(lines, i),
        isClassMethod: false
      };
      functions.push(funcInfo);
    }

    if (currentClass && braceCount > 0) {
      const methodMatch = line.match(methodRegex);
      if (methodMatch && methodMatch[4] !== 'if' && methodMatch[4] !== 'for' && methodMatch[4] !== 'while' && methodMatch[4] !== 'switch') {
        const params = parseJsParams(methodMatch[5]);
        const returnType = methodMatch[7]?.trim() || inferReturnFromBody(lines, i);
        const funcInfo: FunctionInfo = {
          name: methodMatch[4],
          params,
          returnType,
          startLine: i + 1,
          endLine: findFunctionEnd(lines, i),
          isClassMethod: true,
          className: currentClass.name
        };
        functions.push(funcInfo);
        currentClass.methods.push(funcInfo);
      }
    }

    braceCount += openBraces - closeBraces;

    if (currentClass && braceCount === 0 && currentClass.endLine === 0 && currentClass.startLine < i + 1) {
      currentClass.endLine = i + 1;
    }
  }

  return { language, functions, classes };
}

function parseJsParams(paramsStr: string): FunctionParam[] {
  if (!paramsStr.trim()) return [];
  const params: FunctionParam[] = [];
  const parts = splitParams(paramsStr);

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    let name = trimmed;
    let type = '*';
    let defaultValue: string | undefined;

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex !== -1) {
      name = trimmed.substring(0, eqIndex).trim();
      defaultValue = trimmed.substring(eqIndex + 1).trim();
    }

    const colonIndex = name.indexOf(':');
    if (colonIndex !== -1) {
      type = name.substring(colonIndex + 1).trim();
      name = name.substring(0, colonIndex).trim();
    } else if (defaultValue !== undefined) {
      type = inferParamType(defaultValue, name);
    } else {
      type = inferParamType(undefined, name);
    }

    name = name.replace(/^\{|\}$/g, '').trim();
    name = name.replace(/^\.\.\./, '').trim();

    params.push({ name, type, defaultValue });
  }

  return params;
}

function splitParams(paramStr: string): string[] {
  const result: string[] = [];
  let depth = 0;
  let current = '';
  let inString = false;
  let stringChar = '';

  for (let i = 0; i < paramStr.length; i++) {
    const char = paramStr[i];

    if (inString) {
      if (char === stringChar && paramStr[i - 1] !== '\\') {
        inString = false;
      }
      current += char;
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      inString = true;
      stringChar = char;
      current += char;
      continue;
    }

    if (char === '(' || char === '[' || char === '{') {
      depth++;
      current += char;
    } else if (char === ')' || char === ']' || char === '}') {
      depth--;
      current += char;
    } else if (char === ',' && depth === 0) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    result.push(current);
  }

  return result;
}

function inferReturnFromBody(lines: string[], startIdx: number): string {
  for (let i = startIdx; i < Math.min(startIdx + 20, lines.length); i++) {
    const returnMatch = lines[i].match(/return\s+([^;]+)/);
    if (returnMatch) {
      const value = returnMatch[1].trim();
      if (/^["']/.test(value)) return 'string';
      if (/^\d/.test(value)) return 'number';
      if (/^(true|false)$/.test(value)) return 'boolean';
      if (/^\[/.test(value)) return 'Array';
      if (/^\{/.test(value)) return 'Object';
      if (/^null$/.test(value)) return 'null';
      if (/^new\s+(\w+)/.test(value)) {
        const match = value.match(/^new\s+(\w+)/);
        return match ? match[1] : 'Object';
      }
    }
  }
  return 'void';
}

function findFunctionEnd(lines: string[], startIdx: number): number {
  let braceCount = 0;
  let foundStart = false;

  for (let i = startIdx; i < lines.length; i++) {
    const openBraces = (lines[i].match(/\{/g) || []).length;
    const closeBraces = (lines[i].match(/\}/g) || []).length;

    if (openBraces > 0 || lines[i].includes('=>')) {
      foundStart = true;
    }

    braceCount += openBraces - closeBraces;

    if (foundStart && braceCount <= 0 && (openBraces > 0 || closeBraces > 0 || i > startIdx)) {
      if (braceCount === 0 && i > startIdx) {
        return i + 1;
      }
    }
  }

  return startIdx + 1;
}

function parsePython(code: string): ParseResult {
  const functions: FunctionInfo[] = [];
  const classes: ClassInfo[] = [];
  const lines = code.split('\n');

  const classRegex = /^(\s*)class\s+(\w+)/;
  const funcRegex = /^(\s*)def\s+(\w+)\s*\(([^)]*)\)\s*(->\s*([\w\[\],\s|]+))?:/;

  let currentClass: ClassInfo | null = null;
  let classIndent = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const indent = (line.match(/^\s*/) || [''])[0].length;

    const classMatch = line.match(classRegex);
    if (classMatch) {
      classIndent = indent;
      currentClass = {
        name: classMatch[2],
        methods: [],
        startLine: i + 1,
        endLine: 0
      };
      classes.push(currentClass);
      continue;
    }

    if (currentClass && indent <= classIndent && !line.match(/^\s*$/) && !line.match(/^\s*#/)) {
      currentClass.endLine = i;
      currentClass = null;
      classIndent = -1;
    }

    const funcMatch = line.match(funcRegex);
    if (funcMatch) {
      const params = parsePythonParams(funcMatch[3]);
      const returnType = funcMatch[5]?.trim() || inferReturnFromBody(lines, i);
      const isMethod = currentClass !== null && indent > classIndent;

      const funcInfo: FunctionInfo = {
        name: funcMatch[2],
        params,
        returnType,
        startLine: i + 1,
        endLine: findPythonBlockEnd(lines, i),
        isClassMethod: isMethod,
        className: isMethod ? currentClass?.name : undefined
      };
      functions.push(funcInfo);

      if (isMethod && currentClass) {
        currentClass.methods.push(funcInfo);
      }
    }
  }

  for (const cls of classes) {
    if (cls.endLine === 0) {
      cls.endLine = lines.length;
    }
  }

  return { language: 'python', functions, classes };
}

function parsePythonParams(paramsStr: string): FunctionParam[] {
  if (!paramsStr.trim()) return [];
  const params: FunctionParam[] = [];
  const rawParams = splitParams(paramsStr);

  for (const part of rawParams) {
    const trimmed = part.trim();
    if (!trimmed || trimmed === 'self' || trimmed === 'cls') continue;

    let name = trimmed;
    let type = '*';
    let defaultValue: string | undefined;

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex !== -1) {
      name = trimmed.substring(0, eqIndex).trim();
      defaultValue = trimmed.substring(eqIndex + 1).trim();
    }

    const colonIndex = name.indexOf(':');
    if (colonIndex !== -1) {
      type = name.substring(colonIndex + 1).trim();
      name = name.substring(0, colonIndex).trim();
    } else if (defaultValue !== undefined) {
      type = inferParamType(defaultValue, name);
    } else {
      type = inferParamType(undefined, name);
    }

    params.push({ name, type, defaultValue });
  }

  return params;
}

function findPythonBlockEnd(lines: string[], startIdx: number): number {
  const startIndent = (lines[startIdx].match(/^\s*/) || [''])[0].length;

  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '' || line.trim().startsWith('#')) continue;

    const indent = (line.match(/^\s*/) || [''])[0].length;
    if (indent <= startIndent) {
      return i;
    }
  }

  return lines.length;
}

function parseJava(code: string): ParseResult {
  const functions: FunctionInfo[] = [];
  const classes: ClassInfo[] = [];
  const lines = code.split('\n');

  const classRegex = /^\s*(public\s+|private\s+|protected\s+)?(static\s+|final\s+|abstract\s+)*class\s+(\w+)/;
  const methodRegex = /^\s*(public\s+|private\s+|protected\s+)?(static\s+)?(\w[\w<>\[\]]*)\s+(\w+)\s*\(([^)]*)\)/;

  let currentClass: ClassInfo | null = null;
  let braceCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const openBraces = (line.match(/\{/g) || []).length;
    const closeBraces = (line.match(/\}/g) || []).length;

    const classMatch = line.match(classRegex);
    if (classMatch) {
      currentClass = {
        name: classMatch[3],
        methods: [],
        startLine: i + 1,
        endLine: 0
      };
      classes.push(currentClass);
    }

    const methodMatch = line.match(methodRegex);
    if (methodMatch && !['class', 'if', 'for', 'while', 'switch', 'return', 'new'].includes(methodMatch[4])) {
      const returnType = methodMatch[3];
      const params = parseJavaParams(methodMatch[5]);

      const funcInfo: FunctionInfo = {
        name: methodMatch[4],
        params,
        returnType,
        startLine: i + 1,
        endLine: findFunctionEnd(lines, i),
        isClassMethod: currentClass !== null,
        className: currentClass?.name
      };
      functions.push(funcInfo);

      if (currentClass) {
        currentClass.methods.push(funcInfo);
      }
    }

    braceCount += openBraces - closeBraces;

    if (currentClass && braceCount === 0 && currentClass.endLine === 0 && currentClass.startLine < i + 1) {
      currentClass.endLine = i + 1;
    }
  }

  return { language: 'java', functions, classes };
}

function parseJavaParams(paramsStr: string): FunctionParam[] {
  if (!paramsStr.trim()) return [];
  const params: FunctionParam[] = [];
  const parts = splitParams(paramsStr);

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const tokens = trimmed.split(/\s+/);
    if (tokens.length >= 2) {
      const type = tokens.slice(0, -1).join(' ');
      const name = tokens[tokens.length - 1];
      params.push({ name, type });
    } else if (tokens.length === 1) {
      params.push({ name: tokens[0], type: '*' });
    }
  }

  return params;
}
