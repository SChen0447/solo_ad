import { Router, type Request, type Response } from 'express';
import { simulateService } from '../simulateService.js';
import { websocketManager } from '../websocketManager.js';
import type { SimulateRemoveRequest } from '../types/index.js';

const router = Router();

router.post(
  '/remove',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { moduleId } = req.body as SimulateRemoveRequest;

      if (!moduleId) {
        res.status(400).json({
          success: false,
          error: 'Module ID is required.',
        });
        return;
      }

      const result = simulateService.simulateModuleRemoval(moduleId);

      if (!result.success || !result.data) {
        res.status(400).json({
          success: false,
          error: result.error,
        });
        return;
      }

      websocketManager.broadcastSimulationResult({
        moduleId,
        result: {
          affectedModules: result.data.affectedModules,
          affectedEdges: result.data.affectedEdges,
          impactPaths: result.data.impactPaths,
          riskLevel: result.data.riskLevel,
        },
      });

      if (result.data.riskLevel === 'high') {
        websocketManager.broadcastAlert({
          type: 'error',
          message: `High risk detected! Removing '${result.data.removedModuleName}' would affect ${result.data.affectedCount} modules (${result.data.impactPercentage}% of the system).`,
          moduleId,
        });
      } else if (result.data.riskLevel === 'medium') {
        websocketManager.broadcastAlert({
          type: 'warning',
          message: `Medium risk: Removing '${result.data.removedModuleName}' would affect ${result.data.affectedCount} modules.`,
          moduleId,
        });
      }

      res.status(200).json({
        success: true,
        data: result.data,
      });
    } catch (error) {
      console.error('Error simulating module removal:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to simulate module removal.',
      });
    }
  }
);

router.get('/modules', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = simulateService.getAllModules();

    if (!result.success || !result.data) {
      res.status(400).json({
        success: false,
        error: result.error,
      });
      return;
    }

    res.status(200).json({
      success: true,
      modules: result.data,
    });
  } catch (error) {
    console.error('Error getting modules:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get modules list.',
    });
  }
});

export default router;
