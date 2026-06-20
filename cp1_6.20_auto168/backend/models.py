from dataclasses import dataclass, field
from typing import List, Optional
from datetime import datetime
import uuid


@dataclass
class User:
    id: str
    name: str
    avatar: str
    creditScore: int = 100


@dataclass
class TimelineEvent:
    type: str
    date: str
    description: str
    userId: Optional[str] = None


@dataclass
class Item:
    id: str
    userId: str
    title: str
    category: str
    conditionScore: int
    description: str
    imagePaths: List[str]
    status: str = 'available'
    currentOwnerId: Optional[str] = None
    createdAt: str = field(default_factory=lambda: datetime.now().isoformat())
    timelines: List[TimelineEvent] = field(default_factory=list)

    def __post_init__(self):
        if self.currentOwnerId is None:
            self.currentOwnerId = self.userId
        if not self.timelines:
            self.timelines.append(TimelineEvent(
                type='publish',
                date=datetime.now().isoformat(),
                description='物品发布',
                userId=self.userId
            ))


@dataclass
class Exchange:
    id: str
    fromItemId: str
    toItemId: str
    fromUserId: str
    toUserId: str
    status: str = 'pending'
    message: str = ''
    createdAt: str = field(default_factory=lambda: datetime.now().isoformat())


@dataclass
class TrustReview:
    id: str
    exchangeId: str
    fromUserId: str
    toUserId: str
    score: int
    comment: str
    createdAt: str = field(default_factory=lambda: datetime.now().isoformat())


def generate_id() -> str:
    return str(uuid.uuid4())
