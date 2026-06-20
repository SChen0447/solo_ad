import json
from collections import Counter

with open(r'e:\solo\SoloAutoDemo\tasks\auto178\backend\card_data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f'卡牌总数: {len(data)}')
elements = Counter(card['element'] for card in data)
for elem, count in elements.items():
    print(f'{elem}: {count}张')

print('\n卡牌列表:')
for card in data:
    emoji = card['emoji']
    name = card['name']
    element = card['element']
    mana = card['manaCost']
    print(f'  {emoji} {name} ({element}) - 法力:{mana}')
