import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';
import { executeCode, SandboxResult } from './sandboxExecutor';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

interface CodeBlockData {
  id: string;
  language: string;
  code: string;
  output: string;
  error?: string;
}

interface DocumentData {
  id: string;
  title: string;
  content: string;
  codeBlocks: CodeBlockData[];
  createdAt: number;
  updatedAt: number;
}

interface DocumentListItem {
  id: string;
  title: string;
  updatedAt: number;
  createdAt: number;
}

const documents: Map<string, DocumentData> = new Map();

function createSampleDocs() {
  const sampleDoc1: DocumentData = {
    id: uuidv4(),
    title: '欢迎使用协作文档编辑器',
    content:
      '<h1>欢迎使用协作文档编辑器</h1><p>这是一个支持<strong>富文本</strong>和<em>代码沙盒</em>的在线编辑器。</p><h2>主要功能</h2><ul><li>富文本编辑</li><li>代码块嵌入与运行</li><li>多语言支持</li></ul>',
    codeBlocks: [
      {
        id: uuidv4(),
        language: 'javascript',
        code: '// 示例：JavaScript代码\nconsole.log("Hello, World!");\nconst sum = 1 + 2 + 3;\nconsole.log("Sum:", sum);',
        output: 'Hello, World!\nSum: 6',
      },
      {
        id: uuidv4(),
        language: 'python',
        code: '# 示例：Python代码\ndef fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n-1) + fibonacci(n-2)\n\nprint("Fibonacci(10):", fibonacci(10))',
        output: 'Fibonacci(10): 55',
      },
    ],
    createdAt: Date.now() - 86400000 * 3,
    updatedAt: Date.now() - 3600000,
  };

  const sampleDoc2: DocumentData = {
    id: uuidv4(),
    title: '前端开发笔记',
    content:
      '<h1>前端开发笔记</h1><p>记录一些有用的前端代码片段。</p>',
    codeBlocks: [
      {
        id: uuidv4(),
        language: 'html',
        code: '<!DOCTYPE html>\n<html>\n<head>\n  <title>示例页面</title>\n</head>\n<body>\n  <h1>Hello World</h1>\n  <p>这是一个HTML示例</p>\n</body>\n</html>',
        output: 'HTML preview generated...',
      },
    ],
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 1800000,
  };

  documents.set(sampleDoc1.id, sampleDoc1);
  documents.set(sampleDoc2.id, sampleDoc2);
}

createSampleDocs();

app.post('/api/run', async (req, res) => {
  try {
    const { code, language } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Code is required' });
    }

    if (!language || typeof language !== 'string') {
      return res.status(400).json({ error: 'Language is required' });
    }

    const result: SandboxResult = await executeCode(code, language);
    res.json(result);
  } catch (err) {
    res.status(500).json({
      success: false,
      output: '',
      error: err instanceof Error ? err.message : 'Internal server error',
      executionTime: 0,
    });
  }
});

app.get('/api/documents', (req, res) => {
  const docList: DocumentListItem[] = Array.from(documents.values()).map(
    (doc) => ({
      id: doc.id,
      title: doc.title,
      updatedAt: doc.updatedAt,
      createdAt: doc.createdAt,
    })
  );

  docList.sort((a, b) => b.updatedAt - a.updatedAt);
  res.json(docList);
});

app.get('/api/documents/:id', (req, res) => {
  const { id } = req.params;
  const doc = documents.get(id);

  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }

  res.json(doc);
});

app.post('/api/documents', (req, res) => {
  const { title, content, codeBlocks } = req.body;

  const newDoc: DocumentData = {
    id: uuidv4(),
    title: title || '无标题文档',
    content: content || '',
    codeBlocks: codeBlocks || [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  documents.set(newDoc.id, newDoc);
  res.status(201).json(newDoc);
});

app.put('/api/documents/:id', (req, res) => {
  const { id } = req.params;
  const { title, content, codeBlocks } = req.body;

  const doc = documents.get(id);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }

  if (title !== undefined) doc.title = title;
  if (content !== undefined) doc.content = content;
  if (codeBlocks !== undefined) doc.codeBlocks = codeBlocks;
  doc.updatedAt = Date.now();

  documents.set(id, doc);
  res.json(doc);
});

app.delete('/api/documents/:id', (req, res) => {
  const { id } = req.params;

  if (!documents.has(id)) {
    return res.status(404).json({ error: 'Document not found' });
  }

  documents.delete(id);
  res.status(204).send();
});

app.listen(PORT, () => {
  console.log(`Sandbox server running on http://localhost:${PORT}`);
});
