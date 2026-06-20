from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import io
import math
import struct
import wave
from dataclasses import dataclass
from typing import List, Dict, Tuple

app = Flask(__name__)
CORS(app)

NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

CHORD_TEMPLATES = {
    'maj': [0, 4, 7],
    'min': [0, 3, 7],
    'dim': [0, 3, 6],
    'aug': [0, 4, 8],
    'maj7': [0, 4, 7, 11],
    'min7': [0, 3, 7, 10],
    '7': [0, 4, 7, 10],
    'dim7': [0, 3, 6, 9],
    'hdim7': [0, 3, 6, 10],
    'minmaj7': [0, 3, 7, 11],
    'aug7': [0, 4, 8, 10],
}

CHORD_TYPE_COLORS = {
    'maj': '#e74c3c',
    'min': '#3498db',
    '7': '#e67e22',
    'maj7': '#9b59b6',
    'min7': '#1abc9c',
    'dim': '#7f8c8d',
    'aug': '#f39c12',
    'dim7': '#34495e',
    'hdim7': '#95a5a6',
    'minmaj7': '#27ae60',
    'aug7': '#d35400',
}

CHORD_DISPLAY_NAMES = {
    'maj': '',
    'min': 'm',
    '7': '7',
    'maj7': 'maj7',
    'min7': 'm7',
    'dim': 'dim',
    'aug': 'aug',
    'dim7': 'dim7',
    'hdim7': 'ø7',
    'minmaj7': 'mM7',
    'aug7': 'aug7',
}

DURATION_VALUES = {
    'whole': 4.0,
    'half': 2.0,
    'quarter': 1.0,
    'eighth': 0.5,
    'sixteenth': 0.25,
}

@dataclass
class Note:
    pitch: str
    beat: float
    duration: str

def note_to_midi(pitch: str) -> int:
    if len(pitch) < 2:
        return 60
    name = pitch[:-1]
    octave = int(pitch[-1])
    if name not in NOTE_NAMES:
        return 60
    return NOTE_NAMES.index(name) + (octave + 1) * 12

def midi_to_note(midi: int) -> str:
    name = NOTE_NAMES[midi % 12]
    octave = midi // 12 - 1
    return f"{name}{octave}"

def midi_to_freq(midi: int) -> float:
    return 440.0 * math.pow(2.0, (midi - 69) / 12.0)

def generate_sine_wave(freq: float, duration: float, sample_rate: int = 44100, amplitude: float = 0.3) -> bytes:
    num_samples = int(duration * sample_rate)
    samples = []
    for i in range(num_samples):
        t = i / sample_rate
        envelope = 1.0
        if t < 0.02:
            envelope = t / 0.02
        elif t > duration - 0.05:
            envelope = max(0, (duration - t) / 0.05)
        sample = amplitude * envelope * math.sin(2 * math.pi * freq * t)
        samples.append(int(sample * 32767))
    return struct.pack('<' + 'h' * len(samples), *samples)

def notes_to_pcm(notes: List[Note], bpm: int = 120) -> Tuple[bytes, float]:
    sample_rate = 44100
    beat_duration = 60.0 / bpm
    total_duration = 0.0
    
    for note in notes:
        note_beats = DURATION_VALUES.get(note.duration, 1.0)
        end_time = (note.beat + note_beats) * beat_duration
        if end_time > total_duration:
            total_duration = end_time
    
    total_samples = int(total_duration * sample_rate)
    samples = [0.0] * total_samples
    
    for note in notes:
        midi = note_to_midi(note.pitch)
        freq = midi_to_freq(midi)
        note_beats = DURATION_VALUES.get(note.duration, 1.0)
        note_duration = note_beats * beat_duration
        start_sample = int(note.beat * beat_duration * sample_rate)
        note_samples = int(note_duration * sample_rate)
        
        for i in range(note_samples):
            if start_sample + i < total_samples:
                t = i / sample_rate
                envelope = 1.0
                if t < 0.02:
                    envelope = t / 0.02
                elif t > note_duration - 0.05:
                    envelope = max(0, (note_duration - t) / 0.05)
                sample_val = 0.3 * envelope * math.sin(2 * math.pi * freq * t)
                samples[start_sample + i] += sample_val
    
    max_val = max(abs(max(samples)), abs(min(samples))) if samples else 1.0
    if max_val > 0:
        samples = [s / max_val * 0.8 for s in samples]
    
    int_samples = [int(s * 32767) for s in samples]
    pcm_data = struct.pack('<' + 'h' * len(int_samples), *int_samples)
    return pcm_data, total_duration

def pcm_to_wav(pcm_data: bytes, sample_rate: int = 44100) -> bytes:
    wav_buffer = io.BytesIO()
    with wave.open(wav_buffer, 'wb') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(pcm_data)
    return wav_buffer.getvalue()

def analyze_chord(notes: List[Note], measure_start: float, measure_end: float) -> Dict:
    measure_notes = [
        n for n in notes
        if n.beat >= measure_start and n.beat < measure_end
    ]
    
    if not measure_notes:
        return {
            'name': 'N.C.',
            'type': 'none',
            'root': None,
            'color': '#95a5a6',
            'start': measure_start,
            'end': measure_end
        }
    
    pitch_classes = set()
    for note in measure_notes:
        midi = note_to_midi(note.pitch)
        pitch_classes.add(midi % 12)
    
    pitch_list = sorted(list(pitch_classes))
    if not pitch_list:
        return {
            'name': 'N.C.',
            'type': 'none',
            'root': None,
            'color': '#95a5a6',
            'start': measure_start,
            'end': measure_end
        }
    
    best_match = None
    best_score = -1
    
    for root in range(12):
        for chord_type, intervals in CHORD_TEMPLATES.items():
            chord_pitches = set((root + interval) % 12 for interval in intervals)
            intersection = len(pitch_classes & chord_pitches)
            union = len(pitch_classes | chord_pitches)
            score = intersection / union if union > 0 else 0
            
            bonus = 0
            for note in measure_notes:
                midi = note_to_midi(note.pitch)
                if midi % 12 == root:
                    bonus += 0.2
            score += min(bonus, 0.4)
            
            if score > best_score:
                best_score = score
                best_match = (root, chord_type)
    
    if best_match and best_score > 0.3:
        root, chord_type = best_match
        root_name = NOTE_NAMES[root]
        display_name = f"{root_name}{CHORD_DISPLAY_NAMES.get(chord_type, chord_type)}"
        return {
            'name': display_name,
            'type': chord_type,
            'root': root_name,
            'color': CHORD_TYPE_COLORS.get(chord_type, '#95a5a6'),
            'start': measure_start,
            'end': measure_end,
            'confidence': round(best_score, 2)
        }
    
    return {
        'name': 'N.C.',
        'type': 'none',
        'root': None,
        'color': '#95a5a6',
        'start': measure_start,
        'end': measure_end,
        'confidence': round(best_score, 2) if best_score > 0 else 0
    }

@app.route('/midi-to-audio', methods=['POST'])
def midi_to_audio():
    try:
        data = request.get_json()
        notes_data = data.get('notes', [])
        bpm = data.get('bpm', 120)
        
        notes = [
            Note(
                pitch=n['pitch'],
                beat=float(n['beat']),
                duration=n['duration']
            )
            for n in notes_data
        ]
        
        pcm_data, duration = notes_to_pcm(notes, bpm)
        wav_data = pcm_to_wav(pcm_data)
        
        return send_file(
            io.BytesIO(wav_data),
            mimetype='audio/wav',
            as_attachment=True,
            download_name='melody.wav'
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/chord-analysis', methods=['POST'])
def chord_analysis():
    try:
        data = request.get_json()
        notes_data = data.get('notes', [])
        beats_per_measure = data.get('beatsPerMeasure', 4)
        
        notes = [
            Note(
                pitch=n['pitch'],
                beat=float(n['beat']),
                duration=n['duration']
            )
            for n in notes_data
        ]
        
        if not notes:
            return jsonify({'chords': []})
        
        max_beat = max(n.beat + DURATION_VALUES.get(n.duration, 1.0) for n in notes)
        total_measures = math.ceil(max_beat / beats_per_measure)
        
        chords = []
        for i in range(total_measures):
            measure_start = i * beats_per_measure
            measure_end = (i + 1) * beats_per_measure
            chord = analyze_chord(notes, measure_start, measure_end)
            chord['measure'] = i + 1
            chords.append(chord)
        
        return jsonify({'chords': chords})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
