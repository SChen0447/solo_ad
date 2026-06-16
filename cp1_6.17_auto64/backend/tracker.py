import time
from typing import List, Dict, Optional
from dataclasses import dataclass, field

@dataclass
class Note:
    id: int
    content: str
    created_at: float

class ReadingTracker:
    def __init__(self):
        self.reading_list: List[Dict] = []
        self._next_note_id = 1

    def add_book(self, book: Dict) -> bool:
        if any(b["id"] == book["id"] for b in self.reading_list):
            return False
        entry = {
            **book,
            "current_page": 0,
            "total_pages": book.get("pages", 300),
            "notes": [],
            "daily_reading": [],
            "added_at": time.time()
        }
        self.reading_list.append(entry)
        return True

    def remove_book(self, book_id: int) -> bool:
        for i, b in enumerate(self.reading_list):
            if b["id"] == book_id:
                self.reading_list.pop(i)
                return True
        return False

    def get_reading_list(self) -> List[Dict]:
        return self.reading_list

    def update_progress(self, book_id: int, new_page: int) -> Optional[Dict]:
        for b in self.reading_list:
            if b["id"] == book_id:
                clamped = max(0, min(new_page, b["total_pages"]))
                b["current_page"] = clamped
                today = time.strftime("%Y-%m-%d")
                last = b["daily_reading"][-1] if b["daily_reading"] else None
                if last and last["date"] == today:
                    last["minutes"] += 5
                else:
                    b["daily_reading"].append({"date": today, "minutes": 5})
                return b
        return None

    def add_note(self, book_id: int, content: str) -> Optional[Dict]:
        for b in self.reading_list:
            if b["id"] == book_id:
                note = Note(
                    id=self._next_note_id,
                    content=content,
                    created_at=time.time()
                )
                self._next_note_id += 1
                b["notes"].insert(0, {
                    "id": note.id,
                    "content": note.content,
                    "created_at": note.created_at
                })
                return b
        return None

    def delete_note(self, book_id: int, note_id: int) -> Optional[Dict]:
        for b in self.reading_list:
            if b["id"] == book_id:
                b["notes"] = [n for n in b["notes"] if n["id"] != note_id]
                return b
        return None

    def get_book(self, book_id: int) -> Optional[Dict]:
        return next((b for b in self.reading_list if b["id"] == book_id), None)

    def is_in_list(self, book_id: int) -> bool:
        return any(b["id"] == book_id for b in self.reading_list)


tracker = ReadingTracker()
