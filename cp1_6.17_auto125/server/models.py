from dataclasses import dataclass, field, asdict
from typing import List, Optional
import json
import os
import uuid
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
PRESETS_FILE = os.path.join(DATA_DIR, 'presets.json')
UPLOADS_DIR = os.path.join(BASE_DIR, 'uploads')

MATERIAL_TYPES = {'metal', 'plastic', 'glass', 'emissive'}
TEXTURE_TYPES = {'none', 'wood', 'marble', 'brushed', 'fabric'}


@dataclass
class LightPosition:
    x: float
    y: float
    z: float

    def to_dict(self):
        return {'x': self.x, 'y': self.y, 'z': self.z}

    @classmethod
    def from_dict(cls, data):
        return cls(
            x=float(data.get('x', 0.0)),
            y=float(data.get('y', 0.0)),
            z=float(data.get('z', 0.0)),
        )


@dataclass
class MaterialPreset:
    id: str
    name: str
    materialType: str
    textureType: str
    lightPosition: LightPosition
    createdAt: str = field(default_factory=lambda: datetime.utcnow().isoformat())

    def validate(self) -> List[str]:
        errors: List[str] = []
        if not self.name or not self.name.strip():
            errors.append('Preset name cannot be empty')
        if self.materialType not in MATERIAL_TYPES:
            errors.append(f'Invalid material type: {self.materialType}')
        if self.textureType not in TEXTURE_TYPES:
            errors.append(f'Invalid texture type: {self.textureType}')
        if not (-10 <= self.lightPosition.x <= 10):
            errors.append('Light position X must be between -10 and 10')
        if not (0 <= self.lightPosition.y <= 10):
            errors.append('Light position Y must be between 0 and 10')
        if not (-10 <= self.lightPosition.z <= 10):
            errors.append('Light position Z must be between -10 and 10')
        return errors

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'materialType': self.materialType,
            'textureType': self.textureType,
            'lightPosition': self.lightPosition.to_dict(),
            'createdAt': self.createdAt,
        }

    @classmethod
    def from_dict(cls, data):
        return cls(
            id=data.get('id', cls.generate_id()),
            name=data.get('name', 'Untitled'),
            materialType=data.get('materialType', 'metal'),
            textureType=data.get('textureType', 'none'),
            lightPosition=LightPosition.from_dict(data.get('lightPosition', {})),
            createdAt=data.get('createdAt', datetime.utcnow().isoformat()),
        )

    @staticmethod
    def generate_id() -> str:
        return f'preset-{uuid.uuid4().hex[:12]}'


class PresetStore:
    def __init__(self):
        self._ensure_directories()
        self._presets: List[MaterialPreset] = []
        self._load()

    def _ensure_directories(self):
        os.makedirs(DATA_DIR, exist_ok=True)
        os.makedirs(UPLOADS_DIR, exist_ok=True)

    def _load(self):
        if not os.path.exists(PRESETS_FILE):
            self._presets = []
            return
        try:
            with open(PRESETS_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
            self._presets = [MaterialPreset.from_dict(item) for item in data.get('presets', [])]
        except (json.JSONDecodeError, IOError):
            self._presets = []

    def _save(self):
        try:
            with open(PRESETS_FILE, 'w', encoding='utf-8') as f:
                json.dump(
                    {'presets': [p.to_dict() for p in self._presets]},
                    f,
                    indent=2,
                    ensure_ascii=False,
                )
        except IOError:
            pass

    def get_all(self) -> List[MaterialPreset]:
        return list(self._presets)

    def get_by_id(self, preset_id: str) -> Optional[MaterialPreset]:
        for p in self._presets:
            if p.id == preset_id:
                return p
        return None

    def add(self, preset: MaterialPreset) -> MaterialPreset:
        if not preset.id:
            preset.id = MaterialPreset.generate_id()
        self._presets.append(preset)
        self._save()
        return preset

    def delete(self, preset_id: str) -> bool:
        for i, p in enumerate(self._presets):
            if p.id == preset_id:
                del self._presets[i]
                self._save()
                return True
        return False

    def clear(self):
        self._presets = []
        self._save()


preset_store = PresetStore()
