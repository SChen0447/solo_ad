import axios from 'axios';

export const exportDocument = (noteId: string, format: string) =>
  axios.post<{ downloadUrl: string }>('/api/export', { noteId, format });
