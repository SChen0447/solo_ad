import { v4 as uuidv4 } from 'uuid'

export type BookCategory = '文学' | '科技' | '历史' | '艺术' | '生活'
export type BookStatus = 'available' | 'borrowed'
export type BorrowType = 'borrow' | 'return'

export interface Book {
  id: string
  title: string
  author: string
  isbn: string
  category: BookCategory
  description: string
  status: BookStatus
  borrowCount: number
  lastBorrower: string
  coverColor: string
}

export interface BorrowRecord {
  id: string
  bookId: string
  borrower: string
  type: BorrowType
  date: string
}

export interface Review {
  id: string
  bookId: string
  user: string
  rating: number
  comment: string
  date: string
}

const categoryColors: Record<BookCategory, string> = {
  '文学': '#3182ce',
  '科技': '#38a169',
  '历史': '#dd6b20',
  '艺术': '#805ad5',
  '生活': '#d53f8c',
}

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

const initialBooks: Book[] = [
  { id: uuidv4(), title: '百年孤独', author: '加西亚·马尔克斯', isbn: '978-7-5442-1', category: '文学', description: '魔幻现实主义文学的代表作，讲述了布恩迪亚家族七代人的传奇故事，以及加勒比海沿岸小镇马孔多的百年兴衰。', status: 'available', borrowCount: 8, lastBorrower: '王小明', coverColor: categoryColors['文学'] },
  { id: uuidv4(), title: '三体', author: '刘慈欣', isbn: '978-7-5366-9', category: '科技', description: '中国科幻文学的里程碑之作，以文化大革命为背景，讲述地球文明与三体文明之间的生死博弈与宇宙级别的对抗。', status: 'borrowed', borrowCount: 12, lastBorrower: '李婷', coverColor: categoryColors['科技'] },
  { id: uuidv4(), title: '人类简史', author: '尤瓦尔·赫拉利', isbn: '978-7-5086-4', category: '历史', description: '从十万年前有生命迹象开始到21世纪资本、科技交织的人类发展史，重新审视我们自以为已知的人类历史。', status: 'available', borrowCount: 6, lastBorrower: '张伟', coverColor: categoryColors['历史'] },
  { id: uuidv4(), title: '追风筝的人', author: '卡勒德·胡赛尼', isbn: '978-7-2080-6', category: '文学', description: '一个关于友谊、背叛与救赎的故事，以阿富汗战乱为背景，讲述两个男孩之间跨越二十年的深厚情谊。', status: 'available', borrowCount: 5, lastBorrower: '赵雪', coverColor: categoryColors['文学'] },
  { id: uuidv4(), title: '算法导论', author: 'Thomas H. Cormen', isbn: '978-7-1113-2', category: '科技', description: '计算机科学领域最经典的算法教材之一，全面介绍了算法设计与分析的核心概念和方法。', status: 'borrowed', borrowCount: 9, lastBorrower: '刘洋', coverColor: categoryColors['科技'] },
  { id: uuidv4(), title: '明朝那些事儿', author: '当年明月', isbn: '978-7-2130-4', category: '历史', description: '以通俗幽默的笔法讲述明朝三百年间的历史故事，从朱元璋建国到崇祯亡国的全景式叙事。', status: 'available', borrowCount: 7, lastBorrower: '陈思', coverColor: categoryColors['历史'] },
  { id: uuidv4(), title: '艺术的故事', author: '贡布里希', isbn: '978-7-5633-7', category: '艺术', description: '西方艺术史的入门经典，以生动流畅的语言带领读者从史前洞穴壁画一直走到当代实验艺术。', status: 'available', borrowCount: 4, lastBorrower: '周琳', coverColor: categoryColors['艺术'] },
  { id: uuidv4(), title: '小王子', author: '圣埃克苏佩里', isbn: '978-7-0200-4', category: '文学', description: '一部写给大人的童话，用小王子的星际旅行探讨爱、责任与人生的真谛，感人至深。', status: 'borrowed', borrowCount: 10, lastBorrower: '孙梅', coverColor: categoryColors['文学'] },
  { id: uuidv4(), title: '深度学习', author: 'Ian Goodfellow', isbn: '978-7-1152-7', category: '科技', description: '人工智能领域的权威教材，系统讲解深度学习的数学基础、核心算法和前沿研究方向。', status: 'available', borrowCount: 3, lastBorrower: '吴刚', coverColor: categoryColors['科技'] },
  { id: uuidv4(), title: '中国书法简史', author: '王镛', isbn: '978-7-8063-5', category: '艺术', description: '全面梳理中国书法从甲骨文到当代书法的发展脉络，图文并茂地展示各时期代表作品。', status: 'available', borrowCount: 2, lastBorrower: '郑华', coverColor: categoryColors['艺术'] },
  { id: uuidv4(), title: '好好吃饭', author: '蔡澜', isbn: '978-7-5447-8', category: '生活', description: '美食家蔡澜的饮食随笔集，以轻松幽默的笔调分享世界各地的美食见闻与人生感悟。', status: 'available', borrowCount: 3, lastBorrower: '何丽', coverColor: categoryColors['生活'] },
  { id: uuidv4(), title: '极简生活', author: '近藤麻理惠', isbn: '978-7-5104-2', category: '生活', description: '风靡全球的整理收纳指南，用怦然心动的整理法则帮助读者重拾清爽有序的生活空间。', status: 'borrowed', borrowCount: 5, lastBorrower: '马芳', coverColor: categoryColors['生活'] },
]

const initialBorrowRecords: BorrowRecord[] = [
  ...initialBooks.slice(0, 3).flatMap((book, bi) => [
    { id: uuidv4(), bookId: book.id, borrower: '王小明', type: 'borrow' as BorrowType, date: daysAgo(30 + bi * 5) },
    { id: uuidv4(), bookId: book.id, borrower: '王小明', type: 'return' as BorrowType, date: daysAgo(25 + bi * 5) },
    { id: uuidv4(), bookId: book.id, borrower: '李婷', type: 'borrow' as BorrowType, date: daysAgo(20 + bi * 3) },
    { id: uuidv4(), bookId: book.id, borrower: '李婷', type: 'return' as BorrowType, date: daysAgo(15 + bi * 3) },
  ]),
  ...initialBooks.slice(3, 6).flatMap((book, bi) => [
    { id: uuidv4(), bookId: book.id, borrower: '张伟', type: 'borrow' as BorrowType, date: daysAgo(28 + bi * 4) },
    { id: uuidv4(), bookId: book.id, borrower: '张伟', type: 'return' as BorrowType, date: daysAgo(22 + bi * 4) },
    { id: uuidv4(), bookId: book.id, borrower: '赵雪', type: 'borrow' as BorrowType, date: daysAgo(14 + bi * 2) },
  ]),
  ...initialBooks.slice(6, 9).flatMap((book, bi) => [
    { id: uuidv4(), bookId: book.id, borrower: '周琳', type: 'borrow' as BorrowType, date: daysAgo(26 + bi * 3) },
    { id: uuidv4(), bookId: book.id, borrower: '周琳', type: 'return' as BorrowType, date: daysAgo(20 + bi * 3) },
  ]),
  ...initialBooks.slice(9, 12).flatMap((book, bi) => [
    { id: uuidv4(), bookId: book.id, borrower: '何丽', type: 'borrow' as BorrowType, date: daysAgo(18 + bi * 2) },
    { id: uuidv4(), bookId: book.id, borrower: '何丽', type: 'return' as BorrowType, date: daysAgo(12 + bi * 2) },
    { id: uuidv4(), bookId: book.id, borrower: '马芳', type: 'borrow' as BorrowType, date: daysAgo(5 + bi) },
  ]),
]

const initialReviews: Review[] = [
  { id: uuidv4(), bookId: initialBooks[0].id, user: '阅读达人', rating: 5, comment: '魔幻现实主义的巅峰之作，每次重读都有新的感悟。', date: daysAgo(3) },
  { id: uuidv4(), bookId: initialBooks[0].id, user: '书虫小李', rating: 4, comment: '人物众多需要画族谱才能理清，但故事非常精彩。', date: daysAgo(10) },
  { id: uuidv4(), bookId: initialBooks[0].id, user: '文艺青年', rating: 5, comment: '马尔克斯的文字有种魔力，让人沉醉其中无法自拔。', date: daysAgo(15) },
  { id: uuidv4(), bookId: initialBooks[1].id, user: '科幻迷', rating: 5, comment: '中国科幻的骄傲！黑暗森林法则令人不寒而栗。', date: daysAgo(2) },
  { id: uuidv4(), bookId: initialBooks[1].id, user: '理工男', rating: 4, comment: '硬科幻的典范，物理设定非常严谨，格局宏大。', date: daysAgo(7) },
  { id: uuidv4(), bookId: initialBooks[1].id, user: '新读者', rating: 5, comment: '一口气读完三部曲，完全被三体世界震撼了！', date: daysAgo(12) },
  { id: uuidv4(), bookId: initialBooks[2].id, user: '历史爱好者', rating: 4, comment: '视角独特，用大历史的维度重新审视人类发展。', date: daysAgo(5) },
  { id: uuidv4(), bookId: initialBooks[2].id, user: '思考者', rating: 5, comment: '改变了我的世界观，原来历史可以这样理解。', date: daysAgo(9) },
  { id: uuidv4(), bookId: initialBooks[3].id, user: '感性读者', rating: 5, comment: '为你千千万万遍——这句话让我泪流满面。', date: daysAgo(4) },
  { id: uuidv4(), bookId: initialBooks[3].id, user: '和平主义者', rating: 4, comment: '战乱中的人性光辉与阴暗，让人深思。', date: daysAgo(11) },
  { id: uuidv4(), bookId: initialBooks[4].id, user: '程序员小王', rating: 4, comment: '算法圣经，内容扎实，适合系统学习。', date: daysAgo(6) },
  { id: uuidv4(), bookId: initialBooks[4].id, user: 'CS学生', rating: 3, comment: '内容很好但有些章节太难了，需要反复阅读。', date: daysAgo(14) },
  { id: uuidv4(), bookId: initialBooks[5].id, user: '明史迷', rating: 5, comment: '用最接地气的方式讲最硬核的历史，太有趣了！', date: daysAgo(3) },
  { id: uuidv4(), bookId: initialBooks[5].id, user: '通勤读者', rating: 4, comment: '地铁上最好的读物，轻松又长知识。', date: daysAgo(8) },
  { id: uuidv4(), bookId: initialBooks[6].id, user: '艺术生', rating: 5, comment: '入门西方艺术史的最佳选择，深入浅出。', date: daysAgo(7) },
  { id: uuidv4(), bookId: initialBooks[6].id, user: '美术馆常客', rating: 4, comment: '贡布里希的文笔优雅，读起来像在听故事。', date: daysAgo(13) },
  { id: uuidv4(), bookId: initialBooks[7].id, user: '童话爱好者', rating: 5, comment: '每个大人都曾经是小孩子，只是很少有人记得。', date: daysAgo(1) },
  { id: uuidv4(), bookId: initialBooks[7].id, user: '睡前读者', rating: 5, comment: '简单的故事蕴含深刻的人生哲理，百读不厌。', date: daysAgo(6) },
  { id: uuidv4(), bookId: initialBooks[8].id, user: 'AI研究员', rating: 4, comment: '深度学习领域的权威参考，数学推导很详细。', date: daysAgo(4) },
  { id: uuidv4(), bookId: initialBooks[8].id, user: '初学者', rating: 3, comment: '需要较好的数学基础才能读懂，适合进阶学习。', date: daysAgo(10) },
  { id: uuidv4(), bookId: initialBooks[9].id, user: '书法爱好者', rating: 4, comment: '图文并茂，适合初学者了解书法发展脉络。', date: daysAgo(5) },
  { id: uuidv4(), bookId: initialBooks[9].id, user: '文化探索者', rating: 4, comment: '作为入门读物很不错，每种字体都有代表作品展示。', date: daysAgo(12) },
  { id: uuidv4(), bookId: initialBooks[10].id, user: '吃货', rating: 5, comment: '蔡澜的文字让人看了就想吃，太有感染力了！', date: daysAgo(3) },
  { id: uuidv4(), bookId: initialBooks[10].id, user: '厨房新手', rating: 4, comment: '不只是美食书，更是一种生活态度的分享。', date: daysAgo(8) },
  { id: uuidv4(), bookId: initialBooks[11].id, user: '整理控', rating: 5, comment: '按照方法整理了整个家，生活品质提升明显！', date: daysAgo(2) },
  { id: uuidv4(), bookId: initialBooks[11].id, user: '极简主义者', rating: 4, comment: '核心理念很好，保留让你心动的东西。', date: daysAgo(7) },
]

export const store = {
  books: initialBooks as Book[],
  borrowRecords: initialBorrowRecords as BorrowRecord[],
  reviews: initialReviews as Review[],
  adminPassword: '123456',
  authToken: 'library-admin-token-2024',
}
