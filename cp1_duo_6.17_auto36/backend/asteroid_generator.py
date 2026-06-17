import random
import math
from typing import List, Dict, Any

ORE_TYPES = {
    'iron':    {'color': '#8B8B8B', 'glow': '#aaaaaa', 'value': 5,  'smelt_time': 3,  'probability': 0.35},
    'copper':  {'color': '#CD7F32', 'glow': '#e8a84c', 'value': 10, 'smelt_time': 4,  'probability': 0.25},
    'silver':  {'color': '#C0C0C0', 'glow': '#e0e0ff', 'value': 20, 'smelt_time': 6,  'probability': 0.20},
    'gold':    {'color': '#FFD700', 'glow': '#ffe44d', 'value': 50, 'smelt_time': 10, 'probability': 0.12},
    'crystal': {'color': '#9B59B6', 'glow': '#d4a5ff', 'value': 100,'smelt_time': 12, 'probability': 0.08},
}

ALLOY_RECIPES = {
    'bronze':       {'ingredients': {'copper': 2, 'iron': 1},   'smelt_time': 8,  'value': 40,  'unlock_cost': 200},
    'electrum':     {'ingredients': {'gold': 1, 'silver': 2},   'smelt_time': 12, 'value': 100, 'unlock_cost': 500},
    'stellarite':   {'ingredients': {'crystal': 1, 'gold': 1},  'smelt_time': 18, 'value': 250, 'unlock_cost': 1000},
    'dark_matter':  {'ingredients': {'crystal': 2, 'silver': 3},'smelt_time': 25, 'value': 500, 'unlock_cost': 2500},
}

ZONE_DIFFICULTY = {
    'inner':  {'grid_size': 4, 'rare_bonus': 0.0},
    'middle': {'grid_size': 6, 'rare_bonus': 0.05},
    'outer':  {'grid_size': 6, 'rare_bonus': 0.12},
}


def pick_ore_type(rare_bonus: float = 0.0) -> str:
    weights = {}
    for ore, data in ORE_TYPES.items():
        w = data['probability']
        if ore in ('gold', 'crystal'):
            w += rare_bonus
        weights[ore] = w
    total = sum(weights.values())
    r = random.random() * total
    cumulative = 0.0
    for ore, w in weights.items():
        cumulative += w
        if r <= cumulative:
            return ore
    return 'iron'


def generate_asteroid(asteroid_id: str, zone: str = 'inner', seed: int = None) -> Dict[str, Any]:
    if seed is not None:
        random.seed(seed)

    cfg = ZONE_DIFFICULTY.get(zone, ZONE_DIFFICULTY['inner'])
    grid_size = cfg['grid_size']
    rare_bonus = cfg['rare_bonus']

    hex_grid = []
    for row in range(grid_size):
        row_offset = row % 2
        for col in range(grid_size):
            ore = pick_ore_type(rare_bonus)
            ore_data = ORE_TYPES[ore]
            hex_grid.append({
                'row': row,
                'col': col,
                'row_offset': row_offset,
                'ore_type': ore,
                'color': ore_data['color'],
                'glow': ore_data['glow'],
                'value': ore_data['value'],
                'smelt_time': ore_data['smelt_time'],
                'mined': False,
            })

    total_value = sum(h['value'] for h in hex_grid)
    ore_distribution = {}
    for h in hex_grid:
        ore_distribution[h['ore_type']] = ore_distribution.get(h['ore_type'], 0) + 1

    x = random.uniform(-2000, 2000)
    y = random.uniform(-2000, 2000)

    return {
        'id': asteroid_id,
        'x': x,
        'y': y,
        'zone': zone,
        'grid_size': grid_size,
        'hex_grid': hex_grid,
        'total_value': total_value,
        'ore_distribution': ore_distribution,
        'mined_out': False,
    }


def generate_asteroid_field(count: int = 15, seed: int = None) -> List[Dict[str, Any]]:
    if seed is not None:
        random.seed(seed)

    asteroids = []
    zones = ['inner', 'middle', 'outer']
    for i in range(count):
        zone = zones[i % 3] if i < 9 else random.choice(zones)
        asteroid = generate_asteroid(f'ast_{i:03d}', zone)
        asteroids.append(asteroid)

    min_dist = 300
    for i in range(len(asteroids)):
        for j in range(i + 1, len(asteroids)):
            dx = asteroids[i]['x'] - asteroids[j]['x']
            dy = asteroids[i]['y'] - asteroids[j]['y']
            dist = math.sqrt(dx * dx + dy * dy)
            if dist < min_dist:
                angle = random.uniform(0, 2 * math.pi)
                push = (min_dist - dist) / 2 + 50
                asteroids[j]['x'] += math.cos(angle) * push
                asteroids[j]['y'] += math.sin(angle) * push

    return asteroids
