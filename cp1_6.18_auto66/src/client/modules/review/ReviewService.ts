import { apiRequest } from '../../api';
import { Review, CreateReviewRequest } from '../../types';

export const ReviewService = {
  async createReview(data: CreateReviewRequest): Promise<Review> {
    return apiRequest<Review>('/review', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async getProductReviews(productId: string): Promise<Review[]> {
    return apiRequest<Review[]>(`/review/product/${productId}`);
  },

  async getUserReviews(userId: string): Promise<Review[]> {
    return apiRequest<Review[]>(`/review/user/${userId}`);
  }
};
