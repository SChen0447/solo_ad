import express from 'express';
import cors from 'cors';
import { questionStore, resultStore, Question, QuizResult, ChoiceQuestion, FillQuestion, SortQuestion } from './store';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.get('/api/questions', (req, res) => {
  const { type } = req.query;
  if (type && (type === 'choice' || type === 'fill' || type === 'sort')) {
    res.json(questionStore.getByType(type));
  } else {
    res.json(questionStore.getAll());
  }
});

app.get('/api/questions/:id', (req, res) => {
  const question = questionStore.getById(req.params.id);
  if (!question) {
    res.status(404).json({ error: '题目不存在' });
    return;
  }
  res.json(question);
});

app.post('/api/questions', (req, res) => {
  try {
    const questionData = req.body;
    
    if (!questionData.type || !questionData.title) {
      res.status(400).json({ error: '题目类型和标题不能为空' });
      return;
    }

    if (questionData.type === 'choice') {
      const choiceData = questionData as Omit<ChoiceQuestion, 'id'>;
      if (!choiceData.options || choiceData.options.length < 4) {
        res.status(400).json({ error: '单选题至少需要4个选项' });
        return;
      }
      if (choiceData.correctAnswer === undefined || choiceData.correctAnswer < 0 || choiceData.correctAnswer >= choiceData.options.length) {
        res.status(400).json({ error: '正确答案索引无效' });
        return;
      }
    } else if (questionData.type === 'fill') {
      const fillData = questionData as Omit<FillQuestion, 'id'>;
      if (!fillData.blanks || fillData.blanks.length < 1) {
        res.status(400).json({ error: '填空题至少需要1个空位' });
        return;
      }
    } else if (questionData.type === 'sort') {
      const sortData = questionData as Omit<SortQuestion, 'id'>;
      if (!sortData.items || sortData.items.length < 2) {
        res.status(400).json({ error: '排序题至少需要2个选项' });
        return;
      }
    }

    const newQuestion = questionStore.create(questionData as Omit<Question, 'id'>);
    res.status(201).json(newQuestion);
  } catch (error) {
    res.status(500).json({ error: '创建题目失败' });
  }
});

app.put('/api/questions/:id', (req, res) => {
  try {
    const updated = questionStore.update(req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ error: '题目不存在' });
      return;
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: '更新题目失败' });
  }
});

app.delete('/api/questions/:id', (req, res) => {
  const deleted = questionStore.delete(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: '题目不存在' });
    return;
  }
  res.json({ success: true });
});

app.get('/api/results', (req, res) => {
  res.json(resultStore.getAll());
});

app.get('/api/results/:id', (req, res) => {
  const result = resultStore.getById(req.params.id);
  if (!result) {
    res.status(404).json({ error: '成绩记录不存在' });
    return;
  }
  res.json(result);
});

app.post('/api/results', (req, res) => {
  try {
    const resultData = req.body as Omit<QuizResult, 'id' | 'createdAt'>;
    
    if (!resultData.studentName || !resultData.answers) {
      res.status(400).json({ error: '学生姓名和答案不能为空' });
      return;
    }

    const newResult = resultStore.create(resultData);
    res.status(201).json(newResult);
  } catch (error) {
    res.status(500).json({ error: '保存成绩失败' });
  }
});

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});

export default app;
