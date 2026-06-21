import express from 'express';
import cors from 'cors';
import type { Pet, Application, FollowUpRecord, AdoptionRecord, ApplicationStatus } from './types';
import { getMatchesForPet } from './matchingEngine';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

let pets: Pet[] = [
  {
    id: '1',
    name: '橘子',
    breed: '橘猫',
    age: 2,
    health: '已绝育、已驱虫、疫苗齐全',
    personality: ['亲人', '活泼', '爱玩'],
    mainImage: 'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=400',
    images: [
      'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=400',
      'https://images.unsplash.com/photo-1543852786-1cf6624b9987?w=400',
      'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400'
    ],
    description: '橘子是一只非常亲人的橘猫，喜欢撒娇和玩逗猫棒。',
    adoptable: true,
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    name: '豆豆',
    breed: '金毛犬',
    age: 1,
    health: '已驱虫、疫苗齐全',
    personality: ['活泼', '亲人', '爱玩'],
    mainImage: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=400',
    images: [
      'https://images.unsplash.com/photo-1552053831-71594a27632d?w=400',
      'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400'
    ],
    description: '豆豆是一只活泼的小金毛，需要大量运动和陪伴。',
    adoptable: true,
    createdAt: new Date().toISOString()
  },
  {
    id: '3',
    name: '小黑',
    breed: '中华田园猫',
    age: 3,
    health: '已绝育、已驱虫、疫苗齐全',
    personality: ['独立', '安静', '胆小'],
    mainImage: 'https://images.unsplash.com/photo-1495360010541-f48722b34f7d?w=400',
    images: [
      'https://images.unsplash.com/photo-1495360010541-f48722b34f7d?w=400'
    ],
    description: '小黑比较胆小，需要耐心慢慢建立信任。',
    adoptable: true,
    createdAt: new Date().toISOString()
  },
  {
    id: '4',
    name: '雪球',
    breed: '萨摩耶',
    age: 2,
    health: '已绝育、已驱虫、疫苗齐全',
    personality: ['亲人', '活泼', '爱玩'],
    mainImage: 'https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=400',
    images: [
      'https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=400',
      'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=400',
      'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400'
    ],
    description: '雪球是一只温顺的萨摩耶，非常喜欢和人互动。',
    adoptable: true,
    createdAt: new Date().toISOString()
  },
  {
    id: '5',
    name: '咪咪',
    breed: '布偶猫',
    age: 1,
    health: '已驱虫、疫苗齐全',
    personality: ['安静', '亲人', '独立'],
    mainImage: 'https://images.unsplash.com/photo-1592194996308-7b43878e84a6?w=400',
    images: [
      'https://images.unsplash.com/photo-1592194996308-7b43878e84a6?w=400'
    ],
    description: '咪咪性格温柔，喜欢安静的环境。',
    adoptable: true,
    createdAt: new Date().toISOString()
  },
  {
    id: '6',
    name: '旺财',
    breed: '拉布拉多',
    age: 4,
    health: '已绝育、已驱虫、疫苗齐全',
    personality: ['活泼', '爱玩', '亲人'],
    mainImage: 'https://images.unsplash.com/photo-1579213838058-5e8cb97caf8e?w=400',
    images: [
      'https://images.unsplash.com/photo-1579213838058-5e8cb97caf8e?w=400',
      'https://images.unsplash.com/photo-1601979031925-424e53b6caaa?w=400'
    ],
    description: '旺财非常聪明，已经学会了很多指令。',
    adoptable: true,
    createdAt: new Date().toISOString()
  }
];

let applications: Application[] = [
  {
    id: 'a1',
    petId: '1',
    applicantName: '张三',
    contact: '13800138001',
    housingType: '独栋',
    hasOtherPets: false,
    dailyCompanionHours: 4,
    livingEnvImages: ['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400'],
    status: '通过',
    createdAt: new Date().toISOString()
  },
  {
    id: 'a2',
    petId: '1',
    applicantName: '李四',
    contact: '13800138002',
    housingType: '公寓',
    hasOtherPets: true,
    dailyCompanionHours: 2,
    livingEnvImages: ['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400'],
    status: '通过',
    createdAt: new Date().toISOString()
  },
  {
    id: 'a3',
    petId: '2',
    applicantName: '王五',
    contact: '13800138003',
    housingType: '独栋',
    hasOtherPets: false,
    dailyCompanionHours: 5,
    livingEnvImages: ['https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=400'],
    status: '待审核',
    createdAt: new Date().toISOString()
  }
];

let adoptionRecords: AdoptionRecord[] = [];
let followUpRecords: FollowUpRecord[] = [];

function generateId(prefix: string): string {
  return `${prefix}${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

app.get('/api/pets', (_req, res) => {
  res.json(pets);
});

app.post('/api/pets', (req, res) => {
  const petData = req.body as Omit<Pet, 'id' | 'createdAt'>;
  const newPet: Pet = {
    ...petData,
    id: generateId('pet_'),
    createdAt: new Date().toISOString()
  };
  pets.push(newPet);
  res.json(newPet);
});

app.get('/api/applications', (_req, res) => {
  res.json(applications);
});

app.post('/api/applications', (req, res) => {
  const appData = req.body as Omit<Application, 'id' | 'status' | 'createdAt'>;
  const newApp: Application = {
    ...appData,
    id: generateId('app_'),
    status: '待审核',
    createdAt: new Date().toISOString()
  };
  applications.push(newApp);
  res.json(newApp);
});

app.patch('/api/applications/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body as { status: ApplicationStatus };
  const appIndex = applications.findIndex(a => a.id === id);

  if (appIndex === -1) {
    res.status(404).json({ error: '申请不存在' });
    return;
  }

  applications[appIndex].status = status;
  res.json(applications[appIndex]);
});

app.get('/api/matches/:petId', (req, res) => {
  const { petId } = req.params;
  const matches = getMatchesForPet(petId, pets, applications);
  res.json(matches);
});

app.post('/api/adoptions', (req, res) => {
  const { applicationId, petId } = req.body as { applicationId: string; petId: string };
  const application = applications.find(a => a.id === applicationId);
  const pet = pets.find(p => p.id === petId);

  if (!application || !pet) {
    res.status(404).json({ error: '申请或宠物不存在' });
    return;
  }

  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + 30);

  const record: AdoptionRecord = {
    id: generateId('adopt_'),
    applicationId,
    petId,
    applicantName: application.applicantName,
    petName: pet.name,
    adoptedAt: new Date().toISOString(),
    followUps: [],
    archived: false,
    nextFollowUpDate: nextDate.toISOString()
  };

  adoptionRecords.push(record);
  application.matched = true;

  const petIndex = pets.findIndex(p => p.id === petId);
  if (petIndex !== -1) {
    pets[petIndex].adoptable = false;
  }

  res.json(record);
});

app.get('/api/adoptions', (_req, res) => {
  res.json(adoptionRecords);
});

app.get('/api/adoptions/reminders', (_req, res) => {
  const now = new Date();
  const reminders = adoptionRecords.filter(record => {
    if (record.archived) return false;
    const nextDate = new Date(record.nextFollowUpDate);
    return nextDate <= now;
  });
  res.json(reminders);
});

app.post('/api/followups', (req, res) => {
  const followUpData = req.body as Omit<FollowUpRecord, 'id'>;
  const newFollowUp: FollowUpRecord = {
    ...followUpData,
    id: generateId('fu_')
  };
  followUpRecords.push(newFollowUp);

  const recordIndex = adoptionRecords.findIndex(r => r.id === followUpData.applicationId || r.applicationId === followUpData.applicationId);
  if (recordIndex !== -1) {
    adoptionRecords[recordIndex].followUps.push(newFollowUp);

    if (adoptionRecords[recordIndex].followUps.length >= 3) {
      adoptionRecords[recordIndex].archived = true;
    } else {
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + 30);
      adoptionRecords[recordIndex].nextFollowUpDate = nextDate.toISOString();
    }
  }

  res.json(newFollowUp);
});

app.get('/api/followups/:applicationId', (req, res) => {
  const { applicationId } = req.params;
  const records = followUpRecords.filter(f => f.applicationId === applicationId);
  res.json(records);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
