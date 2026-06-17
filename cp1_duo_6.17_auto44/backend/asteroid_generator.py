import random
import math
from typing import List, Dict, Any

ORE_TYPES = {
    "iron": {"base_value": 10, "probability": 0.35, "smelt_time": 3, "color": "#888899"},
    "copper": {"base_value": 20, "probability": 0.28, "smelt_time": 4, "color": "#cc7744"},
    "silver": {"base_value": 40, "probability": 0.20, "smelt_time": 6, "color": "#ccccdd"},
    "gold": {"base_value": 80, "probability": 0.12, "smelt_time": 10, "color": "#ffcc00"},
    "crystal": {"base_value": 120, "probability": 0.05, "smelt_time": 8, "color": "#66ddff"},
}

DIFFICULTY_PRESETS = {
    "easy": {"rare_multiplier": 1.5, "grid_size": 3},
    "normal": {"rare_multiplier": 1.0, "grid_size": 3},
    "hard": {"rare_multiplier": 0.6, "grid_size": 4},
}

ZONE_MODIFIERS = {
    "inner": {"iron": 0.5, "copper": 0.3, "silver": 0.15, "gold": 0.04, "crystal": 0.01},
    "middle": {"iron": 0.25, "copper": 0.25, "silver": 0.25, "gold": 0.15, "crystal": 0.10},
    "outer": {"iron": 0.10, "copper": 0.15, "silver": 0.25, "gold": 0.30, "crystal": 0.20},
}

ALLOY_RECIPES = {
    "bronze": {"ores": ["copper", "iron"], "result_value": 50, "smelt_time": 5},
    "electrum": {"ores": ["gold", "silver"], "result_value": 180, "smelt_time": 12},
    "crystal_steel": {"ores": ["iron", "crystal"], "result_value": 250, "smelt_time": 15},
}


def roll_ore_type(zone: str = "middle", difficulty: str = "normal") -> str:
    zone_probs = ZONE_MODIFIERS.get(zone, ZONE_MODIFIERS["middle"])
    diff_mult = DIFFICULTY_PRESETS.get(difficulty, DIFFICULTY_PRESETS["normal"])["rare_multiplier"]

    adjusted = {}
    for ore, prob in zone_probs.items():
        if ore in ("gold", "crystal"):
            adjusted[ore] = prob * diff_mult
        else:
            adjusted[ore] = prob

    total = sum(adjusted.values())
    normalized = {k: v / total for k, v in adjusted.items()}

    roll = random.random()
    cumulative = 0
    for ore, prob in normalized.items():
        cumulative += prob
        if roll <= cumulative:
            return ore
    return "iron"


def hex_distance(q1: int, r1: int, q2: int, r2: int) -> int:
    return (abs(q1 - q2) + abs(q1 + r1 - q2 - r2) + abs(r1 - r2)) // 2


def generate_asteroid(
    asteroid_id: str,
    grid_radius: int = 3,
    zone: str = "middle",
    difficulty: str = "normal",
) -> Dict[str, Any]:
    hex_size = 28
    cells = []

    for q in range(-grid_radius, grid_radius + 1):
        for r in range(-grid_radius, grid_radius + 1):
            if abs(q + r) > grid_radius:
                continue

            px = hex_size * (math.sqrt(3) * q + math.sqrt(3) / 2 * r)
            py = hex_size * (3 / 2 * r)

            max_dist = hex_size * grid_radius * 1.5
            if math.sqrt(px * px + py * py) > max_dist:
                continue

            ore = roll_ore_type(zone, difficulty)
            cells.append({
                "q": q,
                "r": r,
                "ore": ore,
                "mined": False,
                "x": round(px, 2),
                "y": round(py, 2),
            })

    ore_counts = {}
    for cell in cells:
        ore = cell["ore"]
        ore_counts[ore] = ore_counts.get(ore, 0) + 1

    return {
        "id": asteroid_id,
        "grid_radius": grid_radius,
        "zone": zone,
        "difficulty": difficulty,
        "cells": cells,
        "ore_counts": ore_counts,
        "total_cells": len(cells),
    }


def generate_asteroid_field(
    count: int = 18,
    world_width: int = 8000,
    world_height: int = 8000,
    station_x: int = 4000,
    station_y: int = 4000,
) -> List[Dict[str, Any]]:
    asteroids = []
    min_dist_from_station = 300

    for i in range(count):
        attempts = 0
        while attempts < 50:
            x = random.randint(400, world_width - 400)
            y = random.randint(400, world_height - 400)
            dist = math.sqrt((x - station_x) ** 2 + (y - station_y) ** 2)
            if dist >= min_dist_from_station:
                break
            attempts += 1

        max_dim = max(world_width, world_height)
        dist_from_center = math.sqrt((x - world_width / 2) ** 2 + (y - world_height / 2) ** 2)
        ratio = dist_from_center / (max_dim / 2)

        if ratio < 0.33:
            zone = "inner"
        elif ratio < 0.66:
            zone = "middle"
        else:
            zone = "outer"

        grid_radius = random.choice([3, 3, 4])
        asteroid = generate_asteroid(f"ast_{i}", grid_radius, zone)
        asteroid["world_x"] = x
        asteroid["world_y"] = y
        asteroids.append(asteroid)

    return asteroids
