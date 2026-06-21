interface Artist {
  id: number;
  name: string;
  style: string;
  avatar: string;
  description: string;
  materials: string[];
  works: string[];
}

interface BookedSlot {
  date: string;
  time: string;
}

interface Appointment extends BookedSlot {
  id: number;
  artistId: number;
  visitorName: string;
  phone: string;
}

let artists: Artist[] = [];
let appointments: Appointment[] = [];
let nextAppointmentId = 1;

export function initDatabase(): Promise<void> {
  return new Promise((resolve) => {
    artists = [
      {
        id: 1,
        name: '林青瓷',
        style: '陶瓷',
        avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=portrait%20of%20a%20female%20potter%20artist%20with%20gentle%20smile%20natural%20light&image_size=square',
        description: '专注手工陶瓷创作十五年，擅长釉下彩和青瓷烧制，每件作品都融入了对自然和生活的热爱。作品风格温润典雅，曾多次参加国内外陶艺展览。',
        materials: ['青瓷', '釉下彩', '陶土', '高岭土'],
        works: [
          'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=handmade%20celadon%20ceramic%20tea%20set%20elegant%20photography&image_size=square',
          'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=blue%20and%20white%20porcelain%20vase%20handcrafted%20artistic&image_size=square',
          'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=ceramic%20bowl%20with%20floral%20pattern%20pottery%20art&image_size=square',
          'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=hand%20thrown%20pottery%20mug%20earth%20tones%20craftsmanship&image_size=square'
        ]
      },
      {
        id: 2,
        name: '张木匠',
        style: '木工',
        avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=portrait%20of%20a%20male%20woodworker%20craftsman%20with%20beard%20warm%20light&image_size=square',
        description: '传统木艺传承人，精通榫卯结构，坚持使用天然木材和环保涂料。致力于将传统工艺与现代设计相结合，创造实用而美观的木作精品。',
        materials: ['胡桃木', '橡木', '榉木', '天然漆'],
        works: [
          'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=handcrafted%20wooden%20furniture%20walnut%20table%20minimalist&image_size=square',
          'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=wooden%20jewelry%20box%20hand%20carved%20artisan&image_size=square',
          'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=oak%20cutting%20board%20wood%20grain%20kitchenware&image_size=square',
          'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=wooden%20lamp%20design%20craftsmanship%20warm%20light&image_size=square'
        ]
      },
      {
        id: 3,
        name: '苏织娘',
        style: '织物',
        avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=portrait%20of%20a%20female%20textile%20artist%20with%20colorful%20yarn%20soft%20light&image_size=square',
        description: '苏绣非遗传承人，擅长刺绣和植物染。从艺二十余年，作品多次获得国家级工艺美术奖项。每一件作品都倾注心血，传承千年织造技艺。',
        materials: ['蚕丝', '棉麻', '植物染料', '金线'],
        works: [
          'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=traditional%20chinese%20embroidery%20silk%20floral%20pattern&image_size=square',
          'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=hand%20woven%20scarf%20natural%20dye%20textile%20art&image_size=square',
          'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=embroidered%20handbag%20vintage%20style%20craftsmanship&image_size=square',
          'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=plant%20dyed%20fabric%20indigo%20textile%20artisan&image_size=square'
        ]
      },
      {
        id: 4,
        name: '陈铁匠',
        style: '金属',
        avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=portrait%20of%20a%20male%20blacksmith%20artist%20strong%20hands%20industrial&image_size=square',
        description: '金属工艺师，专注铁艺和银饰制作。师从国家级非遗大师，精通传统锻打和錾刻工艺。作品既有传统韵味，又不失现代美感。',
        materials: ['银', '铁', '铜', '珐琅'],
        works: [
          'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=handcrafted%20silver%20jewelry%20necklace%20artisan&image_size=square',
          'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=iron%20sculpture%20metal%20art%20hand%20forged&image_size=square',
          'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=copper%20teapot%20handmade%20metal%20craft&image_size=square',
          'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=enamel%20brooch%20colorful%20metalwork%20artistic&image_size=square'
        ]
      }
    ];
    appointments = [];
    nextAppointmentId = 1;
    resolve();
  });
}

export function getAllArtists(): Promise<Artist[]> {
  return new Promise((resolve) => {
    resolve([...artists]);
  });
}

export function getArtistById(id: number): Promise<any> {
  return new Promise((resolve) => {
    const artist = artists.find((a) => a.id === id);
    if (!artist) {
      resolve(null);
      return;
    }
    const bookedSlots = appointments
      .filter((a) => a.artistId === id)
      .map((a) => ({ date: a.date, time: a.time }));
    resolve({
      ...artist,
      bookedSlots
    });
  });
}

export function createAppointment(
  artistId: number,
  date: string,
  time: string,
  visitorName: string,
  phone: string
): Promise<any> {
  return new Promise((resolve, reject) => {
    const existing = appointments.find(
      (a) => a.artistId === artistId && a.date === date && a.time === time
    );
    if (existing) {
      reject(new Error('该时间段已被预约'));
      return;
    }
    const appointment: Appointment = {
      id: nextAppointmentId++,
      artistId,
      date,
      time,
      visitorName,
      phone
    };
    appointments.push(appointment);
    resolve(appointment);
  });
}

export function searchArtists(keyword: string): Promise<Artist[]> {
  return new Promise((resolve) => {
    const keywordLower = keyword.toLowerCase();
    const result = artists.filter(
      (a) =>
        a.name.toLowerCase().includes(keywordLower) ||
        a.description.toLowerCase().includes(keywordLower) ||
        a.materials.some((m) => m.toLowerCase().includes(keywordLower))
    );
    resolve(result);
  });
}
