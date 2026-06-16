from flask import Flask, jsonify, request
from flask_cors import CORS
import random
import math
import heapq
from collections import deque

app = Flask(__name__)
CORS(app)

MAP_SIZE = 100
ROOM_SIZE = 10
CORRIDOR_WIDTH = 2

TILE_EMPTY = 0
TILE_WALL = 1
TILE_DOOR = 2
TILE_VENT = 3
TILE_START = 4
TILE_GOAL = 5

FLOOR_STONE = 0
FLOOR_CARPET = 1


class MapGenerator:
    def __init__(self, size=MAP_SIZE):
        self.size = size
        self.grid = [[TILE_WALL] * size for _ in range(size)]
        self.floor_type = [[FLOOR_STONE] * size for _ in range(size)]
        self.rooms = []
        self.doors = []
        self.vents = []
        self.start_pos = None
        self.goal_pos = None

    def generate(self):
        self._create_rooms()
        self._create_corridors()
        self._place_doors()
        self._place_vents()
        self._set_start_and_goal()
        self._assign_floor_types()
        return self._serialize()

    def _create_rooms(self):
        for z in range(3):
            for x in range(1, self.size - ROOM_SIZE - 1, ROOM_SIZE + 3):
                for y in range(1, self.size - ROOM_SIZE - 1, ROOM_SIZE + 3):
                    if random.random() < 0.7 or z == 1:
                        room = self._carve_room(x, y, ROOM_SIZE, ROOM_SIZE, z)
                        self.rooms.append(room)

    def _carve_room(self, x, y, w, h, zone):
        for i in range(w):
            for j in range(h):
                if 0 <= x + i < self.size and 0 <= y + j < self.size:
                    self.grid[y + j][x + i] = TILE_EMPTY
        return {
            'x': x, 'y': y, 'w': w, 'h': h, 'zone': zone,
            'cx': x + w // 2, 'cy': y + h // 2
        }

    def _create_corridors(self):
        for i in range(len(self.rooms)):
            for j in range(i + 1, len(self.rooms)):
                r1, r2 = self.rooms[i], self.rooms[j]
                dist = math.hypot(r1['cx'] - r2['cx'], r1['cy'] - r2['cy'])
                if dist < 30 and random.random() < 0.4:
                    self._carve_corridor(r1['cx'], r1['cy'], r2['cx'], r2['cy'])

    def _carve_corridor(self, x1, y1, x2, y2):
        cx, cy = x1, y1
        while cx != x2:
            for dy in range(-CORRIDOR_WIDTH // 2, CORRIDOR_WIDTH // 2 + 1):
                if 0 <= cy + dy < self.size:
                    self.grid[cy + dy][cx] = TILE_EMPTY
            cx += 1 if cx < x2 else -1
        while cy != y2:
            for dx in range(-CORRIDOR_WIDTH // 2, CORRIDOR_WIDTH // 2 + 1):
                if 0 <= cx + dx < self.size:
                    self.grid[cy][cx + dx] = TILE_EMPTY
            cy += 1 if cy < y2 else -1

    def _place_doors(self):
        for room in self.rooms:
            door_candidates = []
            for dx in range(room['w']):
                for dy in [-1, room['h']]:
                    x, y = room['x'] + dx, room['y'] + dy
                    if self._is_valid_door(x, y):
                        door_candidates.append((x, y))
            for dy in range(room['h']):
                for dx in [-1, room['w']]:
                    x, y = room['x'] + dx, room['y'] + dy
                    if self._is_valid_door(x, y):
                        door_candidates.append((x, y))
            if door_candidates:
                door_pos = random.choice(door_candidates)
                self.grid[door_pos[1]][door_pos[0]] = TILE_DOOR
                self.doors.append({'x': door_pos[0], 'y': door_pos[1], 'open': False})

    def _is_valid_door(self, x, y):
        if x <= 0 or x >= self.size - 1 or y <= 0 or y >= self.size - 1:
            return False
        if self.grid[y][x] != TILE_EMPTY:
            return False
        horizontal = (self.grid[y][x-1] == TILE_WALL and self.grid[y][x+1] == TILE_WALL)
        vertical = (self.grid[y-1][x] == TILE_WALL and self.grid[y+1][x] == TILE_WALL)
        return horizontal or vertical

    def _place_vents(self):
        for room in self.rooms:
            if random.random() < 0.5:
                vx = room['x'] + random.randint(1, room['w'] - 2)
                vy = room['y'] + random.randint(1, room['h'] - 2)
                if self.grid[vy][vx] == TILE_EMPTY:
                    self.grid[vy][vx] = TILE_VENT
                    self.vents.append({'x': vx, 'y': vy})

    def _set_start_and_goal(self):
        start_rooms = [r for r in self.rooms if r['zone'] == 0]
        goal_rooms = [r for r in self.rooms if r['zone'] == 2]
        if start_rooms:
            start = start_rooms[0]
            self.start_pos = (start['cx'], start['cy'])
            self.grid[start['cy']][start['cx']] = TILE_START
        if goal_rooms:
            goal = goal_rooms[-1]
            self.goal_pos = (goal['cx'], goal['cy'])
            self.grid[goal['cy']][goal['cx']] = TILE_GOAL

    def _assign_floor_types(self):
        for room in self.rooms:
            is_carpet = random.random() < 0.3
            for i in range(room['w']):
                for j in range(room['h']):
                    x, y = room['x'] + i, room['y'] + j
                    if 0 <= y < self.size and 0 <= x < self.size:
                        self.floor_type[y][x] = FLOOR_CARPET if is_carpet else FLOOR_STONE

    def _serialize(self):
        return {
            'size': self.size,
            'grid': self.grid,
            'floorType': self.floor_type,
            'rooms': self.rooms,
            'doors': self.doors,
            'vents': self.vents,
            'start': {'x': self.start_pos[0], 'y': self.start_pos[1]} if self.start_pos else None,
            'goal': {'x': self.goal_pos[0], 'y': self.goal_pos[1]} if self.goal_pos else None
        }


class AStarPathfinder:
    def __init__(self, grid, doors):
        self.grid = grid
        self.size = len(grid)
        self.doors = {(d['x'], d['y']): d['open'] for d in doors}

    def update_doors(self, doors):
        self.doors = {(d['x'], d['y']): d['open'] for d in doors}

    def _heuristic(self, a, b):
        return math.hypot(a[0] - b[0], a[1] - b[1])

    def _is_walkable(self, x, y, ignore_doors=False):
        if x < 0 or x >= self.size or y < 0 or y >= self.size:
            return False
        tile = self.grid[y][x]
        if tile == TILE_WALL:
            return False
        if tile == TILE_DOOR and not ignore_doors:
            return self.doors.get((x, y), False)
        return True

    def find_path(self, start, goal, ignore_doors=False):
        start = (int(start[0]), int(start[1]))
        goal = (int(goal[0]), int(goal[1]))
        if start == goal:
            return [start]

        frontier = []
        heapq.heappush(frontier, (0, start))
        came_from = {start: None}
        cost_so_far = {start: 0}

        while frontier:
            _, current = heapq.heappop(frontier)
            if current == goal:
                break
            for dx, dy in [(1, 0), (-1, 0), (0, 1), (0, -1)]:
                next_tile = (current[0] + dx, current[1] + dy)
                if not self._is_walkable(next_tile[0], next_tile[1], ignore_doors):
                    continue
                new_cost = cost_so_far[current] + 1
                if next_tile not in cost_so_far or new_cost < cost_so_far[next_tile]:
                    cost_so_far[next_tile] = new_cost
                    priority = new_cost + self._heuristic(next_tile, goal)
                    heapq.heappush(frontier, (priority, next_tile))
                    came_from[next_tile] = current

        if goal not in came_from:
            return [start]

        path = []
        current = goal
        while current is not None:
            path.append(current)
            current = came_from[current]
        path.reverse()
        return path

    def has_line_of_sight(self, a, b):
        x0, y0 = a
        x1, y1 = b
        dx = abs(x1 - x0)
        dy = abs(y1 - y0)
        sx = 1 if x0 < x1 else -1
        sy = 1 if y0 < y1 else -1
        err = dx - dy
        x, y = x0, y0
        while True:
            if (x, y) != (x0, y0) and not self._is_walkable(x, y, ignore_doors=True):
                return False
            if x == x1 and y == y1:
                return True
            e2 = 2 * err
            if e2 > -dy:
                err -= dy
                x += sx
            if e2 < dx:
                err += dx
                y += sy

    def has_audio_path(self, source, listener, doors_open):
        x0, y0 = int(source[0]), int(source[1])
        x1, y1 = int(listener[0]), int(listener[1])
        dx = abs(x1 - x0)
        dy = abs(y1 - y0)
        sx = 1 if x0 < x1 else -1
        sy = 1 if y0 < y1 else -1
        err = dx - dy
        x, y = x0, y0
        attenuation = 0
        while True:
            if self.grid[y][x] == TILE_DOOR:
                if not doors_open.get((x, y), False):
                    attenuation += 20
            if x == x1 and y == y1:
                break
            e2 = 2 * err
            if e2 > -dy:
                err -= dy
                x += sx
            if e2 < dx:
                err += dx
                y += sy
        return attenuation


pathfinder = None
map_data = None
ai_agents = []


@app.route('/api/map/generate', methods=['POST'])
def generate_map():
    global map_data, pathfinder, ai_agents
    generator = MapGenerator()
    map_data = generator.generate()
    pathfinder = AStarPathfinder(map_data['grid'], map_data['doors'])
    ai_agents = _initialize_ais(map_data)
    return jsonify(map_data)


def _initialize_ais(map_data):
    agents = []
    middle_rooms = [r for r in map_data['rooms'] if r['zone'] == 1]
    patrol_rooms = [r for r in map_data['rooms'] if r['zone'] >= 1]
    num_agents = min(5, len(middle_rooms))
    for i in range(num_agents):
        room = middle_rooms[i % len(middle_rooms)]
        patrol_points = random.sample(
            [(r['cx'], r['cy']) for r in patrol_rooms],
            min(3, len(patrol_rooms))
        )
        agents.append({
            'id': i,
            'x': float(room['cx']),
            'y': float(room['cy']),
            'state': 'patrol',
            'patrolPoints': patrol_points,
            'patrolIndex': 0,
            'path': [],
            'target': None,
            'lastSeenPlayer': None,
            'alertTimer': 0.0
        })
    return agents


@app.route('/api/ai/update', methods=['POST'])
def update_ai():
    global pathfinder, map_data
    data = request.json
    player = data.get('player', {})
    doors = data.get('doors', [])
    dt = data.get('dt', 0.016)

    if pathfinder is None:
        return jsonify({'error': 'Map not generated'}), 400

    doors_open = {(d['x'], d['y']): d.get('open', False) for d in doors}
    pathfinder.update_doors(doors)

    events = []

    for ai in ai_agents:
        px = player.get('x', 0)
        py = player.get('y', 0)
        dist_to_player = math.hypot(ai['x'] - px, ai['y'] - py)

        in_vision = _check_vision(ai, px, py, pathfinder)
        audio_attenuation = pathfinder.has_audio_path((ai['x'], ai['y']), (px, py), doors_open)
        effective_hearing = 12.0 - (audio_attenuation / 20.0) * 12.0
        in_hearing = dist_to_player <= effective_hearing and audio_attenuation < 40

        if in_vision or (in_hearing and ai['state'] == 'alert'):
            ai['state'] = 'chase'
            ai['lastSeenPlayer'] = (px, py)
            ai['alertTimer'] = 5.0
            ai['target'] = (px, py)
            if in_vision:
                events.append({'type': 'ai_alert', 'aiId': ai['id']})
        elif ai['state'] == 'chase':
            ai['alertTimer'] -= dt
            if ai['alertTimer'] <= 0:
                ai['state'] = 'patrol'
                ai['target'] = None
                ai['path'] = []
            elif ai['lastSeenPlayer']:
                ai['target'] = ai['lastSeenPlayer']

        speed = 0.5 if ai['state'] == 'patrol' else 1.2
        _move_ai(ai, speed, dt, pathfinder, doors_open, events)

    return jsonify({
        'ais': ai_agents,
        'events': events
    })


def _check_vision(ai, px, py, pathfinder):
    dx = px - ai['x']
    dy = py - ai['y']
    dist = math.hypot(dx, dy)
    if dist > 8.0:
        return False
    if not pathfinder.has_line_of_sight((int(ai['x']), int(ai['y'])), (int(px), int(py))):
        return False
    angle_to_target = math.atan2(dy, dx)
    ai_facing = ai.get('facing', 0)
    angle_diff = abs(((angle_to_target - ai_facing + math.pi) % (2 * math.pi)) - math.pi)
    return angle_diff <= math.pi / 4


def _move_ai(ai, speed, dt, pathfinder, doors_open, events):
    if not ai['path'] or len(ai['path']) < 2:
        if ai['state'] == 'patrol':
            target = ai['patrolPoints'][ai['patrolIndex']]
            if (abs(ai['x'] - target[0]) < 0.5 and abs(ai['y'] - target[1]) < 0.5):
                ai['patrolIndex'] = (ai['patrolIndex'] + 1) % len(ai['patrolPoints'])
                target = ai['patrolPoints'][ai['patrolIndex']]
            ai['path'] = pathfinder.find_path((ai['x'], ai['y']), target)
        elif ai['target']:
            ai['path'] = pathfinder.find_path(
                (ai['x'], ai['y']), ai['target'], ignore_doors=(ai['state'] == 'chase')
            )

    if ai['path'] and len(ai['path']) > 1:
        next_tile = ai['path'][1]
        dx = next_tile[0] - ai['x']
        dy = next_tile[1] - ai['y']
        dist = math.hypot(dx, dy)
        if dist < 0.1:
            ai['path'].pop(0)
            ai['x'] = float(next_tile[0])
            ai['y'] = float(next_tile[1])
            events.append({'type': 'footstep', 'aiId': ai['id'], 'x': ai['x'], 'y': ai['y']})
        else:
            move_speed = speed * dt
            ai['x'] += (dx / dist) * move_speed
            ai['y'] += (dy / dist) * move_speed
            ai['facing'] = math.atan2(dy, dx)
            if random.random() < dt * (speed * 2):
                events.append({'type': 'footstep', 'aiId': ai['id'], 'x': ai['x'], 'y': ai['y']})


@app.route('/api/doors/update', methods=['POST'])
def update_doors():
    global map_data
    if map_data is None:
        return jsonify({'error': 'Map not generated'}), 400
    data = request.json
    door_data = data.get('door')
    for door in map_data['doors']:
        if door['x'] == door_data['x'] and door['y'] == door_data['y']:
            door['open'] = door_data.get('open', not door['open'])
            return jsonify({'success': True, 'door': door})
    return jsonify({'error': 'Door not found'}), 404


@app.route('/api/path/find', methods=['POST'])
def find_path():
    global pathfinder
    if pathfinder is None:
        return jsonify({'error': 'Map not generated'}), 400
    data = request.json
    start = (data['start']['x'], data['start']['y'])
    goal = (data['goal']['x'], data['goal']['y'])
    ignore_doors = data.get('ignoreDoors', False)
    path = pathfinder.find_path(start, goal, ignore_doors)
    return jsonify({'path': [{'x': p[0], 'y': p[1]} for p in path]})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
