export type QuestionType = 'single' | 'multiple' | 'judge';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Question {
  id: string;
  type: QuestionType;
  content: string;
  options?: string[];
  answer: string | string[];
  analysis: string;
  difficulty: Difficulty;
  tags: string[];
  score: number;
}

export interface ExamRule {
  singleCount: number;
  multipleCount: number;
  judgeCount: number;
  easyRatio: number;
  mediumRatio: number;
  hardRatio: number;
}

export interface UserAnswer {
  questionId: string;
  answer: string | string[];
  isCorrect: boolean;
}

export interface ExamResult {
  totalScore: number;
  maxScore: number;
  correctCount: number;
  totalCount: number;
  typeStats: {
    single: { correct: number; total: number; accuracy: number };
    multiple: { correct: number; total: number; accuracy: number };
    judge: { correct: number; total: number; accuracy: number };
  };
  answers: UserAnswer[];
  questions: Question[];
}

let questionBank: Question[] = [
  {
    id: 'q1',
    type: 'single',
    content: 'React 中用于管理组件状态的 Hook 是？',
    options: ['useEffect', 'useState', 'useContext', 'useRef'],
    answer: 'B',
    analysis: 'useState 是 React 中用于在函数组件中添加状态的 Hook，返回一个状态值和更新该状态的函数。',
    difficulty: 'easy',
    tags: ['React', '前端'],
    score: 2,
  },
  {
    id: 'q2',
    type: 'single',
    content: '以下哪个不是 JavaScript 的基本数据类型？',
    options: ['String', 'Number', 'Array', 'Boolean'],
    answer: 'C',
    analysis: 'Array 是引用类型，不是基本数据类型。JavaScript 的基本数据类型包括：String、Number、Boolean、Null、Undefined、Symbol、BigInt。',
    difficulty: 'easy',
    tags: ['JavaScript', '前端'],
    score: 2,
  },
  {
    id: 'q3',
    type: 'single',
    content: 'CSS 中 flex: 1 相当于以下哪个组合？',
    options: ['flex-grow: 1; flex-shrink: 1; flex-basis: 0%', 'flex-grow: 1; flex-shrink: 0; flex-basis: auto', 'flex-grow: 0; flex-shrink: 1; flex-basis: 100%', 'flex-grow: 1; flex-shrink: 1; flex-basis: auto'],
    answer: 'A',
    analysis: 'flex: 1 等同于 flex-grow: 1; flex-shrink: 1; flex-basis: 0%，表示元素可以伸缩，且初始大小为0。',
    difficulty: 'medium',
    tags: ['CSS', '前端'],
    score: 2,
  },
  {
    id: 'q4',
    type: 'single',
    content: 'TypeScript 中 interface 和 type 的主要区别是？',
    options: ['interface 只能定义对象类型', 'type 可以使用联合类型', 'interface 可以声明合并', '以上都对'],
    answer: 'D',
    analysis: 'interface 只能定义对象类型且支持声明合并，type 更灵活可以定义联合类型、交叉类型等。',
    difficulty: 'medium',
    tags: ['TypeScript', '前端'],
    score: 2,
  },
  {
    id: 'q5',
    type: 'single',
    content: 'HTTP 状态码 401 表示？',
    options: ['请求成功', '未授权', '服务器错误', '资源未找到'],
    answer: 'B',
    analysis: '401 Unauthorized 表示请求需要用户认证，即未授权访问。',
    difficulty: 'easy',
    tags: ['网络', 'HTTP'],
    score: 2,
  },
  {
    id: 'q6',
    type: 'single',
    content: 'Vite 的核心特性不包括？',
    options: ['快速冷启动', '即时热更新', '原生 ESM 支持', '内置 TypeScript 编译'],
    answer: 'D',
    analysis: 'Vite 使用 esbuild 进行预构建，但不进行完整的 TypeScript 类型检查，类型检查通常由 tsc 在构建时完成。',
    difficulty: 'hard',
    tags: ['Vite', '前端工具'],
    score: 2,
  },
  {
    id: 'q7',
    type: 'multiple',
    content: '以下哪些是 React 的生命周期方法（类组件）？',
    options: ['componentDidMount', 'componentWillUnmount', 'useEffect', 'shouldComponentUpdate'],
    answer: ['A', 'B', 'D'],
    analysis: 'useEffect 是函数组件的 Hook，不是类组件的生命周期方法。类组件的生命周期包括 componentDidMount、componentWillUnmount、shouldComponentUpdate 等。',
    difficulty: 'medium',
    tags: ['React', '前端'],
    score: 3,
  },
  {
    id: 'q8',
    type: 'multiple',
    content: '以下哪些属于 CSS 盒模型的组成部分？',
    options: ['content', 'padding', 'border', 'margin'],
    answer: ['A', 'B', 'C', 'D'],
    analysis: 'CSS 盒模型由 content（内容）、padding（内边距）、border（边框）、margin（外边距）四个部分组成。',
    difficulty: 'easy',
    tags: ['CSS', '前端'],
    score: 3,
  },
  {
    id: 'q9',
    type: 'multiple',
    content: '以下哪些是 ES6 新增的特性？',
    options: ['let/const', '箭头函数', 'Promise', 'var 关键字'],
    answer: ['A', 'B', 'C'],
    analysis: 'var 是 ES5 及之前就存在的变量声明方式，let/const、箭头函数、Promise 都是 ES6 新增的特性。',
    difficulty: 'easy',
    tags: ['JavaScript', 'ES6'],
    score: 3,
  },
  {
    id: 'q10',
    type: 'multiple',
    content: '前端性能优化的常见方法有？',
    options: ['代码分割', '图片懒加载', '减少重排重绘', '增加 DOM 节点'],
    answer: ['A', 'B', 'C'],
    analysis: '代码分割、图片懒加载、减少重排重绘都是常见的性能优化手段。增加 DOM 节点会降低性能。',
    difficulty: 'medium',
    tags: ['性能优化', '前端'],
    score: 3,
  },
  {
    id: 'q11',
    type: 'judge',
    content: 'JavaScript 中 === 运算符会进行类型转换后再比较值。',
    answer: '错误',
    analysis: '=== 是严格相等运算符，不会进行类型转换，要求值和类型都相等才返回 true。== 才会进行类型转换。',
    difficulty: 'easy',
    tags: ['JavaScript', '前端'],
    score: 1,
  },
  {
    id: 'q12',
    type: 'judge',
    content: 'React 中父组件状态更新时，所有子组件都会重新渲染。',
    answer: '错误',
    analysis: '默认情况下，父组件更新会触发子组件重新渲染，但可以通过 React.memo、shouldComponentUpdate、PureComponent 等方式进行优化。',
    difficulty: 'medium',
    tags: ['React', '前端'],
    score: 1,
  },
  {
    id: 'q13',
    type: 'judge',
    content: 'CSS 中 position: fixed 的元素是相对于视口定位的。',
    answer: '正确',
    analysis: 'position: fixed 会使元素相对于浏览器视口（viewport）进行定位，即使页面滚动元素位置也不会改变。',
    difficulty: 'easy',
    tags: ['CSS', '前端'],
    score: 1,
  },
  {
    id: 'q14',
    type: 'judge',
    content: 'TypeScript 是 JavaScript 的超集，所有合法的 JavaScript 代码都是合法的 TypeScript 代码。',
    answer: '正确',
    analysis: 'TypeScript 是 JavaScript 的超集，它在 JavaScript 的基础上添加了类型系统，所有 JavaScript 代码都可以在 TypeScript 中运行。',
    difficulty: 'easy',
    tags: ['TypeScript', '前端'],
    score: 1,
  },
  {
    id: 'q15',
    type: 'judge',
    content: 'HTTP 协议是无状态协议，服务器不会保存客户端的状态信息。',
    answer: '正确',
    analysis: 'HTTP 是无状态协议，每次请求都是独立的，服务器不会保存之前请求的状态。通常通过 Cookie、Session、Token 等机制来维护状态。',
    difficulty: 'easy',
    tags: ['网络', 'HTTP'],
    score: 1,
  },
  {
    id: 'q16',
    type: 'single',
    content: 'Git 中用于查看提交历史的命令是？',
    options: ['git status', 'git log', 'git diff', 'git show'],
    answer: 'B',
    analysis: 'git log 用于查看提交历史记录。git status 查看工作区状态，git diff 查看差异，git show 查看某次提交的详细信息。',
    difficulty: 'easy',
    tags: ['Git', '工具'],
    score: 2,
  },
  {
    id: 'q17',
    type: 'single',
    content: '以下哪个不是 React 的 Hook？',
    options: ['useMemo', 'useCallback', 'useWatcher', 'useReducer'],
    answer: 'C',
    analysis: 'useWatcher 不是 React 内置的 Hook。useMemo、useCallback、useReducer 都是 React 提供的官方 Hook。',
    difficulty: 'medium',
    tags: ['React', '前端'],
    score: 2,
  },
  {
    id: 'q18',
    type: 'single',
    content: '虚拟 DOM 的主要优势是？',
    options: ['直接操作真实 DOM', '减少真实 DOM 操作次数', '提高 CSS 渲染速度', '增加 JavaScript 执行速度'],
    answer: 'B',
    analysis: '虚拟 DOM 通过 diff 算法比较差异，批量更新真实 DOM，减少了直接操作真实 DOM 的次数，从而提高性能。',
    difficulty: 'medium',
    tags: ['React', '性能优化'],
    score: 2,
  },
  {
    id: 'q19',
    type: 'single',
    content: 'Promise.all() 的特点是？',
    options: ['任一 Promise 成功即返回', '所有 Promise 都成功才返回成功', '按顺序执行 Promise', '只返回第一个结果'],
    answer: 'B',
    analysis: 'Promise.all() 会等待所有 Promise 都成功后才返回成功结果数组，如果有一个失败则立即返回失败。',
    difficulty: 'medium',
    tags: ['JavaScript', '异步'],
    score: 2,
  },
  {
    id: 'q20',
    type: 'single',
    content: '以下哪种方式不能阻止事件冒泡？',
    options: ['event.stopPropagation()', 'event.cancelBubble = true', 'return false', 'event.preventDefault()'],
    answer: 'D',
    analysis: 'event.preventDefault() 只能阻止默认行为，不能阻止事件冒泡。stopPropagation()、cancelBubble = true 和 return false（jQuery中）可以阻止冒泡。',
    difficulty: 'hard',
    tags: ['JavaScript', 'DOM'],
    score: 2,
  },
  {
    id: 'q21',
    type: 'multiple',
    content: '以下哪些是 JavaScript 的异步编程方式？',
    options: ['回调函数', 'Promise', 'async/await', 'for 循环'],
    answer: ['A', 'B', 'C'],
    analysis: '回调函数、Promise、async/await 都是 JavaScript 中常见的异步编程方式。for 循环是同步的流程控制语句。',
    difficulty: 'easy',
    tags: ['JavaScript', '异步'],
    score: 3,
  },
  {
    id: 'q22',
    type: 'multiple',
    content: '以下哪些方法会改变原数组？',
    options: ['push', 'map', 'splice', 'sort'],
    answer: ['A', 'C', 'D'],
    analysis: 'push、splice、sort 都会直接修改原数组。map 会返回一个新数组，不会改变原数组。',
    difficulty: 'medium',
    tags: ['JavaScript', '数组'],
    score: 3,
  },
  {
    id: 'q23',
    type: 'multiple',
    content: '实现跨域的常见方案有？',
    options: ['CORS', 'JSONP', '代理服务器', 'WebSocket'],
    answer: ['A', 'B', 'C'],
    analysis: 'CORS、JSONP、代理服务器都是常见的跨域解决方案。WebSocket 本身不受同源策略限制，但不是专门的跨域方案。',
    difficulty: 'medium',
    tags: ['网络', '跨域'],
    score: 3,
  },
  {
    id: 'q24',
    type: 'multiple',
    content: 'React Context 适用于以下哪些场景？',
    options: ['主题切换', '用户登录状态', '频繁更新的数据', '语言切换'],
    answer: ['A', 'B', 'D'],
    analysis: 'Context 适用于共享全局且不频繁更新的数据，如主题、用户状态、语言等。频繁更新的数据使用 Context 可能导致性能问题。',
    difficulty: 'hard',
    tags: ['React', '状态管理'],
    score: 3,
  },
  {
    id: 'q25',
    type: 'judge',
    content: 'localStorage 存储的数据在浏览器关闭后会自动清除。',
    answer: '错误',
    analysis: 'localStorage 存储的数据会永久保留，除非手动清除。sessionStorage 才会在浏览器关闭后清除。',
    difficulty: 'easy',
    tags: ['JavaScript', '存储'],
    score: 1,
  },
  {
    id: 'q26',
    type: 'judge',
    content: '在 React 中，setState 总是异步执行的。',
    answer: '错误',
    analysis: '在 React 18 之前，setState 在合成事件和生命周期中是异步的，但在 setTimeout、原生事件中是同步的。React 18 之后默认批量更新，都是异步的。',
    difficulty: 'hard',
    tags: ['React', '前端'],
    score: 1,
  },
  {
    id: 'q27',
    type: 'judge',
    content: 'BFC（块级格式化上下文）可以阻止外边距折叠。',
    answer: '正确',
    analysis: 'BFC 是一个独立的渲染区域，内部元素不会影响外部元素，因此可以阻止外边距折叠和包含浮动元素。',
    difficulty: 'medium',
    tags: ['CSS', '前端'],
    score: 1,
  },
  {
    id: 'q28',
    type: 'judge',
    content: 'TypeScript 中的 any 类型和 unknown 类型完全相同。',
    answer: '错误',
    analysis: 'any 类型可以赋值给任何类型且可以调用任何方法，完全跳过类型检查。unknown 是类型安全的 any，使用前必须进行类型断言或类型守卫。',
    difficulty: 'medium',
    tags: ['TypeScript', '前端'],
    score: 1,
  },
  {
    id: 'q29',
    type: 'judge',
    content: 'HTTPS 比 HTTP 更安全是因为使用了 SSL/TLS 加密。',
    answer: '正确',
    analysis: 'HTTPS 在 HTTP 的基础上加入了 SSL/TLS 协议进行加密传输，确保数据在传输过程中不被窃取和篡改。',
    difficulty: 'easy',
    tags: ['网络', '安全'],
    score: 1,
  },
  {
    id: 'q30',
    type: 'single',
    content: '以下哪个 CSS 属性可以创建 GPU 加速？',
    options: ['color', 'transform', 'font-size', 'background-color'],
    answer: 'B',
    analysis: 'transform 和 opacity 属性可以触发 GPU 加速，提升动画性能。color、font-size、background-color 会触发重绘。',
    difficulty: 'hard',
    tags: ['CSS', '性能优化'],
    score: 2,
  },
];

export function getAllQuestions(): Question[] {
  return [...questionBank];
}

export function filterQuestions(params: {
  type?: QuestionType;
  difficulty?: Difficulty;
  tag?: string;
}): Question[] {
  return questionBank.filter((q) => {
    if (params.type && q.type !== params.type) return false;
    if (params.difficulty && q.difficulty !== params.difficulty) return false;
    if (params.tag && !q.tags.includes(params.tag)) return false;
    return true;
  });
}

export function getRandomQuestions(
  count: number,
  type?: QuestionType,
  difficulty?: Difficulty
): Question[] {
  let pool = questionBank;
  if (type) pool = pool.filter((q) => q.type === type);
  if (difficulty) pool = pool.filter((q) => q.difficulty === difficulty);
  
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

export function generatePaper(rule: ExamRule): Question[] {
  const paper: Question[] = [];
  const all = getAllQuestions();

  const totalCount = rule.singleCount + rule.multipleCount + rule.judgeCount;
  const easyCount = Math.round(totalCount * rule.easyRatio);
  const mediumCount = Math.round(totalCount * rule.mediumRatio);
  const hardCount = totalCount - easyCount - mediumCount;

  const pickByTypeAndDifficulty = (
    type: QuestionType,
    difficulty: Difficulty,
    count: number
  ): Question[] => {
    const pool = all.filter(
      (q) => q.type === type && q.difficulty === difficulty && !paper.includes(q)
    );
    return pool.sort(() => Math.random() - 0.5).slice(0, count);
  };

  const types: { type: QuestionType; count: number }[] = [
    { type: 'single', count: rule.singleCount },
    { type: 'multiple', count: rule.multipleCount },
    { type: 'judge', count: rule.judgeCount },
  ];

  for (const t of types) {
    let remaining = t.count;
    const diffs = [
      { d: 'easy' as Difficulty, ratio: rule.easyRatio },
      { d: 'medium' as Difficulty, ratio: rule.mediumRatio },
      { d: 'hard' as Difficulty, ratio: rule.hardRatio },
    ];
    const totalRatio = diffs.reduce((s, d) => s + d.ratio, 0);
    for (const diff of diffs) {
      const need = Math.round((diff.ratio / totalRatio) * remaining);
      const picked = pickByTypeAndDifficulty(t.type, diff.d, need);
      paper.push(...picked);
      remaining -= picked.length;
    }
    if (remaining > 0) {
      const pool = all.filter((q) => q.type === t.type && !paper.includes(q));
      paper.push(...pool.sort(() => Math.random() - 0.5).slice(0, remaining));
    }
  }

  return paper.sort(() => Math.random() - 0.5);
}

export function addQuestion(question: Omit<Question, 'id'>): Question {
  const newQ: Question = {
    ...question,
    id: 'q' + (questionBank.length + 1) + '-' + Date.now(),
  };
  questionBank.push(newQ);
  return newQ;
}

export function calculateScore(
  questions: Question[],
  userAnswers: Record<string, string | string[]>
): ExamResult {
  const answers: UserAnswer[] = questions.map((q) => {
    const ua = userAnswers[q.id];
    let isCorrect = false;
    if (q.type === 'multiple') {
      const correctArr = q.answer as string[];
      const userArr = (ua as string[]) || [];
      isCorrect =
        correctArr.length === userArr.length &&
        correctArr.every((a) => userArr.includes(a));
    } else {
      isCorrect = ua === q.answer;
    }
    return { questionId: q.id, answer: ua || '', isCorrect };
  });

  let totalScore = 0;
  let maxScore = 0;
  let correctCount = 0;
  const typeStats = {
    single: { correct: 0, total: 0, accuracy: 0 },
    multiple: { correct: 0, total: 0, accuracy: 0 },
    judge: { correct: 0, total: 0, accuracy: 0 },
  };

  questions.forEach((q, idx) => {
    maxScore += q.score;
    const a = answers[idx];
    typeStats[q.type].total += 1;
    if (a.isCorrect) {
      totalScore += q.score;
      correctCount += 1;
      typeStats[q.type].correct += 1;
    }
  });

  (['single', 'multiple', 'judge'] as const).forEach((k) => {
    typeStats[k].accuracy =
      typeStats[k].total > 0 ? typeStats[k].correct / typeStats[k].total : 0;
  });

  return {
    totalScore,
    maxScore,
    correctCount,
    totalCount: questions.length,
    typeStats,
    answers,
    questions,
  };
}
