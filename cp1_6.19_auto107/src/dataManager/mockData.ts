import { HistoricalEvent } from './types';

const categories = ['政治', '军事', '文化', '科技', '经济', '社会'];

const eventTemplates: Omit<HistoricalEvent, 'id' | 'relatedEventIds'>[] = [
  { title: '秦始皇统一六国', date: '公元前221年', year: -221, month: 1, day: 1, description: '<p>秦王嬴政先后灭掉韩、赵、魏、楚、燕、齐六国，建立了中国历史上<strong>第一个统一的中央集权制封建国家</strong>。</p><p>统一后，秦始皇推行了一系列重要措施：</p><ul><li>统一文字、货币、度量衡</li><li>修建万里长城</li><li>建立郡县制度</li></ul>', category: '政治' },
  { title: '汉武帝开辟丝绸之路', date: '公元前138年', year: -138, month: 1, day: 1, description: '<p>汉武帝派遣<strong>张骞</strong>出使西域，开辟了连接东西方的丝绸之路。</p><p>这条贸易通道促进了中国与中亚、西亚以及欧洲的经济文化交流。</p>', category: '经济' },
  { title: '蔡伦改进造纸术', date: '公元105年', year: 105, month: 1, day: 1, description: '<p>东汉宦官蔡伦改进造纸工艺，用树皮、麻头、破布、旧渔网等为原料造纸。</p><p>造纸术的改进是<strong>中国四大发明之一</strong>，对世界文明产生了深远影响。</p>', category: '科技' },
  { title: '赤壁之战', date: '公元208年', year: 208, month: 1, day: 1, description: '<p>孙权、刘备联军在长江赤壁一带大破曹操大军。</p><p>此战奠定了<strong>三国鼎立</strong>的基础，是中国历史上以少胜多的著名战役。</p>', category: '军事' },
  { title: '北魏孝文帝改革', date: '公元494年', year: 494, month: 1, day: 1, description: '<p>北魏孝文帝拓跋宏迁都洛阳，推行汉化改革：</p><ul><li>改用汉姓</li><li>改穿汉服</li><li>学说汉语</li><li>鼓励鲜卑与汉族通婚</li></ul>', category: '社会' },
  { title: '隋朝开凿大运河', date: '公元605年', year: 605, month: 1, day: 1, description: '<p>隋炀帝下令开凿贯通南北的大运河，全长约2700公里。</p><p>大运河连接了海河、黄河、淮河、长江和钱塘江五大水系，促进了南北经济文化交流。</p>', category: '经济' },
  { title: '贞观之治', date: '公元627年', year: 627, month: 1, day: 1, description: '<p>唐太宗李世民在位期间（627-649年），政治清明，经济发展，文化繁荣。</p><p>史称<strong>"贞观之治"</strong>，是中国历史上著名的盛世之一。</p>', category: '政治' },
  { title: '武则天称帝', date: '公元690年', year: 690, month: 1, day: 1, description: '<p>武则天改国号为周，自称"圣神皇帝"，成为中国历史上<strong>唯一的正统女皇帝</strong>。</p>', category: '政治' },
  { title: '活字印刷术发明', date: '公元1040年', year: 1040, month: 1, day: 1, description: '<p>北宋平民毕昇发明了<strong>泥活字印刷术</strong>。</p><p>这是印刷史上的重大革命，比欧洲古腾堡发明金属活字早约400年。</p>', category: '科技' },
  { title: '郑和下西洋', date: '公元1405年', year: 1405, month: 1, day: 1, description: '<p>明朝航海家郑和率领庞大船队首次出使西洋。</p><p>从1405年到1433年，郑和七下西洋，到达30多个国家和地区，是世界航海史上的壮举。</p>', category: '文化' },
  { title: '鸦片战争爆发', date: '公元1840年', year: 1840, month: 6, day: 1, description: '<p>英国以林则徐虎门销烟为借口，发动侵略中国的鸦片战争。</p><p>1842年，清政府被迫签订<strong>《南京条约》</strong>，中国开始沦为半殖民地半封建社会。</p>', category: '军事' },
  { title: '太平天国运动', date: '公元1851年', year: 1851, month: 1, day: 1, description: '<p>洪秀全在广西金田村发动起义，建立"太平天国"。</p><p>这是中国历史上规模最大的农民起义，沉重打击了清王朝的统治。</p>', category: '军事' },
  { title: '辛亥革命', date: '公元1911年', year: 1911, month: 10, day: 10, description: '<p>武昌起义爆发，各省纷纷响应。</p><p>辛亥革命推翻了清朝统治，结束了中国两千多年的<strong>封建君主专制制度</strong>，建立了中华民国。</p>', category: '政治' },
  { title: '五四运动', date: '公元1919年', year: 1919, month: 5, day: 4, description: '<p>北京学生在天安门前集会游行，抗议巴黎和会把德国在山东的特权转让给日本。</p><p>五四运动是中国<strong>新民主主义革命</strong>的开端。</p>', category: '社会' },
  { title: '中国共产党成立', date: '公元1921年', year: 1921, month: 7, day: 1, description: '<p>中国共产党第一次全国代表大会在上海召开。</p><p>中国共产党的成立，是中国历史上开天辟地的大事变。</p>', category: '政治' },
  { title: '抗日战争胜利', date: '公元1945年', year: 1945, month: 8, day: 15, description: '<p>日本宣布无条件投降，中国人民抗日战争取得最后胜利。</p><p>这是近代以来中国人民反抗外敌入侵<strong>第一次取得完全胜利</strong>的民族解放战争。</p>', category: '军事' },
  { title: '中华人民共和国成立', date: '公元1949年', year: 1949, month: 10, day: 1, description: '<p>毛泽东在北京天安门城楼庄严宣告中华人民共和国中央人民政府成立。</p><p>中国人民从此站起来了，中国历史翻开了新的一页。</p>', category: '政治' },
  { title: '改革开放', date: '公元1978年', year: 1978, month: 12, day: 18, description: '<p>中共十一届三中全会召开，确立了改革开放的伟大决策。</p><p>从此，中国走上了<strong>建设中国特色社会主义</strong>的道路，经济社会发展取得举世瞩目的成就。</p>', category: '经济' },
  { title: '香港回归祖国', date: '公元1997年', year: 1997, month: 7, day: 1, description: '<p>中国政府恢复对香港行使主权，中华人民共和国香港特别行政区正式成立。</p><p>这是<strong>"一国两制"</strong>构想的成功实践。</p>', category: '政治' },
  { title: '北京奥运会', date: '公元2008年', year: 2008, month: 8, day: 8, description: '<p>第29届夏季奥林匹克运动会在北京隆重开幕。</p><p>这是中国首次举办奥运会，向世界展示了中国的发展成就和文化魅力。</p>', category: '文化' },
];

function generateMoreEvents(): HistoricalEvent[] {
  const events: HistoricalEvent[] = [];
  let idCounter = eventTemplates.length;

  for (let i = 0; i < 980; i++) {
    const baseYear = -300 + Math.floor(Math.random() * 2300);
    const template = eventTemplates[Math.floor(Math.random() * eventTemplates.length)];
    const suffix = Math.floor(Math.random() * 10000);
    events.push({
      id: `event_${idCounter++}`,
      title: `${template.title} (${suffix})`,
      date: `${baseYear > 0 ? '公元' : '公元前'}${Math.abs(baseYear)}年`,
      year: baseYear,
      month: Math.floor(Math.random() * 12) + 1,
      day: Math.floor(Math.random() * 28) + 1,
      description: template.description,
      category: template.category,
      relatedEventIds: [],
    });
  }

  return events;
}

function addRelatedEvents(events: HistoricalEvent[]): void {
  const ids = events.map(e => e.id);
  events.forEach(event => {
    const relatedCount = Math.floor(Math.random() * 4) + 1;
    const relatedIds: string[] = [];
    for (let i = 0; i < relatedCount; i++) {
      const randomId = ids[Math.floor(Math.random() * ids.length)];
      if (randomId !== event.id && !relatedIds.includes(randomId)) {
        relatedIds.push(randomId);
      }
    }
    event.relatedEventIds = relatedIds;
  });
}

function createMockDataset(): HistoricalEvent[] {
  const templateEvents: HistoricalEvent[] = eventTemplates.map((tpl, index) => ({
    ...tpl,
    id: `event_${index}`,
    relatedEventIds: [],
  }));

  const moreEvents = generateMoreEvents();
  const allEvents = [...templateEvents, ...moreEvents];

  addRelatedEvents(allEvents);

  allEvents.sort((a, b) => a.year - b.year || a.month - b.month || a.day - b.day);

  return allEvents;
}

export const mockEvents = createMockDataset();

export function getEventById(id: string): HistoricalEvent | undefined {
  return mockEvents.find(e => e.id === id);
}

export function getEventsByYearRange(startYear: number, endYear: number): HistoricalEvent[] {
  return mockEvents.filter(e => e.year >= startYear && e.year <= endYear);
}

export default mockEvents;
