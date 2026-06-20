from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
import random


@dataclass
class Note:
    id: str
    pitch: int
    duration: float
    position: float
    measure: int
    voice: int = 0


@dataclass
class Chord:
    root: str
    type: str
    notes: List[int]
    measure: int
    beat: float


NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

MAJOR_SCALE_INTERVALS = [0, 2, 4, 5, 7, 9, 11]
MINOR_SCALE_INTERVALS = [0, 2, 3, 5, 7, 8, 10]

CHORD_QUALITIES = {
    'maj': [0, 4, 7],
    'min': [0, 3, 7],
    'dim': [0, 3, 6],
    'aug': [0, 4, 8],
    'maj7': [0, 4, 7, 11],
    'min7': [0, 3, 7, 10],
    'dom7': [0, 4, 7, 10],
    'dim7': [0, 3, 6, 9],
}

KEY_SIGNATURE_TO_MIDI = {
    'C大调': 0, 'G大调': 7, 'D大调': 2, 'A大调': 9,
    'E大调': 4, 'F大调': 5, 'a小调': 9, 'e小调': 4,
    'd小调': 2, 'b小调': 11,
}


class HarmonyEngine:
    def __init__(self):
        self.random = random.Random(42)

    def get_scale_notes(self, key_root_midi: int, is_major: bool = True) -> List[int]:
        intervals = MAJOR_SCALE_INTERVALS if is_major else MINOR_SCALE_INTERVALS
        return [(key_root_midi + interval) % 12 for interval in intervals]

    def analyze_key(self, notes: List[Note]) -> Tuple[int, bool]:
        if not notes:
            return 0, True

        pitch_counts: Dict[int, int] = {}
        for note in notes:
            pitch_class = note.pitch % 12
            pitch_counts[pitch_class] = pitch_counts.get(pitch_class, 0) + int(note.duration * 2)

        best_key = 0
        best_is_major = True
        best_score = -1

        for root in range(12):
            major_scale = set(self.get_scale_notes(root, True))
            minor_scale = set(self.get_scale_notes(root, False))

            major_score = sum(
                count for pitch, count in pitch_counts.items()
                if pitch in major_scale
            )
            minor_score = sum(
                count for pitch, count in pitch_counts.items()
                if pitch in minor_scale
            )

            if root == 0:
                major_score += 2
            if major_score > best_score:
                best_score = major_score
                best_key = root
                best_is_major = True
            if minor_score > best_score:
                best_score = minor_score
                best_key = root
                best_is_major = False

        return best_key, best_is_major

    def get_diatonic_chords(self, key_root_midi: int, is_major: bool) -> List[Tuple[str, str]]:
        scale_intervals = MAJOR_SCALE_INTERVALS if is_major else MINOR_SCALE_INTERVALS
        if is_major:
            qualities = ['maj', 'min', 'min', 'maj', 'dom7', 'min', 'dim']
        else:
            qualities = ['min', 'dim', 'maj', 'min', 'min', 'maj', 'dom7']

        chords = []
        for i, interval in enumerate(scale_intervals):
            root_midi = (key_root_midi + interval) % 12
            root_name = NOTE_NAMES[root_midi]
            chords.append((root_name, qualities[i]))
        return chords

    def build_chord_notes(self, root_name: str, quality: str, octave: int = 4) -> List[int]:
        root_midi = NOTE_NAMES.index(root_name) + octave * 12
        intervals = CHORD_QUALITIES.get(quality, CHORD_QUALITIES['maj'])
        return [root_midi + interval for interval in intervals]

    def find_chord_for_notes(
        self,
        measure_notes: List[Note],
        diatonic_chords: List[Tuple[str, str]],
        key_root_midi: int
    ) -> Tuple[str, str]:
        if not measure_notes:
            return diatonic_chords[0]

        pitch_classes = set()
        for note in measure_notes:
            pitch_classes.add(note.pitch % 12)

        best_chord = diatonic_chords[0]
        best_score = -1

        for root_name, quality in diatonic_chords:
            root_midi = NOTE_NAMES.index(root_name)
            intervals = CHORD_QUALITIES.get(quality, CHORD_QUALITIES['maj'])
            chord_pitches = set((root_midi + interval) % 12 for interval in intervals)

            match_count = len(pitch_classes & chord_pitches)
            non_diatonic_count = len(pitch_classes - chord_pitches)

            score = match_count * 3 - non_diatonic_count * 2

            root_in_melody = NOTE_NAMES.index(root_name) in pitch_classes
            if root_in_melody:
                score += 2

            if score > best_score:
                best_score = score
                best_chord = (root_name, quality)

        return best_chord

    def generate_progression(
        self,
        measures: List[List[Note]],
        key_signature: Optional[str] = None
    ) -> List[Chord]:
        if key_signature and key_signature in KEY_SIGNATURE_TO_MIDI:
            key_root = KEY_SIGNATURE_TO_MIDI[key_signature]
            is_major = '大调' in key_signature
        else:
            all_notes = [note for measure in measures for note in measure]
            key_root, is_major = self.analyze_key(all_notes)

        diatonic_chords = self.get_diatonic_chords(key_root, is_major)

        result: List[Chord] = []
        common_progressions = [
            [0, 3, 4, 0],
            [0, 5, 3, 4],
            [0, 2, 3, 4],
            [0, 5, 1, 4],
        ]
        progression = self.random.choice(common_progressions)

        beats_per_measure = 4

        for m_idx, measure in enumerate(measures[:4]):
            if m_idx < len(progression):
                chord_idx = progression[m_idx]
                root_name, quality = diatonic_chords[chord_idx % len(diatonic_chords)]

                if measure:
                    found_root, found_quality = self.find_chord_for_notes(
                        measure, diatonic_chords, key_root
                    )
                    if found_root and self.random.random() < 0.7:
                        root_name, quality = found_root, found_quality
            else:
                root_name, quality = diatonic_chords[0]

            chord_notes = self.build_chord_notes(root_name, quality)

            result.append(Chord(
                root=root_name,
                type=quality,
                notes=chord_notes,
                measure=m_idx,
                beat=0
            ))

            if len(measure) >= 4 and self.random.random() < 0.3:
                mid_chord_idx = (progression[m_idx] + 3) % len(diatonic_chords)
                mid_root, mid_quality = diatonic_chords[mid_chord_idx]
                mid_notes = self.build_chord_notes(mid_root, mid_quality)
                result.append(Chord(
                    root=mid_root,
                    type=mid_quality,
                    notes=mid_notes,
                    measure=m_idx,
                    beat=beats_per_measure / 2
                ))

        return result


harmony_engine = HarmonyEngine()


def generate_harmony(measures_data, key_signature: Optional[str] = None) -> List[Dict]:
    measures: List[List[Note]] = []
    for measure_list in measures_data:
        parsed_notes = []
        for n in measure_list or []:
            try:
                parsed_notes.append(Note(
                    id=n.get('id', ''),
                    pitch=int(n.get('pitch', 60)),
                    duration=float(n.get('duration', 1)),
                    position=float(n.get('position', 0)),
                    measure=int(n.get('measure', 0)),
                    voice=int(n.get('voice', 0)),
                ))
            except (ValueError, TypeError):
                continue
        measures.append(parsed_notes)

    while len(measures) < 4:
        measures.append([])

    chords = harmony_engine.generate_progression(measures, key_signature)
    return [
        {
            'root': c.root,
            'type': c.type,
            'notes': c.notes,
            'measure': c.measure,
            'beat': c.beat,
        }
        for c in chords
    ]
