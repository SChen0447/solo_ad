import copy
import random
import time
from typing import Any, Dict, List, Tuple


class CombatSimulator:
    def __init__(self, characters: List[Dict], monsters: List[Dict], max_rounds: int = 100):
        self.characters = copy.deepcopy(characters)
        self.monsters = copy.deepcopy(monsters)
        self.max_rounds = max_rounds
        self.logs: List[Dict] = []
        self.stats = {
            'totalDamageBySide': {'characters': 0, 'monsters': 0},
            'totalHealing': 0,
            'dodgeCount': {'characters': 0, 'monsters': 0},
            'critCount': {'characters': 0, 'monsters': 0},
            'damageByUnit': {}
        }
        self._initialize_units()

    def _initialize_units(self) -> None:
        for unit in self.characters + self.monsters:
            unit['currentHp'] = unit['maxHp']
            unit['isAlive'] = True
            self.stats['damageByUnit'][unit['id']] = 0
            for skill in unit.get('skills', []):
                skill['currentCooldown'] = 0

    def _get_all_alive_units(self) -> List[Dict]:
        return [u for u in self.characters + self.monsters if u['isAlive']]

    def _get_enemies(self, unit: Dict) -> List[Dict]:
        if unit in self.characters:
            return [u for u in self.monsters if u['isAlive']]
        return [u for u in self.characters if u['isAlive']]

    def _select_target(self, enemies: List[Dict]) -> Dict:
        return min(enemies, key=lambda e: e['currentHp'])

    def _select_skill(self, unit: Dict) -> Tuple[str, float]:
        available_skills = [s for s in unit.get('skills', []) if s['currentCooldown'] == 0]
        if available_skills:
            best_skill = max(available_skills, key=lambda s: s['damageCoefficient'])
            return best_skill['name'], best_skill['damageCoefficient']
        return '普通攻击', 1.0

    def _reduce_cooldowns(self, unit: Dict) -> None:
        for skill in unit.get('skills', []):
            if skill['currentCooldown'] > 0:
                skill['currentCooldown'] -= 1

    def _set_skill_cooldown(self, unit: Dict, skill_name: str) -> None:
        for skill in unit.get('skills', []):
            if skill['name'] == skill_name:
                skill['currentCooldown'] = skill['cooldown']
                break

    def _calculate_damage(self, attacker: Dict, target: Dict, coefficient: float, is_crit: bool) -> int:
        base_damage = attacker['attack'] * coefficient
        crit_multiplier = 1.5 if is_crit else 1.0
        defense_factor = 1 - (target['defense'] / (target['defense'] + 100))
        damage = int(base_damage * crit_multiplier * defense_factor)
        return max(1, damage)

    def _is_dodged(self, target: Dict) -> bool:
        return random.random() * 100 < target['dodgeRate']

    def _is_crit(self, attacker: Dict) -> bool:
        return random.random() * 100 < attacker['critRate']

    def _log_entry(self, round_num: int, actor: Dict, target: Dict,
                   skill_name: str, is_hit: bool, is_crit: bool, damage: int) -> None:
        entry = {
            'id': f'log_{len(self.logs) + 1}',
            'round': round_num,
            'actorId': actor['id'],
            'actorName': actor['name'],
            'targetId': target['id'],
            'targetName': target['name'],
            'skillName': skill_name,
            'isHit': is_hit,
            'isCrit': is_crit,
            'damage': damage if is_hit else 0,
            'timestamp': int(time.time() * 1000)
        }
        self.logs.append(entry)

    def _update_stats(self, actor: Dict, damage: int, is_dodge: bool, is_crit: bool) -> None:
        if is_dodge:
            if actor in self.characters:
                self.stats['dodgeCount']['monsters'] += 1
            else:
                self.stats['dodgeCount']['characters'] += 1
            return

        if is_crit:
            if actor in self.characters:
                self.stats['critCount']['characters'] += 1
            else:
                self.stats['critCount']['monsters'] += 1

        if actor in self.characters:
            self.stats['totalDamageBySide']['characters'] += damage
        else:
            self.stats['totalDamageBySide']['monsters'] += damage

        self.stats['damageByUnit'][actor['id']] += damage

    def _check_battle_end(self) -> Tuple[bool, str]:
        chars_alive = any(u['isAlive'] for u in self.characters)
        mons_alive = any(u['isAlive'] for u in self.monsters)

        if not chars_alive:
            return True, 'monsters'
        if not mons_alive:
            return True, 'characters'
        return False, ''

    def simulate(self) -> Dict[str, Any]:
        round_num = 0
        winner = 'draw'

        while round_num < self.max_rounds:
            round_num += 1
            alive_units = sorted(
                self._get_all_alive_units(),
                key=lambda u: u['speed'],
                reverse=True
            )

            for unit in alive_units:
                if not unit['isAlive']:
                    continue

                self._reduce_cooldowns(unit)
                enemies = self._get_enemies(unit)

                if not enemies:
                    break

                target = self._select_target(enemies)
                skill_name, coefficient = self._select_skill(unit)

                is_dodged = self._is_dodged(target)

                if is_dodged:
                    self._log_entry(round_num, unit, target, skill_name, False, False, 0)
                    self._update_stats(unit, 0, True, False)
                    continue

                is_crit = self._is_crit(unit)
                damage = self._calculate_damage(unit, target, coefficient, is_crit)

                target['currentHp'] = max(0, target['currentHp'] - damage)
                if target['currentHp'] == 0:
                    target['isAlive'] = False

                self._log_entry(round_num, unit, target, skill_name, True, is_crit, damage)
                self._update_stats(unit, damage, False, is_crit)
                self._set_skill_cooldown(unit, skill_name)

                battle_end, win_side = self._check_battle_end()
                if battle_end:
                    winner = win_side
                    return {
                        'success': True,
                        'winner': winner,
                        'totalRounds': round_num,
                        'logs': self.logs,
                        'stats': self.stats
                    }

        return {
            'success': True,
            'winner': winner,
            'totalRounds': round_num,
            'logs': self.logs,
            'stats': self.stats
        }
