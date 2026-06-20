import { Request, Response } from 'express';
import { processImageWithStyle, bufferToBase64 } from '../../src/services/styleProcessor';
import { getImageBuffer } from './uploadController';
import type { StyleParams } from '../../src/types';

export const applyStyle = async (req: Request, res: Response) => {
  try {
    const { imageId, params } = req.body as { imageId: string; params: StyleParams };

    if (!imageId || !params) {
      return res.status(400).json({ success: false, error: 'Missing required parameters' });
    }

    const imageBuffer = getImageBuffer(imageId);
    if (!imageBuffer) {
      return res.status(404).json({ success: false, error: 'Image not found' });
    }

    const result = await processImageWithStyle(imageBuffer, params);

    if (!result.success || !result.imageBuffer) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Processing failed'
      });
    }

    const base64Image = bufferToBase64(result.imageBuffer);

    res.json({
      success: true,
      processedImage: base64Image
    });
  } catch (error) {
    console.error('Style processing error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Processing failed'
    });
  }
};
