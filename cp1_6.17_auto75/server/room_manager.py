import uuid
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field, asdict


@dataclass
class MindmapNode:
    id: str
    parent_id: Optional[str]
    text: str
    color: str
    x: float
    y: float
    creator_id: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class Task:
    id: str
    node_id: str
    text: str
    color: str
    status: str
    creator_id: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class Room:
    id: str
    nodes: Dict[str, MindmapNode] = field(default_factory=dict)
    tasks: Dict[str, List[Task]] = field(default_factory=lambda: {
        "todo": [],
        "in-progress": [],
        "done": []
    })
    connections: Dict[str, str] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "nodes": {k: v.to_dict() for k, v in self.nodes.items()},
            "tasks": {k: [t.to_dict() for t in v] for k, v in self.tasks.items()}
        }


class RoomManager:
    def __init__(self):
        self.rooms: Dict[str, Room] = {}
        self.sid_to_room: Dict[str, str] = {}

    def get_or_create_room(self, room_id: str) -> Room:
        if room_id not in self.rooms:
            self.rooms[room_id] = Room(id=room_id)
        return self.rooms[room_id]

    def join_room(self, sid: str, room_id: str) -> Room:
        self.sid_to_room[sid] = room_id
        return self.get_or_create_room(room_id)

    def leave_room(self, sid: str):
        if sid in self.sid_to_room:
            del self.sid_to_room[sid]

    def get_room_by_sid(self, sid: str) -> Optional[Room]:
        room_id = self.sid_to_room.get(sid)
        return self.rooms.get(room_id) if room_id else None

    def add_node(self, room_id: str, node_data: Dict[str, Any]) -> MindmapNode:
        room = self.get_or_create_room(room_id)
        node = MindmapNode(**node_data)
        room.nodes[node.id] = node
        return node

    def update_node(self, room_id: str, node_id: str, updates: Dict[str, Any]) -> Optional[MindmapNode]:
        room = self.rooms.get(room_id)
        if not room or node_id not in room.nodes:
            return None
        node = room.nodes[node_id]
        for key, value in updates.items():
            if hasattr(node, key):
                setattr(node, key, value)
        return node

    def delete_node(self, room_id: str, node_id: str) -> bool:
        room = self.rooms.get(room_id)
        if not room or node_id not in room.nodes:
            return False
        del room.nodes[node_id]
        return True

    def create_task_from_node(self, room_id: str, node_id: str, creator_id: str) -> Optional[Task]:
        room = self.rooms.get(room_id)
        if not room or node_id not in room.nodes:
            return None
        node = room.nodes[node_id]
        task = Task(
            id=str(uuid.uuid4()),
            node_id=node_id,
            text=node.text,
            color=node.color,
            status="todo",
            creator_id=creator_id
        )
        room.tasks["todo"].append(task)
        return task

    def update_task_status(self, room_id: str, task_id: str, new_status: str, new_index: int) -> Optional[Task]:
        room = self.rooms.get(room_id)
        if not room or new_status not in room.tasks:
            return None
        task = None
        old_status = None
        for status, tasks in room.tasks.items():
            for i, t in enumerate(tasks):
                if t.id == task_id:
                    task = t
                    old_status = status
                    del tasks[i]
                    break
            if task:
                break
        if not task:
            return None
        task.status = new_status
        room.tasks[new_status].insert(min(new_index, len(room.tasks[new_status])), task)
        return task

    def delete_task(self, room_id: str, task_id: str) -> bool:
        room = self.rooms.get(room_id)
        if not room:
            return False
        for status, tasks in room.tasks.items():
            for i, t in enumerate(tasks):
                if t.id == task_id:
                    del tasks[i]
                    return True
        return False
