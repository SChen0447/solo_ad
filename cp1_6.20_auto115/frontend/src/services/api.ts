import axios from 'axios';
import type {
  ProductTrace,
  ApiResponse,
  Certification,
  CertStatus,
} from '../types';

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL,
  timeout: 5000,
});

export const traceService = {
  async getTrace(code: string): Promise<ApiResponse<ProductTrace>> {
    try {
      const response = await api.get<ApiResponse<ProductTrace>>(
        `/trace/${code}`
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data;
      }
      return {
        success: false,
        message: '网络错误，请稍后重试',
      };
    }
  },
};

export const certService = {
  async apply(formData: FormData): Promise<ApiResponse<{ cert_id: number; status: string }>> {
    try {
      const response = await api.post<ApiResponse<{ cert_id: number; status: string }>>(
        '/cert/apply',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data;
      }
      return {
        success: false,
        message: '网络错误，请稍后重试',
      };
    }
  },

  async list(status?: CertStatus): Promise<ApiResponse<Certification[]>> {
    try {
      const response = await api.get<ApiResponse<Certification[]>>('/cert/list', {
        params: status ? { status } : undefined,
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data;
      }
      return {
        success: false,
        message: '网络错误，请稍后重试',
        data: [],
      };
    }
  },

  async approve(
    certId: number,
    action: 'approve' | 'reject',
    reviewer = '系统管理员',
    rejectReason?: string
  ): Promise<ApiResponse<Certification>> {
    try {
      const response = await api.post<ApiResponse<Certification>>('/cert/approve', {
        cert_id: certId,
        action,
        reviewer,
        reject_reason: rejectReason,
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data;
      }
      return {
        success: false,
        message: '网络错误，请稍后重试',
      };
    }
  },
};
