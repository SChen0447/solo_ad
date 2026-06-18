import express from 'express';
import cors from 'cors';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const file = join(__dirname, '..', 'db.json');
const defaultData = {
  contracts: [
    {
      id: 'a1b2c3d4-0001-4000-8000-000000000001',
      title: '品牌官网UI设计服务合同',
      templateType: 'labor_service',
      fields: {
        partyA: '星辰科技有限公司',
        partyB: '李明（自由设计师）',
        projectContent: '提供企业官网首页及内页共15个页面的UI设计服务，含3轮修改',
        amount: 28000,
        startDate: '2026-06-20',
        endDate: '2026-08-20',
      },
      status: 'signed',
      currentVersion: 2,
      createdAt: '2026-06-15T09:00:00.000Z',
      updatedAt: '2026-06-17T14:30:00.000Z',
    },
    {
      id: 'a1b2c3d4-0002-4000-8000-000000000002',
      title: '技术咨询保密协议',
      templateType: 'confidentiality',
      fields: {
        partyA: '蓝海数据股份有限公司',
        partyB: '王芳（咨询师）',
        projectContent: '就用户增长策略提供技术咨询服务期间的保密约定',
        amount: 5000,
        startDate: '2026-06-25',
        endDate: '2027-06-25',
      },
      status: 'pending',
      currentVersion: 1,
      createdAt: '2026-06-16T10:20:00.000Z',
      updatedAt: '2026-06-16T10:20:00.000Z',
    },
    {
      id: 'a1b2c3d4-0003-4000-8000-000000000003',
      title: 'App产品开发项目委托合同',
      templateType: 'project_entrust',
      fields: {
        partyA: '悦动健康科技',
        partyB: '张伟（全栈工程师）',
        projectContent: 'iOS/Android双端健身App开发，含后端API、后台管理系统',
        amount: 120000,
        startDate: '2026-07-01',
        endDate: '2026-12-31',
      },
      status: 'expired',
      currentVersion: 1,
      createdAt: '2026-05-01T08:00:00.000Z',
      updatedAt: '2026-05-01T08:00:00.000Z',
    },
    {
      id: 'a1b2c3d4-0004-4000-8000-000000000004',
      title: '翻译服务合作协议',
      templateType: 'cooperation',
      fields: {
        partyA: '环球出版传媒',
        partyB: '陈静（英日翻译）',
        projectContent: '年度框架合作，提供商业文档、图书中英日互译服务',
        amount: 80000,
        startDate: '2026-06-01',
        endDate: '2027-05-31',
      },
      status: 'signed',
      currentVersion: 1,
      createdAt: '2026-05-28T16:45:00.000Z',
      updatedAt: '2026-06-02T11:00:00.000Z',
    },
  ],
  versions: [
    {
      id: 'v-0001-01',
      contractId: 'a1b2c3d4-0001-4000-8000-000000000001',
      versionNumber: 1,
      status: 'pending',
      snapshot: {
        templateType: 'labor_service',
        fields: {
          partyA: '星辰科技有限公司',
          partyB: '李明（自由设计师）',
          projectContent: '提供企业官网首页及内页共12个页面的UI设计服务',
          amount: 25000,
          startDate: '2026-06-20',
          endDate: '2026-08-15',
        },
        renderedHtml: '',
      },
      createdAt: '2026-06-15T09:00:00.000Z',
    },
    {
      id: 'v-0001-02',
      contractId: 'a1b2c3d4-0001-4000-8000-000000000001',
      versionNumber: 2,
      status: 'signed',
      signerA: '张经理',
      signerB: '李明',
      signatureA: '',
      signatureB: '',
      signedAt: '2026-06-17T14:30:00.000Z',
      snapshot: {
        templateType: 'labor_service',
        fields: {
          partyA: '星辰科技有限公司',
          partyB: '李明（自由设计师）',
          projectContent: '提供企业官网首页及内页共15个页面的UI设计服务，含3轮修改',
          amount: 28000,
          startDate: '2026-06-20',
          endDate: '2026-08-20',
        },
        renderedHtml: '',
      },
      createdAt: '2026-06-17T14:30:00.000Z',
    },
  ],
};

const db = new Low(new JSONFile(file), defaultData);
await db.read();
await db.write();

app.get('/api/contracts', async (req, res) => {
  await db.read();
  let contracts = [...db.data.contracts];
  const { status, q } = req.query;

  if (status) {
    contracts = contracts.filter((c) => c.status === status);
  }
  if (q) {
    const keyword = String(q).toLowerCase();
    contracts = contracts.filter(
      (c) =>
        c.title.toLowerCase().includes(keyword) ||
        c.fields.partyA.toLowerCase().includes(keyword) ||
        c.fields.partyB.toLowerCase().includes(keyword)
    );
  }
  res.json(contracts);
});

app.get('/api/contracts/:id', async (req, res) => {
  await db.read();
  const contract = db.data.contracts.find((c) => c.id === req.params.id);
  if (!contract) {
    return res.status(404).json({ error: '合同不存在' });
  }
  res.json(contract);
});

app.post('/api/contracts', async (req, res) => {
  await db.read();
  const { title, templateType, fields } = req.body;
  const now = new Date().toISOString();
  const newContract = {
    id: uuidv4(),
    title,
    templateType,
    fields,
    status: 'pending',
    currentVersion: 1,
    createdAt: now,
    updatedAt: now,
  };
  db.data.contracts.unshift(newContract);

  const initialVersion = {
    id: `v-${Date.now()}-1`,
    contractId: newContract.id,
    versionNumber: 1,
    status: 'pending',
    snapshot: {
      templateType,
      fields,
      renderedHtml: '',
    },
    createdAt: now,
  };
  db.data.versions.push(initialVersion);

  await db.write();
  res.status(201).json(newContract);
});

app.put('/api/contracts/:id', async (req, res) => {
  await db.read();
  const idx = db.data.contracts.findIndex((c) => c.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: '合同不存在' });
  }
  const old = db.data.contracts[idx];
  const nextVersion = old.currentVersion + 1;
  const now = new Date().toISOString();

  const updated = {
    ...old,
    ...req.body,
    status: req.body.status || (old.status === 'signed' ? 'updated' : old.status),
    currentVersion: nextVersion,
    updatedAt: now,
  };
  db.data.contracts[idx] = updated;

  const newVersion = {
    id: `v-${Date.now()}-${nextVersion}`,
    contractId: updated.id,
    versionNumber: nextVersion,
    status: updated.status,
    snapshot: {
      templateType: updated.templateType,
      fields: updated.fields,
      renderedHtml: '',
    },
    createdAt: now,
  };
  db.data.versions.push(newVersion);

  await db.write();
  res.json(updated);
});

app.delete('/api/contracts/:id', async (req, res) => {
  await db.read();
  const before = db.data.contracts.length;
  db.data.contracts = db.data.contracts.filter((c) => c.id !== req.params.id);
  db.data.versions = db.data.versions.filter((v) => v.contractId !== req.params.id);
  await db.write();

  if (db.data.contracts.length === before) {
    return res.status(404).json({ error: '合同不存在' });
  }
  res.json({ success: true });
});

app.get('/api/contracts/:id/versions', async (req, res) => {
  await db.read();
  const versions = db.data.versions
    .filter((v) => v.contractId === req.params.id)
    .sort((a, b) => a.versionNumber - b.versionNumber);
  res.json(versions);
});

app.get('/api/contracts/:id/versions/:vid', async (req, res) => {
  await db.read();
  const version = db.data.versions.find(
    (v) => v.id === req.params.vid && v.contractId === req.params.id
  );
  if (!version) {
    return res.status(404).json({ error: '版本不存在' });
  }
  res.json(version);
});

app.post('/api/contracts/:id/sign', async (req, res) => {
  await db.read();
  const idx = db.data.contracts.findIndex((c) => c.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: '合同不存在' });
  }

  const contract = db.data.contracts[idx];
  const nextVersion = contract.currentVersion + 1;
  const now = new Date().toISOString();
  const { signerA, signerB, signatureA, signatureB } = req.body;

  const bothSigned =
    (signatureA && signatureB) ||
    (contract.status === 'signed' && (signatureA || signatureB));

  const updatedStatus = bothSigned ? 'signed' : contract.status;

  const signedVersion = {
    id: `v-${Date.now()}-${nextVersion}`,
    contractId: contract.id,
    versionNumber: nextVersion,
    status: updatedStatus,
    signerA: signerA || contract.fields.partyA,
    signerB: signerB || contract.fields.partyB,
    signatureA,
    signatureB,
    signedAt: now,
    snapshot: {
      templateType: contract.templateType,
      fields: contract.fields,
      renderedHtml: '',
    },
    createdAt: now,
  };
  db.data.versions.push(signedVersion);

  db.data.contracts[idx] = {
    ...contract,
    status: updatedStatus,
    currentVersion: nextVersion,
    updatedAt: now,
  };

  await db.write();
  res.status(201).json(signedVersion);
});

app.listen(PORT, () => {
  console.log(`[Server] 合同管理后端服务运行于 http://localhost:${PORT}/api`);
});
