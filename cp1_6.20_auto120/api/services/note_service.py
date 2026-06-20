import json
import os

DATA_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "notes.json")


def _read_notes():
    if not os.path.exists(DATA_PATH):
        return []
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def _write_notes(notes):
    os.makedirs(os.path.dirname(DATA_PATH), exist_ok=True)
    with open(DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(notes, f, ensure_ascii=False, indent=2)


def get_all_notes():
    return _read_notes()


def get_note(note_id):
    notes = _read_notes()
    for note in notes:
        if note.get("id") == note_id:
            return note
    return None


def create_note(data):
    notes = _read_notes()
    existing_ids = [int(n["id"]) for n in notes if n.get("id", "").isdigit()]
    new_id = str(max(existing_ids, default=0) + 1)
    data["id"] = new_id
    notes.append(data)
    _write_notes(notes)
    return data


def update_note(note_id, data):
    notes = _read_notes()
    for i, note in enumerate(notes):
        if note.get("id") == note_id:
            data["id"] = note_id
            notes[i] = data
            _write_notes(notes)
            return data
    return None
