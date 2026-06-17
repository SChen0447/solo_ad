import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';
import { executeCode, Language } from './sandboxExecutor';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

interface CodeBlock {
  id: string;
  language: Language;
  code: string;
  output?: string;
  error?: string;
  executionTime?: number;
}

interface DocumentContent {
  id: string;
  title: string;
  content: string;
  codeBlocks: CodeBlock[];
  createdAt: number;
  updatedAt: number;
}

const documents = new Map<string, DocumentContent>();

function createNewDocument(title: string = '未命名文档'): DocumentContent {
  const now = Date.now();
  return {
    id: uuidv4(),
    title,
    content: '',
    codeBlocks: [],
    createdAt: now,
    updatedAt: now
  };
}

const sampleDoc = createNewDocument('欢迎使用协作式文档编辑器');
sampleDoc.content = '<h1>欢迎使用协作式文档编辑器</h1><p>这是一个支持<b>富文本编辑</b>和<i>内嵌代码沙盒</i>的在线文档工具。</p><h2>功能特点</h2><ul><li>支持多种代码语言</li><li>安全的沙盒执行环境</li><li>实时运行结果展示</li></ul>';
sampleDoc.codeBlocks = [
  {
    id: uuidv4(),
    language: 'javascript',
    code: '// 点击运行按钮查看结果\nfunction fibonacci(n) {\n  if (n <= 1) return n;\n  return fibonacci(n - 1) + fibonacci(n - 2);\n}\n\nconsole.log("斐波那契数列前10项:");\nfor (let i = 0; i < 10; i++) {\n  console.log(fibonacci(i));\n}',
    output: '',
    error: undefined,
    executionTime: undefined
  },
  {
    id: uuidv4(),
    language: 'python',
    code: '# Python示例\nimport math\n\ndef is_prime(n):\n    if n < 2:\n        return False\n    for i in range(2, int(math.sqrt(n)) + 1):\n        if n % i == 0:\n            return False\n    return True\n\nprint("100以内的质数:")\nprimes = [x for x in range(2, 100) if is_prime(x)]\nprint(primes)',
    output: '',
    error: undefined,
    executionTime: undefined
  }
];
documents.set(sampleDoc.id, sampleDoc);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.get('/api/documents', (req, res) => {
  const docList = Array.from(documents.values()).map((doc) => ({
    id: doc.id,
    title: doc.title,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt
  }));
  res.json(docList);
});

app.get('/api/documents/:id', (req, res) => {
  const { id } = req.params;
  const doc = documents.get(id);

  if (!doc) {
    res.status(404).json({ error: '文档不存在' });
    return;
  }

  res.json(doc);
});

app.post('/api/documents', (req, res) => {
  const { title } = req.body;
  const newDoc = createNewDocument(title || '未命名文档');
  documents.set(newDoc.id, newDoc);
  res.status(201).json(newDoc);
});

app.put('/api/documents/:id', (req, res) => {
  const { id } = req.params;
  const { title, content, codeBlocks } = req.body;

  let doc = documents.get(id);

  if (!doc) {
    doc = createNewDocument(title || '未命名文档');
    doc.id = id;
  }

  doc.title = title || doc.title;
  doc.content = content !== undefined ? content : doc.content;
  doc.codeBlocks = codeBlocks || doc.codeBlocks;
  doc.updatedAt = Date.now();

  documents.set(id, doc);
  res.json(doc);
});

app.delete('/api/documents/:id', (req, res) => {
  const { id } = req.params;
  const deleted = documents.delete(id);

  if (!deleted) {
    res.status(404).json({ error: '文档不存在' });
    return;
  }

  res.json({ success: true });
});

app.post('/api/run', async (req, res) => {
  const { code, language } = req.body;

  if (!code) {
    res.status(400).json({ error: '代码不能为空' });
    return;
  }

  if (!language || !['javascript', 'python', 'html'].includes(language)) {
    res.status(400).json({ error: '不支持的语言类型' });
    return;
  }

  try {
    const result = await executeCode(code, language as Language);
    res.json(result);
  } catch (err) {
    res.status(500).json({
      success: false,
      output: '',
      error: err instanceof Error ? err.message : '执行失败',
      executionTime: 0
    });
  }
});

app.listen(PORT, () => {
  console.log(`沙盒执行服务运行在 http://localhost:${PORT}`);
  console.log(`示例文档ID: ${sampleDoc.id}`);
});
