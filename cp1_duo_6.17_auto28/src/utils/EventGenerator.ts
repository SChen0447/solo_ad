export interface EventOption {
  text: string;
  cost: Record<string, number>;
  effects: Record<string, any>;
  result_text: string;
}

export interface GameEvent {
  id: string;
  type: string;
  icon_color: string;
  title: string;
  description: string;
  options: EventOption[];
}

const EVENT_TEMPLATES: GameEvent[] = [
  {
    id: 'meteor_strike',
    type: 'disaster',
    icon_color: '#FF6B35',
    title: '陨石撞击',
    description: '一颗小型陨石正在接近空间站，需要立即做出决定！',
    options: [
      {
        text: '紧急维修（消耗资源）',
        cost: { materials: 15, tech_points: 5 },
        effects: { reputation: 2 },
        result_text: '成功抵御了陨石撞击，空间站声誉提升！'
      },
      {
        text: '弃置受损模块',
        cost: {},
        effects: { remove_random_module: true },
        result_text: '受损模块被安全分离，但损失了部分设施。'
      }
    ]
  },
  {
    id: 'crew_illness',
    type: 'medical',
    icon_color: '#00FF9D',
    title: '成员生病',
    description: '一名船员出现了不适症状，需要医疗处理。',
    options: [
      {
        text: '全面治疗',
        cost: { tech_points: 8 },
        effects: { morale_boost: 5 },
        result_text: '船员完全康复，士气有所提升！'
      },
      {
        text: '简单休养',
        cost: { food: 3 },
        effects: { morale_decrease: 10 },
        result_text: '船员缓慢恢复，但士气有所下降。'
      }
    ]
  },
  {
    id: 'alien_signal',
    type: 'research',
    icon_color: '#A855F7',
    title: '外星信号',
    description: '接收到一段神秘的外星信号，是否要投入资源研究？',
    options: [
      {
        text: '深入研究',
        cost: { tech_points: 15 },
        effects: { tech_points: 25, reputation: 5 },
        result_text: '破译了信号中的科学信息，获得重大突破！'
      },
      {
        text: '简单记录',
        cost: {},
        effects: { tech_points: 3 },
        result_text: '记录了信号数据，获得少量研究点数。'
      },
      {
        text: '忽略信号',
        cost: {},
        effects: {},
        result_text: '信号逐渐消失，没有任何收获。'
      }
    ]
  },
  {
    id: 'equipment_failure',
    type: 'malfunction',
    icon_color: '#EF4444',
    title: '设备故障',
    description: '空间站的关键设备出现故障，需要立即处理！',
    options: [
      {
        text: '紧急修复',
        cost: { power: 5, tech_points: 5 },
        effects: {},
        result_text: '设备成功修复，生产恢复正常。'
      },
      {
        text: '暂停生产',
        cost: {},
        effects: { production_penalty_days: 2 },
        result_text: '设备停机维修，生产效率暂时下降。'
      }
    ]
  },
  {
    id: 'supply_ship',
    type: 'positive',
    icon_color: '#00D4FF',
    title: '补给飞船',
    description: '地球派遣了一艘补给飞船，可以选择接收物资。',
    options: [
      {
        text: '接收物资补给',
        cost: {},
        effects: { food: 10, water: 8, materials: 10 },
        result_text: '成功接收补给物资！'
      },
      {
        text: '请求科研设备',
        cost: {},
        effects: { tech_points: 12 },
        result_text: '获得了宝贵的科研设备！'
      }
    ]
  },
  {
    id: 'space_debris',
    type: 'disaster',
    icon_color: '#FF6B35',
    title: '太空垃圾',
    description: '大量太空垃圾正在靠近空间站轨道。',
    options: [
      {
        text: '变轨规避',
        cost: { power: 8 },
        effects: { reputation: 3 },
        result_text: '成功规避太空垃圾，展示了出色的操控能力！'
      },
      {
        text: '主动清除',
        cost: { tech_points: 10 },
        effects: { materials: 15, reputation: 5 },
        result_text: '成功回收太空垃圾，转化为有用材料！'
      }
    ]
  }
];

class EventGenerator {
  generateEvent(state: any): GameEvent | null {
    let eligibleEvents = [...EVENT_TEMPLATES];

    if (!state.crew || state.crew.length === 0) {
      eligibleEvents = eligibleEvents.filter(e => e.id !== 'crew_illness');
    }

    if (eligibleEvents.length === 0) {
      return null;
    }

    const randomIndex = Math.floor(Math.random() * eligibleEvents.length);
    return JSON.parse(JSON.stringify(eligibleEvents[randomIndex]));
  }

  getNextEventDay(currentDay: number): number {
    const daysToNextEvent = 3 + Math.floor(Math.random() * 3);
    return currentDay + daysToNextEvent;
  }

  canAffordOption(state: any, option: EventOption): boolean {
    for (const [resource, amount] of Object.entries(option.cost)) {
      if ((state.resources?.[resource] ?? 0) < amount) {
        return false;
      }
    }
    return true;
  }

  formatCostText(cost: Record<string, number>): string {
    const resourceNames: Record<string, string> = {
      oxygen: '氧气',
      water: '水',
      food: '食物',
      power: '电力',
      tech_points: '科技点',
      reputation: '信誉点',
      materials: '材料'
    };

    const parts = Object.entries(cost)
      .filter(([, amount]) => amount > 0)
      .map(([resource, amount]) => `${resourceNames[resource] || resource}: ${amount}`);

    return parts.length > 0 ? parts.join(', ') : '无消耗';
  }
}

export const eventGenerator = new EventGenerator();
export default eventGenerator;
