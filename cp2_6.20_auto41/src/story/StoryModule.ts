import StoryWorker from './story.worker.ts?worker';

type ModelState = 'idle' | 'loading' | 'ready' | 'error';

const templates: Record<string, string[][]> = {
  '科幻': [
    ['星历3024年，宇航员林远站在银河空间站的观测台上，望着窗外缓缓旋转的蓝色星球。通讯器中传来一段神秘的信号，那是来自仙女座星系的回应。他深吸一口气，按下了超空间引擎的启动键，飞船在星光中化为一道银色流光。'],
    ['量子计算机"天眼"在第729次模拟中终于推演出宇宙的终极方程。屏幕上跳动的数据像星辰般闪烁，研究员苏晚意识到，这个方程不仅能预测未来，还能改写过去。她颤抖着手指，在终端输入了第一个修改指令。'],
    ['地下城"新曙光"的人工智能管家阿瑞斯在例行巡检时发现了墙壁深处的一道裂缝。裂缝后面不是岩石，而是一片散发着幽蓝光芒的巨大空间，数以万计的休眠舱整齐排列其中。阿瑞斯的红色光点闪烁了一下——这些舱里的人，都还活着。'],
  ],
  '奇幻': [
    ['魔法学院最末等的学徒叶霜，意外在禁书区翻开了一本会说话的魔典。魔典告诉她，千年封印即将崩塌，而她是唯一能重新编织封印之人。叶霜握紧法杖，踏上了穿越七重试炼的征途，身后是缓缓崩落的学院高塔。'],
    ['精灵森林深处，一头通体雪白的独角兽跪在月光泉旁，额上的螺旋角已经黯淡无光。猎人的女儿婉儿轻轻将手覆上独角兽的鬃毛，一段古老的记忆涌入脑海——原来这片森林的存亡，全系于这一缕即将熄灭的光。'],
    ['铸剑师莫邪用九十九天锻造了一把没有刃的剑，所有人都嘲笑他。直到那日黑龙降世，铁壁城危在旦夕，莫邪举起无刃之剑向前一指，剑身上浮现出千道符文，化为一道冲天光柱，将黑龙钉在了苍穹之上。'],
  ],
  '冒险': [
    ['寻宝猎人阿风在一张泛黄的羊皮卷上发现了失落古城"云隐"的线索。他穿越了流沙沙漠，攀过了万仞冰崖，终于在暴风雨之夜看见城门上雕刻的古老铭文："入者弃惧，出者得真。"他推开城门，迎面而来的不是黄金，而是一面映照内心的巨大铜镜。'],
    ['少年水手阿渡随商船出发，却在风暴中被巨浪卷入海底。他醒来时发现自己躺在一条会飞的鱼背上，鱼带他穿越了珊瑚迷宫，来到一座建在海沟最深处的城市。这里的居民告诉他，只有找到海神的三叉戟，才能回到海面之上的世界。'],
    ['探险家陆离在喜马拉雅山脉的冰洞中发现了一扇由陨铁铸成的门。门上没有锁孔，只有一首用梵文写成的谜语。她花了三天三夜破解谜语，门缓缓开启，里面是一条通往地心的螺旋阶梯，空气中飘来温暖的花香。'],
  ],
  '校园': [
    ['转学生苏然第一天就在课桌里发现了一封没有署名的信，信上只写了一句话："天台上的那棵银杏树知道答案。"她好奇地爬上天台，发现银杏树上挂满了写满愿望的纸条，而最新的一张上写着她的名字。'],
    ['期中考试那天，学霸林一鸣的答案竟然和同桌完全一样——而他从未抄袭。班主任把他们叫到办公室，两个人对视一眼，同时想起了一个月前那颗划过夜空的流星。从那之后，他们偶尔会在梦中交换彼此的记忆。'],
    ['校园广播站突然在深夜自动播放了一首从未有人听过的歌。第二天，所有听到歌声的同学都做了同一个梦：一座漂浮在云端的图书馆，书架上每一本书都记录着某个同学的秘密。班长陈夏决定在下一个深夜，去广播站一探究竟。'],
  ],
  '悬疑': [
    ['老城区的钟楼每隔六十年才会敲响一次，而每次钟声响起后，就会有一人从人间消失。侦探沈默翻开三十年前的卷宗，发现所有失踪者的照片里，背景中都站着同一个穿灰色大衣的人。今晚，钟楼的大钟又开始震颤了。'],
    ['法医顾清在连续第三起案件的死者胃中发现了同一种罕见的蓝色花瓣。这种花早已绝迹百年，只存在于古籍记载中。她顺藤摸瓜查到一座废弃的植物园，温室深处那株传说中的蓝莲竟然正在盛放，花瓣上还沾着新鲜的血迹。'],
    ['午夜十二点，手机收到一条来自自己的未读消息，内容是一个地址。记者方舟赶到那个地址，发现是一间空房间，墙上贴满了他未来一周的日程安排——精确到每一分钟。而此刻，房间角落的椅子上坐着一个人，长着和他一模一样的脸。'],
  ],
  '古风': [
    ['长安城连落三日大雪，少年书生沈听鹤在酒肆中偶遇一红衣女子，以残局对弈。三局之后，女子拂袖而去，只在棋盘上留下一枚刻着"归"字的黑子。沈听鹤追出门外，雪地中唯有两行足迹延伸至城墙——然后消失在了月光里。'],
    ['边关守将之女楚鸢自幼习武，却在及笄之日收到一封密信，信中称她并非楚家血脉。她孤身南下寻访身世，途经一座荒寺时，发现寺中壁画上的女子容貌与自己如出一辙，而壁画题款的时间，是一百年前。'],
    ['太医院最年轻的药童顾微，在御药房深处发现了一味不在任何典籍中的草药。他用此草煎了一碗汤，饮下后竟能听见花草的低语。宫中的牡丹告诉他，皇帝每日服用的丹药里，藏着足以覆灭王朝的秘密。'],
  ],
};

function generateTemplateStory(prompt: string): string {
  let theme = '奇幻';
  for (const key of Object.keys(templates)) {
    if (prompt.includes(key)) {
      theme = key;
      break;
    }
  }
  const variations = templates[theme];
  const index = Math.floor(Math.random() * variations.length);
  return variations[index][0];
}

class StoryModule {
  private worker: Worker | null = null;
  private state: ModelState = 'idle';
  private loadPromise: Promise<void> | null = null;
  private generateCallbacks: Map<string, { onChunk: (t: string) => void; onProgress: (p: number) => void; resolve: (t: string) => void }> = new Map();
  private requestId = 0;

  getState(): ModelState {
    return this.state;
  }

  private initWorker(): void {
    if (this.worker) return;

    this.worker = new StoryWorker();

    this.worker.onmessage = (e: MessageEvent) => {
      const { type, progress, text, message, requestId } = e.data;

      if (type === 'loading') {
        this.state = 'loading';
        for (const cb of this.generateCallbacks.values()) {
          cb.onProgress(progress || 0);
        }
      } else if (type === 'ready') {
        this.state = 'ready';
        for (const cb of this.generateCallbacks.values()) {
          cb.onProgress(100);
        }
      } else if (type === 'error') {
        this.state = 'error';
        console.error('Story worker error:', message);
      } else if (type === 'chunk') {
        const cb = this.generateCallbacks.get(requestId);
        if (cb) {
          cb.onChunk(text || '');
        }
      } else if (type === 'complete') {
        const cb = this.generateCallbacks.get(requestId);
        if (cb) {
          cb.resolve(text || '');
          this.generateCallbacks.delete(requestId);
        }
      }
    };
  }

  private async loadModel(onProgress: (progress: number) => void): Promise<void> {
    if (this.state === 'ready') return;
    if (this.state === 'loading' && this.loadPromise) {
      await this.loadPromise;
      return;
    }

    this.initWorker();
    this.state = 'loading';

    this.loadPromise = new Promise((resolve) => {
      const checkReady = () => {
        if (this.state === 'ready') {
          resolve();
        } else {
          setTimeout(checkReady, 100);
        }
      };

      this.worker?.postMessage({ action: 'load' });

      const onReadyProgress = (p: number) => {
        onProgress(p);
      };
      this.generateCallbacks.set('load_' + Date.now(), {
        onChunk: () => {},
        onProgress: onReadyProgress,
        resolve: () => {},
      });

      checkReady();
    });

    await this.loadPromise;
  }

  async generateStory(
    prompt: string,
    onChunk: (text: string) => void,
    onProgress: (progress: number) => void
  ): Promise<string> {
    if (this.state !== 'ready') {
      const templateResult = generateTemplateStory(prompt);
      onChunk(templateResult);

      if (this.state === 'idle') {
        this.loadModel(onProgress).catch(() => {});
      }

      return templateResult;
    }

    return new Promise((resolve) => {
      const reqId = `req_${++this.requestId}`;
      this.generateCallbacks.set(reqId, { onChunk, onProgress, resolve });
      this.worker?.postMessage({ action: 'generate', prompt, maxTokens: 150, requestId: reqId });
    });
  }

  dispose(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.generateCallbacks.clear();
  }
}

const storyModule = new StoryModule();

export { storyModule, generateTemplateStory };
export type { ModelState };
