import uuid
import time
from typing import Dict, Optional


class LevelStore:
    def __init__(self):
        self.levels: Dict[str, dict] = {}
        self.replays: Dict[str, dict] = {}

    def save_level(self, level_data: dict) -> str:
        level_id = f"level_{uuid.uuid4().hex[:8]}"
        level_data['id'] = level_id
        level_data['createdAt'] = time.time()
        self.levels[level_id] = level_data
        return level_id

    def get_level(self, level_id: str) -> Optional[dict]:
        return self.levels.get(level_id)

    def get_all_levels(self) -> list:
        return list(self.levels.values())

    def save_replay(self, level_id: str, replay_data: dict) -> str:
        replay_id = f"replay_{uuid.uuid4().hex[:8]}"
        replay_data['replayId'] = replay_id
        replay_data['levelId'] = level_id
        self.replays[replay_id] = replay_data
        return replay_id

    def get_replay(self, replay_id: str) -> Optional[dict]:
        return self.replays.get(replay_id)


store = LevelStore()
