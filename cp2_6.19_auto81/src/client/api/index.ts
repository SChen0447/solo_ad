import type { ParsedResume, MatchResult, JobTemplate } from '../../types';

const API_BASE = '/api';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    },
    ...options,
  });

  const json = (await res.json()) as ApiResponse<T>;
  if (!json.success || !res.ok) {
    throw new Error(json.error || `请求失败 (${res.status})`);
  }
  return json.data as T;
}

export async function uploadResume(params: {
  file?: File;
  text?: string;
  onProgress?: (progress: number) => void;
}): Promise<ParsedResume> {
  const { file, text, onProgress } = params;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();

    if (file) formData.append('file', file);
    if (text) formData.append('text', text);

    xhr.open('POST', `${API_BASE}/upload`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        const progress = Math.round((e.loaded / e.total) * 90);
        onProgress(progress);
      }
    };

    xhr.onload = () => {
      try {
        const resp = JSON.parse(xhr.responseText) as ApiResponse<ParsedResume>;
        if (resp.success && resp.data) {
          onProgress?.(100);
          setTimeout(() => resolve(resp.data!), 300);
        } else {
          reject(new Error(resp.error || '上传失败'));
        }
      } catch (e) {
        reject(new Error('解析响应失败'));
      }
    };

    xhr.onerror = () => reject(new Error('网络错误'));
    xhr.onabort = () => reject(new Error('上传已取消'));

    let progressVal = 0;
    const interval = setInterval(() => {
      progressVal += 3;
      if (progressVal < 85) onProgress?.(progressVal);
      else clearInterval(interval);
    }, 60);

    xhr.onloadend = () => clearInterval(interval);

    xhr.send(formData);
  });
}

export async function getSkillMatch(
  resumeId: string,
  jobId: string
): Promise<MatchResult> {
  return request<MatchResult>(`/skill-match/${resumeId}?jobId=${encodeURIComponent(jobId)}`);
}

export async function getJobTemplates(): Promise<JobTemplate[]> {
  return request<JobTemplate[]>('/jobs');
}
