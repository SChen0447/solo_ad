import json

with open(r'e:\solo\SoloAutoDemo\tasks\auto178\backend\level_data.json', encoding='utf-8') as f:
    data = json.load(f)

print('总关卡数:', len(data))
for level in data:
    print(f'\n=== 关卡 {level["level"]} ===')
    print(f'  网格大小: {level["gridSize"]}x{level["gridSize"]}')
    print(f'  玩家起始位置: q={level["playerStart"]["q"]}, r={level["playerStart"]["r"]}')
    print(f'  敌人数量: {len(level["enemies"])}')
    melee = sum(1 for e in level["enemies"] if e["type"] == "melee")
    ranged = sum(1 for e in level["enemies"] if e["type"] == "ranged")
    print(f'  - 近战(骷髅): {melee} 个')
    print(f'  - 远程(法师): {ranged} 个')
    for enemy in level["enemies"]:
        print(f'    {enemy["name"]}: hp={enemy["hp"]}, attack={enemy["attack"]}, pos=(q={enemy["position"]["q"]}, r={enemy["position"]["r"]})')

print('\n✅ JSON格式验证通过！')
