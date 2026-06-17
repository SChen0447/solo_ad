from dataclasses import dataclass, field, asdict
from typing import List, Optional, Dict
from datetime import datetime
import uuid


@dataclass
class BranchOption:
    id: str
    title: str
    description: str
    child_node_id: Optional[str] = None

    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "child_node_id": self.child_node_id
        }


@dataclass
class StoryNode:
    id: str
    author: str
    avatar: str
    text: str
    timestamp: datetime
    parent_id: Optional[str] = None
    branch_title: Optional[str] = None
    depth: int = 0
    branch_options: List[BranchOption] = field(default_factory=list)

    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "author": self.author,
            "avatar": self.avatar,
            "text": self.text,
            "timestamp": self.timestamp.isoformat(),
            "parent_id": self.parent_id,
            "branch_title": self.branch_title,
            "depth": self.depth,
            "branch_options": [b.to_dict() for b in self.branch_options]
        }


@dataclass
class Participant:
    id: str
    name: str
    avatar: str
    sid: Optional[str] = None

    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "name": self.name,
            "avatar": self.avatar
        }


@dataclass
class StoryRoom:
    room_code: str
    creator_id: str
    theme: str
    initial_text: str
    is_completed: bool = False
    created_at: datetime = field(default_factory=datetime.now)
    last_activity: datetime = field(default_factory=datetime.now)
    nodes: Dict[str, StoryNode] = field(default_factory=dict)
    participants: Dict[str, Participant] = field(default_factory=dict)
    activities: List[Dict] = field(default_factory=list)
    root_node_id: Optional[str] = None

    def add_node(self, node: StoryNode):
        self.nodes[node.id] = node
        self.last_activity = datetime.now()
        self.activities.append({
            "node_id": node.id,
            "author": node.author,
            "avatar": node.avatar,
            "summary": node.text[:60] + "..." if len(node.text) > 60 else node.text,
            "timestamp": node.timestamp.isoformat()
        })

    def get_leaf_nodes(self) -> List[StoryNode]:
        leaf_nodes = []
        for node in self.nodes.values():
            has_children = False
            for opt in node.branch_options:
                if opt.child_node_id and opt.child_node_id in self.nodes:
                    has_children = True
                    break
            if not has_children:
                leaf_nodes.append(node)
        return leaf_nodes

    def check_completion(self, max_depth: int = 5) -> bool:
        for node in self.nodes.values():
            has_children = False
            for opt in node.branch_options:
                if opt.child_node_id and opt.child_node_id in self.nodes:
                    has_children = True
                    break
            if not has_children and node.depth < max_depth:
                return False
        if self.nodes:
            return True
        return False

    def to_dict(self) -> Dict:
        return {
            "room_code": self.room_code,
            "creator_id": self.creator_id,
            "theme": self.theme,
            "initial_text": self.initial_text,
            "is_completed": self.is_completed,
            "created_at": self.created_at.isoformat(),
            "last_activity": self.last_activity.isoformat(),
            "nodes": {k: v.to_dict() for k, v in self.nodes.items()},
            "participants": {k: v.to_dict() for k, v in self.participants.items()},
            "activities": self.activities,
            "root_node_id": self.root_node_id
        }


def generate_room_code() -> str:
    import random
    digits = "0123456789"
    return "".join(random.choice(digits) for _ in range(6))


def generate_id() -> str:
    return str(uuid.uuid4())
