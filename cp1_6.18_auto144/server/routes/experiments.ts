import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'

const router = Router()

export interface User {
  id: string
  name: string
  avatar: string
}

export interface Annotation {
  id: string
  userId: string
  userName: string
  userAvatar: string
  content: string
  lineIndex: number
  createdAt: string
}

export interface TextAttachment {
  id: string
  type: 'text'
  title: string
  content: string
  annotations: Annotation[]
  createdAt: string
}

export interface ImageAttachment {
  id: string
  type: 'image'
  filename: string
  url: string
  thumbnail: string
  width: number
  height: number
  createdAt: string
}

export type Attachment = TextAttachment | ImageAttachment

export interface TimelineEvent {
  id: string
  type: 'create' | 'update' | 'comment' | 'upload'
  userId: string
  userName: string
  userAvatar: string
  description: string
  createdAt: string
}

export interface Comment {
  id: string
  userId: string
  userName: string
  userAvatar: string
  content: string
  createdAt: string
}

export interface Experiment {
  id: string
  title: string
  summary: string
  description: string
  status: '进行中' | '已完成' | '失败'
  creator: User
  createdAt: string
  updatedAt: string
  attachments: Attachment[]
  comments: Comment[]
  timeline: TimelineEvent[]
}

const mockUser: User = {
  id: 'user-1',
  name: '张研究员',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhang'
}

const mockUser2: User = {
  id: 'user-2',
  name: '李博士',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=li'
}

export let experiments: Experiment[] = [
  {
    id: 'exp-1',
    title: 'CRISPR基因编辑在植物抗病中的应用研究',
    summary: '本实验旨在研究CRISPR-Cas9技术对水稻抗稻瘟病基因的编辑效果...',
    description: `# CRISPR基因编辑实验方案

## 实验目的
研究CRISPR-Cas9技术对水稻抗稻瘟病基因的编辑效果，探索提高作物抗病性的新途径。

## 实验材料
- 水稻品种：日本晴
- Cas9表达载体：pCAMBIA1300-Cas9
- sgRNA靶点：OsERF922基因

## 实验步骤
1. 设计sgRNA靶点
2. 构建表达载体
3. 农杆菌转化
4. 筛选阳性植株
5. 抗病性鉴定

## 预期结果
成功获得OsERF922基因敲除的水稻植株，稻瘟病抗性显著提高。`,
    status: '进行中',
    creator: mockUser,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-20T14:30:00Z',
    attachments: [
      {
        id: 'att-1',
        type: 'text',
        title: '第一次实验数据记录',
        content: `实验日期：2024-01-18
温度：25.5°C
湿度：65%
水稻株高：32.5 cm
叶片数：5 片
叶绿素含量：42.3 mg/g
光合速率：18.2 μmol/m²/s
稻瘟病发病率：35%
病情指数：22.5`,
        annotations: [
          {
            id: 'ann-1',
            userId: 'user-2',
            userName: '李博士',
            userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=li',
            content: '叶绿素含量略低于预期，建议检查光照条件',
            lineIndex: 6,
            createdAt: '2024-01-19T09:00:00Z'
          }
        ],
        createdAt: '2024-01-18T16:00:00Z'
      },
      {
        id: 'att-2',
        type: 'image',
        filename: 'rice-growth.jpg',
        url: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=800&h=600&fit=crop',
        thumbnail: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=200&h=150&fit=crop',
        width: 800,
        height: 600,
        createdAt: '2024-01-19T11:00:00Z'
      }
    ],
    comments: [
      {
        id: 'comment-1',
        userId: 'user-2',
        userName: '李博士',
        userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=li',
        content: '实验进展不错，记得按时记录数据哦！',
        createdAt: '2024-01-17T15:00:00Z'
      }
    ],
    timeline: [
      {
        id: 'tl-1',
        type: 'create',
        userId: 'user-1',
        userName: '张研究员',
        userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhang',
        description: '创建了实验方案',
        createdAt: '2024-01-15T10:00:00Z'
      },
      {
        id: 'tl-2',
        type: 'upload',
        userId: 'user-1',
        userName: '张研究员',
        userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhang',
        description: '上传了实验数据记录',
        createdAt: '2024-01-18T16:00:00Z'
      },
      {
        id: 'tl-3',
        type: 'comment',
        userId: 'user-2',
        userName: '李博士',
        userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=li',
        description: '评论了实验',
        createdAt: '2024-01-17T15:00:00Z'
      },
      {
        id: 'tl-4',
        type: 'update',
        userId: 'user-1',
        userName: '张研究员',
        userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhang',
        description: '更新了实验描述',
        createdAt: '2024-01-20T14:30:00Z'
      }
    ]
  },
  {
    id: 'exp-2',
    title: '蛋白质结晶条件筛选实验',
    summary: '通过坐滴法筛选目标蛋白的最佳结晶条件，为结构生物学研究提供基础...',
    description: `# 蛋白质结晶条件筛选

## 实验目的
筛选获得高质量的蛋白质晶体，用于X射线衍射解析蛋白质三维结构。

## 实验方法
采用坐滴气相扩散法，使用商品化筛选试剂盒进行初筛。

## 筛选条件
- 温度：4°C 和 20°C
- 蛋白浓度：10 mg/mL
- 筛选试剂盒：Index, PEG/Ion, Crystal Screen`,
    status: '已完成',
    creator: mockUser2,
    createdAt: '2024-01-10T09:00:00Z',
    updatedAt: '2024-01-25T16:00:00Z',
    attachments: [
      {
        id: 'att-3',
        type: 'image',
        filename: 'crystal-1.jpg',
        url: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=800&h=600&fit=crop',
        thumbnail: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=200&h=150&fit=crop',
        width: 800,
        height: 600,
        createdAt: '2024-01-20T10:00:00Z'
      }
    ],
    comments: [],
    timeline: [
      {
        id: 'tl-5',
        type: 'create',
        userId: 'user-2',
        userName: '李博士',
        userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=li',
        description: '创建了实验方案',
        createdAt: '2024-01-10T09:00:00Z'
      },
      {
        id: 'tl-6',
        type: 'upload',
        userId: 'user-2',
        userName: '李博士',
        userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=li',
        description: '上传了晶体照片',
        createdAt: '2024-01-20T10:00:00Z'
      }
    ]
  },
  {
    id: 'exp-3',
    title: '细胞凋亡通路机制研究',
    summary: '探索新型化合物诱导肿瘤细胞凋亡的分子机制...',
    description: `# 细胞凋亡通路机制研究

## 背景
细胞凋亡是维持机体稳态的重要机制，肿瘤细胞常出现凋亡逃逸。

## 实验内容
1. MTT法检测细胞活力
2. Annexin V/PI双染检测凋亡率
3. Western blot检测凋亡相关蛋白`,
    status: '失败',
    creator: mockUser,
    createdAt: '2024-01-05T08:00:00Z',
    updatedAt: '2024-01-12T18:00:00Z',
    attachments: [],
    comments: [
      {
        id: 'comment-2',
        userId: 'user-2',
        userName: '李博士',
        userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=li',
        content: '化合物溶解度可能有问题，建议换用DMSO配制',
        createdAt: '2024-01-08T14:00:00Z'
      }
    ],
    timeline: [
      {
        id: 'tl-7',
        type: 'create',
        userId: 'user-1',
        userName: '张研究员',
        userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhang',
        description: '创建了实验方案',
        createdAt: '2024-01-05T08:00:00Z'
      },
      {
        id: 'tl-8',
        type: 'comment',
        userId: 'user-2',
        userName: '李博士',
        userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=li',
        description: '评论了实验',
        createdAt: '2024-01-08T14:00:00Z'
      }
    ]
  },
  {
    id: 'exp-4',
    title: '土壤微生物群落多样性分析',
    summary: '利用16S rRNA测序技术分析不同施肥方式对土壤微生物的影响...',
    description: `# 土壤微生物群落多样性分析

## 研究目的
探究长期施用有机肥和化肥对土壤微生物群落结构和多样性的影响。

## 样品采集
- 处理：有机肥组、化肥组、对照组
- 重复：每个处理3个重复
- 深度：0-20cm 表层土壤`,
    status: '进行中',
    creator: mockUser2,
    createdAt: '2024-01-22T10:00:00Z',
    updatedAt: '2024-01-28T09:00:00Z',
    attachments: [],
    comments: [],
    timeline: [
      {
        id: 'tl-9',
        type: 'create',
        userId: 'user-2',
        userName: '李博士',
        userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=li',
        description: '创建了实验方案',
        createdAt: '2024-01-22T10:00:00Z'
      }
    ]
  }
]

router.get('/', (_req, res) => {
  const list = experiments.map(exp => ({
    id: exp.id,
    title: exp.title,
    summary: exp.summary,
    status: exp.status,
    creator: exp.creator,
    createdAt: exp.createdAt,
    updatedAt: exp.updatedAt
  }))
  res.json(list)
})

router.get('/:id', (req, res) => {
  const { id } = req.params
  const experiment = experiments.find(exp => exp.id === id)
  if (!experiment) {
    res.status(404).json({ error: '实验不存在' })
    return
  }
  res.json(experiment)
})

router.post('/', (req, res) => {
  const { title, summary, description } = req.body
  const now = new Date().toISOString()
  const newExperiment: Experiment = {
    id: `exp-${uuidv4()}`,
    title: title || '新实验',
    summary: summary || '',
    description: description || '',
    status: '进行中',
    creator: mockUser,
    createdAt: now,
    updatedAt: now,
    attachments: [],
    comments: [],
    timeline: [
      {
        id: `tl-${uuidv4()}`,
        type: 'create',
        userId: mockUser.id,
        userName: mockUser.name,
        userAvatar: mockUser.avatar,
        description: '创建了实验方案',
        createdAt: now
      }
    ]
  }
  experiments.unshift(newExperiment)
  res.status(201).json(newExperiment)
})

router.put('/:id', (req, res) => {
  const { id } = req.params
  const { title, summary, description, status } = req.body
  const index = experiments.findIndex(exp => exp.id === id)
  if (index === -1) {
    res.status(404).json({ error: '实验不存在' })
    return
  }
  const now = new Date().toISOString()
  const updated = {
    ...experiments[index],
    title: title ?? experiments[index].title,
    summary: summary ?? experiments[index].summary,
    description: description ?? experiments[index].description,
    status: status ?? experiments[index].status,
    updatedAt: now,
    timeline: [
      ...experiments[index].timeline,
      {
        id: `tl-${uuidv4()}`,
        type: 'update',
        userId: mockUser.id,
        userName: mockUser.name,
        userAvatar: mockUser.avatar,
        description: '更新了实验信息',
        createdAt: now
      }
    ]
  }
  experiments[index] = updated
  res.json(updated)
})

router.delete('/:id', (req, res) => {
  const { id } = req.params
  const index = experiments.findIndex(exp => exp.id === id)
  if (index === -1) {
    res.status(404).json({ error: '实验不存在' })
    return
  }
  experiments.splice(index, 1)
  res.json({ success: true })
})

router.post('/:id/comments', (req, res) => {
  const { id } = req.params
  const { content } = req.body
  const experiment = experiments.find(exp => exp.id === id)
  if (!experiment) {
    res.status(404).json({ error: '实验不存在' })
    return
  }
  const now = new Date().toISOString()
  const newComment: Comment = {
    id: `comment-${uuidv4()}`,
    userId: mockUser.id,
    userName: mockUser.name,
    userAvatar: mockUser.avatar,
    content,
    createdAt: now
  }
  experiment.comments.push(newComment)
  experiment.timeline.push({
    id: `tl-${uuidv4()}`,
    type: 'comment',
    userId: mockUser.id,
    userName: mockUser.name,
    userAvatar: mockUser.avatar,
    description: '发表了评论',
    createdAt: now
  })
  experiment.updatedAt = now
  res.status(201).json(newComment)
})

export default router
