import { FunctionInfo, ClassInfo, Language, CommentStyle, FunctionParam } from './CodeParser';

export interface GeneratedComment {
  targetLine: number;
  text: string;
  functionName: string;
  style: CommentStyle;
  applied: boolean;
  id: string;
}

function getIndentOfLine(codeLines: string[], lineNumber: number): string {
  if (lineNumber < 1 || lineNumber > codeLines.length) return '';
  const line = codeLines[lineNumber - 1];
  const match = line.match(/^(\s*)/);
  return match ? match[1] : '';
}

export function generateFunctionComment(
  func: FunctionInfo,
  style: CommentStyle,
  language: Language,
  codeLines: string[]
): GeneratedComment {
  const indent = getIndentOfLine(codeLines, func.startLine);
  let commentText = '';

  switch (style) {
    case 'jsdoc':
      commentText = generateJSDocComment(func, indent);
      break;
    case 'sphinx':
      commentText = generateSphinxComment(func, indent, language);
      break;
    case 'javadoc':
      commentText = generateJavaDocComment(func, indent);
      break;
  }

  return {
    id: `${func.name}-${func.startLine}`,
    targetLine: func.startLine,
    text: commentText,
    functionName: func.name,
    style,
    applied: false
  };
}

function generateJSDocComment(func: FunctionInfo, indent: string): string {
  const lines: string[] = [];
  lines.push(`${indent}/**`);
  lines.push(`${indent} * ${generateDescription(func.name)}`);

  if (func.params.length > 0) {
    lines.push(`${indent} *`);
    for (const param of func.params) {
      const typeStr = param.type && param.type !== '*' ? `{${param.type}}` : '{*}';
      const defaultStr = param.defaultValue ? ` [default=${param.defaultValue}]` : '';
      lines.push(`${indent} * @param ${typeStr} ${param.name}${defaultStr} - ${generateParamDescription(param.name)}`);
    }
  }

  if (func.returnType && func.returnType !== 'void') {
    lines.push(`${indent} *`);
    const returnTypeStr = func.returnType && func.returnType !== '*' ? `{${func.returnType}}` : '{*}';
    lines.push(`${indent} * @returns ${returnTypeStr} ${generateReturnDescription(func.name, func.returnType)}`);
  }

  lines.push(`${indent} */`);
  return lines.join('\n');
}

function generateSphinxComment(func: FunctionInfo, indent: string, language: Language): string {
  const lines: string[] = [];

  if (language === 'python') {
    lines.push(`${indent}"""`);
    lines.push(`${indent}${generateDescription(func.name)}`);

    if (func.params.length > 0) {
      lines.push('');
      for (const param of func.params) {
        const typeStr = param.type && param.type !== '*' ? ` (${param.type})` : '';
        lines.push(`${indent}:param ${param.name}${typeStr}: ${generateParamDescription(param.name)}`);
      }
    }

    if (func.returnType && func.returnType !== 'void') {
      lines.push('');
      const returnTypeStr = func.returnType && func.returnType !== '*' ? ` (${func.returnType})` : '';
      lines.push(`${indent}:returns${returnTypeStr}: ${generateReturnDescription(func.name, func.returnType)}`);
    }

    lines.push(`${indent}"""`);
  } else {
    lines.push(`${indent}"""`);
    lines.push(`${indent}${generateDescription(func.name)}`);

    if (func.params.length > 0) {
      lines.push('');
      for (const param of func.params) {
        lines.push(`${indent}@param ${param.name}: ${generateParamDescription(param.name)}`);
        if (param.type && param.type !== '*') {
          lines.push(`${indent}@type ${param.name}: ${param.type}`);
        }
      }
    }

    if (func.returnType && func.returnType !== 'void') {
      lines.push('');
      lines.push(`${indent}@returns: ${generateReturnDescription(func.name, func.returnType)}`);
      if (func.returnType && func.returnType !== '*') {
        lines.push(`${indent}@rtype: ${func.returnType}`);
      }
    }

    lines.push(`${indent}"""`);
  }

  return lines.join('\n');
}

function generateJavaDocComment(func: FunctionInfo, indent: string): string {
  const lines: string[] = [];
  lines.push(`${indent}/**`);
  lines.push(`${indent} * ${generateDescription(func.name)}`);

  if (func.params.length > 0) {
    lines.push(`${indent} *`);
    for (const param of func.params) {
      lines.push(`${indent} * @param ${param.name} ${generateParamDescription(param.name)}`);
    }
  }

  if (func.returnType && func.returnType !== 'void') {
    lines.push(`${indent} *`);
    lines.push(`${indent} * @return ${generateReturnDescription(func.name, func.returnType)}`);
  }

  lines.push(`${indent} */`);
  return lines.join('\n');
}

function generateDescription(funcName: string): string {
  if (funcName.startsWith('get')) {
    return `Retrieves ${funcName.replace(/^get/, '').replace(/([A-Z])/g, ' $1').toLowerCase().trim()}.`;
  }
  if (funcName.startsWith('set')) {
    return `Sets ${funcName.replace(/^set/, '').replace(/([A-Z])/g, ' $1').toLowerCase().trim()}.`;
  }
  if (funcName.startsWith('is')) {
    return `Checks if ${funcName.replace(/^is/, '').replace(/([A-Z])/g, ' $1').toLowerCase().trim()}.`;
  }
  if (funcName.startsWith('has')) {
    return `Determines whether ${funcName.replace(/^has/, '').replace(/([A-Z])/g, ' $1').toLowerCase().trim()}.`;
  }
  if (funcName.startsWith('should')) {
    return `Determines whether should ${funcName.replace(/^should/, '').replace(/([A-Z])/g, ' $1').toLowerCase().trim()}.`;
  }
  if (funcName.startsWith('can')) {
    return `Checks if can ${funcName.replace(/^can/, '').replace(/([A-Z])/g, ' $1').toLowerCase().trim()}.`;
  }
  if (funcName.startsWith('calculate') || funcName.startsWith('compute')) {
    return `Calculates ${funcName.replace(/^(calculate|compute)/, '').replace(/([A-Z])/g, ' $1').toLowerCase().trim()}.`;
  }
  if (funcName.startsWith('create')) {
    return `Creates a new ${funcName.replace(/^create/, '').replace(/([A-Z])/g, ' $1').toLowerCase().trim()}.`;
  }
  if (funcName.startsWith('init') || funcName.startsWith('initialize')) {
    return `Initializes ${funcName.replace(/^(init|initialize)/, '').replace(/([A-Z])/g, ' $1').toLowerCase().trim()}.`;
  }
  if (funcName.startsWith('update')) {
    return `Updates ${funcName.replace(/^update/, '').replace(/([A-Z])/g, ' $1').toLowerCase().trim()}.`;
  }
  if (funcName.startsWith('delete') || funcName.startsWith('remove')) {
    return `Deletes ${funcName.replace(/^(delete|remove)/, '').replace(/([A-Z])/g, ' $1').toLowerCase().trim()}.`;
  }
  if (funcName.startsWith('fetch') || funcName.startsWith('load') || funcName.startsWith('read')) {
    return `Fetches ${funcName.replace(/^(fetch|load|read)/, '').replace(/([A-Z])/g, ' $1').toLowerCase().trim()}.`;
  }
  if (funcName.startsWith('save') || funcName.startsWith('store') || funcName.startsWith('write')) {
    return `Saves ${funcName.replace(/^(save|store|write)/, '').replace(/([A-Z])/g, ' $1').toLowerCase().trim()}.`;
  }
  if (funcName.startsWith('validate') || funcName.startsWith('check')) {
    return `Validates ${funcName.replace(/^(validate|check)/, '').replace(/([A-Z])/g, ' $1').toLowerCase().trim()}.`;
  }
  if (funcName.startsWith('handle') || funcName.startsWith('on')) {
    return `Handles ${funcName.replace(/^(handle|on)/, '').replace(/([A-Z])/g, ' $1').toLowerCase().trim()} events.`;
  }
  if (funcName === 'constructor' || funcName === '__init__') {
    return 'Constructs a new instance.';
  }
  return `${funcName.charAt(0).toUpperCase()}${funcName.slice(1).replace(/([A-Z])/g, ' $1')}.`;
}

function generateParamDescription(paramName: string): string {
  if (paramName.startsWith('is') || paramName.startsWith('has') || paramName.startsWith('should') || paramName.startsWith('can')) {
    return `Whether ${paramName.replace(/([A-Z])/g, ' $1').toLowerCase().trim()}`;
  }
  if (paramName.includes('config') || paramName.includes('options') || paramName.includes('settings')) {
    return 'Configuration options';
  }
  if (paramName.includes('callback') || paramName.includes('fn') || paramName.endsWith('Func')) {
    return 'Callback function';
  }
  if (paramName.includes('index')) {
    return 'The index value';
  }
  if (paramName.includes('name')) {
    return 'The name value';
  }
  if (paramName.includes('id')) {
    return 'The identifier';
  }
  if (paramName.includes('data') || paramName.includes('payload')) {
    return 'The data payload';
  }
  if (paramName.includes('count') || paramName.includes('num') || paramName.includes('size') || paramName.includes('limit')) {
    return 'The count/size value';
  }
  if (paramName.includes('text') || paramName.includes('str') || paramName.includes('message') || paramName.includes('content')) {
    return 'The text content';
  }
  if (paramName.includes('list') || paramName.includes('arr') || paramName.endsWith('s')) {
    return 'The array of items';
  }
  if (paramName.includes('path') || paramName.includes('url') || paramName.includes('file')) {
    return 'The path or URL';
  }
  if (paramName.includes('error') || paramName.includes('err')) {
    return 'The error object';
  }
  return `The ${paramName.replace(/([A-Z])/g, ' $1').toLowerCase().trim()} value`;
}

function generateReturnDescription(funcName: string, returnType: string): string {
  const baseName = funcName.replace(/^(get|set|is|has|should|can|calculate|compute|create|init|initialize|update|delete|remove|fetch|load|read|save|store|write|validate|check|handle|on)/, '');
  const desc = baseName.replace(/([A-Z])/g, ' $1').toLowerCase().trim();

  if (funcName.startsWith('is') || funcName.startsWith('has') || funcName.startsWith('should') || funcName.startsWith('can')) {
    return `True if ${desc}, false otherwise`;
  }
  if (returnType === 'boolean' || returnType === 'bool') {
    return 'True if successful, false otherwise';
  }
  if (returnType === 'string' || returnType === 'str' || returnType === 'String') {
    return `The ${desc || 'result'} string`;
  }
  if (returnType === 'number' || returnType === 'int' || returnType === 'float' || returnType === 'Number' || returnType === 'Integer') {
    return `The ${desc || 'result'} numeric value`;
  }
  if (returnType.includes('Array') || returnType.includes('List') || returnType.includes('[]')) {
    return `The array of ${desc || 'items'}`;
  }
  if (returnType.includes('Object') || returnType.includes('Map') || returnType.includes('Dict')) {
    return `The ${desc || 'result'} object`;
  }
  if (returnType === 'void') {
    return '';
  }
  return `The ${desc || 'result'} value`;
}

export function generateClassComment(
  cls: ClassInfo,
  style: CommentStyle,
  language: Language,
  codeLines: string[]
): GeneratedComment {
  const indent = getIndentOfLine(codeLines, cls.startLine);
  let commentText = '';
  const description = `Represents a ${cls.name}.`;

  switch (style) {
    case 'jsdoc':
    case 'javadoc':
      commentText = `${indent}/**\n${indent} * ${description}\n${indent} */`;
      break;
    case 'sphinx':
      if (language === 'python') {
        commentText = `${indent}"""\n${indent}${description}\n${indent}"""`;
      } else {
        commentText = `${indent}"""\n${indent}${description}\n${indent}"""`;
      }
      break;
  }

  return {
    id: `class-${cls.name}-${cls.startLine}`,
    targetLine: cls.startLine,
    text: commentText,
    functionName: cls.name,
    style,
    applied: false
  };
}

export function generateAllComments(
  functions: FunctionInfo[],
  classes: ClassInfo[],
  style: CommentStyle,
  language: Language,
  code: string
): GeneratedComment[] {
  const codeLines = code.split('\n');
  const comments: GeneratedComment[] = [];

  for (const cls of classes) {
    comments.push(generateClassComment(cls, style, language, codeLines));
  }

  for (const func of functions) {
    comments.push(generateFunctionComment(func, style, language, codeLines));
  }

  comments.sort((a, b) => a.targetLine - b.targetLine);
  return comments;
}

export function applyComments(code: string, comments: GeneratedComment[]): string {
  const lines = code.split('\n');
  const sortedComments = [...comments]
    .filter(c => c.applied)
    .sort((a, b) => b.targetLine - a.targetLine);

  for (const comment of sortedComments) {
    const insertPosition = comment.targetLine - 1;
    const commentLines = comment.text.split('\n');
    lines.splice(insertPosition, 0, ...commentLines);
  }

  return lines.join('\n');
}

export function countCommentLines(comments: GeneratedComment[]): number {
  return comments
    .filter(c => c.applied)
    .reduce((acc, c) => acc + c.text.split('\n').length, 0);
}

export { FunctionParam };
