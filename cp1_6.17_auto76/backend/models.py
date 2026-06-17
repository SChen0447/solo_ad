from dataclasses import dataclass, field
from typing import List, Tuple, Optional


@dataclass
class Room:
    id: str
    name: str
    floor: int
    corners: List[Tuple[float, float]]
    height: float = 3.0
    color: str = "#3a4a6b"
    is_corridor: bool = False
    is_staircase: bool = False


@dataclass
class Door:
    id: str
    position: Tuple[float, float, float]
    width: float
    height: float
    rotation: float = 0.0


@dataclass
class Window:
    id: str
    position: Tuple[float, float, float]
    width: float
    height: float
    rotation: float = 0.0


@dataclass
class Facility:
    id: str
    name: str
    type: str
    category: str
    floor: int
    position: Tuple[float, float, float]
    status: str = "normal"
    last_maintenance: str = "2024-01-15"
    description: str = ""


@dataclass
class Floor:
    level: int
    name: str
    elevation: float
    rooms: List[Room] = field(default_factory=list)
    doors: List[Door] = field(default_factory=list)
    windows: List[Window] = field(default_factory=list)
    facilities: List[Facility] = field(default_factory=list)


@dataclass
class Building:
    name: str
    floors: List[Floor] = field(default_factory=list)
    center: Tuple[float, float, float] = (0, 0, 0)
