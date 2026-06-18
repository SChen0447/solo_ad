import { v4 as uuidv4 } from 'uuid';
import type { Book } from '@/types';

const bookTemplates = [
  { title: '百年孤独', author: '加西亚·马尔克斯', price: 59.8, publisher: '南海出版公司', publishYear: 2011, genre: '文学' },
  { title: '活着', author: '余华', price: 35.0, publisher: '作家出版社', publishYear: 2012, genre: '文学' },
  { title: '三体', author: '刘慈欣', price: 68.0, publisher: '重庆出版社', publishYear: 2008, genre: '科幻' },
  { title: '围城', author: '钱钟书', price: 42.0, publisher: '人民文学出版社', publishYear: 1991, genre: '文学' },
  { title: '红楼梦', author: '曹雪芹', price: 88.0, publisher: '人民文学出版社', publishYear: 2008, genre: '古典' },
  { title: '平凡的世界', author: '路遥', price: 78.0, publisher: '北京十月文艺出版社', publishYear: 2012, genre: '文学' },
  { title: '小王子', author: '安托万·德·圣-埃克苏佩里', price: 29.8, publisher: '人民文学出版社', publishYear: 2003, genre: '童话' },
  { title: '1984', author: '乔治·奥威尔', price: 38.0, publisher: '上海译文出版社', publishYear: 2011, genre: '科幻' },
  { title: '人类简史', author: '尤瓦尔·赫拉利', price: 68.0, publisher: '中信出版社', publishYear: 2014, genre: '历史' },
  { title: '未来简史', author: '尤瓦尔·赫拉利', price: 68.0, publisher: '中信出版社', publishYear: 2017, genre: '历史' },
  { title: '明朝那些事儿', author: '当年明月', price: 198.0, publisher: '浙江人民出版社', publishYear: 2011, genre: '历史' },
  { title: '万历十五年', author: '黄仁宇', price: 36.0, publisher: '中华书局', publishYear: 2014, genre: '历史' },
  { title: '追风筝的人', author: '卡勒德·胡赛尼', price: 45.0, publisher: '上海人民出版社', publishYear: 2006, genre: '文学' },
  { title: '白夜行', author: '东野圭吾', price: 42.0, publisher: '南海出版公司', publishYear: 2008, genre: '推理' },
  { title: '嫌疑人X的献身', author: '东野圭吾', price: 35.0, publisher: '南海出版公司', publishYear: 2008, genre: '推理' },
  { title: '解忧杂货店', author: '东野圭吾', price: 39.5, publisher: '南海出版公司', publishYear: 2014, genre: '文学' },
  { title: '挪威的森林', author: '村上春树', price: 36.0, publisher: '上海译文出版社', publishYear: 2011, genre: '文学' },
  { title: '海边的卡夫卡', author: '村上春树', price: 45.0, publisher: '上海译文出版社', publishYear: 2003, genre: '文学' },
  { title: '不能承受的生命之轻', author: '米兰·昆德拉', price: 39.0, publisher: '上海译文出版社', publishYear: 2003, genre: '文学' },
  { title: '飘', author: '玛格丽特·米切尔', price: 58.0, publisher: '上海译文出版社', publishYear: 2005, genre: '文学' },
  { title: '悲惨世界', author: '维克多·雨果', price: 68.0, publisher: '人民文学出版社', publishYear: 2003, genre: '文学' },
  { title: '巴黎圣母院', author: '维克多·雨果', price: 38.0, publisher: '人民文学出版社', publishYear: 2002, genre: '文学' },
  { title: '简·爱', author: '夏洛蒂·勃朗特', price: 32.0, publisher: '人民文学出版社', publishYear: 2002, genre: '文学' },
  { title: '傲慢与偏见', author: '简·奥斯汀', price: 29.0, publisher: '人民文学出版社', publishYear: 2003, genre: '文学' },
  { title: '了不起的盖茨比', author: '菲茨杰拉德', price: 28.0, publisher: '上海译文出版社', publishYear: 2006, genre: '文学' },
  { title: '老人与海', author: '欧内斯特·海明威', price: 25.0, publisher: '上海译文出版社', publishYear: 2006, genre: '文学' },
  { title: '瓦尔登湖', author: '梭罗', price: 35.0, publisher: '上海译文出版社', publishYear: 2006, genre: '散文' },
  { title: '梦的解析', author: '弗洛伊德', price: 48.0, publisher: '商务印书馆', publishYear: 2011, genre: '心理' },
  { title: '自卑与超越', author: '阿尔弗雷德·阿德勒', price: 38.0, publisher: '浙江文艺出版社', publishYear: 2016, genre: '心理' },
  { title: '思考，快与慢', author: '丹尼尔·卡尼曼', price: 58.0, publisher: '中信出版社', publishYear: 2012, genre: '心理' },
  { title: '乌合之众', author: '古斯塔夫·勒庞', price: 35.0, publisher: '中央编译出版社', publishYear: 2015, genre: '心理' },
  { title: '经济学原理', author: '曼昆', price: 128.0, publisher: '北京大学出版社', publishYear: 2015, genre: '经济' },
  { title: '国富论', author: '亚当·斯密', price: 68.0, publisher: '商务印书馆', publishYear: 2014, genre: '经济' },
  { title: '资本论', author: '卡尔·马克思', price: 98.0, publisher: '人民出版社', publishYear: 2008, genre: '经济' },
  { title: '社会契约论', author: '卢梭', price: 28.0, publisher: '商务印书馆', publishYear: 2011, genre: '哲学' },
  { title: '存在与时间', author: '马丁·海德格尔', price: 58.0, publisher: '生活·读书·新知三联书店', publishYear: 2006, genre: '哲学' },
  { title: '纯粹理性批判', author: '康德', price: 48.0, publisher: '人民出版社', publishYear: 2011, genre: '哲学' },
  { title: '论语', author: '孔子', price: 32.0, publisher: '中华书局', publishYear: 2016, genre: '古典' },
  { title: '道德经', author: '老子', price: 28.0, publisher: '中华书局', publishYear: 2012, genre: '古典' },
  { title: '庄子', author: '庄子', price: 38.0, publisher: '中华书局', publishYear: 2015, genre: '古典' },
  { title: '孙子兵法', author: '孙武', price: 25.0, publisher: '中华书局', publishYear: 2011, genre: '古典' },
  { title: '史记', author: '司马迁', price: 128.0, publisher: '中华书局', publishYear: 2013, genre: '古典' },
  { title: '资治通鉴', author: '司马光', price: 298.0, publisher: '中华书局', publishYear: 2012, genre: '古典' },
  { title: '中国哲学史', author: '冯友兰', price: 88.0, publisher: '华东师范大学出版社', publishYear: 2011, genre: '哲学' },
  { title: '乡土中国', author: '费孝通', price: 32.0, publisher: '上海人民出版社', publishYear: 2013, genre: '社会' },
  { title: '枪炮、病菌与钢铁', author: '贾雷德·戴蒙德', price: 55.0, publisher: '上海译文出版社', publishYear: 2014, genre: '历史' },
  { title: '浪潮之巅', author: '吴军', price: 68.0, publisher: '人民邮电出版社', publishYear: 2019, genre: '科技' },
  { title: '数学之美', author: '吴军', price: 49.0, publisher: '人民邮电出版社', publishYear: 2014, genre: '科技' },
  { title: '深度学习', author: '伊恩·古德费洛', price: 168.0, publisher: '人民邮电出版社', publishYear: 2017, genre: '科技' },
  { title: '算法导论', author: '托马斯·科尔曼', price: 128.0, publisher: '机械工业出版社', publishYear: 2013, genre: '科技' },
];

const generateISBN = (): string => {
  const prefix = '978';
  const parts = Array.from({ length: 10 }, () => Math.floor(Math.random() * 10));
  return `${prefix}-${parts.slice(0, 2).join('')}-${parts.slice(2, 6).join('')}-${parts.slice(6, 9).join('')}-${parts[9]}`;
};

const generateDescription = (title: string, author: string, genre: string): string => {
  const descriptions = [
    `《${title}》是${author}的代表作，被誉为${genre}领域的经典之作。`,
    `这部作品展现了${author}深厚的文学功底和独特的叙事风格。`,
    `自出版以来，《${title}》深受读者喜爱，被翻译成多国语言。`,
    `在这部作品中，${author}以独特的视角探讨了人性与社会的复杂关系。`,
    `《${title}》不仅是一部优秀的${genre}作品，更是一面映照时代的镜子。`,
  ];
  return descriptions[Math.floor(Math.random() * descriptions.length)] + ` 本书内容丰富，思想深刻，值得细细品味。无论是专业研究者还是普通读者，都能从中获得启发。全书结构严谨，行文流畅，是不可多得的佳作。`;
};

const generateContents = (): string[] => {
  return [
    '第一章 开篇引言',
    '第二章 核心概念',
    '第三章 深入探讨',
    '第四章 案例分析',
    '第五章 总结与展望',
  ];
};

const getCoverImageUrl = (index: number): string => {
  const colors = ['8d6e63', 'a5d6a7', 'b39ddb', 'ffd54f', '81c784', 'bdbdbd'];
  const color = colors[index % colors.length];
  return `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=book%20cover%20minimalist%20design%20warm%20colors&image_size=square_hd`;
};

const generateStockStatus = (stock: number): Book['status'] => {
  if (stock === 0) return 'out-of-stock';
  if (stock <= 3) return 'low-stock';
  return 'in-stock';
};

export const generateMockBooks = (count = 50): Book[] => {
  return bookTemplates.slice(0, count).map((template, index) => {
    const stock = Math.floor(Math.random() * 15);
    return {
      id: uuidv4(),
      title: template.title,
      author: template.author,
      price: Math.round(template.price * 100) / 100,
      isbn: generateISBN(),
      publisher: template.publisher,
      publishYear: template.publishYear + Math.floor(Math.random() * 5),
      description: generateDescription(template.title, template.author, template.genre),
      contents: generateContents(),
      coverImage: getCoverImageUrl(index),
      stock,
      status: generateStockStatus(stock),
    };
  });
};

export const mockBooks: Book[] = generateMockBooks(50);
