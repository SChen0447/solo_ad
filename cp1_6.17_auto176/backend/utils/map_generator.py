from .hex_utils import coord_key


TERRAIN_MOVE_COST = {
    'plain': 1,
    'forest': 2,
    'hill': 2,
    'river': 3,
    'city': 1,
}

TERRAIN_COLORS = {
    'plain': '#C8E6C9',
    'forest': '#1B5E20',
    'hill': '#795548',
    'river': '#1565C0',
    'city': '#607D8B',
}

UNIT_STATS = {
    'infantry': {'hp': 100, 'attack': 15, 'range': 1, 'moveCost': 2},
    'tank': {'hp': 200, 'attack': 40, 'range': 2, 'moveCost': 3},
    'artillery': {'hp': 80, 'attack': 50, 'range': 3, 'moveCost': 4},
}


class MapGenerator:
    def __init__(self, width, height, terrain_density, seed=None):
        self.width = width
        self.height = height
        self.terrain_density = terrain_density
        self.seed = seed or 0
        self._random_state = self.seed

    def _random(self):
        self._random_state = (self._random_state * 9301 + 49297) % 233280
        return self._random_state / 233280

    def generate(self):
        terrain_map = {}

        for r in range(self.height):
            for q in range(self.width):
                offset_q = r // 2
                axial_q = q - offset_q
                key = coord_key(axial_q, r)
                terrain_map[key] = self._generate_terrain(axial_q, r)

        self._grow_terrain_clusters(terrain_map, 'forest', max(1, int(self.terrain_density * 0.3)))
        self._grow_terrain_clusters(terrain_map, 'hill', max(1, int(self.terrain_density * 0.25)))
        self._generate_river(terrain_map)
        self._place_cities(terrain_map, max(1, int(self.terrain_density * 0.15)))

        hexes = []
        for r in range(self.height):
            for q in range(self.width):
                offset_q = r // 2
                axial_q = q - offset_q
                key = coord_key(axial_q, r)
                terrain = terrain_map.get(key, 'plain')
                hexes.append({'q': axial_q, 'r': r, 'terrain': terrain})

        return hexes

    def _generate_terrain(self, q, r):
        noise = self._random()
        if noise < 0.7:
            return 'plain'
        elif noise < 0.85:
            return 'forest'
        else:
            return 'hill'

    def _grow_terrain_clusters(self, terrain_map, terrain_type, cluster_count):
        all_keys = list(terrain_map.keys())

        for _ in range(cluster_count):
            if not all_keys:
                continue
            start_key = all_keys[int(self._random() * len(all_keys))]
            start_q, start_r = map(int, start_key.split(','))
            cluster_size = int(self._random() * 5) + 3

            self._grow_cluster(terrain_map, start_q, start_r, terrain_type, cluster_size)

    def _grow_cluster(self, terrain_map, start_q, start_r, terrain_type, size):
        visited = set()
        queue = [{'q': start_q, 'r': start_r}]
        grown = 0

        while queue and grown < size:
            current = queue.pop(0)
            key = coord_key(current['q'], current['r'])

            if key in visited:
                continue
            if key not in terrain_map:
                continue

            visited.add(key)
            terrain_map[key] = terrain_type
            grown += 1

            neighbors = self._get_neighbors(current['q'], current['r'])
            import random
            random.shuffle(neighbors)

            for neighbor in neighbors:
                n_key = coord_key(neighbor['q'], neighbor['r'])
                if n_key not in visited and n_key in terrain_map:
                    if self._random() < 0.6:
                        queue.append(neighbor)

    def _generate_river(self, terrain_map):
        start_row = int(self._random() * self.height)
        q = -(start_row // 2)

        for r in range(start_row, self.height):
            key = coord_key(q, r)
            if key in terrain_map:
                terrain_map[key] = 'river'

            direction = self._random()
            if direction < 0.3:
                q -= 1
            elif direction > 0.7:
                q += 1

            if r % 2 == 1:
                q += 1

    def _place_cities(self, terrain_map, count):
        plain_keys = [key for key, terrain in terrain_map.items() if terrain == 'plain']

        for _ in range(count):
            if not plain_keys:
                break
            index = int(self._random() * len(plain_keys))
            key = plain_keys.pop(index)
            terrain_map[key] = 'city'

    def _get_neighbors(self, q, r):
        return [
            {'q': q + 1, 'r': r},
            {'q': q + 1, 'r': r - 1},
            {'q': q, 'r': r - 1},
            {'q': q - 1, 'r': r},
            {'q': q - 1, 'r': r + 1},
            {'q': q, 'r': r + 1},
        ]


def generate_map(width=20, height=15, terrain_density=50, seed=None):
    generator = MapGenerator(width, height, terrain_density, seed)
    return generator.generate()
