# 灵感拼贴墙 - 集体情绪可视化项目

一个让团队成员记录和可视化集体情绪的Web应用。

## 项目结构

```
├── src/                    # 前端源码
│   ├── components/
│   │   ├── RecorderPanel/  # 情绪记录面板
│   │   ├── WallCanvas/     # 情绪汇集墙（力导向布局）
│   │   └── AnalysisPanel/  # 情绪分析面板
│   ├── types.ts            # TypeScript类型定义
│   ├── api.ts              # API封装
│   ├── App.tsx             # 主应用组件
│   └── main.tsx            # 入口文件
├── app.py                  # Flask后端
├── package.json            # 前端依赖配置
├── vite.config.ts          # Vite配置
├── tsconfig.json           # TypeScript配置
└── index.html              # HTML入口
```

## 后端模块

### 数据存储API模块 (`app.py`)

提供情绪卡片的CRUD接口：

- `GET /api/cards` - 获取所有情绪卡片（支持按情绪/成员筛选）
- `POST /api/cards` - 创建新的情绪卡片
- `GET /api/cards/:id` - 获取单张卡片详情
- `DELETE /api/cards/:id` - 删除卡片
- `GET /api/members` - 获取成员列表

### 情绪聚合分析模块

- `GET /api/aggregate` - 获取情绪聚合统计数据
  - `distribution`: 各情绪类型的人数和占比
  - `intensityHistory`: 近12小时的情绪强度趋势数据
  - `totalCount`: 总记录数

## 快速开始

### 启动后端

```bash
pip install flask flask-cors
python app.py
```

后端将在 `http://localhost:5000` 运行。

### 启动前端

```bash
npm install
npm run dev
```

前端开发服务器将在 `http://localhost:3000` 运行，并代理API请求到后端。

## 功能特性

### 情绪记录模块
- 6种情绪选择（开心、平静、焦虑、忧伤、愤怒、疲惫）
- 每种情绪对应专属渐变色卡片
- 80字限制的情绪描述输入
- 关键词标签
- 流畅的发布动效

### 情绪汇集墙模块
- d3-force力导向布局算法
- 卡片浮动气泡效果
- 同色情绪卡片连接线
- 拖拽交互 + 弹性回弹
- 惯性滑动效果
- 虚拟化渲染（>50张卡片时启用）
- 30FPS+ 性能保证

### 情绪分析模块
- 情绪分布圆环图
- 实时情绪强度折线图
- 每2秒自动刷新
- 数据悬停提示
- 情绪详情进度条

## 技术栈

**前端：**
- React 18 + TypeScript
- Vite
- d3-force（力导向布局）
- Chart.js + react-chartjs-2（图表）
- framer-motion（动画）
- react-router-dom（路由）
- axios（HTTP请求）

**后端：**
- Python Flask
- Flask-CORS
