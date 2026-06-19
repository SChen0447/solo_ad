import { ParsedResume, MatchResult, JobRequirement, ApiResponse } from '../types';

const API_BASE = '/api';

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  const data = await response.json() as ApiResponse<T>;

  if (!data.success || !response.ok) {
    throw new Error(data.error || '请求失败');
  }

  return data.data as T;
}

export async function uploadResume(file?: File, text?: string): Promise<ParsedResume> {
  const formData = new FormData();

  if (file) {
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('文件大小不能超过5MB');
    }
    formData.append('resume', file);
  } else if (text) {
    return request<ParsedResume>('/upload', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  } else {
    throw new Error('请上传文件或粘贴简历文本');
  }

  return request<ParsedResume>('/upload', {
    method: 'POST',
    headers: {},
    body: formData,
  });
}

export async function getSkillMatch(resumeId: string, jobId: string): Promise<MatchResult> {
  return request<MatchResult>(`/skill-match/${resumeId}?jobId=${jobId}`);
}

export async function getJobs(): Promise<JobRequirement[]> {
  return request<JobRequirement[]>('/jobs');
}

export async function getJob(jobId: string): Promise<JobRequirement> {
  return request<JobRequirement>(`/jobs/${jobId}`);
}
