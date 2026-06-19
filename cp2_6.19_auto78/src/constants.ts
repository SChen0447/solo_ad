export const CATEGORY_COLOR_MAP: Record<string, string> = {
  '文学': 'category-文学',
  '科技': 'category-科技',
  '历史': 'category-历史',
  '艺术': 'category-艺术',
  '哲学': 'category-哲学',
  '经济': 'category-经济',
};

export const getCategoryClass = (category: string): string => {
  return CATEGORY_COLOR_MAP[category] || '';
};

export const CATEGORIES = ['文学', '科技', '历史', '艺术', '哲学', '经济'];
