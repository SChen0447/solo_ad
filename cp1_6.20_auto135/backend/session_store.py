import secrets
import string
import time
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set


@dataclass
class User:
    id: str
    nickname: str
    avatar: str
    is_host: bool
    status: str = "browsing"
    sid: Optional[str] = None


@dataclass
class Card:
    id: str
    session_id: str
    content: str
    author_id: str
    author_name: str
    color: Optional[str]
    x: float
    y: float
    z_index: int
    created_at: float


@dataclass
class Session:
    session_id: str
    title: str
    description: str
    host_id: str
    phase: str = "brainstorm"
    voting_end_at: Optional[float] = None
    users: Dict[str, User] = field(default_factory=dict)
    cards: Dict[str, Card] = field(default_factory=dict)
    votes: Dict[str, Set[str]] = field(default_factory=dict)
    created_at: float = field(default_factory=time.time)

    def to_dict(self):
        return {
            "id": self.session_id,
            "title": self.title,
            "description": self.description,
            "hostId": self.host_id,
            "phase": self.phase,
            "votingEndAt": self.voting_end_at,
            "users": [
                {
                    "id": u.id,
                    "nickname": u.nickname,
                    "avatar": u.avatar,
                    "isHost": u.is_host,
                    "status": u.status,
                }
                for u in self.users.values()
            ],
            "cards": [self._card_to_dict(card_id) for card_id in self.cards],
            "createdAt": self.created_at,
        }

    def _card_to_dict(self, card_id: str):
        card = self.cards[card_id]
        voters = list(self.votes.get(card_id, set()))
        return {
            "id": card.id,
            "sessionId": card.session_id,
            "content": card.content,
            "authorId": card.author_id,
            "authorName": card.author_name,
            "color": card.color,
            "x": card.x,
            "y": card.y,
            "zIndex": card.z_index,
            "votes": voters,
            "createdAt": card.created_at,
        }


class SessionStore:
    def __init__(self):
        self._sessions: Dict[str, Session] = {}
        self._user_sessions: Dict[str, str] = {}

    @staticmethod
    def _generate_id(prefix: str = "") -> str:
        return prefix + secrets.token_hex(8)

    @staticmethod
    def _generate_avatar_color() -> str:
        colors = [
            "#ff6b6b", "#51cf66", "#339af0", "#ffd43b",
            "#cc5de8", "#ff922b", "#20c997", "#868e96",
            "#fa5252", "#40c057", "#228be6", "#fab005",
            "#be4bdb", "#f76707", "#12b886", "#495057",
        ]
        return secrets.choice(colors)

    def generate_session_code(self) -> str:
        chars = string.ascii_uppercase + string.digits
        existing = set(self._sessions.keys())
        while True:
            code = "".join(secrets.choice(chars) for _ in range(6))
            if code not in existing:
                return code

    def create_session(self, title: str, description: str, nickname: str) -> tuple[str, User]:
        session_id = self.generate_session_code()
        user_id = self._generate_id("u_")
        host = User(
            id=user_id,
            nickname=nickname,
            avatar=self._generate_avatar_color(),
            is_host=True,
        )
        session = Session(
            session_id=session_id,
            title=title,
            description=description,
            host_id=user_id,
        )
        session.users[user_id] = host
        self._sessions[session_id] = session
        self._user_sessions[user_id] = session_id
        return session_id, host

    def join_session(self, session_id: str, nickname: str) -> Optional[tuple[Session, User]]:
        session = self._sessions.get(session_id)
        if not session:
            return None
        user_id = self._generate_id("u_")
        user = User(
            id=user_id,
            nickname=nickname,
            avatar=self._generate_avatar_color(),
            is_host=False,
        )
        session.users[user_id] = user
        self._user_sessions[user_id] = session_id
        return session, user

    def get_session(self, session_id: str) -> Optional[Session]:
        return self._sessions.get(session_id)

    def get_user_session(self, user_id: str) -> Optional[Session]:
        sid = self._user_sessions.get(user_id)
        return self._sessions.get(sid) if sid else None

    def add_card(self, session_id: str, card: Card) -> None:
        session = self._sessions.get(session_id)
        if session:
            session.cards[card.id] = card
            session.votes[card.id] = set()

    def update_card(self, session_id: str, card_id: str, updates: dict) -> Optional[Card]:
        session = self._sessions.get(session_id)
        if not session or card_id not in session.cards:
            return None
        card = session.cards[card_id]
        for k, v in updates.items():
            if v is not None and hasattr(card, k):
                setattr(card, k, v)
        return card

    def move_card(self, session_id: str, card_id: str, x: float, y: float, z_index: int) -> Optional[Card]:
        return self.update_card(session_id, card_id, {"x": x, "y": y, "z_index": z_index})

    def delete_card(self, session_id: str, card_id: str) -> bool:
        session = self._sessions.get(session_id)
        if not session or card_id not in session.cards:
            return False
        del session.cards[card_id]
        session.votes.pop(card_id, None)
        return True

    def add_vote(self, session_id: str, card_id: str, user_id: str) -> bool:
        session = self._sessions.get(session_id)
        if not session or card_id not in session.cards:
            return False
        if session.phase != "voting":
            return False
        user_votes_count = sum(1 for voters in session.votes.values() if user_id in voters)
        if user_votes_count >= 3:
            return False
        session.votes[card_id].add(user_id)
        return True

    def remove_vote(self, session_id: str, card_id: str, user_id: str) -> bool:
        session = self._sessions.get(session_id)
        if not session or card_id not in session.votes:
            return False
        if user_id not in session.votes[card_id]:
            return False
        session.votes[card_id].discard(user_id)
        return True

    def set_phase(self, session_id: str, phase: str, voting_end_at: Optional[float] = None) -> bool:
        session = self._sessions.get(session_id)
        if not session:
            return False
        session.phase = phase
        session.voting_end_at = voting_end_at
        return True

    def remove_user(self, user_id: str) -> Optional[tuple[str, Optional[str]]]:
        session_id = self._user_sessions.pop(user_id, None)
        if not session_id:
            return None
        session = self._sessions.get(session_id)
        if not session:
            return session_id, None
        session.users.pop(user_id, None)
        if len(session.users) == 0:
            del self._sessions[session_id]
            return session_id, None
        if session.host_id == user_id:
            new_host = next(iter(session.users.values()))
            new_host.is_host = True
            session.host_id = new_host.id
            return session_id, new_host.id
        return session_id, None

    def set_user_sid(self, session_id: str, user_id: str, sid: str) -> None:
        session = self._sessions.get(session_id)
        if session and user_id in session.users:
            session.users[user_id].sid = sid

    def set_user_status(self, session_id: str, user_id: str, status: str) -> None:
        session = self._sessions.get(session_id)
        if session and user_id in session.users:
            session.users[user_id].status = status

    def get_user_by_sid(self, session_id: str, sid: str) -> Optional[User]:
        session = self._sessions.get(session_id)
        if not session:
            return None
        for u in session.users.values():
            if u.sid == sid:
                return u
        return None


store = SessionStore()
