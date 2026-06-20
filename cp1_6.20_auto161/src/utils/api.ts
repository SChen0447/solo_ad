import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import type {
  Instrument,
  InstrumentQuery,
  InspectionReport,
  PaginatedResponse,
  SubmitInspectionPayload,
  Transaction,
  UserProfile,
  ListResponse,
  Review,
  MetaOption,
} from '../types';

const BASE_URL = '/api';
const DEFAULT_TIMEOUT = 10000;

class ApiClient {
  private client: AxiosInstance;
  private loadingCount = 0;
  private loadingListeners: Set<(loading: boolean) => void> = new Set();
  private errorListeners: Set<(error: string) => void> = new Set();

  constructor() {
    this.client = axios.create({
      baseURL: BASE_URL,
      timeout: DEFAULT_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use((config) => {
      this.loadingCount++;
      this.notifyLoading();
      return config;
    });

    this.client.interceptors.response.use(
      (response) => {
        this.loadingCount = Math.max(0, this.loadingCount - 1);
        this.notifyLoading();
        return response;
      },
      (error: AxiosError) => {
        this.loadingCount = Math.max(0, this.loadingCount - 1);
        this.notifyLoading();
        const message = this.parseError(error);
        this.errorListeners.forEach((cb) => cb(message));
        return Promise.reject(new Error(message));
      }
    );
  }

  private parseError(error: AxiosError): string {
    if (error.response) {
      const data = error.response.data as { error?: string; message?: string };
      return data?.error || data?.message || `请求失败 (${error.response.status})`;
    }
    if (error.request) {
      return '网络连接失败，请检查网络后重试';
    }
    return error.message || '未知错误';
  }

  private notifyLoading() {
    const isLoading = this.loadingCount > 0;
    this.loadingListeners.forEach((cb) => cb(isLoading));
  }

  onLoading(cb: (loading: boolean) => void) {
    this.loadingListeners.add(cb);
    return () => this.loadingListeners.delete(cb);
  }

  onError(cb: (error: string) => void) {
    this.errorListeners.add(cb);
    return () => this.errorListeners.delete(cb);
  }

  isLoading() {
    return this.loadingCount > 0;
  }

  private async request<T>(config: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.request(config);
    return response.data;
  }

  async healthCheck() {
    return this.request<{ status: string; timestamp: string }>({
      method: 'GET',
      url: '/health',
    });
  }

  async getInstruments(query: InstrumentQuery = {}): Promise<PaginatedResponse<Instrument>> {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        params.append(k, String(v));
      }
    });
    return this.request<PaginatedResponse<Instrument>>({
      method: 'GET',
      url: `/instruments?${params.toString()}`,
    });
  }

  async getInstrument(id: string): Promise<Instrument> {
    return this.request<Instrument>({
      method: 'GET',
      url: `/instruments/${id}`,
    });
  }

  async submitInspection(payload: SubmitInspectionPayload): Promise<{ report_id: string; report: InspectionReport }> {
    return this.request<{ report_id: string; report: InspectionReport }>({
      method: 'POST',
      url: '/reports',
      data: payload,
    });
  }

  async getReport(id: string): Promise<InspectionReport> {
    return this.request<InspectionReport>({
      method: 'GET',
      url: `/reports/${id}`,
    });
  }

  async regenerateReport(id: string): Promise<InspectionReport> {
    return this.request<InspectionReport>({
      method: 'POST',
      url: `/reports/${id}/regenerate`,
    });
  }

  async createTransaction(instrumentId: string, buyerId = 'user_demo'): Promise<Transaction> {
    return this.request<Transaction>({
      method: 'POST',
      url: '/transactions',
      data: { instrument_id: instrumentId, buyer_id: buyerId },
    });
  }

  async getTransaction(id: string): Promise<Transaction> {
    return this.request<Transaction>({
      method: 'GET',
      url: `/transactions/${id}`,
    });
  }

  async confirmReceipt(txId: string): Promise<Transaction> {
    return this.request<Transaction>({
      method: 'POST',
      url: `/transactions/${txId}/confirm-receipt`,
    });
  }

  async completeTransaction(txId: string): Promise<Transaction> {
    return this.request<Transaction>({
      method: 'POST',
      url: `/transactions/${txId}/complete`,
    });
  }

  async fileDispute(txId: string, reason: string, description: string, evidenceImages: string[] = []
  ): Promise<Transaction> {
    return this.request<Transaction>({
      method: 'POST',
      url: `/transactions/${txId}/dispute`,
      data: { reason, description, evidence_images: evidenceImages },
    });
  }

  async submitReview(txId: string, role: 'buyer' | 'seller', rating: number, comment: string): Promise<Review> {
    return this.request<Review>({
      method: 'POST',
      url: `/transactions/${txId}/reviews`,
      data: { role, rating, comment },
    });
  }

  async getUser(userId = 'user_demo'): Promise<UserProfile> {
    return this.request<UserProfile>({
      method: 'GET',
      url: `/users/${userId}`,
    });
  }

  async getUserListings(userId = 'user_demo'): Promise<ListResponse<Instrument>> {
    return this.request<ListResponse<Instrument>>({
      method: 'GET',
      url: `/users/${userId}/listings`,
    });
  }

  async getUserPurchases(userId = 'user_demo'): Promise<ListResponse<Transaction>> {
    return this.request<ListResponse<Transaction>>({
      method: 'GET',
      url: `/users/${userId}/purchases`,
    });
  }

  async getPendingReviews(userId = 'user_demo'): Promise<ListResponse<Transaction>> {
    return this.request<ListResponse<Transaction>>({
      method: 'GET',
      url: `/users/${userId}/pending-reviews`,
    });
  }

  async getUserReports(userId = 'user_demo'): Promise<ListResponse<InspectionReport>> {
    return this.request<ListResponse<InspectionReport>>({
      method: 'GET',
      url: `/users/${userId}/reports`,
    });
  }

  async getMetaTypes(): Promise<MetaOption[]> {
    return this.request<MetaOption[]>({
      method: 'GET',
      url: '/meta/types',
    });
  }

  async getMetaGrades(): Promise<MetaOption[]> {
    return this.request<MetaOption[]>({
      method: 'GET',
      url: '/meta/grades',
    });
  }

  async getMetaParts(): Promise<MetaOption[]> {
    return this.request<MetaOption[]>({
      method: 'GET',
      url: '/meta/parts',
    });
  }

  async getMetaAngles(): Promise<MetaOption[]> {
    return this.request<MetaOption[]>({
      method: 'GET',
      url: '/meta/angles',
    });
  }
}

export const api = new ApiClient();
export default api;
