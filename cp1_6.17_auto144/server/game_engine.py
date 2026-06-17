import random
import time
from enum import Enum
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field


class InstructionType(Enum):
    CLICK_BUTTON = "click_button"
    KEY_COMBO = "key_combo"
    COMBO_HIT = "combo_hit"
    QUICK_SWIPE = "quick_swipe"


@dataclass
class Instruction:
    type: InstructionType
    emoji: str
    description: str
    target: str
    combo_count: int = 1
    time_limit: float = 5.0


@dataclass
class PlayerResult:
    player_id: str
    nickname: str
    success: bool
    reaction_time: Optional[float] = None
    score: int = 0


@dataclass
class RoundResult:
    round_number: int
    instruction: Instruction
    results: List[PlayerResult] = field(default_factory=list)


@dataclass
class PlayerState:
    player_id: str
    nickname: str
    score: int = 0
    fail_count: int = 0
    eliminated: bool = False
    last_reaction_time: Optional[float] = None


class GameEngine:
    INSTRUCTION_POOL: List[Dict[str, Any]] = [
        {
            "type": InstructionType.CLICK_BUTTON,
            "emoji": "👆",
            "description": "点击{target}按钮",
            "targets": ["红色", "蓝色", "绿色", "黄色"],
            "target_colors": {
                "红色": "#e74c3c",
                "蓝色": "#3498db",
                "绿色": "#2ecc71",
                "黄色": "#f1c40f",
            },
        },
        {
            "type": InstructionType.KEY_COMBO,
            "emoji": "⌨️",
            "description": "按下 {target} 键",
            "targets": ["A", "S", "D", "F", "J", "K", "L", "Q", "W", "E"],
        },
        {
            "type": InstructionType.COMBO_HIT,
            "emoji": "💥",
            "description": "连击空格 {target} 次",
            "targets": ["3", "5", "7"],
        },
        {
            "type": InstructionType.QUICK_SWIPE,
            "emoji": "👆",
            "description": "快速滑动到{target}",
            "targets": ["上方", "下方", "左方", "右方"],
        },
    ]

    PLAYER_COLORS = ["#e74c3c", "#3498db", "#2ecc71", "#f39c12"]

    def __init__(self, round_duration: float = 5.0, total_rounds: int = 10):
        self.round_duration = round_duration
        self.total_rounds = total_rounds
        self.current_round = 0
        self.players: Dict[str, PlayerState] = {}
        self.round_history: List[RoundResult] = []
        self.current_instruction: Optional[Instruction] = None
        self.round_start_time: Optional[float] = None
        self.replay_data: List[Dict[str, Any]] = []
        self._used_instructions: List[str] = []

    def add_player(self, player_id: str, nickname: str) -> PlayerState:
        player = PlayerState(player_id=player_id, nickname=nickname)
        self.players[player_id] = player
        return player

    def remove_player(self, player_id: str) -> None:
        if player_id in self.players:
            del self.players[player_id]

    def get_active_players(self) -> List[PlayerState]:
        return [p for p in self.players.values() if not p.eliminated]

    def generate_instruction(self) -> Instruction:
        template = random.choice(self.INSTRUCTION_POOL)
        target = random.choice(template["targets"])

        combo_count = 1
        if template["type"] == InstructionType.COMBO_HIT:
            combo_count = int(target)
        elif template["type"] == InstructionType.QUICK_SWIPE:
            combo_count = 1

        instruction_key = f"{template['type'].value}_{target}"
        self._used_instructions.append(instruction_key)

        instruction = Instruction(
            type=template["type"],
            emoji=template["emoji"],
            description=template["description"].format(target=target),
            target=target,
            combo_count=combo_count,
            time_limit=self.round_duration,
        )

        if template["type"] == InstructionType.CLICK_BUTTON and "target_colors" in template:
            instruction.target_color = template["target_colors"].get(target, "#888")

        self.current_instruction = instruction
        return instruction

    def start_round(self) -> Optional[Instruction]:
        active = self.get_active_players()
        if len(active) <= 1 and self.current_round > 0:
            return None
        if self.current_round >= self.total_rounds:
            return None

        self.current_round += 1
        instruction = self.generate_instruction()
        self.round_start_time = time.time()

        self.replay_data.append({
            "round": self.current_round,
            "instruction": {
                "type": instruction.type.value,
                "emoji": instruction.emoji,
                "description": instruction.description,
                "target": instruction.target,
                "combo_count": instruction.combo_count,
                "time_limit": instruction.time_limit,
            },
            "player_results": {},
        })

        return instruction

    def submit_result(self, player_id: str, success: bool, reaction_time: Optional[float] = None) -> Optional[PlayerResult]:
        if player_id not in self.players:
            return None
        player = self.players[player_id]
        if player.eliminated:
            return None

        score = 0
        if success and reaction_time is not None and self.round_duration > 0:
            base_score = 100
            time_ratio = max(0, 1.0 - reaction_time / self.round_duration)
            time_bonus = int(50 * time_ratio)
            early_bonus = 0
            if time_ratio > 0.8:
                early_bonus = 30
            elif time_ratio > 0.6:
                early_bonus = 15
            score = base_score + time_bonus + early_bonus

        result = PlayerResult(
            player_id=player_id,
            nickname=player.nickname,
            success=success,
            reaction_time=reaction_time,
            score=score,
        )

        player.score += score
        player.last_reaction_time = reaction_time

        if not success:
            player.fail_count += 1
            if player.fail_count >= 3:
                player.eliminated = True

        if self.replay_data:
            self.replay_data[-1]["player_results"][player_id] = {
                "nickname": player.nickname,
                "success": success,
                "reaction_time": reaction_time,
                "score": score,
            }

        return result

    def get_rankings(self) -> List[Dict[str, Any]]:
        sorted_players = sorted(self.players.values(), key=lambda p: p.score, reverse=True)
        rankings = []
        for i, p in enumerate(sorted_players):
            rank = i + 1
            rankings.append({
                "rank": rank,
                "player_id": p.player_id,
                "nickname": p.nickname,
                "score": p.score,
                "fail_count": p.fail_count,
                "eliminated": p.eliminated,
                "color": self.PLAYER_COLORS[i % len(self.PLAYER_COLORS)],
            })
        return rankings

    def is_game_over(self) -> bool:
        if self.current_round >= self.total_rounds:
            return True
        active = self.get_active_players()
        if len(active) <= 1 and self.current_round > 0:
            return True
        return False

    def get_game_state(self) -> Dict[str, Any]:
        return {
            "current_round": self.current_round,
            "total_rounds": self.total_rounds,
            "round_duration": self.round_duration,
            "players": {
                pid: {
                    "nickname": p.nickname,
                    "score": p.score,
                    "fail_count": p.fail_count,
                    "eliminated": p.eliminated,
                    "color": self.PLAYER_COLORS[list(self.players.keys()).index(pid) % len(self.PLAYER_COLORS)],
                }
                for pid, p in self.players.items()
            },
            "rankings": self.get_rankings(),
            "is_game_over": self.is_game_over(),
            "replay_data": self.replay_data,
        }

    def instruction_to_dict(self, instruction: Instruction) -> Dict[str, Any]:
        result = {
            "type": instruction.type.value,
            "emoji": instruction.emoji,
            "description": instruction.description,
            "target": instruction.target,
            "combo_count": instruction.combo_count,
            "time_limit": instruction.time_limit,
        }
        if hasattr(instruction, "target_color"):
            result["target_color"] = instruction.target_color
        return result
