import axios from 'axios';
import type { Annotation, Template, SaveTemplateRequest, ApiResponse } from './types';

const API_BASE_URL = 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const saveAnnotations = async (
  artworkId: string,
  annotations: Annotation[]
): Promise<ApiResponse<{ saved: number }>> => {
  try {
    const response = await apiClient.post(`/annotations/${artworkId}`, { annotations });
    return response.data;
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '保存批注失败',
    };
  }
};

export const getAnnotations = async (
  artworkId: string
): Promise<ApiResponse<Annotation[]>> => {
  try {
    const response = await apiClient.get(`/annotations/${artworkId}`);
    return response.data;
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '获取批注失败',
    };
  }
};

export const getTemplates = async (): Promise<ApiResponse<Template[]>> => {
  try {
    const response = await apiClient.get('/templates');
    return response.data;
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '获取模板列表失败',
      data: [],
    };
  }
};

export const saveTemplate = async (
  request: SaveTemplateRequest
): Promise<ApiResponse<Template>> => {
  try {
    const response = await apiClient.post('/templates', request);
    return response.data;
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '保存模板失败',
    };
  }
};

export const deleteTemplate = async (
  templateId: string
): Promise<ApiResponse<null>> => {
  try {
    const response = await apiClient.delete(`/templates/${templateId}`);
    return response.data;
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '删除模板失败',
    };
  }
};

export const getTemplateById = async (
  templateId: string
): Promise<ApiResponse<Template>> => {
  try {
    const response = await apiClient.get(`/templates/${templateId}`);
    return response.data;
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '获取模板详情失败',
    };
  }
};
