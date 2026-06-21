import { Router, type Request, type Response } from 'express';
import { graphEngine } from '../graphEngine.js';
import { websocketManager } from '../websocketManager.js';
import type { ProjectStructure } from '../types/index.js';

const router = Router();

router.post(
  '/upload',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const structure = req.body as ProjectStructure;

      if (!structure || !structure.modules || !structure.dependencies) {
        res.status(400).json({
          success: false,
          error:
            'Invalid project structure. Must contain modules and dependencies arrays.',
        });
        return;
      }

      if (structure.modules.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Project must contain at least one module.',
        });
        return;
      }

      const result = graphEngine.loadProject(structure);

      websocketManager.broadcastTopologyUpdate(result);

      res.status(200).json({
        success: true,
        message: 'Project structure loaded successfully.',
        ...result,
      });
    } catch (error) {
      console.error('Error uploading project:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to parse project structure. Please check your JSON format.',
      });
    }
  }
);

router.get(
  '/topology',
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!graphEngine.hasProject()) {
        res.status(404).json({
          success: false,
          error: 'No project loaded. Please upload a project structure first.',
        });
        return;
      }

      const topology = graphEngine.getCurrentTopology();

      res.status(200).json({
        success: true,
        topology,
      });
    } catch (error) {
      console.error('Error getting topology:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get topology data.',
      });
    }
  }
);

router.get('/risk', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!graphEngine.hasProject()) {
      res.status(404).json({
        success: false,
        error: 'No project loaded. Please upload a project structure first.',
      });
      return;
    }

    const risks = graphEngine.getCurrentRisks();

    res.status(200).json({
      success: true,
      risks,
    });
  } catch (error) {
    console.error('Error getting risk data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get risk data.',
    });
  }
});

router.get(
  '/history',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const count = parseInt(req.query.count as string) || 5;
      const history = graphEngine.getRecentHistory(Math.min(count, 20));

      res.status(200).json({
        success: true,
        history,
      });
    } catch (error) {
      console.error('Error getting history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get history data.',
      });
    }
  }
);

export default router;
