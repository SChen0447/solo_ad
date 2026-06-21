import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3002;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(cors());
app.use(express.json());

function readData() {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    return getInitialData();
  }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function getInitialData() {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(today);
  dayAfter.setDate(dayAfter.getDate() + 2);

  const formatDate = (date) => date.toISOString().split('T')[0];

  return {
    services: [
      {
        id: 'svc-1',
        name: '基础洗护',
        category: 'wash',
        price: 88,
        duration: 60,
        description: '包含洗澡、吹干、梳毛、指甲修剪',
      },
      {
        id: 'svc-2',
        name: '造型修剪',
        category: 'cut',
        price: 168,
        duration: 120,
        description: '专业造型设计，根据品种特点修剪',
      },
      {
        id: 'svc-3',
        name: 'SPA护理',
        category: 'spa',
        price: 128,
        duration: 90,
        description: '深层清洁、精油按摩、皮毛养护',
      },
      {
        id: 'svc-4',
        name: '药浴治疗',
        category: 'wash',
        price: 158,
        duration: 75,
        description: '针对皮肤病的药浴治疗',
      },
      {
        id: 'svc-5',
        name: '泰迪造型',
        category: 'cut',
        price: 198,
        duration: 150,
        description: '泰迪专属可爱造型设计',
      },
      {
        id: 'svc-6',
        name: '芳香SPA',
        category: 'spa',
        price: 188,
        duration: 120,
        description: '高端芳香精油SPA护理体验',
      },
    ],
    customers: [
      {
        id: 'cust-1',
        name: '张小明',
        phone: '13800138001',
        pets: [
          {
            id: 'pet-1',
            name: '豆豆',
            breed: '泰迪',
            weight: 3.5,
            birthday: '2022-03-15',
            allergies: '无',
            notes: '性格温顺，喜欢被摸头',
            coatColor: 'light',
          },
          {
            id: 'pet-2',
            name: '花花',
            breed: '博美',
            weight: 2.8,
            birthday: '2023-01-20',
            allergies: '海鲜过敏',
            notes: '有点怕生，需要慢慢熟悉',
            coatColor: 'mixed',
          },
        ],
      },
      {
        id: 'cust-2',
        name: '李大华',
        phone: '13800138002',
        pets: [
          {
            id: 'pet-3',
            name: '大黑',
            breed: '金毛',
            weight: 28.5,
            birthday: '2020-08-10',
            allergies: '无',
            notes: '活泼好动，需要大量运动',
            coatColor: 'dark',
          },
        ],
      },
      {
        id: 'cust-3',
        name: '王小美',
        phone: '13800138003',
        pets: [
          {
            id: 'pet-4',
            name: '雪球',
            breed: '比熊',
            weight: 4.2,
            birthday: '2021-12-25',
            allergies: '无',
            notes: '爱干净，很听话',
            coatColor: 'light',
          },
        ],
      },
    ],
    appointments: [
      {
        id: 'apt-1',
        customerId: 'cust-1',
        petId: 'pet-1',
        serviceId: 'svc-2',
        date: formatDate(today),
        startTime: '10:00',
        status: 'completed',
      },
      {
        id: 'apt-2',
        customerId: 'cust-2',
        petId: 'pet-3',
        serviceId: 'svc-1',
        date: formatDate(today),
        startTime: '14:00',
        status: 'pending',
      },
      {
        id: 'apt-3',
        customerId: 'cust-1',
        petId: 'pet-2',
        serviceId: 'svc-3',
        date: formatDate(tomorrow),
        startTime: '09:30',
        status: 'pending',
      },
      {
        id: 'apt-4',
        customerId: 'cust-3',
        petId: 'pet-4',
        serviceId: 'svc-5',
        date: formatDate(tomorrow),
        startTime: '13:00',
        status: 'pending',
      },
      {
        id: 'apt-5',
        customerId: 'cust-2',
        petId: 'pet-3',
        serviceId: 'svc-6',
        date: formatDate(dayAfter),
        startTime: '11:00',
        status: 'pending',
      },
    ],
    serviceRecords: [
      {
        id: 'rec-1',
        petId: 'pet-1',
        serviceId: 'svc-2',
        date: formatDate(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)),
        notes: '造型完成，客户满意',
      },
      {
        id: 'rec-2',
        petId: 'pet-1',
        serviceId: 'svc-1',
        date: formatDate(new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000)),
        notes: '常规洗护',
      },
      {
        id: 'rec-3',
        petId: 'pet-1',
        serviceId: 'svc-3',
        date: formatDate(new Date(today.getTime() - 21 * 24 * 60 * 60 * 1000)),
        notes: '首次SPA体验',
      },
      {
        id: 'rec-4',
        petId: 'pet-3',
        serviceId: 'svc-1',
        date: formatDate(new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000)),
        notes: '金毛洗护，掉毛较多',
      },
    ],
  };
}

app.get('/api/services', (req, res) => {
  const data = readData();
  res.json(data.services);
});

app.post('/api/services', (req, res) => {
  const data = readData();
  const newService = {
    id: uuidv4(),
    ...req.body,
  };
  data.services.push(newService);
  writeData(data);
  res.status(201).json(newService);
});

app.put('/api/services/:id', (req, res) => {
  const data = readData();
  const index = data.services.findIndex((s) => s.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: '服务项目不存在' });
  }
  data.services[index] = { ...data.services[index], ...req.body };
  writeData(data);
  res.json(data.services[index]);
});

app.delete('/api/services/:id', (req, res) => {
  const data = readData();
  data.services = data.services.filter((s) => s.id !== req.params.id);
  writeData(data);
  res.json({ message: '删除成功' });
});

app.get('/api/customers', (req, res) => {
  const data = readData();
  res.json(data.customers);
});

app.get('/api/customers/:id', (req, res) => {
  const data = readData();
  const customer = data.customers.find((c) => c.id === req.params.id);
  if (!customer) {
    return res.status(404).json({ error: '客户不存在' });
  }
  res.json(customer);
});

app.post('/api/customers', (req, res) => {
  const data = readData();
  const newCustomer = {
    id: uuidv4(),
    ...req.body,
    pets: req.body.pets || [],
  };
  data.customers.push(newCustomer);
  writeData(data);
  res.status(201).json(newCustomer);
});

app.put('/api/customers/:id', (req, res) => {
  const data = readData();
  const index = data.customers.findIndex((c) => c.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: '客户不存在' });
  }
  data.customers[index] = { ...data.customers[index], ...req.body };
  writeData(data);
  res.json(data.customers[index]);
});

app.post('/api/customers/:id/pets', (req, res) => {
  const data = readData();
  const customerIndex = data.customers.findIndex((c) => c.id === req.params.id);
  if (customerIndex === -1) {
    return res.status(404).json({ error: '客户不存在' });
  }
  const newPet = {
    id: uuidv4(),
    ...req.body,
  };
  data.customers[customerIndex].pets.push(newPet);
  writeData(data);
  res.status(201).json(newPet);
});

app.put('/api/customers/:id/pets/:petId', (req, res) => {
  const data = readData();
  const customerIndex = data.customers.findIndex((c) => c.id === req.params.id);
  if (customerIndex === -1) {
    return res.status(404).json({ error: '客户不存在' });
  }
  const petIndex = data.customers[customerIndex].pets.findIndex(
    (p) => p.id === req.params.petId
  );
  if (petIndex === -1) {
    return res.status(404).json({ error: '宠物不存在' });
  }
  data.customers[customerIndex].pets[petIndex] = {
    ...data.customers[customerIndex].pets[petIndex],
    ...req.body,
  };
  writeData(data);
  res.json(data.customers[customerIndex].pets[petIndex]);
});

app.get('/api/appointments', (req, res) => {
  const data = readData();
  const { date, customerId } = req.query;
  let appointments = data.appointments;
  if (date) {
    appointments = appointments.filter((a) => a.date === date);
  }
  if (customerId) {
    appointments = appointments.filter((a) => a.customerId === customerId);
  }
  res.json(appointments);
});

app.get('/api/appointments/:id', (req, res) => {
  const data = readData();
  const appointment = data.appointments.find((a) => a.id === req.params.id);
  if (!appointment) {
    return res.status(404).json({ error: '预约不存在' });
  }
  res.json(appointment);
});

app.post('/api/appointments', (req, res) => {
  const data = readData();
  const { date, startTime, serviceId } = req.body;

  const service = data.services.find((s) => s.id === serviceId);
  if (!service) {
    return res.status(400).json({ error: '服务项目不存在' });
  }

  const durationMinutes = service.duration;
  const [startHour, startMin] = startTime.split(':').map(Number);
  const startTotal = startHour * 60 + startMin;
  const endTotal = startTotal + durationMinutes;

  const dayAppointments = data.appointments.filter(
    (a) => a.date === date && a.status !== 'cancelled'
  );

  for (const apt of dayAppointments) {
    const aptService = data.services.find((s) => s.id === apt.serviceId);
    if (!aptService) continue;
    const [aptHour, aptMin] = apt.startTime.split(':').map(Number);
    const aptStart = aptHour * 60 + aptMin;
    const aptEnd = aptStart + aptService.duration;

    if (startTotal < aptEnd && endTotal > aptStart) {
      return res.status(409).json({ error: '时间冲突', conflictId: apt.id });
    }
  }

  const newAppointment = {
    id: uuidv4(),
    ...req.body,
    status: 'pending',
  };
  data.appointments.push(newAppointment);
  writeData(data);
  res.status(201).json(newAppointment);
});

app.put('/api/appointments/:id', (req, res) => {
  const data = readData();
  const index = data.appointments.findIndex((a) => a.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: '预约不存在' });
  }
  data.appointments[index] = { ...data.appointments[index], ...req.body };
  writeData(data);
  res.json(data.appointments[index]);
});

app.delete('/api/appointments/:id', (req, res) => {
  const data = readData();
  data.appointments = data.appointments.filter((a) => a.id !== req.params.id);
  writeData(data);
  res.json({ message: '删除成功' });
});

app.get('/api/pets/:id/service-records', (req, res) => {
  const data = readData();
  const records = data.serviceRecords
    .filter((r) => r.petId === req.params.id)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 3);
  const recordsWithService = records.map((r) => ({
    ...r,
    service: data.services.find((s) => s.id === r.serviceId),
  }));
  res.json(recordsWithService);
});

app.get('/api/dashboard/stats', (req, res) => {
  const data = readData();
  const today = new Date().toISOString().split('T')[0];

  const todayAppointments = data.appointments.filter(
    (a) => a.date === today && a.status !== 'cancelled'
  );

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const weekAppointments = data.appointments.filter((a) => {
    const aptDate = new Date(a.date);
    return aptDate >= weekStart && aptDate <= weekEnd && a.status === 'completed';
  });

  const weekRevenue = weekAppointments.reduce((sum, apt) => {
    const service = data.services.find((s) => s.id === apt.serviceId);
    return sum + (service ? service.price : 0);
  }, 0);

  const pendingCount = data.appointments.filter((a) => a.status === 'pending').length;

  const totalCustomers = data.customers.length;

  res.json({
    todayAppointments: todayAppointments.length,
    weekRevenue,
    pendingCount,
    totalCustomers,
    todayAppointmentsGrowth: 12,
    weekRevenueGrowth: 8.5,
    pendingCountGrowth: -5,
    totalCustomersGrowth: 15,
  });
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
