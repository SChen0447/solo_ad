import { Router, Request, Response } from 'express';
import { PartSelection } from '../types';
import {
  getPartsLibrary,
  getCurrentSetup,
  updateSelection,
  getAllSetups,
  saveSetup,
  loadSetup,
  deleteSetup
} from './garageService';

const router = Router();

router.get('/parts', (_req: Request, res: Response) => {
  const parts = getPartsLibrary();
  res.json({ success: true, data: parts });
});

router.post('/calculate', (req: Request, res: Response) => {
  const selection = req.body as PartSelection;
  if (!selection || !selection.engine || !selection.tire || !selection.suspension || !selection.wing) {
    res.status(400).json({ success: false, error: 'Invalid selection' });
    return;
  }
  const result = updateSelection(selection);
  res.json({ success: true, data: result });
});

router.get('/current', (_req: Request, res: Response) => {
  const result = getCurrentSetup();
  res.json({ success: true, data: result });
});

router.get('/setups', (_req: Request, res: Response) => {
  const setups = getAllSetups();
  res.json({ success: true, data: setups });
});

router.post('/setups', (req: Request, res: Response) => {
  const { name, selection } = req.body as { name: string; selection: PartSelection };
  if (!name || !selection) {
    res.status(400).json({ success: false, error: 'Missing name or selection' });
    return;
  }
  const setup = saveSetup(name, selection);
  res.json({ success: true, data: setup });
});

router.get('/setups/:id', (req: Request, res: Response) => {
  const setup = loadSetup(req.params.id);
  if (!setup) {
    res.status(404).json({ success: false, error: 'Setup not found' });
    return;
  }
  res.json({ success: true, data: setup });
});

router.delete('/setups/:id', (req: Request, res: Response) => {
  const ok = deleteSetup(req.params.id);
  if (!ok) {
    res.status(404).json({ success: false, error: 'Setup not found' });
    return;
  }
  res.json({ success: true });
});

export default router;
