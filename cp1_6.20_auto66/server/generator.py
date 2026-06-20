import random
import time
from typing import List, Tuple, Dict, Any

CellType = str
WALL: CellType = 'wall'
FLOOR: CellType = 'floor'
ENTRANCE: CellType = 'entrance'
EXIT: CellType = 'exit'

GRID_SIZE = 10

MONSTER_NAMES = ['史莱姆', '骷髅兵', '哥布林', '蝙蝠', '僵尸']

class DungeonGenerator:
    def __init__(self, seed: int = None):
        if seed is None:
            seed = int(time.time() * 1000) % 100000
        self.seed = seed
        self.rng = random.Random(seed)
    
    def generate(self, difficulty: int = 1) -> Dict[str, Any]:
        start_time = time.time()
        
        grid = self._create_grid()
        self._recursive_division(grid, 0, 0, GRID_SIZE, GRID_SIZE)
        
        floor_cells = self._get_floor_cells(grid)
        entrance, exit_pos = self._place_entrance_exit(grid, floor_cells)
        
        self._ensure_connectivity(grid, entrance, exit_pos)
        
        monsters = self._place_monsters(grid, floor_cells, difficulty, entrance, exit_pos)
        treasures = self._place_treasures(grid, floor_cells, difficulty, entrance, exit_pos, monsters)
        
        elapsed = time.time() - start_time
        assert elapsed < 0.1, f"地牢生成耗时过长: {elapsed:.3f}s"
        
        return {
            'grid': grid,
            'entrance': {'x': entrance[0], 'y': entrance[1]},
            'exit': {'x': exit_pos[0], 'y': exit_pos[1]},
            'monsters': monsters,
            'treasures': treasures,
            'seed': self.seed,
            'difficulty': difficulty
        }
    
    def _create_grid(self) -> List[List[CellType]]:
        return [[WALL for _ in range(GRID_SIZE)] for _ in range(GRID_SIZE)]
    
    def _recursive_division(self, grid: List[List[CellType]], 
                           x: int, y: int, w: int, h: int) -> None:
        if w < 3 or h < 3:
            for i in range(x, x + w):
                for j in range(y, y + h):
                    if 0 <= i < GRID_SIZE and 0 <= j < GRID_SIZE:
                        grid[j][i] = FLOOR
            return
        
        if w > h:
            split_x = x + 2 + self.rng.randint(0, (w - 3) // 2) * 2
            passage_y = y + 1 + self.rng.randint(0, (h - 1) // 2) * 2
            
            for i in range(y, y + h):
                if 0 <= split_x < GRID_SIZE and 0 <= i < GRID_SIZE:
                    if i != passage_y:
                        grid[i][split_x] = WALL
            
            self._recursive_division(grid, x, y, split_x - x, h)
            self._recursive_division(grid, split_x + 1, y, x + w - split_x - 1, h)
        else:
            split_y = y + 2 + self.rng.randint(0, (h - 3) // 2) * 2
            passage_x = x + 1 + self.rng.randint(0, (w - 1) // 2) * 2
            
            for i in range(x, x + w):
                if 0 <= i < GRID_SIZE and 0 <= split_y < GRID_SIZE:
                    if i != passage_x:
                        grid[split_y][i] = WALL
            
            self._recursive_division(grid, x, y, w, split_y - y)
            self._recursive_division(grid, x, split_y + 1, w, y + h - split_y - 1)
    
    def _get_floor_cells(self, grid: List[List[CellType]]) -> List[Tuple[int, int]]:
        cells = []
        for y in range(GRID_SIZE):
            for x in range(GRID_SIZE):
                if grid[y][x] == FLOOR:
                    cells.append((x, y))
        return cells
    
    def _place_entrance_exit(self, grid: List[List[CellType]], 
                            floor_cells: List[Tuple[int, int]]) -> Tuple[Tuple[int, int], Tuple[int, int]]:
        corners = [c for c in floor_cells if c[0] in [0, GRID_SIZE-1] or c[1] in [0, GRID_SIZE-1]]
        
        if len(corners) < 2:
            corners = floor_cells[:2]
        
        entrance = corners[0]
        exit_pos = corners[-1]
        
        grid[entrance[1]][entrance[0]] = ENTRANCE
        grid[exit_pos[1]][exit_pos[0]] = EXIT
        
        return entrance, exit_pos
    
    def _ensure_connectivity(self, grid: List[List[CellType]], 
                            start: Tuple[int, int], end: Tuple[int, int]) -> None:
        visited = self._bfs(grid, start)
        
        all_floor = self._get_floor_cells(grid)
        all_floor.extend([start, end])
        
        for cell in all_floor:
            if cell not in visited and grid[cell[1]][cell[0]] != WALL:
                self._connect_cell(grid, cell, visited)
    
    def _bfs(self, grid: List[List[CellType]], start: Tuple[int, int]) -> set:
        visited = set()
        queue = [start]
        visited.add(start)
        
        directions = [(0, 1), (0, -1), (1, 0), (-1, 0)]
        
        while queue:
            x, y = queue.pop(0)
            for dx, dy in directions:
                nx, ny = x + dx, y + dy
                if (0 <= nx < GRID_SIZE and 0 <= ny < GRID_SIZE and 
                    (nx, ny) not in visited and grid[ny][nx] != WALL):
                    visited.add((nx, ny))
                    queue.append((nx, ny))
        
        return visited
    
    def _connect_cell(self, grid: List[List[CellType]], cell: Tuple[int, int], 
                     visited: set) -> None:
        directions = [(0, 1), (0, -1), (1, 0), (-1, 0)]
        x, y = cell
        
        for dx, dy in directions:
            nx, ny = x + dx, y + dy
            if 0 <= nx < GRID_SIZE and 0 <= ny < GRID_SIZE:
                if (nx, ny) in visited:
                    mid_x, mid_y = (x + nx) // 2, (y + ny) // 2
                    if grid[mid_y][mid_x] == WALL:
                        grid[mid_y][mid_x] = FLOOR
                    return
    
    def _place_monsters(self, grid: List[List[CellType]], 
                       floor_cells: List[Tuple[int, int]], 
                       difficulty: int,
                       entrance: Tuple[int, int],
                       exit_pos: Tuple[int, int]) -> List[Dict[str, Any]]:
        monster_count = 3 + self.rng.randint(0, 2 + difficulty)
        monster_count = min(monster_count, 5)
        
        available_cells = [c for c in floor_cells 
                          if c != entrance and c != exit_pos 
                          and self._distance(c, entrance) > 2]
        
        monsters = []
        used_cells = set()
        
        for i in range(min(monster_count, len(available_cells))):
            idx = self.rng.randint(0, len(available_cells) - 1)
            while available_cells[idx] in used_cells and len(used_cells) < len(available_cells):
                idx = self.rng.randint(0, len(available_cells) - 1)
            
            pos = available_cells[idx]
            used_cells.add(pos)
            
            base_hp = 20 + difficulty * 10
            base_attack = 5 + difficulty * 3
            base_defense = 2 + difficulty * 2
            
            monster = {
                'id': f'monster_{i}',
                'position': {'x': pos[0], 'y': pos[1]},
                'hp': base_hp + self.rng.randint(-5, 5),
                'maxHp': base_hp,
                'attack': base_attack + self.rng.randint(-2, 2),
                'defense': base_defense + self.rng.randint(-1, 1),
                'name': self.rng.choice(MONSTER_NAMES)
            }
            monsters.append(monster)
        
        return monsters
    
    def _place_treasures(self, grid: List[List[CellType]], 
                        floor_cells: List[Tuple[int, int]],
                        difficulty: int,
                        entrance: Tuple[int, int],
                        exit_pos: Tuple[int, int],
                        monsters: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        treasure_count = 2 + self.rng.randint(0, 2)
        
        monster_positions = {(m['position']['x'], m['position']['y']) for m in monsters}
        
        available_cells = [c for c in floor_cells 
                          if c != entrance and c != exit_pos 
                          and c not in monster_positions]
        
        treasures = []
        used_cells = set()
        
        for i in range(min(treasure_count, len(available_cells))):
            idx = self.rng.randint(0, len(available_cells) - 1)
            while available_cells[idx] in used_cells and len(used_cells) < len(available_cells):
                idx = self.rng.randint(0, len(available_cells) - 1)
            
            pos = available_cells[idx]
            used_cells.add(pos)
            
            treasure_type = self.rng.choice(['heal', 'attack'])
            value = 20 if treasure_type == 'heal' else 5
            
            treasure = {
                'id': f'treasure_{i}',
                'position': {'x': pos[0], 'y': pos[1]},
                'type': treasure_type,
                'value': value,
                'collected': False
            }
            treasures.append(treasure)
        
        return treasures
    
    def _distance(self, a: Tuple[int, int], b: Tuple[int, int]) -> int:
        return abs(a[0] - b[0]) + abs(a[1] - b[1])


class FightCalculator:
    def __init__(self, seed: int = None):
        self.rng = random.Random(seed)
    
    def calculate(self, player_attack: int, monster_defense: int, 
                  monster_hp: int, player_hp: int, 
                  monster_attack: int) -> Dict[str, Any]:
        defense_variation = self.rng.randint(-2, 2)
        actual_defense = max(0, monster_defense + defense_variation)
        
        damage = max(1, player_attack - actual_defense)
        new_monster_hp = max(0, monster_hp - damage)
        monster_defeated = new_monster_hp <= 0
        
        counter_damage = 0
        new_player_hp = player_hp
        player_defeated = False
        
        if not monster_defeated:
            counter_damage = max(1, monster_attack - 5)
            new_player_hp = max(0, player_hp - counter_damage)
            player_defeated = new_player_hp <= 0
        
        return {
            'damage': damage,
            'monsterHp': new_monster_hp,
            'monsterDefeated': monster_defeated,
            'counterDamage': counter_damage,
            'playerHp': new_player_hp,
            'playerDefeated': player_defeated,
            'defenseVariation': defense_variation
        }
