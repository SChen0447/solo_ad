import express, { Request, Response } from 'express';
import cors from 'cors';
import { generateHeightMap, HeightMap } from './terrainGenerator';
import { simulateErosion } from './erosionSimulator';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

interface GenerateTerrainRequest {
  size: number;
  heightRange: number;
  seed: number;
}

interface ErodeTerrainRequest {
  heightMap: HeightMap;
  iterations: number;
}

app.post('/generate-terrain', (req: Request<{}, {}, GenerateTerrainRequest>, res: Response) => {
  try {
    const { size, heightRange, seed } = req.body;

    if (!size || !heightRange || seed === undefined) {
      return res.status(400).json({ error: '缺少必要参数: size, heightRange, seed' });
    }

    if (size < 10 || size > 50) {
      return res.status(400).json({ error: '地形大小必须在 10 到 50 之间' });
    }

    if (heightRange < 0 || heightRange > 100) {
      return res.status(400).json({ error: '高度范围必须在 0 到 100 之间' });
    }

    const heightMap = generateHeightMap(size, heightRange, seed);
    res.json({ heightMap, size });
  } catch (error) {
    console.error('生成地形时出错:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.post('/erode-terrain', (req: Request<{}, {}, ErodeTerrainRequest>, res: Response) => {
  try {
    const { heightMap, iterations } = req.body;

    if (!heightMap || !Array.isArray(heightMap)) {
      return res.status(400).json({ error: '缺少有效的 heightMap 数据' });
    }

    if (iterations === undefined || iterations < 1 || iterations > 50) {
      return res.status(400).json({ error: '迭代次数必须在 1 到 50 之间' });
    }

    const result = simulateErosion(heightMap, iterations);
    res.json(result);
  } catch (error) {
    console.error('侵蚀模拟时出错:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`地形模拟服务器运行在 http://localhost:${PORT}`);
});
