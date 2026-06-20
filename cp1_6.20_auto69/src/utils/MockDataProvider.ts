export interface DataType {
  id: number;
  name: string;
  email: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface FilterConfig {
  keyword: string;
  status: 'all' | 'active' | 'inactive';
  dateStart: string;
  dateEnd: string;
}

export interface SortConfig {
  key: keyof DataType | null;
  direction: 'asc' | 'desc';
}

const firstNames = ['张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十', '郑十一', '冯十二', '陈明', '林华', '黄强', '刘洋', '杨帆', '徐峰', '朱琳', '马超', '胡伟', '郭静'];
const lastNames = ['', '（经理）', '（主管）', '（专员）', '（实习生）', '（助理）', '（工程师）', '（设计师）'];
const domains = ['example.com', 'gmail.com', 'outlook.com', 'qq.com', '163.com', 'hotmail.com', 'icloud.com'];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(start: Date, end: Date): string {
  const time = start.getTime() + Math.random() * (end.getTime() - start.getTime());
  const date = new Date(time);
  return date.toISOString().slice(0, 10);
}

export function getMockData(): Promise<DataType[]> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() < 0.001) {
        reject(new Error('数据加载失败'));
        return;
      }

      const data: DataType[] = [];
      for (let i = 1; i <= 50; i++) {
        const firstName = randomItem(firstNames);
        const lastName = randomItem(lastNames);
        const name = firstName + lastName;
        const emailPrefix = name.replace(/[（）()]/g, '').toLowerCase().replace(/\s/g, '');
        const domain = randomItem(domains);

        data.push({
          id: i,
          name,
          email: `${emailPrefix}${i}@${domain}`,
          status: Math.random() > 0.3 ? 'active' : 'inactive',
          createdAt: randomDate(new Date('2024-01-01'), new Date('2025-12-31'))
        });
      }

      resolve(data);
    }, 800);
  });
}
