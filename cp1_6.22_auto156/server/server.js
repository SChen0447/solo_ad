import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 4567;

app.use(cors());
app.use(express.json());

const storyData = {
  'scene-start': {
    id: 'scene-start',
    title: '序章：神秘的来信',
    background: 'forest',
    isEnding: false,
    dialogues: [
      {
        characterId: 'narrator',
        expression: 'neutral',
        text: '在一个被迷雾笼罩的清晨，你收到了一封来自远方的信件。'
      },
      {
        characterId: 'narrator',
        expression: 'neutral',
        text: '信中写道：「亲爱的冒险者，古老的森林正在呼唤你...」'
      },
      {
        characterId: 'hero',
        expression: 'surprised',
        text: '这是谁寄来的？为什么会知道我的名字...'
      },
      {
        characterId: 'narrator',
        expression: 'neutral',
        text: '你站在路口，心中充满了疑惑与好奇。'
      }
    ],
    choices: [
      { id: 'choice-1a', text: '前往森林探索', nextScene: 'scene-forest' },
      { id: 'choice-1b', text: '先去村庄打听消息', nextScene: 'scene-village' },
      { id: 'choice-1c', text: '把信扔掉，当作无事发生', nextScene: 'scene-ending-coward' }
    ]
  },
  'scene-forest': {
    id: 'scene-forest',
    title: '幽暗森林',
    background: 'deep_forest',
    isEnding: false,
    dialogues: [
      {
        characterId: 'narrator',
        expression: 'neutral',
        text: '你踏入了古老的森林，树木遮天蔽日，空气中弥漫着苔藓的气息。'
      },
      {
        characterId: 'elf',
        expression: 'neutral',
        text: '站住！人类，你为何闯入这片圣地？'
      },
      {
        characterId: 'hero',
        expression: 'surprised',
        text: '你是...精灵？我收到了一封信，是它指引我来这里的。'
      },
      {
        characterId: 'elf',
        expression: 'sad',
        text: '那封信...是我寄的。森林正在枯萎，我们需要你的帮助。'
      }
    ],
    choices: [
      { id: 'choice-2a', text: '答应帮助精灵', nextScene: 'scene-quest' },
      { id: 'choice-2b', text: '询问更多细节', nextScene: 'scene-forest-detail' }
    ]
  },
  'scene-village': {
    id: 'scene-village',
    title: '宁静村庄',
    background: 'village',
    isEnding: false,
    dialogues: [
      {
        characterId: 'narrator',
        expression: 'neutral',
        text: '你来到了附近的村庄，村民们正在忙碌着各自的生计。'
      },
      {
        characterId: 'elder',
        expression: 'neutral',
        text: '年轻人，看你的样子，是从远方来的吧？'
      },
      {
        characterId: 'hero',
        expression: 'neutral',
        text: '是的，村长。我收到了一封奇怪的信，您知道些什么吗？'
      },
      {
        characterId: 'elder',
        expression: 'sad',
        text: '那封信啊...森林里的精灵又在求助了。每年这个时候，都会有冒险者前往，但...'
      },
      {
        characterId: 'elder',
        expression: 'sad',
        text: '没人回来过。'
      }
    ],
    choices: [
      { id: 'choice-3a', text: '还是决定去森林', nextScene: 'scene-forest' },
      { id: 'choice-3b', text: '留在村庄寻求其他线索', nextScene: 'scene-village-clue' }
    ]
  },
  'scene-forest-detail': {
    id: 'scene-forest-detail',
    title: '森林的秘密',
    background: 'deep_forest',
    isEnding: false,
    dialogues: [
      {
        characterId: 'elf',
        expression: 'sad',
        text: '森林的心脏——生命之树，正在逐渐枯萎。'
      },
      {
        characterId: 'elf',
        expression: 'neutral',
        text: '传说只有拥有纯净心灵的人类，才能触摸到生命之树的种子。'
      },
      {
        characterId: 'hero',
        expression: 'surprised',
        text: '所以你选中了我？'
      },
      {
        characterId: 'elf',
        expression: 'happy',
        text: '是的！当我看到你的信被退回时，我就知道你是特别的。'
      },
      {
        characterId: 'hero',
        expression: 'neutral',
        text: '等等，你怎么知道我的地址？'
      },
      {
        characterId: 'elf',
        expression: 'surprised',
        text: '呃...这个不重要！你愿意帮助我们吗？'
      }
    ],
    choices: [
      { id: 'choice-4a', text: '勇敢接受任务', nextScene: 'scene-quest' },
      { id: 'choice-4b', text: '觉得太危险，拒绝并离开', nextScene: 'scene-ending-refuse' }
    ]
  },
  'scene-quest': {
    id: 'scene-quest',
    title: '生命之树',
    background: 'sacred_grove',
    isEnding: false,
    dialogues: [
      {
        characterId: 'narrator',
        expression: 'neutral',
        text: '精灵带你来到了森林深处，一棵巨大但枯黄的古树矗立在眼前。'
      },
      {
        characterId: 'elf',
        expression: 'sad',
        text: '这就是生命之树。曾经它是如此繁茂...'
      },
      {
        characterId: 'hero',
        expression: 'neutral',
        text: '我该怎么做？'
      },
      {
        characterId: 'elf',
        expression: 'neutral',
        text: '把手放在树干上，用你的心去感受。'
      },
      {
        characterId: 'narrator',
        expression: 'neutral',
        text: '你缓缓伸出手，触摸到粗糙的树皮。突然，一道光芒从树心涌出！'
      }
    ],
    choices: [
      { id: 'choice-5a', text: '紧紧抓住光芒', nextScene: 'scene-ending-hero' },
      { id: 'choice-5b', text: '害怕地缩回手', nextScene: 'scene-ending-coward' }
    ]
  },
  'scene-village-clue': {
    id: 'scene-village-clue',
    title: '村庄的传说',
    background: 'village',
    isEnding: false,
    dialogues: [
      {
        characterId: 'elder',
        expression: 'neutral',
        text: '既然你想知道更多，我就告诉你吧。'
      },
      {
        characterId: 'elder',
        expression: 'sad',
        text: '传说中，森林深处有一棵生命之树，它维系着整片森林的生机。'
      },
      {
        characterId: 'elder',
        expression: 'neutral',
        text: '但有一天，一个贪婪的人类想要偷走树的力量，从那以后，树就开始枯萎了。'
      },
      {
        characterId: 'hero',
        expression: 'surprised',
        text: '那个人类...后来怎么样了？'
      },
      {
        characterId: 'elder',
        expression: 'sad',
        text: '没有人知道。有人说他被诅咒了，也有人说他还活着...'
      }
    ],
    choices: [
      { id: 'choice-6a', text: '决定前往森林', nextScene: 'scene-forest' },
      { id: 'choice-6b', text: '在村庄多待几天了解更多', nextScene: 'scene-ending-villager' }
    ]
  },
  'scene-ending-hero': {
    id: 'scene-ending-hero',
    title: '结局：森林的守护者',
    background: 'blooming_forest',
    isEnding: true,
    endingType: 'hero',
    dialogues: [
      {
        characterId: 'narrator',
        expression: 'neutral',
        text: '温暖的光芒包围了你，你感到一股强大的生命力涌入体内。'
      },
      {
        characterId: 'narrator',
        expression: 'neutral',
        text: '生命之树重新焕发生机，枝叶变得翠绿繁茂，花朵在你身边绽放。'
      },
      {
        characterId: 'elf',
        expression: 'happy',
        text: '你做到了！你拯救了整片森林！'
      },
      {
        characterId: 'hero',
        expression: 'happy',
        text: '我...我感觉到了。生命的力量...'
      },
      {
        characterId: 'narrator',
        expression: 'neutral',
        text: '从那天起，你成为了森林的守护者，与精灵们一起守护着这片神圣的土地。'
      },
      {
        characterId: 'narrator',
        expression: 'neutral',
        text: '【英雄结局】—— 恭喜你完成了冒险！'
      }
    ],
    choices: []
  },
  'scene-ending-coward': {
    id: 'scene-ending-coward',
    title: '结局：平凡的生活',
    background: 'village',
    isEnding: true,
    endingType: 'coward',
    dialogues: [
      {
        characterId: 'narrator',
        expression: 'neutral',
        text: '你选择了安全的道路，回到了平凡的生活中。'
      },
      {
        characterId: 'narrator',
        expression: 'sad',
        text: '多年以后，你听说森林彻底枯萎了，精灵们也消失无踪。'
      },
      {
        characterId: 'hero',
        expression: 'sad',
        text: '也许...当年我应该做出不同的选择...'
      },
      {
        characterId: 'narrator',
        expression: 'neutral',
        text: '但一切都已经太迟了。你的故事，就止步于此。'
      },
      {
        characterId: 'narrator',
        expression: 'neutral',
        text: '【逃避结局】—— 游戏结束'
      }
    ],
    choices: []
  },
  'scene-ending-refuse': {
    id: 'scene-ending-refuse',
    title: '结局：擦肩而过',
    background: 'forest',
    isEnding: true,
    endingType: 'refuse',
    dialogues: [
      {
        characterId: 'elf',
        expression: 'sad',
        text: '我明白了...你走吧。'
      },
      {
        characterId: 'hero',
        expression: 'sad',
        text: '对不起...'
      },
      {
        characterId: 'narrator',
        expression: 'neutral',
        text: '你转身离开，身后传来精灵轻轻的叹息声。'
      },
      {
        characterId: 'narrator',
        expression: 'neutral',
        text: '有些相遇，注定只是擦肩而过。'
      },
      {
        characterId: 'narrator',
        expression: 'neutral',
        text: '【拒绝结局】—— 游戏结束'
      }
    ],
    choices: []
  },
  'scene-ending-villager': {
    id: 'scene-ending-villager',
    title: '结局：村庄的新居民',
    background: 'village_sunset',
    isEnding: true,
    endingType: 'villager',
    dialogues: [
      {
        characterId: 'narrator',
        expression: 'neutral',
        text: '你决定留在村庄，过着平静的生活。'
      },
      {
        characterId: 'narrator',
        expression: 'neutral',
        text: '日子一天天过去，你渐渐融入了这里，成为了村庄的一份子。'
      },
      {
        characterId: 'elder',
        expression: 'happy',
        text: '孩子，你愿意留下来，真是太好了。'
      },
      {
        characterId: 'hero',
        expression: 'happy',
        text: '这里很温暖。我想，这就是我的归宿吧。'
      },
      {
        characterId: 'narrator',
        expression: 'neutral',
        text: '虽然你没有成为英雄，但你找到了属于自己的幸福。'
      },
      {
        characterId: 'narrator',
        expression: 'neutral',
        text: '【村民结局】—— 恭喜通关！'
      }
    ],
    choices: []
  }
};

const savesDir = path.join(__dirname, 'saves');
if (!fs.existsSync(savesDir)) {
  fs.mkdirSync(savesDir, { recursive: true });
}

app.get('/api/story/:sceneId', (req, res) => {
  const { sceneId } = req.params;
  const scene = storyData[sceneId];
  
  if (!scene) {
    return res.status(404).json({ error: 'Scene not found' });
  }
  
  res.json(scene);
});

app.post('/api/save', (req, res) => {
  const { slot, saveData } = req.body;
  
  if (slot === undefined || slot < 0 || slot > 4) {
    return res.status(400).json({ error: 'Invalid slot number' });
  }
  
  const saveId = uuidv4();
  const fullSaveData = {
    id: saveId,
    slot,
    createdAt: new Date().toISOString(),
    ...saveData
  };
  
  const savePath = path.join(savesDir, `save-${slot}.json`);
  fs.writeFileSync(savePath, JSON.stringify(fullSaveData, null, 2));
  
  res.json({ success: true, save: fullSaveData });
});

app.get('/api/saves', (_req, res) => {
  const saves = [];
  
  for (let i = 0; i < 5; i++) {
    const savePath = path.join(savesDir, `save-${i}.json`);
    if (fs.existsSync(savePath)) {
      const data = JSON.parse(fs.readFileSync(savePath, 'utf-8'));
      saves.push(data);
    } else {
      saves.push(null);
    }
  }
  
  res.json(saves);
});

app.post('/api/load', (req, res) => {
  const { slot } = req.body;
  
  if (slot === undefined || slot < 0 || slot > 4) {
    return res.status(400).json({ error: 'Invalid slot number' });
  }
  
  const savePath = path.join(savesDir, `save-${slot}.json`);
  
  if (!fs.existsSync(savePath)) {
    return res.status(404).json({ error: 'Save file not found' });
  }
  
  const data = JSON.parse(fs.readFileSync(savePath, 'utf-8'));
  res.json(data);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
