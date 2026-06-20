import type { UploadResponse, StyleResponse, ShareResponse, StyleParams } from '../types';

export const uploadImage = async (file: File): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(error.error || 'Upload failed');
  }

  return response.json();
};

export const applyStyle = async (
  imageId: string,
  params: StyleParams
): Promise<StyleResponse> => {
  const response = await fetch('/api/style', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ imageId, params })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Processing failed' }));
    throw new Error(error.error || 'Processing failed');
  }

  return response.json();
};

export const createShareLink = async (imageData: string): Promise<ShareResponse> => {
  const response = await fetch('/api/share', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ imageData })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to create share link' }));
    throw new Error(error.error || 'Failed to create share link');
  }

  return response.json();
};
