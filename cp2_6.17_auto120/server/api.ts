import { Router, Request, Response } from 'express';
import { getPlantByName, plantDatabase, getAllPlantNames } from './plantDB';

const router = Router();

router.get('/plants', (_req: Request, res: Response) => {
  const names = getAllPlantNames();
  res.json(names);
});

router.get('/plants/all', (_req: Request, res: Response) => {
  res.json(plantDatabase);
});

router.get('/plants/:name', (req: Request, res: Response) => {
  const name = decodeURIComponent(req.params.name);
  const plant = getPlantByName(name);
  
  if (!plant) {
    return res.status(404).json({
      error: 'Plant not found',
      message: `没有找到名为"${name}"的植物`,
    });
  }
  
  res.json(plant);
});

router.get('/plants/search/:keyword', (req: Request, res: Response) => {
  const keyword = decodeURIComponent(req.params.keyword).toLowerCase();
  const results = plantDatabase.filter(
    (p) =>
      p.name.toLowerCase().includes(keyword) ||
      p.scientificName.toLowerCase().includes(keyword) ||
      p.family.toLowerCase().includes(keyword)
  );
  res.json(results);
});

export default router;
