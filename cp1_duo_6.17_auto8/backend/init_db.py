import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'docs.db')

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS docs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tech_stack TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            code_snippet TEXT NOT NULL
        )
    ''')

    sample_data = [
        ('React', 'useState', '在函数组件中添加状态管理的 Hook，返回一个状态值和一个更新该状态的函数。', 'const [count, setCount] = useState(0);\n\nfunction increment() {\n  setCount(count + 1);\n}'),
        ('React', 'useEffect', '用于在函数组件中执行副作用操作的 Hook，如数据获取、订阅或手动修改 DOM。', 'useEffect(() => {\n  document.title = `Count: ${count}`;\n  return () => {\n    // cleanup\n  };\n}, [count]);'),
        ('React', 'useContext', '用于订阅 React Context 的 Hook，可以在函数组件中读取和订阅 context。', 'const ThemeContext = createContext("light");\n\nfunction App() {\n  const theme = useContext(ThemeContext);\n  return <div style={{ background: theme }} />;\n}'),
        ('React', 'useCallback', '返回一个记忆化的回调函数，只有在依赖项变化时才会更新。', 'const memoizedCallback = useCallback(\n  (a, b) => {\n    return a + b;\n  },\n  [a, b],\n);'),
        ('TypeScript', 'interface', '用于定义对象的形状，描述对象的属性和方法类型。', 'interface User {\n  name: string;\n  age: number;\n  email?: string;\n  greet(): void;\n}\n\nconst user: User = {\n  name: "Alice",\n  age: 25,\n  greet() { console.log("Hi"); }\n};'),
        ('TypeScript', 'type', '类型别名，用于给一个类型起个新名字，可以是基本类型、联合类型、交叉类型等。', 'type ID = string | number;\n\ntype Point = {\n  x: number;\n  y: number;\n};\n\ntype LabeledPoint = Point & { label: string };'),
        ('TypeScript', 'generic', '泛型，允许在定义函数、接口或类时不预先指定类型，而在使用时再指定的特性。', 'function identity<T>(arg: T): T {\n  return arg;\n}\n\nconst result = identity<string>("hello");\nconst numResult = identity<number>(42);'),
        ('TypeScript', 'enum', '枚举类型，用于定义一组命名的常数。', 'enum Direction {\n  Up = "UP",\n  Down = "DOWN",\n  Left = "LEFT",\n  Right = "RIGHT",\n}\n\nconst dir: Direction = Direction.Up;'),
        ('Tailwind CSS', 'flexbox', 'Flexbox 布局工具类，快速创建弹性布局。', '<div class="flex items-center justify-between">\n  <span>Item 1</span>\n  <span>Item 2</span>\n  <span>Item 3</span>\n</div>'),
        ('Tailwind CSS', 'grid', 'Grid 布局工具类，快速创建网格布局。', '<div class="grid grid-cols-3 gap-4">\n  <div class="col-span-2">Span 2</div>\n  <div>Item 1</div>\n  <div>Item 2</div>\n  <div>Item 3</div>\n</div>'),
        ('Tailwind CSS', 'spacing', '间距工具类，包括 margin 和 padding，支持从 0 到 96 的预设值。', '<div class="p-4 m-2">\n  <div class="mt-4 mb-2">Margin top bottom</div>\n  <div class="px-6 py-3">Padding x y</div>\n</div>'),
        ('Tailwind CSS', 'responsive', '响应式设计工具类，通过前缀 sm: md: lg: xl: 2xl: 实现断点适配。', '<div class="w-full md:w-1/2 lg:w-1/3">\n  <img class="rounded-lg md:rounded-xl" src="..." alt="" />\n  <p class="text-sm md:text-base">Responsive text</p>\n</div>'),
    ]

    cursor.execute('SELECT COUNT(*) FROM docs')
    count = cursor.fetchone()[0]
    if count == 0:
        cursor.executemany(
            'INSERT INTO docs (tech_stack, title, description, code_snippet) VALUES (?, ?, ?, ?)',
            sample_data
        )
        print(f'已插入 {len(sample_data)} 条文档数据')
    else:
        print(f'数据库已存在 {count} 条数据，跳过初始化')

    conn.commit()
    conn.close()
    print('数据库初始化完成')

if __name__ == '__main__':
    init_db()
