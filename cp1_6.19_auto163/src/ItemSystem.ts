import { Item, MAX_INVENTORY, createId } from './types';

const WEAPON_NAMES = ['铁剑', '钢刃', '暗影匕首', '火焰剑', '寒冰锤', '雷霆之枪'];
const ARMOR_NAMES = ['皮甲', '链甲', '板甲', '暗影斗篷', '圣光护盾', '龙鳞甲'];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateRandomItem(): Item {
  const isWeapon = Math.random() < 0.5;

  if (isWeapon) {
    const attack = randomInt(5, 15);
    return {
      id: createId(),
      type: 'weapon',
      name: WEAPON_NAMES[randomInt(0, WEAPON_NAMES.length - 1)],
      attack,
      defense: 0,
    };
  } else {
    const defense = randomInt(3, 8);
    return {
      id: createId(),
      type: 'armor',
      name: ARMOR_NAMES[randomInt(0, ARMOR_NAMES.length - 1)],
      attack: 0,
      defense,
    };
  }
}

export function generateWeapon(): Item {
  const attack = randomInt(5, 15);
  return {
    id: createId(),
    type: 'weapon',
    name: WEAPON_NAMES[randomInt(0, WEAPON_NAMES.length - 1)],
    attack,
    defense: 0,
  };
}

export function generateArmor(): Item {
  const defense = randomInt(3, 8);
  return {
    id: createId(),
    type: 'armor',
    name: ARMOR_NAMES[randomInt(0, ARMOR_NAMES.length - 1)],
    attack: 0,
    defense,
  };
}

export function pickUpItem(inventory: Item[], item: Item): { success: boolean; inventory: Item[]; message: string } {
  if (inventory.length >= MAX_INVENTORY) {
    return { success: false, inventory, message: '背包已满，无法拾取！' };
  }
  return {
    success: true,
    inventory: [...inventory, item],
    message: `拾取了 ${item.name}！`,
  };
}

export function equipItem(
  inventory: Item[],
  item: Item,
  equippedWeapon: Item | null,
  equippedArmor: Item | null
): {
  inventory: Item[];
  equippedWeapon: Item | null;
  equippedArmor: Item | null;
  message: string;
} {
  const itemIndex = inventory.findIndex(i => i.id === item.id);
  if (itemIndex === -1) {
    return { inventory, equippedWeapon, equippedArmor, message: '物品不在背包中！' };
  }

  const newInventory = [...inventory];
  newInventory.splice(itemIndex, 1);

  if (item.type === 'weapon') {
    if (equippedWeapon) {
      newInventory.push(equippedWeapon);
    }
    return {
      inventory: newInventory,
      equippedWeapon: item,
      equippedArmor,
      message: `装备了 ${item.name}！`,
    };
  } else {
    if (equippedArmor) {
      newInventory.push(equippedArmor);
    }
    return {
      inventory: newInventory,
      equippedWeapon,
      equippedArmor: item,
      message: `装备了 ${item.name}！`,
    };
  }
}

export function dropItem(inventory: Item[], item: Item): { inventory: Item[]; message: string } {
  const itemIndex = inventory.findIndex(i => i.id === item.id);
  if (itemIndex === -1) {
    return { inventory, message: '物品不在背包中！' };
  }

  const newInventory = [...inventory];
  newInventory.splice(itemIndex, 1);

  return {
    inventory: newInventory,
    message: `丢弃了 ${item.name}。`,
  };
}

export function getTotalAttack(baseAttack: number, equippedWeapon: Item | null): number {
  return baseAttack + (equippedWeapon ? equippedWeapon.attack : 0);
}

export function getTotalDefense(baseDefense: number, equippedArmor: Item | null): number {
  return baseDefense + (equippedArmor ? equippedArmor.defense : 0);
}
