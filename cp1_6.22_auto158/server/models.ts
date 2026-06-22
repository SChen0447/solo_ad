export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  date: string;
  note: string;
}

export interface Budget {
  id: string;
  category: string;
  limit: number;
  month: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
}

export const EXPENSE_CATEGORIES = [
  { key: '餐饮', emoji: '🍽️' },
  { key: '交通', emoji: '🚗' },
  { key: '购物', emoji: '🛍️' },
  { key: '娱乐', emoji: '🎮' },
  { key: '居住', emoji: '🏠' },
  { key: '医疗', emoji: '💊' },
  { key: '教育', emoji: '📚' },
  { key: '其他', emoji: '📦' },
];

export const INCOME_CATEGORIES = [
  { key: '工资', emoji: '💰' },
  { key: '奖金', emoji: '🎁' },
  { key: '投资', emoji: '📈' },
  { key: '兼职', emoji: '💼' },
  { key: '其他', emoji: '📦' },
];

const now = new Date();
const year = now.getFullYear();
const month = now.getMonth();

const formatDate = (d: Date) => d.toISOString().split('T')[0];

export const mockUser: User = {
  id: 'user-001',
  name: '张三',
  email: 'zhangsan@example.com',
};

export const mockTransactions: Transaction[] = [
  { id: 't1', type: 'income', amount: 15000, category: '工资', date: formatDate(new Date(year, month, 1)), note: '月度工资' },
  { id: 't2', type: 'expense', amount: 2500, category: '居住', date: formatDate(new Date(year, month, 2)), note: '房租' },
  { id: 't3', type: 'expense', amount: 800, category: '餐饮', date: formatDate(new Date(year, month, 3)), note: '超市采购' },
  { id: 't4', type: 'expense', amount: 300, category: '交通', date: formatDate(new Date(year, month, 4)), note: '加油' },
  { id: 't5', type: 'expense', amount: 1200, category: '购物', date: formatDate(new Date(year, month, 5)), note: '衣服' },
  { id: 't6', type: 'expense', amount: 150, category: '娱乐', date: formatDate(new Date(year, month, 6)), note: '电影' },
  { id: 't7', type: 'expense', amount: 200, category: '餐饮', date: formatDate(new Date(year, month, 7)), note: '外卖' },
  { id: 't8', type: 'income', amount: 3000, category: '奖金', date: formatDate(new Date(year, month, 8)), note: '项目奖金' },
  { id: 't9', type: 'expense', amount: 500, category: '医疗', date: formatDate(new Date(year, month, 9)), note: '体检' },
  { id: 't10', type: 'expense', amount: 400, category: '教育', date: formatDate(new Date(year, month, 10)), note: '书籍' },
  { id: 't11', type: 'expense', amount: 600, category: '餐饮', date: formatDate(new Date(year, month, 11)), note: '聚餐' },
  { id: 't12', type: 'expense', amount: 250, category: '交通', date: formatDate(new Date(year, month, 12)), note: '地铁充值' },
  { id: 't13', type: 'expense', amount: 1800, category: '购物', date: formatDate(new Date(year, month - 1, 15)), note: '家电' },
  { id: 't14', type: 'income', amount: 15000, category: '工资', date: formatDate(new Date(year, month - 1, 1)), note: '上月工资' },
  { id: 't15', type: 'expense', amount: 2500, category: '居住', date: formatDate(new Date(year, month - 1, 2)), note: '房租' },
  { id: 't16', type: 'expense', amount: 950, category: '餐饮', date: formatDate(new Date(year, month - 1, 5)), note: '餐饮消费' },
  { id: 't17', type: 'expense', amount: 350, category: '交通', date: formatDate(new Date(year, month - 1, 8)), note: '打车' },
  { id: 't18', type: 'income', amount: 15000, category: '工资', date: formatDate(new Date(year, month - 2, 1)), note: '上上月工资' },
  { id: 't19', type: 'expense', amount: 2500, category: '居住', date: formatDate(new Date(year, month - 2, 2)), note: '房租' },
  { id: 't20', type: 'expense', amount: 700, category: '餐饮', date: formatDate(new Date(year, month - 2, 10)), note: '餐饮消费' },
  { id: 't21', type: 'expense', amount: 1000, category: '购物', date: formatDate(new Date(year, month - 2, 15)), note: '日用品' },
];

export const mockBudgets: Budget[] = EXPENSE_CATEGORIES.map((cat, idx) => ({
  id: `b${idx + 1}`,
  category: cat.key,
  limit: [3000, 1000, 2500, 800, 3000, 1000, 800, 500][idx],
  month: `${year}-${String(month + 1).padStart(2, '0')}`,
}));
