import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express';
import cors from 'cors';
import type { Pet, Application, FollowUp, FollowUpReminder } from '../../shared/types.js';
import { findMatchesForPet } from './matchingEngine.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const pets: Pet[] = [
  {
    id: 'pet-1',
    name: '小橘',
    breed: '中华田园猫',
    age: 2,
    healthStatus: '健康，已绝育',
    personalityTags: ['亲人', '活泼'],
    mainImage: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=orange%20tabby%20cat%20sitting%20on%20a%20warm%20blanket%20looking%20friendly%20and%20cute&image_size=square',
    subImages: [
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=orange%20cat%20playing%20with%20a%20feather%20toy&image_size=square',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=orange%20cat%20sleeping%20curled%20up%20on%20a%20cushion&image_size=square',
    ],
    createdAt: '2025-01-15T10:00:00Z',
  },
  {
    id: 'pet-2',
    name: '大黄',
    breed: '金毛寻回犬',
    age: 3,
    healthStatus: '健康，已免疫',
    personalityTags: ['活泼', '亲人'],
    mainImage: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=golden%20retriever%20dog%20running%20in%20a%20park%20happy%20and%20energetic&image_size=square',
    subImages: [
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=golden%20retriever%20playing%20fetch%20with%20a%20ball&image_size=square',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=golden%20retriever%20sitting%20with%20family&image_size=square',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=golden%20retriever%20swimming%20in%20a%20lake&image_size=square',
    ],
    createdAt: '2025-02-01T08:00:00Z',
  },
  {
    id: 'pet-3',
    name: '小花',
    breed: '英短蓝猫',
    age: 1,
    healthStatus: '健康，已驱虫',
    personalityTags: ['安静', '胆小'],
    mainImage: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=british%20shorthair%20blue%20cat%20sitting%20calmly%20on%20a%20sofa&image_size=square',
    subImages: [
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=british%20shorthair%20cat%20hiding%20under%20a%20bed%20shy&image_size=square',
    ],
    createdAt: '2025-03-10T14:00:00Z',
  },
  {
    id: 'pet-4',
    name: '旺财',
    breed: '柴犬',
    age: 4,
    healthStatus: '健康，已绝育',
    personalityTags: ['活泼'],
    mainImage: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=shiba%20inu%20dog%20smiling%20happily%20outdoors&image_size=square',
    subImages: [
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=shiba%20inu%20playing%20in%20the%20snow&image_size=square',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=shiba%20inu%20walking%20on%20a%20leash%20in%20park&image_size=square',
    ],
    createdAt: '2025-04-05T09:00:00Z',
  },
  {
    id: 'pet-5',
    name: '咪咪',
    breed: '布偶猫',
    age: 2,
    healthStatus: '健康，已免疫',
    personalityTags: ['亲人', '安静'],
    mainImage: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=ragdoll%20cat%20with%20blue%20eyes%20sitting%20elegantly&image_size=square',
    subImages: [
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=ragdoll%20cat%20being%20petted%20by%20a%20person&image_size=square',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=ragdoll%20cat%20lounging%20on%20a%20window%20sill&image_size=square',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=ragdoll%20cat%20sleeping%20peacefully&image_size=square',
    ],
    createdAt: '2025-05-20T11:00:00Z',
  },
  {
    id: 'pet-6',
    name: '豆豆',
    breed: '泰迪犬',
    age: 1,
    healthStatus: '健康，已驱虫',
    personalityTags: ['活泼', '亲人'],
    mainImage: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=toy%20poodle%20dog%20standing%20cutely%20with%20fluffy%20fur&image_size=square',
    subImages: [
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=toy%20poodle%20getting%20groomed&image_size=square',
    ],
    createdAt: '2025-06-01T15:00:00Z',
  },
];

const applications: Application[] = [
  {
    id: 'app-1',
    petId: 'pet-1',
    applicantName: '张小明',
    contactInfo: '13800138001',
    housingType: 'apartment',
    hasOtherPets: false,
    dailyCompanionHours: 3,
    environmentImages: [
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=cozy%20apartment%20living%20room%20with%20cat%20tree&image_size=landscape_4_3',
    ],
    status: 'pending',
    createdAt: '2025-06-01T10:00:00Z',
  },
  {
    id: 'app-2',
    petId: 'pet-1',
    applicantName: '李芳',
    contactInfo: '13900139002',
    housingType: 'house',
    hasOtherPets: true,
    dailyCompanionHours: 5,
    environmentImages: [
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=spacious%20house%20yard%20with%20garden&image_size=landscape_4_3',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=house%20interior%20with%20pet%20corner&image_size=landscape_4_3',
    ],
    status: 'pending',
    createdAt: '2025-06-02T14:00:00Z',
  },
  {
    id: 'app-3',
    petId: 'pet-2',
    applicantName: '王大伟',
    contactInfo: '13700137003',
    housingType: 'house',
    hasOtherPets: false,
    dailyCompanionHours: 4,
    environmentImages: [
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=large%20house%20with%20fenced%20backyard%20for%20dog&image_size=landscape_4_3',
    ],
    status: 'pending',
    createdAt: '2025-06-03T09:00:00Z',
  },
  {
    id: 'app-4',
    petId: 'pet-3',
    applicantName: '赵静',
    contactInfo: '13600136004',
    housingType: 'apartment',
    hasOtherPets: false,
    dailyCompanionHours: 6,
    environmentImages: [
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=quiet%20apartment%20with%20cozy%20cat%20corner&image_size=landscape_4_3',
    ],
    status: 'pending',
    createdAt: '2025-06-04T16:00:00Z',
  },
  {
    id: 'app-5',
    petId: 'pet-2',
    applicantName: '陈晓红',
    contactInfo: '13500135005',
    housingType: 'apartment',
    hasOtherPets: true,
    dailyCompanionHours: 2,
    environmentImages: [
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=apartment%20living%20room%20with%20small%20dog%20bed&image_size=landscape_4_3',
    ],
    status: 'approved',
    createdAt: '2025-05-15T11:00:00Z',
  },
];

const followUps: FollowUp[] = [
  {
    id: 'fu-1',
    applicationId: 'app-5',
    description: '大黄适应很好，和新主人相处融洽',
    rating: 5,
    createdAt: '2025-06-15T10:00:00Z',
    isArchived: false,
  },
  {
    id: 'fu-2',
    applicationId: 'app-5',
    description: '大黄食欲正常，每天散步两次',
    rating: 4,
    createdAt: '2025-07-15T10:00:00Z',
    isArchived: false,
  },
];

let idCounter = 100;
function generateId(prefix: string): string {
  idCounter++;
  return `${prefix}-${idCounter}`;
}

app.get('/api/pets', (_req: Request, res: Response) => {
  res.json(pets);
});

app.post('/api/pets', (req: Request, res: Response) => {
  const pet: Pet = {
    id: generateId('pet'),
    name: req.body.name || '',
    breed: req.body.breed || '',
    age: req.body.age || 0,
    healthStatus: req.body.healthStatus || '',
    personalityTags: (req.body.personalityTags || []).slice(0, 3),
    mainImage: req.body.mainImage || '',
    subImages: (req.body.subImages || []).slice(0, 3),
    createdAt: new Date().toISOString(),
  };
  pets.push(pet);
  res.status(201).json(pet);
});

app.get('/api/pets/:id', (req: Request, res: Response) => {
  const pet = pets.find((p) => p.id === req.params.id);
  if (!pet) {
    res.status(404).json({ error: 'Pet not found' });
    return;
  }
  res.json(pet);
});

app.post('/api/applications', (req: Request, res: Response) => {
  const application: Application = {
    id: generateId('app'),
    petId: req.body.petId || '',
    applicantName: req.body.applicantName || '',
    contactInfo: req.body.contactInfo || '',
    housingType: req.body.housingType || 'apartment',
    hasOtherPets: req.body.hasOtherPets || false,
    dailyCompanionHours: req.body.dailyCompanionHours || 0,
    environmentImages: (req.body.environmentImages || []).slice(0, 2),
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  applications.push(application);
  res.status(201).json(application);
});

app.get('/api/applications', (_req: Request, res: Response) => {
  res.json(applications);
});

app.put('/api/applications/:id', (req: Request, res: Response) => {
  const idx = applications.findIndex((a) => a.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: 'Application not found' });
    return;
  }
  const status = req.body.status as 'pending' | 'approved' | 'rejected';
  if (status) {
    applications[idx] = { ...applications[idx], status };
  }
  res.json(applications[idx]);
});

app.get('/api/matches/:petId', (req: Request, res: Response) => {
  const pet = pets.find((p) => p.id === req.params.petId);
  if (!pet) {
    res.status(404).json({ error: 'Pet not found' });
    return;
  }
  const matches = findMatchesForPet(pet, applications);
  res.json(matches);
});

app.post('/api/followups', (req: Request, res: Response) => {
  const appId = req.body.applicationId;
  const existingFollowUps = followUps.filter((f) => f.applicationId === appId);
  const shouldArchive = existingFollowUps.length >= 2;

  const followUp: FollowUp = {
    id: generateId('fu'),
    applicationId: appId,
    description: req.body.description || '',
    rating: req.body.rating || 3,
    createdAt: new Date().toISOString(),
    isArchived: shouldArchive,
  };

  if (shouldArchive) {
    followUps.forEach((f) => {
      if (f.applicationId === appId) {
        f.isArchived = true;
      }
    });
  }

  followUps.push(followUp);
  res.status(201).json(followUp);
});

app.get('/api/followups', (_req: Request, res: Response) => {
  res.json(followUps);
});

app.get('/api/followups/reminders', (_req: Request, res: Response) => {
  const approvedApps = applications.filter((a) => a.status === 'approved');
  const reminders: FollowUpReminder[] = [];

  for (const app of approvedApps) {
    const pet = pets.find((p) => p.id === app.petId);
    const appFollowUps = followUps.filter((f) => f.applicationId === app.id);
    const hasArchived = appFollowUps.some((f) => f.isArchived);
    if (hasArchived) continue;

    const lastFollowUp = appFollowUps.length > 0
      ? appFollowUps.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
      : null;

    const adoptionDate = new Date(app.createdAt);
    const now = new Date();
    const daysSinceAdoption = Math.floor((now.getTime() - adoptionDate.getTime()) / (1000 * 60 * 60 * 24));

    const lastFollowUpDate = lastFollowUp ? lastFollowUp.createdAt : null;
    const needsFollowUp = !lastFollowUp
      || (() => {
        const lastDate = new Date(lastFollowUp.createdAt);
        const daysSinceLast = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        return daysSinceLast >= 30;
      })();

    if (needsFollowUp) {
      reminders.push({
        applicationId: app.id,
        petName: pet?.name || '未知',
        applicantName: app.applicantName,
        lastFollowUpDate,
        daysSinceAdoption,
      });
    }
  }

  res.json(reminders);
});

app.use('/api/health', (_req: Request, res: Response) => {
  res.json({ success: true, message: 'ok' });
});

app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(error);
  res.status(500).json({ success: false, error: 'Server internal error' });
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'API not found' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server ready on port ${PORT}`);
});
