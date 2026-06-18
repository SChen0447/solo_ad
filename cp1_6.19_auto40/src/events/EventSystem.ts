import { v4 as uuidv4 } from 'uuid';
import type { Ship, MineralType, GameEvent, EventOption } from '@/types/game';
import { applyDamage, consumeFuel, getTotalCargo, addCargo, removeCargo } from '@/ship/ShipSystem';

const EVENT_PROBABILITY = 0.2;
const PIRATE_DAMAGE = 20;
const METEOR_DAMAGE_PERCENT = 0.05;
const TRADE_RATIO = 3;

export function shouldTriggerEvent(probability: number = EVENT_PROBABILITY): boolean {
  return Math.random() < probability;
}

export function generateEvent(ship: Ship): GameEvent {
  const eventTypes = ['pirate', 'meteor', 'trader'] as const;
  const type = eventTypes[Math.floor(Math.random() * eventTypes.length)];
  
  switch (type) {
    case 'pirate':
      return generatePirateEvent(ship);
    case 'meteor':
      return generateMeteorEvent();
    case 'trader':
      return generateTraderEvent();
  }
}

function generatePirateEvent(ship: Ship): GameEvent {
  const totalCargo = getTotalCargo(ship.cargo);
  const canFlee = ship.fuel / ship.maxFuel > 0.3;
  
  const options: EventOption[] = [
    {
      id: 'surrender',
      label: '交出50%矿物',
      action: () => {},
    },
    {
      id: 'fight',
      label: '开战（护盾减半）',
      action: () => {},
    },
  ];
  
  if (canFlee) {
    options.push({
      id: 'flee',
      label: '逃跑（消耗30燃料）',
      action: () => {},
    });
  }
  
  return {
    id: uuidv4(),
    type: 'pirate',
    title: '⚠️ 太空海盗来袭！',
    description: totalCargo > 0 
      ? `一艘海盗船拦截了你的飞船，要求你交出50%的矿物。你目前有 ${totalCargo} 单位矿物。`
      : '一艘海盗船拦截了你的飞船，但发现你的货舱是空的，正在考虑是否要攻击你。',
    options,
  };
}

function generateMeteorEvent(): GameEvent {
  return {
    id: uuidv4(),
    type: 'meteor',
    title: '☄️ 陨石风暴！',
    description: '你的飞船正在穿越一片陨石密集区域，所有部件将受到5%的耐久损伤。尝试机动躲避！',
    options: [
      {
        id: 'endure',
        label: '硬抗损伤',
        action: () => {},
      },
      {
        id: 'evade',
        label: '尝试躲避（消耗20燃料）',
        action: () => {},
      },
    ],
  };
}

function generateTraderEvent(): GameEvent {
  const minerals: MineralType[] = ['iron', 'copper', 'titaniumIce'];
  const giveType = minerals[Math.floor(Math.random() * minerals.length)];
  let receiveType = minerals[Math.floor(Math.random() * minerals.length)];
  
  while (receiveType === giveType) {
    receiveType = minerals[Math.floor(Math.random() * minerals.length)];
  }
  
  return {
    id: uuidv4(),
    type: 'trader',
    title: '🛸 星际商贩',
    description: `一位神秘的星际商贩愿意以 ${TRADE_RATIO}:1 的比例用 ${getMineralName(giveType)} 兑换 ${getMineralName(receiveType)}。\n例如：每 ${TRADE_RATIO} 个 ${getMineralName(giveType)} 可兑换 1 个 ${getMineralName(receiveType)}。`,
    options: [
      {
        id: `trade_${giveType}_${receiveType}`,
        label: `兑换（消耗3个${getMineralName(giveType)}）`,
        action: () => {},
      },
      {
        id: 'decline',
        label: '婉拒离开',
        action: () => {},
      },
    ],
  };
}

function getMineralName(type: MineralType): string {
  const names: Record<MineralType, string> = {
    iron: '铁矿',
    copper: '铜矿',
    titaniumIce: '钛冰',
  };
  return names[type];
}

export function handlePirateEvent(
  ship: Ship,
  option: 'surrender' | 'fight' | 'flee'
): { ship: Ship; message: string } {
  switch (option) {
    case 'surrender': {
      const newCargo = { ...ship.cargo };
      for (const type of Object.keys(newCargo) as MineralType[]) {
        newCargo[type] = Math.floor(newCargo[type] * 0.5);
      }
      return {
        ship: { ...ship, cargo: newCargo },
        message: '你交出了50%的矿物，海盗放你离开了。',
      };
    }
    case 'fight': {
      let updatedShip = { ...ship };
      if (updatedShip.shieldActive) {
        updatedShip = {
          ...updatedShip,
          shield: Math.floor(updatedShip.shield * 0.5),
        };
      }
      updatedShip = applyDamage(updatedShip, PIRATE_DAMAGE);
      return {
        ship: updatedShip,
        message: `激烈战斗后，你击退了海盗，但飞船受到了 ${PIRATE_DAMAGE} 点伤害。`,
      };
    }
    case 'flee': {
      if (ship.fuel < 30) {
        return {
          ship,
          message: '燃料不足，无法逃跑！',
        };
      }
      const updatedShip = consumeFuel(ship, 30);
      return {
        ship: updatedShip,
        message: '你成功逃脱了海盗的追击，消耗了30点燃料。',
      };
    }
  }
}

export function handleMeteorEvent(
  ship: Ship,
  option: 'endure' | 'evade'
): { ship: Ship; message: string } {
  switch (option) {
    case 'endure': {
      const damage = Math.floor(ship.maxHull * METEOR_DAMAGE_PERCENT);
      const updatedShip = applyDamage(ship, damage);
      return {
        ship: updatedShip,
        message: `陨石风暴中，你的飞船受到了 ${damage} 点伤害。`,
      };
    }
    case 'evade': {
      if (ship.fuel < 20) {
        const damage = Math.floor(ship.maxHull * METEOR_DAMAGE_PERCENT);
        const updatedShip = applyDamage(ship, damage);
        return {
          ship: updatedShip,
          message: `燃料不足无法躲避，受到 ${damage} 点伤害。`,
        };
      }
      const evadeSuccess = Math.random() > 0.4;
      let updatedShip = consumeFuel(ship, 20);
      
      if (evadeSuccess) {
        return {
          ship: updatedShip,
          message: '你成功躲避了陨石群，没有受到损伤！',
        };
      } else {
        const damage = Math.floor(ship.maxHull * METEOR_DAMAGE_PERCENT * 0.5);
        updatedShip = applyDamage(updatedShip, damage);
        return {
          ship: updatedShip,
          message: `躲避失败，仍然受到了 ${damage} 点伤害。`,
        };
      }
    }
  }
}

export function handleTraderEvent(
  ship: Ship,
  optionId: string
): { ship: Ship; message: string } {
  if (optionId === 'decline') {
    return {
      ship,
      message: '你婉拒了商贩的提议，继续你的旅程。',
    };
  }
  
  const match = optionId.match(/^trade_(\w+)_(\w+)$/);
  if (!match) {
    return { ship, message: '无效的交易选项。' };
  }
  
  const giveType = match[1] as MineralType;
  const receiveType = match[2] as MineralType;
  const giveAmount = 3;
  const receiveAmount = 1;
  
  if (ship.cargo[giveType] < giveAmount) {
    return {
      ship,
      message: `${getMineralName(giveType)}不足，无法完成交易。`,
    };
  }
  
  const totalAfterRemove = getTotalCargo(ship.cargo) - giveAmount + receiveAmount;
  if (totalAfterRemove > ship.cargoCapacity) {
    return {
      ship,
      message: '货舱空间不足，无法完成交易。',
    };
  }
  
  let updatedShip = removeCargo(ship, giveType, giveAmount).ship;
  updatedShip = addCargo(updatedShip, receiveType, receiveAmount).ship;
  
  return {
    ship: updatedShip,
    message: `交易成功！你用 ${giveAmount} 个${getMineralName(giveType)}换取了 ${receiveAmount} 个${getMineralName(receiveType)}。`,
  };
}
