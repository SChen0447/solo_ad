from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
import eventlet
import random
import string
import json
import os
import numpy as np
import wave
import io
from datetime import datetime

eventlet.monkey_patch()

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

rooms = {}
shared_projects = {}
recordings = {}

def generate_room_code():
    return ''.join(random.choices(string.digits, k=6))

def generate_share_code():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))

def get_note_frequency(track):
    base_frequency = 65.41
    return base_frequency * (2 ** (track / 4))

def generate_sine_wave(frequency, duration, sample_rate=44100, amplitude=0.3):
    t = np.linspace(0, duration, int(sample_rate * duration), False)
    wave = amplitude * np.sin(2 * np.pi * frequency * t)
    envelope = np.exp(-t * 3)
    return wave * envelope

def generate_noise(duration, sample_rate=44100, amplitude=0.4):
    t = np.linspace(0, duration, int(sample_rate * duration), False)
    noise = np.random.uniform(-1, 1, len(t))
    envelope = np.exp(-t * 20)
    return noise * amplitude * envelope

def generate_sawtooth_wave(frequency, duration, sample_rate=44100, amplitude=0.25):
    t = np.linspace(0, duration, int(sample_rate * duration), False)
    wave = amplitude * (2 * (frequency * t - np.floor(0.5 + frequency * t)))
    envelope = np.exp(-t * 4)
    return wave * envelope

def generate_square_wave(frequency, duration, sample_rate=44100, amplitude=0.15):
    t = np.linspace(0, duration, int(sample_rate * duration), False)
    wave = amplitude * np.sign(np.sin(2 * np.pi * frequency * t))
    envelope = np.exp(-t * 3.5)
    return wave * envelope

def synthesize_audio(notes, bpm, tracks, duration=30, sample_rate=44100):
    total_samples = int(sample_rate * duration)
    audio = np.zeros(total_samples, dtype=np.float64)
    
    step_duration = 60.0 / bpm / 2
    
    instrument_map = {
        'piano': generate_sine_wave,
        'drum': generate_noise,
        'bass': generate_sawtooth_wave,
        'lead': generate_square_wave
    }
    
    for note in notes:
        track = note['track']
        step = note['step']
        
        start_time = step * step_duration
        if start_time >= duration:
            continue
        
        start_sample = int(start_time * sample_rate)
        if start_sample >= total_samples:
            continue
        
        instrument_type = tracks[track]['instrument'] if track < len(tracks) else 'piano'
        frequency = get_note_frequency(track)
        
        if instrument_type == 'drum':
            freq = 80 + track * 30
            note_duration = 0.1
            note_wave = instrument_map[instrument_type](note_duration, sample_rate)
        elif instrument_type == 'bass':
            note_duration = 0.3
            note_wave = instrument_map[instrument_type](frequency / 2, note_duration, sample_rate)
        elif instrument_type == 'lead':
            note_duration = 0.4
            note_wave = instrument_map[instrument_type](frequency, note_duration, sample_rate)
        else:
            note_duration = 0.5
            fundamental = instrument_map[instrument_type](frequency, note_duration, sample_rate, 0.3)
            harmonic1 = instrument_map[instrument_type](frequency * 2, note_duration, sample_rate, 0.045)
            harmonic2 = instrument_map[instrument_type](frequency * 3, note_duration, sample_rate, 0.015)
            note_wave = fundamental + harmonic1 + harmonic2
        
        end_sample = min(start_sample + len(note_wave), total_samples)
        audio[start_sample:end_sample] += note_wave[:end_sample - start_sample]
    
    audio = np.clip(audio, -1, 1)
    audio = (audio * 32767).astype(np.int16)
    
    return audio

@app.route('/api/rooms', methods=['POST'])
def create_room():
    data = request.json
    name = data.get('name', 'Untitled')
    
    code = generate_room_code()
    while code in rooms:
        code = generate_room_code()
    
    room_id = f"room_{code}"
    rooms[code] = {
        'id': room_id,
        'name': name,
        'code': code,
        'users': [],
        'maxUsers': 4,
        'notes': {},
        'bpm': 120,
        'isPlaying': False,
        'currentStep': 0,
        'createdAt': datetime.now().isoformat()
    }
    
    return jsonify({'room': rooms[code], 'success': True})

@app.route('/api/rooms/<code>', methods=['GET'])
def get_room(code):
    if code not in rooms:
        return jsonify({'error': 'Room not found'}), 404
    return jsonify({'room': rooms[code], 'success': True})

@app.route('/api/record', methods=['POST'])
def record_audio():
    data = request.json
    notes = data.get('notes', [])
    bpm = data.get('bpm', 120)
    tracks = data.get('tracks', [])
    duration = min(data.get('duration', 30), 30)
    
    audio_data = synthesize_audio(notes, bpm, tracks, duration)
    
    buffer = io.BytesIO()
    with wave.open(buffer, 'wb') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(44100)
        wav_file.writeframes(audio_data.tobytes())
    
    buffer.seek(0)
    
    share_code = generate_share_code()
    while share_code in shared_projects:
        share_code = generate_share_code()
    
    recording_id = f"rec_{share_code}"
    recordings[recording_id] = buffer.getvalue()
    
    shared_projects[share_code] = {
        'notes': {f"{n['track']}-{n['step']}": True for n in notes},
        'bpm': bpm,
        'tracks': tracks,
        'recordingId': recording_id,
        'createdAt': datetime.now().isoformat()
    }
    
    download_url = f"/api/download/{recording_id}"
    
    return jsonify({
        'shareCode': share_code,
        'downloadUrl': download_url,
        'success': True
    })

@app.route('/api/download/<recording_id>', methods=['GET'])
def download_audio(recording_id):
    if recording_id not in recordings:
        return jsonify({'error': 'Recording not found'}), 404
    
    audio_data = recordings[recording_id]
    buffer = io.BytesIO(audio_data)
    buffer.seek(0)
    
    return send_file(
        buffer,
        mimetype='audio/wav',
        as_attachment=True,
        download_name=f'collab-music-{recording_id[:8]}.wav'
    )

@app.route('/api/share/<share_code>', methods=['GET'])
def load_shared_project(share_code):
    if share_code not in shared_projects:
        return jsonify({'error': 'Share code not found'}), 404
    
    project = shared_projects[share_code]
    recording_id = project.get('recordingId')
    audio_url = f"/api/download/{recording_id}" if recording_id in recordings else None
    
    return jsonify({
        'project': project,
        'audioUrl': audio_url,
        'success': True
    })

@socketio.on('join-room')
def handle_join_room(data):
    room_id = data.get('roomId')
    user = data.get('user')
    code = room_id.replace('room_', '')
    
    if code in rooms:
        join_room(room_id)
        if user not in rooms[code]['users']:
            rooms[code]['users'].append(user)
        emit('user-joined', {'user': user, 'users': rooms[code]['users']}, room=room_id)

@socketio.on('leave-room')
def handle_leave_room(data):
    room_id = data.get('roomId')
    user = data.get('user')
    code = room_id.replace('room_', '')
    
    if code in rooms:
        leave_room(room_id)
        rooms[code]['users'] = [u for u in rooms[code]['users'] if u.get('id') != user.get('id')]
        emit('user-left', {'users': rooms[code]['users']}, room=room_id)

@socketio.on('add-note')
def handle_add_note(data):
    room_id = data.get('roomId')
    track = data.get('track')
    step = data.get('step')
    userId = data.get('userId')
    color = data.get('color')
    code = room_id.replace('room_', '')
    
    if code in rooms:
        key = f"{track}-{step}"
        rooms[code]['notes'][key] = True
        emit('note-added', {
            'track': track,
            'step': step,
            'userId': userId,
            'color': color
        }, room=room_id, include_self=False)

@socketio.on('remove-note')
def handle_remove_note(data):
    room_id = data.get('roomId')
    track = data.get('track')
    step = data.get('step')
    userId = data.get('userId')
    color = data.get('color')
    code = room_id.replace('room_', '')
    
    if code in rooms:
        key = f"{track}-{step}"
        if key in rooms[code]['notes']:
            del rooms[code]['notes'][key]
        emit('note-removed', {
            'track': track,
            'step': step,
            'userId': userId,
            'color': color
        }, room=room_id, include_self=False)

@socketio.on('disconnect')
def handle_disconnect():
    for code, room in rooms.items():
        room['users'] = [u for u in room['users'] if u.get('id') != request.sid]
        emit('user-left', {'users': room['users']}, room=room['id'])

if __name__ == '__main__':
    os.makedirs('uploads', exist_ok=True)
    print("🎵 Collab Music Studio Server starting on port 5000...")
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
