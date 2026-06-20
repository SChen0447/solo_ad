import { SceneRenderer, SceneData, SceneElement, WeatherEffect } from './SceneRenderer';

export interface KeywordAnalysis {
  locations: string[];
  characters: string[];
  weather: string[];
  objects: string[];
  timeOfDay: 'day' | 'sunset' | 'night';
}

export interface RenderSceneOptions {
  storyText: string;
  theme?: string;
}

const keywordMappings = {
  locations: {
    forest: ['森林', '树林', '丛林', '树', '森林深处', '密林', 'forest', 'woods', 'trees'],
    mountain: ['山', '山脉', '山峰', '雪山', '山顶', 'mountain', 'hill', 'peak'],
    river: ['河', '河流', '江水', '小溪', '溪流', '湖', '湖泊', 'river', 'lake', 'stream', 'water'],
    castle: ['城堡', '皇宫', '宫殿', '古堡', 'castle', 'palace', 'fortress'],
    house: ['房子', '房屋', '小屋', '木屋', '家', 'house', 'cabin', 'home'],
    tower: ['塔', '塔楼', '灯塔', '钟楼', 'tower', 'spire', 'lighthouse'],
    space: ['太空', '宇宙', '星空', '星球', '飞船', 'space', 'star', 'planet', 'spaceship'],
    city: ['城市', '城镇', '街道', '都市', 'city', 'town', 'street'],
    school: ['学校', '校园', '教室', '操场', 'school', 'campus', 'classroom'],
    ancient: ['古代', '古', '唐朝', '江湖', '武林', 'ancient', 'old', 'historical'],
  },
  weather: {
    rain: ['雨', '下雨', '雨天', '淋雨', 'rain', 'rainy', 'shower'],
    snow: ['雪', '下雪', '雪花', '雪地', 'snow', 'snowy', 'winter'],
    sun: ['阳光', '晴天', '太阳', '烈日', 'sun', 'sunny', 'clear'],
    cloud: ['云', '阴天', '多云', 'cloud', 'cloudy', 'overcast'],
    night: ['夜晚', '晚上', '黑夜', '深夜', 'night', 'evening', 'dark'],
    sunset: ['黄昏', '日落', '夕阳', '傍晚', 'sunset', 'dusk', 'twilight'],
    storm: ['风暴', '暴风雨', '雷电', 'storm', 'thunder', 'lightning'],
  },
  timeKeywords: {
    day: ['白天', '早晨', '上午', '下午', '正午', 'day', 'morning', 'afternoon', 'noon'],
    sunset: ['黄昏', '日落', '夕阳', '傍晚', 'sunset', 'dusk', 'twilight'],
    night: ['夜晚', '晚上', '黑夜', '深夜', '午夜', 'night', 'evening', 'dark', 'midnight'],
  },
  buildings: {
    castle: ['城堡', '皇宫', '宫殿', 'castle', 'palace'],
    house: ['房子', '房屋', '小屋', '木屋', 'house', 'cabin'],
    tower: ['塔', '塔楼', '灯塔', 'tower', 'spire'],
  },
};

class CanvasModule {
  private renderer: SceneRenderer | null = null;
  private canvas: HTMLCanvasElement | null = null;

  init(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.renderer = new SceneRenderer(canvas);
    this.renderer.startAnimation();
    
    const defaultScene = this.createDefaultScene();
    this.renderer.setScene(defaultScene);
  }

  private analyzeKeywords(text: string, theme?: string): KeywordAnalysis {
    const analysis: KeywordAnalysis = {
      locations: [],
      characters: [],
      weather: [],
      objects: [],
      timeOfDay: 'day',
    };

    const lowerText = text.toLowerCase();

    for (const [type, keywords] of Object.entries(keywordMappings.locations)) {
      if (keywords.some(keyword => lowerText.includes(keyword.toLowerCase()))) {
        analysis.locations.push(type);
      }
    }

    for (const [type, keywords] of Object.entries(keywordMappings.weather)) {
      if (keywords.some(keyword => lowerText.includes(keyword.toLowerCase()))) {
        analysis.weather.push(type);
      }
    }

    for (const [time, keywords] of Object.entries(keywordMappings.timeKeywords)) {
      if (keywords.some(keyword => lowerText.includes(keyword.toLowerCase()))) {
        analysis.timeOfDay = time as 'day' | 'sunset' | 'night';
        break;
      }
    }

    const characterPatterns = [
      /[\u4e00-\u9fa5]{1,3}(先生|小姐|女士|同学|老师|国王|王子|公主|侦探|魔法师)/g,
      /[A-Z][a-z]+ (Smith|Johnson|Williams|Brown|Jones|Garcia|Miller|Davis)/g,
    ];
    
    for (const pattern of characterPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        analysis.characters.push(...matches);
      }
    }

    if (theme) {
      const themeLower = theme.toLowerCase();
      if (themeLower === '科幻' || themeLower.includes('sci') || themeLower.includes('space')) {
        if (!analysis.locations.includes('space')) analysis.locations.push('space');
      } else if (themeLower === '奇幻' || themeLower.includes('fantasy')) {
        if (!analysis.locations.includes('castle')) analysis.locations.push('castle');
      } else if (themeLower === '古风' || themeLower.includes('ancient')) {
        if (!analysis.locations.includes('ancient')) analysis.locations.push('ancient');
        if (!analysis.timeOfDay) analysis.timeOfDay = 'sunset';
      } else if (themeLower === '校园' || themeLower.includes('campus') || themeLower.includes('school')) {
        if (!analysis.locations.includes('school')) analysis.locations.push('school');
        analysis.timeOfDay = 'day';
      } else if (themeLower === '悬疑' || themeLower.includes('mystery')) {
        analysis.timeOfDay = 'night';
        if (!analysis.weather.includes('cloud')) analysis.weather.push('cloud');
      }
    }

    return analysis;
  }

  private determineWeather(weatherKeywords: string[], timeOfDay: string): WeatherEffect {
    if (weatherKeywords.includes('rain') || weatherKeywords.includes('storm')) {
      return { type: 'rain', intensity: weatherKeywords.includes('storm') ? 0.9 : 0.6 };
    }
    if (weatherKeywords.includes('snow')) {
      return { type: 'snow', intensity: 0.7 };
    }
    if (weatherKeywords.includes('sun') || (timeOfDay === 'day' && !weatherKeywords.includes('cloud'))) {
      return { type: 'sunbeam', intensity: 0.5 };
    }
    return { type: 'none', intensity: 0 };
  }

  private generateSceneElements(analysis: KeywordAnalysis, canvasWidth: number, canvasHeight: number): SceneElement[] {
    const elements: SceneElement[] = [];
    const groundY = canvasHeight * 0.55;

    const hasMountain = analysis.locations.includes('mountain');
    const hasForest = analysis.locations.includes('forest');
    const hasRiver = analysis.locations.includes('river') || analysis.locations.includes('lake');
    const hasCastle = analysis.locations.includes('castle');
    const hasHouse = analysis.locations.includes('house') || analysis.locations.includes('school') || analysis.locations.includes('ancient');
    const hasTower = analysis.locations.includes('tower');
    const hasSpace = analysis.locations.includes('space');

    if (analysis.timeOfDay === 'night' || analysis.timeOfDay === 'sunset') {
      if (analysis.timeOfDay === 'night') {
        elements.push({
          type: 'moon',
          x: canvasWidth * 0.75,
          y: canvasHeight * 0.05,
          width: 60,
          height: 60,
        });
      } else {
        elements.push({
          type: 'sun',
          x: canvasWidth * 0.7,
          y: canvasHeight * 0.25,
          width: 70,
          height: 70,
        });
      }
    } else {
      elements.push({
        type: 'sun',
        x: canvasWidth * 0.75,
        y: canvasHeight * 0.05,
        width: 60,
        height: 60,
      });
    }

    if (!hasSpace) {
      const cloudCount = analysis.weather.includes('cloud') ? 4 : 2;
      for (let i = 0; i < cloudCount; i++) {
        elements.push({
          type: 'cloud',
          x: canvasWidth * (0.1 + i * 0.25),
          y: canvasHeight * (0.05 + Math.random() * 0.15),
          width: 80 + Math.random() * 60,
          height: 30 + Math.random() * 20,
          variant: i,
        });
      }
    }

    if (hasMountain || (!hasSpace && Math.random() > 0.5)) {
      const mountainCount = hasMountain ? 3 : 1;
      for (let i = 0; i < mountainCount; i++) {
        elements.push({
          type: 'mountain',
          x: canvasWidth * (0.05 + i * 0.3),
          y: canvasHeight * 0.2,
          width: canvasWidth * 0.35,
          height: canvasHeight * 0.35,
          variant: i,
        });
      }
    }

    if (hasRiver) {
      elements.push({
        type: 'river',
        x: canvasWidth * 0.1,
        y: groundY + canvasHeight * 0.1,
        width: canvasWidth * 0.8,
        height: canvasHeight * 0.15,
      });
    }

    if (!hasSpace) {
      elements.push({
        type: 'grass',
        x: 0,
        y: groundY,
        width: canvasWidth,
        height: canvasHeight * 0.05,
      });
    }

    if (hasCastle) {
      elements.push({
        type: 'castle',
        x: canvasWidth * 0.25,
        y: groundY - canvasHeight * 0.35,
        width: canvasWidth * 0.5,
        height: canvasHeight * 0.45,
      });
    }

    if (hasHouse && !hasCastle) {
      const houseX = canvasWidth * (0.15 + Math.random() * 0.5);
      elements.push({
        type: 'house',
        x: houseX,
        y: groundY - canvasHeight * 0.2,
        width: canvasWidth * 0.18,
        height: canvasHeight * 0.25,
        variant: Math.floor(Math.random() * 3),
      });
    }

    if (hasTower) {
      elements.push({
        type: 'tower',
        x: canvasWidth * 0.7,
        y: groundY - canvasHeight * 0.3,
        width: canvasWidth * 0.12,
        height: canvasHeight * 0.35,
      });
    }

    if (hasForest || (!hasCastle && !hasHouse)) {
      const treeCount = hasForest ? 5 : 3;
      const positions = [0.05, 0.2, 0.75, 0.85, 0.92];
      for (let i = 0; i < Math.min(treeCount, positions.length); i++) {
        if (Math.random() > 0.3 || hasForest) {
          elements.push({
            type: 'tree',
            x: canvasWidth * positions[i],
            y: groundY - canvasHeight * (0.1 + Math.random() * 0.1),
            width: canvasWidth * 0.08 + Math.random() * 30,
            height: canvasHeight * 0.15 + Math.random() * 30,
            variant: i % 3,
          });
        }
      }
    }

    return elements;
  }

  private createDefaultScene(): SceneData {
    const canvasWidth = this.canvas?.width || 800;
    const canvasHeight = this.canvas?.height || 400;
    const groundY = canvasHeight * 0.55;

    return {
      elements: [
        { type: 'sun', x: canvasWidth * 0.75, y: canvasHeight * 0.05, width: 60, height: 60 },
        { type: 'cloud', x: canvasWidth * 0.1, y: canvasHeight * 0.08, width: 100, height: 35, variant: 0 },
        { type: 'cloud', x: canvasWidth * 0.4, y: canvasHeight * 0.12, width: 80, height: 30, variant: 1 },
        { type: 'mountain', x: canvasWidth * 0.05, y: canvasHeight * 0.2, width: canvasWidth * 0.35, height: canvasHeight * 0.35, variant: 0 },
        { type: 'mountain', x: canvasWidth * 0.4, y: canvasHeight * 0.25, width: canvasWidth * 0.35, height: canvasHeight * 0.3, variant: 1 },
        { type: 'grass', x: 0, y: groundY, width: canvasWidth, height: canvasHeight * 0.05 },
        { type: 'house', x: canvasWidth * 0.35, y: groundY - canvasHeight * 0.2, width: canvasWidth * 0.18, height: canvasHeight * 0.25, variant: 0 },
        { type: 'tree', x: canvasWidth * 0.1, y: groundY - canvasHeight * 0.15, width: 60, height: 80, variant: 0 },
        { type: 'tree', x: canvasWidth * 0.75, y: groundY - canvasHeight * 0.18, width: 70, height: 90, variant: 1 },
        { type: 'tree', x: canvasWidth * 0.9, y: groundY - canvasHeight * 0.12, width: 50, height: 70, variant: 2 },
      ],
      weather: { type: 'sunbeam', intensity: 0.4 },
      timeOfDay: 'day',
      backgroundColor: '#87CEEB',
    };
  }

  async renderScene(options: RenderSceneOptions): Promise<void> {
    if (!this.renderer || !this.canvas) {
      throw new Error('CanvasModule未初始化');
    }

    const { storyText, theme } = options;
    const analysis = this.analyzeKeywords(storyText, theme);
    const weather = this.determineWeather(analysis.weather, analysis.timeOfDay);
    const elements = this.generateSceneElements(analysis, this.canvas.width, this.canvas.height);

    const sceneData: SceneData = {
      elements,
      weather,
      timeOfDay: analysis.timeOfDay,
      backgroundColor: this.getBackgroundColor(analysis.timeOfDay),
    };

    this.renderer.setScene(sceneData);
  }

  private getBackgroundColor(timeOfDay: string): string {
    switch (timeOfDay) {
      case 'night':
        return '#0a0a1a';
      case 'sunset':
        return '#FF6B6B';
      default:
        return '#87CEEB';
    }
  }

  getAnalysis(text: string, theme?: string): KeywordAnalysis {
    return this.analyzeKeywords(text, theme);
  }

  destroy(): void {
    if (this.renderer) {
      this.renderer.stopAnimation();
      this.renderer = null;
    }
    this.canvas = null;
  }
}

export const canvasModule = new CanvasModule();
