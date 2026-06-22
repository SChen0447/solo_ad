export interface Book {
  id: string;
  title: string;
  author: string;
  totalPages: number;
  cover: string;
  currentPage: number;
}

export const initialBooks: Book[] = [
  {
    id: '1',
    title: '百年孤独',
    author: '加西亚·马尔克斯',
    totalPages: 360,
    cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=vintage%20book%20cover%20for%20One%20Hundred%20Years%20of%20Solitude%2C%20magical%20realism%20style%2C%20vibrant%20tropical%20colors%2C%20mysterious%20jungle%20and%20butterflies&image_size=portrait_4_3',
    currentPage: 120,
  },
  {
    id: '2',
    title: '人类简史',
    author: '尤瓦尔·赫拉利',
    totalPages: 440,
    cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=book%20cover%20for%20Sapiens%20A%20Brief%20History%20of%20Humankind%2C%20modern%20minimalist%20style%2C%20human%20evolution%20silhouette%2C%20warm%20earth%20tones&image_size=portrait_4_3',
    currentPage: 0,
  },
  {
    id: '3',
    title: '小王子',
    author: '安托万·圣埃克苏佩里',
    totalPages: 96,
    cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=book%20cover%20for%20The%20Little%20Prince%2C%20watercolor%20illustration%20style%2C%20starlit%20night%20sky%2C%20small%20planet%20with%20rose%2C%20dreamy%20blue%20and%20gold&image_size=portrait_4_3',
    currentPage: 96,
  },
  {
    id: '4',
    title: '三体',
    author: '刘慈欣',
    totalPages: 302,
    cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=book%20cover%20for%20The%20Three-Body%20Problem%2C%20sci-fi%20style%2C%20three%20suns%20in%20sky%2C%20dark%20cosmic%20background%2C%20cold%20blue%20and%20red%20palette&image_size=portrait_4_3',
    currentPage: 45,
  },
  {
    id: '5',
    title: '月亮与六便士',
    author: '毛姆',
    totalPages: 280,
    cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=book%20cover%20for%20The%20Moon%20and%20Sixpence%2C%20impressionist%20painting%20style%2C%20Tahiti%20landscape%2C%20warm%20sunset%20colors%2C%20artistic%20brushstrokes&image_size=portrait_4_3',
    currentPage: 200,
  },
];
