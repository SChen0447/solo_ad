from dataclasses import dataclass, field, asdict
from typing import List, Dict, Optional
import time
import uuid


@dataclass
class Comment:
    id: str
    user_id: str
    user_name: str
    content: str
    created_at: float


@dataclass
class Vote:
    user_id: str
    rating: float


@dataclass
class Idea:
    id: str
    title: str
    description: str
    author_id: str
    author_name: str
    likes: List[str] = field(default_factory=list)
    votes: Dict[str, float] = field(default_factory=dict)
    comments: List[Comment] = field(default_factory=list)
    importance_score: float = 0.0
    urgency_score: float = 0.0
    matrix_x: float = 50.0
    matrix_y: float = 50.0
    created_at: float = field(default_factory=time.time)


class InMemoryDatabase:
    def __init__(self):
        self.ideas: Dict[str, Idea] = {}
        self.importance_weight: float = 5.0
        self.urgency_weight: float = 5.0

    def create_idea(self, title: str, description: str, author_name: str) -> Idea:
        idea_id = str(uuid.uuid4())
        idea = Idea(
            id=idea_id,
            title=title,
            description=description,
            author_id=f"user_{idea_id[:8]}",
            author_name=author_name
        )
        self.ideas[idea_id] = idea
        return idea

    def get_idea(self, idea_id: str) -> Optional[Idea]:
        return self.ideas.get(idea_id)

    def get_all_ideas(self) -> List[Idea]:
        return sorted(self.ideas.values(), key=lambda x: x.created_at, reverse=True)

    def add_like(self, idea_id: str, user_id: str) -> Optional[Idea]:
        idea = self.ideas.get(idea_id)
        if idea:
            if user_id not in idea.likes:
                idea.likes.append(user_id)
            else:
                idea.likes.remove(user_id)
            return idea
        return None

    def add_vote(self, idea_id: str, user_id: str, rating: float) -> Optional[Idea]:
        idea = self.ideas.get(idea_id)
        if idea:
            idea.votes[user_id] = rating
            return idea
        return None

    def add_comment(self, idea_id: str, user_id: str, user_name: str, content: str) -> Optional[Idea]:
        idea = self.ideas.get(idea_id)
        if idea:
            comment = Comment(
                id=str(uuid.uuid4()),
                user_id=user_id,
                user_name=user_name,
                content=content,
                created_at=time.time()
            )
            idea.comments.append(comment)
            return idea
        return None

    def update_matrix_position(self, idea_id: str, matrix_x: float, matrix_y: float) -> Optional[Idea]:
        idea = self.ideas.get(idea_id)
        if idea:
            idea.matrix_x = max(0, min(100, matrix_x))
            idea.matrix_y = max(0, min(100, matrix_y))
            return idea
        return None

    def update_scores(self, idea_id: str, importance: float, urgency: float) -> Optional[Idea]:
        idea = self.ideas.get(idea_id)
        if idea:
            idea.importance_score = importance
            idea.urgency_score = urgency
            return idea
        return None

    def set_weights(self, importance_weight: float, urgency_weight: float):
        self.importance_weight = importance_weight
        self.urgency_weight = urgency_weight

    def get_weights(self) -> Dict[str, float]:
        return {
            "importance_weight": self.importance_weight,
            "urgency_weight": self.urgency_weight
        }

    def idea_to_dict(self, idea: Idea) -> Dict:
        return {
            **asdict(idea),
            "likes_count": len(idea.likes),
            "votes_count": len(idea.votes),
            "average_rating": (sum(idea.votes.values()) / len(idea.votes)) if idea.votes else 0
        }


db = InMemoryDatabase()
