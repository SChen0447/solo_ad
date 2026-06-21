interface ScentNote {
  id: string;
  name: string;
  type: 'top' | 'middle' | 'base';
  ratio: number;
}

interface Formula {
  id: string;
  name: string;
  author: string;
  avatar: string;
  notes: ScentNote[];
  createdAt: string;
}

interface Comment {
  id: string;
  author: string;
  avatar: string;
  content: string;
  createdAt: string;
}

interface Post {
  id: string;
  formulaId: string;
  formula: Formula;
  likes: number;
  liked: boolean;
  comments: Comment[];
  createdAt: string;
}

const formulas = new Map<string, Formula>();
const posts = new Map<string, Post>();

let formulaIdCounter = 1;
let postIdCounter = 1;
let commentIdCounter = 1;

function nextFormulaId(): string {
  return `f${formulaIdCounter++}`;
}

function nextPostId(): string {
  return `p${postIdCounter++}`;
}

function nextCommentId(): string {
  return `c${commentIdCounter++}`;
}

const seedFormulas: Omit<Formula, 'id' | 'createdAt'>[] = [
  {
    name: '清晨花园',
    author: '林小雅',
    avatar: 'https://picsum.photos/seed/user1/40/40',
    notes: [
      { id: 'sn1', name: '柑橘', type: 'top', ratio: 3 },
      { id: 'sn2', name: '薰衣草', type: 'middle', ratio: 4 },
      { id: 'sn3', name: '檀香', type: 'base', ratio: 3 },
    ],
  },
  {
    name: '月夜幽兰',
    author: '陈墨然',
    avatar: 'https://picsum.photos/seed/user2/40/40',
    notes: [
      { id: 'sn4', name: '佛手柑', type: 'top', ratio: 2 },
      { id: 'sn5', name: '茉莉', type: 'middle', ratio: 5 },
      { id: 'sn6', name: '雪松', type: 'base', ratio: 3 },
    ],
  },
  {
    name: '秋日暖阳',
    author: '王诗涵',
    avatar: 'https://picsum.photos/seed/user3/40/40',
    notes: [
      { id: 'sn7', name: '柑橘', type: 'top', ratio: 4 },
      { id: 'sn8', name: '玫瑰', type: 'middle', ratio: 3 },
      { id: 'sn9', name: '琥珀', type: 'base', ratio: 3 },
    ],
  },
  {
    name: '山间清风',
    author: '赵一鸣',
    avatar: 'https://picsum.photos/seed/user4/40/40',
    notes: [
      { id: 'sn10', name: '佛手柑', type: 'top', ratio: 3 },
      { id: 'sn11', name: '薰衣草', type: 'middle', ratio: 3 },
      { id: 'sn12', name: '雪松', type: 'base', ratio: 4 },
    ],
  },
  {
    name: '花语心愿',
    author: '苏晓晴',
    avatar: 'https://picsum.photos/seed/user5/40/40',
    notes: [
      { id: 'sn13', name: '柑橘', type: 'top', ratio: 2 },
      { id: 'sn14', name: '玫瑰', type: 'middle', ratio: 4 },
      { id: 'sn15', name: '茉莉', type: 'middle', ratio: 2 },
      { id: 'sn16', name: '檀香', type: 'base', ratio: 2 },
    ],
  },
];

function seedData(): void {
  const createdFormulas: Formula[] = [];

  for (const data of seedFormulas) {
    const formula: Formula = {
      ...data,
      id: nextFormulaId(),
      createdAt: new Date().toISOString(),
    };
    formulas.set(formula.id, formula);
    createdFormulas.push(formula);
  }

  const seedComments: { author: string; avatar: string; content: string }[][] = [
    [
      { author: '陈墨然', avatar: 'https://picsum.photos/seed/user2/40/40', content: '这个配方太清新了，非常喜欢！' },
      { author: '王诗涵', avatar: 'https://picsum.photos/seed/user3/40/40', content: '檀香的尾调很舒服' },
    ],
    [
      { author: '林小雅', avatar: 'https://picsum.photos/seed/user1/40/40', content: '茉莉和雪松的搭配很独特' },
    ],
    [
      { author: '赵一鸣', avatar: 'https://picsum.photos/seed/user4/40/40', content: '秋天用这个太合适了' },
      { author: '苏晓晴', avatar: 'https://picsum.photos/seed/user5/40/40', content: '琥珀的温暖感很棒' },
      { author: '林小雅', avatar: 'https://picsum.photos/seed/user1/40/40', content: '想要试试看！' },
    ],
    [
      { author: '苏晓晴', avatar: 'https://picsum.photos/seed/user5/40/40', content: '佛手柑和雪松的组合好清爽' },
    ],
    [
      { author: '陈墨然', avatar: 'https://picsum.photos/seed/user2/40/40', content: '玫瑰和茉莉双中调很浪漫' },
      { author: '王诗涵', avatar: 'https://picsum.photos/seed/user3/40/40', content: '适合约会的香气' },
    ],
  ];

  const likeCounts = [12, 8, 25, 6, 18];

  for (let i = 0; i < createdFormulas.length; i++) {
    const formula = createdFormulas[i];
    const comments: Comment[] = (seedComments[i] || []).map((c) => ({
      ...c,
      id: nextCommentId(),
      createdAt: new Date(Date.now() - Math.random() * 86400000 * 3).toISOString(),
    }));

    const post: Post = {
      id: nextPostId(),
      formulaId: formula.id,
      formula,
      likes: likeCounts[i],
      liked: false,
      comments,
      createdAt: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString(),
    };
    posts.set(post.id, post);
  }
}

seedData();

export function getAllFormulas(): Formula[] {
  return Array.from(formulas.values());
}

export function getFormula(id: string): Formula | undefined {
  return formulas.get(id);
}

export function createFormula(data: Omit<Formula, 'id' | 'createdAt'>): Formula {
  const formula: Formula = {
    ...data,
    id: nextFormulaId(),
    createdAt: new Date().toISOString(),
  };
  formulas.set(formula.id, formula);
  return formula;
}

export function updateFormula(id: string, data: Partial<Formula>): Formula | undefined {
  const formula = formulas.get(id);
  if (!formula) return undefined;
  const updated = { ...formula, ...data, id: formula.id, createdAt: formula.createdAt };
  formulas.set(id, updated);
  return updated;
}

export function deleteFormula(id: string): boolean {
  return formulas.delete(id);
}

export function getAllPosts(): Post[] {
  return Array.from(posts.values());
}

export function getPost(id: string): Post | undefined {
  return posts.get(id);
}

export function createPost(data: { formulaId: string }): Post {
  const formula = formulas.get(data.formulaId);
  if (!formula) {
    throw new Error(`Formula ${data.formulaId} not found`);
  }
  const post: Post = {
    id: nextPostId(),
    formulaId: data.formulaId,
    formula,
    likes: 0,
    liked: false,
    comments: [],
    createdAt: new Date().toISOString(),
  };
  posts.set(post.id, post);
  return post;
}

export function toggleLike(postId: string): { likes: number; liked: boolean } {
  const post = posts.get(postId);
  if (!post) throw new Error(`Post ${postId} not found`);
  post.liked = !post.liked;
  post.likes += post.liked ? 1 : -1;
  return { likes: post.likes, liked: post.liked };
}

export function addComment(
  postId: string,
  data: { author: string; avatar: string; content: string }
): Comment | undefined {
  const post = posts.get(postId);
  if (!post) return undefined;
  const comment: Comment = {
    id: nextCommentId(),
    ...data,
    createdAt: new Date().toISOString(),
  };
  post.comments.push(comment);
  return comment;
}
