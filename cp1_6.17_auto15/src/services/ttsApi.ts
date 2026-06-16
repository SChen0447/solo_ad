import axios from 'axios';
import { TTSSettings } from '../types';

export const ttsApi = {
  async synthesize(
    text: string,
    settings: TTSSettings
  ): Promise<Blob> {
    const response = await axios.post(
      '/api/tts',
      {
        text,
        speed: settings.speed,
        pitch: settings.pitch,
        voice: settings.voice,
      },
      {
        responseType: 'blob',
        timeout: 10000,
      }
    );
    return response.data;
  },
};
