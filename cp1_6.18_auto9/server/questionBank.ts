export interface Question {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  tags: string[];
}

export const questionBank: Question[] = [
  {
    id: '1',
    question: '在JavaScript中，以下哪个关键字用于声明一个不可重新赋值的变量？',
    options: ['var', 'let', 'const', 'static'],
    correctIndex: 2,
    explanation: 'const声明的变量必须在声明时初始化，且之后不能重新赋值。但如果是对象或数组，其内部属性/元素仍可修改。',
    tags: ['变量', 'JavaScript']
  },
  {
    id: '2',
    question: '以下代码的输出结果是什么？\nconsole.log(typeof null)',
    options: ['"null"', '"undefined"', '"object"', '"number"'],
    correctIndex: 2,
    explanation: '这是JavaScript的一个历史遗留bug。typeof null返回"object"，尽管null并不是真正的对象。',
    tags: ['变量', 'JavaScript', '类型']
  },
  {
    id: '3',
    question: '以下哪个循环会至少执行一次循环体？',
    options: ['for循环', 'while循环', 'do...while循环', 'for...in循环'],
    correctIndex: 2,
    explanation: 'do...while循环先执行循环体，再判断条件，因此无论条件是否满足，循环体至少执行一次。',
    tags: ['循环']
  },
  {
    id: '4',
    question: '在JavaScript中，Array.prototype.map()方法返回什么？',
    options: ['原数组', '新数组', 'undefined', '布尔值'],
    correctIndex: 1,
    explanation: 'map()方法创建一个新数组，其结果是对原数组每个元素调用回调函数的返回值。不会修改原数组。',
    tags: ['数组', 'JavaScript']
  },
  {
    id: '5',
    question: '以下哪个方法可以将数组扁平化？',
    options: ['Array.prototype.join()', 'Array.prototype.flat()', 'Array.prototype.slice()', 'Array.prototype.splice()'],
    correctIndex: 1,
    explanation: 'flat()方法会按照一个可指定的深度递归遍历数组，并将所有元素与遍历到的子数组中的元素合并为一个新数组返回。',
    tags: ['数组', 'JavaScript']
  },
  {
    id: '6',
    question: '以下代码输出什么？\nconst arr = [1, 2, 3];\narr[10] = 10;\nconsole.log(arr.length)',
    options: ['3', '4', '10', '11'],
    correctIndex: 3,
    explanation: 'JavaScript数组是动态的。当设置索引10时，数组长度变为11（0-10），中间索引4-9为空槽位。',
    tags: ['数组', 'JavaScript']
  },
  {
    id: '7',
    question: '在TypeScript中，以下哪个是正确的类型注解语法？',
    options: ['let name: string = "Alice"', 'let name = "Alice": string', 'let name = string "Alice"', 'let <string>name = "Alice"'],
    correctIndex: 0,
    explanation: 'TypeScript使用变量名后加冒号和类型的语法进行类型注解：let 变量名: 类型 = 值。',
    tags: ['类型', 'TypeScript']
  },
  {
    id: '8',
    question: 'TypeScript中的interface和type的主要区别是什么？',
    options: ['没有区别', 'interface可以被extends和implements，type不行', 'type可以定义联合类型和交叉类型，interface不行', 'interface可以声明合并，type不行'],
    correctIndex: 3,
    explanation: 'interface支持声明合并（多个同名interface会自动合并），而type不支持。此外type更灵活，可定义联合类型、元组等。',
    tags: ['类型', 'TypeScript']
  },
  {
    id: '9',
    question: '以下哪个选项是JavaScript中的"假值"（falsy value）？',
    options: ['"0"', '[]', '0', '{}'],
    correctIndex: 2,
    explanation: 'JavaScript中的假值有：false, 0, -0, 0n, "", null, undefined, NaN。注意"0"、[]、{}都是真值。',
    tags: ['类型', 'JavaScript']
  },
  {
    id: '10',
    question: 'for...in和for...of的主要区别是什么？',
    options: ['没有区别', 'for...in遍历键名，for...of遍历值', 'for...in遍历值，for...of遍历键名', 'for...in只能用于对象'],
    correctIndex: 1,
    explanation: 'for...in循环遍历对象的可枚举属性键名；for...of循环遍历可迭代对象（如数组、字符串）的值。',
    tags: ['循环', 'JavaScript']
  },
  {
    id: '11',
    question: 'React中，以下哪个Hook用于管理组件状态？',
    options: ['useEffect', 'useState', 'useContext', 'useRef'],
    correctIndex: 1,
    explanation: 'useState是React中用于在函数组件中添加状态管理的Hook，返回当前状态和更新状态的函数。',
    tags: ['React', '状态']
  },
  {
    id: '12',
    question: 'React中useEffect的依赖数组为空数组[]时，回调函数什么时候执行？',
    options: ['每次渲染都执行', '仅在组件挂载时执行一次', '从不执行', '仅在组件卸载时执行'],
    correctIndex: 1,
    explanation: '空依赖数组表示useEffect不依赖任何props或state，因此仅在组件首次挂载（mount）时执行一次。',
    tags: ['React', '生命周期']
  },
  {
    id: '13',
    question: '在CSS中，以下哪个属性可以创建毛玻璃效果？',
    options: ['opacity', 'filter: blur()', 'backdrop-filter: blur()', 'transparent'],
    correctIndex: 2,
    explanation: 'backdrop-filter: blur()可以对元素后面的背景应用模糊效果，实现毛玻璃效果。filter: blur()是模糊元素自身。',
    tags: ['CSS', '样式']
  },
  {
    id: '14',
    question: 'CSS Flexbox中，justify-content: space-between的作用是什么？',
    options: ['所有项目居中', '项目均匀分布，首尾贴边', '项目均匀分布，首尾有间距', '项目靠左对齐'],
    correctIndex: 1,
    explanation: 'space-between使项目沿主轴均匀分布，第一个项目在起始位置，最后一个项目在结束位置，中间项目间距相等。',
    tags: ['CSS', '布局']
  },
  {
    id: '15',
    question: 'Node.js中，Express框架的核心设计理念是什么？',
    options: ['面向对象编程', '中间件模式', '事件驱动架构', 'MVC模式'],
    correctIndex: 1,
    explanation: 'Express的核心是中间件模式，请求经过一系列中间件函数处理，每个中间件可以修改req/res对象或结束响应。',
    tags: ['Node.js', 'Express']
  },
  {
    id: '16',
    question: '以下代码输出什么？\nconsole.log(1 + "2" + 3)',
    options: ['6', '"123"', '"33"', '15'],
    correctIndex: 1,
    explanation: 'JavaScript中字符串与数字相加会进行字符串拼接。1 + "2" = "12"，然后"12" + 3 = "123"。',
    tags: ['类型', 'JavaScript']
  },
  {
    id: '17',
    question: '以下哪个方法用于将JSON字符串解析为JavaScript对象？',
    options: ['JSON.stringify()', 'JSON.parse()', 'JSON.convert()', 'JSON.decode()'],
    correctIndex: 1,
    explanation: 'JSON.parse()将JSON字符串转换为JavaScript对象；JSON.stringify()则相反，将对象序列化为JSON字符串。',
    tags: ['JavaScript', '对象']
  },
  {
    id: '18',
    question: 'JavaScript中，Promise的三种状态不包括以下哪个？',
    options: ['pending', 'fulfilled', 'rejected', 'completed'],
    correctIndex: 3,
    explanation: 'Promise有三种状态：pending（进行中）、fulfilled（已成功）、rejected（已失败）。没有completed状态。',
    tags: ['异步', 'JavaScript']
  },
  {
    id: '19',
    question: 'async/await中，await后面的表达式通常是什么类型？',
    options: ['普通函数', 'Promise对象', '字符串', '数组'],
    correctIndex: 1,
    explanation: 'await通常用于等待Promise对象完成。如果await后面不是Promise，则直接返回该值。',
    tags: ['异步', 'JavaScript']
  },
  {
    id: '20',
    question: '以下哪个HTTP状态码表示"未授权"？',
    options: ['200', '301', '401', '404'],
    correctIndex: 2,
    explanation: '401 Unauthorized表示请求需要身份验证。200是成功，301是永久重定向，404是未找到。',
    tags: ['HTTP', '网络']
  },
  {
    id: '21',
    question: '在Git中，以下哪个命令用于查看提交历史？',
    options: ['git status', 'git log', 'git diff', 'git show'],
    correctIndex: 1,
    explanation: 'git log显示提交历史记录。git status查看工作区状态，git diff查看差异，git show查看某次提交详情。',
    tags: ['Git', '工具']
  },
  {
    id: '22',
    question: '以下哪个CSS选择器优先级最高？',
    options: ['类选择器 .class', 'ID选择器 #id', '标签选择器 div', '通配符选择器 *'],
    correctIndex: 1,
    explanation: 'CSS优先级从高到低：内联样式 > ID选择器 > 类/伪类/属性选择器 > 标签/伪元素选择器 > 通配符。',
    tags: ['CSS', '选择器']
  },
  {
    id: '23',
    question: 'JavaScript中，以下哪个方法可以防止对象被修改？',
    options: ['Object.freeze()', 'Object.seal()', 'Object.preventExtensions()', '以上都可以'],
    correctIndex: 3,
    explanation: '三者都能限制对象修改，严格程度递增：preventExtensions禁止添加属性，seal禁止添加/删除，freeze完全冻结。',
    tags: ['对象', 'JavaScript']
  },
  {
    id: '24',
    question: 'TypeScript中，以下代码的类型是什么？\nlet value: string | number;',
    options: ['string类型', 'number类型', '联合类型', '交叉类型'],
    correctIndex: 2,
    explanation: '使用|定义的是联合类型，表示value可以是string或number中的任意一种。&用于定义交叉类型。',
    tags: ['类型', 'TypeScript']
  },
  {
    id: '25',
    question: '以下代码输出什么？\nsetTimeout(() => console.log(1), 0);\nconsole.log(2);',
    options: ['1 然后 2', '2 然后 1', '同时输出', '不确定'],
    correctIndex: 1,
    explanation: 'setTimeout回调被放入宏任务队列，即使延迟为0也需等当前同步代码执行完。因此先输出2，再输出1。',
    tags: ['异步', 'JavaScript']
  },
  {
    id: '26',
    question: 'React中，key属性的主要作用是什么？',
    options: ['美化代码', '帮助React识别列表项变化', '传递数据给子组件', '设置CSS样式'],
    correctIndex: 1,
    explanation: 'key帮助React识别哪些元素被修改/添加/删除，从而高效地更新虚拟DOM和真实DOM。',
    tags: ['React', '渲染']
  },
  {
    id: '27',
    question: '以下哪种方式可以正确创建一个深拷贝？',
    options: ['let b = a', 'let b = {...a}', 'let b = Object.assign({}, a)', 'let b = JSON.parse(JSON.stringify(a))'],
    correctIndex: 3,
    explanation: 'JSON.parse(JSON.stringify())可实现简单对象的深拷贝。其他方式都是浅拷贝，嵌套对象仍共享引用。',
    tags: ['对象', 'JavaScript']
  },
  {
    id: '28',
    question: '在Node.js中，以下哪个模块用于处理文件路径？',
    options: ['fs', 'path', 'http', 'url'],
    correctIndex: 1,
    explanation: 'path模块提供处理文件路径的工具函数。fs是文件系统模块，http是HTTP模块，url用于URL解析。',
    tags: ['Node.js', '模块']
  },
  {
    id: '29',
    question: '以下哪个不是JavaScript的基本数据类型？',
    options: ['string', 'number', 'array', 'boolean'],
    correctIndex: 2,
    explanation: 'JavaScript基本类型：string、number、boolean、undefined、null、symbol、bigint。array属于引用类型（object）。',
    tags: ['类型', 'JavaScript']
  },
  {
    id: '30',
    question: '以下代码中，this的值是什么？\nconst obj = {\n  name: "Alice",\n  greet: () => console.log(this.name)\n};\nobj.greet();',
    options: ['obj对象', 'undefined', '全局对象', '报错'],
    correctIndex: 1,
    explanation: '箭头函数没有自己的this，它继承外层作用域的this。在对象方法中使用箭头函数，this不指向该对象。',
    tags: ['函数', 'JavaScript']
  }
];

export function getRandomQuestions(count: number = 10): Question[] {
  const shuffled = [...questionBank].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, questionBank.length));
}
