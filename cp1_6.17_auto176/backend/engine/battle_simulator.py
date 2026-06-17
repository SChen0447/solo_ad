import copy
from utils.hex_utils import hex_distance, coord_key
from utils.map_generator import TERRAIN_MOVE_COST


class BattleSimulator:
    def __init__(self, units, terrain, move_paths, max_turns=50):
        self.units = copy.deepcopy(units)
        self.terrain = {}
        self.move_paths = {}
        self.max_turns = max_turns
        self.turn_states = []

        for hex_data in terrain:
            key = coord_key(hex_data['q'], hex_data['r'])
            self.terrain[key] = hex_data['terrain']

        for path in move_paths:
            self.move_paths[path['unitId']] = list(path['waypoints'])

    def simulate(self):
        self.turn_states = []

        initial_state = {
            'turn': 0,
            'units': copy.deepcopy(self.units),
            'attacks': [],
            'destroyedThisTurn': [],
        }
        self.turn_states.append(initial_state)

        for turn in range(1, self.max_turns + 1):
            turn_result = self._execute_turn(turn)
            self.turn_states.append(turn_result)

            winner = self._check_winner()
            if winner is not None:
                return {
                    'turns': self.turn_states,
                    'winner': winner,
                    'totalTurns': turn,
                }

        return {
            'turns': self.turn_states,
            'winner': 'draw',
            'totalTurns': self.max_turns,
        }

    def _execute_turn(self, turn_number):
        attacks = []
        destroyed_this_turn = []

        alive_units = [u for u in self.units if not u.get('isDestroyed', False)]
        blue_units = [u for u in alive_units if u['faction'] == 'blue']
        red_units = [u for u in alive_units if u['faction'] == 'red']

        all_units = blue_units + red_units

        for unit in all_units:
            if unit.get('isDestroyed', False):
                continue

            path = self.move_paths.get(unit['id'], [])
            if path:
                self._move_unit(unit, path)

        for unit in all_units:
            if unit.get('isDestroyed', False):
                continue

            targets = self._find_targets_in_range(unit)
            for target in targets:
                if target.get('isDestroyed', False):
                    continue

                damage = self._calculate_damage(unit, target)
                target['hp'] -= damage

                attacks.append({
                    'attackerId': unit['id'],
                    'targetId': target['id'],
                    'damage': damage,
                    'turn': turn_number,
                })

                if target['hp'] <= 0:
                    target['hp'] = 0
                    target['isDestroyed'] = True
                    destroyed_this_turn.append(copy.deepcopy(target))

        return {
            'turn': turn_number,
            'units': copy.deepcopy(self.units),
            'attacks': attacks,
            'destroyedThisTurn': destroyed_this_turn,
        }

    def _move_unit(self, unit, path):
        move_points = unit['moveCost']

        while move_points > 0 and path:
            next_waypoint = path[0]
            terrain_key = coord_key(next_waypoint['q'], next_waypoint['r'])
            terrain = self.terrain.get(terrain_key, 'plain')
            move_cost = TERRAIN_MOVE_COST[terrain]

            if move_points >= move_cost:
                unit['q'] = next_waypoint['q']
                unit['r'] = next_waypoint['r']
                move_points -= move_cost
                path.pop(0)
            else:
                break

        self.move_paths[unit['id']] = path

    def _find_targets_in_range(self, unit):
        targets = []

        for other in self.units:
            if other['faction'] == unit['faction']:
                continue
            if other.get('isDestroyed', False):
                continue

            dist = hex_distance(
                {'q': unit['q'], 'r': unit['r']},
                {'q': other['q'], 'r': other['r']}
            )

            if dist <= unit['range']:
                targets.append(other)

        targets.sort(key=lambda u: u['hp'])

        return targets

    def _calculate_damage(self, attacker, target):
        base_damage = attacker['attack']
        terrain_key = coord_key(target['q'], target['r'])
        terrain = self.terrain.get(terrain_key, 'plain')

        defense_bonus = 1.0
        if terrain == 'forest':
            defense_bonus = 0.8
        elif terrain == 'hill':
            defense_bonus = 0.85
        elif terrain == 'city':
            defense_bonus = 0.75

        return int(base_damage * defense_bonus)

    def _check_winner(self):
        blue_alive = [u for u in self.units if u['faction'] == 'blue' and not u.get('isDestroyed', False)]
        red_alive = [u for u in self.units if u['faction'] == 'red' and not u.get('isDestroyed', False)]

        if not blue_alive and not red_alive:
            return 'draw'
        if not blue_alive:
            return 'red'
        if not red_alive:
            return 'blue'

        return None


def run_simulation(units, terrain, move_paths, max_turns=50):
    simulator = BattleSimulator(units, terrain, move_paths, max_turns)
    return simulator.simulate()
