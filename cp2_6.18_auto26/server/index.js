import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

let protocols = [];

function calculateStatus(parties) {
  if (parties.every((p) => p.signedAt !== null)) return 'completed';
  if (parties.some((p) => p.signedAt !== null)) return 'signed';
  return 'pending';
}

function randomDateWithinDays(days) {
  const now = Date.now();
  const offset = Math.floor(Math.random() * days * 24 * 60 * 60 * 1000);
  return new Date(now - offset).toISOString();
}

function seedMockData() {
  const titleTemplates = [
    '项目保密协议',
    '任务委托书',
    '合作确认书',
    '数据共享协议',
    '服务合同确认书',
  ];

  const sampleEmails = [
    'zhang.san@company.com',
    'li.si@company.com',
    'wang.wu@company.com',
    'zhao.liu@company.com',
    'chen.qi@company.com',
    'zhou.ba@company.com',
  ];

  const sampleContents = [
    `# 项目保密协议

## 第一条 保密内容
双方就合作过程中知悉的对方商业秘密、技术资料、客户信息等内容承担保密义务。

## 第二条 保密期限
保密期限自本协议签署之日起至相关信息公开后5年止。

## 第三条 违约责任
任何一方违反保密义务，应向守约方支付违约金，并赔偿由此造成的全部损失。

- 保密范围包括但不限于技术文档、业务数据、财务信息
- 未经对方书面同意，不得向第三方披露任何保密信息
- 协议终止后仍需承担保密义务`,
    `# 任务委托书

## 委托事项
甲方委托乙方负责【跨平台协作系统】项目的前端开发工作，具体工作内容包括：

1. UI组件库搭建与实现
2. 核心业务模块开发
3. 接口联调与性能优化

## 交付标准
- 代码符合团队规范，通过代码审查
- 所有功能模块通过测试验收
- 交付完整的开发文档与使用手册

## 工期要求
自协议签署之日起30个工作日内完成全部交付。`,
    `# 合作确认书

甲乙双方经友好协商，就以下合作事项达成共识：

## 合作内容
双方共同推进数字化转型项目，共享技术资源与市场渠道。

## 权利义务
- 甲方负责提供核心技术支持
- 乙方负责市场推广与客户对接
- 双方按约定比例分配合作收益

## 争议解决
因本协议产生的争议，双方友好协商解决；协商不成的，提交仲裁委员会裁决。`,
  ];

  const statusDistribution = ['pending', 'pending', 'pending', 'pending', 'pending', 'pending', 'signed', 'signed', 'signed', 'signed', 'signed', 'signed', 'signed', 'signed', 'completed', 'completed', 'completed', 'completed', 'completed', 'completed'];

  for (let i = 0; i < 20; i++) {
    const templateIdx = i % titleTemplates.length;
    const contentIdx = i % sampleContents.length;
    const targetStatus = statusDistribution[i];
    const partyCount = 2 + (i % 2);
    const parties = [];

    for (let j = 0; j < partyCount; j++) {
      const email = sampleEmails[(i + j) % sampleEmails.length];
      let signedAt = null;
      let signatureData = null;

      if (targetStatus === 'completed') {
        signedAt = randomDateWithinDays(10);
        signatureData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
      } else if (targetStatus === 'signed') {
        if (j === 0) {
          signedAt = randomDateWithinDays(5);
          signatureData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
        }
      }

      parties.push({ email, signedAt, signatureData });
    }

    protocols.push({
      id: uuidv4(),
      title: `${titleTemplates[templateIdx]} #${String(i + 1).padStart(3, '0')}`,
      content: sampleContents[contentIdx],
      parties,
      status: calculateStatus(parties),
      createdAt: randomDateWithinDays(30),
    });
  }
}

seedMockData();

app.get('/api/protocols', (_req, res) => {
  res.json(protocols);
});

app.get('/api/protocols/:id', (req, res) => {
  const { id } = req.params;
  const protocol = protocols.find((p) => p.id === id);
  if (!protocol) {
    return res.status(404).json({ error: '协议不存在' });
  }
  res.json(protocol);
});

app.post('/api/protocols', (req, res) => {
  const { title, content, parties } = req.body || {};

  if (!title || !title.trim()) {
    return res.status(400).json({ error: '协议标题不能为空' });
  }
  if (!content || !content.trim()) {
    return res.status(400).json({ error: '协议内容不能为空' });
  }
  if (!Array.isArray(parties) || parties.length === 0) {
    return res.status(400).json({ error: '至少需要一个签署方' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  for (const email of parties) {
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: `无效的邮箱格式：${email}` });
    }
  }

  const newProtocol = {
    id: uuidv4(),
    title: title.trim(),
    content: content.trim(),
    parties: parties.map((email) => ({
      email,
      signedAt: null,
      signatureData: null,
    })),
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  protocols.unshift(newProtocol);
  res.status(201).json(newProtocol);
});

app.post('/api/protocols/:id/sign', (req, res) => {
  const { id } = req.params;
  const { email, signatureData, signedAt } = req.body || {};

  const protocol = protocols.find((p) => p.id === id);
  if (!protocol) {
    return res.status(404).json({ error: '协议不存在' });
  }

  if (!email || !signatureData || !signedAt) {
    return res.status(400).json({ error: '签署信息不完整' });
  }

  const party = protocol.parties.find((p) => p.email === email);
  if (!party) {
    return res.status(400).json({ error: '该邮箱不是本协议的签署方' });
  }

  party.signedAt = signedAt;
  party.signatureData = signatureData;
  protocol.status = calculateStatus(protocol.parties);

  res.json(protocol);
});

app.listen(PORT, () => {
  console.log(`[Server] 电子协议签署后端服务已启动: http://localhost:${PORT}`);
  console.log(`[Server] 已初始化 ${protocols.length} 条模拟协议数据`);
});
