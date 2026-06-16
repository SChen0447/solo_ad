import os
import time
import uuid
import math
import numpy as np
import cv2
from midiutil import MIDIFile
from typing import Dict, List, Tuple


class VideoGenerator:
    def __init__(self, base_dir: str):
        self.base_dir = base_dir
        self.background_dir = os.path.join(base_dir, 'background_videos')
        self.output_dir = os.path.join(base_dir, 'output')
        self.static_dir = os.path.join(base_dir, 'static')
        
        os.makedirs(self.background_dir, exist_ok=True)
        os.makedirs(self.output_dir, exist_ok=True)
        os.makedirs(self.static_dir, exist_ok=True)
        
        self.style_colors = {
            'nature': [(34, 139, 34), (85, 107, 47), (60, 179, 113)],
            'city': [(25, 25, 112), (72, 61, 139), (138, 43, 226)],
            'ocean': [(0, 105, 148), (0, 139, 139), (32, 178, 170)],
            'forest': [(34, 89, 34), (46, 125, 50), (76, 175, 80)],
            'sunset': [(255, 69, 0), (255, 140, 0), (255, 165, 0)],
            'space': [(0, 0, 64), (25, 25, 89), (48, 25, 92)]
        }
        
        self.mood_scales = {
            'passionate': [60, 62, 64, 65, 67, 69, 71, 72],
            'gentle': [60, 62, 64, 67, 69, 72, 74, 76],
            'melancholic': [57, 59, 60, 62, 64, 65, 67, 69],
            'peaceful': [60, 62, 64, 67, 69, 72, 74, 76],
            'inspiring': [60, 62, 64, 65, 67, 69, 71, 72]
        }
        
        self._ensure_background_videos()
    
    def _ensure_background_videos(self):
        for style in self.style_colors.keys():
            video_path = os.path.join(self.background_dir, f'{style}.mp4')
            if not os.path.exists(video_path):
                self._generate_background_video(style, video_path)
    
    def _generate_background_video(self, style: str, output_path: str, duration: int = 60, fps: int = 30):
        width, height = 1280, 720
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
        
        colors = self.style_colors.get(style, self.style_colors['nature'])
        
        for frame_idx in range(duration * fps):
            t = frame_idx / fps
            frame = np.zeros((height, width, 3), dtype=np.uint8)
            
            for y in range(height):
                progress = y / height
                color_idx = int(progress * (len(colors) - 1))
                color_idx = min(color_idx, len(colors) - 2)
                frac = (progress * (len(colors) - 1)) - color_idx
                
                c1 = colors[color_idx]
                c2 = colors[color_idx + 1]
                
                r = int(c1[0] + (c2[0] - c1[0]) * frac)
                g = int(c1[1] + (c2[1] - c1[1]) * frac)
                b = int(c1[2] + (c2[2] - c1[2]) * frac)
                
                frame[y, :] = [b, g, r]
            
            num_particles = 20
            for i in range(num_particles):
                px = int((math.sin(t * 0.5 + i * 0.7) + 1) * width / 2)
                py = int((math.cos(t * 0.3 + i * 1.1) + 1) * height / 2)
                size = 3 + int(math.sin(t + i) * 2)
                alpha = 0.3 + 0.2 * math.sin(t * 2 + i)
                
                cv2.circle(frame, (px, py), size, (255, 255, 255), -1)
            
            for i in range(5):
                y_start = int((t * 20 + i * 144) % (height + 100)) - 50
                x_offset = int(math.sin(t * 0.8 + i) * 50)
                for y in range(max(0, y_start), min(height, y_start + 100)):
                    x = int(width / 2 + x_offset + math.sin((y - y_start) * 0.05 + t) * 30)
                    if 0 <= x < width:
                        brightness = int(20 + 20 * math.sin(t * 3 + i))
                        frame[y, x] = [
                            min(255, frame[y, x][0] + brightness),
                            min(255, frame[y, x][1] + brightness),
                            min(255, frame[y, x][2] + brightness)
                        ]
            
            out.write(frame)
        
        out.release()
    
    def _generate_midi(self, poem_features: Dict, output_path: str):
        mood = poem_features['mood']
        bpm = poem_features['bpm']
        total_lines = poem_features['totalLines']
        
        duration = poem_features['totalDuration']
        bars = max(8, min(16, int(duration / 4)))
        
        midi = MIDIFile(2)
        midi.addTempo(0, 0, bpm)
        midi.addTempo(1, 0, bpm)
        
        scale = self.mood_scales.get(mood, self.mood_scales['peaceful'])
        
        volume = 80
        if mood == 'passionate':
            volume = 100
        elif mood == 'melancholic':
            volume = 60
        
        for i in range(bars * 4):
            time = i * 0.5
            note_idx = int((i * 7) % len(scale))
            note = scale[note_idx] + 12
            midi.addNote(0, 0, note, time, 0.4, volume)
            
            if i % 4 == 0:
                bass_note = scale[note_idx % 4] - 12
                midi.addNote(1, 0, bass_note, time, 1.5, volume - 10)
        
        with open(output_path, 'wb') as f:
            midi.writeFile(f)
    
    def _midi_to_wav(self, midi_path: str, wav_path: str, poem_features: Dict = None):
        try:
            import subprocess
            
            soundfont_path = os.path.join(self.base_dir, 'soundfont.sf2')
            if os.path.exists(soundfont_path):
                cmd = [
                    'fluidsynth', '-ni', soundfont_path,
                    midi_path, '-F', wav_path, '-r', '44100'
                ]
                subprocess.run(cmd, check=True, capture_output=True)
                return True
        except Exception as e:
            print(f"Warning: Could not convert MIDI to WAV: {e}")
        
        return self._generate_simple_audio(wav_path, poem_features)
    
    def _generate_simple_audio(self, output_path: str, poem_features: Dict = None):
        try:
            sample_rate = 44100
            duration = 30
            if poem_features:
                duration = poem_features['totalDuration']
            
            bpm = 80
            if poem_features:
                bpm = poem_features['bpm']
            
            freq = 261.63
            
            t = np.linspace(0, duration, int(sample_rate * duration), False)
            envelope = np.ones_like(t)
            
            beat_interval = 60.0 / bpm
            for i in range(len(t)):
                beat_pos = (t[i] % beat_interval) / beat_interval
                envelope[i] = 0.5 + 0.5 * np.exp(-beat_pos * 3)
            
            audio = envelope * 0.3 * np.sin(2 * np.pi * freq * t)
            
            harmonic = 0.15 * np.sin(2 * np.pi * freq * 2 * t)
            audio += envelope * harmonic
            
            bass = 0.2 * np.sin(2 * np.pi * freq / 2 * t)
            bass_envelope = np.ones_like(t)
            for i in range(len(t)):
                beat_pos = (t[i] % (beat_interval * 2)) / (beat_interval * 2)
                bass_envelope[i] = 0.6 + 0.4 * np.exp(-beat_pos * 2)
            audio += bass_envelope * bass
            
            audio = np.int16(audio * 32767)
            
            import wave
            with wave.open(output_path, 'w') as wf:
                wf.setnchannels(1)
                wf.setsampwidth(2)
                wf.setframerate(sample_rate)
                wf.writeframes(audio.tobytes())
            
            return True
        except Exception as e:
            print(f"Warning: Could not generate audio: {e}")
            return False
    
    def generate_preview(self, poem_features: Dict, speed: float, volume: float, style: str) -> Dict:
        session_id = str(uuid.uuid4())[:8]
        timestamp = int(time.time())
        
        bg_video_path = os.path.join(self.background_dir, f'{style}.mp4')
        
        midi_path = os.path.join(self.static_dir, f'music_{session_id}_{timestamp}.mid')
        wav_path = os.path.join(self.static_dir, f'music_{session_id}_{timestamp}.wav')
        
        self._generate_midi(poem_features, midi_path)
        
        if not self._midi_to_wav(midi_path, wav_path, poem_features):
            self._generate_simple_audio(wav_path, poem_features)
        
        lines = poem_features['lines']
        duration_per_line = poem_features['durationPerLine']
        total_duration = poem_features['totalDuration'] / speed
        
        line_timestamps = []
        current_time = 0
        for dur in duration_per_line:
            line_timestamps.append(current_time / speed)
            current_time += dur
        
        return {
            "videoUrl": "",
            "audioUrl": f"/static/music_{session_id}_{timestamp}.wav",
            "backgroundVideoUrl": f"/background/{style}.mp4",
            "lines": lines,
            "lineTimestamps": [round(t, 2) for t in line_timestamps],
            "totalDuration": round(total_duration, 2)
        }
    
    def export_mp4(self, poem_features: Dict, video_data: Dict, speed: float, volume: float, style: str) -> str:
        session_id = str(uuid.uuid4())[:8]
        timestamp = int(time.time())
        
        output_path = os.path.join(self.output_dir, f'poem_video_{session_id}_{timestamp}.mp4')
        
        bg_video_path = os.path.join(self.background_dir, f'{style}.mp4')
        
        midi_path = os.path.join(self.static_dir, f'export_music_{session_id}_{timestamp}.mid')
        wav_path = os.path.join(self.static_dir, f'export_music_{session_id}_{timestamp}.wav')
        
        self._generate_midi(poem_features, midi_path)
        if not self._midi_to_wav(midi_path, wav_path, poem_features):
            self._generate_simple_audio(wav_path, poem_features)
        
        try:
            self._create_final_video(bg_video_path, wav_path, output_path, poem_features, speed, volume)
        except Exception as e:
            print(f"Error creating video: {e}")
            self._create_simple_video(bg_video_path, wav_path, output_path, poem_features, speed)
        
        return output_path
    
    def _create_final_video(self, bg_path: str, audio_path: str, output_path: str, 
                           poem_features: Dict, speed: float, volume: float):
        cap = cv2.VideoCapture(bg_path)
        if not cap.isOpened():
            raise Exception("Could not open background video")
        
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps = cap.get(cv2.CAP_PROP_FPS)
        
        total_duration = poem_features['totalDuration'] / speed
        lines = poem_features['lines']
        line_timestamps = []
        current = 0
        for dur in poem_features['durationPerLine']:
            line_timestamps.append(current / speed)
            current += dur
        
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        temp_video_path = output_path.replace('.mp4', '_temp.mp4')
        out = cv2.VideoWriter(temp_video_path, fourcc, fps, (width, height))
        
        total_frames = int(total_duration * fps)
        frame_count = 0
        
        while frame_count < total_frames:
            ret, frame = cap.read()
            if not ret:
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                continue
            
            current_time = frame_count / fps
            
            line_idx = 0
            for i, ts in enumerate(line_timestamps):
                if current_time >= ts:
                    line_idx = i
            
            if line_idx < len(lines):
                text = lines[line_idx]
                
                font = cv2.FONT_HERSHEY_SIMPLEX
                font_scale = 2.0
                thickness = 3
                
                text_size = cv2.getTextSize(text, font, font_scale, thickness)[0]
                text_x = (width - text_size[0]) // 2
                text_y = height // 2 + text_size[1] // 2
                
                cv2.rectangle(frame, 
                            (text_x - 30, text_y - text_size[1] - 20),
                            (text_x + text_size[0] + 30, text_y + 20),
                            (0, 0, 0), -1)
                
                cv2.putText(frame, text, (text_x, text_y), font, font_scale,
                           (255, 215, 0), thickness, cv2.LINE_AA)
            
            out.write(frame)
            frame_count += 1
        
        cap.release()
        out.release()
        
        try:
            import subprocess
            cmd = [
                'ffmpeg', '-y',
                '-i', temp_video_path,
                '-i', audio_path,
                '-c:v', 'copy',
                '-c:a', 'aac',
                '-shortest',
                output_path
            ]
            subprocess.run(cmd, check=True, capture_output=True)
            os.remove(temp_video_path)
        except Exception as e:
            print(f"FFmpeg error: {e}")
            os.rename(temp_video_path, output_path)
    
    def _create_simple_video(self, bg_path: str, audio_path: str, output_path: str,
                            poem_features: Dict, speed: float):
        import shutil
        shutil.copy(bg_path, output_path)
