import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { shareCache } from '../utils/cache';

export const createShareLink = async (req: Request, res: Response) => {
  try {
    const { imageData } = req.body as { imageData: string };

    if (!imageData) {
      return res.status(400).json({ success: false, error: 'Missing image data' });
    }

    const shareId = randomUUID();
    const expiresAt = Date.now() + 5 * 60 * 1000;

    shareCache.set(shareId, imageData);

    const shareUrl = `/api/share/${shareId}`;

    res.json({
      success: true,
      shareUrl,
      expiresAt
    });
  } catch (error) {
    console.error('Share creation error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create share link'
    });
  }
};

export const getSharedImage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const imageData = shareCache.get(id);
    if (!imageData) {
      return res.status(404).json({ success: false, error: 'Share link expired or not found' });
    }

    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.send(buffer);
  } catch (error) {
    console.error('Share retrieval error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve image'
    });
  }
};
