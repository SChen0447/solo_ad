import { Work, Review, CustomOrderData, ReviewData } from '../types';

export const fetchWorks = async (): Promise<Work[]> => {
  const response = await fetch('/api/works');
  if (!response.ok) {
    throw new Error('获取作品列表失败');
  }
  return response.json();
};

export const fetchWorkById = async (id: string): Promise<Work> => {
  const response = await fetch(`/api/works/${id}`);
  if (!response.ok) {
    throw new Error('获取作品详情失败');
  }
  return response.json();
};

export const submitCustomOrder = async (data: CustomOrderData) => {
  const response = await fetch('/api/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('提交定制订单失败');
  }
  return response.json();
};

export const fetchReviews = async (workId: string): Promise<Review[]> => {
  const response = await fetch(`/api/works/${workId}/reviews`);
  if (!response.ok) {
    throw new Error('获取评价列表失败');
  }
  return response.json();
};

export const submitReview = async (reviewData: ReviewData): Promise<Review> => {
  const formData = new FormData();
  formData.append('workId', reviewData.workId);
  formData.append('userName', reviewData.userName);
  formData.append('rating', String(reviewData.rating));
  formData.append('comment', reviewData.comment);
  reviewData.images.forEach((image) => {
    formData.append('images', image);
  });

  const response = await fetch(`/api/works/${reviewData.workId}/reviews`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('提交评价失败');
  }
  return response.json();
};
