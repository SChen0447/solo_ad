import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { bufferToBase64 } from '../../src/services/styleProcessor';

const imageStore = new Map<string, Buffer>();

export const uploadImage = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const imageId = randomUUID();
    imageStore.set(imageId, req.file.buffer);

    const originalUrl = bufferToBase64(req.file.buffer);

    res.json({
      success: true,
      imageId,
      originalUrl
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    });
  }
};

export const getImageBuffer = (imageId: string): Buffer | null => {
  return imageStore.get(imageId) || null;
};

export const clearImage = (imageId: string): void => {
  imageStore.delete(imageId);
};
