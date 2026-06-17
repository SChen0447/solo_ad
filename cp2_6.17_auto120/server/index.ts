import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import apiRouter from './api';

const app = express();
const PORT = 3088;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

app.use('/api', apiRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🌱 植物知识库 API 服务已启动: http://localhost:${PORT}`);
  console.log(`📚 植物数据接口: http://localhost:${PORT}/api/plants/all`);
});
