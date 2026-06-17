import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 5000;

app.use(cors());
app.use(bodyParser.json());

let packages = [];

const generatePickupCode = () => {
  let code;
  do {
    code = Math.floor(100000 + Math.random() * 900000).toString();
  } while (packages.some(p => p.pickupCode === code && p.status === 'pending'));
  return code;
};

const checkOverduePackages = () => {
  const now = Date.now();
  const twentyFourHours = 24 * 60 * 60 * 1000;
  packages = packages.map(pkg => {
    if (pkg.status === 'pending' && now - pkg.createdAt > twentyFourHours) {
      return { ...pkg, status: 'overdue' };
    }
    return pkg;
  });
};

app.get('/api/packages', (req, res) => {
  checkOverduePackages();

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const status = req.query.status;

  let filteredPackages = [...packages];

  if (status) {
    filteredPackages = filteredPackages.filter(pkg => pkg.status === status);
  }

  filteredPackages.sort((a, b) => b.createdAt - a.createdAt);

  const total = filteredPackages.length;
  const totalPages = Math.ceil(total / limit);
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedPackages = filteredPackages.slice(startIndex, endIndex);

  res.json({
    data: paginatedPackages,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  });
});

app.post('/api/packages', (req, res) => {
  try {
    const { recipientName, phone, courierCompany, remark } = req.body;

    if (!recipientName || !phone || !courierCompany) {
      return res.status(400).json({ error: '缺少必填字段' });
    }

    const pickupCode = generatePickupCode();
    const newPackage = {
      id: uuidv4(),
      recipientName,
      phone,
      courierCompany,
      remark: remark || '',
      pickupCode,
      status: 'pending',
      createdAt: Date.now(),
      pickedAt: null
    };

    packages.push(newPackage);
    res.json({
      id: newPackage.id,
      pickupCode: newPackage.pickupCode,
      status: newPackage.status,
      createdAt: newPackage.createdAt
    });
  } catch (error) {
    res.status(500).json({ error: '创建包裹失败' });
  }
});

app.post('/api/claim', (req, res) => {
  try {
    const { pickupCode } = req.body;

    if (!pickupCode) {
      return res.status(400).json({ error: '请输入取件码' });
    }

    checkOverduePackages();

    const pkgIndex = packages.findIndex(p => p.pickupCode === pickupCode);

    if (pkgIndex === -1) {
      return res.status(404).json({ error: '取件码无效' });
    }

    const pkg = packages[pkgIndex];

    if (pkg.status === 'overdue') {
      return res.status(400).json({ error: '包裹已超时，无法取件' });
    }

    if (pkg.status === 'picked') {
      return res.status(400).json({ error: '包裹已被取走' });
    }

    packages[pkgIndex] = {
      ...pkg,
      status: 'picked',
      pickedAt: Date.now()
    };

    res.json({
      success: true,
      message: '取件成功',
      package: packages[pkgIndex]
    });
  } catch (error) {
    res.status(500).json({ error: '取件失败' });
  }
});

setInterval(checkOverduePackages, 30000);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
